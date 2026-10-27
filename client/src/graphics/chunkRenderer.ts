// Dibuja un chunk (32x32 tiles) del terreno en un canvas, con transiciones orgánicas, espuma y relieve.
import { CHUNK, T } from '../../../shared/constants';
import type { World } from '../../../shared/world/worldgen';
import { phash } from './pixel';
import { TileSet, TS, DIRS, PRIO, blendKey, isWall, VARIANTS } from './tileArt';

export function renderChunk(world: World, ts: TileSet, cx: number, cy: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CHUNK * TS; c.height = CHUNK * TS;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const W = world.w, H = world.h;
  const tAt = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? T.VOID : world.terrain[y * W + x]);
  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  const nb: number[] = new Array(8);

  for (let ty = y0; ty < y0 + CHUNK; ty++) {
    for (let tx = x0; tx < x0 + CHUNK; tx++) {
      if (tx >= W || ty >= H) continue;
      const t = tAt(tx, ty);
      const px = (tx - x0) * TS, py = (ty - y0) * TS;
      const v = Math.floor(phash(tx, ty, 99) * VARIANTS);
      if (t !== T.WATER) ctx.drawImage(ts.tex[t][v], px, py);
      // Continuous terrain tint breaks up repetition without seams at chunk boundaries.
      if (([T.GRASS, T.FOREST, T.PATH, T.SAND, T.SNOW, T.DRYGRASS] as number[]).includes(t)) {
        const patch = Math.sin(tx * 0.23 + Math.sin(ty * 0.17) * 2) * Math.cos(ty * 0.21 + tx * 0.08);
        ctx.fillStyle = patch > 0 ? `rgba(239,239,176,${patch * 0.055})` : `rgba(32,69,64,${-patch * 0.07})`;
        ctx.fillRect(px, py, TS, TS);
      }
      for (let d = 0; d < 8; d++) nb[d] = tAt(tx + DIRS[d][0], ty + DIRS[d][1]);

      if (isWall(t)) {
        const s = nb[2];
        if (!isWall(s) && !(t === T.INWALL && s === T.VOID)) ctx.drawImage(ts.face[t], px, py);
        else {
          if (!isWall(nb[0])) { ctx.fillStyle = 'rgba(255,255,240,0.22)'; ctx.fillRect(px, py, TS, 2); }
          if (!isWall(nb[3])) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px, py, 1, TS); }
          if (!isWall(nb[1])) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + TS - 1, py, 1, TS); }
        }
        continue;
      }
      // transiciones
      const myK = blendKey(t), myP = PRIO[myK];
      if (myP >= 0 && t !== T.TOWN && t !== T.BRIDGE) {
        const list: [number, number][] = [];
        for (let d = 0; d < 8; d++) {
          const n = blendKey(nb[d]);
          if (n === myK || PRIO[n] <= myP) continue;
          if (d >= 4) { // diagonal: solo si las ortogonales no comparten ese terreno
            const a = d === 4 ? [0, 1] : d === 5 ? [1, 2] : d === 6 ? [2, 3] : [3, 0];
            if (blendKey(nb[a[0]]) === n || blendKey(nb[a[1]]) === n) continue;
          }
          list.push([PRIO[n], d]);
        }
        list.sort((a, b) => a[0] - b[0]);
        for (const [, d] of list) { const e = ts.edge[blendKey(nb[d])][d]; if (e) ctx.drawImage(e, px, py); }
      }
      if (t === T.WATER) {
        for (let d = 0; d < 4; d++) {
          const n = nb[d];
          if (n !== T.WATER && n !== T.SWAMP && n !== T.BRIDGE) ctx.drawImage(ts.foam[d], px, py);
        }
      }
      // sombra bajo paredes
      if (isWall(nb[0])) ctx.drawImage(ts.shadow, px, py);
      // detalles sueltos
      const h = phash(tx, ty, 123);
      if (t === T.GRASS && h < 0.04) { ctx.fillStyle = '#4e9238'; ctx.fillRect(px + 4 + (h * 100 % 8), py + 9, 1, 3); ctx.fillRect(px + 6 + (h * 100 % 8), py + 8, 1, 4); }
      else if (t === T.SAND && h < 0.015) { ctx.fillStyle = '#f8f0f0'; ctx.fillRect(px + 6, py + 7, 3, 2); ctx.fillStyle = '#e8b0a0'; ctx.fillRect(px + 7, py + 7, 1, 1); }
      else if (t === T.FOREST && h < 0.065) { ctx.fillStyle = '#db7958'; ctx.fillRect(px + 6, py + 8, 5, 2); ctx.fillRect(px + 7, py + 7, 3, 1); ctx.fillStyle = '#f8efd3'; ctx.fillRect(px + 8, py + 10, 1, 3); ctx.fillRect(px + 7, py + 8, 1, 1); ctx.fillRect(px + 9, py + 9, 1, 1); }
      else if (t === T.ROCK && h < 0.03) { ctx.fillStyle = '#7a6448'; ctx.fillRect(px + 5, py + 9, 3, 2); ctx.fillStyle = '#c4ac8a'; ctx.fillRect(px + 5, py + 9, 1, 1); }
      else if (t === T.SNOW && h < 0.02) { ctx.fillStyle = '#c8d8ec'; ctx.fillRect(px + 3, py + 10, 5, 1); }
      else if (t === T.HAUNT && h < 0.03) { ctx.fillStyle = '#d8d0c0'; ctx.fillRect(px + 6, py + 9, 3, 1); ctx.fillRect(px + 7, py + 8, 1, 3); }
    }
  }
  // Soft directional shadows are baked once per chunk, including neighboring trees.
  for (const o of world.objects) {
    if (!['tree', 'boulder', 'center', 'mart', 'house', 'lab', 'tower'].includes(o.k)) continue;
    const x = (o.x + o.w / 2 - x0) * TS, y = (o.y + o.h - y0) * TS;
    if (x < -100 || y < -100 || x > c.width + 100 || y > c.height + 100) continue;
    const tree = o.k === 'tree', rx = tree ? 15 : o.w * TS * 0.5, ry = tree ? 7 : 7;
    ctx.fillStyle = 'rgba(24,46,45,0.10)';
    ctx.beginPath(); ctx.ellipse(x + 7, y + 3, rx + 3, ry + 2, -0.18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(24,46,45,0.12)';
    ctx.beginPath(); ctx.ellipse(x + 5, y + 2, rx, ry, -0.18, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/** Mapa completo 1 px por tile (minimapa / mapa mundial). */
export function renderOverview(world: World, colors: string[]): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = world.w; c.height = world.h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(world.w, world.h);
  const parsed = colors.map(h => [parseInt(h.slice(1, 3), 16) || 0, parseInt(h.slice(3, 5), 16) || 0, parseInt(h.slice(5, 7), 16) || 0]);
  for (let i = 0; i < world.w * world.h; i++) {
    const t = world.terrain[i];
    let [r, g, b] = parsed[t] || [0, 0, 0];
    if (world.solid[i] === 1 && t !== T.CLIFF && t !== T.VOID && t !== T.CAVEWALL && t !== T.TOWERWALL && t !== T.LAVA) { r *= 0.62; g *= 0.7; b *= 0.62; }
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
