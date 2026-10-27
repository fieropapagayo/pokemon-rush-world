import { playerBlocked, type World } from '../../../shared/world/worldgen';

export interface Point { x: number; y: number; }
export interface Waypoint extends Point { name: string; }

/** A bounded four-neighbor search: respects the same collision rule as the server. */
export function findWalkPath(world: World, start: Point, goal: Point, limit = 5000): Point[] | null {
  if (![start.x, start.y, goal.x, goal.y].every(Number.isFinite)) return null;
  const sx = Math.floor(start.x), sy = Math.floor(start.y), gx = Math.floor(goal.x), gy = Math.floor(goal.y);
  if (gx < 0 || gy < 0 || gx >= world.w || gy >= world.h || playerBlocked(world, gx + 0.5, gy + 0.5)) return null;
  if (sx === gx && sy === gy) return [{ x: gx + 0.5, y: gy + 0.5 }];
  const key = (x: number, y: number) => y * world.w + x;
  const origin = key(sx, sy), end = key(gx, gy);
  const queue = [origin], prev = new Map<number, number>([[origin, -1]]);
  let index = 0;
  while (index < queue.length && index < limit) {
    const current = queue[index++], x = current % world.w, y = Math.floor(current / world.w);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, id = key(nx, ny);
      if (nx < 0 || ny < 0 || nx >= world.w || ny >= world.h || prev.has(id) || playerBlocked(world, nx + 0.5, ny + 0.5)) continue;
      prev.set(id, current);
      if (id === end) {
        const path: Point[] = [];
        for (let at = end; at !== origin; at = prev.get(at)!) path.push({ x: at % world.w + 0.5, y: Math.floor(at / world.w) + 0.5 });
        path.push({ x: sx + 0.5, y: sy + 0.5 });
        return path.reverse();
      }
      queue.push(id);
    }
  }
  return null;
}

export function nearestZonePoint(world: World, position: Point, zoneId: number): Point | null {
  let best: Point | null = null, dist = Infinity;
  for (let y = 1; y < world.h - 1; y++) for (let x = 1; x < world.w - 1; x++) {
    if (world.zone[y * world.w + x] !== zoneId) continue;
    const d = (x + 0.5 - position.x) ** 2 + (y + 0.5 - position.y) ** 2;
    if (d >= dist || playerBlocked(world, x + 0.5, y + 0.5)) continue;
    best = { x: x + 0.5, y: y + 0.5 }; dist = d;
  }
  return best;
}
