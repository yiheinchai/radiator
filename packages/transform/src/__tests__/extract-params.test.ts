import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { extractParamNames, extractLocalVarNames } from '../extract-params.js';

function parseParams(code: string): any[] {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
  const fn = ast.program.body[0] as any;
  // Handle both function declarations and variable declarations
  if (fn.type === 'FunctionDeclaration') return fn.params;
  if (fn.type === 'VariableDeclaration') return fn.declarations[0].init.params;
  if (fn.type === 'ExpressionStatement') return fn.expression.params;
  return [];
}

function parseBody(code: string): any {
  const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
  const fn = ast.program.body[0] as any;
  if (fn.type === 'FunctionDeclaration') return fn.body;
  if (fn.type === 'VariableDeclaration') return fn.declarations[0].init.body;
  return null;
}

describe('extractParamNames', () => {
  it('extracts simple parameters', () => {
    const params = parseParams('function f(a, b, c) {}');
    expect(extractParamNames(params)).toEqual(['a', 'b', 'c']);
  });

  it('extracts destructured object parameters', () => {
    const params = parseParams('function f({name, age}) {}');
    expect(extractParamNames(params)).toEqual(['name', 'age']);
  });

  it('extracts renamed destructured parameters', () => {
    const params = parseParams('function f({name: n, age: a}) {}');
    expect(extractParamNames(params)).toEqual(['n', 'a']);
  });

  it('extracts rest parameters', () => {
    const params = parseParams('function f(a, ...rest) {}');
    expect(extractParamNames(params)).toEqual(['a', 'rest']);
  });

  it('extracts object rest parameters', () => {
    const params = parseParams('function f({name, ...rest}) {}');
    expect(extractParamNames(params)).toEqual(['name', 'rest']);
  });

  it('extracts array destructured parameters', () => {
    const params = parseParams('function f([first, second]) {}');
    expect(extractParamNames(params)).toEqual(['first', 'second']);
  });

  it('extracts array rest parameters', () => {
    const params = parseParams('function f([first, ...others]) {}');
    expect(extractParamNames(params)).toEqual(['first', 'others']);
  });

  it('extracts default value parameters', () => {
    const params = parseParams('function f(a = 5, b = "hello") {}');
    expect(extractParamNames(params)).toEqual(['a', 'b']);
  });

  it('handles mixed parameter patterns', () => {
    const params = parseParams('function f(a, {b, c: d}, [e, ...f], ...g) {}');
    expect(extractParamNames(params)).toEqual(['a', 'b', 'd', 'e', 'f', 'g']);
  });

  it('handles empty parameters', () => {
    const params = parseParams('function f() {}');
    expect(extractParamNames(params)).toEqual([]);
  });
});

describe('extractLocalVarNames', () => {
  it('extracts const declarations', () => {
    const body = parseBody('function f() { const x = 1; const y = 2; }');
    expect(extractLocalVarNames(body)).toEqual(['x', 'y']);
  });

  it('extracts let declarations', () => {
    const body = parseBody('function f() { let x = 1; }');
    expect(extractLocalVarNames(body)).toEqual(['x']);
  });

  it('extracts destructured declarations', () => {
    const body = parseBody('function f() { const {a, b} = obj; }');
    expect(extractLocalVarNames(body)).toEqual(['a', 'b']);
  });

  it('extracts array destructured declarations', () => {
    const body = parseBody('function f() { const [first, ...rest] = arr; }');
    expect(extractLocalVarNames(body)).toEqual(['first', 'rest']);
  });

  it('handles no declarations', () => {
    const body = parseBody('function f() { return 42; }');
    expect(extractLocalVarNames(body)).toEqual([]);
  });
});
