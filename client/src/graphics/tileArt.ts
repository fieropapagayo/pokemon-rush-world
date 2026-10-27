// Texturas de terreno 16x16 generadas por código + máscaras de transición orgánicas.
import { T, TERRAIN_COUNT } from '../../../shared/constants';
import { phash, rgba, shade, mix } from './pixel';

export const TS = 16;
export const VARIANTS = 8;

type PixFn = (x: number, y: number, v: number) => string | null;

function hexN(c: string) { return rgba(c); }

function makeTex(fn: PixFn, v: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = TS; c.height = TS;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(TS, TS);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    const col = fn(x, y, v);
    if (!col) continue;
    const n = hexN(col), i = (y * TS + x) * 4;
    img.data[i] = (n >>> 24) & 255; img.data[i + 1] = (n >>> 16) & 255; img.data[i + 2] = (n >>> 8) & 255; img.data[i + 3] = n & 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const r = (x: number, y: number, v: number, s: number) => phash(x + v * 31, y + v * 17, s);

function grassFn(base: string, dark: string, light: string, s: number): PixFn {
  return (x, y, v) => {
    const h = r(x, y, v, s);
    // Sparse, irregular tufts instead of a repeating four-tile lattice.
    const cx = (x + v * 5) % 16, cy = (y + v * 3) % 16;
    if ((cx === 3 || cx === 5) && cy === 7 || cx === 4 && cy === 8) return dark;
    if (cx === 3 && cy === 6) return light;
    if (h < 0.035) return dark;
    if (h > 0.98) return light;
    // briznas sueltas: tallo oscuro con la punta iluminada
    const b = r(x, y + 1, v, s + 41);
    if (b < 0.03) return light;
    if (r(x, y - 1, v, s + 41) < 0.03) return shade(base, -0.12);
    const patch = r(x >> 2, y >> 2, v, s + 27);
    if (patch < 0.3) return shade(base, -0.03);
    if (patch > 0.85) return shade(base, 0.025);
    return base;
  };
}

const FN: (PixFn | null)[] = new Array(TERRAIN_COUNT).fill(null);
FN[T.VOID] = () => '#0a0810';
FN[T.GRASS] = grassFn('#79b567', '#639854', '#a6cf7d', 1);
FN[T.FLOWERS] = (x, y, v) => {
  const fx = (x + v * 7) % 8, fy = (y + v * 5) % 8;
  const flowerTypes = [
    { petal: '#f04850', center: '#ffd840', light: '#ff8890' }, // Amapola
    { petal: '#4890f8', center: '#fff060', light: '#88beff' }, // Aciano azul
    { petal: '#f8d030', center: '#d06020', light: '#fff080' }, // Caléndula
    { petal: '#d060c8', center: '#ffea60', light: '#f49ce8' }, // Trébol lavanda
  ];
  const fl = flowerTypes[(v + Math.floor((x + 3) / 8) * 2 + Math.floor((y + 1) / 8)) % 4];
  if ((fx === 4 && (fy === 2 || fy === 4)) || (fy === 3 && (fx === 3 || fx === 5))) return fl.petal;
  if (fx === 3 && fy === 2) return fl.light;
  if (fx === 4 && fy === 3) return fl.center;
  if (fx === 4 && fy === 5) return '#347a28';
  return grassFn('#79b567', '#639854', '#a6cf7d', 2)(x, y, v);
};
// Irregular, overlapping tufts. Coordinates wrap so each tile remains seamless.
const grassTufts = Array.from({ length: VARIANTS }, (_, v) => Array.from({ length: 9 }, (_, i) => ({
  x: Math.floor(phash(i, v, 121) * 16), y: Math.floor(phash(i, v, 122) * 16),
  h: 4 + Math.floor(phash(i, v, 123) * 4), lean: phash(i, v, 124) > 0.5 ? 1 : -1,
})).sort((a, b) => a.y - b.y));
FN[T.TALL] = (x, y, v) => {
  let col = r(x >> 2, y >> 2, v, 3) < 0.3 ? '#477f3c' : '#4f8d40';
  for (const tuft of grassTufts[v]) {
    const dy = (tuft.y - y + 16) % 16;
    if (dy >= tuft.h) continue;
    for (const side of [-1, 0, 1]) {
      const blade = (tuft.x + side * (1 + Math.floor(dy * 0.4)) + Math.floor(dy / 4) * tuft.lean + 32) % 16;
      if (x === blade) col = dy === tuft.h - 1 ? '#a6ce78' : side < 0 ? '#83b65e' : side > 0 ? '#629d46' : '#74ab51';
      else if (dy < 3 && x === (blade + 1) % 16) col = '#3c7435';
    }
  }
  return col;
};
// Tierra apisonada: rodadas suaves, guijarros con luz y sombra, grietas y manchas de humedad.
FN[T.PATH] = (x, y, v) => {
  const h = r(x, y, v, 4);
  const rut = Math.abs(((y + v) % 16) - 7.5) < 1 && r(x >> 2, y, v, 25) < 0.6;
  const pebble = r(x >> 1, y >> 1, v, 26);
  if (pebble > 0.955) return ((x + y) & 1) ? '#f0e0b4' : '#a88a5a';
  if (pebble > 0.94) return '#8a6c44';
  if (h < 0.035) return '#8c6e44';
  if (h > 0.965) return '#efdcae';
  if (rut) return '#bf9c60';
  const damp = r(x >> 3, y >> 3, v, 27) < 0.25;
  return damp ? (h < 0.5 ? '#c6a468' : '#bf9d62') : (h < 0.35 ? '#d4b478' : '#cba96a');
};
FN[T.SAND] = (x, y, v) => {
  const h = r(x, y, v, 5);
  const sx = (x + v * 5) % 16, sy = (y + v * 7) % 16;
  if (v % 2 === 0 && sx === 6 && sy === 5) return '#fff6ee';
  if (v % 2 === 0 && sx === 7 && sy === 5) return '#f4a4b8';
  const wave = Math.sin((x + v * 4) * 0.45) * 1.2 + (y % 7);
  if (wave > 6.2) return '#ded0a0';
  if (wave < 0.6) return '#f8eed2';
  if (h < 0.04) return '#c8b47e';
  if (h > 0.97) return '#ffffff';
  if (h > 0.93) return '#f4bfa8';
  return '#ebd8a8';
};
FN[T.WATER] = null; // el agua es un fondo animado (hueco transparente)
FN[T.FOREST] = (x, y, v) => {
  const h = r(x, y, v, 6);
  if (h < 0.06) return '#3c7045';
  if (h > 0.96) return '#6b9c59';
  const cx = (x + v * 3) % 8, cy = (y + v * 5) % 8;
  if (cx === 5 && cy === 2) return '#5aa64c';
  return '#528650';
};
FN[T.ROCK] = (x, y, v) => {
  const h = r(x, y, v, 7);
  if (h < 0.08) return '#86705a';
  if (h > 0.93) return '#bca486';
  if ((x + y * 3 + v) % 11 === 0) return '#927a5e';
  return '#a68e6c';
};
FN[T.CLIFF] = (x, y, v) => {
  const h = r(x, y, v, 8);
  if (h < 0.1) return '#7a6448';
  if (h > 0.9) return '#a48c6a';
  return '#8e7656';
};
FN[T.SNOW] = (x, y, v) => {
  const h = r(x, y, v, 9);
  const drift = (y + Math.floor(Math.sin((x + v * 3) / 4) * 1.5)) % 8;
  if (drift === 0) return '#dce6f4';
  if (h > 0.96) return '#ffffff';
  if (h < 0.05) return '#ccd8ea';
  return '#f0f5fc';
};
FN[T.LAVA] = (x, y, v) => {
  const n = Math.sin((x + v * 3) * 0.65) + Math.cos((y + v * 2) * 0.75) + r(x, y, v, 10) * 0.7;
  const crack = Math.abs(Math.sin((x + y * 2 + v * 4) * 0.5));
  if (crack < 0.22 && n > 0.2) return '#fff5a0';
  if (crack < 0.42 && n > 0.0) return '#ff8824';
  if (n > 1.3) return '#ffd850';
  if (n > 0.4) return '#ff5018';
  if (n < -0.85) return '#240e10';
  return '#3e1618';
};
FN[T.ASH] = (x, y, v) => {
  const h = r(x, y, v, 11);
  if (h > 0.985) return '#ff6820';
  if (h > 0.97) return '#ffa040';
  if (h < 0.06) return '#3a3032';
  if (h > 0.91) return '#8a7a76';
  return '#6b5a5a';
};
FN[T.MUD] = (x, y, v) => {
  const h = r(x, y, v, 12);
  if (h < 0.1) return '#58552e';
  if (h > 0.93) return '#848250';
  return '#6d6a3e';
};
FN[T.SWAMP] = (x, y, v) => {
  const h = r(x, y, v, 13);
  const lx = (x + v * 5) % 16, ly = (y + v * 3) % 16;
  const dist = Math.hypot(lx - 8, ly - 8);
  if (v % 2 === 0 && dist < 2.6 && !(lx > 8 && ly === 8)) {
    if (lx === 8 && ly === 7 && v % 4 === 0) return '#f898c0e8';
    return dist < 1.5 ? '#58ac4ce0' : '#3e8836e0';
  }
  if (h > 0.96) return '#7aa05ac0';
  return h < 0.1 ? '#2a4a30b8' : '#3a5e40a8';
};
FN[T.CAVE] = (x, y, v) => {
  const h = r(x, y, v, 14);
  if (h > 0.992) return (x + v) % 2 ? '#88c8ff' : '#c898ff';
  if (h < 0.08) return '#4a3c38';
  if (h > 0.94) return '#6e605a';
  return '#5b4d48';
};
FN[T.CAVEWALL] = (x, y, v) => {
  const h = r(x, y, v, 15);
  if (h < 0.12) return '#1c1614';
  if (h > 0.9) return '#3a302c';
  return '#2a221f';
};
// Empedrado cálido: adoquines de anchos distintos en cada hilera, juntas con musgo y cantos redondeados.
const COBBLE = ['#d8cdb6', '#cfc2a8', '#c6b9a0', '#ddd3c1', '#c2b6a2', '#d4c3a2', '#cabca6'];
FN[T.TOWN] = (x, y, v) => {
  const row = y >> 2, by = y & 3;
  const off = Math.floor(phash(row, v, 160) * 16), sx = (x + off) % 16;
  const cuts = phash(row, v, 163) < 0.5 ? [0, 5, 11, 16] : [0, 6, 10, 16];
  let s = 0; while (sx >= cuts[s + 1]) s++;
  const bx = sx - cuts[s], bw = cuts[s + 1] - cuts[s];
  if (by === 3 || bx === bw - 1) return phash(x, y, v * 7 + 161) < 0.13 ? '#7c9452' : (phash(x, y, 164) < 0.5 ? '#8a806c' : '#827865');
  const base = COBBLE[Math.floor(phash(row * 3 + s, v, 162) * COBBLE.length)];
  if ((bx === 0 && by === 0) || (bx === bw - 2 && by === 2)) return shade(base, -0.12);
  let k = 0;
  if (by === 0) k += 0.11; else if (by === 2) k -= 0.08;
  if (bx === 0) k += 0.05; else if (bx === bw - 2) k -= 0.06;
  if (phash(x, y, v + 165) < 0.07) k -= 0.07;
  return k ? shade(base, k) : base;
};
FN[T.HAUNT] = (x, y, v) => {
  const h = r(x, y, v, 17);
  if (h < 0.1) return '#5e5070';
  if (h > 0.93) return '#948aa2';
  const cx = (x + v * 5) % 8, cy = (y + v * 3) % 8;
  if ((cx === 2 && cy === 5) || (cx === 4 && cy === 5)) return '#5e5070';
  return '#7a6a86';
};
FN[T.BRIDGE] = (x, y) => {
  if (y % 4 === 3) return '#4e2e14';
  if (x === 0 || x === 15) return '#5a3818';
  if ((x === 2 || x === 13) && y % 4 === 1) return '#c8ba90';
  if ((x === 2 || x === 13) && y % 4 === 2) return '#382010';
  const grain = (x + (y % 4) * 3) % 7;
  if (grain === 0) return '#7a4e26';
  const h = phash(x, y, 18);
  return h < 0.1 ? '#82542a' : (y % 4 === 0 ? '#b27e46' : '#9c6c38');
};
FN[T.DRYGRASS] = grassFn('#b9b55a', '#9e9a46', '#d4d07a', 19);
FN[T.CRYSTAL] = (x, y, v) => {
  const facet = (x * 3 + y * 2 + v * 4) % 7;
  const h = r(x, y, v, 20);
  if (h > 0.97) return '#ffffff';
  if (h > 0.92) return '#d8ecff';
  if (facet === 0) return '#4e5a90';
  if (facet === 3) return '#8496d8';
  return h < 0.12 ? '#58669e' : '#6b7cb8';
};
FN[T.TOWERFLOOR] = (x, y, v) => {
  if (y % 5 === 4 || x % 8 === 7) return '#3e2e4e';
  if (v % 3 === 0 && x === 3 && y === 2) return '#9c82c8';
  const h = phash(Math.floor(x / 6), Math.floor(y / 5), 21);
  return h < 0.5 ? '#5e4a6e' : '#665276';
};
FN[T.TOWERWALL] = (x, y) => {
  const row = Math.floor(y / 4), off = row % 2 ? 3 : 0;
  if (y % 4 === 3 || (x + off) % 6 === 5) return '#1c1424';
  return '#2b1f36';
};

// Meseta de colina: hierba algo más clara (está más cerca del sol) con matas propias.
FN[T.HILL] = (x, y, v) => {
  const h = r(x, y, v, 22);
  const cx = (x + v * 3) % 8, cy = (y + v * 5) % 8;
  if ((cx === 2 || cx === 4) && cy === 5 || cx === 3 && cy === 6) return '#5f9a4c';
  if (cx === 3 && cy === 4) return '#b9dc8c';
  if (h < 0.05) return '#6aa656';
  if (h > 0.965) return '#c4e29a';
  return r(x >> 2, y >> 2, v, 23) < 0.4 ? '#8cc66e' : '#93cc74';
};
FN[T.WOODFLOOR] = (x, y, v) => {
  const plank = Math.floor(y / 4), off = (plank * 5 + v * 3) % 16;
  if (y % 4 === 3) return '#7a5232';
  if ((x + off) % 16 === 0) return '#86603c';
  const h = phash(x + plank * 16, y, 24 + v);
  if (h < 0.06) return '#9a6c40';
  return (plank + v) % 2 ? '#c49262' : '#bb8a5a';
};
FN[T.TILEFLOOR] = (x, y, v) => {
  if (x % 8 === 7 || y % 8 === 7) return '#bdb8ac';
  const chk = ((x >> 3) + (y >> 3) + v) % 2;
  if (x % 8 === 0 || y % 8 === 0) return chk ? '#fbf8f0' : '#e9e4d8';
  return chk ? '#f1ede3' : '#dfd9cc';
};
FN[T.INWALL] = (x, y) => {
  if (y < 2) return y === 0 ? '#4a3a30' : '#5e4a3c';
  return (x + y) % 2 ? '#6a5646' : '#705c4a';
};

// Prioridad de solapamiento (mayor = se derrama sobre vecinos de menor prioridad)
export const PRIO: number[] = (() => {
  const p = new Array(TERRAIN_COUNT).fill(-1);
  p[T.WATER] = 0; p[T.SWAMP] = 1; p[T.LAVA] = 2; p[T.SAND] = 3; p[T.MUD] = 4; p[T.PATH] = 5; p[T.ASH] = 6;
  p[T.ROCK] = 7; p[T.DRYGRASS] = 8; p[T.HAUNT] = 8; p[T.GRASS] = 9; p[T.FLOWERS] = 9; p[T.TALL] = 10; p[T.FOREST] = 11; p[T.SNOW] = 12;
  p[T.CAVE] = 3; p[T.CRYSTAL] = 3;
  return p;
})();
/** Terreno "equivalente" a efectos de transición. */
export function blendKey(t: number) { return t === T.FLOWERS ? T.GRASS : t; }

export interface TileSet {
  tex: HTMLCanvasElement[][];             // [terreno][variante]
  edge: (HTMLCanvasElement | null)[][];   // [terreno][dir 0..7] textura enmascarada
  foam: HTMLCanvasElement[];              // [dir]
  face: HTMLCanvasElement[];              // cara de acantilado por tipo de pared
  shadow: HTMLCanvasElement;
  water: HTMLCanvasElement[];             // fotogramas 64x64
  lava: HTMLCanvasElement[];
}

// Direcciones: 0 N, 1 E, 2 S, 3 W, 4 NE, 5 SE, 6 SW, 7 NW (desde el tile actual hacia el vecino)
export const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];

