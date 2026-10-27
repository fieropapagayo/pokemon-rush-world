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

// ------------------------------------------------------------------ ruta guiada hasta un destino lejano
// A* sobre todo el mapa (8 direcciones, sin cortar esquinas). Prefiere caminos y puentes y evita la hierba alta,
// para que la línea marcada se parezca a la ruta que tomaría una persona.
const TERRAIN_COST: Record<number, number> = { 4: 0.6, 2: 1.5 }; // PATH, TALL
class Heap {
  ids: number[] = []; pr: number[] = [];
  get size() { return this.ids.length; }
  push(id: number, p: number) {
    const a = this.ids, b = this.pr; let i = a.length; a.push(id); b.push(p);
    while (i > 0) { const j = (i - 1) >> 1; if (b[j] <= p) break; a[i] = a[j]; b[i] = b[j]; i = j; }
    a[i] = id; b[i] = p;
  }
  pop(): number {
    const a = this.ids, b = this.pr, top = a[0], id = a.pop()!, p = b.pop()!;
    if (a.length) {
      let i = 0; const n = a.length;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && b[c + 1] < b[c]) c++; if (b[c] >= p) break; a[i] = a[c]; b[i] = b[c]; i = c; }
      a[i] = id; b[i] = p;
    }
    return top;
  }
}

function open(world: World, x: number, y: number, surf: boolean) {
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) return false;
  const s = world.solid[y * world.w + x];
  return s === 0 || (surf && s === 2);
}

/** Ruta completa (en centros de casilla) desde start hasta goal, o null si no hay forma de llegar. */
export function findRoute(world: World, start: Point, goal: Point, surf = false, maxNodes = 220000): Point[] | null {
  const W = world.w;
  let sx = Math.floor(start.x), sy = Math.floor(start.y), gx = Math.floor(goal.x), gy = Math.floor(goal.y);
  // destino bloqueado (un árbol, una casa...): la casilla libre más cercana
  if (!open(world, gx, gy, surf)) {
    let best = -1, bd = Infinity;
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (open(world, gx + dx, gy + dy, surf) && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = (gy + dy) * W + gx + dx; }
    if (best < 0) return null;
    gx = best % W; gy = Math.floor(best / W);
  }
  if (!open(world, sx, sy, surf)) {
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (open(world, sx + dx, sy + dy, surf)) { sx += dx; sy += dy; break; }
  }
  const N = W * world.h, startId = sy * W + sx, goalId = gy * W + gx;
  const g = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const h = (x: number, y: number) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return 0.6 * (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)); };
  const heap = new Heap(); g[startId] = 0; heap.push(startId, h(sx, sy));
  let expanded = 0;
  while (heap.size && expanded < maxNodes) {
    const cur = heap.pop(); if (closed[cur]) continue; closed[cur] = 1; expanded++;
    if (cur === goalId) break;
    const x = cur % W, y = (cur - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!open(world, nx, ny, surf)) continue;
      if (dx && dy && (!open(world, x + dx, y, surf) || !open(world, x, y + dy, surf))) continue;
      const id = ny * W + nx; if (closed[id]) continue;
      const t = world.terrain[id], water = world.solid[id] === 2;
      const step = (dx && dy ? 1.414 : 1) * (water ? 2.2 : TERRAIN_COST[t] ?? 1);
      const ng = g[cur] + step;
      if (ng < g[id]) { g[id] = ng; prev[id] = cur; heap.push(id, ng + h(nx, ny)); }
    }
  }
  if (!closed[goalId]) return null;
  const path: Point[] = [];
  for (let at = goalId; at !== -1; at = prev[at]) path.push({ x: at % W + 0.5, y: Math.floor(at / W) + 0.5 });
  return path.reverse();
}

/** Longitud de una ruta en casillas. */
export function routeLength(route: Point[]) {
  let d = 0; for (let i = 1; i < route.length; i++) d += Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return d;
}

/** Índice del punto de la ruta más cercano a pos (busca solo al principio: la ruta se va recortando). */
export function nearestOnRoute(route: Point[], pos: Point, look = 60) {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < Math.min(route.length, look); i++) { const d = (route[i].x - pos.x) ** 2 + (route[i].y - pos.y) ** 2; if (d < bd) { bd = d; bi = i; } }
  return { index: bi, dist: Math.sqrt(bd) };
}
