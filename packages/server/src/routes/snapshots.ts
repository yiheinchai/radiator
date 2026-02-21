import { Router, type Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import type { FunctionTypeSnapshot } from '@radiator/common';

const router: RouterType = Router();

// Store a snapshot
router.post('/', (req, res) => {
  const { codebaseId, snapshot } = req.body as {
    codebaseId: string;
    snapshot: FunctionTypeSnapshot;
  };

  if (!codebaseId || !snapshot) {
    res.status(400).json({ error: 'codebaseId and snapshot are required' });
    return;
  }

  const db = getDatabase();
  const now = Date.now();

  // Check if snapshot for this function hash already exists
  const existing = db
    .prepare('SELECT id, sample_count FROM snapshots WHERE function_hash = ? AND codebase_id = ?')
    .get(snapshot.functionHash, codebaseId) as any;

  if (existing) {
    // Update existing
    db.prepare(
      'UPDATE snapshots SET data = ?, sample_count = ?, capture_mode = ?, updated_at = ? WHERE id = ?',
    ).run(JSON.stringify(snapshot), existing.sample_count + 1, snapshot.captureMode, now, existing.id);

    // If error mode, also create an error log
    if (snapshot.captureMode === 'error' && snapshot.error) {
      const errorId = uuidv4();
      db.prepare(
        'INSERT INTO error_logs (id, codebase_id, snapshot_id, error_name, error_message, error_stack, function_name, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        errorId,
        codebaseId,
        existing.id,
        snapshot.error.name,
        snapshot.error.message,
        snapshot.error.stack,
        snapshot.functionName,
        snapshot.filePath,
        now,
      );
    }

    res.json({ id: existing.id, updated: true });
  } else {
    // Create new
    const id = uuidv4();
    db.prepare(
      'INSERT INTO snapshots (id, function_hash, function_name, file_path, codebase_id, capture_mode, data, sample_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(
      id,
      snapshot.functionHash,
      snapshot.functionName,
      snapshot.filePath,
      codebaseId,
      snapshot.captureMode,
      JSON.stringify(snapshot),
      1,
      now,
      now,
    );

    // If error mode, create error log
    if (snapshot.captureMode === 'error' && snapshot.error) {
      const errorId = uuidv4();
      db.prepare(
        'INSERT INTO error_logs (id, codebase_id, snapshot_id, error_name, error_message, error_stack, function_name, file_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        errorId,
        codebaseId,
        id,
        snapshot.error.name,
        snapshot.error.message,
        snapshot.error.stack,
        snapshot.functionName,
        snapshot.filePath,
        now,
      );
    }

    res.status(201).json({ id, created: true });
  }
});

// Store batch of snapshots
router.post('/batch', (req, res) => {
  const { codebaseId, snapshots } = req.body as {
    codebaseId: string;
    snapshots: FunctionTypeSnapshot[];
  };

  if (!codebaseId || !snapshots) {
    res.status(400).json({ error: 'codebaseId and snapshots are required' });
    return;
  }

  const db = getDatabase();
  const results: { functionHash: string; id: string }[] = [];

  const insertOrUpdate = db.transaction(() => {
    for (const snapshot of snapshots) {
      const now = Date.now();
      const existing = db
        .prepare('SELECT id FROM snapshots WHERE function_hash = ? AND codebase_id = ?')
        .get(snapshot.functionHash, codebaseId) as any;

      if (existing) {
        db.prepare('UPDATE snapshots SET data = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(snapshot),
          now,
          existing.id,
        );
        results.push({ functionHash: snapshot.functionHash, id: existing.id });
      } else {
        const id = uuidv4();
        db.prepare(
          'INSERT INTO snapshots (id, function_hash, function_name, file_path, codebase_id, capture_mode, data, sample_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          id,
          snapshot.functionHash,
          snapshot.functionName,
          snapshot.filePath,
          codebaseId,
          snapshot.captureMode,
          JSON.stringify(snapshot),
          1,
          now,
          now,
        );
        results.push({ functionHash: snapshot.functionHash, id });
      }
    }
  });

  insertOrUpdate();
  res.json({ results });
});

// Get snapshot by function hash
router.get('/:functionHash', (req, res) => {
  const { functionHash } = req.params;
  const { codebaseId } = req.query;

  const db = getDatabase();
  let row: any;

  if (codebaseId) {
    row = db
      .prepare('SELECT data FROM snapshots WHERE function_hash = ? AND codebase_id = ?')
      .get(functionHash, codebaseId);
  } else {
    row = db.prepare('SELECT data FROM snapshots WHERE function_hash = ?').get(functionHash);
  }

  if (!row) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }

  res.json(JSON.parse(row.data));
});

export default router;
