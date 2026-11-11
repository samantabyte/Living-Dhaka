import { useEffect } from 'react';
import { GameCanvas } from './ui/GameCanvas';
import { useGameStore } from './state/gameStore';
import { t } from './localization/translations';
import type { Screen } from './types';
import { locations } from './world/locations';
import { MultiplayerPanel } from './multiplayer/MultiplayerPanel';
import { cityRoadSegments } from './roads/cityRoadGraph';

const money = (value: number) => `৳${Math.round(value).toLocaleString('en-US')}`;

function Navigation({ current }: { current: Screen }) {
  const setScreen = useGameStore(s => s.setScreen); const lang = useGameStore(s => s.career.settings.language);
  return <nav className="menu-nav">
    {(['game', 'garage', 'wallet', 'multiplayer', 'settings', 'credits'] as Screen[]).map(screen =>
      <button key={screen} className={current === screen ? 'active' : ''} onClick={() => setScreen(screen)}>{t(lang, screen === 'game' ? 'drive' : screen)}</button>)}
  </nav>;
}

function MainMenu() {
  const { hasSave, newCareer, continueCareer, setScreen, career } = useGameStore(); const lang = career.settings.language;
  return <section className="main-menu screen-panel">
    <div className="brand"><span className="eyebrow">BANGLADESH · 3D DRIVING CAREER</span><h1>{t(lang, 'title')}</h1><p>{t(lang, 'tagline')}</p></div>
    <div className="menu-actions">
      <button className="primary" onClick={() => void newCareer()}>{t(lang, 'newCareer')}</button>
      <button disabled={!hasSave} onClick={continueCareer}>{t(lang, 'continue')}</button>
      <button onClick={() => setScreen('multiplayer')}>{t(lang, 'multiplayer')}</button>
      <button onClick={() => setScreen('settings')}>{t(lang, 'settings')}</button>
      <button onClick={() => setScreen('credits')}>{t(lang, 'credits')}</button>
    </div>
    <div className="menu-foot">WEBGL · RAPIER PHYSICS · NO GAME ENGINE</div>
  </section>;
}

function Hud() {
  const state = useGameStore(); const lang = state.career.settings.language; const serviceCandidates = state.serviceWaypoint === 'fuel' ? locations.filter(location => location.id.startsWith('fuel')) : state.serviceWaypoint === 'garage' ? locations.filter(location => location.id === 'garage') : []; const serviceTarget = serviceCandidates.sort((a,b)=>Math.hypot(a.x-state.position.x,a.z-state.position.z)-Math.hypot(b.x-state.position.x,b.z-state.position.z))[0]; const targetName = serviceTarget ?? (state.offer ? (['inTransit', 'arrived'].includes(state.rideState) ? state.offer.destination : state.offer.pickup) : null);
  return <div className="hud">
    <div className="top-left glass"><span>{state.serviceWaypoint ? 'SERVICE STOP · E TO PAY' : t(lang, 'objective')}</span><strong>{targetName ? (lang === 'bn' ? targetName.nameBn : targetName.nameEn) : 'Cruise Dhaka'}</strong><small>{state.objectiveDistance ? `${Math.round(state.objectiveDistance)} m · ${state.serviceWaypoint ? 'fuel detour' : state.rideState}` : t(lang, 'controls')}</small></div>
    <div className="top-right glass"><span>{t(lang, 'balance')}</span><strong>{money(state.career.balance)}</strong><small>{t(lang, 'reputation')} {state.career.reputation}/100</small></div>
    <div className="speed"><strong>{Math.round(state.speed)}</strong><span>km/h</span></div>
    <MiniMap/>
    <div className="vehicle-bars glass"><Bar label={t(lang, 'fuel')} value={state.career.fuel} color={state.career.fuel < 15 ? '#ef5b53' : '#efc24f'}/><Bar label={t(lang, 'health')} value={state.career.health} color={state.career.health < 25 ? '#ef5b53' : '#50d49c'}/></div>
    <div className="weather-chip">{state.weather === 'rain' ? t(lang, 'rainy') : t(lang, 'clear')} · F2</div>
    {state.notice && <div className="drive-toast">{state.notice}</div>}
  </div>;
}

