import fs from 'node:fs';
import { renderMon3D, MON_FRAME } from '../client/src/graphics/mon3d';
import { SPECIES_LIST } from '../shared/species';
import { encodePNG } from './png';
const scale = 3, cols = 10, cell = (MON_FRAME + 4) * scale;
const rows = Math.ceil(SPECIES_LIST.length / cols), w = cols * cell, h = rows * cell;
const data = new Uint8Array(w * h * 4);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = (y * w + x) * 4, light = (Math.floor(x / cell) + Math.floor(y / cell)) % 2;
  data.set(light ? [36, 54, 64, 255] : [30, 46, 56, 255], i);
}
const start = performance.now();
SPECIES_LIST.forEach((sp, n) => {
  const art = renderMon3D(sp.key, process.argv.includes('--shiny'), 1, 0);
  for (let y = 0; y < MON_FRAME; y++) for (let x = 0; x < MON_FRAME; x++) {
    const v = art.get(x, y); if (!(v & 255)) continue;
    for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) {
      const i = (((Math.floor(n / cols) * (MON_FRAME + 4) + y + 2) * scale + yy) * w + (n % cols * (MON_FRAME + 4) + x + 2) * scale + xx) * 4;
      data.set([v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255], i);
    }
  }
});
fs.mkdirSync('artifacts', { recursive: true });
const path = `artifacts/models${process.argv.includes('--shiny') ? '-shiny' : ''}.png`;
fs.writeFileSync(path, encodePNG(w, h, data));
console.log(`${SPECIES_LIST.length} models in ${Math.round(performance.now() - start)}ms: ${path}`);
