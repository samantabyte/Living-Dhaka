import type { Vec2 } from '../types';
import { findRoute, type Edge, type GraphNode } from './routeFinder';

// The navigation graph follows the same streets that are rendered in GameEngine.
// Extra junctions on the short east/west streets prevent routes cutting through blocks.
export const cityRoadNodes: GraphNode[] = [
  { id: 'nw', x: -225, z: -190 }, { id: 'n0', x: 0, z: -190 }, { id: 'ne', x: 225, z: -190 },
  { id: 'w80', x: -225, z: -80 }, { id: 'c80', x: 0, z: -80 },
  { id: 'w0', x: -225, z: 0 }, { id: 'c0', x: 0, z: 0 }, { id: 'e0', x: 225, z: 0 },
  { id: 'c65', x: 0, z: 65 }, { id: 'e65', x: 225, z: 65 },
  { id: 'sw', x: -225, z: 195 }, { id: 's0', x: 0, z: 195 }, { id: 'se', x: 225, z: 195 },
  { id: 'north', x: 0, z: -280 }, { id: 'south', x: 0, z: 280 },
];

const pairs: Array<[string, string]> = [
  ['north', 'n0'], ['n0', 'c80'], ['c80', 'c0'], ['c0', 'c65'], ['c65', 's0'], ['s0', 'south'],
  ['nw', 'n0'], ['n0', 'ne'], ['w80', 'c80'], ['w0', 'c0'], ['c0', 'e0'], ['c65', 'e65'],
  ['sw', 's0'], ['s0', 'se'], ['nw', 'w80'], ['w80', 'w0'], ['w0', 'sw'], ['ne', 'e0'], ['e0', 'e65'], ['e65', 'se'],
];

const byId = new Map(cityRoadNodes.map(node => [node.id, node]));
export const cityRoadEdges: Edge[] = pairs.map(([from, to]) => {
  const a = byId.get(from)!; const b = byId.get(to)!;
  return { from, to, cost: Math.hypot(a.x - b.x, a.z - b.z) };
});

export const cityRoadSegments = pairs.map(([from, to]) => [byId.get(from)!, byId.get(to)!] as const);

function projectToSegment(point: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x - a.x; const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
  return { x: a.x + dx * t, z: a.z + dz * t };
}

function nearestRoadNode(point: Vec2) {
  return cityRoadNodes.reduce((best, node) =>
    Math.hypot(node.x - point.x, node.z - point.z) < Math.hypot(best.x - point.x, best.z - point.z) ? node : best);
}

export function snapToRoad(point: Vec2): Vec2 {
  let best = projectToSegment(point, cityRoadSegments[0][0], cityRoadSegments[0][1]);
  let bestDistance = Math.hypot(best.x - point.x, best.z - point.z);
  for (const [a, b] of cityRoadSegments.slice(1)) {
    const projected = projectToSegment(point, a, b);
    const candidateDistance = Math.hypot(projected.x - point.x, projected.z - point.z);
    if (candidateDistance < bestDistance) { best = projected; bestDistance = candidateDistance; }
  }
  return best;
}

export function findCityRoadPath(start: Vec2, target: Vec2): Vec2[] {
  const startSnap = snapToRoad(start); const targetSnap = snapToRoad(target);
  const startNode = nearestRoadNode(startSnap); const targetNode = nearestRoadNode(targetSnap);
  const routeIds = findRoute(cityRoadNodes, cityRoadEdges, startNode.id, targetNode.id);
  const middle = routeIds.map(id => byId.get(id)!).map(({ x, z }) => ({ x, z }));
  const path = [startSnap, ...middle, targetSnap, target];
  return path.filter((point, index) => index === 0 || Math.hypot(point.x - path[index - 1].x, point.z - path[index - 1].z) > 1);
}

