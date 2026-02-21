import type { RadiatorType } from './types.js';

/**
 * Infer a property type from a cached type by following a property path.
 *
 * For example, if `person` is cached with type { name: string, car: { make: string } },
 * then inferPropertyType(cachedType, ['car', 'make']) returns { kind: 'primitive', name: 'string' }.
 */
export function inferPropertyType(
  cachedType: RadiatorType,
  propertyPath: string[],
): RadiatorType | null {
  let current = cachedType;

  for (const segment of propertyPath) {
    // Handle array element access (numeric index)
    if (/^\d+$/.test(segment)) {
      if (current.kind === 'array' && current.elementType) {
        current = current.elementType;
        continue;
      }
      return null;
    }

    // Handle object/class property access
    if ((current.kind === 'object' || current.kind === 'class') && current.properties?.[segment]) {
      current = current.properties[segment];
      continue;
    }

    // Handle union types: try each variant
    if (current.kind === 'union' && current.unionOf) {
      for (const variant of current.unionOf) {
        const result = inferPropertyType(variant, [segment]);
        if (result) {
          current = result;
          continue;
        }
      }
    }

    return null;
  }

  return current;
}

/**
 * Merge two RadiatorTypes, producing a union or merging properties.
 * Used to accumulate type information across multiple runtime samples.
 */
export function mergeTypes(existing: RadiatorType, incoming: RadiatorType): RadiatorType {
  // Same kind and name: merge properties/examples
  if (existing.kind === incoming.kind && existing.name === incoming.name) {
    return mergeSameKind(existing, incoming);
  }

  // Different types: produce a union
  const existingTypes =
    existing.kind === 'union' && existing.unionOf ? existing.unionOf : [existing];
  const incomingTypes =
    incoming.kind === 'union' && incoming.unionOf ? incoming.unionOf : [incoming];

  const allTypes = [...existingTypes];
  for (const t of incomingTypes) {
    const existingIdx = allTypes.findIndex((e) => e.kind === t.kind && e.name === t.name);
    if (existingIdx >= 0) {
      allTypes[existingIdx] = mergeSameKind(allTypes[existingIdx], t);
    } else {
      allTypes.push(t);
    }
  }

  if (allTypes.length === 1) return allTypes[0];

  return {
    kind: 'union',
    name: allTypes.map((t) => t.name).join(' | '),
    unionOf: allTypes,
  };
}

function mergeSameKind(existing: RadiatorType, incoming: RadiatorType): RadiatorType {
  const merged = { ...existing };

  // Merge examples (keep last N unique)
  if (incoming.examples) {
    const existingExamples = existing.examples ?? [];
    const combined = [...existingExamples, ...incoming.examples];
    merged.examples = combined.slice(-5); // keep last 5
  }

  // Merge object/class properties
  if (
    (existing.kind === 'object' || existing.kind === 'class') &&
    existing.properties &&
    incoming.properties
  ) {
    merged.properties = { ...existing.properties };
    for (const [key, incomingProp] of Object.entries(incoming.properties)) {
      if (merged.properties![key]) {
        merged.properties![key] = mergeTypes(merged.properties![key], incomingProp);
      } else {
        merged.properties![key] = incomingProp;
      }
    }
  }

  // Merge array element types
  if (existing.kind === 'array' && existing.elementType && incoming.elementType) {
    merged.elementType = mergeTypes(existing.elementType, incoming.elementType);
  }

  return merged;
}
