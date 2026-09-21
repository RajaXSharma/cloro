import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { requireAuth } from './auth.js';
import { authRouter } from './routes/auth.js';
import { filesRouter, projectsRouter } from './routes/projects.js';
import { collaboratorsRouter } from './routes/collaborators.js';
import { snapshotsRouter } from './routes/snapshots.js';
import { aiRouter } from './routes/ai.js';

export function createApp() {
  const app = express();
  app.use(morgan('dev'));
  const allowedOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',');
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());

  // public routes
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', authRouter);

  // everything below requires a valid Bearer token
  app.use(requireAuth);
  app.use('/projects', projectsRouter);
  app.use('/files', filesRouter);
  // nested resources: the whole API surface lives here, routers set mergeParams
  app.use('/projects/:pid/collaborators', collaboratorsRouter);
  app.use('/files/:fid/snapshots', snapshotsRouter);
  app.use('/ai', aiRouter);

  return app;
}
