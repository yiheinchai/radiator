import { describe, it, expect } from 'vitest';
import {
  canonicalSerialize,
  compress,
  decompress,
  serializeToBytes,
  deserializeFromBytes,
} from '../serialize.js';

describe('canonicalSerialize', () => {
  it('produces consistent output regardless of key order', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(canonicalSerialize(obj1)).toBe(canonicalSerialize(obj2));
  });

  it('sorts keys in nested objects', () => {
    const obj = { z: { b: 2, a: 1 }, a: 1 };
    const serialized = canonicalSerialize(obj);
    expect(serialized).toBe('{"a":1,"z":{"a":1,"b":2}}');
  });

  it('handles arrays without sorting elements', () => {
    const arr = [3, 1, 2];
    expect(canonicalSerialize(arr)).toBe('[3,1,2]');
  });

  it('handles primitives', () => {
    expect(canonicalSerialize('hello')).toBe('"hello"');
    expect(canonicalSerialize(42)).toBe('42');
    expect(canonicalSerialize(null)).toBe('null');
  });
});

describe('compress/decompress', () => {
  it('round-trips data correctly', () => {
    const original = Buffer.from('hello world, this is a test of compression');
    const compressed = compress(original);
    const decompressed = decompress(compressed);
    expect(Buffer.from(decompressed).toString()).toBe(original.toString());
  });

  it('compresses data to smaller size for repetitive content', () => {
    const original = Buffer.from('aaaa'.repeat(1000));
    const compressed = compress(original);
    expect(compressed.length).toBeLessThan(original.length);
  });
});

describe('serializeToBytes/deserializeFromBytes', () => {
  it('round-trips an object', () => {
    const obj = { name: 'test', value: 42, nested: { a: true } };
    const bytes = serializeToBytes(obj);
    const restored = deserializeFromBytes<typeof obj>(bytes);
    expect(restored).toEqual({ name: 'test', nested: { a: true }, value: 42 });
  });
});
