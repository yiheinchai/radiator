import { Router } from 'express';
import { getAllAccounts, getAccountById, createAccount } from '../services/account-service.js';

const router = Router();

// GET /api/accounts - List all accounts
router.get('/', (_req, res) => {
  const accounts = getAllAccounts();
  res.json({ accounts });
});

// GET /api/accounts/:id - Get single account
router.get('/:id', (req, res) => {
  const account = getAccountById(req.params.id);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({ account });
});

// POST /api/accounts - Create new account
router.post('/', (req, res) => {
  const { ownerId, ownerName, currency } = req.body;

  if (!ownerId || !ownerName) {
    res.status(400).json({ error: 'ownerId and ownerName are required' });
    return;
  }

  const account = createAccount(ownerId, ownerName, currency);
  res.status(201).json({ account });
});

export default router;
