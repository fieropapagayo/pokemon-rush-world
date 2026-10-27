// Articulated trainer model, shared by players, wardrobe portraits and every NPC.
import { renderSolids, type SolidPart, type Material } from './solid';
import { shade } from './pixel';
import type { TrainerCols } from './trainerArt';

export const TRAINER_W = 32, TRAINER_H = 48, TRAINER_SCALE = 0.5;

export function trainerParts(c: TrainerCols, pose = 0): SolidPart[] {
  const p: SolidPart[] = [];
  const step = pose === 1 ? 1 : pose === 2 ? -1 : 0;
  const bob = pose ? 0.25 : 0;
  const nurse = c.hat === '#f8f8f8' && c.hair === '#f070a0';
  const prof = !c.hat && c.hair === '#b8b8c0' && c.shirt === '#f4f4f4';
  const blaine = c.shirt === '#f4f4f4' && c.hair === '#f4f4f4';
  const lance = !c.hat && c.shirt === '#283048' && c.hair === '#c83030';
  const ink = '#24273a', white = '#fff7e8', gold = '#eac573';
  const ball = (x: number, y: number, z: number, rx: number, ry: number, rz: number, color: string, material: Material = 'cloth', rot = 0, cone = false) => {
    p.push({ p: [x, y + bob, z], r: [rx, ry, rz], color, material, rot, cone });
  };
  // Cape / backpack sit behind the body, with actual depth from every view.
  if (lance) {
    ball(0, 10, -2.8, 4.7, 6.3, 0.75, '#b63445');
    for (const s of [-1, 1]) ball(s * 3.8, 12, -1.6, 1, 3.4, 1, '#a62b3b', 'cloth', -s * 0.22);
  } else if (!nurse && !prof && !blaine) {
    ball(0, 11.2, -3, 2.8, 3.6, 1.8, c.bag);
    ball(0, 13.8, -3.5, 2.9, 1.1, 1.7, shade(c.bag, 0.16));
    ball(0, 9.9, -4.4, 2, 1.2, 0.65, shade(c.bag, -0.12));
    ball(0, 12.7, -4.9, 0.45, 0.7, 0.2, gold, 'metal');
    for (const s of [-1, 1]) ball(s * 2.9, 10.5, -3.1, 0.55, 1.7, 0.7, shade(c.bag, -0.18));
  }
  // Alternating hip, knee and ankle positions keep soles at ground level.
  for (const s of [-1, 1]) {
    const gait = s * step, lift = Math.max(0, gait) * 0.65;
    ball(s * 1.8, 4.4 + lift, gait * 1.25, 1.4, 3.2 - lift * 0.3, 1.5, c.pants);
    ball(s * 1.8, 4.3 + lift, 1.3 + gait * 1.25, 0.7, 0.6, 0.28, shade(c.pants, 0.15));
    ball(s * 1.85, 1.25 + lift, 0.85 + gait * 1.6, 1.7, 1.0, 2.25, c.shoes);
    ball(s * 1.85, 0.65 + lift, 1 + gait * 1.6, 1.75, 0.35, 2.2, white, 'smooth');
    for (let i = 0; i < 2; i++) ball(s * 1.85, 2 + lift, 1.2 + gait * 1.6 + i * 0.7, 0.8, 0.12, 0.14, white, 'smooth');
  }
  ball(0, 11.15, 0, 3.7, 4.45, 2.55, c.shirt);
  ball(0, 7.5, 0, 3.4, 0.55, 2.6, nurse || prof ? white : ink);
  ball(0, 7.6, 2.65, 0.65, 0.42, 0.2, gold, 'metal');
  ball(0, 15.5, 0.3, 1.4, 1.25, 1.2, c.skin, 'skin');
  // Open jacket, lapels, zipper and pockets.
  ball(0, 13.3, 2.35, 1.35, 2.0, 0.4, prof ? '#9c7958' : white);
  for (const s of [-1, 1]) {
    ball(s * 1.5, 13.9, 2.5, 0.75, 1.7, 0.3, shade(c.shirt, 0.22), 'cloth', s * 0.3);
    if (!nurse && !prof) ball(s * 2.65, 12.2, 1.8, 0.38, 2.5, 0.75, lance ? gold : shade(c.bag, -0.08));
    ball(s * 2, 9.5, 2.3, 0.85, 0.13, 0.3, shade(c.shirt, -0.3));
  }
  if (nurse) {
    ball(0, 9.8, 2.5, 2.25, 2.45, 0.45, white);
    ball(0, 14, 2.95, 0.5, 0.45, 0.2, '#df5575');
  } else if (prof || blaine) {
    for (const s of [-1, 1]) ball(s * 2.5, 7.6, 0.7, 1.4, 2.1, 1.8, white);
    ball(0, 12.3, 2.9, 0.3, 1.5, 0.2, '#b9434b');
  } else {
    ball(0, 10.8, 2.58, 0.13, 1.8, 0.15, ink);
    ball(0, 12.5, 2.8, 0.26, 0.45, 0.15, gold, 'metal');
    ball(3, 7.6, 1.9, 0.85, 0.85, 0.8, white, 'smooth');
    ball(3, 8, 1.9, 0.8, 0.5, 0.8, '#e34b50', 'smooth');
    ball(3, 7.65, 2.7, 0.28, 0.25, 0.15, ink, 'smooth');
  }
  for (const s of [-1, 1]) {
    const swing = -s * step;
    ball(s * 4.1, 12.4, swing * 0.65, 1.35, 2.5, 1.45, c.shirt, 'cloth', s * 0.12);
    ball(s * 4.5, 9.7, swing * 1.4, 1.0, 1.4, 1.05, c.skin, 'skin');
    ball(s * 4.5, 9.1, swing * 1.4, 1.05, 0.4, 1.1, shade(c.shirt, -0.12));
    ball(s * 4.5, 8.1, swing * 1.6, 1.05, 1.05, 1.0, c.skin, 'skin');
    if (s < 0 && !nurse && !prof) ball(s * 5.35, 9.2, swing * 1.4 + 0.15, 0.16, 0.45, 0.5, '#72d6df', 'metal');
  }
  // Rounded head and ears. Hair is a separate cap plus sculpted locks.
  ball(0, 19.5, 0, 4.25, 4.35, 3.65, c.skin, 'skin');
  ball(0, 20.2, -1.45, 4.45, 4.15, 2.65, c.hair, 'fur');
  for (const s of [-1, 1]) {
    ball(s * 4.1, 19.0, 0.8, 0.75, 1.2, 0.7, c.skin, 'skin');
    ball(s * 3.9, 20, 0.6, 0.65, 1.6, 1.1, c.hair, 'fur');
    if (nurse) ball(s * 4.7, 19.2, -1.4, 1.5, 1.65, 1.4, c.hair, 'fur');
  }
  ball(0, 23, -0.2, 4.55, 1.65, 3.7, c.hair, 'fur');
  for (let i = -2; i <= 2; i++) ball(i * 1.35, 22.4 - (i % 2 ? 0.4 : 0), 2.6, 1.0, 1.55, 1.25, c.hair, 'fur', -0.3);
  if (c.hat) {
    ball(0, 24.3, -0.1, 4.8, nurse ? 1.25 : 2.15, 3.9, c.hat);
    if (!nurse) {
      ball(0, 23.05, 3.1, 4.8, 0.5, 2.25, shade(c.hat, -0.12));
      ball(0, 24.7, 3.45, 1.15, 0.95, 0.35, white, 'smooth');
      ball(0, 24.7, 3.79, 0.45, 0.42, 0.1, c.hat, 'smooth');
      ball(0, 23.1, -3.9, 1.45, 0.45, 0.2, ink);
    } else {
      ball(0, 24.5, 3.7, 0.35, 0.85, 0.2, '#dc4860', 'smooth');
      ball(0, 24.5, 3.7, 0.85, 0.3, 0.2, '#dc4860', 'smooth');
    }
  }
  // Facial features stay smooth so the eyes read well at the world scale.
  for (const s of [-1, 1]) {
    ball(s * 1.8, 20.15, 3.35, 1, blaine ? 0.8 : 1.15, 0.5, blaine ? ink : white, 'smooth');
    ball(s * 1.8, 20.15, 3.83, 0.53, 0.8, 0.2, ink, 'smooth');
    ball(s * 1.8 - 0.15, 20.55, 4.02, 0.2, 0.28, 0.1, blaine ? '#82c4d8' : white, 'smooth');
    ball(s * 1.8, 21.45, 3.2, 0.95, 0.22, 0.35, c.hair, 'fur', -s * 0.08);
  }
  ball(0, 18.75, 3.6, 0.6, 0.65, 0.7, c.skin, 'skin');
  ball(0, 17.55, 3.45, 0.75, 0.15, 0.15, shade(c.skin, -0.28), 'smooth');
  if (blaine) for (const s of [-1, 1]) ball(s * 0.85, 18, 3.8, 1.1, 0.5, 0.3, white, 'fur', s * 0.15);
  return p;
}

export function renderTrainer(c: TrainerCols, dir = 0, pose = 0) {
  return renderSolids(trainerParts(c, pose), { width: TRAINER_W, height: TRAINER_H,
    yaw: [0, Math.PI, -Math.PI / 2][dir % 3], pitch: 0.22, pixelScale: 1.55, anchorY: 44.5 });
}