function maskFn(d: number, x: number, y: number, extra = 0): boolean {
  const j = phash(d === 0 || d === 2 ? x : y, d, 77) < 0.5 ? 1 : 0;
  const k = phash(d === 0 || d === 2 ? x >> 1 : y >> 1, d, 78) < 0.5 ? 1 : 0;
  const depth = 2 + j + k + extra;
  switch (d) {
    case 0: return y < depth;
    case 1: return 15 - x < depth;
    case 2: return 15 - y < depth;
    case 3: return x < depth;
    case 4: return (15 - x) + y < depth + 2;
    case 5: return (15 - x) + (15 - y) < depth + 2;
    case 6: return x + (15 - y) < depth + 2;
    case 7: return x + y < depth + 2;
  }
  return false;
}

function masked(src: HTMLCanvasElement, d: number, extra = 0): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = TS; c.height = TS;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, TS, TS);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (!maskFn(d, x, y, extra)) img.data[(y * TS + x) * 4 + 3] = 0;
  ctx.putImageData(img, 0, 0);
  return c;
}

function waterFrame(f: number, size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const base = rgba('#2c86a2'), deep = rgba('#1c566e'), mid = rgba('#3da8bf'), caust = rgba('#84e6df'), glint = rgba('#ffffff');
  const t = f / 4 * Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = x / size, ny = y / size;
    const w1 = Math.sin(nx * Math.PI * 4 + t) + Math.cos(ny * Math.PI * 4 - t * 0.8);
    const w2 = Math.sin((nx + ny) * Math.PI * 6 - t * 1.2) * 0.6;
    const wave = w1 + w2;
    let n = base;
    if (wave < -1.1) n = deep;
    else if (wave > 1.35) n = caust;
    else if (wave > 0.4) n = mid;
    const spark = Math.sin(nx * Math.PI * 10 + t * 2) * Math.cos(ny * Math.PI * 10 - t);
    if (spark > 0.92 && wave > 0.75) n = glint;
    const i = (y * size + x) * 4;
    img.data[i] = (n >>> 24) & 255; img.data[i + 1] = (n >>> 16) & 255; img.data[i + 2] = (n >>> 8) & 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function lavaFrame(f: number, size = 32): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const crust = rgba('#2c1012'), darkBasalt = rgba('#4a1618'), magma = rgba('#e84218'), hotMagma = rgba('#ff7c20'), core = rgba('#ffd848'), flare = rgba('#fff598');
  const t = f / 4 * Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = x / size, ny = y / size;
    const m1 = Math.sin(nx * Math.PI * 3 + t * 0.7) * Math.cos(ny * Math.PI * 3 - t * 0.5);
    const m2 = Math.sin((nx - ny) * Math.PI * 5 + t);
    const h = m1 * 1.2 + m2 * 0.7;
    let n = magma;
    if (h < -0.9) n = crust;
    else if (h < -0.3) n = darkBasalt;
    else if (h > 1.1) n = core;
    else if (h > 0.5) n = hotMagma;
    if (Math.sin((nx + t * 0.3) * Math.PI * 7) + Math.cos((ny - t * 0.2) * Math.PI * 7) > 1.7) n = flare;
    const i = (y * size + x) * 4;
    img.data[i] = (n >>> 24) & 255; img.data[i + 1] = (n >>> 16) & 255; img.data[i + 2] = (n >>> 8) & 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function buildTileSet(): TileSet {
  const tex: HTMLCanvasElement[][] = [];
  for (let t = 0; t < TERRAIN_COUNT; t++) {
    const fn = FN[t];
    tex.push(Array.from({ length: VARIANTS }, (_, v) => fn ? makeTex(fn, v) : makeTex(() => null, v)));
  }
  const edge: (HTMLCanvasElement | null)[][] = [];
  for (let t = 0; t < TERRAIN_COUNT; t++) edge.push(DIRS.map((_, d) => (PRIO[t] > 0 ? masked(tex[t][0], d) : null)));
  // espuma de orilla: franja blanca semitransparente
  const foamSrc = makeTex((x, y) => {
    const d = (x * 3 + y * 5) % 4;
    return d === 0 ? '#ffffffea' : d === 1 ? '#d6f0fce0' : '#b2e2f8b0';
  }, 0);
  const foam = DIRS.map((_, d) => {
    const outer = masked(foamSrc, d, 2);
    const ctx = outer.getContext('2d')!;
    const img = ctx.getImageData(0, 0, TS, TS);
    for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) if (maskFn(d, x, y, 0)) img.data[(y * TS + x) * 4 + 3] = 0;
    ctx.putImageData(img, 0, 0);
    return outer;
  });
  const faceOf = (top: string, mid: string, dark: string, accent?: string) => makeTex((x, y) => {
    if (y < 2) return y === 0 ? shade(top, 0.2) : top;
    const strata = y === 5 || y === 10 || y === 14;
    if (strata) return dark;
    const stri = (x + Math.floor(phash(x, y >> 2, 90) * 3)) % 5 === 0;
    if (accent && phash(x, y, 92) < 0.08) return accent;
    return stri ? dark : (phash(x, y, 91) < 0.18 ? shade(mid, -0.16) : mid);
  }, 0);
  const face: HTMLCanvasElement[] = [];
  face[T.CLIFF] = faceOf('#a48c68', '#725e46', '#483828', '#6a844a');
  face[T.CAVEWALL] = faceOf('#423834', '#2e2622', '#14100e', '#5e6884');
  face[T.TOWERWALL] = faceOf('#48365a', '#30243c', '#181022', '#7a5a9c');
  // Ladera de colina: borde de hierba colgante, tierra con estratos y raíces.
  face[T.HILL] = makeTex((x, y) => {
    const lip = 2 + (phash(x, 0, 93) < 0.4 ? 1 : 0);
    if (y < lip) return y === 0 ? '#a8d686' : '#6aa452';
    if (y === lip) return phash(x, 1, 94) < 0.5 ? '#3f7a34' : '#5a4630';
    const strata = y === 8 || y === 13;
    if (strata) return '#5e4430';
    if (phash(x, y, 95) < 0.06) return '#a08a6a';
    if (phash(x, y >> 1, 96) < 0.12) return '#6c5238';
    return y > 12 ? '#6e543a' : '#80623f';
  }, 0);
  // Pared de interior: zócalo de madera y papel pintado con rayas.
  face[T.INWALL] = makeTex((x, y) => {
    if (y >= 12) return y === 12 ? '#5a3a22' : (y === 15 ? '#3e2816' : '#7a5232');
    if (y === 11) return '#d8c090';
    const stripe = (x % 4) < 2;
    return y < 1 ? '#c9b290' : stripe ? '#e8dcc0' : '#dccfae';
  }, 0);
  const shadow = makeTex((_x, y) => (y < 4 ? (y < 2 ? '#00000050' : '#00000028') : null), 0);
  const water = [0, 1, 2, 3].map(f => waterFrame(f, 64));
  const lava = [0, 1, 2, 3].map(f => lavaFrame(f, 32));
  return { tex, edge, foam, face, shadow, water, lava };
}

export function isWall(t: number) { return t === T.CLIFF || t === T.CAVEWALL || t === T.TOWERWALL || t === T.HILL || t === T.INWALL; }
export { mix };
