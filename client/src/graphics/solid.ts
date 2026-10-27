// Shared software rasterizer. Geometry is baked once into cached sprite sheets.
// 2.9: luz por píxel (normales interpoladas), sombras que viran a tonos fríos y luces cálidas,
// oclusión ambiental por profundidad, líneas interiores entre piezas y bandas de sombreado tipo pixel art.
import { PixelArt, rgba, shadeV } from './pixel';
export const EMISSIVE_COLORS = new Set(['#ffd866', '#ec6133', '#f58a39', '#ef763e', '#ffd850', '#f8e040', '#f8e858', '#edc94d', '#efcb4e', '#fff8b0', '#d82838', '#d82848', '#d9547a', '#f0d040', '#68b8f8', '#d8f4ff', '#f068b8', '#ff7030', '#ffe060', '#ffe850', '#e04880', '#58c0e8']);
export type V = [number, number, number];
export type Material = 'smooth' | 'skin' | 'cloth' | 'fur' | 'leaf' | 'stone' | 'metal' | 'shell' | 'scales' | 'ice' | 'energy';
export type SolidPart = { p: V; r: V; color: string; rot: number; cone: boolean; material?: Material };
export interface SolidOptions {
  width: number; height: number; yaw?: number; pitch?: number; pixelScale?: number; anchorY?: number;
  material?: Material; rocky?: boolean; metallic?: boolean; glossy?: boolean; ghost?: boolean; shiny?: boolean;
}
/** Low-contrast surface patterns in model coordinates: they rotate with the model. */
function surfaceDetail(mat: Material, x: number, y: number, z: number): number {
  if (mat === 'fur') return Math.sin(y * 5 + Math.sin(x * 3) + z * 2) * 2.4;
  if (mat === 'cloth') return Math.sin(x * 8) * Math.sin(y * 9 + z) * 1.8;
  if (mat === 'scales') return Math.cos(y * 3.6 + Math.sin(x * 2.8 + z * 1.8)) * 2.2;
  if (mat === 'leaf') return Math.sin(y * 3 + Math.abs(x) * 1.9 + z) * 2.8;
  if (mat === 'stone') return Math.sin(x * 3.2 + z * 2) * Math.cos(y * 4 - z) * 3.0;
  if (mat === 'shell') return Math.sin(y * 3.8 + z * 1.3) * 1.2;
  if (mat === 'metal' || mat === 'ice') return Math.sin(y * 2.6 + x * 0.8) * 1.5;
  return 0;
}

// A shared sphere (rounder than before). Cones reuse its topology, tapering to a pointed tip.
const vertices: V[] = [], triangles: [number, number, number][] = [];
const RINGS = 12, SEGMENTS = 18;
for (let j = 0; j <= RINGS; j++) for (let i = 0; i < SEGMENTS; i++) {
  const lat = j / RINGS * Math.PI, lon = i / SEGMENTS * Math.PI * 2;
  vertices.push([Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)]);
  if (j < RINGS) { const a = j * SEGMENTS + i, b = j * SEGMENTS + (i + 1) % SEGMENTS; triangles.push([a, b, a + SEGMENTS], [b, b + SEGMENTS, a + SEGMENTS]); }
}

const pack = (r: number, g: number, b: number) => ((Math.max(0, Math.min(255, Math.round(r))) << 24) | (Math.max(0, Math.min(255, Math.round(g))) << 16) | (Math.max(0, Math.min(255, Math.round(b))) << 8) | 255) >>> 0;
const ramps = new Map<string, number[]>();
/** Rampa de 64 tonos: las sombras viran hacia el violeta y las luces hacia un blanco cálido. */
function colorRamp(color: string) {
  let ramp = ramps.get(color);
  if (!ramp) {
    const v = rgba(color), R = v >>> 24, G = (v >>> 16) & 255, B = (v >>> 8) & 255;
    ramp = Array.from({ length: 64 }, (_, i) => {
      const k = -0.44 + i / 63 * 0.74;
      if (k < 0) {
        const d = 1 + k, t = -k * 0.42;
        return pack(R * d * (1 - t) + 46 * t, G * d * (1 - t) + 34 * t, B * d * (1 - t) + 92 * t);
      }
      const t = k * 0.82;
      return pack(R + (255 - R) * t, G + (247 - G) * t, B + (222 - B) * t * 0.9);
    });
    ramps.set(color, ramp);
  }
  return ramp;
}

