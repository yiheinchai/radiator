import { Router, type Router as RouterType } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database.js';
import { signToken } from '../middleware/auth.js';

const router: RouterType = Router();

router.post('/register', (req, res) => {
  const { email, password, orgName } = req.body;

  if (!email || !password || !orgName) {
    res.status(400).json({ error: 'email, password, and orgName are required' });
    return;
  }

  const db = getDatabase();

  // Check if email already exists
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const orgId = uuidv4();
  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = Date.now();

  db.prepare('INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)').run(
    orgId,
    orgName,
    now,
  );

  db.prepare(
    'INSERT INTO users (id, email, password_hash, org_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, email, passwordHash, orgId, 'admin', now);

  const token = signToken({ userId, email, orgId, role: 'admin' });

  res.status(201).json({ token, userId, orgId });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const db = getDatabase();
  const user = db
    .prepare('SELECT id, email, password_hash, org_id, role FROM users WHERE email = ?')
    .get(email) as any;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    orgId: user.org_id,
    role: user.role,
  });

  res.json({ token, userId: user.id, orgId: user.org_id });
});

router.post('/invite', (req, res) => {
  const { email, password } = req.body;
  const user = (req as any).user;

  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Only admins can invite users' });
    return;
  }

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const db = getDatabase();
  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, org_id, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, email, passwordHash, user.orgId, 'member', Date.now());

  res.status(201).json({ userId, email });
});

export default router;
