import _generate from '@babel/generator';
import type { NodePath } from '@babel/core';
import type * as t from '@babel/types';
import { hashFunctionAST } from '@radiator/common';

// Handle CJS/ESM interop: @babel/generator may export { default: fn } in CJS context
const generate = (typeof (_generate as any).default === 'function' ? (_generate as any).default : _generate) as typeof _generate;

/**
 * Compute the AST hash of a function at build time.
 *
 * This uses @babel/generator to print the function node back to source,
 * then hashes the normalized AST. The resulting hash is embedded as a
 * string literal in the output code, so there is zero hashing cost at runtime.
 */
export function computeHashAtBuildTime(functionPath: NodePath<t.Function>): string {
  const node = functionPath.node;

  // Generate source code from the AST node
  // @ts-expect-error - generator types are sometimes tricky
  const { code } = generate(node, { compact: true, comments: false });

  return hashFunctionAST(code);
}
