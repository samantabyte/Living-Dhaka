import { useEffect, useState } from 'react';
import { createRoom, getRoom, joinRoom, leaveRoom, subscribeSnapshot, type MultiplayerSnapshot } from './client';
import { useGameStore } from '../state/gameStore';
import { t } from '../localization/translations';

export function MultiplayerPanel() {
  const lang = useGameStore(s => s.career.settings.language); const setScreen = useGameStore(s => s.setScreen);
  const [name,setName]=useState('Dhaka Driver'); const [code,setCode]=useState(''); const [roomId,setRoomId]=useState(getRoom()?.roomId ?? '');
  const [status,setStatus]=useState(getRoom()?'connected':'offline'); const [error,setError]=useState(''); const [snapshot,setSnapshot]=useState<MultiplayerSnapshot>({serverTime:0,players:[]});
  useEffect(()=>subscribeSnapshot(setSnapshot),[]);
  async function connect(mode:'create'|'join') { setError(''); setStatus('connecting'); try { const room=mode==='create'?await createRoom(name):await joinRoom(code,name); setRoomId(room.roomId); setStatus('connected'); } catch(reason) { setStatus('offline'); setError(reason instanceof Error?reason.message:String(reason)); } }
  async function leave(){await leaveRoom();setRoomId('');setStatus('offline')}
  return <section className="app-screen"><div className="content"><span className="eyebrow">PRIVATE 3–4 PLAYER SESSION</span><h1>{t(lang,'multiplayer')}</h1><p><span className={`status-dot ${status==='connected'?'online':''}`}/>{status==='connected'?t(lang,'connected'):status}</p><div className="multiplayer-layout"><div><label>{t(lang,'playerName')}<input className="text-input" value={name} onChange={e=>setName(e.target.value)} maxLength={24}/></label><button className="primary" onClick={()=>void connect('create')} disabled={status==='connecting'}>{t(lang,'createRoom')}</button><label>{t(lang,'roomCode')}<input className="text-input" value={code} onChange={e=>setCode(e.target.value)}/></label><button onClick={()=>void connect('join')} disabled={!code||status==='connecting'}>{t(lang,'joinRoom')}</button>{roomId&&<><p>Share this room code:</p><div className="room-code">{roomId}</div><button onClick={()=>void leave()}>Leave room</button></>}{error&&<p className="fatal-inline">{error}. Start the server with <code>npm run server</code>.</p>}</div><div className="room-list"><h2>Drivers ({snapshot.players.length}/4)</h2>{snapshot.players.map((player,index)=><div className="ledger" key={player.sessionId}><div><span>{index+1}. {player.name}<small>{Math.round(player.speed)} km/h</small></span><b>{player.score} pts</b></div></div>)}{!snapshot.players.length&&<p>No drivers connected.</p>}</div></div><button onClick={()=>setScreen('menu')}>{t(lang,'menu')}</button><button onClick={()=>setScreen('game')}>{t(lang,'drive')}</button></div></section>;
}
