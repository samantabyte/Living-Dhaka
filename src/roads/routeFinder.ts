import type { Vec2 } from '../types';

export interface GraphNode extends Vec2 { id: string }
export interface Edge { from: string; to: string; cost: number }

export function findRoute(nodes: GraphNode[], edges: Edge[], startId: string, goalId: string): string[] {
  const open = new Set([startId]);
  const cameFrom = new Map<string, string>();
  const g = new Map(nodes.map(node => [node.id, Number.POSITIVE_INFINITY]));
  const f = new Map(g);
  g.set(startId, 0);
  const goal = nodes.find(node => node.id === goalId);
  const start = nodes.find(node => node.id === startId);
  if (!goal || !start) return [];
  f.set(startId, Math.hypot(start.x - goal.x, start.z - goal.z));
  while (open.size) {
    const current = [...open].sort((a, b) => (f.get(a) ?? Infinity) - (f.get(b) ?? Infinity))[0];
    if (current === goalId) {
      const route = [current];
      while (cameFrom.has(route[0])) route.unshift(cameFrom.get(route[0])!);
      return route;
    }
    open.delete(current);
    for (const edge of edges.filter(edge => edge.from === current || edge.to === current)) {
      const next = edge.from === current ? edge.to : edge.from;
      const tentative = (g.get(current) ?? Infinity) + edge.cost;
      if (tentative < (g.get(next) ?? Infinity)) {
        cameFrom.set(next, current); g.set(next, tentative);
        const n = nodes.find(node => node.id === next)!;
        f.set(next, tentative + Math.hypot(n.x - goal.x, n.z - goal.z)); open.add(next);
      }
    }
  }
  return [];
}
