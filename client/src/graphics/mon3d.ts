// Articulated solid geometry, orthographic projection and a per-pixel depth buffer.
// The world remains 2D; these are actual 3D models baked into pixel-art frames.
import { SPECIES, type SpeciesDef } from '../../../shared/species';
import { ART } from './pokemonArt';
import { hasExtraModel, extraParts } from './newmons';
import { PixelArt } from './pixel';
import { renderSolids, EMISSIVE_COLORS, type SolidPart, type Material } from './solid';

/** Resolución de los modelos: 1,5× (96 px por fotograma) y se dibujan con filtrado suave. */
export const MON_RES = 1.5;
export const MON_FRAME = 64 * MON_RES;
export const MON_WORLD_SIZE = 40;
export const MON_POSES = 8; // idle 0–1, gait 2–5, attack 6–7
type V = [number, number, number];
type Part = SolidPart;
const WHITE = '#fff5df', INK = '#182035';

export function monScale(sp: SpeciesDef, flags = 0) {
  const size = sp.key === 'mew' ? 0.78 : sp.size === 64 ? 1.08 : sp.size === 48 ? 0.96 : 0.84;
  return size * (flags & 4 ? 1.45 : flags & 64 ? 1.15 : 1);
}

/** Local coordinates: x across, y up, z forward. Each limb has its own pose. */
export function modelParts(key: string, shiny: boolean, frame = 0): Part[] {
  if (hasExtraModel(key)) return extraParts(key, shiny, frame); // especies de la 2.6 (newmons.ts)
  const sp = SPECIES[key];
  if (!sp || !ART[key]) throw new Error(`Missing 3D species palette: ${key}`);
  const c = { ...ART[key].pal, ...(shiny ? ART[key].shiny : {}) };
  const body = c.body || c.fur || c.rock || c.top || Object.values(c)[0];
  const belly = c.belly || c.cream || c.face || WHITE;
  const parts: Part[] = [];
  const walk = frame >= 2 && frame < 6;
  const t = walk ? (frame - 2) / 4 * Math.PI * 2 : frame * Math.PI;
  const gait = walk ? Math.sin(t) : 0;
  const breath = frame === 1 ? 0.45 : 0;
  const attack = frame >= 6 ? (frame === 6 ? 1 : 0.4) : 0;
  const tail = Math.sin(t + 0.7) * (walk ? 2 : 0.8);
  const ball = (x: number, y: number, z: number, rx: number, ry: number, rz: number, color = body, rot = 0) => parts.push({ p: [x, y + breath, z + attack], r: [rx, ry, rz], color, rot, cone: false });
  const spike = (x: number, y: number, z: number, rx: number, ry: number, rz: number, color = body, rot = 0) => parts.push({ p: [x, y + breath, z + attack], r: [rx, ry, rz], color, rot, cone: true });
  const eyes = (y: number, z: number, gap = 2.6, color = INK) => {
    for (const side of [-1, 1]) {
      ball(side * gap, y, z, 1.15, 1.65, 0.65, WHITE);
      ball(side * gap, y, z + 0.55, 0.8, frame === 1 ? 0.28 : 1.18, 0.35, color);
      if (frame !== 1) ball(side * gap - 0.18, y + 0.45, z + 0.85, 0.22, 0.3, 0.2, WHITE);
    }
  };
  const feet = (quad = false, color = body) => {
    for (const side of [-1, 1]) for (const back of quad ? [-1, 1] : [1]) {
      ball(side * 3.3, 2.5 + Math.max(0, side * back * gait), quad ? back * 3.6 + side * gait : side * gait + 0.6, 2, quad ? 3.1 : 2, 2.6, color);
    }
  };
  const arms = (color = body, extra = false) => {
    if (key === 'machamp') {
      for (const side of [-1, 1]) {
        ball(side * 6.2, 14 + attack * 2, 1.2 + attack * 2, 1.8, 3.4, 1.8, color, side * 0.85);
        ball(side * 7.2, 16.5, 2.2 + attack * 2, 1.3, 1.3, 1.3, WHITE);
        ball(side * 5.2, 8.5 + side * gait, 3.2 + attack * 2, 1.7, 3.0, 1.7, color, side * 0.2);
        ball(side * 5.2, 7.5 + side * gait, 5.2 + attack * 2, 1.2, 1.2, 1.2, WHITE);
      }
    } else {
      for (const side of [-1, 1]) {
        ball(side * 5.3, 9.5 + side * gait + attack * 2, 0.8 + attack * 3, 1.9, 3.4, 1.9, color, side * (0.3 + attack * 0.5));
        if (extra) ball(side * 6, 14, attack * 3, 1.8, 3.5, 1.8, color, side * 1.1);
      }
    }
  };
  const ears = (y = 19, tall = 4, color = body) => {
    for (const side of [-1, 1]) {
      spike(side * 3.8, y, 2.5, 2, tall, 1.6, color, -side * 0.22);
      spike(side * 3.8, y, 3.7, 0.9, tall * 0.7, 0.35, c.inner || '#b66d80', -side * 0.22);
    }
  };
  const wings = (color: string, small = false) => {
    const flap = (walk ? Math.sin(t) : frame === 1 ? -0.55 : 0.55) * 0.7;
    for (const side of [-1, 1]) {
      ball(side * 6.5, 12 + flap * 2, -1, small ? 4 : 6, 1.1, 3.8, color, side * flap);
      for (let j = 0; j < 3; j++) spike(side * (small ? 8 : 10), 11 + flap * 4, -2 + j * 2, 1.3, small ? 3 : 5, 1.2, color, side * (1.05 + flap));
    }
  };
  const tailChain = (color = body, n = 5, radius = 2) => {
    for (let i = 0; i < n; i++) ball(tail * i / n, 4 + i * 0.9, -4 - i * 1.6, radius * (1 - i / (n + 2)), radius, radius, color);
  };
  const quadruped = ['bulbasaur', 'rattata', 'growlithe', 'eevee', 'vulpix', 'ponyta'].includes(sp.family);
  const bird = sp.family === 'pidgey' || ['articuno', 'zapdos', 'moltres'].includes(key);
  const serpent = key === 'onix' || key === 'gyarados' || key === 'dratini' || key === 'dragonair';

  if (serpent) {
    for (let i = 0; i < 8; i++) {
      const r = 3.6 - i * 0.28;
      ball(Math.sin(i * 0.7 + t * 0.3) * 2, 14 - i * 1.4, 4 - i * 1.8, r, r, r, body);
      if (key === 'gyarados') spike(0, 17 - i * 1.4, 4 - i * 1.8, 1.2, 2.3, 1.2, WHITE);
      if (key === 'onix') for (const s of [-1, 1]) ball(Math.sin(i * 0.7 + t * 0.3) * 2 + s * (r * 0.85), 14 - i * 1.4, 4 - i * 1.8, 0.7, 0.7, 0.7, c.dark || '#5e6573');
    }
    ball(0, 17, 5, 4.7, 4.4, 4.5); eyes(18, 8.5);
    if (key === 'onix') {
      spike(0, 23, 5, 1.2, 3.6, 1.2, body);
      for (const s of [-1, 1]) ball(s * 3.2, 18.5, 5.2, 1.3, 1.0, 1.3, body);
    }
    if (key === 'dragonair') {
      spike(0, 21.5, 5.2, 0.65, 2.6, 0.65, WHITE);
      ball(0, 13.8, 7.8, 1.5, 1.5, 0.9, c.orb || '#4a9ed2');
      ball(tail, 4, -7.8, 1.6, 1.6, 1.6, c.orb || '#4a9ed2');
      ball(tail, 3, -9.2, 1.2, 1.2, 1.2, c.orb || '#4a9ed2');
      for (const s of [-1, 1]) {
        ball(s * 4.4, 18.5, 4, 1.8, 2.8, 0.7, WHITE, s * 0.3);
        ball(s * 5.2, 20.2, 4, 1.1, 2.0, 0.5, WHITE, s * 0.4);
      }
    }
    if (key === 'gyarados') {
      ball(0, 15, 9, 3, 2.2, 1.4, '#682941');
      spike(0, 22.8, 5, 1.2, 3.6, 1.2, c.crest || '#5fa2d2');
      spike(-3.6, 21.5, 5, 0.9, 2.8, 0.9, c.crest || '#5fa2d2', -0.2);
      spike(3.6, 21.5, 5, 0.9, 2.8, 0.9, c.crest || '#5fa2d2', 0.2);
      for (const s of [-1, 1]) {
        spike(s * 3.4, 14, 9.6, 0.45, 2.2, 0.45, c.whisker || '#f8d65c', s * 0.35);
        spike(s * 1.5, 15.8, 9.2, 0.3, 0.8, 0.3, WHITE);
      }
      if (frame >= 6) ball(0, 15, 10.2, 1.3, 1.3, 1.3, '#ffd850');
    }
    if (key === 'dratini') {
      ball(0, 15.5, 9.2, 1.8, 1.3, 0.9, WHITE);
      for (const s of [-1, 1]) ball(s * 4.4, 18, 4, 1.6, 2.2, 0.7, WHITE, s * 0.25);
    }
    if (frame >= 6 && key !== 'gyarados') {
      ball(0, 15.5, 9.4, 1.2, 1.2, 1.2, key === 'onix' ? '#ffd850' : '#68b8f8');
      if (key !== 'onix') ball(0, 15.5, 10.0, 0.65, 0.65, 0.65, '#ffe850');
    }
  } else if (key === 'magikarp') {
    ball(0, 9, 0, 4, 5.5, 7); eyes(11, 5.8);
    ball(0, 8, 7, 2.8, 2.4, 1, c.lip || '#f4c99a'); ball(0, 8, 7.8, 1.5, 1.4, 0.4, '#5b293a');
    spike(0, 15, 0, 1, 3, 4, c.fin || '#f8d65c');
    spike(0, 16.2, 1.2, 0.6, 2.0, 0.6, c.fin || '#f8d65c');
    spike(0, 16.2, -1.2, 0.6, 2.0, 0.6, c.fin || '#f8d65c');
    ball(tail, 9, -8, 4, 4, 1, c.fin || '#f8d65c'); wings(body, true);
    for (const s of [-1, 1]) {
      spike(s * 2.8, 7, 7.2, 0.35, 2.4, 0.35, c.fin || '#f8d65c', s * 0.4);
      ball(s * 4, 8, 0.5, 0.6, 1.6, 2, WHITE, s * 0.4);
      ball(s * 4.1, 10, -1.5, 0.45, 0.7, 0.7, WHITE);
      if (frame >= 6) ball(s * 3.8, 12.5, 5.2, 0.75, 0.75, 0.75, '#68b8f8');
    }
  } else if (sp.family === 'voltorb') {
    if (key === 'electrode') {
      ball(0, 8, 0, 6.8, 6.8, 6.8, c.top || WHITE);
      ball(0, 5.5, 0, 6.2, 4.6, 6.2, c.bottom || '#e03838');
      eyes(11, 5.8, 2.7);
      ball(0, 7.2, 6.2, 2.8, 0.8, 0.4, INK);
      ball(0, 7.5, 6.3, 2.2, 0.35, 0.25, WHITE);
      for (let i = -2; i <= 2; i++) ball(i * 0.85, 7.3, 6.4, 0.22, 0.38, 0.2, INK);
    } else {
      ball(0, 8, 0, 6.8, 6.8, 6.8, c.bottom || WHITE);
      ball(0, 10.5, 0, 6.2, 4.6, 6.2, c.top || body);
      eyes(10, 6, 2.8); ball(0, 5, 6, 2.5, 0.45, 0.4, INK);
      for (const s of [-1, 1]) ball(s * 2.3, 11.4, 5.8, 1.4, 0.38, 0.35, INK, -s * 0.32);
    }
    if (frame >= 6) for (const s of [-1, 1]) ball(s * 6.2, 12, 2, 0.9, 0.9, 0.9, '#f8e040');
  } else if (sp.family === 'magnemite') {
    for (const [x, y] of key === 'magneton' ? [[-4, 7], [4, 7], [0, 14]] : [[0, 10]]) {
      ball(x, y, 0, 4, 4, 4, c.steel || body); ball(x, y, 3.8, 2, 2, 0.5, WHITE); ball(x, y, 4.3, 0.7, 1, 0.3, INK);
      spike(x, y + 5, 0, 0.8, 1.6, 0.8, '#6e758b');
      if (key === 'magnemite') for (const s of [-1, 1]) spike(x + s * 2.2, y - 3.6, 1.2, 0.5, 1.1, 0.5, '#6e758b', s * 0.3);
      for (const s of [-1, 1]) {
        ball(x + s * 5, y, 0, 2, 1.2, 1, '#8299ab');
        ball(x + s * 6, y + 1, 1, 1, 1, 1.8, s < 0 ? '#e75155' : '#5284d2');
        if (frame >= 6) ball(x + s * 6.4, y + 1, 2.4, 0.65, 0.65, 0.65, '#f8e040');
      }
    }
    if (key === 'magneton' && (frame % 2 === 1 || frame >= 6)) ball(0, 10, 0.5, 0.9, 0.9, 0.9, '#f8e858');
  } else if (key === 'caterpie') {
    for (let i = 0; i < 5; i++) {
      ball(Math.sin(t + i) * 0.7, 4, -i * 2.5, 3.2 - i * 0.2, 3.2, 3.1);
      ball(2.8, 2, -i * 2.5, 1, 1, 1, belly); ball(-2.8, 2, -i * 2.5, 1, 1, 1, belly);
      for (const s of [-1, 1]) ball(s * 3.1, 4.5, -i * 2.5, 0.55, 0.9, 0.9, '#f8e040');
    }
    ball(0, 8, 3, 4, 4.8, 3.8); eyes(9, 6);
    spike(-1.5, 13.8, 3, 0.75, 2.6, 0.75, '#e65050', -0.3);
    spike(1.5, 13.8, 3, 0.75, 2.6, 0.75, '#e65050', 0.3);
    ball(0, 11.5, 3, 1.1, 1.4, 0.9, '#e65050');
    if (frame >= 6) ball(0, 7.5, 6.8, 0.85, 0.85, 1.4, WHITE);
  } else if (key === 'metapod') {
    ball(0, 10, 0, 4.2, 8, 3.7); spike(0, 16, 0, 3, 4, 3); eyes(13, 3, 1.7); ball(0, 8, 3.7, 3.5, 0.5, 1, c.dark || '#4c8b47');
    if (frame >= 6) ball(0, 14.5, 3.8, 0.85, 0.85, 0.65, '#d8f4ff');
  } else if (key === 'butterfree') {
    const flap = gait * 0.35;
    ball(0, 10, 0, 2.8, 5.2, 2.6); ball(0, 16, 1, 3.6, 3.1, 3);
    for (const side of [-1, 1]) {
      ball(side * 7, 15 + flap * 4, -1, 5.8, 6.8, 0.9, '#35314f', side * (0.4 + flap));
      ball(side * 7, 15 + flap * 4, 0, 4.8, 5.7, 0.5, c.wing || '#eee4f3', side * (0.4 + flap));
      ball(side * 6, 7, -1, 4.6, 4, 0.8, '#35314f', -side * 0.5);
      ball(side * 6, 7, 0, 3.7, 3, 0.5, c.wing || '#eee4f3', -side * 0.5);
      for (let j = 0; j < 3; j++) ball(side * (5 + j * 1.9), 15 - j * 2 + flap * 3, 0.65, 0.35, 4 - j * 0.5, 0.25, '#7b78a2', side * 0.6);
      spike(side * 2, 21.5, 1, 0.35, 3.0, 0.35, INK, -side * 0.35);
      ball(side * 2.8, 24, 1.2, 0.6, 0.6, 0.6, INK);
      ball(side * 1.4, 4, 2, 1, 1.2, 1.9, c.foot || '#67bcd0');
    }
    eyes(17, 3.8, 2, c.eye || '#e5638b');
    if (frame >= 6) ball(0, 16, 5.2, 1.1, 1.1, 1.1, '#f068b8');
  } else if (sp.family === 'zubat') {
    ball(0, 11, 0, 3, 5.5, 3); wings(c.wing || c.wings || '#9a6bb9');
    ball(0, 16, 1, 3.6, 3, 3); ears(19, 2);
    ball(0, 13, 3, key === 'golbat' ? 3.3 : 2.6, key === 'golbat' ? 4.5 : 3, 1, '#422345');
    for (const s of [-1, 1]) {
      spike(s * 1.4, 14.2, 4, 0.5, 1, 0.5, WHITE);
      if (key === 'golbat') spike(s * 1.4, 11.2, 4, 0.45, 0.9, 0.45, WHITE);
      if (key === 'zubat') spike(s * 1.1, 5.2, -1.5, 0.4, 2.5, 0.4, body, s * 0.18);
    }
    if (key === 'golbat') {
      ball(0, 11.5, 3.5, 1.5, 1.1, 0.7, '#d86888');
      eyes(16.5, 3.8, 1.8, '#f04050');
    }
    if (key === 'crobat') {
      eyes(15.5, 3.8, 1.8, '#f8e040');
      for (const s of [-1, 1]) {
        ball(s * 7, 7 - gait * 1.5, -1, 5, 1, 2, c.wing || body, s * 0.4);
        ball(s * 1.6, 5.5, 1.2, 0.8, 1.1, 1.2, body);
      }
    }
    if (frame >= 6) {
      ball(0, 13, 4.8, 1.1, 1.1, 1.1, '#e04880');
      ball(0, 13, 5.3, 0.6, 0.6, 0.6, '#58c0e8');
    }
  } else if (bird) {
    ball(0, 10, 0, 4.7, 6, 4.5); ball(0, 10, 3, 3.5, 4.5, 2, belly);
    ball(0, 17, 2, 3.7, 4, 3.7); eyes(18, 4.9, 2.1);
    ball(0, 16, 6, 1.6, 1, 2.8, c.beak || '#edb851'); feet(false, c.beak || '#bd8943'); wings(c.wing || body);
    for (let i = -1; i <= 1; i++) { spike(i * 1.7, 22, 1, 1, 2.5, 1.6, c.crest || c.fire || body, i * 0.3); ball(i * 1.5 + tail, 7, -7, 1.3, 1, 5, c.tail || body); }
    if (frame >= 6 && sp.family === 'pidgey') ball(0, 15.5, 8.2, 1.2, 0.85, 1.2, '#d8f4ff');
  } else if (quadruped) {
    const horse = sp.family === 'ponyta';
    ball(0, horse ? 10 : 7, -1, 4.9, 4.2, 6.4); feet(true);
    ball(0, horse ? 16 : 12, 4, horse ? 3.2 : 5, horse ? 5 : 4.5, 4);
    ball(0, horse ? 17 : 10.5, 7, 2.5, 2, 2.1, sp.family === 'rattata' ? belly : body);
    eyes(horse ? 18 : 13, 7.2, horse ? 1.9 : 2.8); ears(horse ? 21 : 16, sp.family === 'eevee' ? 4.5 : 2.7);
    if (sp.family === 'bulbasaur') {
      ball(0, 13, -2, 5.6, 5, 5, c.bulb || c.leaf || '#60ae55');
      if (sp.stage === 1) spike(0, 17.5, -2, 2.2, 2.2, 2.2, c.bulb || '#4e9c48');
      for (const x of [-3, 3]) ball(x, 14, -1, 2.6, 1.5, 4, c.leaf || '#58a14d', x * 0.15);
      if (frame >= 6) for (const s of [-1, 1]) ball(s * 4.4, 13.5, 2.5 + attack * 2.2, 0.65, 0.65, 2.8, '#469c40', s * 0.25);
      if (sp.stage === 2) {
        ball(0, 18, -2, 3, 4, 3, c.bud || '#e8799b');
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          ball(Math.cos(a) * 4.2, 14.5, -2 + Math.sin(a) * 4.2, 2.4, 0.8, 2.4, '#469c40', a);
        }
      }
      if (sp.stage === 3) {
        ball(0, 16, -2, 1.7, 4, 1.7, '#997755');
        for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5;
          ball(Math.cos(a) * 4.6, 19, -2 + Math.sin(a) * 4.6, 4.3, 1.3, 4.1, c.petal || '#e8799b');
          ball(Math.cos(a) * 5, 20, -2 + Math.sin(a) * 5, 0.8, 0.25, 0.9, WHITE);
          ball(Math.cos(a + 0.3) * 5.0, 16.5, -2 + Math.sin(a + 0.3) * 5.0, 2.2, 0.7, 3.0, c.leaf || '#58a14d');
        }
        ball(0, 20, -2, 2.3, 1.4, 2.3, '#f4cf62');
        for (const s of [-1, 1]) spike(s * 1.8, 9.5, 6.8, 0.35, 0.7, 0.35, WHITE);
      }
      for (const s of [-1, 1]) ball(s * 4.3, 8, 0, 0.9, 1.1, 1.7, c.spot || '#368f79');
    } else if (sp.family === 'vulpix') {
      for (let i = 0; i < (key === 'ninetales' ? 9 : 6); i++) {
        const n = key === 'ninetales' ? 9 : 6;
        const spread = (i - (n - 1) / 2) * (key === 'ninetales' ? 1.4 : 1.3);
        const rot = (i - (n - 1) / 2) * (key === 'ninetales' ? 0.2 : 0.18);
        ball(spread + tail, 9 + Math.sin(i * 0.8) * 2, -7 - Math.abs(spread) * 0.3, 1.6, 4.3, 3.6, c.tail || body, rot);
        if (key === 'ninetales') ball(spread * 1.08 + tail, 12.2 + Math.sin(i * 0.8) * 2, -7 - Math.abs(spread) * 0.3, 0.9, 1.5, 0.9, c.tip || '#f8e080', rot);
      }
      if (key === 'vulpix') for (let i = -1; i <= 1; i++) ball(i * 1.4, 18.5, 4.2, 1.1, 1.4, 1.1, c.tail || body);
      if (key === 'ninetales') {
        spike(0, 22.5, 4.2, 0.7, 3, 0.7, c.tail || body);
        ball(0, 14, 4.5, 2.0, 1.8, 1.2, c.fur || '#fff5d8');
      }
      if (frame >= 6) ball(0, 11.5, 8.6, 1.1, 1.1, 1.2, key === 'ninetales' ? '#68b8f8' : '#ff7030');
    } else if (horse) {
      for (let i = 0; i < 5; i++) spike(0, 14 + i * 1.8, i * 1.2, 1.3, 3 + (frame % 2), 2, c.flame || c.fire || '#f58a39');
      tailChain(c.flame || c.fire || '#f58a39', 4, 2);
      for (const s of [-1, 1]) for (const b of [-1, 1]) {
        ball(s * 3.2, 2.5, b * 3.2 + s * gait, 1.1, 1.3, 1.1, c.flame || c.fire || '#f58a39');
      }
      if (key === 'rapidash') {
        spike(0, 24, 5, 0.8, 3.2, 0.8, WHITE);
        ball(0, 23.5, 5.2, 0.4, 0.4, 0.4, '#fff8b0');
      }
      if (frame >= 6) {
        ball(0, 16.5, 9.0, 1.25, 1.25, 1.35, '#ff7030');
        ball(0, 16.5, 9.6, 0.7, 0.7, 0.7, '#ffe850');
      }
    } else {
      tailChain(sp.family === 'growlithe' ? belly : c.tail || body, 5, sp.family === 'rattata' ? 0.8 : 2.8);
      if (sp.family === 'growlithe' || ['eevee', 'flareon', 'jolteon'].includes(key)) {
        for (let i = 0; i < 7; i++) ball(Math.sin(i) * 3.8, 10 + Math.cos(i) * 3, 3, 2, 2, 2, belly);
      }
      if (key === 'eevee') {
        for (let i = 0; i < 8; i++) { const a = i * Math.PI * 2 / 8; ball(Math.cos(a) * 3.9, 10.5 + Math.sin(a) * 2.2, 2.8, 1.8, 1.8, 1.8, belly); }
        ball(tail, 8.5, -9.8, 2.0, 2.1, 1.9, belly);
      }
      if (sp.family === 'growlithe') {
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ball(s * 4.5, 8, -4 + i * 2.4, 0.7, 1.7, 0.6, c.stripe || '#493530');
        if (key === 'growlithe') {
          spike(0, 17.2, 4.2, 0.85, 2.0, 0.85, belly);
          if (frame >= 6) { ball(0, 10.5, 8.8, 1.1, 1.1, 1.2, '#ff7030'); ball(0, 10.5, 9.3, 0.6, 0.6, 0.6, '#ffe850'); }
        }
        if (key === 'arcanine') {
          for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ball(Math.cos(a) * 4.0, 13 + Math.sin(a) * 2.8, 2.8, 2.0, 2.0, 2.0, c.fur || '#f0e0b0'); }
          spike(0, 19.5, 4.0, 1.1, 2.8, 1.1, c.fur || '#f0e0b0');
          for (const s of [-1, 1]) for (const b of [-1, 1]) ball(s * 3.4, 3.8, b * 3.5 + s * gait, 2.0, 1.1, 2.0, c.fur || '#f0e0b0');
          if (frame >= 6) { ball(0, 11.5, 8.8, 1.3, 1.3, 1.4, '#ff7030'); ball(0, 11.5, 9.4, 0.8, 0.8, 0.8, '#ffe060'); }
        }
      }
      if (key === 'flareon') {
        for (let i = 0; i < 5; i++) ball(tail * 0.6, 7.5 + i * 1.4, -6 - i * 1.1, 2.2 + i * 0.25, 2.5, 2.2, c.fur || '#fceda8');
        spike(0, 19, 4.5, 1.1, 2.1, 1.1, c.fur || '#fceda8');
      }
      if (key === 'jolteon') {
        for (let i = 0; i < 8; i++) { const a = i * Math.PI * 2 / 8; spike(Math.cos(a) * 4.2, 11, Math.sin(a) * 2.8, 1.0, 2.3, 1.0, WHITE, a); }
        for (const s of [-1, 1]) {
          spike(s * 4.0, 8, -3.2, 0.75, 2.4, 0.75, body, s * 0.5);
          spike(s * 3.4, 8.5, -5.0, 0.8, 2.5, 0.8, body, s * 0.45);
        }
      }
      if (key === 'umbreon') {
        for (const s of [-1, 1]) { ball(s * 3.2, 4, 3.3, 1.8, 0.6, 2, c.ring || '#edc94d'); ball(s * 3.8, 17, 3.7, 1.3, 0.6, 0.6, c.ring || '#edc94d'); }
        ball(0, 16.2, 7.2, 1.2, 0.9, 0.3, c.ring || '#edc94d');
        ball(tail, 7, -7, 1.5, 1.5, 1.5, c.ring || '#edc94d');
      }
      if (key === 'espeon') {
        ball(0, 15, 7.2, 0.8, 0.9, 0.5, '#d9547a');
        ball(-1.5 + tail, 7, -8, 0.7, 2.5, 0.7, body, -0.3);
        ball(1.5 + tail, 7, -8, 0.7, 2.5, 0.7, body, 0.3);
      }
      if (key === 'vaporeon') {
        spike(0, 18, 3, 1.2, 4, 2, c.fin || '#a6cce5');
        for (const s of [-1, 1]) {
          ball(s * 5.5, 13, 3, 2.5, 3, 0.7, c.fin || '#c2e6e5');
          ball(tail + s * 2.0, 5, -11, 2.0, 1.0, 2.5, c.fin || '#62a8d8', s * 0.35);
        }
        for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7; ball(Math.cos(a) * 3.6, 11, Math.sin(a) * 2.6, 1.5, 1.1, 1.3, WHITE); }
      }
      if (frame >= 6 && sp.family === 'eevee') {
        const eCol = key === 'vaporeon' ? '#68b8f8' : key === 'jolteon' ? '#ffe850' : key === 'flareon' ? '#ff7030' : key === 'espeon' ? '#f068b8' : key === 'umbreon' ? '#58c0e8' : '#ffd850';
        ball(0, 10.8, 8.8, 1.15, 1.15, 1.15, eCol);
      }
    }
  } else if (sp.family === 'oddish') {
    ball(0, 7, 0, 5.2, 5.8, 5); feet(); eyes(8, 4.5, 2.4, c.eye || '#b93b55');
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ball(Math.cos(a) * 4, 14 + Math.sin(t + i) * 0.5, Math.sin(a) * 4, 2.5, key === 'oddish' ? 4.5 : 1.8, 2.5, c.leaf || c.petal || '#67b053', Math.cos(a) * 0.5); }
    if (key !== 'oddish') {
      ball(0, 14, 0, 6.7, 2.4, 6.7, c.petal || c.flower || '#de6666');
      for (const s of [-1, 1]) ball(s * 3, 16, 1, 1, 0.4, 1, WHITE);
    }
    if (key === 'gloom') {
      ball(1.4, 5.5, 4.8, 0.5, 1.3, 0.5, '#e0a838');
      ball(1.4, 4.3, 4.8, 0.35, 0.45, 0.35, '#f8d050');
      ball(1.4, 3.4, 4.8, 0.25, 0.5, 0.25, '#ffe040');
    }
    if (key === 'vileplume') {
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ball(Math.cos(a) * 5.6, 14.8, Math.sin(a) * 5.6, 1.1, 0.3, 1.1, WHITE); }
      ball(0, 15.5, 0, 2.2, 1.2, 2.2, '#f0d040');
    }
    if (frame >= 6) { for (const s of [-1, 1]) ball(s * 3.8, 13.5, 3.8, 0.85, 0.85, 0.85, key === 'vileplume' ? '#f068b8' : '#ffe850'); }
  } else if (sp.family === 'gastly') {
    ball(0, 10, 0, 6.2, 6.5, 5.7); eyes(12, 5, 2.8, c.eye || '#d95065'); ball(0, 8, 5.7, 3.5, 1, 0.8, WHITE);
    for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7 + frame * 0.25; spike(Math.cos(a) * 5, 12 + Math.sin(a) * 4.8, -1, 2, 2.8, 2, c.gas || body, -a); }
    if (key === 'haunter') {
      for (const s of [-1, 1]) {
        spike(s * 6.4, 10.5, -0.5, 1.4, 2.6, 1.1, body, s * 1.1);
        ball(s * 6.0, 8.5 + gait, 4.2 + attack * 2.2, 1.6, 1.8, 1.2, body);
        for (let j = -1; j <= 1; j++) spike(s * 6.0 + j * 0.65, 6.8 + gait, 5.0 + Math.abs(j) * 0.35 + attack * 2.2, 0.32, 1.1, 0.32, body, s * 0.2);
      }
      ball(0, 7.6, 5.3, 3.4, 1.1, 0.5, '#35142a');
      for (let i = -2; i <= 2; i++) spike(i * 1.0, 7.6, 5.6, 0.3, 0.65, 0.25, WHITE);
    } else if (key === 'gengar') {
      for (const s of [-1, 1]) {
        spike(s * 3.6, 17.2, 0.3, 1.2, 2.4, 1.0, body, s * 0.22);
        spike(s * 3.5, 16.9, 0.8, 0.55, 1.5, 0.35, '#492265', s * 0.22);
        spike(s * 3.2, 12.5, -3.4, 0.85, 1.6, 0.85, body, s * 0.3);
        spike(s * 3.0, 9.2, -3.4, 0.85, 1.6, 0.85, body, s * 0.3);
      }
      for (let i = 0; i < 4; i++) spike(0, 14.5 - i * 2.0, -4.2, 1.0, 1.7, 1.0, body, -0.35);
      arms(); feet();
      ball(0, 7.8, 5.6, 3.8, 1.1, 0.5, '#401524');
      for (let i = -3; i <= 3; i++) ball(i * 0.85, 8.0, 5.9, 0.32, 0.5, 0.18, WHITE);
    } else if (key !== 'gastly') { arms(); }
    if (frame >= 6) { ball(0, 8.5, 6.6, 1.25, 1.25, 1.25, '#e04880'); ball(0, 8.5, 7.2, 0.65, 0.65, 0.65, '#58c0e8'); }
  } else if (sp.family === 'geodude') {
    if (key === 'golem') {
      ball(0, 8.5, 0, 6.4, 6.2, 5.8, c.shell || '#8d795e');
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI * 2 / 6;
        ball(Math.sin(a) * 4.6, 9 + Math.cos(a) * 4.0, -0.6, 2.0, 2.0, 2.2, c.shellD || '#6a5440');
      }
      ball(0, 10.5, 4.4, 3.0, 2.4, 2.8, c.skin || body);
      eyes(11, 6.8, 1.8, c.eye || '#d03028');
      ball(0, 9.6, 7.0, 1.6, 1.0, 1.2, c.skin || body);
      arms(c.skin || body); feet(false, c.skin || body);
      for (const s of [-1, 1]) {
        for (let j = -1; j <= 1; j++) {
          ball(s * 6.2 + j * 0.4, 6.8, 3.6, 0.3, 0.5, 0.5, WHITE);
          ball(s * 3.4 + j * 0.4, 1.4, 3.2 + s * gait, 0.3, 0.4, 0.5, WHITE);
        }
      }
    } else {
      ball(0, 9, 0, 6.3, 6.3, 5.4);
      eyes(11, 4.9, 2.6);
      if (key === 'graveler') {
        for (const s of [-1, 1]) {
          ball(s * 5.8, 10 + s * gait, 0.8 + attack * 2, 2.0, 3.4, 2.0, body, s * 0.4);
          ball(s * 3.8, 6.5, 3.6, 1.4, 2.0, 1.4, body, s * 0.2);
        }
        feet();
      } else {
        arms(body);
        for (const s of [-1, 1]) {
          ball(s * 2.6, 12.6, 5.0, 1.2, 0.45, 0.5, c.dark || '#5e5a55');
          ball(s * 7.2, 9.2 + attack * 2, 1.6 + attack * 2, 1.5, 1.5, 1.5, body);
        }
      }
    }
    if (frame >= 6) { for (const s of [-1, 1]) ball(s * 5.4, 9.5, 4.4, 0.9, 0.9, 0.9, '#ffd850'); }
  } else if (key === 'lapras') {
    ball(0, 6, -1, 6, 3.7, 7.2); ball(0, 9, -3, 5, 2.5, 5.5, c.shell || '#888fac');
    for (const s of [-1, 1]) {
      ball(s * 6, 3 + s * gait, s * gait * 1.5, 3.8, 0.8, 3, body, s * (0.2 + gait * 0.3));
      ball(s * 3, 11, -3, 1, 1.8, 1, WHITE);
      spike(s * 3.2, 21.5, 6.0, 0.55, 1.9, 0.55, body, s * 0.45);
    }
    ball(0, 13, 5, 2.8, 6, 2.8); ball(0, 11, 6.2, 1.9, 3.4, 0.9, belly); ball(0, 19, 6, 3.4, 3.2, 3.4); eyes(20, 8.5, 1.9); spike(0, 23.5, 7, 0.85, 2.2, 0.85, WHITE);
    if (frame >= 6) { ball(0, 18.5, 9.2, 1.2, 1.2, 1.4, '#68b8f8'); ball(0, 18.5, 9.8, 0.7, 0.7, 0.8, '#d8f4ff'); }
  } else {
    // Upright families have distinct ears, shells, tails, horns and armatures.
    const round = ['snorlax', 'jigglypuff', 'wigglytuff'].includes(key);
    ball(0, round ? 9 : 8, 0, round ? 7 : 4.5, round ? 7.6 : 5.5, round ? 5.5 : 3.7);
    if (!['jigglypuff', 'wigglytuff', 'machop', 'machoke', 'machamp'].includes(key)) ball(0, 8, round ? 4.5 : 3, round ? 5.5 : 3, round ? 5.5 : 3.8, 1.4, belly);
    feet(); arms(body, key === 'machamp');
    if (!round) ball(0, 16, 1.5, 5, 4.5, 4.2);
    if (key === 'snorlax') {
      ball(0, 13, 4.1, 4.4, 3.1, 1.6, belly);
      for (const side of [-1, 1]) {
        ball(side * 2.1, 14, 5.6, 1.1, 0.22, 0.3, INK);
        spike(side * 1.6, 10.8, 6.1, 0.4, 0.7, 0.3, WHITE);
        ball(side * 3.8, 2.6, 3.2, 2.1, 1.5, 2.4, belly);
        for (let j = -1; j <= 1; j++) spike(side * 3.8 + j * 0.6, 3.6, 4.8, 0.28, 0.65, 0.28, WHITE);
      }
    } else eyes(round ? 13 : 17, round ? 4.7 : 5.2, 2.6, c.eye || INK);
    ball(0, round ? 10 : 14.3, round ? 5.6 : 5.3, 1.3, 0.35, 0.35, INK);
    if (sp.family === 'pikachu') {
      ears(23, 4.7); for (const s of [-1, 1]) { spike(s * 4.2, 26, 2, 1.2, 2, 1.2, INK, -s * 0.22); ball(s * 4, 15, 4.5, 1.4, 1.2, 0.7, c.cheek || '#df5843'); if (frame >= 6) ball(s * 5.2, 15.2, 5.2, 0.85, 0.85, 0.85, '#ffe850'); }
      if (key === 'raichu') {
        ball(tail * 0.8, 6, -6, 0.6, 2.5, 0.6, '#6e432d', 0.5);
        ball(tail * 1.0 + 2, 9, -8, 0.5, 3.5, 0.5, '#6e432d', 0.3);
        ball(tail * 1.2 + 4, 14, -10, 0.5, 4.2, 0.5, '#6e432d', -0.3);
        ball(tail * 1.2 + 5.5, 18, -10, 2.2, 3.0, 0.5, '#f4cf42', 0.4);
        spike(tail * 1.2 + 6.6, 20.5, -10, 1.1, 2.4, 0.4, '#f4cf42', 0.2);
      } else {
        ball(tail, 8, -6, 1, 4, 1.2, c.tail || body, 0.6);
        ball(tail + 2, 12, -6, 3.4, 1.4, 1, c.tail || body, 0.4);
        ball(tail + 4, 15, -6, 1.6, 4, 1, c.tail || body, -0.4);
      }
    } else if (sp.family === 'squirtle') {
      ball(0, 9, -3, 5.4, 6, 2.8, c.shell || '#95683e'); ball(0, 9, -5, 3.7, 4.5, 1.3, c.shellD || '#664c38'); tailChain(body, 3);
      if (key === 'wartortle') ears(21, 3.2, c.ear || '#aac5e0');
      if (key === 'squirtle') {
        ball(tail, 6.2, -8.2, 2.1, 2.1, 1.8, body);
        ball(tail, 6.2, -9.2, 1.1, 1.1, 0.5, '#4878a0');
      }
      if (key === 'blastoise') {
        for (const s of [-1, 1]) {
          ball(s * 4.4, 14.8, -1.2, 1.9, 1.9, 1.2, c.shellD || '#664c38', s * 0.1);
          ball(s * 4.4, 15.2, 0.4 + attack * 0.6, 1.5, 1.5, 4.0, '#bcc6d2', s * 0.1);
          ball(s * 4.4, 15.2, 3.8 + attack * 0.6, 1.1, 1.1, 0.6, '#283542', s * 0.1);
          if (frame >= 6) {
            ball(s * 4.4, 15.2, 5.2, 1.2, 1.2, 1.6, '#68b8f8');
            ball(s * 4.4, 15.2, 6.2, 0.7, 0.7, 0.9, '#d8f4ff');
          }
        }
        for (let i = -2; i <= 2; i++) ball(i * 2.2, 11, 4.4, 0.75, 0.45, 0.5, '#eae0c8');
        ears(22, 2.2, '#6488a8');
      }
    } else if (sp.family === 'charmander' || key === 'dragonite') {
      tailChain(body, 6, 2.2);
      if (sp.family === 'charmander') {
        ball(tail, 10, -12, 2, 3 + (frame % 2), 2, c.flame2 || '#ec6133');
        ball(tail, 10, -12.8, 1.2, 2, 1, c.flame || '#ffd866');
        ball(tail, 10, -13.2, 0.5, 1.2, 0.5, WHITE);
        if (frame >= 6) {
          ball(0, 14.2, 7.6, 1.4, 1.2, 1.6, '#ff7030');
          ball(0, 14.2, 8.4, 0.8, 0.8, 1.0, '#ffe060');
        }
      }
      if (key === 'charizard') {
        for (const s of [-1, 1]) spike(s * 2.3, 22.5, 0.2, 0.7, 3.2, 0.7, body, s * 0.3);
        // Upright bat-like membranes, orange spars and distinct finger tips.
        const flap = walk ? Math.sin(t) * 1.3 : frame === 1 ? -0.65 : 0.65;
        for (const s of [-1, 1]) {
          ball(s * 7.6, 15.5 + flap, -3.2, 4.1, 4.8, 0.55, c.wing || '#4d9d9c', -s * 0.45);
          ball(s * 5.4, 13.1, -2.9, 0.6, 4, 0.6, body, -s * 0.5);
          ball(s * 8.8, 18.1 + flap, -3.1, 0.55, 4.5, 0.6, body, s * 0.65);
          for (let j = 0; j < 3; j++) {
            spike(s * (6.6 + j * 1.6), 12.8 + flap + j * 0.65, -3.0, 1.2, 3.4, 0.4, c.wing || '#4d9d9c', s * (0.25 + j * 0.3));
            ball(s * (6.2 + j * 1.5), 15.1 + flap + j * 0.8, -2.55, 0.22, 3.3, 0.2, body, s * (0.3 + j * 0.2));
          }
          spike(s * 7.3, 21 + flap, -3.1, 0.45, 1.0, 0.45, WHITE, s * 0.35);
        }
      } else if (key === 'dragonite') {
        wings(c.wing || '#4d9d9c', true); ears(21, 2.5);
        for (const s of [-1, 1]) spike(s * 1.8, 22.5, 3.5, 0.4, 2.6, 0.4, c.tail || body, s * 0.25);
        spike(0, 19, 7.2, 0.45, 1.1, 0.45, WHITE, 0.35);
        ball(0, 15, 6.8, 2.2, 1.5, 1.6, body);
        for (let i = 0; i < 4; i++) ball(0, 6 + i * 2.2, 4.1, 3.2 - i * 0.3, 0.4, 0.7, belly);
        if (frame >= 6) { ball(0, 15, 8.4, 1.3, 1.3, 1.4, '#ffd850'); ball(0, 15, 9.0, 0.7, 0.7, 0.8, '#68b8f8'); }
      }
    } else if (sp.family === 'jigglypuff' || key === 'snorlax') {
      ears(key === 'snorlax' ? 17 : key === 'wigglytuff' ? 22 : 18, key === 'wigglytuff' ? 5.2 : 2.5);
      if (key === 'jigglypuff') { ball(-1, 16.5, 4.4, 1.8, 2, 1.6, body); ball(-1.5, 17.5, 5, 1.1, 1.2, 1, body); }
      else if (key === 'wigglytuff') {
        ball(0, 16.5, 4.4, 1.5, 2.2, 1.3, body);
        ball(0, 7.5, 4.2, 4.5, 4.6, 1.4, WHITE);
        for (const s of [-1, 1]) spike(s * 3.8, 22, 2.5, 0.8, 3.4, 0.8, '#d46595', -s * 0.22);
      }
      if (frame >= 6) {
        if (key === 'snorlax') { ball(0, 10.5, 6.6, 1.35, 1.35, 1.35, '#ffd850'); ball(0, 10.5, 7.2, 0.7, 0.7, 0.7, '#ff7030'); }
        else { ball(0, 10, 5.7, 1.4, 1.1, 0.4, '#d82848'); ball(1.8, 12.5, 6.4, 0.75, 0.75, 0.75, '#f068b8'); }
      }
    } else if (sp.family === 'abra') {
      ears(22, 3); ball(0, 15, 6, 2.2, 1.8, 3); tailChain(body, 5);
      if (key !== 'abra') for (const s of key === 'alakazam' ? [-1, 1] : [1]) {
        ball(s * 7, 9, 4, 0.45, 3.2, 0.45, '#d0d8e8');
        ball(s * 7, 12.2, 4.6, 1.3, 1.6, 0.6, '#e2e8f4');
        if (frame >= 6) ball(s * 7, 12.6, 5.2, 0.9, 0.9, 0.9, '#f068b8');
      }
      if (key === 'alakazam') for (const s of [-1, 1]) {
        spike(s * 3.4, 13.5, 6.8, 0.55, 4.0, 0.45, belly, s * 0.45);
        spike(s * 4.6, 11, 7.2, 0.4, 3.2, 0.35, belly, s * 0.55);
        ball(s * 5.4, 12.5, 0.4, 1.8, 1.1, 1.6, c.armor || '#8a6448', s * 0.3);
      }
      if (key === 'kadabra') {
        ball(0, 18, 5.4, 0.7, 0.7, 0.25, '#d82838');
        for (let i = 0; i < 3; i++) ball(0, 7.5 + i * 1.3, 3.6, 2.4 - i * 0.2, 0.35, 0.5, c.armor || '#8a6448');
        ball(tail * 0.5, 6.2, -7.2, 2.1, 1.7, 1.9, '#c84048');
      }
      if (key === 'abra') {
        for (const s of [-1, 1]) ball(s * 4.8, 11.5, 0.4, 1.6, 0.9, 1.4, c.armor || '#8a6448');
        if (frame >= 6) ball(0, 12, 5.5, 1.1, 1.1, 1.1, '#f068b8');
      }
    } else if (sp.family === 'psyduck') {
      ball(0, 15, 6, 3.5, 1.5, 2.2, c.beak || '#edcd91');
      if (key === 'golduck') {
        spike(0, 21.5, 1.5, 0.55, 3.2, 2.2, c.beak || '#edcd91');
        ball(0, 18.5, 5.4, 0.75, 0.75, 0.4, '#d82848');
        for (const s of [-1, 1]) ball(s * 5.8, 9, 2.8, 2.0, 0.5, 2.0, c.beak || '#edcd91', s * 0.35);
      } else {
        for (let i = -1; i <= 1; i++) spike(i, 22, 1, 0.4, 1.8, 0.4, key === 'psyduck' ? INK : body);
      }
      if (frame >= 6) ball(0, 15.5, 7.8, 1.15, 1.15, 1.15, key === 'golduck' ? '#68b8f8' : '#f068b8');
    } else if (sp.family === 'cubone') {
      ball(0, 17, 2, 5.3, 4.7, 4.5, c.skull || WHITE);
      eyes(17, 6, 2.5);
      ball(0, 15, 7, 2.4, 1.5, 2, c.skull || WHITE);
      if (key === 'marowak') {
        spike(-2.4, 21.5, 0.8, 0.7, 3.0, 0.7, c.skull || WHITE, -0.3);
        spike(2.4, 21.5, 0.8, 0.7, 3.0, 0.7, c.skull || WHITE, 0.3);
        ball(6.8, 8.5, 3.6, 0.7, 4.2, 0.7, WHITE, -0.4);
        ball(6.8, 12, 3.6, 1.3, 1.1, 1.3, WHITE);
        ball(6.8, 5, 3.6, 1.3, 1.1, 1.3, WHITE);
      } else {
        ears(22, 2.8, c.skull || WHITE);
        ball(7, 8, 4, 1, 4, 1, WHITE, -0.4);
      }
      if (frame >= 6) ball(6.8, 10.5, 5.2, 0.95, 0.95, 0.95, '#d8f4ff');
    } else if (sp.family === 'machop') {
      for (let i = -1; i <= 1; i++) ball(i * 1.5, 21, 1, 0.6, 1.5, 3, c.ridge || '#a0adba');
      if (sp.stage > 1) {
        ball(0, 5.5, 0, 4.8, 1.5, 4, c.trunks || '#354555');
        ball(0, 5.8, 3.8, 1.4, 1.1, 0.5, c.belt || '#e1bb57');
        ball(0, 5.8, 4.2, 0.5, 0.5, 0.3, '#d82838');
        for (const s of [-1, 1]) {
          ball(s * 2.4, 5.8, 3.7, 0.65, 0.85, 0.3, c.belt || '#e1bb57');
          if (key === 'machoke') {
            for (let j = 0; j < 3; j++) ball(s * (4.2 + j * 0.5), 11.5 + j * 0.8, 2.0, 0.45, 1.1, 0.45, '#d03038', s * 0.3);
          }
        }
      }
      if (key === 'machamp') {
        for (const s of [-1, 1]) {
          ball(s * 5.0, 7.2 + gait, 1.8, 1.5, 2.5, 1.5, body, s * 0.3);
          ball(s * 5.4, 5.2 + gait, 3.0, 1.3, 1.3, 1.3, body);
        }
      }
      if (frame >= 6) { for (const s of [-1, 1]) ball(s * 5.4, 9.5, 4.8, 1.0, 1.0, 1.0, '#ff7030'); }
    } else if (key === 'scyther') {
      wings('#e1ecd4', true);
      spike(0, 22, 1.5, 1.2, 3.0, 1.5, body);
      for (const s of [-1, 1]) {
        spike(s * 7, 9, 4, 1.4, 5.2, 1.2, WHITE, s * 0.55);
        spike(s * 7.5, 7.5, 4.2, 0.6, 3, 0.5, '#bad4a8', s * 0.55);
        ball(s * 6.5, 6.5, 4.5, 0.4, 1.8, 0.4, '#eef8e0');
        if (frame >= 6) ball(s * 7.2, 8.5, 5.4, 0.65, 1.4, 0.65, '#d8f4ff', s * 0.55);
      }
      ears(22, 2);
      for (let i = 0; i < 3; i++) ball(0, 6 - i * 1.2, -2 - i * 1.4, 3.2 - i * 0.4, 2.4, 2.6, '#4a7a30');
    } else if (key === 'mew' || key === 'mewtwo') {
      ears(21, 2);
      if (key === 'mew') {
        for (let i = 0; i < 7; i++) ball(Math.sin(i * 0.5 + t * 0.2) * 2.0, 5 + i * 1.1, -3.2 - Math.cos(i * 0.4) * 2.2, 0.75 - i * 0.04, 0.75, 0.75, c.tail || body);
        ball(Math.sin(7 * 0.5 + t * 0.2) * 2.0, 13.5, -3.2 - Math.cos(7 * 0.4) * 2.2, 1.4, 1.4, 1.4, c.tail || body);
      } else {
        tailChain(c.tail || body, 6, 2.1);
        for (let i = 0; i < 5; i++) ball(0, 18 - i * 1.1, -1.5 + Math.sin(i * 0.6) * 1.1, 0.6, 0.6, 0.6, '#9674b0');
        ball(0, 11.5, 3.6, 3.6, 2.8, 1.2, '#c4b5d4');
        for (const s of [-1, 1]) for (let j = -1; j <= 1; j++) ball(s * 6.8 + j * 0.4, 7.2, 3.2 + Math.abs(j) * 0.25, 0.4, 0.6, 0.4, '#c4b5d4');
      }
      if (frame >= 6) {
        ball(0, 11.5, 5.8, 1.3, 1.3, 1.3, '#f068b8');
        ball(0, 11.5, 6.4, 0.7, 0.7, 0.7, '#d8f4ff');
      }
    }
  }
  // Species signatures: visible anatomy and surface markings, from every direction.
  const detail = c.spot || c.stripe || c.dark || INK;
  if (sp.family === 'bulbasaur') {
    for (const s of [-1, 1]) { ball(s * 2.2, 15.5, 6.4, 0.8, 0.6, 0.3, c.spot || '#32886e'); ball(s * 3.6, 10.8, 6.9, 0.35, 0.7, 0.25, WHITE); }
    ball(0, 10.1, 8.4, 2.2, 0.22, 0.25, INK);
  }
  if (sp.family === 'rattata') {
    ball(0, 10, 8.8, 1.1, 0.7, 0.6, '#a35b79');
    for (const s of [-1, 1]) {
      ball(s * 0.65, 8.7, 8.5, 0.6, 1.1, 0.4, WHITE);
      for (let i = 0; i < 2; i++) ball(s * 5, 10 + i, 6.4, 2.3, 0.15, 0.15, belly, s * (0.15 + i * 0.2));
      if (key === 'raticate') ball(s * 3.2, 10.2, 6.2, 1.3, 1.1, 1.1, belly);
    }
    if (key === 'rattata') ball(tail, 9.8, -9.2, 1.2, 1.2, 1.2, body);
    if (frame >= 6) ball(0, 9.2, 9.2, 1.0, 0.85, 0.85, '#ffe850');
  }
  if (sp.family === 'squirtle') {
    for (let i = 0; i < 3; i++) ball(0, 6 + i * 2.1, 4.3, 2.7 - Math.abs(i - 1) * 0.4, 0.15, 0.25, c.shell || '#ae8950');
    for (const s of [-1, 1]) ball(s * 4.6, 9, -3.5, 0.6, 5, 1.3, belly);
    if (key === 'wartortle') for (let i = 0; i < 5; i++) ball(tail + Math.sin(i) * 1.4, 5 + i * 0.7, -7 - i * 0.8, 1.8, 1.8, 1.5, c.ear || '#b6d4ed');
  }
  if (sp.family === 'charmander' || key === 'dragonite') {
    ball(0, 14.5, 5.4, 2.8, 1.6, 2.1); ball(0, 13.2, 6.6, 2.1, 0.2, 0.5, INK);
    for (const s of [-1, 1]) { ball(s * 1.1, 15.5, 7, 0.24, 0.24, 0.3, INK); for (let j = 0; j < 3; j++) ball(s * 3.3 + (j - 1) * 0.65, 1.3, 2.5 + s * gait, 0.3, 0.3, 0.9, WHITE); }
    if (key === 'charmeleon') {
      spike(0, 22, 0, 1.5, 2.3, 1.6);
      for (const s of [-1, 1]) spike(s * 5.3, 7.5, 3.5, 0.35, 1.0, 0.35, WHITE);
    }
    if (key === 'charizard') {
      for (const s of [-1, 1]) spike(s * 5.3, 7.5, 3.5, 0.4, 1.2, 0.4, WHITE);
    }
  }
  if (sp.family === 'pikachu') {
    for (const s of [-1, 1]) ball(s * 2.8, 9, -3.5, 1.8, 0.6, 0.5, c.stripe || '#975332');
    ball(0, 16, 5.85, 0.45, 0.3, 0.25, INK);
    if (key === 'raichu') {
      ball(0, 8, 3.8, 3.1, 4, 0.9, belly);
      for (const s of [-1, 1]) {
        ball(s * 4.8, 23, 2.5, 2.2, 1.2, 0.8, c.tail || '#efc461', s * 0.5);
        ball(s * 3.3, 1.8, 2.4, 1.4, 0.8, 2.0, '#7a4e32');
      }
    }
  }
  if (key === 'jolteon') for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; spike(Math.cos(a) * 4.5, 10 + Math.sin(a) * 3, 2, 1.3, 2.3, 1.3, belly, a - Math.PI / 2); }
  if (key === 'espeon') { ball(-2 + tail, 8, -10, 0.6, 3, 0.6, body, -0.4); ball(2 + tail, 8, -10, 0.6, 3, 0.6, body, 0.4); }
  if (key === 'vaporeon') for (let i = 0; i < 5; i++) spike(0, 11, -2 - i * 1.6, 0.6, 1.6, 1, c.fin || '#e2f5ee');
  if (key === 'umbreon') { ball(0, 15.5, 7.1, 1.3, 0.9, 0.3, c.ring || '#efcb4e'); ball(0, 15.5, 7.4, 0.65, 0.45, 0.15, body); }
  if (sp.family === 'abra' && key !== 'abra') for (const s of [-1, 1]) { ball(s * 3.5, 14.2, 7, key === 'alakazam' ? 3.5 : 2.5, 0.45, 0.5, belly, s * 0.28); ball(s * 4.6, 11, 0.4, 2.2, 1.2, 2, c.armor || '#a97b42'); }
  if (sp.family === 'machop') for (const s of [-1, 1]) { ball(s * 4.3, 11.8, 1.2, 2.4, 2.2, 2); if (sp.stage > 1) for (let j = 0; j < 2; j++) ball(s * 5.9, 10.5 + j * 1.1, 2.5, 1, 0.25, 0.3, detail); }
  if (key === 'dragonair') { ball(0, 14, 8, 1.6, 1.6, 0.8, c.orb || '#4a9ed2'); ball(tail, 4, -7.7, 1.8, 1.8, 1.8, c.orb || '#4a9ed2'); }
  if (bird) {
    for (const s of [-1, 1]) { ball(s * 2.9, 18.4, 4.6, 1.4, 0.45, 0.4, c.mask || '#584233', s * 0.2); for (let j = 0; j < 3; j++) ball(s * 3.3 + (j - 1) * 0.6, 1.5, 2, 0.3, 0.3, 1.3, c.beak || '#c89452'); }
    if (key === 'articuno') {
      for (let i = 0; i < 7; i++) ball(Math.sin(i * 0.7 + t * 0.15) * 2, 6 - i * 0.3, -5 - i * 1.3, 1.7, 0.6, 2.2, c.tail || '#539ecb');
      for (let i = -1; i <= 1; i++) spike(i * 1.4, 22.5, 2.8, 0.7, 2.3, 0.7, c.tail || '#539ecb', i * 0.25);
      ball(0, 12, 3.8, 2.6, 2.4, 1.2, '#cce8f8');
      if (frame >= 6) ball(0, 16, 8.2, 1.1, 1.1, 1.1, '#d8f4ff');
    }
    if (key === 'zapdos') {
      for (const s of [-1, 1]) for (let j = 0; j < 4; j++) spike(s * (6 + j * 1.6), 12 + gait * 2, -2 + j, 1.1, 3.2, 1.0, c.wing || body, s * (0.8 + j * 0.2));
      for (let i = -1; i <= 1; i++) spike(i * 1.2, 23, 2, 0.8, 2.8, 0.8, INK, i * 0.25);
      for (let i = -2; i <= 2; i++) spike(i * 0.8, 7.5, -5.5, 0.5, 2.2, 0.5, INK, i * 0.2);
      if (frame >= 6) ball(0, 16, 8.2, 1.2, 1.2, 1.2, '#ffe850');
    }
    if (key === 'moltres') {
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) spike(s * (7 + i), 12 + gait * 2, -2, 1, 2.6 + i * 0.4, 1, c.fire || '#ef763e', s * 0.8);
      for (let i = 0; i < 3; i++) spike(0, 21 + i * 1.4, 1.5 - i * 0.8, 1.0, 2.6, 1.0, '#ffd850');
      for (let i = 0; i < 4; i++) ball(tail * 0.5, 8 - i * 0.7, -5 - i * 1.3, 1.5 + (i % 2) * 0.3, 1.8, 1.5, c.fire || '#ef763e');
      if (frame >= 6) ball(0, 16, 8.2, 1.2, 1.2, 1.2, '#ff7030');
    }
    if (key === 'pidgeotto') {
      for (let i = -1; i <= 1; i++) ball(i * 1.1, 21.2, -1.2, 1.0, 0.65, 3.6, c.crest || '#dc6456');
    }
    if (key === 'pidgeot') {
      ball(0, 21, -2, 1.8, 0.7, 5, c.crest || '#dc6456');
      for (const s of [-1, 1]) ball(s * 1.2, 21.5, -2, 1.2, 0.6, 4.5, '#f4d048');
    }
  }
  if (key === 'lapras') for (let i = 0; i < 5; i++) { const a = i * 1.25; spike(Math.cos(a) * 3.8, 12, -3 + Math.sin(a) * 3.4, 1, 1.5, 1, c.shell || '#9399ad'); }
  // Evolution affects the whole silhouette, not just the accessory on its back.
  const breadth = key === 'venusaur' ? 1.16 : ['blastoise', 'arcanine', 'raticate', 'machamp'].includes(key) ? 1.12 : key === 'mewtwo' ? 0.86 : 1;
  const height = key === 'mewtwo' || key === 'marowak' ? 1.1 : key === 'raticate' ? 0.92 : 1;
  for (const p of parts) { p.p[0] *= breadth; p.r[0] *= breadth; p.p[1] *= height; p.r[1] *= height; }
  if (walk && (sp.family === 'voltorb' || key === 'gastly' || sp.family === 'magnemite' || key === 'metapod')) {
    const angle = gait * (sp.family === 'voltorb' ? 0.2 : 0.08);
    for (const p of parts) {
      const x = p.p[0], y = p.p[1] - 9;
      p.p[0] = x * Math.cos(angle) - y * Math.sin(angle);
      p.p[1] = 9 + x * Math.sin(angle) + y * Math.cos(angle);
      p.rot += angle;
    }
  }
  return parts;
}

