import type { SourceLocation } from '@radiator/common';
import { CaptureManager } from '@radiator/core';
import { loadConfig } from './config.js';

let manager: CaptureManager | null = null;
let initPromise: Promise<void> | null = null;

function getManager(): CaptureManager {
  if (!manager) {
    const config = loadConfig();
    manager = new CaptureManager(config);
    initPromise = manager.init().catch((err) => {
      console.error('[radiator] Failed to initialize:', err);
    });
  }
  return manager;
}

/**
 * Called by instrumented code when entering a function.
 */
export function enterFunction(hash: string, name: string, file: string): void {
  getManager().enterFunction(hash, name, file);
}

/**
 * Called by instrumented code to capture a variable's value.
 */
export function capture(
  hash: string,
  varName: string,
  value: unknown,
  loc: SourceLocation,
): void {
  const mgr = getManager();
  if (!mgr.sampler.shouldCapture(hash)) return; // fast bail
  mgr.capture(hash, varName, value, loc);
}

/**
 * Called by instrumented code to capture a function's return value.
 */
export function captureReturn(hash: string, value: unknown): void {
  getManager().onFunctionExit(hash, value);
}

/**
 * Called by instrumented code when a function throws an error.
 */
export function onError(hash: string, error: unknown): void {
  getManager().onFunctionError(hash, error as Error);
}

/**
 * Called by instrumented code when exiting a function (finally block).
 */
export function exitFunction(hash: string): void {
  getManager().exitFunction(hash);
}

/**
 * Explicitly flush all pending captures to storage.
 */
export async function flush(): Promise<void> {
  if (manager) await manager.flush();
}

/**
 * Shut down the capture manager.
 */
export async function shutdown(): Promise<void> {
  if (manager) await manager.shutdown();
}

/**
 * Get the underlying CaptureManager instance (for advanced use).
 */
export function getRadiatorManager(): CaptureManager {
  return getManager();
}

// Register process exit handler for automatic flush
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    flush().catch(() => {});
  });
}

// Re-export useful types
export type { CaptureManager } from '@radiator/core';
export type { SourceLocation, FunctionTypeSnapshot, RadiatorType } from '@radiator/common';
