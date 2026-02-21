/**
 * Integration test: Transform → Capture → Store
 *
 * Verifies the full pipeline:
 * 1. Babel plugin transforms source code with instrumentation
 * 2. CaptureManager receives captures from simulated instrumented code
 * 3. Types are correctly stored in the content-addressable store
 * 4. Snapshots persist and can be loaded by a new CaptureManager
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { transformSync } from '@babel/core';
import { CaptureManager } from '@radiator/core';
import { hashFunctionAST, captureType, mergeTypes } from '@radiator/common';
import type { FunctionTypeSnapshot } from '@radiator/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import the Babel plugin (named export, pass the function directly)
import { radiatorPlugin } from '@radiator/transform';

describe('Capture Flow: Transform → Capture → Store', () => {
  let tempDir: string;
  let manager: CaptureManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'radiator-integ-'));
    manager = new CaptureManager({
      radiatorDir: tempDir,
      flushIntervalMs: 0,
    });
    await manager.init();
  });

  afterEach(async () => {
    await manager.shutdown();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('transforms source code and injects instrumentation calls', () => {
    const source = `
function greet(name) {
  const message = "Hello, " + name;
  return message;
}
`;

    const result = transformSync(source, {
      plugins: [[radiatorPlugin, { captureModule: '@radiator/client' }]],
      filename: 'test.ts',
    });

    expect(result?.code).toBeTruthy();
    const code = result!.code!;

    // Should have import from @radiator/client
    expect(code).toContain('@radiator/client');
    // Should have enter/capture/return/error/exit calls
    expect(code).toContain('__rad_enter');
    expect(code).toContain('__rad_capture');
    expect(code).toContain('__rad_return');
    expect(code).toContain('__rad_error');
    expect(code).toContain('__rad_exit');
    // Should have a hash literal embedded
    expect(code).toMatch(/"[a-f0-9]{64}"/);
    // Should have try/catch/finally
    expect(code).toContain('try');
    expect(code).toContain('catch');
    expect(code).toContain('finally');
  });

  it('captures variables through the full pipeline and stores to disk', async () => {
    // Simulate what the instrumented code would do
    const functionHash = hashFunctionAST(`function add(a, b) { const sum = a + b; return sum; }`);

    // Enter function
    manager.enterFunction(functionHash, 'add', 'math.ts');

    // Capture params (line 0 = parameters)
    manager.capture(functionHash, 'a', 10, { line: 0, column: 0 });
    manager.capture(functionHash, 'b', 20, { line: 0, column: 5 });

    // Capture local variable
    manager.capture(functionHash, 'sum', 30, { line: 2, column: 8 });

    // Exit with return value
    manager.onFunctionExit(functionHash, 30);

    // Flush to disk
    await manager.flush();

    // Verify snapshot
    const snapshot = manager.getSnapshot(functionHash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.functionName).toBe('add');
    expect(snapshot!.filePath).toBe('math.ts');
    expect(snapshot!.captureMode).toBe('normal');
    expect(snapshot!.sampleCount).toBe(1);

    // Verify parameters
    expect(snapshot!.parameters).toHaveLength(2);
    const paramA = snapshot!.parameters.find(p => p.name === 'a');
    const paramB = snapshot!.parameters.find(p => p.name === 'b');
    expect(paramA!.type.kind).toBe('primitive');
    expect(paramA!.type.name).toBe('number');
    expect(paramB!.type.kind).toBe('primitive');
    expect(paramB!.type.name).toBe('number');

    // Verify locals
    expect(snapshot!.localVariables).toHaveLength(1);
    expect(snapshot!.localVariables[0].name).toBe('sum');
    expect(snapshot!.localVariables[0].type.name).toBe('number');

    // Verify return value
    expect(snapshot!.returnValue).toBeDefined();
    expect(snapshot!.returnValue!.type.name).toBe('number');
  });

  it('persists snapshots to disk and loads them in a new manager', async () => {
    const hash = hashFunctionAST(`function test(x) { return x * 2; }`);

    manager.enterFunction(hash, 'test', 'test.ts');
    manager.capture(hash, 'x', 42, { line: 0, column: 0 });
    manager.onFunctionExit(hash, 84);
    await manager.flush();

    // Create a brand new manager pointing to the same directory
    const manager2 = new CaptureManager({
      radiatorDir: tempDir,
      flushIntervalMs: 0,
    });
    await manager2.init();

    // Should load persisted snapshot
    const snapshot = manager2.getSnapshot(hash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.functionName).toBe('test');
    expect(snapshot!.sampleCount).toBe(1);

    const param = snapshot!.parameters.find(p => p.name === 'x');
    expect(param).toBeDefined();
    expect(param!.type.name).toBe('number');

    await manager2.shutdown();
  });

  it('merges types across multiple invocations', async () => {
    const hash = hashFunctionAST(`function format(input) { return String(input); }`);

    // First call with string
    manager.enterFunction(hash, 'format', 'util.ts');
    manager.capture(hash, 'input', 'hello', { line: 0, column: 0 });
    manager.onFunctionExit(hash, 'hello');

    // Second call with number
    manager.enterFunction(hash, 'format', 'util.ts');
    manager.capture(hash, 'input', 42, { line: 0, column: 0 });
    manager.onFunctionExit(hash, '42');

    // Third call with object
    manager.enterFunction(hash, 'format', 'util.ts');
    manager.capture(hash, 'input', { id: 1 }, { line: 0, column: 0 });
    manager.onFunctionExit(hash, '[object Object]');

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot!.sampleCount).toBe(3);

    // The input parameter type should be a union
    const inputParam = snapshot!.parameters.find(p => p.name === 'input');
    expect(inputParam!.type.kind).toBe('union');

    // Return value should also be merged (all strings)
    expect(snapshot!.returnValue).toBeDefined();
    expect(snapshot!.returnValue!.type.name).toBe('string');
  });

  it('captures complex object types with correct structure', () => {
    const hash = hashFunctionAST(`function process(user) { return user.name; }`);

    const complexUser = {
      id: 'user-123',
      name: 'Alice',
      age: 30,
      address: {
        city: 'New York',
        zip: '10001',
      },
      tags: ['admin', 'user'],
    };

    manager.enterFunction(hash, 'process', 'user.ts');
    manager.capture(hash, 'user', complexUser, { line: 0, column: 0 });
    manager.onFunctionExit(hash, 'Alice');

    const snapshot = manager.getSnapshot(hash);
    const userParam = snapshot!.parameters.find(p => p.name === 'user');
    expect(userParam).toBeDefined();

    const userType = userParam!.type;
    expect(userType.kind).toBe('object');
    expect(userType.properties).toBeDefined();

    // Should have captured all top-level properties (properties is Record<string, RadiatorType>)
    const propNames = Object.keys(userType.properties!);
    expect(propNames).toContain('id');
    expect(propNames).toContain('name');
    expect(propNames).toContain('age');
    expect(propNames).toContain('address');
    expect(propNames).toContain('tags');

    // Nested object should be captured
    const addressType = userType.properties!['address'];
    expect(addressType.kind).toBe('object');
  });

  it('captures errors with full variable state', async () => {
    const hash = hashFunctionAST(`function divide(a, b) { return a / b; }`);

    manager.enterFunction(hash, 'divide', 'math.ts');
    manager.capture(hash, 'a', 10, { line: 0, column: 0 });
    manager.capture(hash, 'b', 0, { line: 0, column: 5 });
    manager.onFunctionError(hash, new Error('Division by zero'));

    // Wait for async flush triggered by error
    await new Promise(resolve => setTimeout(resolve, 100));

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot).not.toBeNull();
    expect(snapshot!.captureMode).toBe('error');
    expect(snapshot!.error).toBeDefined();
    expect(snapshot!.error!.message).toBe('Division by zero');
    expect(snapshot!.error!.name).toBe('Error');
    expect(snapshot!.error!.stack).toBeTruthy();

    // Variables at time of error should still be captured
    expect(snapshot!.parameters).toHaveLength(2);
    const paramA = snapshot!.parameters.find(p => p.name === 'a');
    expect(paramA!.type.name).toBe('number');
  });

  it('handles AST hash stability across formatting changes', () => {
    // Same function, different formatting — should produce same hash
    const formatted = `function add(a, b) {
  return a + b;
}`;

    const compact = `function add(a,b){return a+b}`;

    const hash1 = hashFunctionAST(formatted);
    const hash2 = hashFunctionAST(compact);

    expect(hash1).toBe(hash2);
  });
});
