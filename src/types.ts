export type Language = 'en' | 'bn';
export type Quality = 'low' | 'medium' | 'high';
export type Screen = 'menu' | 'game' | 'garage' | 'wallet' | 'settings' | 'credits' | 'multiplayer';
export type RideState =
  | 'idle'
  | 'offered'
  | 'accepted'
  | 'approachingPickup'
  | 'waitingForBoarding'
  | 'inTransit'
  | 'arrived'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export interface Vec2 { x: number; z: number }

export interface LocationNode extends Vec2 {
  id: string;
  nameEn: string;
  nameBn: string;
  kind: 'pickup' | 'service' | 'landmark';
}

export interface RideOffer {
  id: string;
  passenger: string;
  passengerType: string;
  pickup: LocationNode;
  destination: LocationNode;
  distanceKm: number;
  estimatedFare: number;
  estimatedMinutes: number;
}

export interface RideMetrics {
  elapsedSeconds: number;
  collisions: number;
  harshEvents: number;
  drivenKm: number;
}

export interface RideResult {
  rideId: string;
  fare: number;
  comfort: number;
  safety: number;
  route: number;
  xp: number;
  reputation: number;
}

export interface LedgerEntry {
  id: string;
  kind: 'ride' | 'bonus' | 'fuel' | 'repair' | 'upgrade' | 'vehicle';
  amount: number;
  label: string;
  createdAt: number;
}

export interface CareerSave {
  version: 1;
  balance: number;
  lifetimeEarnings: number;
  xp: number;
  reputation: number;
  completedRides: number;
  fuel: number;
  health: number;
  engineLevel: number;
  brakeLevel: number;
  vehicleClass: 'city' | 'executive' | 'suv';
  paidRideIds: string[];
  ledger: LedgerEntry[];
  settings: { language: Language; quality: Quality; reducedShake: boolean; masterVolume: number };
}
