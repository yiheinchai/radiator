import Database from 'better-sqlite3';
import { join } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  org_id TEXT REFERENCES organizations(id),
  role TEXT NOT NULL DEFAULT 'member',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS codebases (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id),
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  function_hash TEXT NOT NULL,
  function_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  codebase_id TEXT REFERENCES codebases(id),
  capture_mode TEXT NOT NULL,
  data TEXT NOT NULL,
  sample_count INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_function_hash ON snapshots(function_hash);
CREATE INDEX IF NOT EXISTS idx_snapshots_codebase ON snapshots(codebase_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_mode ON snapshots(capture_mode);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  codebase_id TEXT REFERENCES codebases(id),
  snapshot_id TEXT REFERENCES snapshots(id),
  error_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  function_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_errors_codebase ON error_logs(codebase_id);
CREATE INDEX IF NOT EXISTS idx_errors_created ON error_logs(created_at);
`;

let db: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (!db) {
    const path = dbPath ?? join(process.cwd(), 'radiator-server.db');
    db = new Database(path);
    db.pragma('journal_mode = WAL');
    db.exec(SCHEMA);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
