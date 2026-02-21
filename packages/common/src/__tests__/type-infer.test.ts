import { describe, it, expect } from 'vitest';
import { inferPropertyType, mergeTypes } from '../type-infer.js';
import type { RadiatorType } from '../types.js';

describe('inferPropertyType', () => {
  const personType: RadiatorType = {
    kind: 'object',
    name: 'Person',
    properties: {
      name: { kind: 'primitive', name: 'string', examples: ['Alice'] },
      age: { kind: 'primitive', name: 'number', examples: [30] },
      address: {
        kind: 'object',
        name: 'Address',
        properties: {
          city: { kind: 'primitive', name: 'string', examples: ['NYC'] },
          zip: { kind: 'primitive', name: 'string', examples: ['10001'] },
        },
      },
      hobbies: {
        kind: 'array',
        name: 'Array<string>',
        elementType: { kind: 'primitive', name: 'string', examples: ['reading'] },
      },
    },
  };

  it('resolves a direct property', () => {
    const result = inferPropertyType(personType, ['name']);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('primitive');
    expect(result!.name).toBe('string');
  });

  it('resolves a nested property path', () => {
    const result = inferPropertyType(personType, ['address', 'city']);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('string');
  });

  it('returns null for non-existent property', () => {
    const result = inferPropertyType(personType, ['car']);
    expect(result).toBeNull();
  });

  it('returns null for deep non-existent path', () => {
    const result = inferPropertyType(personType, ['address', 'country']);
    expect(result).toBeNull();
  });

  it('resolves array element type via numeric index', () => {
    const result = inferPropertyType(personType, ['hobbies', '0']);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('string');
  });

  it('returns the cached type itself for empty path', () => {
    const result = inferPropertyType(personType, []);
    expect(result).toBe(personType);
  });
});

describe('mergeTypes', () => {
  it('merges two identical primitive types', () => {
    const t1: RadiatorType = { kind: 'primitive', name: 'string', examples: ['hello'] };
    const t2: RadiatorType = { kind: 'primitive', name: 'string', examples: ['world'] };
    const merged = mergeTypes(t1, t2);
    expect(merged.kind).toBe('primitive');
    expect(merged.name).toBe('string');
    expect(merged.examples).toContain('hello');
    expect(merged.examples).toContain('world');
  });

  it('creates union for different types', () => {
    const t1: RadiatorType = { kind: 'primitive', name: 'string', examples: ['hello'] };
    const t2: RadiatorType = { kind: 'primitive', name: 'number', examples: [42] };
    const merged = mergeTypes(t1, t2);
    expect(merged.kind).toBe('union');
    expect(merged.unionOf).toHaveLength(2);
    expect(merged.name).toBe('string | number');
  });

  it('merges object properties', () => {
    const t1: RadiatorType = {
      kind: 'object',
      name: 'Object',
      properties: {
        name: { kind: 'primitive', name: 'string' },
      },
    };
    const t2: RadiatorType = {
      kind: 'object',
      name: 'Object',
      properties: {
        age: { kind: 'primitive', name: 'number' },
      },
    };
    const merged = mergeTypes(t1, t2);
    expect(merged.kind).toBe('object');
    expect(merged.properties!.name).toBeDefined();
    expect(merged.properties!.age).toBeDefined();
  });

  it('merges array element types', () => {
    const t1: RadiatorType = {
      kind: 'array',
      name: 'Array<string>',
      elementType: { kind: 'primitive', name: 'string' },
    };
    const t2: RadiatorType = {
      kind: 'array',
      name: 'Array<string>',
      elementType: { kind: 'primitive', name: 'string', examples: ['world'] },
    };
    const merged = mergeTypes(t1, t2);
    expect(merged.kind).toBe('array');
    expect(merged.elementType!.name).toBe('string');
  });

  it('merges into existing union', () => {
    const existing: RadiatorType = {
      kind: 'union',
      name: 'string | number',
      unionOf: [
        { kind: 'primitive', name: 'string' },
        { kind: 'primitive', name: 'number' },
      ],
    };
    const incoming: RadiatorType = { kind: 'null', name: 'null' };
    const merged = mergeTypes(existing, incoming);
    expect(merged.kind).toBe('union');
    expect(merged.unionOf).toHaveLength(3);
  });
});
