import express, { type Express } from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import snapshotsRouter from './routes/snapshots.js';
import errorsRouter from './routes/errors.js';
import codebasesRouter from './routes/codebases.js';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check (no auth needed)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Auth routes (no auth needed)
  app.use('/api/auth', authRouter);

  // Protected routes
  app.use('/api/snapshots', authMiddleware, snapshotsRouter);
  app.use('/api/errors', authMiddleware, errorsRouter);
  app.use('/api/codebases', authMiddleware, codebasesRouter);

  return app;
}
