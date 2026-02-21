import { describe, it, expect } from 'vitest';
import { captureType, snapshotValue } from '../type-capture.js';

describe('captureType', () => {
  it('captures null', () => {
    const type = captureType(null);
    expect(type.kind).toBe('null');
    expect(type.name).toBe('null');
  });

  it('captures undefined', () => {
    const type = captureType(undefined);
    expect(type.kind).toBe('undefined');
    expect(type.name).toBe('undefined');
  });

  it('captures string', () => {
    const type = captureType('hello');
    expect(type.kind).toBe('primitive');
    expect(type.name).toBe('string');
    expect(type.examples).toEqual(['hello']);
  });

  it('truncates long strings', () => {
    const longStr = 'a'.repeat(300);
    const type = captureType(longStr);
    expect(type.examples![0]).toHaveLength(203); // 200 + '...'
  });

  it('captures number', () => {
    const type = captureType(42);
    expect(type.kind).toBe('primitive');
    expect(type.name).toBe('number');
    expect(type.examples).toEqual([42]);
  });

  it('captures boolean', () => {
    const type = captureType(true);
    expect(type.kind).toBe('primitive');
    expect(type.name).toBe('boolean');
    expect(type.examples).toEqual([true]);
  });

  it('captures arrays with element type', () => {
    const type = captureType([1, 2, 3]);
    expect(type.kind).toBe('array');
    expect(type.name).toBe('Array<number>');
    expect(type.elementType?.kind).toBe('primitive');
    expect(type.elementType?.name).toBe('number');
  });

  it('captures arrays with mixed element types as union', () => {
    const type = captureType([1, 'hello', true]);
    expect(type.kind).toBe('array');
    expect(type.elementType?.kind).toBe('union');
  });

  it('captures plain objects with properties', () => {
    const type = captureType({ name: 'Alice', age: 30 });
    expect(type.kind).toBe('object');
    expect(type.name).toBe('Object');
    expect(type.properties).toBeDefined();
    expect(type.properties!.name.kind).toBe('primitive');
    expect(type.properties!.name.name).toBe('string');
    expect(type.properties!.age.kind).toBe('primitive');
    expect(type.properties!.age.name).toBe('number');
  });

  it('captures class instances', () => {
    class Person {
      constructor(
        public name: string,
        public age: number,
      ) {}
    }
    const type = captureType(new Person('Alice', 30));
    expect(type.kind).toBe('class');
    expect(type.name).toBe('Person');
    expect(type.constructorName).toBe('Person');
    expect(type.properties!.name.name).toBe('string');
  });

  it('captures functions', () => {
    const type = captureType(function greet() {});
    expect(type.kind).toBe('function');
    expect(type.name).toBe('greet');
  });

  it('respects depth limits', () => {
    const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
    const type = captureType(deep, 2);
    expect(type.properties!.a.properties!.b.properties).toBeUndefined();
  });

  it('captures nested objects', () => {
    const obj = {
      person: { name: 'Alice', address: { city: 'NYC' } },
    };
    const type = captureType(obj);
    expect(type.properties!.person.kind).toBe('object');
    expect(type.properties!.person.properties!.address.kind).toBe('object');
    expect(type.properties!.person.properties!.address.properties!.city.kind).toBe('primitive');
  });
});

describe('snapshotValue', () => {
  it('snapshots primitives directly', () => {
    expect(snapshotValue(42)).toBe(42);
    expect(snapshotValue('hello')).toBe('hello');
    expect(snapshotValue(true)).toBe(true);
    expect(snapshotValue(null)).toBe(null);
  });

  it('snapshots objects with depth limit', () => {
    const obj = { a: { b: { c: 'deep' } } };
    const snapshot = snapshotValue(obj, 1) as Record<string, unknown>;
    expect(snapshot.a).toBe('[Object]');
  });

  it('snapshots arrays with limit', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const snapshot = snapshotValue(arr, 2) as unknown[];
    expect(snapshot).toHaveLength(3); // MAX_ARRAY_SAMPLES = 3
  });

  it('snapshots functions as descriptive strings', () => {
    const snapshot = snapshotValue(function myFunc() {});
    expect(snapshot).toBe('[Function: myFunc]');
  });
});
