// Mini-motor de pixel art: rasteriza formas sin antialiasing, sombrea y contornea.

export type Col = string; // '#rrggbb' o '#rrggbbaa'

const cache = new Map<string, number>();
export function rgba(c: Col): number {
  let v = cache.get(c);
  if (v !== undefined) return v;
  const h = c.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  v = ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
  cache.set(c, v);
  return v;
}
export function toHex(v: number): Col {
  return '#' + [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].map(x => x.toString(16).padStart(2, '0')).join('');
}
function comp(v: number) { return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; }
function pack(r: number, g: number, b: number, a: number) { return ((Math.max(0, Math.min(255, r)) << 24) | (Math.max(0, Math.min(255, g)) << 16) | (Math.max(0, Math.min(255, b)) << 8) | a) >>> 0; }

/** Oscurece con desplazamiento de tono hacia el morado (más bonito que oscurecer a gris). */
export function shadeV(v: number, k: number): number {
  const [r, g, b, a] = comp(v);
  if (k >= 0) return pack(r + (255 - r) * k * 0.9 + 6 * k, g + (255 - g) * k * 0.9 + 4 * k, b + (255 - b) * k * 0.75, a);
  const t = -k;
  return pack(r * (1 - t) + 30 * t * 0.35, g * (1 - t) + 10 * t * 0.35, b * (1 - t * 0.85) + 50 * t * 0.35, a);
}
export function shade(c: Col, k: number): Col { return toHex(shadeV(rgba(c), k)); }
export function mix(a: Col, b: Col, t: number): Col {
  const A = comp(rgba(a)), B = comp(rgba(b));
  return toHex(pack(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t, Math.round(A[3] + (B[3] - A[3]) * t)));
}

