import { Router, type Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';

const router: RouterType = Router();

// Create codebase
router.post('/', (req, res) => {
  const { name } = req.body;
  const user = (req as any).user;

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const db = getDatabase();
  const id = uuidv4();

  db.prepare('INSERT INTO codebases (id, org_id, name, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    user.orgId,
    name,
    Date.now(),
  );

  res.status(201).json({ id, name });
});

// List codebases for org
router.get('/', (req, res) => {
  const user = (req as any).user;
  const db = getDatabase();

  const codebases = db.prepare('SELECT * FROM codebases WHERE org_id = ?').all(user.orgId);
  res.json(codebases);
});

// Get codebase by id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  const codebase = db.prepare('SELECT * FROM codebases WHERE id = ?').get(id);
  if (!codebase) {
    res.status(404).json({ error: 'Codebase not found' });
    return;
  }

  res.json(codebase);
});

export default router;
