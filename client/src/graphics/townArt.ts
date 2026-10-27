// Pueblos en alta resolución (2×, igual que los árboles): casas, Centro Pokémon, Tienda, jardineras,
// setos, bancos, vallas y macizos de flores. Se dibujan a escala 0,5 para tener el doble de detalle.
import { PixelArt, shade, mix, rgba, phash } from './pixel';

export const HIRES_KINDS = new Set(['house', 'center', 'mart', 'flowerbed', 'hedge', 'bench', 'fence', 'flowerpatch']);

const OUT = '#1c1418';

/** Esfera o elipse con volumen (luz desde arriba a la izquierda). */
function ball(g: PixelArt, cx: number, cy: number, rx: number, ry: number, base: string, gloss = 0.5) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const nz = Math.sqrt(1 - d), l = -nx * 0.45 - ny * 0.6 + nz * 0.65;
    let c = shade(base, (l - 0.5) * 0.7);
    if (l > 0.93) c = mix(c, '#ffffff', gloss * 0.6);
    g.set(x, y, rgba(c), true);
  }
}

/** Mata de hojas con racimos y borde irregular. */
function leafy(g: PixelArt, cx: number, cy: number, rx: number, ry: number, base: string, seed: number) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
    const h = phash(x >> 1, y >> 1, seed), h2 = phash(x, y, seed + 7);
    if (d > 1 || (d > 0.78 && h < 0.45)) continue;
    const nz = Math.sqrt(1 - Math.min(1, d)), l = -nx * 0.4 - ny * 0.65 + nz * 0.6;
    let k = (l - 0.45) * 0.75 + (h - 0.5) * 0.22;
    if (h2 < 0.07) k -= 0.2; else if (h2 > 0.95 && l > 0.4) k += 0.25;
    g.set(x, y, rgba(shade(base, k)), true);
  }
}

/** Flor de cinco pétalos. */
function flower(g: PixelArt, x: number, y: number, petal: string, center: string, s = 1) {
  const P = [[0, -1.5], [1.45, -0.45], [0.9, 1.25], [-0.9, 1.25], [-1.45, -0.45]];
  for (const [dx, dy] of P) ball(g, x + dx * s, y + dy * s, 1.15 * s, 1.15 * s, petal, 0.8);
  g.px(Math.floor(x), Math.floor(y), center); g.px(Math.floor(x) - 1, Math.floor(y), shade(center, -0.25));
}

const FLOWER_SETS = [
  [['#e8384a', '#ffd84a'], ['#ff7a8c', '#ffe27a'], ['#fff4f0', '#f6c640']],   // rosas
  [['#4a7ff0', '#fff2a0'], ['#9a5ae8', '#ffe8a0'], ['#78c0ff', '#ffffff']],   // azules y violetas
  [['#f8c830', '#8a4010'], ['#f08a2a', '#6a2a08'], ['#fff07a', '#c06018']],   // girasoles y caléndulas
  [['#f06ab8', '#fff0a0'], ['#ffffff', '#f8c840'], ['#c84ad8', '#ffe080']],   // fucsias
];

function flowerbed(v: number): PixelArt {
  const g = new PixelArt(32, 40);
  const set = FLOWER_SETS[v % FLOWER_SETS.length];
  g.ell(16, 35, 15, 4, '#00000038');
  g.ell(16, 31, 13.5, 6, '#4a2e1c'); g.ell(16, 30.5, 12, 5, '#5e3c24');
  const stones = 20, stone = (i: number) => {
    const a = i / stones * Math.PI * 2, sx = 16 + Math.cos(a) * 13.6, sy = 31 + Math.sin(a) * 6;
    const c = ['#aaa494', '#9b9586', '#b8b2a2', '#8f8a7d'][Math.floor(phash(i, v, 31) * 4)];
    ball(g, sx, sy, 2.5, 2, c, 0.3);
  };
  for (let i = 0; i < stones; i++) if (Math.sin(i / stones * Math.PI * 2) < 0) stone(i);
  leafy(g, 16, 25, 12.5, 8, '#4c9640', 11 + v);
  leafy(g, 9, 26, 6.5, 5, '#438a38', 12 + v); leafy(g, 23, 26, 6.5, 5, '#468e3a', 13 + v);
  leafy(g, 16, 19.5, 8, 6, '#58a64a', 14 + v);
  if (v % 4 === 1) for (const sx of [8, 23]) {   // espigas altas (altramuces)
    g.line(sx, 22, sx, 9, '#3f7a30');
    for (let k = 0; k < 6; k++) ball(g, sx + (k % 2 ? 0.6 : -0.6), 10 + k * 2, 1.6 - k * 0.12, 1.2, k < 2 ? set[2][0] : set[1][0], 0.6);
  }
  const spots = [[7, 23], [12, 18], [17, 15], [22, 18], [26, 23], [10, 27], [16, 22], [21, 26], [14, 28], [19, 20], [24, 28], [6, 28]];
  spots.forEach(([fx, fy], i) => { const [p, c] = set[Math.floor(phash(i, v, 33) * set.length)]; flower(g, fx + phash(i, v, 34) * 1.5, fy, p, c, 0.9 + phash(i, v, 35) * 0.35); });
  for (let i = 0; i < stones; i++) if (Math.sin(i / stones * Math.PI * 2) >= 0) stone(i);
  g.outline('#1a2412');
  return g;
}

