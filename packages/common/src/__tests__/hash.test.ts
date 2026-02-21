import { describe, it, expect } from 'vitest';
import { hashContent, hashObject } from '../hash.js';

describe('hashContent', () => {
  it('produces a consistent SHA-256 hex string', () => {
    const hash = hashContent('hello world');
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('produces different hashes for different content', () => {
    const hash1 = hashContent('hello');
    const hash2 = hashContent('world');
    expect(hash1).not.toBe(hash2);
  });

  it('works with Uint8Array input', () => {
    const bytes = new TextEncoder().encode('hello world');
    const hash = hashContent(bytes);
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('produces 64-character hex string', () => {
    const hash = hashContent('test');
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });
});

describe('hashObject', () => {
  it('hashes with git-style header: "type length\\0content"', () => {
    const content = Buffer.from('hello');
    const hash = hashObject('blob', content);
    expect(hash).toHaveLength(64);
  });

  it('produces different hashes for different types', () => {
    const content = Buffer.from('hello');
    const blobHash = hashObject('blob', content);
    const treeHash = hashObject('tree', content);
    expect(blobHash).not.toBe(treeHash);
  });

  it('produces different hashes for different content', () => {
    const hash1 = hashObject('blob', Buffer.from('hello'));
    const hash2 = hashObject('blob', Buffer.from('world'));
    expect(hash1).not.toBe(hash2);
  });
});
