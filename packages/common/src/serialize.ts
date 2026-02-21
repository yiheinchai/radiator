import { deflateSync, inflateSync } from 'node:zlib';

/**
 * Deterministic JSON serialization with sorted keys.
 * Produces consistent output for the same data regardless of key insertion order.
 */
export function canonicalSerialize(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value).sort()) {
        sorted[k] = value[k];
      }
      return sorted;
    }
    return value;
  });
}

/**
 * Compress data using zlib deflate.
 */
export function compress(data: Uint8Array): Uint8Array {
  return deflateSync(data);
}

/**
 * Decompress zlib-deflated data.
 */
export function decompress(data: Uint8Array): Uint8Array {
  return inflateSync(data);
}

/**
 * Serialize a FunctionTypeSnapshot or similar object to bytes for storage.
 */
export function serializeToBytes(obj: unknown): Uint8Array {
  const json = canonicalSerialize(obj);
  return Buffer.from(json, 'utf-8');
}

/**
 * Deserialize bytes back to an object.
 */
export function deserializeFromBytes<T>(data: Uint8Array): T {
  const json = Buffer.from(data).toString('utf-8');
  return JSON.parse(json) as T;
}
