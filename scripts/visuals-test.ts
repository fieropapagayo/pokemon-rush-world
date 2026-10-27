import assert from 'node:assert/strict';
import { NPC_LOOKS, colsFromLook } from '../client/src/graphics/trainerArt';
import { renderTrainer, TRAINER_W, TRAINER_H, TRAINER_SCALE } from '../client/src/graphics/trainer3d';
import { natureArt, objectScale } from '../client/src/graphics/nature3d';
import type { PixelArt } from '../client/src/graphics/pixel';
import { townArt } from '../client/src/graphics/townArt';

function checkFrame(g: PixelArt, label: string) {
  assert(g.data.some(v => !!v), `${label}: empty texture`);
  for (let x = 0; x < g.w; x++) assert(!g.get(x, 0) && !g.get(x, g.h - 1), `${label}: vertical clipping at ${x}`);
  for (let y = 0; y < g.h; y++) assert(!g.get(0, y) && !g.get(g.w - 1, y), `${label}: horizontal clipping at ${y}`);
}
assert(TRAINER_H * TRAINER_SCALE >= 26 && TRAINER_H * TRAINER_SCALE <= 28, 'Trainer stands taller than small Pokémon');
let count = 0;
const looks = [...NPC_LOOKS, ...Array.from({ length: 8 }, (_, i) => colsFromLook({ hat: i - 1, shirt: i, skin: i % 4, hair: i % 6 }))];
for (const [i, c] of looks.entries()) {
  for (let dir = 0; dir < 3; dir++) {
    for (let pose = 0; pose < 3; pose++) { checkFrame(renderTrainer(c, dir, pose), `Trainer ${i} view ${dir} pose ${pose}`); count++; }
    assert.notDeepEqual(renderTrainer(c, dir, 1).data, renderTrainer(c, dir, 2).data, `Trainer ${i}: alternating walk`);
  }
  assert.notDeepEqual(renderTrainer(c, 0).data, renderTrainer(c, 1).data, `Trainer ${i}: back view`);
}
for (const [kind, n] of [['tree', 6], ['bush', 3], ['rock', 3], ['boulder', 2]] as const) {
  for (let v = 0; v < n; v++) { checkFrame(natureArt(kind, v), `${kind} ${v}`); count++; }
  assert.equal(objectScale(kind), 0.5);
}
// Pueblos a 2×: se dibujan a escala 0,5 y deben ocupar exactamente sus casillas (puertas en su sitio).
for (const [kind, tiles, vs] of [['house', 4, 4], ['center', 5, 1], ['mart', 4, 1], ['flowerbed', 1, 4], ['hedge', 1, 3], ['bench', 2, 1], ['fence', 1, 1], ['flowerpatch', 1, 4]] as const) {
  assert.equal(objectScale(kind), 0.5, `${kind} hi-res`);
  for (let v = 0; v < vs; v++) { const g = townArt(kind, v)!; assert.equal(g.w * 0.5, tiles * 16, `${kind} ${v} width`); assert(g.data.some(p => !!p), `${kind} ${v} empty`); count++; }
}
console.log(`PASS: ${count} visual frames, silhouette margins, distinct poses and original world dimensions.`);
