import { hashContent } from './hash.js';
import { canonicalSerialize } from './serialize.js';

// Properties to strip from AST nodes for normalization
const STRIP_PROPERTIES = new Set([
  'loc',
  'start',
  'end',
  'leadingComments',
  'trailingComments',
  'innerComments',
  'comments',
  'extra',
  'range',
  'raw',
]);

/**
 * Normalize an AST node by stripping location info, comments, and extra metadata.
 * This produces a structure that is stable across formatting changes.
 */
export function normalizeAST(node: unknown): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node !== 'object') return node;

  if (Array.isArray(node)) {
    return node.map(normalizeAST);
  }

  const result: Record<string, unknown> = {};
  const obj = node as Record<string, unknown>;

  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    if (STRIP_PROPERTIES.has(key)) continue;
    result[key] = normalizeAST(obj[key]);
  }

  return result;
}

/**
 * Hash a function's source code by parsing to AST, normalizing, and hashing.
 * This produces stable hashes across whitespace/comment changes.
 *
 * Requires @babel/parser to be available (peer dependency).
 */
export function hashFunctionAST(functionSource: string): string {
  // Dynamic import to keep @babel/parser optional
  let parse: (code: string, options?: Record<string, unknown>) => unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const babelParser = require('@babel/parser');
    parse = babelParser.parse;
  } catch {
    // Fallback: hash the source directly with whitespace normalization
    const normalized = functionSource.replace(/\s+/g, ' ').trim();
    return hashContent(normalized);
  }

  try {
    const ast = parse(functionSource, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators'],
    });

    const normalized = normalizeAST(ast);
    const serialized = canonicalSerialize(normalized);
    return hashContent(serialized);
  } catch {
    // If parsing fails, fall back to normalized source hashing
    const normalized = functionSource.replace(/\s+/g, ' ').trim();
    return hashContent(normalized);
  }
}

/**
 * Hash a function AST node that has already been parsed (no re-parsing needed).
 * Used by the Babel plugin at build time.
 */
export function hashParsedAST(astNode: unknown): string {
  const normalized = normalizeAST(astNode);
  const serialized = canonicalSerialize(normalized);
  return hashContent(serialized);
}
