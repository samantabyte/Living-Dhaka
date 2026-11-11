import type { RideState } from '../types';

const transitions: Record<RideState, RideState[]> = {
  idle: ['offered'], offered: ['accepted', 'rejected'], accepted: ['approachingPickup', 'cancelled'],
  approachingPickup: ['waitingForBoarding', 'cancelled', 'failed'], waitingForBoarding: ['inTransit', 'cancelled'],
  inTransit: ['arrived', 'cancelled', 'failed'], arrived: ['completed'], completed: ['idle'],
  rejected: ['idle'], cancelled: ['idle'], failed: ['idle'],
};

export function transitionRide(current: RideState, next: RideState): RideState {
  if (!transitions[current].includes(next)) throw new Error(`Illegal ride transition: ${current} -> ${next}`);
  return next;
}

export function canTransition(current: RideState, next: RideState) {
  return transitions[current].includes(next);
}
