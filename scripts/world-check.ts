// Comprueba la generación del mundo: interiores, puertas, colinas y conectividad entre pueblos.
import { generateWorld } from '../shared/world/worldgen';
import { WORLD_SEED, T } from '../shared/constants';
const t0 = Date.now();
const w = generateWorld(WORLD_SEED);
const I = (x: number, y: number) => y * w.w + x;
let hills = 0, land = 0;
for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) { const t = w.terrain[I(x, y)]; if (t === T.HILL) hills++; if (t !== T.WATER) land++; }
const fails: string[] = [];
for (const r of w.rooms) {
  const p = w.portals.find(p => p.x === r.door.x && p.y === r.door.y);
  if (!p) fails.push('sin portal ' + r.name);
  else if (w.solid[I(p.tx, p.ty)] !== 0) fails.push('destino bloqueado ' + r.name);
  if (w.solid[I(r.door.x, r.door.y)] !== 0) fails.push('puerta bloqueada ' + r.name);
  if (!w.reach[I(r.door.x, r.door.y)]) fails.push('puerta inalcanzable ' + r.name);
}
for (const t of w.towns) if (!w.reach[I(t.spawn.x, t.spawn.y)]) fails.push('pueblo inalcanzable ' + t.name);
// conectividad entre pueblos por tierra
const seen = new Uint8Array(w.w * w.h); const st = [I(w.towns[0].spawn.x, w.towns[0].spawn.y)]; seen[st[0]] = 1;
while (st.length) { const c = st.pop()!; const x = c % w.w, y = (c / w.w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= 400 || ny >= w.h) continue; const j = I(nx, ny); if (seen[j] || w.solid[j] !== 0) continue; seen[j] = 1; st.push(j); } }
for (const t of w.towns) if (!seen[I(t.spawn.x, t.spawn.y)]) fails.push('pueblo sin conexión por tierra: ' + t.name);
console.log(`mundo en ${Date.now() - t0} ms · interiores ${w.rooms.length} · portales ${w.portals.length} · NPC ${w.npcs.length} · colinas ${(hills / land * 100).toFixed(1)}% de tierra`);
if (fails.length) { console.log('FALLOS:\n' + fails.join('\n')); process.exit(1); }
console.log('OK: puertas, interiores y pueblos conectados');
