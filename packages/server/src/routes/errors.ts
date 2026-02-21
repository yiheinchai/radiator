import { Router, type Router as RouterType } from 'express';
import { getDatabase } from '../db/database.js';

const router: RouterType = Router();

// List errors with filtering
router.get('/', (req, res) => {
  const { codebaseId, since, until, limit = '50', offset = '0', errorName } = req.query;

  const db = getDatabase();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (codebaseId) {
    conditions.push('codebase_id = ?');
    params.push(codebaseId);
  }
  if (since) {
    conditions.push('created_at >= ?');
    params.push(Number(since));
  }
  if (until) {
    conditions.push('created_at <= ?');
    params.push(Number(until));
  }
  if (errorName) {
    conditions.push('error_name = ?');
    params.push(errorName);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM error_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(query).all(...params);

  // Also get total count
  const countQuery = `SELECT COUNT(*) as total FROM error_logs ${where}`;
  const countParams = params.slice(0, -2);
  const count = db.prepare(countQuery).get(...countParams) as any;

  res.json({
    errors: rows,
    total: count.total,
    limit: Number(limit),
    offset: Number(offset),
  });
});

// Get error detail with snapshot
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  const error = db.prepare('SELECT * FROM error_logs WHERE id = ?').get(id) as any;
  if (!error) {
    res.status(404).json({ error: 'Error log not found' });
    return;
  }

  // Get associated snapshot
  const snapshot = db.prepare('SELECT data FROM snapshots WHERE id = ?').get(error.snapshot_id) as any;

  res.json({
    error,
    snapshot: snapshot ? JSON.parse(snapshot.data) : null,
  });
});

// Get error timeline data (aggregated by time buckets)
router.get('/timeline/:codebaseId', (req, res) => {
  const { codebaseId } = req.params;
  const { since, until, buckets = '50' } = req.query;

  const db = getDatabase();
  const sinceTs = Number(since) || Date.now() - 24 * 60 * 60 * 1000; // default: last 24h
  const untilTs = Number(until) || Date.now();
  const bucketCount = Number(buckets);
  const bucketSize = Math.floor((untilTs - sinceTs) / bucketCount);

  const rows = db
    .prepare(
      `SELECT
        (created_at - ?) / ? as bucket,
        COUNT(*) as count,
        error_name
      FROM error_logs
      WHERE codebase_id = ? AND created_at >= ? AND created_at <= ?
      GROUP BY bucket, error_name
      ORDER BY bucket`,
    )
    .all(sinceTs, bucketSize, codebaseId, sinceTs, untilTs);

  // Build timeline data
  const timeline = Array.from({ length: bucketCount }, (_, i) => ({
    timestamp: sinceTs + i * bucketSize,
    count: 0,
    errors: {} as Record<string, number>,
  }));

  for (const row of rows as any[]) {
    const idx = Math.min(row.bucket, bucketCount - 1);
    if (idx >= 0 && idx < bucketCount) {
      timeline[idx].count += row.count;
      timeline[idx].errors[row.error_name] = (timeline[idx].errors[row.error_name] ?? 0) + row.count;
    }
  }

  res.json({ timeline, since: sinceTs, until: untilTs, bucketSize });
});

export default router;
