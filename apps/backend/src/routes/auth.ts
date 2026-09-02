import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';

const PASSWORD_MIN = 6;

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(PASSWORD_MIN),
  name: z.string().min(3),
});


const verifySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid fields' });
  const { email, password, name } = parsed.data;

  const existing = await query('select id from users where email = $1', [email]);
  if (existing.rowCount) return res.status(409).json({ error: 'email already registered' });

  const password_hash = bcrypt.hashSync(password, 12);
  const { rows } = await query(
    'insert into users (email, name, password_hash) values ($1, $2, $3) returning id, email, name',
    [email, name, password_hash]
  );
  res.status(201).json(rows[0]);
});

authRouter.post('/verifyCredentials', async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid fields' });
  const { email, password } = parsed.data;

  const { rows } = await query(
    'select id, email, name, avatar_url, password_hash from users where email = $1',
    [email]
  );
  const user = rows[0];
  if (!user?.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  res.json({ id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url });
});
