import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectStore } from '../store/object-store.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('ObjectStore', () => {
  let tempDir: string;
  let store: ObjectStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'radiator-test-'));
    store = new ObjectStore(tempDir);
    await store.init();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes and reads an object', async () => {
    const content = Buffer.from('hello world');
    const hash = await store.writeObject('blob', content);

    expect(hash).toHaveLength(64);

    const result = await store.readObject(hash);
    expect(Buffer.from(result.content).toString()).toBe('hello world');
  });

  it('produces consistent hashes for the same content', async () => {
    const content = Buffer.from('test data');
    const hash1 = await store.writeObject('blob', content);
    const hash2 = await store.writeObject('blob', content);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different content', async () => {
    const hash1 = await store.writeObject('blob', Buffer.from('hello'));
    const hash2 = await store.writeObject('blob', Buffer.from('world'));
    expect(hash1).not.toBe(hash2);
  });

  it('checks if object exists', async () => {
    const content = Buffer.from('test');
    const hash = await store.writeObject('blob', content);

    expect(await store.hasObject(hash)).toBe(true);
    expect(await store.hasObject('nonexistent')).toBe(false);
  });

  it('lists all stored objects', async () => {
    const hash1 = await store.writeObject('blob', Buffer.from('one'));
    const hash2 = await store.writeObject('blob', Buffer.from('two'));
    const hash3 = await store.writeObject('blob', Buffer.from('three'));

    const hashes: string[] = [];
    for await (const hash of store.listObjects()) {
      hashes.push(hash);
    }

    expect(hashes).toContain(hash1);
    expect(hashes).toContain(hash2);
    expect(hashes).toContain(hash3);
  });

  it('is idempotent (writing same content twice)', async () => {
    const content = Buffer.from('idempotent');
    const hash1 = await store.writeObject('blob', content);
    const hash2 = await store.writeObject('blob', content);
    expect(hash1).toBe(hash2);
  });
});
