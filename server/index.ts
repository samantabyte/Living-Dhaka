import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { LivingDhakaRoom } from './LivingDhakaRoom.js';

const port = Number(process.env.PORT ?? 2568);
const gameServer = new Server({
  transport: new WebSocketTransport(),
  greet: false,
  express: app => {
    app.get('/health', (_req, res) => res.json({ ok: true, game: 'Living Dhaka', time: Date.now() }));
  },
});

gameServer.define('living_dhaka', LivingDhakaRoom);
await gameServer.listen(port);
console.log(`Living Dhaka multiplayer server listening on ws://localhost:${port}`);
