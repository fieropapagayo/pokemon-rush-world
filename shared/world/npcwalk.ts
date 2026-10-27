// Paseo de los vecinos: cada NPC va y viene entre su sitio y puntos cercanos libres.
// Depende solo de la hora del servidor, así que todos los jugadores ven a cada vecino en el mismo lugar.
import type { World, NpcDef } from './worldgen';
import { hash2 } from './noise';

const STILL = new Set(['nurse', 'clerk', 'leader']);   // detrás del mostrador o esperando retadores
const SEG = 6500;                                       // ms por tramo (caminar ~1/3, quedarse quieto el resto)

const cache = new Map<number, [number, number][]>();
function spots(world: World, n: NpcDef): [number, number][] {
  let s = cache.get(n.id);
  if (s) return s;
  s = [];
  const z0 = world.zone[n.y * world.w + n.x];
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < world.w && y < world.h && world.solid[y * world.w + x] === 0 && world.zone[y * world.w + x] === z0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (!dx && !dy) continue;
    const x = n.x + dx, y = n.y + dy;
    if (!free(x, y)) continue;
    // la línea recta desde su sitio debe estar libre
    let ok = true;
    for (let k = 1; k <= 6 && ok; k++) ok = free(Math.floor(n.x + 0.5 + dx * k / 6), Math.floor(n.y + 0.5 + dy * k / 6));
    if (ok) s.push([x, y]);
  }
  cache.set(n.id, s);
  return s;
}

export interface NpcPos { x: number; y: number; moving: boolean; dir: number; }

/** Posición (centro de la casilla, en tiles) de un vecino en el instante `now`. */
export function npcPos(world: World, n: NpcDef, now: number): NpcPos {
  const home: NpcPos = { x: n.x + 0.5, y: n.y + 0.5, moving: false, dir: 0 };
  if (STILL.has(n.role)) return home;
  const sp = spots(world, n);
  if (!sp.length) return home;
  const t = now + n.id * 977;
  const seg = Math.floor(t / SEG), f = (t % SEG) / SEG;
  // los tramos pares vuelven a casa y los impares van a un punto cercano
  const at = (k: number): [number, number] => (k % 2 === 0 ? [n.x, n.y] : sp[Math.floor(hash2(n.id, k, 17) * sp.length)]);
  const a = at(seg - 1), b = at(seg);
  const walk = Math.min(1, f / 0.32), e = walk * walk * (3 - 2 * walk);
  const x = a[0] + (b[0] - a[0]) * e + 0.5, y = a[1] + (b[1] - a[1]) * e + 0.5;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const moving = walk < 1 && (dx !== 0 || dy !== 0);
  const dir = !moving ? 0 : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  return { x, y, moving, dir };
}
