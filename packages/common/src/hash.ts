import { createHash } from 'node:crypto';

/**
 * Hash arbitrary content to a SHA-256 hex string.
 */
export function hashContent(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Hash a git-style object: "type length\0content"
 */
export function hashObject(type: string, content: Uint8Array): string {
  const header = Buffer.from(`${type} ${content.length}\0`);
  return hashContent(Buffer.concat([header, content]));
}
