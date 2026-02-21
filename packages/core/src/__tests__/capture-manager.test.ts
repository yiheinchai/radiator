import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureManager } from '../capture/capture-manager.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('CaptureManager', () => {
  let tempDir: string;
  let manager: CaptureManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'radiator-test-'));
    manager = new CaptureManager({
      radiatorDir: tempDir,
      flushIntervalMs: 0, // disable auto-flush for tests
    });
    await manager.init();
  });

  afterEach(async () => {
    await manager.shutdown();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('captures a simple function call', () => {
    const hash = 'func-hash-1';

    manager.enterFunction(hash, 'greet', 'test.ts');
    manager.capture(hash, 'name', 'Alice', { line: 0, column: 0 });
    manager.onFunctionExit(hash, 'Hello, Alice!');

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.functionName).toBe('greet');
    expect(snapshot!.filePath).toBe('test.ts');
    expect(snapshot!.captureMode).toBe('normal');
    expect(snapshot!.sampleCount).toBe(1);
  });

  it('captures parameters and local variables', () => {
    const hash = 'func-hash-2';

    manager.enterFunction(hash, 'add', 'math.ts');
    manager.capture(hash, 'a', 5, { line: 0, column: 0 });
    manager.capture(hash, 'b', 3, { line: 0, column: 5 });
    manager.capture(hash, 'result', 8, { line: 1, column: 0 });
    manager.onFunctionExit(hash, 8);

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot).not.toBeNull();

    // Parameters are on line 0
    const params = snapshot!.parameters;
    expect(params.some((p) => p.name === 'a')).toBe(true);
    expect(params.some((p) => p.name === 'b')).toBe(true);

    // Local variables are on other lines
    const locals = snapshot!.localVariables;
    expect(locals.some((v) => v.name === 'result')).toBe(true);
  });

  it('captures error mode', () => {
    const hash = 'func-hash-3';

    manager.enterFunction(hash, 'divide', 'math.ts');
    manager.capture(hash, 'a', 10, { line: 0, column: 0 });
    manager.capture(hash, 'b', 0, { line: 0, column: 5 });
    manager.onFunctionError(hash, new Error('Division by zero'));

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.captureMode).toBe('error');
    expect(snapshot!.error).toBeDefined();
    expect(snapshot!.error!.message).toBe('Division by zero');
    expect(snapshot!.error!.name).toBe('Error');
  });

  it('merges types across multiple calls', () => {
    const hash = 'func-hash-4';

    // First call with string
    manager.enterFunction(hash, 'identity', 'util.ts');
    manager.capture(hash, 'x', 'hello', { line: 0, column: 0 });
    manager.onFunctionExit(hash, 'hello');

    // Second call with number
    manager.enterFunction(hash, 'identity', 'util.ts');
    manager.capture(hash, 'x', 42, { line: 0, column: 0 });
    manager.onFunctionExit(hash, 42);

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot!.sampleCount).toBe(2);

    // The parameter type should be a union of string and number
    const xParam = snapshot!.parameters.find((p) => p.name === 'x');
    expect(xParam).toBeDefined();
    expect(xParam!.type.kind).toBe('union');
  });

  it('infers types from cached data', () => {
    const hash = 'func-hash-5';

    manager.enterFunction(hash, 'getName', 'person.ts');
    manager.capture(hash, 'person', { name: 'Alice', age: 30, car: { make: 'Toyota' } }, { line: 0, column: 0 });
    manager.onFunctionExit(hash, 'Alice');

    // Infer person.name
    const nameType = manager.inferType(hash, 'person', ['name']);
    expect(nameType).not.toBeNull();
    expect(nameType!.name).toBe('string');

    // Infer person.car.make
    const makeType = manager.inferType(hash, 'person', ['car', 'make']);
    expect(makeType).not.toBeNull();
    expect(makeType!.name).toBe('string');

    // Non-existent property
    const unknownType = manager.inferType(hash, 'person', ['email']);
    expect(unknownType).toBeNull();
  });

  it('persists and loads snapshots', async () => {
    const hash = 'func-hash-6';

    manager.enterFunction(hash, 'test', 'test.ts');
    manager.capture(hash, 'x', 42, { line: 0, column: 0 });
    manager.onFunctionExit(hash, 42);

    // Flush to disk
    await manager.flush();

    // Create new manager and load
    const manager2 = new CaptureManager({
      radiatorDir: tempDir,
      flushIntervalMs: 0,
    });
    await manager2.init();

    const snapshot = manager2.getSnapshot(hash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.functionName).toBe('test');
    await manager2.shutdown();
  });

  it('handles nested/recursive function calls', () => {
    const hash = 'func-hash-7';

    // Outer call
    manager.enterFunction(hash, 'factorial', 'math.ts');
    manager.capture(hash, 'n', 3, { line: 0, column: 0 });

    // Inner call (recursion)
    manager.enterFunction(hash, 'factorial', 'math.ts');
    manager.capture(hash, 'n', 2, { line: 0, column: 0 });
    manager.onFunctionExit(hash, 2);

    // Outer call exits
    manager.onFunctionExit(hash, 6);

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.sampleCount).toBe(2);
  });
});
