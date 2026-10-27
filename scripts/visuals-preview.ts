import fs from 'node:fs';
import { NPC_LOOKS } from '../client/src/graphics/trainerArt';
import { renderTrainer } from '../client/src/graphics/trainer3d';
import { natureArt } from '../client/src/graphics/nature3d';
import { renderMon3D } from '../client/src/graphics/mon3d';
import type { PixelArt } from '../client/src/graphics/pixel';
import { encodePNG } from './png';

const W = 432, H = 334, zoom = 3;
const rgba = new Uint8Array(W * H * zoom * zoom * 4);
for (let y = 0; y < H * zoom; y++) for (let x = 0; x < W * zoom; x++) {
  const i = (y * W * zoom + x) * 4;
  rgba.set(Math.floor(y / (54 * zoom)) % 2 ? [35, 53, 57, 255] : [28, 44, 50, 255], i);
}
function draw(art: PixelArt, ox: number, oy: number, size = 1) {
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) {
    const v = art.get(x, y); if (!(v & 255)) continue;
    const sc = zoom * size;
    for (let dy = 0; dy < sc; dy++) for (let dx = 0; dx < sc; dx++) {
      const px = Math.floor(ox * zoom + x * sc + dx), py = Math.floor(oy * zoom + y * sc + dy);
      if (px >= W * zoom || py >= H * zoom) continue;
      rgba.set([v >>> 24, v >>> 16 & 255, v >>> 8 & 255, v & 255], (py * W * zoom + px) * 4);
    }
  }
}
[0, 1, 2, 6, 8, 9, 10, 11, 12, 13, 3, 7].forEach((n, i) => {
  for (let dir = 0; dir < 3; dir++) draw(renderTrainer(NPC_LOOKS[n], dir, 0), (i % 4) * 108 + dir * 32 + 6, Math.floor(i / 4) * 54 + 3);
});
let x = 4;
for (let v = 0; v < 6; v++) { const art = natureArt('tree', v); draw(art, x, 258 - art.h); x += art.w + 4; }
for (const [i, key] of ['eevee', 'charizard', 'blastoise', 'venusaur', 'pikachu', 'lapras'].entries()) draw(renderMon3D(key), i * 72 + 4, 266);
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/visuals-2.8.png', encodePNG(W * zoom, H * zoom, rgba));
console.log('Preview: artifacts/visuals-2.8.png');
