import type {
  CaptureConfig,
  FunctionTypeSnapshot,
  VariableCapture,
  SourceLocation,
  RadiatorType,
  ErrorCapture,
} from '@radiator/common';
import {
  DEFAULT_CAPTURE_CONFIG,
  captureType,
  mergeTypes,
  inferPropertyType,
  serializeToBytes,
  deserializeFromBytes,
} from '@radiator/common';
import { ObjectStore } from '../store/object-store.js';
import { Sampler } from './sampler.js';

interface FunctionContext {
  functionHash: string;
  functionName: string;
  filePath: string;
  variables: Map<string, VariableCapture>;
  returnValue?: VariableCapture;
  startTime: number;
}

/**
 * Central orchestrator for runtime type capture.
 *
 * Receives captures from instrumented code, manages sampling, merges type
 * observations across runs, and persists to the content-addressable store.
 */
export class CaptureManager {
  readonly store: ObjectStore;
  readonly sampler: Sampler;
  private config: CaptureConfig;
  private snapshots: Map<string, FunctionTypeSnapshot> = new Map();
  private activeFunctions: Map<string, FunctionContext[]> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private dirty = false;

  constructor(config: Partial<CaptureConfig> = {}) {
    this.config = { ...DEFAULT_CAPTURE_CONFIG, ...config };
    this.store = new ObjectStore(this.config.radiatorDir);
    this.sampler = new Sampler();
  }

