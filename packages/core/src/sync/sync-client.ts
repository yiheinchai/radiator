import type { FunctionTypeSnapshot } from '@radiator/common';
import { serializeToBytes, deserializeFromBytes } from '@radiator/common';

/**
 * Client for syncing local type cache with a remote radiator-server.
 */
export class SyncClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(serverUrl: string, apiKey: string) {
    this.baseUrl = serverUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  /**
   * Push a snapshot to the remote server.
   */
  async pushSnapshot(codebaseId: string, snapshot: FunctionTypeSnapshot): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ codebaseId, snapshot }),
    });

    if (!response.ok) {
      throw new Error(`Failed to push snapshot: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Pull a snapshot from the remote server by function hash.
   */
  async pullSnapshot(
    codebaseId: string,
    functionHash: string,
  ): Promise<FunctionTypeSnapshot | null> {
    const response = await fetch(
      `${this.baseUrl}/api/snapshots/${functionHash}?codebaseId=${codebaseId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`Failed to pull snapshot: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<FunctionTypeSnapshot>;
  }

  /**
   * Push multiple snapshots in batch.
   */
  async pushBatch(codebaseId: string, snapshots: FunctionTypeSnapshot[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/snapshots/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ codebaseId, snapshots }),
    });

    if (!response.ok) {
      throw new Error(`Failed to push batch: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Query error logs from the server.
   */
  async getErrors(
    codebaseId: string,
    options?: { limit?: number; since?: number; until?: number },
  ): Promise<unknown[]> {
    const params = new URLSearchParams({ codebaseId });
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.since) params.set('since', String(options.since));
    if (options?.until) params.set('until', String(options.until));

    const response = await fetch(`${this.baseUrl}/api/errors?${params}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get errors: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<unknown[]>;
  }
}
