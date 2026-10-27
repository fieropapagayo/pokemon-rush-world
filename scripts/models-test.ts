import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SPECIES_LIST } from '../shared/species';
import { modelParts, renderMon3D, monScale, MON_FRAME } from '../client/src/graphics/mon3d';
const hash = (data: Uint32Array) => createHash('sha256').update(new Uint8Array(data.buffer)).digest('hex');
let count = 0;
const start = performance.now();
for (const sp of SPECIES_LIST) {
  const dirs = new Set<string>(), walk = new Set<string>();
  const normal = hash(renderMon3D(sp.key, false).data);
  assert.notEqual(normal, hash(renderMon3D(sp.key, true).data), `${sp.key} shiny palette`);
  assert(monScale(sp) * 28 < 44, `${sp.key} stays compact`);
  for (const shiny of [false, true]) for (let direction = 0; direction < 8; direction++) for (let frame = 0; frame < 8; frame++) {
    const art = renderMon3D(sp.key, shiny, direction, frame);
    const painted = art.data.reduce((n, v) => n + +(v !== 0), 0);
    assert(painted > 90 && painted < MON_FRAME * MON_FRAME * 0.8, `${sp.key} nonempty model`);
    for (let i = 0; i < MON_FRAME; i++) assert(!art.get(i, 0) && !art.get(i, MON_FRAME - 1) && !art.get(0, i) && !art.get(MON_FRAME - 1, i), `${sp.key} clipped (dir ${direction}, pose ${frame})`);
    if (!shiny && frame === 0) dirs.add(hash(art.data));
    if (!shiny && direction === 1 && frame >= 2 && frame < 6) walk.add(hash(art.data));
    count++;
  }
  assert(dirs.size >= 4, `${sp.key} has distinct 3D views`);
  assert(walk.size >= 2, `${sp.key} has moving poses`);
  assert(modelParts(sp.key, false).every(p => p.p.every(Number.isFinite) && p.r.every(v => v > 0)), `${sp.key} valid solid geometry`);
}
console.log(`PASS: ${count} frames, ${SPECIES_LIST.length} palettes, eight directions, animations and clipping (${Math.round(performance.now() - start)}ms).`);
