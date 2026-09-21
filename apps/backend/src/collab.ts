import { Server } from '@hocuspocus/server';
import { auth } from './extensions/auth.js';
import { persistence } from './extensions/persistence.js';

export const service = process.env.SERVICE ?? 'all';
export const hocuspocus = new Server({
  port: Number(
    service === 'ws'
      ? (process.env.PORT ?? process.env.HOCUSPUS_PORT ?? 1234)
      : (process.env.HOCUSPUS_PORT ?? process.env.PORT ?? 1234),
  ),
  address: process.env.HOCUSPUS_IP ?? process.env.IP ?? process.env.HOST,
  debounce: 2000,
  extensions: [auth, persistence],
});