export class PixelArt {
  w: number; h: number;
  data: Uint32Array;
  lock: Uint8Array; // píxeles de detalle (no se sombrean)

  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    this.data = new Uint32Array(w * h);
    this.lock = new Uint8Array(w * h);
  }

  get(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[y * this.w + x]; }
  set(x: number, y: number, v: number, lock = false) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    if ((v & 255) < 255 && (v & 255) > 0 && this.data[i]) {
      // mezcla alfa sobre píxel existente
      const a = (v & 255) / 255, A = comp(this.data[i]), B = comp(v);
      this.data[i] = pack(A[0] + (B[0] - A[0]) * a, A[1] + (B[1] - A[1]) * a, A[2] + (B[2] - A[2]) * a, Math.max(A[3], B[3]));
    } else this.data[i] = v;
    this.lock[i] = lock ? 1 : 0;
  }
  px(x: number, y: number, c: Col) { this.set(x, y, rgba(c), true); }
  rect(x: number, y: number, w: number, h: number, c: Col) {
    const v = rgba(c);
    for (let j = Math.round(y); j < Math.round(y + h); j++) for (let i = Math.round(x); i < Math.round(x + w); i++) this.set(i, j, v);
  }
  ell(cx: number, cy: number, rx: number, ry: number, c: Col) {
    const v = rgba(c);
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, v);
      }
    }
  }
  /** Elipse solo donde pred(x,y) es cierto. */
  ellIf(cx: number, cy: number, rx: number, ry: number, c: Col, pred: (x: number, y: number) => boolean) {
    const v = rgba(c);
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && pred(x, y)) this.set(x, y, v);
    }
  }
  /** Elipse rotada (ángulo en radianes). */
  rell(cx: number, cy: number, rx: number, ry: number, ang: number, c: Col) {
    const v = rgba(c), ca = Math.cos(ang), sa = Math.sin(ang), R = Math.max(rx, ry) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const px = x + 0.5 - cx, py = y + 0.5 - cy;
      const u = (px * ca + py * sa) / rx, w = (-px * sa + py * ca) / ry;
      if (u * u + w * w <= 1) this.set(x, y, v);
    }
  }
  poly(pts: number[][], c: Col) {
    const v = rgba(c);
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, v);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, c: Col, t = 1, lock = false) {
    const v = rgba(c);
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (t <= 1) this.set(Math.floor(x), Math.floor(y), v, lock);
      else for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) this.set(Math.floor(x - t / 2 + a + 0.5), Math.floor(y - t / 2 + b + 0.5), v, lock);
    }
  }
  /** Curva cuadrática gruesa. */
  curve(pts: number[][], c: Col, t = 1) {
    for (let i = 0; i < pts.length - 1; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, t);
  }
  /** Ojo estilo Pokémon: pupila oscura + brillo. */
  eye(x: number, y: number, w = 2, h = 2, c: Col = '#18101e', shine = true) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, rgba(c), true);
    if (shine) this.set(x, y, rgba('#ffffff'), true);
  }
  /** Copia la mitad izquierda reflejada sobre la derecha. */
  mirror() {
    const W = this.w;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < W / 2; x++) {
      const i = y * W + x, j = y * W + (W - 1 - x);
      this.data[j] = this.data[i]; this.lock[j] = this.lock[i];
    }
  }
  /** Sombreado automático: luz desde arriba-izquierda. */
  shadeAll(strength = 1) {
    const W = this.w, H = this.h, src = new Uint32Array(this.data);
    const same = (x: number, y: number, v: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] === v;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, v = src[i];
      if (!v || this.lock[i] || (v & 255) < 200) continue;
      let k = 0;
      const upEdge = !same(x, y - 1, v), downEdge = !same(x, y + 1, v), rightEdge = !same(x + 1, y, v), leftEdge = !same(x - 1, y, v);
      const down2 = !same(x, y + 2, v);
      if (downEdge) k = -0.32; else if (down2 && rightEdge) k = -0.26; else if (rightEdge) k = -0.16; else if (down2) k = -0.12;
      if (upEdge && !downEdge) k = 0.22; else if (leftEdge && !downEdge && !rightEdge) k = Math.max(k, 0.1);
      if (k) this.data[i] = shadeV(v, k * strength);
    }
  }
  /** Contorno selectivo (color oscuro derivado del vecino). */
  outline(dark: Col = '#1a1022') {
    const W = this.w, H = this.h, src = new Uint32Array(this.data), D = rgba(dark);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (src[y * W + x]) continue;
      let nb = 0;
      if (x > 0 && src[y * W + x - 1]) nb = src[y * W + x - 1];
      else if (x < W - 1 && src[y * W + x + 1]) nb = src[y * W + x + 1];
      else if (y > 0 && src[(y - 1) * W + x]) nb = src[(y - 1) * W + x];
      else if (y < H - 1 && src[(y + 1) * W + x]) nb = src[(y + 1) * W + x];
      if (!nb || (nb & 255) < 120) continue;
      const a = comp(nb), d = comp(D);
      this.data[y * W + x] = pack(a[0] * 0.25 + d[0] * 0.75, a[1] * 0.25 + d[1] * 0.75, a[2] * 0.25 + d[2] * 0.75, 255);
    }
  }
  /** Línea interior oscura entre dos regiones de colores distintos (mejora la lectura). */
  innerLines(k = -0.45) {
    const W = this.w, H = this.h, src = new Uint32Array(this.data);
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, v = src[i], up = src[i - W];
      if (!v || !up || v === up || this.lock[i] || this.lock[i - W]) continue;
      // solo si la diferencia de luminancia es grande
      const L = (c: number) => ((c >>> 24) & 255) * 0.3 + ((c >>> 16) & 255) * 0.59 + ((c >>> 8) & 255) * 0.11;
      if (Math.abs(L(v) - L(up)) > 70 && L(up) > L(v)) this.data[i] = shadeV(v, k * 0.5);
    }
  }
  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * scale; c.height = this.h * scale;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.data.length; i++) {
      const v = this.data[i];
      img.data[i * 4] = (v >>> 24) & 255; img.data[i * 4 + 1] = (v >>> 16) & 255; img.data[i * 4 + 2] = (v >>> 8) & 255; img.data[i * 4 + 3] = v & 255;
    }
    if (scale === 1) { ctx.putImageData(img, 0, 0); return c; }
    const t = document.createElement('canvas'); t.width = this.w; t.height = this.h;
    t.getContext('2d')!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(t, 0, 0, c.width, c.height);
    return c;
  }
  clone() { const p = new PixelArt(this.w, this.h); p.data.set(this.data); p.lock.set(this.lock); return p; }
  /** Fotograma "aplastado" (respiración / paso). */
  squash(): PixelArt {
    const p = new PixelArt(this.w, this.h);
    let top = this.h; for (let y = 0; y < this.h && top === this.h; y++) for (let x = 0; x < this.w; x++) if (this.data[y * this.w + x]) { top = y; break; }
    const mid = Math.floor((top + this.h) / 2);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const sy = y <= top ? -1 : y <= mid ? y - 1 : y;
      if (sy < 0) continue;
      p.data[y * this.w + x] = this.data[sy * this.w + x];
    }
    return p;
  }
}

/** Ruido determinista por píxel para texturas. */
export function phash(x: number, y: number, s = 0) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
