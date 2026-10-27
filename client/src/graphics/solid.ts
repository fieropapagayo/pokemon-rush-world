// Shared software rasterizer. Geometry is baked once into cached sprite sheets.
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

// A shared low-poly sphere. Cones reuse its topology, tapering to a pointed tip.
const vertices: V[] = [], triangles: [number, number, number][] = [];
const RINGS = 8, SEGMENTS = 12;
for (let j = 0; j <= RINGS; j++) for (let i = 0; i < SEGMENTS; i++) {
  const lat = j / RINGS * Math.PI, lon = i / SEGMENTS * Math.PI * 2;
  vertices.push([Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)]);
  if (j < RINGS) { const a = j * SEGMENTS + i, b = j * SEGMENTS + (i + 1) % SEGMENTS; triangles.push([a, b, a + SEGMENTS], [b, b + SEGMENTS, a + SEGMENTS]); }
}

const ramps = new Map<string, number[]>();
function colorRamp(color: string) {
  let ramp = ramps.get(color);
  if (!ramp) { const base = rgba(color); ramp = Array.from({ length: 64 }, (_, i) => shadeV(base, -0.38 + i / 63 * 0.68)); ramps.set(color, ramp); }
  return ramp;
}

export function renderSolids(parts: SolidPart[], opts: SolidOptions): PixelArt {
  const { width, height, yaw = 0, pitch = 0.5, pixelScale = 1.52, anchorY = height * 0.825, material = "smooth", rocky = false, metallic = false, glossy = false, ghost: isGhost = false, shiny = false } = opts;
  const out = new PixelArt(width, height);
  const depth = new Float32Array(width * height).fill(-Infinity);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sn = Math.sin(pitch);
  for (const part of parts) {
    const mat = part.material || material;
    const cr = Math.cos(part.rot), sr = Math.sin(part.rot);
    const lighting: number[] = [];
    const pts = vertices.map(v => {
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
      const inx = nx / norm, iny = ny / norm, inz = nz2 / norm;
      const diffuse = Math.max(0, -inx * 0.42 + iny * 0.68 + inz * 0.6);
      const fill = Math.max(0, inx * 0.28 - iny * 0.22 - inz * 0.12) * 0.08;
      const rim = Math.pow(Math.max(0, 1 - Math.abs(inz)), isGhost ? 2.0 : 2.7) * (isGhost ? 0.25 : 0.16);
      let spec = 0;
      if (metallic || mat === "metal" || mat === "ice") {
        spec = Math.pow(Math.max(0, -inx * 0.22 + iny * 0.38 + inz * 0.89), 14) * 0.30;
      } else if (glossy || mat === "scales" || mat === "shell") {
        spec = Math.pow(Math.max(0, -inx * 0.2 + iny * 0.36 + inz * 0.91), 20) * 0.24;
      }
      const shinyShimmer = shiny ? Math.pow(Math.max(0, -inx * 0.15 + iny * 0.55 + inz * 0.75), 15) * 0.15 : 0;
      const emissive = mat === "energy" || (!part.material && EMISSIVE_COLORS.has(part.color));
      const ambient = emissive ? 0.62 : (0.12 - Math.max(0, 5 - yy) * 0.012);
      lighting.push(Math.max(emissive ? 44 : 0, Math.min(63, (ambient + diffuse * (emissive ? 0.42 : 0.68) + fill + rim + spec + shinyShimmer) * 63)));
      return [width / 2 + rx * pixelScale, anchorY - (yy * cp - rz * sn) * pixelScale, yy * sn + rz * cp] as V;
    });
    const ramp = colorRamp(part.color);
    for (const [ia, ib, ic] of triangles) {
      const a = pts[ia], b = pts[ib], c = pts[ic];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz); if (len < 0.001) continue;
      const faceLight = (lighting[ia] + lighting[ib] + lighting[ic]) / 3;
      const loX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), hiX = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
      const loY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), hiY = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      const det = ux * vy - uy * vx; if (Math.abs(det) < 0.001) continue;
      for (let y = loY; y <= hiY; y++) for (let x = loX; x <= hiX; x++) {
        const dx = x + 0.5 - a[0], dy = y + 0.5 - a[1];
        const u = (dx * vy - dy * vx) / det, v = (ux * dy - uy * dx) / det;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const z = a[2] + u * uz + v * vz, idx = y * width + x;
        if (z > depth[idx]) {
          let light = (rocky || mat === "stone") ? Math.round(faceLight / 6) * 6 : lighting[ia] + u * (lighting[ib] - lighting[ia]) + v * (lighting[ic] - lighting[ia]);
          if (mat !== "smooth" && mat !== "skin" && mat !== "energy") {
            const va = vertices[ia], vb = vertices[ib], vc = vertices[ic];
            const tx = (va[0] + u * (vb[0] - va[0]) + v * (vc[0] - va[0])) * part.r[0];
            const ty = (va[1] + u * (vb[1] - va[1]) + v * (vc[1] - va[1])) * part.r[1];
            const tz = (va[2] + u * (vb[2] - va[2]) + v * (vc[2] - va[2])) * part.r[2];
            light += surfaceDetail(mat, tx, ty, tz);
          }
          depth[idx] = z; out.data[idx] = ramp[Math.max(0, Math.min(63, Math.round(light)))];
        }
      }
    }
  }
  // A colored contour keeps small silhouettes readable without heavy black edging.
  const painted = out.data.slice();
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const idx = y * width + x;
    if (painted[idx]) continue;
    const near = painted[idx + 1] || painted[idx + width] || painted[idx - 1] || painted[idx - width];
    if (near) out.data[idx] = shadeV(near, -0.48);
  }
  return out;
}

