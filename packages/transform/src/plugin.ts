import type { PluginObj, NodePath, types as t } from '@babel/core';
import { extractParamNames } from './extract-params.js';
import { computeHashAtBuildTime } from './hash-at-build.js';

export interface RadiatorPluginOptions {
  mode?: 'normal' | 'error' | 'both';
  captureModule?: string;
  exclude?: string[];
  include?: string[];
  minStatements?: number;
}

// Track which files have been processed to add the import
const processedFiles = new WeakSet<object>();

export default function radiatorPlugin(
  { types: t }: { types: typeof import('@babel/types') },
  options: RadiatorPluginOptions = {},
): PluginObj {
  const {
    mode = 'both',
    captureModule = '@radiator/client',
    exclude = ['**/node_modules/**'],
    minStatements = 1,
  } = options;

  return {
    name: 'radiator-transform',
    visitor: {
      Program: {
        enter(path, state) {
          // Check if file should be excluded
          const filename = state.filename ?? '';
          for (const pattern of exclude) {
            if (matchGlob(filename, pattern)) {
              (state as any).__radiatorSkip = true;
              return;
            }
          }

          // Add import at the top of the file
          if (!processedFiles.has(path.node)) {
            processedFiles.add(path.node);

            const importDecl = t.importDeclaration(
              [
                t.importSpecifier(t.identifier('__rad_enter'), t.identifier('enterFunction')),
                t.importSpecifier(t.identifier('__rad_capture'), t.identifier('capture')),
                t.importSpecifier(t.identifier('__rad_return'), t.identifier('captureReturn')),
                t.importSpecifier(t.identifier('__rad_error'), t.identifier('onError')),
                t.importSpecifier(t.identifier('__rad_exit'), t.identifier('exitFunction')),
              ],
              t.stringLiteral(captureModule),
            );

            path.unshiftContainer('body', importDecl);
          }
        },
      },

      // Visit all function types
      'FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod|ClassMethod'(
        path: NodePath,
        state: any,
      ) {
        if (state.__radiatorSkip) return;

        const fnPath = path as NodePath<t.Function>;

        // Skip if already instrumented
        if ((fnPath.node as any).__radiatorInstrumented) return;

        // Skip trivial functions
        if (!shouldInstrument(fnPath, minStatements)) return;

        (fnPath.node as any).__radiatorInstrumented = true;
        const functionHash = computeHashAtBuildTime(fnPath);
        const functionName = getFunctionName(fnPath);
        const filePath = state.filename ?? 'unknown';

        const paramNames = extractParamNames(fnPath.node.params);

        // Ensure body is a block statement
        const body = fnPath.get('body');
        if (!body.isBlockStatement()) {
          // Convert arrow expression body to block
          const arrowNode = fnPath.node as t.ArrowFunctionExpression;
          const returnStmt = t.returnStatement(arrowNode.body as t.Expression);
          arrowNode.body = t.blockStatement([returnStmt]);
        }

        const blockBody = (fnPath.node.body as t.BlockStatement).body;

        // Build capture calls for parameters
        const paramCaptures: t.Statement[] = paramNames.map((name) =>
          t.expressionStatement(
            t.callExpression(t.identifier('__rad_capture'), [
              t.stringLiteral(functionHash),
              t.stringLiteral(name),
              t.identifier(name),
              t.objectExpression([
                t.objectProperty(t.identifier('line'), t.numericLiteral(0)),
                t.objectProperty(t.identifier('column'), t.numericLiteral(0)),
              ]),
            ]),
          ),
        );

        // Build enter call
        const enterCall = t.expressionStatement(
          t.callExpression(t.identifier('__rad_enter'), [
            t.stringLiteral(functionHash),
            t.stringLiteral(functionName),
            t.stringLiteral(filePath),
          ]),
        );

        // Build exit call
        const exitCall = t.expressionStatement(
          t.callExpression(t.identifier('__rad_exit'), [t.stringLiteral(functionHash)]),
        );

        // Inject captures after variable declarations in the body
        const instrumentedBody = instrumentBody(t, blockBody, functionHash);

        // Wrap return statements to capture return values
        const wrappedBody = wrapReturns(t, instrumentedBody, functionHash);

        // Build try/catch/finally wrapper
        const tryBlock = t.blockStatement([enterCall, ...paramCaptures, ...wrappedBody]);

        const catchParam = t.identifier('__rad_err');
        const catchBlock = t.blockStatement([
          t.expressionStatement(
            t.callExpression(t.identifier('__rad_error'), [
              t.stringLiteral(functionHash),
              catchParam,
            ]),
          ),
          t.throwStatement(catchParam),
        ]);

        const finallyBlock = t.blockStatement([exitCall]);

        const tryCatch = t.tryStatement(tryBlock, t.catchClause(catchParam, catchBlock), finallyBlock);

        (fnPath.node.body as t.BlockStatement).body = [tryCatch];
      },
    },
  };
}

