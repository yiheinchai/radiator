import type { RadiatorType } from '@radiator/common';

/**
 * Format a RadiatorType into a TypeScript-style type string.
 * e.g. "{ id: string; name: string; balance: number }"
 */
export function formatTypeName(type: RadiatorType): string {
  switch (type.kind) {
    case 'primitive':
      return type.name;

    case 'null':
      return 'null';

    case 'undefined':
      return 'undefined';

    case 'object': {
      if (!type.properties || Object.keys(type.properties).length === 0) {
        return type.name === 'object' ? '{}' : type.name;
      }
      const entries = Object.entries(type.properties);
      if (entries.length <= 3) {
        const props = entries
          .map(([key, val]) => `${key}: ${formatTypeName(val)}`)
          .join('; ');
        return `{ ${props} }`;
      }
      // For larger objects, use a shortened form inline
      const first3 = entries
        .slice(0, 3)
        .map(([key, val]) => `${key}: ${formatTypeName(val)}`)
        .join('; ');
      return `{ ${first3}; ... }`;
    }

    case 'array': {
      if (type.elementType) {
        const inner = formatTypeName(type.elementType);
        // Wrap union types in parens for array syntax
        if (type.elementType.kind === 'union') {
          return `(${inner})[]`;
        }
        return `${inner}[]`;
      }
      return 'unknown[]';
    }

    case 'function': {
      const params = (type.parameters || [])
        .map((p) => {
          const opt = p.optional ? '?' : '';
          return `${p.name}${opt}: ${formatTypeName(p.type)}`;
        })
        .join(', ');
      const ret = type.returnType
        ? formatTypeName(type.returnType)
        : 'void';
      return `(${params}) => ${ret}`;
    }

    case 'class':
      return type.constructorName || type.name;

    case 'union': {
      if (!type.unionOf || type.unionOf.length === 0) return 'unknown';
      return type.unionOf.map(formatTypeName).join(' | ');
    }

    default:
      return type.name || 'unknown';
  }
}

/**
 * Format an object type with pretty-printed indentation (for hover display).
 * Produces multi-line output like:
 *   {
 *     id: string
 *     name: string
 *     balance: number
 *   }
 */
export function formatObjectType(
  type: RadiatorType,
  indent: number = 0
): string {
  const pad = '  '.repeat(indent);
  const innerPad = '  '.repeat(indent + 1);

  switch (type.kind) {
    case 'object': {
      if (!type.properties || Object.keys(type.properties).length === 0) {
        return '{}';
      }
      const lines = Object.entries(type.properties).map(
        ([key, val]) => {
          if (val.kind === 'object' && val.properties && Object.keys(val.properties).length > 0) {
            return `${innerPad}${key}: ${formatObjectType(val, indent + 1)}`;
          }
          return `${innerPad}${key}: ${formatTypeName(val)}`;
        }
      );
      return `{\n${lines.join('\n')}\n${pad}}`;
    }

    case 'array': {
      if (
        type.elementType?.kind === 'object' &&
        type.elementType.properties &&
        Object.keys(type.elementType.properties).length > 0
      ) {
        return `${formatObjectType(type.elementType, indent)}[]`;
      }
      return formatTypeName(type);
    }

    default:
      return formatTypeName(type);
  }
}

/**
 * Format example values from a RadiatorType as a JSON string.
 * Returns null if no examples are available.
 */
export function formatExamples(type: RadiatorType): string | null {
  if (!type.examples || type.examples.length === 0) return null;

  const examples = type.examples.slice(0, 3);

  if (examples.length === 1) {
    return formatSingleExample(examples[0]);
  }

  return examples.map(formatSingleExample).join('\n');
}

function formatSingleExample(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 80) {
      return JSON.stringify(value.substring(0, 77) + '...');
    }
    return JSON.stringify(value);
  }

  if (typeof value === 'object') {
    try {
      const json = JSON.stringify(value, null, 2);
      // If it's short enough, keep it on one line
      if (json.length <= 100) {
        return JSON.stringify(value);
      }
      return json;
    } catch {
      return String(value);
    }
  }

  return String(value);
}
