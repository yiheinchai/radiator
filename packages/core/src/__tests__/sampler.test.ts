import { describe, it, expect, beforeEach } from 'vitest';
import { Sampler } from '../capture/sampler.js';

describe('Sampler', () => {
  let sampler: Sampler;

  beforeEach(() => {
    sampler = new Sampler();
  });

  it('captures the first 10 calls', () => {
    const hash = 'test-hash';
    for (let i = 0; i < 10; i++) {
      expect(sampler.shouldCapture(hash)).toBe(true);
    }
  });

  it('does not capture calls 11-99', () => {
    const hash = 'test-hash';
    // Consume first 10
    for (let i = 0; i < 10; i++) sampler.shouldCapture(hash);

    // Calls 11-99 should not be captured
    let capturedCount = 0;
    for (let i = 11; i < 100; i++) {
      if (sampler.shouldCapture(hash)) capturedCount++;
    }
    expect(capturedCount).toBe(0);
  });

  it('captures at call 100', () => {
    const hash = 'test-hash';
    // Consume first 99
    for (let i = 0; i < 99; i++) sampler.shouldCapture(hash);

    // Call 100 should be captured
    expect(sampler.shouldCapture(hash)).toBe(true);
  });

  it('captures at call 1000', () => {
    const hash = 'test-hash';
    // Consume first 999
    for (let i = 0; i < 999; i++) sampler.shouldCapture(hash);

    // Call 1000 should be captured
    expect(sampler.shouldCapture(hash)).toBe(true);
  });

  it('tracks different functions independently', () => {
    const hash1 = 'func-1';
    const hash2 = 'func-2';

    // Call hash1 5 times
    for (let i = 0; i < 5; i++) sampler.shouldCapture(hash1);

    // hash2 should still start fresh
    expect(sampler.shouldCapture(hash2)).toBe(true);
    expect(sampler.getCallCount(hash2)).toBe(1);
    expect(sampler.getCallCount(hash1)).toBe(5);
  });

  it('resets correctly', () => {
    const hash = 'test-hash';
    for (let i = 0; i < 20; i++) sampler.shouldCapture(hash);
    expect(sampler.getCallCount(hash)).toBe(20);

    sampler.reset();
    expect(sampler.getCallCount(hash)).toBe(0);
    expect(sampler.shouldCapture(hash)).toBe(true);
  });
});
