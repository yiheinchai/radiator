import { mkdir, readFile, writeFile, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { hashObject, compress, decompress } from '@radiator/common';

/**
 * Git-like content-addressable object store.
 *
 * Objects are stored as compressed files in a directory structure:
 *   .radiator/objects/ab/cdef1234...
 * (first 2 chars of hash as directory, remaining 62 chars as filename)
 */
export class ObjectStore {
  private objectsDir: string;

  constructor(private rootDir: string) {
    this.objectsDir = join(rootDir, 'objects');
  }

  async init(): Promise<void> {
    await mkdir(this.objectsDir, { recursive: true });
  }

  /**
   * Store an object, return its hash.
   */
  async writeObject(type: 'blob' | 'tree' | 'commit', content: Uint8Array): Promise<string> {
    const hash = hashObject(type, content);
    const dir = join(this.objectsDir, hash.slice(0, 2));
    const filePath = join(dir, hash.slice(2));

    // Skip if already exists (content-addressable = idempotent)
    if (await this.hasObject(hash)) {
      return hash;
    }

    await mkdir(dir, { recursive: true });
    const compressed = compress(content);
    await writeFile(filePath, compressed);

    return hash;
  }

  /**
   * Read an object by hash.
   */
  async readObject(hash: string): Promise<{ type: string; content: Uint8Array }> {
    const filePath = join(this.objectsDir, hash.slice(0, 2), hash.slice(2));
    const compressed = await readFile(filePath);
    const data = decompress(compressed);

    return { type: 'blob', content: data };
  }

  /**
   * Check if an object exists.
   */
  async hasObject(hash: string): Promise<boolean> {
    const filePath = join(this.objectsDir, hash.slice(0, 2), hash.slice(2));
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all object hashes.
   */
  async *listObjects(): AsyncIterable<string> {
    let dirs: string[];
    try {
      dirs = await readdir(this.objectsDir);
    } catch {
      return;
    }

    for (const prefix of dirs) {
      if (prefix.length !== 2) continue;
      const prefixDir = join(this.objectsDir, prefix);
      let files: string[];
      try {
        files = await readdir(prefixDir);
      } catch {
        continue;
      }
      for (const file of files) {
        yield prefix + file;
      }
    }
  }
}
