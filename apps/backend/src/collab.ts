import { Hocuspocus } from '@hocuspocus/server';
import { auth } from './extensions/auth.js';
import { persistence } from './extensions/persistence.js';

export const hocuspocus = new Hocuspocus({
  debounce: 2000,
  extensions: [auth, persistence],
});