/**
 * Get a human-readable name for a function.
 */
function getFunctionName(path: NodePath<t.Function>): string {
  const node = path.node;

  // Function declaration: function foo() {}
  if (node.type === 'FunctionDeclaration' && node.id) {
    return node.id.name;
  }

  // Class/Object method: { foo() {} }
  if (node.type === 'ClassMethod' || node.type === 'ObjectMethod') {
    const key = (node as t.ClassMethod | t.ObjectMethod).key;
    if (key.type === 'Identifier') return key.name;
    if (key.type === 'StringLiteral') return key.value;
  }

  // Variable assignment: const foo = () => {}
  const parent = path.parent;
  if (parent.type === 'VariableDeclarator' && (parent as t.VariableDeclarator).id.type === 'Identifier') {
    return ((parent as t.VariableDeclarator).id as t.Identifier).name;
  }

  // Property assignment: { foo: () => {} }
  if (parent.type === 'ObjectProperty') {
    const key = (parent as t.ObjectProperty).key;
    if (key.type === 'Identifier') return key.name;
  }

  return 'anonymous';
}

/**
 * Check if a function should be instrumented.
 */
function shouldInstrument(path: NodePath<t.Function>, minStatements: number): boolean {
  // Skip Babel-generated helper functions (no source location)
  if (!path.node.loc) return false;

  const body = path.node.body;

  // Arrow functions with expression body: always instrument
  if (body.type !== 'BlockStatement') return true;

  // Check minimum statement count
  return body.body.length >= minStatements;
}

/**
 * Inject capture calls after each VariableDeclaration in the body.
 */
function instrumentBody(
  t: typeof import('@babel/types'),
  body: t.Statement[],
  functionHash: string,
): t.Statement[] {
  const result: t.Statement[] = [];

  for (const stmt of body) {
    result.push(stmt);

    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        const names: string[] = [];
        extractDeclNames(decl.id, names);

        for (const name of names) {
          const line = stmt.loc?.start.line ?? 1;
          const col = stmt.loc?.start.column ?? 0;

          result.push(
            t.expressionStatement(
              t.callExpression(t.identifier('__rad_capture'), [
                t.stringLiteral(functionHash),
                t.stringLiteral(name),
                t.identifier(name),
                t.objectExpression([
                  t.objectProperty(t.identifier('line'), t.numericLiteral(line)),
                  t.objectProperty(t.identifier('column'), t.numericLiteral(col)),
                ]),
              ]),
            ),
          );
        }
      }
    }
  }

  return result;
}

/**
 * Wrap return statements to capture the return value.
 */
function wrapReturns(
  t: typeof import('@babel/types'),
  body: t.Statement[],
  functionHash: string,
): t.Statement[] {
  return body.map((stmt) => {
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      // const __rad_ret = <original expr>;
      // __rad_return(hash, __rad_ret);
      // return __rad_ret;
      const retId = t.identifier('__rad_ret');
      const varDecl = t.variableDeclaration('const', [
        t.variableDeclarator(retId, stmt.argument),
      ]);
      const captureCall = t.expressionStatement(
        t.callExpression(t.identifier('__rad_return'), [
          t.stringLiteral(functionHash),
          retId,
        ]),
      );
      const returnStmt = t.returnStatement(retId);

      // Wrap in a block to avoid variable name conflicts
      return t.blockStatement([varDecl, captureCall, returnStmt]);
    }
    return stmt;
  });
}

/**
 * Extract variable names from a declarator pattern.
 */
function extractDeclNames(node: t.LVal | t.Node, names: string[]): void {
  if (!node) return;
  if (node.type === 'Identifier') {
    names.push((node as t.Identifier).name);
  } else if (node.type === 'ObjectPattern') {
    for (const prop of (node as t.ObjectPattern).properties) {
      if (prop.type === 'RestElement') {
        extractDeclNames(prop.argument, names);
      } else if (prop.type === 'ObjectProperty') {
        extractDeclNames(prop.value as t.LVal, names);
      }
    }
  } else if (node.type === 'ArrayPattern') {
    for (const el of (node as t.ArrayPattern).elements) {
      if (el) extractDeclNames(el, names);
    }
  } else if (node.type === 'AssignmentPattern') {
    extractDeclNames((node as t.AssignmentPattern).left, names);
  }
}

/**
 * Simple glob matching (for exclude patterns).
 */
function matchGlob(filepath: string, pattern: string): boolean {
  // Convert glob to regex
  const regex = pattern
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLESTAR___/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(regex).test(filepath);
}
