import { describe, expect, it } from 'vitest';
import { applyRideReward, scoreRide } from '../src/economy/economy';
import { defaultCareer } from '../src/save/saveRepository';
import type { RideOffer } from '../src/types';

const location = { id:'a',nameEn:'A',nameBn:'ক',x:0,z:0,kind:'pickup' as const };
const offer: RideOffer = { id:'ride-1',passenger:'Amina',passengerType:'Student',pickup:location,destination:{...location,id:'b',x:100},distanceKm:2,estimatedFare:200,estimatedMinutes:8 };
describe('economy',()=>{
  it('scores safe driving above reckless driving',()=>{const safe=scoreRide(offer,{elapsedSeconds:400,collisions:0,harshEvents:0,drivenKm:2.1});const unsafe=scoreRide(offer,{elapsedSeconds:400,collisions:3,harshEvents:7,drivenKm:4});expect(safe.fare).toBeGreaterThan(unsafe.fare);expect(safe.safety).toBe(100)});
  it('pays each ride exactly once',()=>{const result=scoreRide(offer,{elapsedSeconds:400,collisions:0,harshEvents:0,drivenKm:2});const once=applyRideReward(defaultCareer(),result);const twice=applyRideReward(once,result);expect(twice.balance).toBe(once.balance);expect(twice.ledger).toHaveLength(1)});
});
