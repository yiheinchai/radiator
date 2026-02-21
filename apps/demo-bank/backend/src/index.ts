import express from 'express';
import cors from 'cors';
import accountRoutes from './routes/accounts.js';
import transferRoutes from './routes/transfers.js';

const app = express();
const PORT = 3200;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/accounts', accountRoutes);
app.use('/api/transfers', transferRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Demo Bank API running on http://localhost:${PORT}`);
});

export default app;
