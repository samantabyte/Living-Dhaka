import { describe, expect, it } from 'vitest';
import { canTransition, transitionRide } from '../src/rides/rideMachine';
import type { RideState } from '../src/types';

describe('ride state machine', () => {
  it('allows the complete happy path', () => {
    const path = ['offered','accepted','approachingPickup','waitingForBoarding','inTransit','arrived','completed'] as const;
    let state: RideState = 'idle'; for (const next of path) state = transitionRide(state,next); expect(state).toBe('completed');
  });
  it('rejects illegal transitions', () => { expect(canTransition('offered','completed')).toBe(false); expect(()=>transitionRide('offered','completed')).toThrow(/Illegal/); });
});
