import { createApp } from './http.js';
import { hocuspocus } from './collab.js';

const app = createApp();
const httpServer = app.listen(Number(process.env.PORT ?? 4000), () => {
  console.log(`HTTP listening on :${process.env.PORT ?? 4000}`);
});

await hocuspocus.listen();
console.log(`WebSocket listening on :${process.env.HOCUSPUS_PORT ?? 1234}`);

async function shutdown() {
  console.log('Shutting down…');
  httpServer.close();
  await hocuspocus.destroy();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
