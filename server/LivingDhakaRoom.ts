import { Room, type Client } from '@colyseus/core';
import { nanoid } from 'nanoid';

interface PlayerState { sessionId: string; name: string; x: number; z: number; speed: number; balance: number; score: number }
interface MovePayload { x: number; z: number; speed: number }
interface RewardPayload { rideId: string; distanceKm: number; elapsedSeconds: number }

export class LivingDhakaRoom extends Room {
  maxClients = 4;
  private players = new Map<string, PlayerState>();
  private paidTransactions = new Set<string>();

  onCreate(options: { private?: boolean }) {
    this.setMetadata({ private: options.private !== false, createdAt: Date.now() });
    this.onMessage('move', (client, payload: MovePayload) => this.handleMove(client, payload));
    this.onMessage('completeRide', (client, payload: RewardPayload) => this.handleReward(client, payload));
    this.onMessage('challenge', (client) => {
      const player = this.players.get(client.sessionId); if (!player) return;
      player.score += 1; this.broadcastSnapshot();
    });
    this.setSimulationInterval(() => this.broadcastSnapshot(), 100);
  }

  onJoin(client: Client, options: { name?: string }) {
    this.players.set(client.sessionId, { sessionId: client.sessionId, name: String(options.name || 'Driver').slice(0, 24), x: 0, z: 30, speed: 0, balance: 0, score: 0 });
    client.send('welcome', { roomId: this.roomId, sessionId: client.sessionId }); this.broadcastSnapshot();
  }

  async onDrop(client: Client) {
    try { await this.allowReconnection(client, 15); } catch { this.players.delete(client.sessionId); this.broadcastSnapshot(); }
  }

  onLeave(client: Client) {
    this.players.delete(client.sessionId); this.broadcastSnapshot();
  }

  private handleMove(client: Client, payload: MovePayload) {
    const player = this.players.get(client.sessionId); if (!player) return;
    if (![payload.x, payload.z, payload.speed].every(Number.isFinite)) return;
    const moved = Math.hypot(payload.x - player.x, payload.z - player.z);
    if (moved > 45) return;
    player.x = Math.max(-450, Math.min(450, payload.x)); player.z = Math.max(-450, Math.min(450, payload.z)); player.speed = Math.max(0, Math.min(180, payload.speed));
  }

  private handleReward(client: Client, payload: RewardPayload) {
    const player = this.players.get(client.sessionId); if (!player || typeof payload.rideId !== 'string') return;
    const transactionId = `${client.sessionId}:${payload.rideId}`;
    if (this.paidTransactions.has(transactionId)) { client.send('reward', { transactionId, accepted: false, reason: 'duplicate' }); return; }
    const plausible = payload.distanceKm >= 0.5 && payload.distanceKm <= 30 && payload.elapsedSeconds >= 20;
    if (!plausible) { client.send('reward', { transactionId, accepted: false, reason: 'invalid' }); return; }
    this.paidTransactions.add(transactionId); const amount = Math.round(80 + payload.distanceKm * 45); player.balance += amount;
    client.send('reward', { transactionId, accepted: true, amount, receipt: nanoid(10) }); this.broadcastSnapshot();
  }

  private broadcastSnapshot() {
    this.broadcast('snapshot', { serverTime: Date.now(), players: [...this.players.values()] });
  }
}