function hedge(v: number): PixelArt {
  const g = new PixelArt(32, 38);
  g.ell(16, 35, 15.5, 3.5, '#00000040');
  const top = 8, bot = 34;
  for (let y = top; y < bot; y++) for (let x = 0; x < 32; x++) {
    const h = phash(x >> 1, y >> 1, 40 + v), h2 = phash(x, y, 41 + v);
    const edge = (y === top && (x < 2 || x > 29)) || (y === bot - 1 && (x < 1 || x > 30));
    if (edge || (y < top + 2 && h < 0.3)) continue;
    const face = y < top + 9;
    let c = face ? '#5ba84a' : '#3d8a35';
    let k = face ? 0.08 - (y - top) * 0.012 : -0.02 - (y - top - 9) * 0.012;
    k += (h - 0.5) * 0.26 - x / 32 * 0.08;
    if (h2 < 0.06) k -= 0.22; else if (h2 > 0.96) k += 0.25;
    if (y === top + 9) k -= 0.18;
    g.set(x, y, rgba(shade(c, k)), true);
  }
  if (v) for (let i = 0; i < 7; i++) { const fx = 3 + phash(i, v, 42) * 26, fy = top + 2 + phash(i, v, 43) * 18; flower(g, fx, fy, v === 1 ? '#ffffff' : '#f58ab8', '#f8d040', 0.7); }
  g.outline('#142212');
  return g;
}

function bench(): PixelArt {
  const g = new PixelArt(64, 40);
  g.ell(32, 35, 28, 3.5, '#00000040');
  const iron = '#3a3c48';
  for (const lx of [8, 54]) { g.rect(lx, 22, 3, 13, iron); g.rect(lx - 2, 33, 7, 2, iron); g.rect(lx - 1, 8, 2, 16, iron); }
  const wood = (y: number, h: number, c: string) => {
    g.rect(4, y, 56, h, c); g.rect(4, y, 56, 1, shade(c, 0.22)); g.rect(4, y + h - 1, 56, 1, shade(c, -0.3));
    for (let x = 6; x < 58; x += 3) if (phash(x, y, 50) < 0.35) g.px(x, y + 1 + Math.floor(phash(x, y, 51) * (h - 2)), shade(c, -0.14));
  };
  wood(9, 4, '#b07040'); wood(14, 4, '#a5683a');
  wood(23, 4, '#b87848'); wood(27, 4, '#a86c3e');
  for (const ax of [3, 56]) { g.rect(ax, 20, 5, 3, iron); g.px(ax + 1, 20, '#6a6c7a'); }
  g.outline(OUT);
  return g;
}

function fence(): PixelArt {
  const g = new PixelArt(32, 34);
  const wood = '#f0ece2';
  for (const y of [15, 24]) { g.rect(0, y, 32, 3, shade(wood, -0.1)); g.rect(0, y, 32, 1, wood); g.rect(0, y + 3, 32, 1, '#00000030'); }
  for (const px of [1, 9, 17, 25]) {
    g.rect(px, 9, 6, 22, wood);
    g.poly([[px, 9], [px + 3, 5], [px + 6, 9]], wood);
    g.rect(px + 4, 8, 2, 23, shade(wood, -0.16)); g.rect(px, 9, 1, 22, shade(wood, 0.06));
    g.rect(px, 30, 6, 1, shade(wood, -0.3));
  }
  g.rect(0, 31, 32, 3, '#00000030');
  g.outline('#3a3430');
  return g;
}

