import type { CareerSave, LedgerEntry, RideMetrics, RideOffer, RideResult } from '../types';

export function scoreRide(offer: RideOffer, metrics: RideMetrics): RideResult {
  const comfort = Math.max(35, Math.round(100 - metrics.harshEvents * 8 - metrics.collisions * 18));
  const safety = Math.max(20, Math.round(100 - metrics.collisions * 25));
  const detour = Math.max(0, metrics.drivenKm - offer.distanceKm);
  const route = Math.max(40, Math.round(100 - (detour / Math.max(offer.distanceKm, 0.1)) * 35));
  const expectedSeconds = offer.estimatedMinutes * 60;
  const timeFactor = metrics.elapsedSeconds <= expectedSeconds * 1.25 ? 1 : 0.9;
  const qualityFactor = (comfort + safety + route) / 300;
  const fare = Math.max(80, Math.round(offer.estimatedFare * timeFactor * (0.65 + qualityFactor * 0.35)));
  return { rideId: offer.id, fare, comfort, safety, route, xp: Math.round(25 + offer.distanceKm * 10), reputation: Math.round((comfort + safety) / 40) };
}

export function applyRideReward(save: CareerSave, result: RideResult): CareerSave {
  if (save.paidRideIds.includes(result.rideId)) return save;
  const entry: LedgerEntry = { id: `ride-${result.rideId}`, kind: 'ride', amount: result.fare, label: 'Ride income', createdAt: Date.now() };
  return {
    ...save,
    balance: save.balance + result.fare,
    lifetimeEarnings: save.lifetimeEarnings + result.fare,
    xp: save.xp + result.xp,
    reputation: Math.min(100, save.reputation + result.reputation),
    completedRides: save.completedRides + 1,
    paidRideIds: [...save.paidRideIds, result.rideId],
    ledger: [entry, ...save.ledger].slice(0, 100),
  };
}

export function spend(save: CareerSave, amount: number, kind: LedgerEntry['kind'], label: string, patch: Partial<CareerSave> = {}) {
  if (save.balance < amount) return null;
  const entry: LedgerEntry = { id: `${kind}-${Date.now()}`, kind, amount: -amount, label, createdAt: Date.now() };
  return { ...save, ...patch, balance: save.balance - amount, ledger: [entry, ...save.ledger].slice(0, 100) };
}
