import { describe, it, expect } from 'vitest';
import { normalizeAST, hashFunctionAST } from '../ast-hash.js';

describe('normalizeAST', () => {
  it('strips location properties', () => {
    const node = { type: 'Identifier', name: 'x', loc: { line: 1, column: 0 }, start: 0, end: 1 };
    const normalized = normalizeAST(node) as Record<string, unknown>;
    expect(normalized).not.toHaveProperty('loc');
    expect(normalized).not.toHaveProperty('start');
    expect(normalized).not.toHaveProperty('end');
    expect(normalized).toHaveProperty('type', 'Identifier');
    expect(normalized).toHaveProperty('name', 'x');
  });

  it('strips comments', () => {
    const node = {
      type: 'Program',
      leadingComments: [{ value: 'hello' }],
      trailingComments: [],
      innerComments: [],
      body: [],
    };
    const normalized = normalizeAST(node) as Record<string, unknown>;
    expect(normalized).not.toHaveProperty('leadingComments');
    expect(normalized).not.toHaveProperty('trailingComments');
    expect(normalized).not.toHaveProperty('innerComments');
  });

  it('recursively normalizes arrays', () => {
    const nodes = [
      { type: 'A', loc: { line: 1 } },
      { type: 'B', start: 5 },
    ];
    const normalized = normalizeAST(nodes) as Record<string, unknown>[];
    expect(normalized).toHaveLength(2);
    expect(normalized[0]).not.toHaveProperty('loc');
    expect(normalized[1]).not.toHaveProperty('start');
  });

  it('handles null and primitives', () => {
    expect(normalizeAST(null)).toBe(null);
    expect(normalizeAST(undefined)).toBe(undefined);
    expect(normalizeAST(42)).toBe(42);
    expect(normalizeAST('hello')).toBe('hello');
  });
});

describe('hashFunctionAST', () => {
  it('produces stable hash for same function with different whitespace', () => {
    const fn1 = 'function add(a, b) { return a + b; }';
    const fn2 = 'function add(a,b){return a+b;}';
    const hash1 = hashFunctionAST(fn1);
    const hash2 = hashFunctionAST(fn2);
    expect(hash1).toBe(hash2);
  });

  it('produces stable hash when comments change', () => {
    const fn1 = 'function greet(name) { return "hello " + name; }';
    const fn2 = '// Greet the user\nfunction greet(name) { /* say hi */ return "hello " + name; }';
    const hash1 = hashFunctionAST(fn1);
    const hash2 = hashFunctionAST(fn2);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for semantically different functions', () => {
    const fn1 = 'function add(a, b) { return a + b; }';
    const fn2 = 'function add(a, b) { return a - b; }';
    const hash1 = hashFunctionAST(fn1);
    const hash2 = hashFunctionAST(fn2);
    expect(hash1).not.toBe(hash2);
  });

  it('produces different hashes when parameter names change', () => {
    const fn1 = 'function f(x) { return x; }';
    const fn2 = 'function f(y) { return y; }';
    const hash1 = hashFunctionAST(fn1);
    const hash2 = hashFunctionAST(fn2);
    expect(hash1).not.toBe(hash2);
  });

  it('handles arrow functions', () => {
    const fn = 'const add = (a, b) => a + b;';
    const hash = hashFunctionAST(fn);
    expect(hash).toHaveLength(64);
  });

  it('handles async functions', () => {
    const fn = 'async function fetchData(url) { return await fetch(url); }';
    const hash = hashFunctionAST(fn);
    expect(hash).toHaveLength(64);
  });
});