function RoadMap({ compact = false }: { compact?: boolean }) {
  const path = useGameStore(s => s.navigationPath); const position = useGameStore(s => s.position);
  const transform = (point: {x:number;z:number}) => `${point.x + 300},${point.z + 300}`;
  return <svg className={compact ? 'road-map compact' : 'road-map'} viewBox="0 0 600 600" role="img" aria-label="Dhaka road navigation map">
    <rect width="600" height="600" className="map-land"/>
    {cityRoadSegments.map(([a,b], index) => <line key={index} x1={a.x+300} y1={a.z+300} x2={b.x+300} y2={b.z+300} className="map-road"/>)}
    {path.length > 1 && <polyline points={path.map(transform).join(' ')} className="map-route"/>}
    {!compact && locations.map(node => <g key={node.id}><circle cx={node.x+300} cy={node.z+300} r="7" className={`map-poi ${node.kind}`}/><text x={node.x+310} y={node.z+4+300}>{node.nameEn}</text></g>)}
    <circle cx={position.x+300} cy={position.z+300} r={compact ? 11 : 8} className="map-player"/>
  </svg>;
}

function MiniMap() { const toggle = useGameStore(s=>s.toggleMap); return <div className="mini-map glass" onClick={toggle}><RoadMap compact/><span>M · OPEN MAP · G · FUEL</span></div>; }

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="bar"><span>{label}</span><div><i style={{ width: `${value}%`, background: color }} /></div><b>{Math.round(value)}%</b></div>;
}

function RideOverlay() {
  const { rideState, offer, acceptRide, rejectRide, result, dismissResult, career } = useGameStore(); const lang = career.settings.language;
  if (rideState === 'offered' && offer) return <div className="ride-card glass">
    <span className="eyebrow">NEW RIDE · {offer.passengerType}</span><h2>{offer.passenger}</h2>
    <dl><div><dt>{t(lang, 'pickup')}</dt><dd>{lang === 'bn' ? offer.pickup.nameBn : offer.pickup.nameEn}</dd></div><div><dt>{t(lang, 'destination')}</dt><dd>{lang === 'bn' ? offer.destination.nameBn : offer.destination.nameEn}</dd></div></dl>
    <div className="ride-stats"><b>{offer.distanceKm} km</b><b>{offer.estimatedMinutes} min</b><b>{money(offer.estimatedFare)}</b></div>
    <div className="row"><button className="primary" onClick={acceptRide}>{t(lang, 'accept')}</button><button onClick={rejectRide}>{t(lang, 'reject')}</button></div>
  </div>;
  if (result) return <div className="ride-card result glass"><span className="eyebrow">{t(lang, 'rideComplete')}</span><h2>{money(result.fare)}</h2><div className="score-grid"><Score label="Comfort" value={result.comfort}/><Score label="Safety" value={result.safety}/><Score label="Route" value={result.route}/><Score label="XP" value={result.xp}/></div><button className="primary" onClick={dismissResult}>{t(lang, 'close')}</button></div>;
  if (rideState === 'waitingForBoarding') return <div className="boarding glass"><span className="pulse"/>Passenger boarding…</div>;
  return null;
}

const Score = ({ label, value }: { label: string; value: number }) => <div><span>{label}</span><strong>{value}</strong></div>;

function PauseOverlay() {
  const paused = useGameStore(s => s.paused); const setPaused = useGameStore(s => s.setPaused); const setScreen = useGameStore(s => s.setScreen); const lang = useGameStore(s => s.career.settings.language);
  if (!paused) return null; return <div className="pause-overlay"><div className="panel"><span className="eyebrow">{t(lang, 'pause')}</span><button className="primary" onClick={() => setPaused(false)}>{t(lang, 'resume')}</button><button onClick={() => setScreen('settings')}>{t(lang, 'settings')}</button><button onClick={() => setScreen('menu')}>{t(lang, 'menu')}</button></div></div>;
}

function MapOverlay() {
  const show = useGameStore(s => s.showMap); const toggle = useGameStore(s => s.toggleMap);
  if (!show) return null;
  return <div className="map-overlay" onClick={toggle}><div className="map" onClick={e => e.stopPropagation()}><h2>Dhaka District Navigation</h2><RoadMap/><div className="map-legend"><span>● Current car</span><span>━ Active road route</span><span>● Service</span></div><button onClick={toggle}>Close map (M)</button></div></div>;
}

