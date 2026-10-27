// Objetos del mundo: árboles, rocas, edificios, cofres... (pixel art por código)
import { PixelArt, shade, phash } from './pixel';
import { natureArt } from './nature3d';

const K = '#18101e';
const SH = '#00000048';

function building(kind: 'center' | 'mart' | 'house' | 'lab', v: number): PixelArt {
  const W = kind === 'center' || kind === 'lab' ? 80 : 64;
  const H = kind === 'center' ? 76 : kind === 'lab' ? 68 : 62;
  const g = new PixelArt(W, H);
  const roofCol = kind === 'center' ? '#e04848' : kind === 'mart' ? '#3878d8' : kind === 'lab' ? '#8a90a0' : ['#4a9a4a', '#b0603a', '#8a5ab0', '#3a9aa0'][v % 4];
  const wall = kind === 'lab' ? '#f4f4f0' : '#f2e6cc';
  const wallTop = H - 48 + (kind === 'center' ? 2 : 4);
  // pared
  g.rect(2, wallTop, W - 4, H - wallTop - 1, wall);
  for (let y = wallTop; y < H - 6; y++) g.rect(3, y, W - 8, 1, shade(wall, -0.06 + (y - wallTop) / (H - wallTop) * 0.09));
  g.rect(W - 6, wallTop + 3, 4, H - wallTop - 4, shade(wall, -0.16));
  g.rect(2, H - 6, W - 4, 5, shade(wall, -0.18));
  g.rect(3, H - 6, W - 6, 1, shade(wall, 0.1));
  // tejado
  g.poly([[0, wallTop + 2], [8, 4], [W - 8, 4], [W, wallTop + 2]], roofCol);
  g.rect(0, wallTop - 1, W, 4, shade(roofCol, -0.2));
  g.shadeAll(0.8);
  // Hip roof: a lit central plane, shaded side plane, ridge and cast eave shadow.
  g.poly([[W - 13, 5], [W - 8, 5], [W - 1, wallTop - 1], [W - 8, wallTop - 1]], shade(roofCol, -0.18));
  g.line(9, 5, W - 10, 5, shade(roofCol, 0.32));
  g.line(W - 13, 6, W - 8, wallTop - 2, shade(roofCol, 0.09));
  for (let i = 0; i < 4; i++) g.rect(3, wallTop + 3 + i, W - 6, 1, shade(wall, -0.2 + i * 0.035));
  // tejas
  for (let y = 8; y < wallTop - 2; y += 4) g.line(6 - (y - 4) * 0.2, y, W - 6 + (y - 4) * 0.2, y, shade(roofCol, -0.18));
  for (let y = 8; y < wallTop - 3; y += 4) for (let x = 9 + (y % 8 ? 4 : 0); x < W - 8; x += 8) {
    g.line(x, y, x, y + 3, shade(roofCol, -0.15)); g.line(x + 1, y + 1, x + 5, y + 1, shade(roofCol, 0.16));
  }
  for (let y = wallTop + 11; y < H - 6; y += 6) for (let x = 4 + (y % 12 ? 0 : 5); x < W - 7; x += 10) {
    g.line(x, y, x + 6, y, shade(wall, -0.06));
  }
  // puerta
  const dw = kind === 'center' || kind === 'mart' ? 14 : 10;
  // La puerta queda centrada en la tercera casilla del edificio, que es la entrada real al interior.
  const dx = 40 - Math.floor(dw / 2);
  const winR = W >= 80 ? W - 18 : W - 14;
  if (kind === 'center' || kind === 'mart') {
    g.rect(dx, H - 18, dw, 17, '#5aa8e8'); g.rect(dx + dw / 2 - 0.5, H - 18, 1, 17, '#3878b8'); g.rect(dx, H - 18, dw, 2, '#d8f0ff');
    g.rect(dx - 1, H - 19, dw + 2, 1, '#606878');
  } else {
    g.rect(dx, H - 17, dw, 16, '#7a4a28'); g.px(dx + dw - 3, H - 9, '#f8d040'); g.rect(dx, H - 17, dw, 1, '#5a3418');
    g.rect(dx + 2, H - 15, dw - 4, 5, '#9e7148'); g.rect(dx + 2, H - 8, dw - 4, 5, '#8d603a');
    g.px(dx + dw - 2, H - 9, '#f6d995');
  }
  g.rect(dx - 2, H - 2, dw + 4, 1, '#ede4d0');
  g.rect(dx - 1, H - 1, dw + 2, 1, '#afa792');
  // ventanas
  const win = (x: number, y: number, w = 10, h = 8) => {
    g.rect(x - 1, y - 1, w + 2, h + 2, '#5a5048'); g.rect(x, y, w, h, '#8cd0f8'); g.rect(x, y, w, 2, '#d8f4ff'); g.line(x + w / 2, y, x + w / 2, y + h - 1, '#5a5048');
    g.line(x + 1, y + h - 3, x + 3, y + 3, '#c9eef3'); g.rect(x - 2, y + h + 1, w + 4, 2, '#f8efdb');
    g.line(x + w - 3, y + 2, x + w - 5, y + h - 2, '#bde2e5');
    g.rect(x - 2, y + h + 3, w + 4, 1, '#00000028');
  };
  win(8, H - 22); win(winR, H - 22);
  if (kind === 'house' || kind === 'mart') for (const x of [8, winR]) {
    g.rect(x - 1, H - 11, 12, 3, '#a46949'); g.rect(x, H - 13, 10, 2, '#528452');
    for (let j = 0; j < 3; j++) { g.px(x + 1 + j * 3, H - 14, '#ee9e9a'); g.px(x + 2 + j * 3, H - 13, '#f9d99c'); }
  }
  if (kind === 'center') {
    // emblema Poké Ball
    g.ell(W / 2, wallTop - 10, 7, 7, '#ffffff'); g.ellIf(W / 2, wallTop - 10, 7, 7, '#e83030', (_x, y) => y < wallTop - 10);
    g.rect(W / 2 - 7, wallTop - 11, 14, 2, K); g.ell(W / 2, wallTop - 10, 2.5, 2.5, '#ffffff'); g.ell(W / 2, wallTop - 10, 1.2, 1.2, K);
    g.rect(14, wallTop + 4, W - 28, 6, '#e04848'); g.rect(16, wallTop + 5, W - 32, 4, '#ffffff');
    // Jardineras decorativas a los lados de la entrada
    g.rect(dx - 7, H - 9, 5, 8, '#9a6042'); g.ell(dx - 4.5, H - 9, 3.2, 2.4, '#449e48'); g.px(dx - 5, H - 10, '#f85868'); g.px(dx - 3, H - 10, '#ffcc48');
    g.rect(dx + dw + 2, H - 9, 5, 8, '#9a6042'); g.ell(dx + dw + 4.5, H - 9, 3.2, 2.4, '#449e48'); g.px(dx + dw + 4, H - 10, '#f85868'); g.px(dx + dw + 6, H - 10, '#ffcc48');
  } else if (kind === 'mart') {
    g.rect(12, wallTop + 4, W - 24, 7, '#3878d8'); g.rect(14, wallTop + 5, W - 28, 5, '#ffffff');
    for (let i = 0; i < 4; i++) g.rect(18 + i * 8, wallTop + 6, 5, 3, '#3878d8');
    // Símbolo Poké-Dólar dorado en marquesina
    g.px(W / 2, wallTop + 7, '#f8d040'); g.px(W / 2 - 1, wallTop + 7, '#f8d040');
  } else if (kind === 'lab') {
    win(W / 2 - 18, wallTop + 6, 12, 8); win(W / 2 + 6, wallTop + 6, 12, 8);
    g.rect(W / 2 - 3, 2, 6, 6, '#c8c8d8');
    g.line(W / 2, 2, W / 2, -3, '#8a94a8'); g.ell(W / 2, -3, 2, 1.5, '#f8d040');
    // Two roof collectors with inset glass panels and slim metal dividers.
    for (const x of [13, 51]) {
      g.rect(x, 9, 16, 8, '#42566b'); g.rect(x + 1, 10, 14, 5, '#598b9e');
      g.line(x + 2, 10, x + 12, 10, '#b1d6d6');
      for (let j = 4; j < 14; j += 4) g.line(x + j, 10, x + j, 15, '#38576b');
    }
  } else {
    g.rect(W - 16, 2, 6, 12, '#9a6450'); g.rect(W - 17, 1, 8, 2, '#6a4030');
    g.px(W - 13, 0, '#ffffffc0'); g.px(W - 12, -2, '#e8e8f880');
  }
  g.outline('#1a1418');
  return g;
}

