import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import radiatorPlugin from '../plugin.js';

function transform(code: string, options = {}) {
  const result = transformSync(code, {
    plugins: [[radiatorPlugin, options]],
    filename: '/src/test.ts',
    configFile: false,
    babelrc: false,
  });
  return result?.code ?? '';
}

describe('radiatorPlugin', () => {
  it('instruments a simple function declaration', () => {
    const code = `function add(a, b) { return a + b; }`;
    const output = transform(code);

    expect(output).toContain('__rad_enter');
    expect(output).toContain('__rad_capture');
    expect(output).toContain('__rad_exit');
    expect(output).toContain('__rad_return');
  });

  it('adds import statement for capture functions', () => {
    const code = `function greet(name) { return "hello " + name; }`;
    const output = transform(code);

    expect(output).toContain('import');
    expect(output).toContain('@radiator/client');
    expect(output).toContain('enterFunction');
  });

  it('captures parameters', () => {
    const code = `function greet(name, age) { return name + age; }`;
    const output = transform(code);

    // Should capture both parameters
    expect(output).toContain('"name"');
    expect(output).toContain('"age"');
  });

  it('wraps body in try/catch/finally', () => {
    const code = `function risky() { return 42; }`;
    const output = transform(code);

    expect(output).toContain('try');
    expect(output).toContain('catch');
    expect(output).toContain('finally');
    expect(output).toContain('__rad_error');
    expect(output).toContain('throw __rad_err');
  });

  it('instruments arrow functions', () => {
    const code = `const add = (a, b) => a + b;`;
    const output = transform(code);

    expect(output).toContain('__rad_enter');
    expect(output).toContain('__rad_capture');
  });

  it('instruments arrow functions with block body', () => {
    const code = `const add = (a, b) => { return a + b; };`;
    const output = transform(code);

    expect(output).toContain('__rad_enter');
    expect(output).toContain('__rad_return');
  });

  it('captures local variables after declaration', () => {
    const code = `function process(data) {
      const result = data.map(x => x * 2);
      const total = result.reduce((a, b) => a + b, 0);
      return total;
    }`;
    const output = transform(code);

    // Should capture 'result' and 'total' after their declarations
    expect(output).toContain('"result"');
    expect(output).toContain('"total"');
  });

  it('handles destructured parameters', () => {
    const code = `function greet({name, age}) { return name; }`;
    const output = transform(code);

    expect(output).toContain('"name"');
    expect(output).toContain('"age"');
  });

  it('handles rest parameters', () => {
    const code = `function sum(...nums) { return nums.reduce((a, b) => a + b); }`;
    const output = transform(code);

    expect(output).toContain('"nums"');
  });

  it('handles default parameters', () => {
    const code = `function greet(name = "World") { return "Hello " + name; }`;
    const output = transform(code);

    expect(output).toContain('"name"');
  });

  it('embeds function hash as string literal', () => {
    const code = `function add(a, b) { return a + b; }`;
    const output = transform(code);

    // The hash should be a 64-char hex string embedded as a literal
    const hashMatch = output.match(/"([0-9a-f]{64})"/);
    expect(hashMatch).not.toBeNull();
  });

  it('produces stable hashes for same function with different formatting', () => {
    const code1 = `function add(a, b) { return a + b; }`;
    const code2 = `function add(a,b){return a+b;}`;

    const output1 = transform(code1);
    const output2 = transform(code2);

    const hash1 = output1.match(/"([0-9a-f]{64})"/)?.[1];
    const hash2 = output2.match(/"([0-9a-f]{64})"/)?.[1];

    expect(hash1).toBe(hash2);
  });

  it('skips node_modules by default', () => {
    const code = `function add(a, b) { return a + b; }`;
    const result = transformSync(code, {
      plugins: [[radiatorPlugin, {}]],
      filename: '/node_modules/lodash/add.js',
      configFile: false,
      babelrc: false,
    });

    // Should not be instrumented
    expect(result?.code).not.toContain('__rad_enter');
  });

  it('handles async functions', () => {
    const code = `async function fetchData(url) { const response = await fetch(url); return response.json(); }`;
    const output = transform(code);

    expect(output).toContain('__rad_enter');
    expect(output).toContain('"url"');
    expect(output).toContain('"response"');
  });

  it('instruments class methods', () => {
    const code = `class Calculator {
      add(a, b) { return a + b; }
    }`;
    const output = transform(code);

    expect(output).toContain('__rad_enter');
    expect(output).toContain('"a"');
    expect(output).toContain('"b"');
  });

  it('captures function name from variable assignment', () => {
    const code = `const greet = function(name) { return "Hi " + name; };`;
    const output = transform(code);

    expect(output).toContain('"greet"');
  });
});
