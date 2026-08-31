import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { authRouter } from './routes/auth.js';

export function createApp() {
  const app = express();
  app.use(morgan('dev'));
  app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' }));
  app.use(express.json());
  app.use('/auth', authRouter);
  app.get('/health', (_req, res) => res.json({ ok: true }));
  return app;
}
