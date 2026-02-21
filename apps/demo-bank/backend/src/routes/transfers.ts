import { Router } from 'express';
import { processTransfer, getAllTransfers, getTransfersByAccountId } from '../services/transfer-service.js';
import { validateDescription, validateAccountId } from '../services/validation-service.js';

const router = Router();

// POST /api/transfers - Create a new transfer
router.post('/', (req, res) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  // Basic validation
  if (!fromAccountId || !toAccountId || amount === undefined || !description) {
    res.status(400).json({ error: 'fromAccountId, toAccountId, amount, and description are required' });
    return;
  }

  if (!validateAccountId(fromAccountId)) {
    res.status(400).json({ error: 'Invalid fromAccountId format' });
    return;
  }

  if (!validateAccountId(toAccountId)) {
    res.status(400).json({ error: 'Invalid toAccountId format' });
    return;
  }

  if (fromAccountId === toAccountId) {
    res.status(400).json({ error: 'Cannot transfer to the same account' });
    return;
  }

  if (!validateDescription(description)) {
    res.status(400).json({ error: 'Description is required and must be under 200 characters' });
    return;
  }

  const transfer = processTransfer(fromAccountId, toAccountId, amount, description);

  if (transfer.status === 'failed') {
    res.status(422).json({ transfer, error: 'Transfer failed' });
    return;
  }

  res.status(201).json({ transfer });
});

// GET /api/transfers - List all transfers (optionally filter by accountId)
router.get('/', (req, res) => {
  const { accountId } = req.query;

  if (accountId && typeof accountId === 'string') {
    const filtered = getTransfersByAccountId(accountId);
    res.json({ transfers: filtered });
    return;
  }

  const allTransfers = getAllTransfers();
  res.json({ transfers: allTransfers });
});

export default router;
