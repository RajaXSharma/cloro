import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { requireAuth } from './auth.js';
import { authRouter } from './routes/auth.js';
import { documentsRouter } from './routes/documents.js';
import { aiRouter } from './routes/ai.js';

export function createApp() {
  const app = express();
  app.use(morgan('dev'));
  app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' }));
  app.use(express.json());

  // public routes
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', authRouter);

  // everything below requires a valid Bearer token
  app.use(requireAuth);
  app.use('/documents', documentsRouter);
  app.use('/ai', aiRouter);

  return app;
}