export function renderSolids(parts: SolidPart[], opts: SolidOptions): PixelArt {
  const { width, height, yaw = 0, pitch = 0.5, pixelScale = 1.52, anchorY = height * 0.825, material = "smooth", rocky = false, metallic = false, glossy = false, ghost: isGhost = false, shiny = false } = opts;
  const out = new PixelArt(width, height);
  const N = width * height;
  const depth = new Float32Array(N).fill(-Infinity), light = new Float32Array(N), owner = new Int16Array(N).fill(-1), glow = new Uint8Array(N);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sn = Math.sin(pitch);
  const px = new Float32Array(vertices.length * 3), nrm = new Float32Array(vertices.length * 3), hgt = new Float32Array(vertices.length);
  // Profundidad en unidades del modelo: ~0,7 de pixelScale separa piezas distintas.
  const EDGE = 1.15, AO = 0.9;
  parts.forEach((part, pi) => {
    const mat = part.material || material;
    const cr = Math.cos(part.rot), sr = Math.sin(part.rot);
    const emissive = mat === "energy" || (!part.material && EMISSIVE_COLORS.has(part.color));
    const metal = metallic || mat === "metal" || mat === "ice", gloss = glossy || mat === "scales" || mat === "shell";
    const faceted = rocky || mat === "stone", detail = mat !== "smooth" && mat !== "skin" && mat !== "energy";
    vertices.forEach((v, k) => {
      const taper = part.cone ? (1 - v[1]) * 0.55 : 1;
      const x = v[0] * part.r[0] * taper, y = v[1] * part.r[1], z = v[2] * part.r[2] * taper + part.p[2];
      const xx = x * cr - y * sr + part.p[0], yy = x * sr + y * cr + part.p[1];
      const rx = xx * cy + z * sy, rz = -xx * sy + z * cy;
      // Inverse-transpose normals retain rounded lighting on flattened ears and wings.
      const ax = v[0] / part.r[0], ay = v[1] / part.r[1], az = v[2] / part.r[2];
      const bx = ax * cr - ay * sr, by = ax * sr + ay * cr;
      const nx = bx * cy + az * sy, nz = -bx * sy + az * cy;
      const ny = by * cp - nz * sn, nz2 = by * sn + nz * cp;
      const norm = Math.hypot(nx, ny, nz2) || 1;
      px[k * 3] = width / 2 + rx * pixelScale; px[k * 3 + 1] = anchorY - (yy * cp - rz * sn) * pixelScale; px[k * 3 + 2] = yy * sn + rz * cp;
      nrm[k * 3] = nx / norm; nrm[k * 3 + 1] = ny / norm; nrm[k * 3 + 2] = nz2 / norm; hgt[k] = yy;
    });
    const shadeAt = (inx: number, iny: number, inz: number, yy: number) => {
      const dot = -inx * 0.42 + iny * 0.68 + inz * 0.6;
      const diffuse = Math.max(0, (dot + 0.18) / 1.18);
      const fill = Math.max(0, inx * 0.28 - iny * 0.22 - inz * 0.12) * 0.08;
      const edge = Math.max(0, 1 - Math.abs(inz));
      const rim = Math.pow(edge, isGhost ? 2.0 : 2.7) * (isGhost ? 0.25 : 0.15) * (0.55 + 0.45 * Math.max(0, -inx + iny));
      let spec = 0;
      if (metal) spec = Math.pow(Math.max(0, -inx * 0.22 + iny * 0.38 + inz * 0.89), 16) * 0.34;
      else if (gloss) spec = Math.pow(Math.max(0, -inx * 0.2 + iny * 0.36 + inz * 0.91), 24) * 0.3;
      else if (!detail) spec = Math.pow(Math.max(0, -inx * 0.2 + iny * 0.4 + inz * 0.9), 30) * 0.12;
      const shim = shiny ? Math.pow(Math.max(0, -inx * 0.15 + iny * 0.55 + inz * 0.75), 15) * 0.15 : 0;
      const ambient = emissive ? 0.62 : (0.12 - Math.max(0, 5 - yy) * 0.012);
      return Math.max(emissive ? 44 : 0, Math.min(63, (ambient + diffuse * (emissive ? 0.42 : 0.68) + fill + rim + spec + shim) * 63));
    };
    for (const [ia, ib, ic] of triangles) {
      const a0 = px[ia * 3], a1 = px[ia * 3 + 1], a2 = px[ia * 3 + 2];
      const ux = px[ib * 3] - a0, uy = px[ib * 3 + 1] - a1, uz = px[ib * 3 + 2] - a2;
      const vx = px[ic * 3] - a0, vy = px[ic * 3 + 1] - a1, vz = px[ic * 3 + 2] - a2;
      const det = ux * vy - uy * vx; if (Math.abs(det) < 0.001) continue;
      const loX = Math.max(0, Math.floor(Math.min(a0, a0 + ux, a0 + vx))), hiX = Math.min(width - 1, Math.ceil(Math.max(a0, a0 + ux, a0 + vx)));
      const loY = Math.max(0, Math.floor(Math.min(a1, a1 + uy, a1 + vy))), hiY = Math.min(height - 1, Math.ceil(Math.max(a1, a1 + uy, a1 + vy)));
      let flat = 0;
      if (faceted) {
        const fx = nrm[ia * 3] + nrm[ib * 3] + nrm[ic * 3], fy = nrm[ia * 3 + 1] + nrm[ib * 3 + 1] + nrm[ic * 3 + 1], fz = nrm[ia * 3 + 2] + nrm[ib * 3 + 2] + nrm[ic * 3 + 2];
        const l = Math.hypot(fx, fy, fz) || 1;
        flat = Math.round(shadeAt(fx / l, fy / l, fz / l, (hgt[ia] + hgt[ib] + hgt[ic]) / 3) / 6) * 6;
      }
      for (let y = loY; y <= hiY; y++) for (let x = loX; x <= hiX; x++) {
        const dx = x + 0.5 - a0, dy = y + 0.5 - a1;
        const u = (dx * vy - dy * vx) / det, v = (ux * dy - uy * dx) / det;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const z = a2 + u * uz + v * vz, idx = y * width + x;
        if (z <= depth[idx]) continue;
        const w = 1 - u - v;
        let L: number;
        if (faceted) L = flat;
        else {
          let nx = nrm[ia * 3] * w + nrm[ib * 3] * u + nrm[ic * 3] * v, ny = nrm[ia * 3 + 1] * w + nrm[ib * 3 + 1] * u + nrm[ic * 3 + 1] * v, nz = nrm[ia * 3 + 2] * w + nrm[ib * 3 + 2] * u + nrm[ic * 3 + 2] * v;
          const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
          L = shadeAt(nx, ny, nz, hgt[ia] * w + hgt[ib] * u + hgt[ic] * v);
        }
        if (detail) {
          const va = vertices[ia], vb = vertices[ib], vc = vertices[ic];
          L += surfaceDetail(mat, (va[0] * w + vb[0] * u + vc[0] * v) * part.r[0], (va[1] * w + vb[1] * u + vc[1] * v) * part.r[1], (va[2] * w + vb[2] * u + vc[2] * v) * part.r[2]);
        }
        depth[idx] = z; light[idx] = L; owner[idx] = pi; glow[idx] = emissive ? 1 : 0;
      }
    }
  });
  // Oclusión ambiental y líneas interiores: una pieza que queda detrás de otra se oscurece en el borde de contacto.
  const R2: [number, number][] = [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const ramp = parts.map(p => colorRamp(p.color));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x, o = owner[i]; if (o < 0) continue;
    const d = depth[i];
    let L = light[i], occ = 0, edge = false;
    for (const [ox, oy] of R2) {
      const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= width || Y >= height) continue;
      const j = Y * width + X; if (owner[j] < 0) continue;
      const dd = depth[j] - d;
      if (dd > AO) occ += Math.min(1, dd / 4);
    }
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= width || Y >= height) continue;
      const j = Y * width + X; if (owner[j] >= 0 && owner[j] !== o && depth[j] - d > EDGE) { edge = true; L -= 6; break; }
    }
    L -= occ * (glow[i] ? 1.2 : 3.4);
    if (edge) L -= glow[i] ? 5 : 11;
    // bandas suaves: 10 niveles con un tramado de ajedrez solo en la transición
    const t = Math.max(0, Math.min(63, L)) / 63 * 9, lo = Math.floor(t), f = t - lo;
    const level = f < 0.33 ? lo : f > 0.67 ? lo + 1 : ((x + y) & 1 ? lo : lo + 1);
    out.data[i] = ramp[o][Math.max(0, Math.min(63, Math.round(level / 9 * 63)))];
  }
  // Contorno de color: más oscuro abajo y a la derecha, más suave en el lado de la luz.
  const painted = out.data.slice();
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const idx = y * width + x;
    if (painted[idx]) continue;
    const below = painted[idx + width], right = painted[idx + 1], above = painted[idx - width], left = painted[idx - 1];
    const near = below || right || above || left;
    if (!near) continue;
    const lit = !above && !left;   // píxel por encima o a la izquierda de la figura
    const c = shadeV(near, lit ? -0.4 : -0.56);
    out.data[idx] = pack(((c >>> 24) & 255) * 0.82 + 26 * 0.18, ((c >>> 16) & 255) * 0.82 + 18 * 0.18, ((c >>> 8) & 255) * 0.82 + 44 * 0.18);
  }
  return out;
}
