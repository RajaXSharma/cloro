import { createApp } from './http.js';
import { hocuspocus, service } from './collab.js';

const host = process.env.IP ?? process.env.HOST;
const closers: Array<() => unknown> = [];

if (service !== 'ws') {
  const port = Number(process.env.PORT ?? 4000);
  const app = createApp();
  const onListen = () => console.log(`HTTP listening on ${host ?? '0.0.0.0'}:${port}`);
  const httpServer = host ? app.listen(port, host, onListen) : app.listen(port, onListen);
  closers.push(
    () =>
      new Promise<void>((resolve, reject) =>
        httpServer.close((err) => (err ? reject(err) : resolve())),
      ),
  );
}

if (service !== 'rest') {
  await hocuspocus.listen();
  console.log(`WebSocket listening on ${host ?? '0.0.0.0'}:${hocuspocus.address.port}`);
  closers.push(() => hocuspocus.destroy());
}

// Hocuspocus's listen() never rejects on a bind error — the error lands on the
// underlying http server and, unhandled, kills the process (alwaysdata then
// reports "Upstream not ready"). Route it into a retry instead.
hocuspocus.httpServer.on('error', (err: NodeJS.ErrnoException) => {
  console.error(`WS bind failed (${err.code}): retrying in 3s`);
  setTimeout(() => {
    hocuspocus.httpServer.listen(hocuspocus.address.port);
  }, 3000);
});

async function shutdown() {
  console.log('Shutting down…');
  await Promise.all(closers.map((close) => close()));
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