function flowerpatch(v: number): PixelArt {
  const g = new PixelArt(32, 32);
  const set = FLOWER_SETS[v % FLOWER_SETS.length];
  for (let i = 0; i < 9; i++) {
    const lx = 3 + phash(i, v, 60) * 26, ly = 8 + phash(i, v, 61) * 20;
    g.rell(lx, ly, 2.6, 1.1, phash(i, v, 62) * 3, phash(i, v, 63) < 0.5 ? '#3f8a34' : '#58a446');
  }
  for (let i = 0; i < 6; i++) { const [p, c] = set[i % set.length]; flower(g, 5 + phash(i, v, 64) * 22, 7 + phash(i, v, 65) * 18, p, c, 0.85); }
  return g;
}

// ------------------------------------------------------------------ edificios
function bigBuilding(kind: 'center' | 'mart' | 'house', v: number): PixelArt {
  const W = kind === 'center' ? 160 : 128, H = kind === 'center' ? 152 : 124;
  const g = new PixelArt(W, H);
  const roof = kind === 'center' ? '#d8423f' : kind === 'mart' ? '#3a74d0' : ['#4c9a50', '#c0603c', '#8458b0', '#3a98a4'][v % 4];
  const wall = kind === 'house' ? ['#f1e4c8', '#f0dccd', '#f3ead6', '#e9dcc0'][v % 4] : '#f5eee0';
  const wallTop = H - (kind === 'center' ? 92 : 88);
  const L = 6, R = W - 6, B = H - 12;
  // ---- paredes
  for (let y = wallTop; y < B; y++) for (let x = L; x < R; x++) {
    let k = -0.02 - (y - wallTop) / (B - wallTop) * 0.07;
    if (x > R - 10) k -= 0.13;
    const h = phash(x, y, 70 + v);
    if (h < 0.05) k -= 0.05; else if (h > 0.97) k += 0.04;
    g.set(x, y, rgba(shade(wall, k)), true);
  }
  if (kind === 'house') {
    const beam = '#6b4428';
    for (const bx of [L, R - 5]) { g.rect(bx, wallTop, 5, B - wallTop, beam); g.rect(bx, wallTop, 1, B - wallTop, shade(beam, 0.2)); }
    g.rect(L, wallTop + 8, R - L, 4, beam); g.rect(L, wallTop + 8, R - L, 1, shade(beam, 0.2));
    for (const [x0, dir] of [[L + 5, 1], [R - 5, -1]] as const) g.line(x0, wallTop + 12, x0 + dir * 12, wallTop + 24, beam, 2);
  } else {
    g.rect(L, wallTop + 8, R - L, 3, shade(wall, -0.22));
    g.rect(L, B - 4, R - L, 4, shade(wall, -0.25));
  }
  // ---- zócalo de piedra
  for (let x = L - 2, i = 0; x < R + 2; x += 10, i++) {
    const c = ['#a49e92', '#968f83', '#b0aa9c', '#8c8679'][Math.floor(phash(i, v, 71) * 4)];
    g.rect(x, B, 9, 12, c); g.rect(x, B, 9, 2, shade(c, 0.2)); g.rect(x + 8, B, 1, 12, shade(c, -0.25)); g.rect(x, B + 10, 9, 2, shade(c, -0.3));
  }
  // ---- tejado (tejas escalonadas, más claro a la izquierda)
  const rTop = 10, rBot = wallTop + 8;
  const rx0 = (y: number) => 14 - (y - rTop) / (rBot - rTop) * 16, rx1 = (y: number) => W - 14 + (y - rTop) / (rBot - rTop) * 16;
  for (let y = rTop; y < rBot; y++) {
    const row = Math.floor((y - rTop) / 7), ry = (y - rTop) % 7;
    for (let x = Math.max(0, Math.round(rx0(y))); x < Math.min(W, Math.round(rx1(y))); x++) {
      const sx = x + (row % 2 ? 6 : 0), col = Math.floor(sx / 12), bx = sx % 12;
      let k = 0.07 - x / W * 0.16 + (phash(col, row, 72 + v) - 0.5) * 0.1;
      if (ry === 0) k += 0.2; else if (ry >= 5) k -= 0.24;
      if (bx === 0) k -= 0.18;
      if (ry === 6 && (bx < 2 || bx > 9)) k -= 0.15;    // borde redondeado de cada teja
      g.set(x, y, rgba(shade(roof, k)), true);
    }
  }
  // cumbrera
  g.rect(12, rTop - 4, W - 24, 5, shade(roof, -0.28)); g.rect(12, rTop - 4, W - 24, 1, shade(roof, 0.25));
  for (let x = 16; x < W - 16; x += 10) g.rect(x, rTop - 4, 1, 5, shade(roof, -0.45));
  // alero y su sombra sobre la pared
  g.rect(0, rBot, W, 4, shade(roof, -0.42)); g.rect(0, rBot, W, 1, shade(roof, -0.15));
  for (let i = 0; i < 6; i++) g.rect(L, rBot + 4 + i, R - L, 1, '#000000' + (['50', '3c', '2c', '1e', '12', '08'][i]));
  // chimenea (casas)
  if (kind === 'house') {
    const cx = W - 36;
    for (let y = 0; y < 22; y++) for (let x = cx; x < cx + 12; x++) {
      const brick = (y % 5 === 4) || ((x - cx + (Math.floor(y / 5) % 2 ? 3 : 0)) % 6 === 5);
      g.set(x, y, rgba(brick ? '#6a3a30' : shade('#b0604c', (phash(x >> 1, y, 74) - 0.5) * 0.15 - (x - cx) / 40)), true);
    }
    g.rect(cx - 2, 0, 16, 3, '#4a3430'); g.rect(cx - 2, 0, 16, 1, '#7a5a50');
  }
  // ---- ventanas
  const win = (x: number, y: number, w = 20, h = 16, shutters = kind === 'house') => {
    if (shutters) for (const sx of [x - 7, x + w + 2]) {
      g.rect(sx, y - 1, 5, h + 2, shade(roof, -0.08));
      for (let j = 1; j < h; j += 3) g.rect(sx + 1, y + j, 3, 1, shade(roof, -0.32));
    }
    g.rect(x - 2, y - 2, w + 4, h + 4, '#f8f4ec'); g.rect(x - 2, y + h + 1, w + 4, 1, '#c8c0b0');
    for (let j = 0; j < h; j++) g.rect(x, y + j, w, 1, mix('#c8ecff', '#4c8cc8', j / h));
    for (let j = 0; j < h; j++) { const rx = x + 3 + j * 0.6; g.px(Math.floor(rx + (h - j) * 0.4), y + j, '#ffffff'); g.px(Math.floor(rx + (h - j) * 0.4) + 4, y + j, '#e8f8ff'); }
    g.rect(x + w / 2 - 1, y, 2, h, '#f0ebe0'); g.rect(x, y + h / 2 - 1, w, 2, '#f0ebe0');
    g.rect(x - 4, y + h + 2, w + 8, 3, '#e8e0d0'); g.rect(x - 4, y + h + 5, w + 8, 1, '#00000040');
    if (kind === 'house') {   // jardinera de ventana
      g.rect(x - 2, y + h + 6, w + 4, 5, '#8a5432'); g.rect(x - 2, y + h + 6, w + 4, 1, '#b07848');
      const fs = FLOWER_SETS[(v + x) % FLOWER_SETS.length];
      for (let i = 0; i < 5; i++) { ball(g, x + 1 + i * 4.5, y + h + 5, 2.2, 1.6, '#4c9640', 0.2); const [p, c] = fs[i % 3]; flower(g, x + 1 + i * 4.5, y + h + 4, p, c, 0.6); }
    }
  };
  const wy = H - 50;
  if (kind === 'center') { win(14, wy); win(40, wy); win(102, wy); win(128, wy); }
  else if (kind === 'mart') { win(14, wy, 22); win(R - 30, wy, 22); }
  else { win(20, wy); win(R - 30, wy); }
  // ---- puerta (centrada en la 3.ª casilla: x = 80)
  if (kind === 'house') {
    const dx = 70, dw = 20, dy = H - 36;
    g.rect(dx - 3, dy - 3, dw + 6, 36, '#5a3418');
    for (let x = dx; x < dx + dw; x++) for (let y = dy; y < H - 2; y++) g.set(x, y, rgba(shade('#8a5430', ((x - dx) % 5 === 0 ? -0.2 : 0) + (phash(x, y >> 2, 75) - 0.5) * 0.08 - (y - dy) / 200)), true);
    g.rect(dx + 4, dy + 4, dw - 8, 7, '#c8ecff'); g.rect(dx + 4, dy + 4, dw - 8, 2, '#ffffff'); g.rect(dx + 9, dy + 4, 2, 7, '#5a3418');
    ball(g, dx + dw - 4, dy + 18, 1.6, 1.6, '#f8d040', 1);
    g.rect(dx - 6, H - 2, dw + 12, 2, '#c8c0b0'); g.rect(dx - 6, H - 3, dw + 12, 1, '#e8e0d0');
    // farolillo junto a la puerta
    g.rect(dx + dw + 6, dy + 2, 4, 6, '#3a3430'); g.rect(dx + dw + 7, dy + 3, 2, 4, '#ffe9a0');
  } else {
    const dx = 66, dw = 28, dy = H - 38;
    g.rect(dx - 3, dy - 3, dw + 6, 38, '#5a6070'); g.rect(dx - 3, dy - 3, dw + 6, 2, '#8a92a4');
    for (let j = 0; j < 36; j++) g.rect(dx, dy + j, dw, 1, mix('#bfe6fb', '#4a96d0', j / 36));
    g.rect(dx + dw / 2 - 1, dy, 2, 36, '#5a6070');
    for (let j = 0; j < 30; j++) { g.px(dx + 4 + Math.floor(j * 0.3), dy + 3 + j, '#ffffffa0'); g.px(dx + dw / 2 + 4 + Math.floor(j * 0.3), dy + 3 + j, '#ffffffa0'); }
    g.rect(dx - 6, H - 3, dw + 12, 3, kind === 'center' ? '#d84a48' : '#3a74d0');
    // macetas a los lados
    for (const px of [dx - 14, dx + dw + 6]) { g.rect(px, H - 12, 8, 10, '#b06a42'); g.rect(px - 1, H - 12, 10, 2, '#cc8456'); leafy(g, px + 4, H - 15, 6, 5, '#4c9640', 76 + px); flower(g, px + 2, H - 17, '#f04858', '#ffd040', 0.7); flower(g, px + 6, H - 14, '#ffffff', '#f8c840', 0.6); }
  }
  // ---- detalles por tipo
  if (kind === 'center') {
    const ex = W / 2, ey = wallTop - 18;
    ball(g, ex, ey, 14, 14, '#ffffff', 0.6);
    for (let y = Math.floor(ey - 14); y < ey; y++) for (let x = Math.floor(ex - 14); x <= ex + 14; x++) {
      const dx = (x + 0.5 - ex) / 14, dy = (y + 0.5 - ey) / 14; if (dx * dx + dy * dy <= 1) g.set(x, y, rgba(shade('#e83434', -dx * 0.25 - dy * 0.1 - 0.05)), true);
    }
    g.rect(ex - 14, ey - 1, 28, 3, OUT); ball(g, ex, ey, 5, 5, OUT, 0); ball(g, ex, ey, 3.5, 3.5, '#ffffff', 0.9);
    // rótulo con cruces de enfermería
    g.rect(28, wallTop + 14, W - 56, 12, '#e04848'); g.rect(30, wallTop + 16, W - 60, 8, '#ffffff');
    for (const cxp of [40, W - 40]) { g.rect(cxp - 1, wallTop + 16, 3, 8, '#e04848'); g.rect(cxp - 4, wallTop + 19, 9, 2, '#e04848'); }
    for (let x = 52; x < W - 52; x += 6) g.rect(x, wallTop + 19, 4, 2, '#f0a0a0');
  } else if (kind === 'mart') {
    // toldo de rayas sobre la puerta
    const ay = H - 52;
    for (let x = 52; x < 108; x++) for (let y = ay; y < ay + 9; y++) {
      const stripe = Math.floor((x - 52) / 7) % 2;
      if (y === ay + 8 && (x - 52) % 7 > 4) continue;
      g.set(x, y, rgba(shade(stripe ? '#ffffff' : '#3a74d0', y === ay ? 0.15 : -(y - ay) * 0.025)), true);
    }
    g.rect(52, ay + 9, 56, 2, '#00000040');
    g.rect(28, wallTop + 14, W - 56, 13, '#2c5aa8'); g.rect(30, wallTop + 16, W - 60, 9, '#4a86e0');
    for (let i = 0; i < 6; i++) { const bx = 40 + i * 10; ball(g, bx, wallTop + 20.5, 3, 3, i % 2 ? '#ffffff' : '#f8d040', 0.8); }
  }
  g.outline(OUT);
  return g;
}

export function townArt(kind: string, v: number): PixelArt | null {
  switch (kind) {
    case 'house': case 'center': case 'mart': return bigBuilding(kind, v);
    case 'flowerbed': return flowerbed(v);
    case 'hedge': return hedge(v);
    case 'bench': return bench();
    case 'fence': return fence();
    case 'flowerpatch': return flowerpatch(v);
  }
  return null;
}
