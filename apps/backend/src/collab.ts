import { Server } from '@hocuspocus/server';
import { auth } from './extensions/auth.js';
import { persistence } from './extensions/persistence.js';

export const hocuspocus = new Server({
  port: Number(process.env.HOCUSPUS_PORT ?? 1234),
  debounce: 2000,
  extensions: [auth, persistence],
});
