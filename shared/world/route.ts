// Ruta a pie por todo el mapa (A*): la usan la ruta guiada del cliente y las IAs entrenadoras del servidor.
import type { World } from './worldgen';

export interface Point { x: number; y: number; }
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
