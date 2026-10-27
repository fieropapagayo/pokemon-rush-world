// High-resolution environment models, rendered at half scale in the tile world.
import { HIRES_KINDS } from './townArt';
import { renderSolids, type SolidPart, type Material } from './solid';
import { phash, shade } from './pixel';

export const NATURE_KINDS = new Set(['tree', 'rock', 'boulder', 'bush']);
export function objectScale(kind: string) { return NATURE_KINDS.has(kind) || HIRES_KINDS.has(kind) ? 0.5 : 1; }

export function natureArt(kind: string, variant: number) {
  const p: SolidPart[] = [];
  const add = (x: number, y: number, z: number, rx: number, ry: number, rz: number, color: string, material: Material = 'leaf', rot = 0, cone = false) => {
    p.push({ p: [x, y, z], r: [rx, ry, rz], color, material, rot, cone });
  };
  let w = 34, h = 46, anchor = 43, pitch = 0.35;
  if (kind === 'tree') {
    if (variant === 1 || variant === 4) { w = 24; h = 42; anchor = 39; }
    if (variant === 2) { w = 32; h = 44; anchor = 41; }
    if (variant === 3) { w = 26; h = 38; anchor = 35; }
    if (variant === 5) { w = 32; h = 42; anchor = 39; }
    const bark = variant === 5 ? '#665263' : variant === 2 ? '#bd935f' : '#8d6641';
    add(0, 9, 0, variant === 2 ? 1.8 : 2.7, 9.5, 2.3, bark, 'stone');
    for (const side of [-1, 1]) {
      add(side * 1.7, 1.2, 0.4, 0.9, 2.7, 1.1, shade(bark, -0.06), 'stone', side * 1.0);
      if ([0, 3, 5].includes(variant)) add(side * 3.4, 17, 0, 1.1, 6.5, 1.2, bark, 'stone', -side * 0.65);
    }
    if (variant === 3) {
      add(0, 23, 0, 1.3, 9, 1.1, bark, 'stone', -0.12);
      for (const s of [-1, 1]) {
        add(s * 7, 25, 0, 0.7, 7, 0.7, bark, 'stone', -s * 0.65);
        add(s * 5.5, 22, 0, 0.6, 3.8, 0.6, bark, 'stone', s * 0.3);
      }
    } else if (variant === 1 || variant === 4) {
      // Overlapping conical whorls produce a spruce silhouette with drooping tips.
      const green = variant === 4 ? '#427c72' : '#3d845f';
      for (let i = 0; i < 5; i++) {
        const y = 13 + i * 4.2, radius = 10.8 - i * 1.6;
        add(0, y, 0, radius, 6.8, radius * 0.6, shade(green, i * 0.025), 'leaf', 0, true);
        if (variant === 4) add(-0.4, y + 2.6, 0.1, radius * 0.69, 4.6, radius * 0.45, '#e3eff5', 'smooth', 0, true);
        else for (const s of [-1, 1]) add(s * radius * 0.55, y - 1, 2, 1.3, 2, 1.6, shade(green, 0.07), 'leaf', -s * 0.7);
      }
    } else if (variant === 2) {
      add(0.8, 22, -0.4, 1.8, 10, 1.8, bark, 'stone', -0.06);
      // Curved, ribbed fronds spread above clusters of coconuts.
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        for (let j = 0; j <= 26; j++) {
          const f = j / 26, d = 1.5 + f * 10.4;
          add(Math.cos(a) * d, 32 + Math.sin(f * Math.PI) * 3 - f * 6.4, Math.sin(a) * d * 0.65,
            0.4, 0.4, 0.4, '#4b9559', 'leaf');
        }
        for (let j = 0; j < 5; j++) {
          const d = 1.5 + j * 2.6;
          add(Math.cos(a) * d, 32 + Math.sin(j / 4 * Math.PI) * 3 - j * 1.6, Math.sin(a) * d * 0.65,
            2.4 - j * 0.28, 1.35 - j * 0.12, 2.0 - j * 0.26, j % 2 ? '#5eaa67' : '#4b9559', 'leaf', -Math.cos(a) * j * 0.2);
        }
      }
      for (const s of [-1, 0, 1]) add(s * 1.9, 28, 2, 1.6, 1.8, 1.6, '#88603e', 'stone');
    } else {
      const ghost = variant === 5;
      const green = ghost ? '#74608b' : '#55905f';
      // Each lobe is lit in 3D. Nested smaller clusters break the smooth outline.
      for (let i = 0; i < 13; i++) {
        const a = i * 2.39996, r = i < 5 ? 4 : 8;
        const y = (ghost ? 25 : 28) + (i < 5 ? 4 : -2) + Math.sin(i * 1.4) * 2.5;
        const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.55;
        add(x, y, z, 5 + phash(i, variant, 9) * 1.5, 5.4, 4.4, shade(green, phash(i, 7, 9) * 0.14 - 0.07));
        add(x - 1.3, y + 3.6, z + 1, 3.4, 2, 2.5, shade(green, 0.08));
      }
      for (const side of [-1, 1]) add(side * 6, ghost ? 19 : 21, 3.5, 6.1, 5.3, 4.2, shade(green, -0.04));
      if (ghost) for (const s of [-1, 1]) add(s * 2, 13, 2.3, 0.65, 1.1, 0.45, '#e8b976', 'energy');
    }
  } else if (kind === 'bush') {
    w = 20; h = 19; anchor = 16.5;
    for (const [x, y, z, r] of [[-4, 6, 0, 4], [4, 6, 0, 4], [0, 9, -1, 4.8], [0, 4, 2, 6]]) {
      add(x, y, z, r, r * 0.8, r * 0.65, '#579954');
      add(x - 0.9, y + 2, z + 0.6, r * 0.6, r * 0.4, r * 0.45, '#70ad61');
    }
    if (variant) for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 2.6, y = 6.5 + Math.sin(i * 2) * 1.5;
      if (variant === 1) {
        add(x, y, 3.3, 0.75, 0.9, 0.7, '#c75166', 'shell');
        add(x - 0.25, y + 0.35, 3.8, 0.2, 0.2, 0.2, '#f3b2b6', 'smooth');
      } else {
        for (let j = 0; j < 5; j++) add(x + Math.cos(j * 1.257) * 0.6, y + Math.sin(j * 1.257) * 0.6, 3.5, 0.5, 0.5, 0.3, '#f5d2dd', 'smooth');
        add(x, y, 3.9, 0.3, 0.3, 0.2, '#ecca7e', 'smooth');
      }
    }
  } else {
    const big = kind === 'boulder'; w = big ? 32 : 16; h = big ? 26 : 16; anchor = big ? 23 : 14;
    const r = big ? 12 : 5.7, y = big ? 9 : 4.5;
    const rock = big ? (variant ? '#77636a' : '#aa9c87') : ['#9a9f9b', '#bed6de', '#655662'][variant % 3];
    add(0, y, 0, r, y, r * 0.6, rock, 'stone', 0.12);
    add(-r * 0.35, y * 1.55, 0, r * 0.55, y * 0.6, r * 0.45, shade(rock, 0.08), 'stone', -0.3);
    if (variant === 0) for (let i = 0; i < 4; i++) add(-r * 0.55 + i * r * 0.15, y * 1.35 + (i % 2) * 0.6, r * 0.4, r * 0.22, 0.45, 0.7, '#73886a', 'leaf');
  }
  return renderSolids(p, { width: w * 2, height: h * 2, anchorY: anchor * 2, pixelScale: 2, pitch, yaw: -0.1 });
}
