// Vista previa de las especies añadidas en la 2.6 (normal arriba, shiny abajo, tres direcciones).
import fs from 'node:fs';
import { renderMon3D, MON_FRAME } from '../client/src/graphics/mon3d';
import { encodePNG } from './png';
const keys = ['mareep', 'hoppip', 'wooper', 'murkrow', 'misdreavus', 'sneasel', 'swinub', 'houndour', 'togepi', 'raikou', 'entei', 'suicune', 'lugia', 'hooh', 'rayquaza', 'celebi', 'jirachi', 'darkrai'];
const scale = 2, cell = (MON_FRAME + 4) * scale, cols = keys.length, rows = 4, w = cols * cell, h = rows * cell;
const data = new Uint8Array(w * h * 4);
for (let i = 0; i < w * h; i++) data.set([30, 46, 56, 255], i * 4);
const views: [boolean, number, number][] = [[false, 1, 0], [false, 3, 3], [true, 1, 0], [false, 6, 6]];
keys.forEach((k, n) => views.forEach(([sh, dir, fr], row) => {
  const art = renderMon3D(k, sh, dir, fr);
  for (let y = 0; y < MON_FRAME; y++) for (let x = 0; x < MON_FRAME; x++) {
    const v = art.get(x, y); if (!(v & 255)) continue;
    for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) data.set([v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, 255], (((row * (MON_FRAME + 4) + y + 2) * scale + yy) * w + (n * (MON_FRAME + 4) + x + 2) * scale + xx) * 4);
  }
}));
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/newmons.png', encodePNG(w, h, data));
console.log('artifacts/newmons.png');