  async init(): Promise<void> {
    await this.store.init();
    await this.loadExistingSnapshots();

    if (this.config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => {
        this.flush().catch(() => {});
      }, this.config.flushIntervalMs);

      // Don't block process exit
      if (this.flushTimer.unref) {
        this.flushTimer.unref();
      }
    }
  }

  /**
   * Called when entering a function.
   */
  enterFunction(hash: string, name: string, filePath: string): void {
    const contexts = this.activeFunctions.get(hash) ?? [];
    contexts.push({
      functionHash: hash,
      functionName: name,
      filePath,
      variables: new Map(),
      startTime: Date.now(),
    });
    this.activeFunctions.set(hash, contexts);
  }

  /**
   * Called by instrumented code to report a variable capture.
   */
  capture(
    functionHash: string,
    variableName: string,
    value: unknown,
    location: SourceLocation,
  ): void {
    const context = this.getActiveContext(functionHash);
    if (!context) return;

    const depth =
      this.config.mode === 'error' ? Math.min(this.config.maxDepth + 2, 5) : this.config.maxDepth;
    const type = captureType(value, depth);

    const capture: VariableCapture = {
      name: variableName,
      type,
      location,
      captureTimestamp: Date.now(),
    };

    context.variables.set(variableName, capture);
  }

  /**
   * Called on function exit (normal path).
   */
  onFunctionExit(functionHash: string, returnValue?: unknown): void {
    const context = this.popActiveContext(functionHash);
    if (!context) return;

    if (returnValue !== undefined) {
      context.returnValue = {
        name: '__return',
        type: captureType(returnValue, this.config.maxDepth),
        location: { line: 0, column: 0 },
        captureTimestamp: Date.now(),
      };
    }

    this.mergeIntoSnapshot(context, 'normal');
    this.dirty = true;
  }

  /**
   * Called on function error.
   * In error mode: captures FULL snapshot immediately.
   */
  onFunctionError(functionHash: string, error: unknown): void {
    const context = this.popActiveContext(functionHash);
    if (!context) return;

    const errorCapture = captureError(error);

    this.mergeIntoSnapshot(context, 'error', errorCapture);
    this.dirty = true;

    // Flush immediately for errors
    this.flush().catch(() => {});
  }

  /**
   * Called on function exit (cleanup, always runs).
   */
  exitFunction(functionHash: string): void {
    // Clean up if context wasn't already consumed by onFunctionExit/onFunctionError
    this.popActiveContext(functionHash);
  }

  /**
   * Persist pending snapshots to object store.
   */
  async flush(): Promise<void> {
    if (!this.dirty) return;

    const promises: Promise<void>[] = [];
    for (const [hash, snapshot] of this.snapshots) {
      promises.push(this.persistSnapshot(hash, snapshot));
    }

    await Promise.all(promises);
    this.dirty = false;
  }

  /**
   * Query cached types for a function hash.
   */
  getSnapshot(functionHash: string): FunctionTypeSnapshot | null {
    return this.snapshots.get(functionHash) ?? null;
  }

  /**
   * Get all snapshots.
   */
  getAllSnapshots(): FunctionTypeSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Infer type for a property access path.
   */
  inferType(
    functionHash: string,
    variableName: string,
    propertyPath: string[],
  ): RadiatorType | null {
    const snapshot = this.snapshots.get(functionHash);
    if (!snapshot) return null;

    const variable =
      snapshot.parameters.find((p) => p.name === variableName) ??
      snapshot.localVariables.find((v) => v.name === variableName);

    if (!variable) return null;
    return inferPropertyType(variable.type, propertyPath);
  }

  /**
   * Shut down the capture manager.
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private getActiveContext(functionHash: string): FunctionContext | undefined {
    const contexts = this.activeFunctions.get(functionHash);
    if (!contexts || contexts.length === 0) return undefined;
    return contexts[contexts.length - 1]; // most recent (handles recursion)
  }

  private popActiveContext(functionHash: string): FunctionContext | undefined {
    const contexts = this.activeFunctions.get(functionHash);
    if (!contexts || contexts.length === 0) return undefined;
    return contexts.pop();
  }

  private mergeIntoSnapshot(
    context: FunctionContext,
    mode: 'normal' | 'error',
    error?: ErrorCapture,
  ): void {
    const existing = this.snapshots.get(context.functionHash);

    const parameters = Array.from(context.variables.values()).filter((v) =>
      isParameter(v, context),
    );
    const localVariables = Array.from(context.variables.values()).filter(
      (v) => !isParameter(v, context),
    );

    if (existing) {
      // Merge with existing snapshot
      existing.sampleCount++;
      existing.timestamp = Date.now();

      // Merge parameter types
      for (const param of parameters) {
        const existingParam = existing.parameters.find((p) => p.name === param.name);
        if (existingParam) {
          existingParam.type = mergeTypes(existingParam.type, param.type);
        } else {
          existing.parameters.push(param);
        }
      }

      // Merge local variable types
      for (const local of localVariables) {
        const existingLocal = existing.localVariables.find((v) => v.name === local.name);
        if (existingLocal) {
          existingLocal.type = mergeTypes(existingLocal.type, local.type);
        } else {
          existing.localVariables.push(local);
        }
      }

      // Update return value
      if (context.returnValue) {
        if (existing.returnValue) {
          existing.returnValue.type = mergeTypes(existing.returnValue.type, context.returnValue.type);
        } else {
          existing.returnValue = context.returnValue;
        }
      }

      // Store error if in error mode
      if (error) {
        existing.error = error;
        existing.captureMode = 'error';
      }
    } else {
      // Create new snapshot
      const snapshot: FunctionTypeSnapshot = {
        functionHash: context.functionHash,
        functionName: context.functionName,
        filePath: context.filePath,
        parameters,
        localVariables,
        returnValue: context.returnValue,
        captureMode: mode,
        error,
        timestamp: Date.now(),
        sampleCount: 1,
      };
      this.snapshots.set(context.functionHash, snapshot);
    }
  }

  private async persistSnapshot(hash: string, snapshot: FunctionTypeSnapshot): Promise<void> {
    const bytes = serializeToBytes(snapshot);
    await this.store.writeObject('blob', bytes);

    // Also store a reference for quick lookup
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const refsDir = join(this.config.radiatorDir, 'refs', 'snapshots');
    await mkdir(refsDir, { recursive: true });
    await writeFile(join(refsDir, hash), bytes);
  }

  private async loadExistingSnapshots(): Promise<void> {
    const { readdir, readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const refsDir = join(this.config.radiatorDir, 'refs', 'snapshots');

    let files: string[];
    try {
      files = await readdir(refsDir);
    } catch {
      return; // No existing snapshots
    }

    for (const file of files) {
      try {
        const data = await readFile(join(refsDir, file));
        const snapshot = deserializeFromBytes<FunctionTypeSnapshot>(data);
        this.snapshots.set(snapshot.functionHash, snapshot);
      } catch {
        // Skip corrupted files
      }
    }
  }
}

// Helper: determine if a variable is a parameter (simple heuristic)
function isParameter(variable: VariableCapture, _context: FunctionContext): boolean {
  // Parameters are typically on line 0 or at the function's start
  // This is a simplified heuristic; the transform plugin marks them explicitly
  return variable.location.line === 0;
}

function captureError(error: unknown): ErrorCapture {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ?? '',
      causeChain: error.cause ? [captureError(error.cause)] : [],
    };
  }

  return {
    message: String(error),
    name: 'Error',
    stack: '',
    causeChain: [],
  };
}
