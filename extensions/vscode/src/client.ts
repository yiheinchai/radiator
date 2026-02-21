import * as fs from 'fs';
import * as path from 'path';
import type { FunctionTypeSnapshot, ErrorLogEntry } from '@radiator/common';

export type CaptureMode = 'normal' | 'error' | 'both';

export class RadiatorClient {
  private workspaceRoot: string;
  private mode: CaptureMode = 'both';
  private serverUrl: string | undefined;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;

    // Try to read server config from workspace root .radiator
    try {
      const configPath = path.join(workspaceRoot, '.radiator', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.serverUrl = config.serverUrl;
      }
    } catch {
      // Ignore config errors
    }
  }

  /**
   * Find the nearest .radiator directory by walking up from a file path.
   * Stops at the workspace root.
   */
  findRadiatorDir(filePath: string): string | null {
    let dir = path.dirname(filePath);

    while (true) {
      const candidate = path.join(dir, '.radiator');
      if (fs.existsSync(candidate)) {
        return candidate;
      }

      // Stop at workspace root or filesystem root
      if (dir === this.workspaceRoot || dir === path.dirname(dir)) {
        break;
      }
      dir = path.dirname(dir);
    }

    // Also check the workspace root itself
    const wsCandidate = path.join(this.workspaceRoot, '.radiator');
    if (fs.existsSync(wsCandidate)) {
      return wsCandidate;
    }

    return null;
  }

  getMode(): CaptureMode {
    return this.mode;
  }

  toggleMode(): void {
    const modes: CaptureMode[] = ['normal', 'error', 'both'];
    const currentIndex = modes.indexOf(this.mode);
    this.mode = modes[(currentIndex + 1) % modes.length];
  }

  /**
   * Get a snapshot by function hash.
   * First checks the local .radiator/refs/snapshots/ directory (found by
   * walking up from the given file path), then falls back to the remote server.
   */
  async getSnapshot(
    functionHash: string,
    filePath?: string
  ): Promise<FunctionTypeSnapshot | null> {
    // Find the right .radiator directory for this file
    if (filePath) {
      const radiatorDir = this.findRadiatorDir(filePath);
      if (radiatorDir) {
        const local = this.getLocalSnapshotFromDir(radiatorDir, functionHash);
        if (local) return local;
      }
    }

    // Fall back to workspace root .radiator
    const wsRadiatorDir = path.join(this.workspaceRoot, '.radiator');
    const local = this.getLocalSnapshotFromDir(wsRadiatorDir, functionHash);
    if (local) return local;

    // Fall back to remote server
    if (this.serverUrl) {
      return this.getRemoteSnapshot(functionHash);
    }

    return null;
  }

  /**
   * Get a snapshot by function name and source file path.
   * Searches all snapshots in the nearest .radiator directory for a match.
   * This is more robust than hash-based lookup since hash computation may
   * differ between the Babel plugin (build-time) and the extension (hover-time).
   */
  async getSnapshotByFunction(
    functionName: string,
    sourceFilePath: string
  ): Promise<FunctionTypeSnapshot | null> {
    // Find the right .radiator directory for this file
    const radiatorDir = this.findRadiatorDir(sourceFilePath);
    const dirsToSearch = radiatorDir ? [radiatorDir] : this.findAllRadiatorDirs();

    for (const dir of dirsToSearch) {
      const snapshotsDir = path.join(dir, 'refs', 'snapshots');
      if (!fs.existsSync(snapshotsDir)) continue;

      try {
        const files = fs.readdirSync(snapshotsDir);
        for (const file of files) {
          const snapshotFilePath = path.join(snapshotsDir, file);
          try {
            const content = fs.readFileSync(snapshotFilePath, 'utf-8');
            const snapshot: FunctionTypeSnapshot = JSON.parse(content);
            if (
              snapshot.functionName === functionName &&
              snapshot.filePath === sourceFilePath
            ) {
              return snapshot;
            }
          } catch {
            // Skip malformed files
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return null;
  }

  /**
   * Get a snapshot by its snapshot ID (used for error tree navigation).
   * Searches all .radiator directories found in the workspace.
   */
  async getSnapshotById(
    snapshotId: string
  ): Promise<FunctionTypeSnapshot | null> {
    const radiatorDirs = this.findAllRadiatorDirs();

    for (const radiatorDir of radiatorDirs) {
      const snapshotsDir = path.join(radiatorDir, 'refs', 'snapshots');
      if (!fs.existsSync(snapshotsDir)) continue;

      try {
        const files = fs.readdirSync(snapshotsDir);
        for (const file of files) {
          const snapshotFilePath = path.join(snapshotsDir, file);
          const content = fs.readFileSync(snapshotFilePath, 'utf-8');
          try {
            const snapshot: FunctionTypeSnapshot = JSON.parse(content);
            if (
              snapshot.functionHash === snapshotId ||
              file === snapshotId ||
              file === `${snapshotId}.json`
            ) {
              return snapshot;
            }
          } catch {
            // Skip malformed files
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return null;
  }

  /**
   * Get all errors from all .radiator/ directories in the workspace.
   */
  async getErrors(): Promise<ErrorLogEntry[]> {
    const errors: ErrorLogEntry[] = [];
    const radiatorDirs = this.findAllRadiatorDirs();

    for (const radiatorDir of radiatorDirs) {
      // Check errors/ subdirectory
      const errorsDir = path.join(radiatorDir, 'errors');
      if (fs.existsSync(errorsDir)) {
        try {
          const files = fs.readdirSync(errorsDir);
          for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const errorFilePath = path.join(errorsDir, file);
            const content = fs.readFileSync(errorFilePath, 'utf-8');
            try {
              const entry: ErrorLogEntry = JSON.parse(content);
              errors.push(entry);
            } catch {
              // Skip malformed files
            }
          }
        } catch {
          // Ignore read errors
        }
      }

      // Also try loading from snapshots in error mode
      const snapshotsDir = path.join(radiatorDir, 'refs', 'snapshots');
      if (fs.existsSync(snapshotsDir)) {
        try {
          const files = fs.readdirSync(snapshotsDir);
          for (const file of files) {
            const snapshotFilePath = path.join(snapshotsDir, file);
            const content = fs.readFileSync(snapshotFilePath, 'utf-8');
            try {
              const snapshot: FunctionTypeSnapshot = JSON.parse(content);
              if (snapshot.captureMode === 'error' && snapshot.error) {
                errors.push({
                  id: snapshot.functionHash,
                  codebaseId: '',
                  snapshotId: snapshot.functionHash,
                  errorName: snapshot.error.name,
                  errorMessage: snapshot.error.message,
                  errorStack: snapshot.error.stack,
                  functionName: snapshot.functionName,
                  filePath: snapshot.filePath,
                  createdAt: snapshot.timestamp,
                });
              }
            } catch {
              // Skip malformed files
            }
          }
        } catch {
          // Ignore read errors
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    errors.sort((a, b) => b.createdAt - a.createdAt);

    return errors;
  }

  /**
   * Get all snapshots from all .radiator/ directories in the workspace.
   */
  async getAllSnapshots(): Promise<FunctionTypeSnapshot[]> {
    const snapshots: FunctionTypeSnapshot[] = [];
    const radiatorDirs = this.findAllRadiatorDirs();

    for (const radiatorDir of radiatorDirs) {
      const snapshotsDir = path.join(radiatorDir, 'refs', 'snapshots');
      if (!fs.existsSync(snapshotsDir)) continue;

      try {
        const files = fs.readdirSync(snapshotsDir);
        for (const file of files) {
          const snapshotFilePath = path.join(snapshotsDir, file);
          try {
            const content = fs.readFileSync(snapshotFilePath, 'utf-8');
            const snapshot: FunctionTypeSnapshot = JSON.parse(content);
            snapshots.push(snapshot);
          } catch {
            // Skip malformed files
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    return snapshots;
  }

  // ── Private Methods ────────────────────────────────────────────────────

  /**
   * Recursively find all .radiator directories under the workspace root.
   */
  private findAllRadiatorDirs(): string[] {
    const results: string[] = [];
    const searchDir = (dir: string, depth: number) => {
      if (depth > 6) return; // Don't recurse too deep
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          if (entry.name === '.radiator') {
            results.push(path.join(dir, entry.name));
            continue;
          }
          searchDir(path.join(dir, entry.name), depth + 1);
        }
      } catch {
        // Ignore permission errors etc.
      }
    };
    searchDir(this.workspaceRoot, 0);
    return results;
  }

  private getLocalSnapshotFromDir(
    radiatorDir: string,
    functionHash: string
  ): FunctionTypeSnapshot | null {
    // Try both with and without .json extension
    const paths = [
      path.join(radiatorDir, 'refs', 'snapshots', functionHash),
      path.join(radiatorDir, 'refs', 'snapshots', `${functionHash}.json`),
    ];

    for (const snapshotPath of paths) {
      try {
        if (fs.existsSync(snapshotPath)) {
          const content = fs.readFileSync(snapshotPath, 'utf-8');
          return JSON.parse(content);
        }
      } catch {
        // Ignore read errors
      }
    }

    return null;
  }

  private async getRemoteSnapshot(
    functionHash: string
  ): Promise<FunctionTypeSnapshot | null> {
    if (!this.serverUrl) return null;

    try {
      const url = `${this.serverUrl}/api/snapshots/${functionHash}`;
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) return null;
      return (await response.json()) as FunctionTypeSnapshot;
    } catch {
      return null;
    }
  }
}
