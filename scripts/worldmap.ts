// Genera worldmap.png con el mapa completo (depuración de la generación procedural).
import fs from 'node:fs';
import { generateWorld } from '../shared/world/worldgen';
import { WORLD_SEED, TERRAIN_MAP_COLOR } from '../shared/constants';
import { encodePNG } from './png';

const out = process.argv[2] || 'worldmap.png';
const t0 = Date.now();
const w = generateWorld(WORLD_SEED);
console.log('generado en', Date.now() - t0, 'ms', 'objetos', w.objects.length, 'cofres/objetos', w.pickups.length);
const S = 2;
const img = new Uint8Array(w.w * S * w.h * S * 4);
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const cols = TERRAIN_MAP_COLOR.map(c => c.length === 4 ? [0, 0, 0] : hex(c));
const put = (x: number, y: number, c: number[]) => {
  for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) {
    const i = ((y * S + a) * w.w * S + x * S + b) * 4;
    img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; img[i + 3] = 255;
  }
};
for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) {
  const i = y * w.w + x;
  let c = cols[w.terrain[i]];
  if (w.solid[i] === 1 && w.terrain[i] !== 9 && w.terrain[i] !== 16 && w.terrain[i] !== 0 && w.terrain[i] !== 23 && w.terrain[i] !== 11) c = [30, 70, 30];
  if (w.solid[i] === 0 && !w.reach[i]) c = c.map(v => v * 0.5);
  put(x, y, c);
}
for (const p of w.pickups) put(p.x, p.y, p.kind === 'chest' ? [255, 200, 0] : [255, 0, 255]);
for (const p of w.portals) put(p.x, p.y, [255, 0, 0]);
for (const b of w.bosses) for (let d = -2; d <= 2; d++) { put(b.x + d, b.y, [255, 0, 0]); put(b.x, b.y + d, [255, 0, 0]); }
fs.writeFileSync(out, encodePNG(w.w * S, w.h * S, img));
console.log('escrito', out);