/** Muebles de los interiores (huella en casillas definida en worldgen.FOOT). */
function furniture(kind: string, v: number): PixelArt | null {
  const W = '#8a5a34', Wd = '#5e3a1e', Wl = '#b07c4c';
  switch (kind) {
    case 'bed': {
      const g = new PixelArt(16, 34);
      g.rect(1, 4, 14, 29, Wd); g.rect(2, 2, 12, 5, W);
      const sheet = v ? '#5a8ad0' : '#d05a6a';
      g.rect(2, 7, 12, 25, '#f4f0e6'); g.rect(2, 14, 12, 18, sheet); g.rect(2, 14, 12, 2, '#ffffff');
      g.rect(4, 8, 8, 5, '#ffffff'); g.line(4, 12, 11, 12, '#d8d0c0');
      for (let y = 18; y < 31; y += 4) g.line(3, y, 12, y, v ? '#4a78bc' : '#b84858');
      g.shadeAll(0.6); g.outline('#2a1a10');
      return g;
    }
    case 'table': {
      const g = new PixelArt(32, 22);
      g.ell(16, 20, 13, 2, '#00000040');
      g.rect(3, 13, 2, 7, Wd); g.rect(27, 13, 2, 7, Wd);
      g.rect(1, 6, 30, 8, v ? '#d8d8e0' : W); g.rect(1, 6, 30, 2, v ? '#ffffff' : Wl); g.rect(1, 12, 30, 2, v ? '#9898a8' : Wd);
      if (!v) { g.ell(10, 7, 3, 1.5, '#ffffff'); g.ell(10, 6.5, 1.5, 0.8, '#e05040'); g.rect(19, 4, 3, 4, '#f4f0e6'); g.px(20, 3, '#8cd0f8'); }
      else { g.rect(6, 3, 8, 4, '#3a4050'); g.rect(7, 4, 6, 2, '#58e0a0'); g.rect(20, 4, 6, 3, '#f4f4f4'); }
      g.outline('#2a1a10');
      return g;
    }
    case 'shelf': case 'bookcase': {
      const g = new PixelArt(32, 30);
      g.rect(1, 1, 30, 28, Wd); g.rect(2, 2, 28, 26, W);
      const items = kind === 'bookcase'
        ? ['#c04848', '#4878c0', '#58a058', '#d8a830', '#8a58b0', '#d07040']
        : ['#e83030', '#5aa8e8', '#f8d040', '#58c060', '#f4f4f4', '#a060d0'];
      for (let row = 0; row < 3; row++) {
        const y = 3 + row * 9;
        g.rect(2, y + 7, 28, 1, Wd);
        for (let i = 0; i < 7; i++) {
          const col = items[(i + row * 2 + v) % items.length];
          if (kind === 'bookcase') g.rect(3 + i * 4, y + 1 + (i % 3 === 0 ? 1 : 0), 3, 6 - (i % 3 === 0 ? 1 : 0), col);
          else { g.ell(5 + i * 4, y + 4, 1.6, 1.6, col); g.px(5 + i * 4, y + 5, '#ffffff'); }
        }
      }
      g.shadeAll(0.5); g.outline('#2a1a10');
      return g;
    }
    case 'plant': {
      const g = new PixelArt(16, 26);
      g.ell(8, 24, 6, 1.6, '#00000040');
      g.poly([[3, 16], [13, 16], [12, 24], [4, 24]], '#b0603a'); g.rect(3, 15, 10, 2, '#c87848');
      const L = '#3f9a48';
      g.rell(5, 10, 3, 6, -0.5, L); g.rell(11, 10, 3, 6, 0.5, L); g.rell(8, 7, 2.5, 7, 0, L); g.rell(8, 13, 5, 2.5, 0, '#358a3e');
      g.shadeAll(); g.outline('#10200c');
      return g;
    }
    case 'tv': {
      const g = new PixelArt(16, 24);
      g.rect(1, 14, 14, 9, Wd); g.rect(2, 15, 12, 3, W);
      g.rect(1, 3, 14, 11, '#3a3a48'); g.rect(2, 4, 12, 8, '#58b8e8'); g.rect(2, 4, 12, 2, '#a8e0ff'); g.line(4, 9, 7, 6, '#ffffff');
      g.line(5, 0, 7, 3, '#5a5a68'); g.line(11, 0, 9, 3, '#5a5a68');
      g.outline('#14141c');
      return g;
    }
    case 'counter': {
      const g = new PixelArt(48, 24);
      const top = v ? '#5aa8e8' : '#f4f0e6', side = v ? '#3878d8' : '#e05050';
      g.rect(0, 4, 48, 6, top); g.rect(0, 4, 48, 1, '#ffffff'); g.rect(0, 10, 48, 13, side); g.rect(0, 10, 48, 2, shade(side, -0.25));
      if (!v) { g.ell(24, 16, 4, 4, '#ffffff'); g.ellIf(24, 16, 4, 4, '#e83030', (_x, y) => y < 16); g.rect(20, 15.5, 8, 1, K); g.ell(24, 16, 1.4, 1.4, '#ffffff'); g.rect(8, 1, 10, 4, '#d8d8e0'); g.rect(9, 2, 8, 2, '#80f0a0'); }
      else { g.rect(30, 0, 9, 5, '#3a4050'); g.rect(31, 1, 7, 2, '#f8d040'); g.px(24, 16, '#f8d040'); g.px(23, 16, '#f8d040'); }
      g.outline('#1a1418');
      return g;
    }
    case 'pc': {
      const g = new PixelArt(16, 26);
      g.rect(1, 13, 14, 12, '#c8c8d0'); g.rect(2, 14, 12, 3, '#e8e8f0'); g.px(12, 20, '#58e070'); g.px(10, 20, '#f8d040');
      g.rect(2, 2, 12, 11, '#9898a8'); g.rect(3, 3, 10, 8, '#284868');
      g.ell(8, 7, 2.2, 2.2, '#ffffff'); g.ellIf(8, 7, 2.2, 2.2, '#f04848', (_x, y) => y < 7); g.px(8, 7, '#284868');
      g.rect(4, 4, 3, 1, '#80f0ff');
      g.outline('#1a1a24');
      return g;
    }
    case 'sofa': {
      const g = new PixelArt(32, 20);
      const c = v ? '#5a8a6a' : '#b05050';
      g.rect(1, 3, 30, 10, c); g.rect(0, 7, 4, 12, shade(c, -0.15)); g.rect(28, 7, 4, 12, shade(c, -0.15)); g.rect(3, 11, 26, 7, shade(c, 0.12));
      g.line(16, 12, 16, 17, shade(c, -0.2)); g.rect(1, 3, 30, 1, shade(c, 0.2));
      g.shadeAll(0.5); g.outline('#20100e');
      return g;
    }
    case 'rug': {
      const g = new PixelArt(48, 32);
      if (v === 2) { g.rect(10, 18, 28, 12, '#7a4a32'); g.rect(12, 20, 24, 8, '#a8603e'); return g; }
      const a = v ? '#c04848' : '#3a6a9a', b = v ? '#f0d070' : '#e8d8b0';
      g.rect(2, 2, 44, 28, a); g.rect(5, 5, 38, 22, b); g.rect(8, 8, 32, 16, a);
      for (let i = 0; i < 6; i++) g.rect(12 + i * 5, 14, 2, 4, b);
      for (let x = 2; x < 46; x += 3) { g.px(x, 1, b); g.px(x, 30, b); }
      return g;
    }
    case 'machine': {
      const g = new PixelArt(32, 34);
      g.rect(1, 6, 30, 27, '#9aa0b0'); g.rect(2, 7, 28, 3, '#c8ccd8'); g.rect(4, 12, 12, 9, '#284868'); g.line(5, 18, 8, 14, '#80f0a0'); g.line(8, 14, 11, 19, '#80f0a0'); g.line(11, 19, 14, 15, '#80f0a0');
      for (let i = 0; i < 3; i++) g.ell(22 + (i % 2) * 4, 14 + i * 5, 1.6, 1.6, ['#f04848', '#f8d040', '#58e070'][(i + v) % 3]);
      g.rect(4, 24, 24, 6, '#70788a'); g.rect(6, 25, 20, 1, '#a8b0c0');
      g.rect(12, 0, 3, 6, '#70788a'); g.ell(13.5, 1, 3, 1.5, '#c8ccd8');
      g.shadeAll(0.5); g.outline('#1a1c24');
      return g;
    }
    case 'stove': {
      const g = new PixelArt(16, 24);
      g.rect(1, 6, 14, 17, '#e8e8ee'); g.rect(1, 6, 14, 3, '#c8c8d0'); g.ell(5, 7.5, 2, 1, '#3a3a48'); g.ell(11, 7.5, 2, 1, '#3a3a48');
      g.rect(3, 12, 10, 8, '#3a3a48'); g.rect(4, 13, 8, 2, '#f8a040'); g.rect(9, 1, 5, 5, '#5a5a68'); g.px(10, 0, '#ffffff80');
      g.outline('#1a1a24');
      return g;
    }
    case 'window': {
      const g = new PixelArt(32, 16);
      g.rect(3, 2, 26, 12, '#e8dcc0'); g.rect(5, 3, 22, 9, '#8cd0f8'); g.rect(5, 3, 22, 3, '#d8f4ff'); g.line(16, 3, 16, 11, '#e8dcc0'); g.line(7, 10, 10, 5, '#ffffff');
      g.rect(2, 1, 28, 1, '#c04848'); g.rect(2, 1, 4, 13, '#c04848'); g.rect(26, 1, 4, 13, '#c04848');
      return g;
    }
    case 'flowerbed': {
      const g = new PixelArt(16, 16);
      g.rect(1, 9, 14, 6, '#8a5a3a'); g.rect(1, 9, 14, 1, '#b07c4c');
      const cols = [['#f04850', '#ffd840'], ['#4890f8', '#fff060'], ['#f8d030', '#d06020']][v % 3];
      for (let i = 0; i < 4; i++) { g.line(3 + i * 3, 9, 3 + i * 3, 6, '#3f8a30'); g.ell(3 + i * 3, 5, 1.6, 1.6, cols[0]); g.px(3 + i * 3, 5, cols[1]); }
      g.outline('#20140c');
      return g;
    }
  }
  return null;
}