function Garage() {
  const { career, service, notice, setScreen } = useGameStore(); const lang = career.settings.language;
  return <section className="app-screen"><Navigation current="garage"/><div className="content"><span className="eyebrow">NAGAR AUTO CARE</span><h1>{t(lang, 'garage')}</h1><p>City Sedan · Tier {career.completedRides >= 6 ? 3 : career.completedRides >= 2 ? 2 : 1}</p><div className="cards"><Service title={t(lang, 'refill')} detail={`${Math.round(career.fuel)}% → 100%`} price={Math.max(40,Math.ceil((100-career.fuel)*4))} onClick={() => service('fuel')}/><Service title={t(lang, 'repair')} detail={`${Math.round(career.health)}% → 100%`} price={Math.max(200, Math.round((100-career.health)*20))} onClick={() => service('repair')}/><Service title={t(lang, 'engineUpgrade')} detail={`Level ${career.engineLevel} → ${career.engineLevel+1}`} price={1600+career.engineLevel*1000} onClick={() => service('engine')}/><Service title={t(lang, 'brakeUpgrade')} detail={`Level ${career.brakeLevel} → ${career.brakeLevel+1}`} price={1200+career.brakeLevel*800} onClick={() => service('brake')}/></div>{notice && <div className="toast">{notice === 'insufficient' ? t(lang,'insufficient') : notice}</div>}<button onClick={() => setScreen('game')}>{t(lang,'drive')}</button></div></section>;
}
function Service({ title, detail, price, onClick }: { title:string; detail:string; price:number; onClick:()=>void }) { return <article className="service-card"><div className="service-icon">◆</div><h3>{title}</h3><p>{detail}</p><button onClick={onClick}>{money(price)}</button></article>; }

function Wallet() {
  const { career } = useGameStore();
  return <section className="app-screen"><Navigation current="wallet"/><div className="content narrow"><span className="eyebrow">CAREER ECONOMY</span><h1>{money(career.balance)}</h1><div className="stat-row"><Score label="Lifetime" value={career.lifetimeEarnings}/><Score label="Rides" value={career.completedRides}/><Score label="XP" value={career.xp}/></div><div className="ledger">{career.ledger.length ? career.ledger.map(entry => <div key={entry.id}><span>{entry.label}<small>{new Date(entry.createdAt).toLocaleString()}</small></span><b className={entry.amount > 0 ? 'positive' : ''}>{entry.amount > 0 ? '+' : ''}{money(entry.amount)}</b></div>) : <p>No transactions yet. Complete a ride to begin your career.</p>}</div></div></section>;
}

function Settings() {
  const { career, updateSetting, setScreen } = useGameStore(); const settings=career.settings; const lang=settings.language;
  return <section className="app-screen"><Navigation current="settings"/><div className="content narrow"><span className="eyebrow">DISPLAY · AUDIO · ACCESSIBILITY</span><h1>{t(lang,'settings')}</h1><label>{t(lang,'language')}<select value={settings.language} onChange={e=>updateSetting('language',e.target.value)}><option value="en">English</option><option value="bn">বাংলা</option></select></label><label>{t(lang,'quality')}<select value={settings.quality} onChange={e=>updateSetting('quality',e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label className="check"><input type="checkbox" checked={settings.reducedShake} onChange={e=>updateSetting('reducedShake',e.target.checked)}/>{t(lang,'reducedShake')}</label><label>{t(lang,'audio')}<input type="range" min="0" max="1" step="0.05" value={settings.masterVolume} onChange={e=>updateSetting('masterVolume',Number(e.target.value))}/></label><p className="hint">Quality changes fully apply after returning to the main menu and re-entering the drive.</p><button onClick={()=>setScreen('game')}>{t(lang,'drive')}</button></div></section>;
}

function Credits() {
  const lang=useGameStore(s=>s.career.settings.language);
  return <section className="app-screen"><Navigation current="credits"/><div className="content narrow"><span className="eyebrow">OPEN WEB GAME</span><h1>{t(lang,'credits')}</h1><p>{t(lang,'fictional')}</p><div className="credits-list"><p><b>Rendering</b> Three.js · MIT</p><p><b>Physics</b> Rapier · Apache-2.0</p><p><b>Interface</b> React + Zustand · MIT</p><p><b>Multiplayer</b> Colyseus · MIT</p><p><b>PBR environment</b> ambientCG + Poly Haven · CC0</p><p><b>City models</b> KayKit Cidade Lowpoly · CC0</p></div><a href="https://github.com/petroulacl/fps-buildings-env-kit" target="_blank" rel="noreferrer">Environment pack source</a></div></section>;
}

function ScreenLayer() {
  const screen=useGameStore(s=>s.screen);
  if(screen==='menu') return <MainMenu/>; if(screen==='garage') return <Garage/>; if(screen==='wallet') return <Wallet/>; if(screen==='settings') return <Settings/>; if(screen==='credits') return <Credits/>; if(screen==='multiplayer') return <MultiplayerPanel/>;
  return <><Navigation current="game"/><Hud/><RideOverlay/><PauseOverlay/><MapOverlay/></>;
}

export default function App() {
  const initialize=useGameStore(s=>s.initialize); const ready=useGameStore(s=>s.ready);
  useEffect(()=>{void initialize()},[initialize]);
  if(!ready) return <div className="loading"><div className="loader"/><h1>LIVING DHAKA</h1><p>Preparing the city…</p></div>;
  return <main><GameCanvas/><ScreenLayer/></main>;
}
