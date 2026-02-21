import type {
  RadiatorTree,
  RadiatorCommit,
  TreeEntry,
  FunctionTypeSnapshot,
} from '@radiator/common';
import { hashContent, canonicalSerialize, serializeToBytes } from '@radiator/common';
import { ObjectStore } from './object-store.js';

/**
 * Builds tree hierarchies (file → functions → variables) and commits.
 */
export class TreeBuilder {
  constructor(private store: ObjectStore) {}

  /**
   * Store a function snapshot as a blob and return its hash.
   */
  async storeSnapshot(snapshot: FunctionTypeSnapshot): Promise<string> {
    const bytes = serializeToBytes(snapshot);
    return this.store.writeObject('blob', bytes);
  }

  /**
   * Build a tree from a set of function snapshots for a single file.
   */
  async buildFileTree(filePath: string, snapshots: FunctionTypeSnapshot[]): Promise<RadiatorTree> {
    const entries: TreeEntry[] = [];

    for (const snapshot of snapshots) {
      const hash = await this.storeSnapshot(snapshot);
      entries.push({
        name: `${snapshot.functionName}:${snapshot.functionHash.slice(0, 8)}`,
        hash,
        mode: 'blob',
      });
    }

    // Sort entries for deterministic tree hash
    entries.sort((a, b) => a.name.localeCompare(b.name));

    const treeContent = canonicalSerialize(entries);
    const hash = hashContent(treeContent);

    return { type: 'tree', hash, entries };
  }

  /**
   * Build the root tree from all file trees.
   */
  async buildRootTree(fileTrees: Map<string, RadiatorTree>): Promise<RadiatorTree> {
    const entries: TreeEntry[] = [];

    for (const [filePath, tree] of fileTrees) {
      entries.push({
        name: filePath,
        hash: tree.hash,
        mode: 'tree',
      });
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    const treeContent = canonicalSerialize(entries);
    const hash = hashContent(treeContent);

    return { type: 'tree', hash, entries };
  }

  /**
   * Create a commit pointing to a root tree.
   */
  createCommit(
    rootTree: RadiatorTree,
    codebaseId: string,
    message: string,
    parentHash?: string,
  ): RadiatorCommit {
    const commitData = {
      tree: rootTree.hash,
      parent: parentHash,
      timestamp: Date.now(),
      message,
      codebaseId,
    };

    const hash = hashContent(canonicalSerialize(commitData));

    return {
      type: 'commit',
      hash,
      ...commitData,
    };
  }
}
