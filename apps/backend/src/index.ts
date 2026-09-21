import { createServer } from 'node:http';
import crossws from 'crossws/adapters/node';
import { createApp } from './http.js';
import { hocuspocus } from './collab.js';
import type { WebSocketLike } from '@hocuspocus/server';

const port = Number(process.env.PORT ?? 4000);
const host = process.env.IP ?? process.env.HOST;

const app = createApp();
const httpServer = createServer(app);

const ws = crossws({
  hooks: {
    open(peer) {
      (peer as { _hocuspocus?: unknown })._hocuspocus = hocuspocus.handleConnection(
        peer.websocket as unknown as WebSocketLike,
        peer.request as Request,
      );
    },
    message(peer, message) {
      (peer as { _hocuspocus?: { handleMessage: (data: Uint8Array) => void } })
        ._hocuspocus?.handleMessage(message.uint8Array());
    },
    close(peer, event) {
      (peer as { _hocuspocus?: { handleClose: (e: { code?: number; reason?: string }) => void } })
        ._hocuspocus?.handleClose({ code: event.code, reason: event.reason });
    },
    error(peer, error) {
      console.error(`WebSocket error for peer ${peer.id}:`, error);
    },
  },
});

// every upgrade — any path — is collab; Hocuspocus ignores paths and the
// alwaysdata proxy trims /ws before it gets here
httpServer.on('upgrade', (request, socket, head) => {
  ws.handleUpgrade(request, socket, head);
});

const onListen = () => console.log(`listening on ${host ?? '0.0.0.0'}:${port}`);
if (host) httpServer.listen(port, host, onListen);
else httpServer.listen(port, onListen);
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  console.error(`bind failed (${err.code}): retrying in 3s`);
  setTimeout(() => httpServer.listen(port, host), 3000);
});

const closers: Array<() => unknown> = [
  () =>
    new Promise<void>((resolve, reject) =>
      httpServer.close((err) => (err ? reject(err) : resolve())),
    ),
  () => hocuspocus.closeConnections(),
  () => hocuspocus.flushPendingStores(),
];

async function shutdown() {
  console.log('Shutting down…');
  await Promise.allSettled(closers.map((close) => close()));
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
