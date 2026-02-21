import { createApp } from './app.js';

export { createApp } from './app.js';
export { getDatabase, closeDatabase } from './db/database.js';
export { signToken, verifyToken, authMiddleware } from './middleware/auth.js';

const PORT = process.env.RADIATOR_PORT ?? 3210;

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Radiator server running on http://localhost:${PORT}`);
  });
}
