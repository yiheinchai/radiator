import type * as t from '@babel/types';

/**
 * Extract all bound names from function parameters, handling destructuring.
 *
 * Handles:
 * - Simple: (a, b) → ['a', 'b']
 * - Destructured objects: ({name, age}) → ['name', 'age']
 * - Renamed: ({name: n}) → ['n']
 * - Rest: ({...rest}) → ['rest']
 * - Array destructuring: ([first, ...others]) → ['first', 'others']
 * - Default values: (a = 5) → ['a']
 */
export function extractParamNames(params: t.Node[]): string[] {
  const names: string[] = [];
  for (const param of params) {
    extractNamesFromPattern(param, names);
  }
  return names;
}

/**
 * Extract all variable names declared in a function body via VariableDeclaration.
 */
export function extractLocalVarNames(body: t.Node): string[] {
  const names: string[] = [];

  if (!body || (body as t.BlockStatement).type !== 'BlockStatement') {
    return names;
  }

  const block = body as t.BlockStatement;
  for (const stmt of block.body) {
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        extractNamesFromPattern(decl.id, names);
      }
    }
  }

  return names;
}

function extractNamesFromPattern(node: t.Node, names: string[]): void {
  if (!node) return;

  switch (node.type) {
    case 'Identifier':
      names.push((node as t.Identifier).name);
      break;

    case 'AssignmentPattern':
      // (a = defaultValue) → extract 'a'
      extractNamesFromPattern((node as t.AssignmentPattern).left, names);
      break;

    case 'ObjectPattern':
      // ({name, age}) or ({name: n, ...rest})
      for (const prop of (node as t.ObjectPattern).properties) {
        if (prop.type === 'RestElement') {
          extractNamesFromPattern(prop.argument, names);
        } else if (prop.type === 'ObjectProperty') {
          extractNamesFromPattern(prop.value, names);
        }
      }
      break;

    case 'ArrayPattern':
      // ([first, second, ...rest])
      for (const element of (node as t.ArrayPattern).elements) {
        if (element) {
          extractNamesFromPattern(element, names);
        }
      }
      break;

    case 'RestElement':
      extractNamesFromPattern((node as t.RestElement).argument, names);
      break;

    default:
      break;
  }
}
