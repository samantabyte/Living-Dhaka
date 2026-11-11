import { describe, expect, it } from 'vitest';
import { stepDriveSpeed } from '../src/vehicle/vehicleDynamics';

describe('vehicle dynamics', () => {
  it('uses a realistic base acceleration curve', () => {
    let speed = 0;
    for (let frame = 0; frame < 60; frame++) speed = stepDriveSpeed(speed, { throttle: 1, handbrake: false, dt: 1 / 60, onRoad: true, engineLevel: 0, brakeLevel: 0, hasFuel: true });
    expect(speed * 3.6).toBeGreaterThan(10);
    expect(speed * 3.6).toBeLessThan(13);
  });

  it('still accelerates on grass but caps off-road speed', () => {
    let speed = 0;
    for (let frame = 0; frame < 60 * 30; frame++) speed = stepDriveSpeed(speed, { throttle: 1, handbrake: false, dt: 1 / 60, onRoad: false, engineLevel: 0, brakeLevel: 0, hasFuel: true });
    expect(speed).toBe(12.5);
  });

  it('brakes faster than it accelerates', () => {
    const next = stepDriveSpeed(20, { throttle: -1, handbrake: false, dt: 1, onRoad: true, engineLevel: 0, brakeLevel: 0, hasFuel: true });
    expect(next).toBe(12.5);
  });
});