/** Material responds to the species, while tiny facial details remain clean. */
export function speciesMaterial(key: string): Material {
  const sp = SPECIES[key];
  if (sp.types.includes('steel')) return 'metal';
  if (['onix', 'geodude', 'graveler', 'golem'].includes(key)) return 'stone';
  if (['squirtle', 'lapras', 'voltorb'].includes(sp.family)) return 'shell';
  if (sp.types.includes('ice')) return 'ice';
  if (sp.types.includes('dragon') || sp.types.includes('water')) return 'scales';
  if (sp.types.includes('grass')) return 'leaf';
  if (['eevee', 'growlithe', 'vulpix', 'ponyta', 'rattata', 'pikachu', 'meowth', 'mankey', 'pidgey'].includes(sp.family) || ['mareep', 'swinub', 'houndour', 'entei', 'raikou'].includes(key)) return 'fur';
  return 'smooth';
}
export function renderMon3D(key: string, shiny = false, direction = 1, frame = 0, res = MON_RES): PixelArt {
  const sp = SPECIES[key];
  const material = speciesMaterial(key);
  const parts = modelParts(key, shiny, frame).map(p => ({ ...p, material: p.material || (EMISSIVE_COLORS.has(p.color) ? 'energy' as Material : Math.max(...p.r) <= 1.7 ? 'smooth' as Material : undefined) }));
  return renderSolids(parts, { width: Math.round(64 * res), height: Math.round(64 * res), pixelScale: 1.52 * res, yaw: direction * Math.PI / 4,
    material, rocky: ['onix', 'geodude', 'graveler', 'golem', 'metapod'].includes(key),
    metallic: sp.types.includes('steel') || key === 'onix', glossy: sp.types.includes('water') || sp.family === 'voltorb' || sp.types.includes('dragon'),
    ghost: sp.types.includes('ghost'), shiny });
}

export function monSheet(key: string, shiny = false, direction = 1): HTMLCanvasElement {
  const sheet = document.createElement('canvas'); sheet.width = MON_FRAME * MON_POSES; sheet.height = MON_FRAME;
  const ctx = sheet.getContext('2d')!;
  for (let frame = 0; frame < MON_POSES; frame++) ctx.drawImage(renderMon3D(key, shiny, direction, frame).toCanvas(), frame * MON_FRAME, 0);
  return sheet;
}
