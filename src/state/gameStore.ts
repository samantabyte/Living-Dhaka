import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { CareerSave, Quality, RideMetrics, RideOffer, RideResult, RideState, Screen } from '../types';
import { defaultCareer, loadCareer, saveCareer } from '../save/saveRepository';
import { applyRideReward, scoreRide, spend } from '../economy/economy';
import { transitionRide } from '../rides/rideMachine';
import { distance, locations, passengerTypes } from '../world/locations';

interface GameState {
  ready: boolean; hasSave: boolean; screen: Screen; paused: boolean; showMap: boolean; weather: 'clear' | 'rain';
  speed: number; position: { x: number; z: number }; objectiveDistance: number; career: CareerSave;
  rideState: RideState; offer: RideOffer | null; result: RideResult | null; metrics: RideMetrics; notice: string;
  initialize: () => Promise<void>; newCareer: () => Promise<void>; continueCareer: () => void; setScreen: (screen: Screen) => void;
  setPaused: (paused: boolean) => void; toggleMap: () => void; setTelemetry: (speed: number, x: number, z: number, objectiveDistance: number) => void;
  setWeather: (weather: 'clear' | 'rain') => void; generateOffer: () => void; acceptRide: () => void; rejectRide: () => void;
  advanceRide: (next: RideState) => void; finishRide: () => void; dismissResult: () => void; updateMetrics: (patch: Partial<RideMetrics>) => void;
  service: (kind: 'fuel' | 'repair' | 'engine' | 'brake') => void; updateSetting: (key: 'quality' | 'language' | 'reducedShake' | 'masterVolume', value: Quality | string | boolean | number) => void;
}

const freshMetrics = (): RideMetrics => ({ elapsedSeconds: 0, collisions: 0, harshEvents: 0, drivenKm: 0 });

export const useGameStore = create<GameState>((set, get) => ({
  ready: false, hasSave: false, screen: 'menu', paused: false, showMap: false, weather: 'clear', speed: 0,
  position: { x: 0, z: 30 }, objectiveDistance: 0, career: defaultCareer(), rideState: 'idle', offer: null, result: null,
  metrics: freshMetrics(), notice: '',
  initialize: async () => { const saved = await loadCareer(); set({ ready: true, hasSave: Boolean(saved), career: saved ?? defaultCareer() }); },
  newCareer: async () => { const career = defaultCareer(); await saveCareer(career); set({ career, hasSave: true, screen: 'game', rideState: 'idle', result: null }); setTimeout(() => get().generateOffer(), 1200); },
  continueCareer: () => { set({ screen: 'game', paused: false }); if (get().rideState === 'idle') setTimeout(() => get().generateOffer(), 1000); },
  setScreen: screen => set({ screen, paused: screen !== 'game' }), setPaused: paused => set({ paused }), toggleMap: () => set(s => ({ showMap: !s.showMap })),
  setTelemetry: (speed, x, z, objectiveDistance) => set({ speed, position: { x, z }, objectiveDistance }), setWeather: weather => set({ weather }),
  generateOffer: () => {
    const from = locations[Math.floor(Math.random() * 10)]; let to = locations[Math.floor(Math.random() * 10)];
    while (to.id === from.id) to = locations[Math.floor(Math.random() * 10)];
    const km = Math.max(1.2, distance(from, to) / 75);
    const offer: RideOffer = { id: nanoid(), passenger: ['Amina', 'Rahim', 'Nadia', 'Sajid', 'Tania'][Math.floor(Math.random() * 5)], passengerType: passengerTypes[Math.floor(Math.random() * passengerTypes.length)], pickup: from, destination: to, distanceKm: Number(km.toFixed(1)), estimatedFare: Math.round(90 + km * 52), estimatedMinutes: Math.round(4 + km * 3) };
    set({ offer, rideState: transitionRide('idle', 'offered'), metrics: freshMetrics() });
  },
  acceptRide: () => set({ rideState: transitionRide('offered', 'accepted') }),
  rejectRide: () => { set({ rideState: transitionRide('offered', 'rejected'), offer: null }); setTimeout(() => { set({ rideState: 'idle' }); get().generateOffer(); }, 1800); },
  advanceRide: next => set(s => ({ rideState: transitionRide(s.rideState, next) })),
  finishRide: () => {
    const { offer, metrics, career } = get(); if (!offer) return;
    const result = scoreRide(offer, metrics); const updated = applyRideReward(career, result); void saveCareer(updated);
    set({ result, career: updated, rideState: 'completed', hasSave: true });
  },
  dismissResult: () => { set({ result: null, offer: null, rideState: 'idle' }); setTimeout(() => get().generateOffer(), 1500); },
  updateMetrics: patch => set(s => ({ metrics: { ...s.metrics, ...patch } })),
  service: kind => {
    const s = get(); const configs = {
      fuel: { cost: 350, type: 'fuel' as const, label: 'Fuel refill', patch: { fuel: 100 } },
      repair: { cost: Math.max(200, Math.round((100 - s.career.health) * 20)), type: 'repair' as const, label: 'Vehicle repair', patch: { health: 100 } },
      engine: { cost: 1600 + s.career.engineLevel * 1000, type: 'upgrade' as const, label: 'Engine upgrade', patch: { engineLevel: s.career.engineLevel + 1 } },
      brake: { cost: 1200 + s.career.brakeLevel * 800, type: 'upgrade' as const, label: 'Brake upgrade', patch: { brakeLevel: s.career.brakeLevel + 1 } },
    }[kind];
    const updated = spend(s.career, configs.cost, configs.type, configs.label, configs.patch);
    if (!updated) { set({ notice: 'insufficient' }); setTimeout(() => set({ notice: '' }), 1800); return; }
    void saveCareer(updated); set({ career: updated, notice: configs.label }); setTimeout(() => set({ notice: '' }), 1800);
  },
  updateSetting: (key, value) => {
    const career = { ...get().career, settings: { ...get().career.settings, [key]: value } } as CareerSave;
    void saveCareer(career); set({ career });
  },
}));
