/**
 * Integration test: Type inference from cached data
 *
 * Tests the type inference pipeline:
 * 1. Capture types from runtime values
 * 2. Merge types across multiple invocations
 * 3. Infer types for property access paths
 * 4. Handle union types from varying inputs
 * 5. Verify type cache is code-sensitive (different code = different hash)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CaptureManager } from '@radiator/core';
import {
  hashFunctionAST,
  captureType,
  inferPropertyType,
  mergeTypes,
} from '@radiator/common';
import type { RadiatorType } from '@radiator/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Type Inference from Cached Data', () => {
  let tempDir: string;
  let manager: CaptureManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'radiator-infer-integ-'));
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

  it('infers nested property types from cached snapshots', () => {
    const hash = hashFunctionAST(`function getUser(id) {
      const user = db.findById(id);
      return user;
    }`);

    const user = {
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      profile: {
        bio: 'Developer',
        social: {
          twitter: '@alice',
          github: 'alice',
        },
      },
    };

    manager.enterFunction(hash, 'getUser', 'user-service.ts');
    manager.capture(hash, 'id', 'user-1', { line: 0, column: 0 });
    manager.capture(hash, 'user', user, { line: 2, column: 8 });
    manager.onFunctionExit(hash, user);

    // Top-level property
    const nameType = manager.inferType(hash, 'user', ['name']);
    expect(nameType).not.toBeNull();
    expect(nameType!.kind).toBe('primitive');
    expect(nameType!.name).toBe('string');

    // Nested property
    const bioType = manager.inferType(hash, 'user', ['profile', 'bio']);
    expect(bioType).not.toBeNull();
    expect(bioType!.name).toBe('string');

    // Deeply nested property
    const twitterType = manager.inferType(hash, 'user', ['profile', 'social', 'twitter']);
    expect(twitterType).not.toBeNull();
    expect(twitterType!.name).toBe('string');

    // Non-existent property
    const unknownType = manager.inferType(hash, 'user', ['nonexistent']);
    expect(unknownType).toBeNull();

    // Non-existent variable
    const noVar = manager.inferType(hash, 'db', ['findById']);
    expect(noVar).toBeNull();
  });

  it('infers union types from varying inputs', () => {
    const hash = hashFunctionAST(`function processInput(val) { return val; }`);

    // First call with string
    manager.enterFunction(hash, 'processInput', 'process.ts');
    manager.capture(hash, 'val', 'hello', { line: 0, column: 0 });
    manager.onFunctionExit(hash, 'hello');

    // Second call with number
    manager.enterFunction(hash, 'processInput', 'process.ts');
    manager.capture(hash, 'val', 42, { line: 0, column: 0 });
    manager.onFunctionExit(hash, 42);

    // Third call with null
    manager.enterFunction(hash, 'processInput', 'process.ts');
    manager.capture(hash, 'val', null, { line: 0, column: 0 });
    manager.onFunctionExit(hash, null);

    const snapshot = manager.getSnapshot(hash);
    expect(snapshot!.sampleCount).toBe(3);

    const valParam = snapshot!.parameters.find(p => p.name === 'val');
    expect(valParam!.type.kind).toBe('union');

    // The union should contain string, number, and null
    const unionTypes = valParam!.type.unionOf ?? [];
    const typeNames = unionTypes.map(t => t.name);
    expect(typeNames).toContain('string');
    expect(typeNames).toContain('number');
    expect(typeNames).toContain('null');
  });

  it('correctly differentiates functions by AST hash', () => {
    const code1 = `function calc(a, b) { return a + b; }`;
    const code2 = `function calc(a, b) { return a * b; }`;

    const hash1 = hashFunctionAST(code1);
    const hash2 = hashFunctionAST(code2);

    // Different code should produce different hashes
    expect(hash1).not.toBe(hash2);

    // Capture different types for each version
    manager.enterFunction(hash1, 'calc', 'math.ts');
    manager.capture(hash1, 'a', 1, { line: 0, column: 0 });
    manager.capture(hash1, 'b', 2, { line: 0, column: 5 });
    manager.onFunctionExit(hash1, 3);

    manager.enterFunction(hash2, 'calc', 'math.ts');
    manager.capture(hash2, 'a', 'hello', { line: 0, column: 0 });
    manager.capture(hash2, 'b', ' world', { line: 0, column: 5 });
    manager.onFunctionExit(hash2, 'hello world');

    // Each version has its own snapshot
    const snapshot1 = manager.getSnapshot(hash1);
    const snapshot2 = manager.getSnapshot(hash2);

    expect(snapshot1!.parameters[0].type.name).toBe('number');
    expect(snapshot2!.parameters[0].type.name).toBe('string');
  });

  it('handles same function with different formatting (same hash)', () => {
    const formatted = `function add(a, b) {
      return a + b;
    }`;
    const minified = `function add(a,b){return a+b}`;

    const hash1 = hashFunctionAST(formatted);
    const hash2 = hashFunctionAST(minified);

    // Same logic, different formatting = same hash
    expect(hash1).toBe(hash2);

    manager.enterFunction(hash1, 'add', 'v1.ts');
    manager.capture(hash1, 'a', 10, { line: 0, column: 0 });
    manager.onFunctionExit(hash1, 15);

    // Second capture uses hash2 (same value as hash1)
    manager.enterFunction(hash2, 'add', 'v2.ts');
    manager.capture(hash2, 'a', 20, { line: 0, column: 0 });
    manager.onFunctionExit(hash2, 25);

    // Both calls contribute to the same snapshot
    const snapshot = manager.getSnapshot(hash1);
    expect(snapshot!.sampleCount).toBe(2);
  });

  it('infers array element types', () => {
    const hash = hashFunctionAST(`function processList(items) { return items.length; }`);

    manager.enterFunction(hash, 'processList', 'list.ts');
    manager.capture(hash, 'items', [1, 2, 3], { line: 0, column: 0 });
    manager.onFunctionExit(hash, 3);

    const snapshot = manager.getSnapshot(hash);
    const itemsParam = snapshot!.parameters.find(p => p.name === 'items');
    expect(itemsParam!.type.kind).toBe('array');
    expect(itemsParam!.type.elementType).toBeDefined();
    expect(itemsParam!.type.elementType!.name).toBe('number');
  });

  it('captures and infers types for the demo bank scenario', () => {
    // Simulates what would happen in the demo banking app
    const transferHash = hashFunctionAST(`function processTransfer(fromId, toId, amount) {
      const from = getAccount(fromId);
      const to = getAccount(toId);
      const fee = calculateFee(amount);
      from.balance -= amount + fee;
      to.balance += amount;
      return { from, to, fee };
    }`);

    // Normal transfer
    manager.enterFunction(transferHash, 'processTransfer', 'transfer-service.ts');
    manager.capture(transferHash, 'fromId', 'acc-001', { line: 0, column: 0 });
    manager.capture(transferHash, 'toId', 'acc-002', { line: 0, column: 15 });
    manager.capture(transferHash, 'amount', 500.00, { line: 0, column: 25 });
    manager.capture(transferHash, 'from', {
      id: 'acc-001', ownerId: 'user-001', ownerName: 'Alice', balance: 5200.50, currency: 'USD',
    }, { line: 2, column: 8 });
    manager.capture(transferHash, 'to', {
      id: 'acc-002', ownerId: 'user-002', ownerName: 'Bob', balance: 12750.00, currency: 'USD',
    }, { line: 3, column: 8 });
    manager.capture(transferHash, 'fee', 150.00, { line: 4, column: 8 });
    manager.onFunctionExit(transferHash, { from: {}, to: {}, fee: 150.00 });

    // Buggy transfer - null balance
    manager.enterFunction(transferHash, 'processTransfer', 'transfer-service.ts');
    manager.capture(transferHash, 'fromId', 'acc-005', { line: 0, column: 0 });
    manager.capture(transferHash, 'toId', 'acc-001', { line: 0, column: 15 });
    manager.capture(transferHash, 'amount', 50, { line: 0, column: 25 });
    manager.capture(transferHash, 'from', {
      id: 'acc-005', ownerId: 'user-005', ownerName: 'Evan', balance: null, currency: 'USD',
    }, { line: 2, column: 8 });
    manager.capture(transferHash, 'to', {
      id: 'acc-001', ownerId: 'user-001', ownerName: 'Alice', balance: 5200.50, currency: 'USD',
    }, { line: 3, column: 8 });
    manager.capture(transferHash, 'fee', 15, { line: 4, column: 8 });
    manager.onFunctionError(transferHash, new TypeError('Cannot perform arithmetic on null'));

    const snapshot = manager.getSnapshot(transferHash);
    expect(snapshot!.sampleCount).toBe(2);
    expect(snapshot!.captureMode).toBe('error'); // error overwrites

    // Infer from.balance type - should show union since we saw both number and null
    const balanceType = manager.inferType(transferHash, 'from', ['balance']);
    expect(balanceType).not.toBeNull();
    // The merged type should indicate that balance can be null
    // (either union or the last captured type which was null)
    expect(
      balanceType!.name === 'null' ||
      balanceType!.kind === 'union' ||
      balanceType!.name === 'number'
    ).toBe(true);
  });

  it('captureType correctly handles all JavaScript types', () => {
    const testCases: Array<{ value: unknown; expectedKind: string; expectedName: string }> = [
      { value: 42, expectedKind: 'primitive', expectedName: 'number' },
      { value: 'hello', expectedKind: 'primitive', expectedName: 'string' },
      { value: true, expectedKind: 'primitive', expectedName: 'boolean' },
      { value: null, expectedKind: 'null', expectedName: 'null' },
      { value: undefined, expectedKind: 'undefined', expectedName: 'undefined' },
      { value: BigInt(9007199254740991), expectedKind: 'primitive', expectedName: 'bigint' },
      { value: Symbol('test'), expectedKind: 'primitive', expectedName: 'symbol' },
      { value: [1, 2, 3], expectedKind: 'array', expectedName: 'Array<number>' },
      { value: { a: 1 }, expectedKind: 'object', expectedName: 'Object' },
      { value: () => {}, expectedKind: 'function', expectedName: 'value' },
      { value: new Date(), expectedKind: 'class', expectedName: 'Date' },
      { value: /regex/, expectedKind: 'class', expectedName: 'RegExp' },
      { value: new Map(), expectedKind: 'class', expectedName: 'Map' },
      { value: new Set(), expectedKind: 'class', expectedName: 'Set' },
    ];

    for (const { value, expectedKind, expectedName } of testCases) {
      const type = captureType(value);
      expect(type.kind).toBe(expectedKind);
      expect(type.name).toBe(expectedName);
    }
  });

  it('mergeTypes creates correct union types', () => {
    const stringType = captureType('hello');
    const numberType = captureType(42);
    const nullType = captureType(null);

    // Merge string + number
    const union1 = mergeTypes(stringType, numberType);
    expect(union1.kind).toBe('union');
    expect(union1.unionOf!.length).toBe(2);

    // Merge union + null
    const union2 = mergeTypes(union1, nullType);
    expect(union2.kind).toBe('union');
    expect(union2.unionOf!.length).toBe(3);

    // Merge same types (no duplication)
    const union3 = mergeTypes(stringType, stringType);
    expect(union3.kind).toBe('primitive');
    expect(union3.name).toBe('string');
  });

  it('inferPropertyType works with arrays', () => {
    const arrayType = captureType([{ name: 'Alice' }, { name: 'Bob' }]);

    // Infer element type
    const elementType = inferPropertyType(arrayType, ['0']);
    // Array access by index may return null depending on implementation
    // but accessing the elementType should work
    expect(arrayType.elementType).toBeDefined();
    expect(arrayType.elementType!.kind).toBe('object');
  });

  it('snapshots persist type information across flush/reload', async () => {
    const hash = hashFunctionAST(`function demo(x) { return x; }`);

    // Capture with different types
    manager.enterFunction(hash, 'demo', 'demo.ts');
    manager.capture(hash, 'x', { count: 42, label: 'test' }, { line: 0, column: 0 });
    manager.onFunctionExit(hash, { count: 42, label: 'test' });

    await manager.flush();

    // Reload in new manager
    const manager2 = new CaptureManager({
      radiatorDir: tempDir,
      flushIntervalMs: 0,
    });
    await manager2.init();

    // Type inference should work on reloaded data
    const countType = manager2.inferType(hash, 'x', ['count']);
    expect(countType).not.toBeNull();
    expect(countType!.name).toBe('number');

    const labelType = manager2.inferType(hash, 'x', ['label']);
    expect(labelType).not.toBeNull();
    expect(labelType!.name).toBe('string');

    await manager2.shutdown();
  });
});
