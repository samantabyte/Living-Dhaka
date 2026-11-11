import { Client, type Room } from '@colyseus/sdk';

export interface RemotePlayer { sessionId: string; name: string; x: number; z: number; speed: number; balance: number; score: number }
export interface MultiplayerSnapshot { serverTime: number; players: RemotePlayer[] }
type Listener = (snapshot: MultiplayerSnapshot) => void;

const endpoint = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:2567`;
const client = new Client(endpoint);
let room: Room | null = null;
let snapshot: MultiplayerSnapshot = { serverTime: 0, players: [] };
const listeners = new Set<Listener>();

function bind(nextRoom: Room) {
  room = nextRoom;
  room.onMessage('welcome', () => undefined);
  room.onMessage<MultiplayerSnapshot>('snapshot', value => { snapshot = value; listeners.forEach(listener => listener(snapshot)); });
  room.onLeave(() => { room = null; snapshot = { serverTime: 0, players: [] }; listeners.forEach(listener => listener(snapshot)); });
  return room;
}

export async function createRoom(name: string) { return bind(await client.create('living_dhaka', { name, private: true })); }
export async function joinRoom(roomId: string, name: string) { return bind(await client.joinById(roomId.trim(), { name })); }
export async function leaveRoom() { if (room) await room.leave(); room = null; }
export function getRoom() { return room; }
export function subscribeSnapshot(listener: Listener) { listeners.add(listener); listener(snapshot); return () => { listeners.delete(listener); }; }
export function sendPosition(x: number, z: number, speed: number) { room?.send('move', { x, z, speed }); }