export function objectArt(kind: string, v: number): PixelArt {
  const f = furniture(kind, v);
  if (f) return f;
  switch (kind) {
    case 'tree': case 'rock': case 'boulder': case 'bush': return natureArt(kind, v);
    case 'grave': {
      const g = new PixelArt(16, 20);
      const c = '#8a8a98';
      g.ell(8, 18, 6, 1.5, SH);
      if (v === 1) { g.rect(7, 4, 3, 14, c); g.rect(3, 7, 11, 3, c); }
      else if (v === 2) { g.poly([[3, 18], [3, 9], [6, 6], [9, 8], [13, 5], [13, 18]], c); }
      else { g.rect(3, 8, 10, 10, c); g.ell(8, 8, 5, 4, c); }
      g.rect(2, 17, 12, 2, '#6a6a78');
      g.shadeAll();
      if (v === 0) { g.line(6, 10, 10, 10, '#5a5a68'); g.line(6, 12, 10, 12, '#5a5a68'); }
      g.outline(); return g;
    }
    case 'pylon': {
      const g = new PixelArt(16, 36);
      const c = '#8a90a0';
      g.ell(8, 34, 6, 1.6, SH);
      g.line(4, 34, 7, 4, c); g.line(12, 34, 9, 4, c); g.line(5, 26, 11, 20, c); g.line(11, 26, 5, 20, c); g.line(6, 14, 10, 10, c);
      g.rect(1, 6, 14, 2, c); g.rect(2, 12, 12, 1, c);
      g.px(1, 8, '#f8d040'); g.px(14, 8, '#f8d040'); g.rect(6, 18, 4, 3, '#f8d040'); g.px(7, 19, K);
      g.outline(); return g;
    }
    case 'stalag': {
      const g = new PixelArt(16, 22);
      g.ell(8, 20, 6, 1.6, SH);
      g.poly([[8, 1], [2.5, 20], [13.5, 20]], '#7a6458'); g.poly([[11, 9], [9, 20], [15, 20]], '#6a5448');
      g.shadeAll(); g.outline(); return g;
    }
    case 'crystal': {
      const g = new PixelArt(16, 24);
      g.ell(8, 22, 6.5, 1.8, '#4060c060');
      g.poly([[7, 2], [4, 10], [5, 22], [10, 22], [10, 9]], '#78b8f8');
      g.poly([[12, 8], [10, 13], [10, 22], [14, 22], [15, 13]], '#a8d0ff');
      g.poly([[4, 12], [1, 16], [2, 22], [6, 22]], '#5890e0');
      g.shadeAll();
      g.line(6, 5, 6, 18, '#e8f8ff'); g.px(7, 4, '#ffffff'); g.px(12, 11, '#f8b8ff'); g.px(3, 15, '#98f8ff');
      g.outline('#101838'); return g;
    }
    case 'center': return building('center', v);
    case 'mart': return building('mart', v);
    case 'house': return building('house', v);
    case 'lab': return building('lab', v);
    case 'fountain': {
      const g = new PixelArt(48, 40);
      g.ell(24, 30, 23, 9, '#a8a8b8'); g.ell(24, 29, 19, 7, '#5aa8e8');
      g.ell(24, 29, 14, 4.5, '#78c8f8'); g.ell(24, 29, 12, 3.5, '#5aa8e8');
      g.rect(21, 10, 6, 18, '#b8b8c8'); g.ell(24, 10, 7, 3, '#b8b8c8'); g.ell(24, 9, 5, 2, '#78c8f8');
      g.ell(24, 6, 2.2, 2.5, '#d0d8e8');
      g.shadeAll();
      g.line(24, 1, 24, 8, '#e0f8ff'); g.line(21, 4, 17, 13, '#a8e0ff'); g.line(27, 4, 31, 13, '#a8e0ff');
      g.px(14, 28, '#ffffff'); g.px(32, 31, '#ffffff'); g.px(20, 33, '#d8f4ff'); g.px(28, 27, '#d8f4ff');
      g.outline(); return g;
    }
    case 'lamp': {
      const g = new PixelArt(16, 34);
      g.ell(8, 32, 4, 1.4, SH);
      g.rect(7, 8, 2, 24, '#383848'); g.rect(5, 30, 6, 2, '#383848');
      g.poly([[8, 0], [3, 3], [13, 3]], '#48485a');
      g.rect(4, 3, 8, 6, '#383848'); g.rect(5, 4, 6, 4, '#ffe888');
      g.shadeAll(); g.px(6, 5, '#ffffff'); g.px(8, 5, '#fff8c0');
      g.outline(); return g;
    }
    case 'sign': {
      const g = new PixelArt(16, 18);
      g.ell(8, 16.5, 4, 1.2, SH);
      g.rect(7, 10, 2, 7, '#7a4a28'); g.rect(1, 2, 14, 9, '#b8844a'); g.rect(1, 2, 14, 2, '#4888d8');
      g.shadeAll(); g.line(3, 6, 12, 6, '#f4ebd0'); g.line(3, 8, 10, 8, '#6a4020');
      g.px(2, 3, '#ffffff'); g.px(13, 3, '#d0d8e0');
      g.outline(); return g;
    }
    case 'statue': {
      const g = new PixelArt(16, 32);
      g.ell(8, 30, 7, 1.6, SH);
      g.rect(2, 22, 12, 8, '#9898a8'); g.rect(1, 20, 14, 3, '#a8a8b8');
      g.ell(8, 14, 5, 6, '#b0b0c0'); g.ell(8, 7, 4, 3.5, '#b0b0c0'); g.poly([[5, 5], [4, 0], [7, 4]], '#b0b0c0'); g.poly([[11, 5], [12, 0], [9, 4]], '#b0b0c0');
      g.shadeAll();
      g.px(6, 7, '#58d0ff'); g.px(10, 7, '#58d0ff');
      g.px(8, 13, '#f8d040'); g.rect(5, 25, 6, 2, '#d8c070');
      g.outline(); return g;
    }
    case 'tower': {
      const g = new PixelArt(48, 100);
      const c = '#5a4a6a';
      g.rect(6, 30, 36, 68, c);
      g.poly([[2, 32], [24, 2], [46, 32]], '#3a2a4a');
      g.rect(4, 30, 40, 3, '#2a1e36');
      g.rect(4, 60, 40, 2, '#3a2e4a');
      g.shadeAll(0.7);
      for (let y = 36; y < 92; y += 4) g.line(7, y, 41, y, '#4e3e5e');
      for (const [x, y] of [[12, 40], [30, 40], [12, 66], [30, 66]]) { g.rect(x, y, 6, 9, '#f8d878'); g.rect(x, y, 6, 2, '#fff0b0'); g.line(x + 3, y, x + 3, y + 8, '#5a4a6a'); }
      g.rect(18, 80, 12, 18, '#1a1020'); g.ell(24, 80, 6, 3, '#1a1020');
      g.ell(24, 18, 3, 3, '#f8d878');
      g.outline('#0c0812'); return g;
    }
    case 'cave': {
      const g = new PixelArt(32, 30);
      const c = v === 1 ? '#5a6aa0' : '#6e5a42';
      g.ell(16, 18, 15, 13, c);
      g.ellIf(16, 20, 9, 12, '#0c0808', (_x, y) => y < 30);
      g.shadeAll();
      g.ellIf(16, 20, 9, 12, '#0c0808', (_x, y) => y < 30);
      g.ellIf(16, 22, 6, 9, '#000000', (_x, y) => y < 30);
      for (const sx of [12, 16, 20]) g.line(sx, 9, sx, 12 + (sx === 16 ? 1 : 0), c);
      g.px(14, 20, v === 1 ? '#80e8ff' : '#ffd850'); g.px(18, 20, v === 1 ? '#80e8ff' : '#ffd850');
      if (v === 1) { g.px(6, 10, '#c8e0ff'); g.px(25, 12, '#c8e0ff'); g.px(9, 6, '#a8d0ff'); }
      return g;
    }
    case 'chest': {
      const open = v >= 10; const tier = v % 10;
      const g = new PixelArt(16, 16);
      const wood = ['#a8682c', '#7a8a98', '#d8a830', '#7ac8e8'][tier], trim = ['#f8d040', '#e0e8f0', '#fff0a0', '#ffffff'][tier];
      g.ell(8, 14.5, 7, 1.5, SH);
      g.rect(2, 7, 12, 7, wood);
      if (open) {
        g.rect(2, 2, 12, 4, shade(wood, -0.2));
        g.rect(3, 6, 10, 2, '#fff8c0');
        g.px(4, 6, '#ffd700'); g.px(6, 6, '#ff4050'); g.px(8, 7, '#ffd700'); g.px(10, 6, '#40a0ff'); g.px(12, 6, '#40e060');
      } else {
        g.rect(2, 4, 12, 4, wood);
        g.ell(8, 4.5, 6, 2, wood);
        g.line(4, 6, 12, 6, shade(wood, 0.15));
      }
      g.shadeAll();
      g.rect(2, 8, 12, 1, trim); g.rect(7, 7, 2, 3, trim); if (!open) g.px(7, 9, K);
      g.rect(2, 7, 1, 7, trim); g.rect(13, 7, 1, 7, trim);
      g.outline(); return g;
    }
    case 'itemball': {
      const g = new PixelArt(12, 12);
      g.ell(6, 10.5, 4.5, 1.2, SH);
      g.ellIf(6, 6, 4.5, 4.5, '#e83030', (_x, y) => y < 6);
      g.ellIf(6, 6, 4.5, 4.5, '#f8f8f8', (_x, y) => y >= 6);
      g.shadeAll();
      g.rect(1, 5, 10, 1, K);
      g.ell(6, 5.5, 1.6, 1.6, '#ffffff');
      g.px(6, 5.5, '#d0d0d8');
      g.px(4, 3, '#ffa0a0');
      g.px(3, 4, '#ffc0c0');
      g.outline(); return g;
    }
  }
  const g = new PixelArt(16, 16); g.rect(2, 2, 12, 12, '#ff00ff'); return g;
}
