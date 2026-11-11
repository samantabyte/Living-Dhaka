import { describe, expect, it } from 'vitest';
import { findCityRoadPath, snapToRoad } from '../src/roads/cityRoadGraph';

describe('city navigation graph', () => {
  it('snaps off-road positions onto a rendered road', () => {
    const point = snapToRoad({ x: 91, z: 114 });
    expect(Math.min(Math.abs(point.x), Math.abs(point.z), Math.abs(point.z - 65))).toBeLessThan(1);
  });

  it('returns a road-following multi-point route instead of a straight tether', () => {
    const path = findCityRoadPath({ x: -210, z: -175 }, { x: 210, z: 180 });
    expect(path.length).toBeGreaterThan(3);
    expect(path.some(point => Math.abs(point.x) < 1 || Math.abs(point.z) < 1)).toBe(true);
  });
});
