/**
 * Logarithmic sampler to minimize capture overhead in normal mode.
 *
 * Captures the first 10 calls to each function, then logarithmically:
 * call 10, 100, 1000, 10000, etc.
 */
export class Sampler {
  private callCounts: Map<string, number> = new Map();

  /**
   * Returns true if this function call should be captured.
   */
  shouldCapture(functionHash: string): boolean {
    const count = (this.callCounts.get(functionHash) ?? 0) + 1;
    this.callCounts.set(functionHash, count);

    // Always capture the first 10 calls
    if (count <= 10) return true;

    // Then capture at powers of 10: 100, 1000, 10000, ...
    if (count >= 100 && isPowerOf10(count)) return true;

    return false;
  }

  /**
   * Reset the sampler (e.g., for testing).
   */
  reset(): void {
    this.callCounts.clear();
  }

  /**
   * Get the call count for a function.
   */
  getCallCount(functionHash: string): number {
    return this.callCounts.get(functionHash) ?? 0;
  }
}

function isPowerOf10(n: number): boolean {
  if (n <= 0) return false;
  while (n >= 10) {
    if (n % 10 !== 0) return false;
    n = n / 10;
  }
  return n === 1;
}
