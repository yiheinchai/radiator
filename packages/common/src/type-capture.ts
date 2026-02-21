import type { RadiatorType } from './types.js';

const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_SAMPLES = 3;
const MAX_PROPERTIES = 50;

/**
 * Capture the runtime type of a JavaScript value.
 * Returns a RadiatorType describing the value's structure with example data.
 */
export function captureType(value: unknown, maxDepth: number = 3): RadiatorType {
  if (value === null) {
    return { kind: 'null', name: 'null', examples: [null] };
  }

  if (value === undefined) {
    return { kind: 'undefined', name: 'undefined', examples: [undefined] };
  }

  const jsType = typeof value;

  // Primitives
  if (jsType === 'string') {
    const str = value as string;
    const example = str.length > MAX_STRING_LENGTH ? str.slice(0, MAX_STRING_LENGTH) + '...' : str;
    return { kind: 'primitive', name: 'string', examples: [example] };
  }

  if (jsType === 'number' || jsType === 'boolean' || jsType === 'bigint' || jsType === 'symbol') {
    const example = jsType === 'bigint' ? value.toString() : jsType === 'symbol' ? value.toString() : value;
    return { kind: 'primitive', name: jsType, examples: [example] };
  }

  // Functions
  if (jsType === 'function') {
    const fn = value as Function;
    return {
      kind: 'function',
      name: fn.name || 'anonymous',
      parameters: Array.from({ length: fn.length }, (_, i) => ({
        name: `arg${i}`,
        type: { kind: 'undefined' as const, name: 'unknown' },
      })),
    };
  }

  // Arrays
  if (Array.isArray(value)) {
    const samples = value.slice(0, MAX_ARRAY_SAMPLES);
    let elementType: RadiatorType | undefined;

    if (maxDepth > 0 && samples.length > 0) {
      const elementTypes = samples.map((el) => captureType(el, maxDepth - 1));
      elementType = elementTypes.length === 1 ? elementTypes[0] : mergeMultipleTypes(elementTypes);
    }

    const typeName = elementType ? `Array<${elementType.name}>` : 'Array<unknown>';

    return {
      kind: 'array',
      name: typeName,
      elementType,
      examples: [snapshotArray(samples, maxDepth)],
    };
  }

  // Objects
  const constructorName = (value as object).constructor?.name;
  const isPlainObject = constructorName === 'Object' || constructorName === undefined;

  const properties: Record<string, RadiatorType> = {};
  if (maxDepth > 0) {
    const keys = Object.keys(value as object);
    const limitedKeys = keys.slice(0, MAX_PROPERTIES);
    for (const key of limitedKeys) {
      try {
        properties[key] = captureType((value as Record<string, unknown>)[key], maxDepth - 1);
      } catch {
        properties[key] = { kind: 'undefined', name: 'unknown' };
      }
    }
  }

  return {
    kind: isPlainObject ? 'object' : 'class',
    name: constructorName || 'Object',
    constructorName: constructorName || undefined,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    examples: maxDepth > 0 ? [snapshotValue(value, 2)] : undefined,
  };
}

/**
 * Create a depth-limited snapshot of a value for example storage.
 */
export function snapshotValue(value: unknown, maxDepth: number = 2): unknown {
  if (value === null || value === undefined) return value;

  const jsType = typeof value;
  if (jsType === 'string') {
    const str = value as string;
    return str.length > MAX_STRING_LENGTH ? str.slice(0, MAX_STRING_LENGTH) + '...' : str;
  }
  if (jsType === 'number' || jsType === 'boolean') return value;
  if (jsType === 'bigint') return value.toString();
  if (jsType === 'symbol') return value.toString();
  if (jsType === 'function') return `[Function: ${(value as Function).name || 'anonymous'}]`;

  if (maxDepth <= 0) {
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    return `[${(value as object).constructor?.name || 'Object'}]`;
  }

  if (Array.isArray(value)) {
    return snapshotArray(value, maxDepth);
  }

  const result: Record<string, unknown> = {};
  const keys = Object.keys(value as object).slice(0, MAX_PROPERTIES);
  for (const key of keys) {
    try {
      result[key] = snapshotValue((value as Record<string, unknown>)[key], maxDepth - 1);
    } catch {
      result[key] = '[Error reading property]';
    }
  }
  return result;
}

function snapshotArray(arr: unknown[], maxDepth: number): unknown[] {
  return arr.slice(0, MAX_ARRAY_SAMPLES).map((el) => snapshotValue(el, maxDepth - 1));
}

/**
 * Merge multiple RadiatorTypes into a single type (union if different).
 */
function mergeMultipleTypes(types: RadiatorType[]): RadiatorType {
  if (types.length === 0) return { kind: 'undefined', name: 'unknown' };
  if (types.length === 1) return types[0];

  // Check if all types are the same kind and name
  const allSameKind = types.every((t) => t.kind === types[0].kind && t.name === types[0].name);
  if (allSameKind) {
    // Merge properties if objects
    if (types[0].kind === 'object' || types[0].kind === 'class') {
      const mergedProperties: Record<string, RadiatorType> = {};
      for (const t of types) {
        if (t.properties) {
          for (const [key, propType] of Object.entries(t.properties)) {
            if (!mergedProperties[key]) {
              mergedProperties[key] = propType;
            }
          }
        }
      }
      return { ...types[0], properties: mergedProperties };
    }
    return types[0];
  }

  // Different types → union
  const uniqueTypes = deduplicateTypes(types);
  if (uniqueTypes.length === 1) return uniqueTypes[0];

  return {
    kind: 'union',
    name: uniqueTypes.map((t) => t.name).join(' | '),
    unionOf: uniqueTypes,
  };
}

function deduplicateTypes(types: RadiatorType[]): RadiatorType[] {
  const seen = new Set<string>();
  const result: RadiatorType[] = [];
  for (const t of types) {
    const key = `${t.kind}:${t.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(t);
    }
  }
  return result;
}
