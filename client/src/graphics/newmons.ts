// Especies añadidas en la 2.6/2.7: paletas (normal y shiny) y modelos 3D articulados.
// Usan el mismo sistema que mon3d.ts (esferas y conos con pose por fotograma); mon3d las consulta primero.
import { ART } from './pokemonArt';

type V = [number, number, number];
export type Part = { p: V; r: V; color: string; rot: number; cone: boolean };
type Pal = Record<string, string>;
const WHITE = '#fff5df', INK = '#182035';

const PALS: Record<string, { pal: Pal; shiny: Pal }> = {
  mareep: { pal: { body: '#f4f0e4', skin: '#6aa8e0', horn: '#f0c848', orb: '#f8d040' }, shiny: { body: '#f4b8d8', skin: '#e090c0', horn: '#f0c848', orb: '#f8d040' } },
  hoppip: { pal: { body: '#f08cb0', leaf: '#68c050', belly: '#f8c0d4' }, shiny: { body: '#a8e070', leaf: '#f4d050', belly: '#d8f4b0' } },
  wooper: { pal: { body: '#68b8e8', belly: '#a8d8f4', gill: '#9060b8' }, shiny: { body: '#f0a0c8', belly: '#f8d0e4', gill: '#5878c8' } },
  murkrow: { pal: { body: '#283058', hat: '#1c2244', beak: '#f0c040', belly: '#c83848' }, shiny: { body: '#6a4aa0', hat: '#4a3080', beak: '#f0c040', belly: '#e07070' } },
  misdreavus: { pal: { body: '#4a5a8a', frill: '#c03878', gem: '#e04880' }, shiny: { body: '#e8d060', frill: '#68b0d8', gem: '#4890e8' } },
  sneasel: { pal: { body: '#283048', belly: '#f0c8a0', feather: '#d83848', claw: '#f4f4f4', gem: '#f0d040' }, shiny: { body: '#d880b8', belly: '#f8e0c8', feather: '#f0c040', claw: '#f4f4f4', gem: '#58c0f0' } },
  swinub: { pal: { body: '#a0724a', fur: '#c89870', nose: '#f0b8a8', stripe: '#6a4428' }, shiny: { body: '#68b048', fur: '#98d070', nose: '#f0b8a8', stripe: '#3a7a2a' } },
  houndour: { pal: { body: '#2a2a3a', belly: '#c86838', bone: '#e8e0d0', horn: '#d8d0c8' }, shiny: { body: '#4a6aa0', belly: '#d8a048', bone: '#e8e0d0', horn: '#d8d0c8' } },
  togepi: { pal: { body: '#f8f0c8', shell: '#fbfaf2', red: '#e05048', blue: '#5888d8' }, shiny: { body: '#f8d8a8', shell: '#fbfaf2', red: '#58c058', blue: '#e0a038' } },
  raikou: { pal: { body: '#f0c838', stripe: '#3a3048', mane: '#7a68b8', cloud: '#d0d4e8', face: '#f8e8b0' }, shiny: { body: '#f0e8a0', stripe: '#3a3048', mane: '#a890d8', cloud: '#e8e8f8', face: '#fff8d8' } },
  entei: { pal: { body: '#a0582e', mane: '#f0e8d8', face: '#6a3018', crest: '#d8c890', fire: '#f07838' }, shiny: { body: '#c87a40', mane: '#f8d878', face: '#7a4020', crest: '#f0e0a0', fire: '#f0a040' } },
  suicune: { pal: { body: '#68c0e8', mane: '#a888d0', diamond: '#f4f8ff', crest: '#e8f0f8', ribbon: '#f4f4fa' }, shiny: { body: '#58a0b8', mane: '#d0a8e0', diamond: '#f4f8ff', crest: '#e8f0f8', ribbon: '#f4f4fa' } },
  lugia: { pal: { body: '#f0f2f8', belly: '#d8dcec', plate: '#4a5a98', wing: '#e8ecf6', eye: '#3a6ab8' }, shiny: { body: '#f4e0e8', belly: '#e8c8d4', plate: '#c84a6a', wing: '#f4e8ec', eye: '#3a6ab8' } },
  hooh: { pal: { body: '#e85040', belly: '#f8e8a0', wing: '#f0a030', tail: '#58b860', crest: '#f8d040', beak: '#f8d040' }, shiny: { body: '#f0c040', belly: '#fff4c0', wing: '#f8e080', tail: '#e8e8f0', crest: '#f8f0a0', beak: '#e0a020' } },
  rayquaza: { pal: { body: '#3aa860', ring: '#f0d040', mark: '#d84848', belly: '#2a8048' }, shiny: { body: '#2a2a38', ring: '#f0d040', mark: '#d84848', belly: '#1a1a24' } },
  celebi: { pal: { body: '#a8d868', wing: '#e0f4f8', eye: '#3a7ab8', ant: '#4a8838' }, shiny: { body: '#f0a0c8', wing: '#f8e8f4', eye: '#c03860', ant: '#c05890' } },
  jirachi: { pal: { body: '#f4f4f0', star: '#f8d850', ribbon: '#68b8e8', tag: '#f0e8a8' }, shiny: { body: '#f4f4f0', star: '#f8a040', ribbon: '#e878b0', tag: '#f8e0c0' } },
  darkrai: { pal: { body: '#28283a', cloak: '#1a1a2a', collar: '#c83848', hair: '#f0f0f4', eye: '#58c0e8' }, shiny: { body: '#3a2a4a', cloak: '#2a1a3a', collar: '#e8e8f0', hair: '#c84868', eye: '#f0d040' } },
};

// Registro en el catálogo de arte (las listas, la Pokédex y los iconos lo consultan).
for (const [key, p] of Object.entries(PALS)) {
  if (!ART[key]) ART[key] = { pal: p.pal, shiny: p.shiny, draw(g, c) { g.ell(16, 18, 8, 9, Object.values(c)[0]); g.shadeAll(); } };
}

export function hasExtraModel(key: string) { return key in PALS; }

export function extraParts(key: string, shiny: boolean, frame: number): Part[] {
  const c = { ...PALS[key].pal, ...(shiny ? PALS[key].shiny : {}) };
  const body = c.body;
  const parts: Part[] = [];
  const walk = frame >= 2 && frame < 6;
  const t = walk ? (frame - 2) / 4 * Math.PI * 2 : frame * Math.PI;
  const gait = walk ? Math.sin(t) : 0;
  const breath = frame === 1 ? 0.45 : 0;
  const attack = frame >= 6 ? (frame === 6 ? 1 : 0.4) : 0;
  const tail = Math.sin(t + 0.7) * (walk ? 2 : 0.8);
  const flap = (walk ? Math.sin(t) : frame === 1 ? -0.55 : 0.55) * 0.7;
  const bob = Math.sin(t) * 0.8;
  const ball = (x: number, y: number, z: number, rx: number, ry: number, rz: number, color = body, rot = 0) => parts.push({ p: [x, y + breath, z + attack], r: [rx, ry, rz], color, rot, cone: false });
  const spike = (x: number, y: number, z: number, rx: number, ry: number, rz: number, color = body, rot = 0) => parts.push({ p: [x, y + breath, z + attack], r: [rx, ry, rz], color, rot, cone: true });
  const eyes = (y: number, z: number, gap = 2.6, color = INK) => {
    for (const side of [-1, 1]) {
      ball(side * gap, y, z, 1.15, 1.65, 0.65, WHITE);
      ball(side * gap, y, z + 0.55, 0.8, frame === 1 ? 0.28 : 1.18, 0.35, color);
      if (frame !== 1) ball(side * gap - 0.18, y + 0.45, z + 0.85, 0.22, 0.3, 0.2, WHITE);
    }
  };
  const legs4 = (color = body, h = 2.5, spread = 3.3, len = 3.6, rad = 2) => {
    for (const side of [-1, 1]) for (const back of [-1, 1]) ball(side * spread, h + Math.max(0, side * back * gait), back * len + side * gait, rad, rad * 1.5, rad * 1.3, color);
  };
  const feet2 = (color = body, spread = 3.3) => { for (const side of [-1, 1]) ball(side * spread, 2.4 + Math.max(0, side * gait), side * gait + 0.6, 2, 1.8, 2.6, color); };
  const wings = (color: string, span = 6, y = 12, feathers = 3, big = false) => {
    for (const side of [-1, 1]) {
      ball(side * (span + 0.5), y + flap * 2, -1, span, 1.1, big ? 5 : 3.8, color, side * flap);
      for (let j = 0; j < feathers; j++) spike(side * (span * 1.6), y - 1 + flap * 4, -2 + j * 2, 1.3, big ? 6 : 4, 1.2, color, side * (1.05 + flap));
    }
  };

  switch (key) {
    // ---------------------------------------------------------------- cuadrúpedos
    case 'mareep': {
      for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; ball(Math.cos(a) * 3.2, 8 + Math.sin(a) * 2.2, -1 + Math.sin(a * 2) * 1.5, 3.2, 3.2, 3.2, body); }
      legs4(c.skin, 2.5, 2.8, 3.2, 1.4);
      ball(0, 10, 5, 3, 3, 3, c.skin); eyes(11, 7.6, 1.8);
      for (const s of [-1, 1]) { spike(s * 3.2, 13, 4, 0.9, 1.8, 0.9, c.horn, s * 0.9); ball(s * 3.6, 10, 4.5, 1.6, 0.8, 0.6, c.skin, s * 0.5); }
      ball(tail, 7, -6.5, 0.9, 0.9, 2.6, c.skin);
      for (let i = 0; i < 2; i++) ball(tail * (0.6 + i * 0.35), 7.1, -5.8 - i * 1.3, 0.98, 0.98, 0.55, INK);
      ball(tail * 1.3, 7.5, -9, 1.6, 1.6, 1.6, c.orb);
      if (frame >= 6) {
        for (const s of [-1, 1]) {
          ball(tail * 1.3 + s * 2.1, 8.2, -9, 0.65, 0.65, 0.65, '#ffe850');
          ball(s * 3.5, 14.5, 4.2, 0.55, 0.55, 0.55, '#ffe850');
        }
      }
      break;
    }
    case 'swinub': {
      ball(0, 7, 0, 5.4, 4.8, 5.6, c.fur);
      for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10; spike(Math.cos(a) * 4.2, 9 + Math.sin(a) * 2, Math.sin(a) * 4, 1.2, 2.6, 1.2, c.body, a); }
      for (const s of [-1, 1]) {
        ball(s * 2.8, 2, 2 * s * gait, 1.3, 1.6, 1.3, c.stripe);
        ball(s * 1.9, 7.7, 5.1, 0.85, 0.28, 0.3, INK);
      }
      ball(0, 6, 5.2, 2.2, 1.6, 1.5, c.nose); ball(0, 6.2, 6.4, 1.1, 0.6, 0.3, INK);
      ball(0, 9.8, -0.5, 4.5, 0.6, 2.0, c.stripe);
      ball(0, 9.2, -3.2, 3.8, 0.55, 1.6, c.stripe);
      ball(tail * 0.4, 5.8, -5.8, 1.2, 1.0, 1.2, c.fur);
      if (frame >= 6) {
        ball(0, 6.2, 7.4, 1.1, 1.0, 1.1, '#d8f4ff');
        ball(0, 6.5, 8.0, 0.6, 0.6, 0.6, '#68b8f8');
      }
      break;
    }
    case 'houndour': {
      ball(0, 8, -1, 3.8, 3.4, 5.6, body); legs4(body, 2.6, 2.8, 3.4, 1.4);
      for (const s of [-1, 1]) for (const b of [-1, 1]) ball(s * 2.8, 4.6, b * 3.4 + s * gait, 1.6, 0.6, 1.6, c.bone);
      ball(0, 13, 4.2, 3.6, 3.2, 3.4, body); ball(0, 11.8, 6.6, 1.9, 1.4, 1.8, c.belly); eyes(13.8, 6.8, 2.1, '#d84040');
      for (const s of [-1, 1]) spike(s * 2.4, 16.6, 3, 0.8, 2.4, 0.8, c.horn, s * 0.5);
      ball(0, 9.5, 2.6, 2.6, 1.6, 1.4, c.bone);
      for (let i = 0; i < 2; i++) ball(0, 10.6, 0.5 - i * 2.0, 3.9, 0.45, 0.55, c.bone);
      if (frame >= 6) {
        ball(0, 11.6, 8.2, 1.2, 1.1, 1.3, '#ff7030');
        ball(0, 11.6, 8.8, 0.65, 0.65, 0.65, '#ffe850');
      }
      for (let i = 0; i < 4; i++) ball(tail * i / 4, 9 + i * 0.6, -6 - i * 1.5, 0.6, 0.6, 1, body);
      spike(tail, 11.6, -11.5, 0.7, 2.2, 0.7, body, -0.6);
      break;
    }
    case 'raikou': case 'entei': case 'suicune': {
      const beast = key;
      ball(0, 11, -1, 5.4, 4.6, 7.6, body);
      legs4(body, 3.4, 3.8, 4.6, 2.2);
      for (const s of [-1, 1]) for (const b of [-1, 1]) {
        ball(s * 3.8, 1.6, b * 4.6 + s * gait + 1, 1.8, 0.8, 2.2, beast === 'entei' ? c.face : WHITE);
        if (beast === 'entei') ball(s * 3.8, 3.8, b * 4.6 + s * gait, 2.1, 0.65, 2.1, '#484858');
      }
      ball(0, 17, 6, 4, 3.6, 4.2, beast === 'entei' ? c.face : body); eyes(18, 9.2, 2.3, beast === 'suicune' ? '#c83848' : INK);
      if (beast === 'raikou') {
        for (let i = 0; i < 6; i++) ball(Math.sin(i) * 1.5, 15 - i * 0.4, -3 - i * 1.8, 4.2 - i * 0.3, 2.6, 2, c.cloud);
        for (const s of [-1, 1]) { for (let j = 0; j < 3; j++) ball(s * 5.2, 10, -4 + j * 3, 0.5, 2.6, 1, c.stripe, s * 0.3); spike(s * 2.8, 15, 9.5, 0.6, 1.8, 0.6, WHITE, s * 1.6); ball(s * 3.2, 17.2, 8.8, 1.2, 0.9, 0.7, WHITE); }
        for (let i = 0; i < 5; i++) spike(Math.sin(i * 1.3) * 3, 19 + i * 0.4, 2 - i * 1.6, 1.3, 3.2, 1.3, c.mane, -0.4);
        ball(0, 17, 10, 2.4, 1.6, 1.4, c.face);
        ball(0, 18.8, 9.8, 1.1, 1.2, 0.5, '#58a8e8');
        spike(tail, 13, -11, 1, 4, 1, '#58a8e8', -0.9);
        ball(tail * 1.2, 14.5, -13, 1.1, 1.1, 0.6, '#ffe850');
      } else if (beast === 'entei') {
        for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; ball(Math.cos(a) * 4.8, 15 + Math.sin(a) * 3, 2.6, 2.4, 2.4, 2.4, c.mane); }
        ball(0, 22, 5, 3.6, 1.8, 2.6, c.crest); for (const s of [-1, 1]) { spike(s * 3, 23, 4, 1, 2.8, 1, c.crest, s * 0.5); ball(s * 3.6, 17.5, 7.6, 0.6, 1.4, 1.2, '#d83838'); }
        for (let i = 0; i < 6; i++) spike(Math.sin(t + i) * 0.6, 15 + (frame % 2) * 0.6, -1 - i * 1.6, 1.4, 3.6 + (i % 2), 1.4, c.fire, -0.3);
        ball(tail, 12, -8.5, 2.4, 2, 2.4, c.mane);
      } else {
        for (let i = 0; i < 6; i++) ball(Math.sin(t * 0.5 + i) * 1.4, 17 - i * 0.6, -1 - i * 1.9, 2.8 - i * 0.2, 1.8, 2.4, c.mane);
        spike(0, 23, 6, 1.2, 3.2, 1.2, c.crest, 0.4);
        for (const s of [-1, 1]) spike(s * 1.6, 21.8, 5.8, 0.7, 2.4, 0.7, c.crest, s * 0.35);
        ball(0, 19.5, 8.5, 1.6, 1.4, 0.8, c.diamond);
        for (const s of [-1, 1]) { ball(s * 6.5, 10 + flap, -6, 1.2, 1, 5.5, c.ribbon, s * 0.6); ball(s * 4.5, 12, 2, 1.8, 1.4, 1.2, c.diamond); ball(s * 4.8, 10.5, -2.5, 1.2, 1.0, 1.0, c.diamond); }
      }
      if (frame >= 6) {
        ball(0, 16.5, 10.6, 1.3, 1.3, 1.3, beast === 'raikou' ? '#ffe850' : beast === 'entei' ? '#ff7030' : '#68b8f8');
        ball(0, 16.5, 11.2, 0.7, 0.7, 0.7, beast === 'suicune' ? '#d8f4ff' : '#ffe850');
      }
      break;
    }
    // ---------------------------------------------------------------- bípedos
    case 'wooper': {
      ball(0, 8, 0, 4.8, 5.4, 4.6, body); ball(0, 7, 3.2, 3.4, 3.6, 1.6, c.belly);
      for (let i = 0; i < 3; i++) ball(0, 5.5 + i * 1.15, 4.4, 2.1 - i * 0.28, 0.25, 0.3, shiny ? '#5878c8' : '#285898');
      feet2(body, 2.4);
      eyes(10.5, 4.3, 2.6); ball(0, 8.5, 4.6, 2.2, 0.38, 0.4, INK);
      for (const s of [-1, 1]) for (let j = 0; j < 3; j++) spike(s * (5 + j * 0.6), 11.5 - j * 1.4 + flap * 0.5, -0.5, 0.6, 1.6, 0.6, c.gill, s * (1.2 + j * 0.15));
      ball(tail, 5, -5.5, 2.8, 2.6, 1.6, c.belly);
      if (frame >= 6) {
        ball(0, 8.5, 6.2, 1.2, 1.2, 1.2, '#68b8f8');
        ball(0, 8.8, 6.8, 0.6, 0.6, 0.6, '#d8f4ff');
      }
      break;
    }
    case 'sneasel': {
      ball(0, 9, 0, 3.6, 4.6, 3.2, body); ball(0, 8.5, 2.2, 2.6, 3.2, 1.4, c.belly);
      feet2(body, 2.2);
      ball(0, 15.5, 1.4, 3.6, 3.4, 3.2, body); eyes(16.4, 4.2, 1.9, '#d84040'); ball(0, 13.6, 3.4, 1.6, 1, 1, c.belly);
      for (const s of [-1, 1]) {
        spike(s * 2.8, 19.4, 0.4, 0.9, 2.8, 0.7, body, s * 0.25);
        ball(s * 4.6, 10 + s * gait + attack * 2, 1 + attack * 3, 1.3, 3, 1.3, body, s * 0.4);
        for (let j = -1; j <= 1; j++) spike(s * 5.2 + j * 0.5, 7.4 + attack * 2, 2.4 + attack * 3, 0.3, 1.6, 0.3, c.claw, s * 0.3 + Math.PI);
        if (frame >= 6) ball(s * 5.2, 7.8 + attack * 2, 3.4 + attack * 3, 0.85, 0.85, 0.85, '#d8f4ff');
      }
      // Pluma roja asimétrica icónica en la oreja izquierda + gemas doradas en frente y pecho
      spike(-2.8, 20.5, -0.2, 1.0, 3.6, 0.8, c.feather, -0.45);
      ball(0, 17.6, 4.1, 0.65, 0.85, 0.35, c.gem);
      ball(0, 11.4, 3.3, 0.85, 0.95, 0.4, c.gem);
      for (let i = -1; i <= 1; i++) spike(i * 1.1 + tail * 0.5, 5.5 + (1 - Math.abs(i)) * 0.8, -3.8 - Math.abs(i) * 0.4, 0.65, 2.4, 0.65, c.feather, i * 0.25 - 1.0);
      break;
    }
    case 'togepi': {
      ball(0, 6, 0, 4.8, 5.2, 4.6, c.shell);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI * 2 / 6;
        ball(Math.cos(a) * 4.5, 6 + (i % 2) * 2, Math.sin(a) * 4.2, 1.25, 1.45, 0.8, i % 2 ? c.red : c.blue);
        ball(Math.cos(a) * 4.7, 6 + (i % 2) * 2, Math.sin(a) * 4.4, 0.55, 0.65, 0.45, c.shell);
      }
      for (let i = 0; i < 6; i++) spike((i - 2.5) * 1.6, 9.6, 3.2 - Math.abs(i - 2.5) * 0.7, 0.9, 1.4, 0.8, c.shell, 0);
      ball(0, 12.5, 0.5, 3.6, 3.2, 3.4, body); eyes(12.8, 3.3, 1.6);
      for (const s of [-1, 1]) ball(s * 2.4, 11.8, 3.1, 0.55, 0.38, 0.3, '#f498a8');
      for (let i = -2; i <= 2; i++) spike(i * 0.9, 16, 0, 0.6, 1.6 + (2 - Math.abs(i)) * 0.4, 0.6, body, i * 0.25);
      for (const s of [-1, 1]) { ball(s * 4.2, 11.5 + s * gait, 1, 1.1, 1.3, 1.1, body); ball(s * 2.4, 1.6, 1.5 + s * gait, 1.4, 1, 1.6, body); }
      if (frame >= 6) {
        for (const s of [-1, 1]) ball(s * 4.6, 13.5, 2.4, 0.75, 0.75, 0.75, s < 0 ? '#f068b8' : '#ffe850');
      }
      break;
    }
    case 'celebi': {
      const hover = 4 + Math.sin(t) * 0.7;
      ball(0, hover + 5, 0, 2.6, 3.6, 2.4, body); ball(0, hover + 11, 1, 3.8, 3.6, 3.4, body);
      eyes(hover + 11.5, 3.8, 1.8, c.eye);
      for (const s of [-1, 1]) {
        spike(s * 1.6, hover + 15.8, -0.4, 0.5, 2.4, 0.5, c.ant, s * 0.3); ball(s * 2.1, hover + 18.2, -0.2, 0.8, 0.8, 0.8, c.eye);
        ball(s * 4.6, hover + 8 + flap * 2, -1.6, 3.4, 1.2, 2, c.wing, s * (0.6 + flap)); ball(s * 2.4, hover + 6, 1.2, 0.9, 1.6, 0.9, body);
        ball(s * 1.3, hover + 1.2, 0.8, 0.9, 1.4, 1.1, body);
      }
      ball(0, hover + 14, -2, 3.2, 1.2, 2.6, body);
      if (frame >= 6) {
        ball(0, hover + 6.5, 3.4, 1.1, 1.1, 1.1, '#ffe850');
        ball(0, hover + 6.5, 4.0, 0.6, 0.6, 0.6, '#d8f4ff');
      }
      break;
    }
    case 'jirachi': {
      const hover = 4 + Math.sin(t) * 0.7;
      ball(0, hover + 5, 0, 3, 3.6, 2.8, c.body); ball(0, hover + 11, 0.6, 4, 3.6, 3.6, c.body);
      eyes(hover + 11.2, 3.8, 1.7);
      for (let i = 0; i < 3; i++) { const a = -0.7 + i * 0.7; spike(Math.sin(a) * 5.4, hover + 15.5 + Math.cos(a) * 1.2, 0, 1.6, 3.2, 0.7, c.star, a); ball(Math.sin(a) * 5.4, hover + 16.8, 0.8, 0.7, 1.4, 0.3, c.tag); }
      for (const s of [-1, 1]) {
        ball(s * 3.6, hover + 6 + flap, -1.6, 0.8, 3.8, 0.5, c.ribbon, s * 0.8);
        ball(s * 3.4, hover + 7.2, 1.4, 0.9, 1.8, 0.9, c.body, s * 0.4); ball(s * 1.2, hover + 1.4, 0.6, 0.9, 1.6, 1.1, c.body);
      }
      ball(0, hover + 5, 2.6, 1.6, frame >= 6 ? 1.1 : 0.4, 0.3, frame >= 6 ? '#483068' : '#c8c8d8');
      if (frame >= 6) {
        ball(0, hover + 5, 2.85, 0.65, 0.65, 0.25, '#ffe850');
        ball(0, hover + 8.5, 4.4, 0.9, 0.9, 0.9, '#d8f4ff');
      }
      break;
    }
    case 'darkrai': {
      const hover = 3 + Math.sin(t) * 0.6;
      for (let i = 0; i < 5; i++) ball(Math.sin(t * 0.5 + i) * 0.6, hover + 2 + i * 2.2, -0.4, 2.6 + i * 0.5, 1.6, 2.4 + i * 0.3, c.cloak);
      ball(0, hover + 13.5, 1.2, 4.2, 2.4, 2.4, c.collar);
      ball(0, hover + 17, 1, 3, 3.4, 2.8, c.body); eyes(hover + 16.6, 3.6, 1.3, c.eye);
      for (let i = 0; i < 6; i++) ball(-1 + Math.sin(i + t * 0.5) * 0.8, hover + 20 + i * 0.3, -1 - i * 0.9, 3.4 - i * 0.35, 1.8, 2.2, c.hair, -0.4);
      for (const s of [-1, 1]) { ball(s * 5.2, hover + 11 + attack * 2, attack * 3, 1, 4, 1, c.body, s * 0.3); spike(s * 4.2, hover + 18.6, -0.4, 0.6, 2.6, 0.6, c.collar, s * 0.9); }
      if (frame >= 6) {
        ball(0, hover + 12, 4.8, 1.3, 1.3, 1.3, '#e04880');
        ball(0, hover + 12, 5.4, 0.65, 0.65, 0.65, '#58c0e8');
      }
      break;
    }
    // ---------------------------------------------------------------- flotantes
    case 'hoppip': {
      const hover = 3 + Math.sin(t) * 1.2;
      ball(0, hover + 6, 0, 4.6, 4.2, 4.4, body); ball(0, hover + 5, 2.6, 3, 2.4, 1.6, c.belly); eyes(hover + 6.6, 4, 2.2);
      for (const s of [-1, 1]) { ball(s * 4.8, hover + 4, 0.5, 1.4, 1.2, 1.4, body); ball(s * 1.8, hover + 1.6, 0.6, 1.1, 1, 1.2, body); }
      ball(tail * 0.4, hover + 5, -4.4, 1.1, 0.9, 1.2, body);
      spike(0, hover + 11, 0, 0.4, 1.6, 0.4, c.leaf);
      for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + t * 0.8; ball(Math.cos(a) * 2.6, hover + 12.4, Math.sin(a) * 2.6, 2.4, 0.5, 1.4, c.leaf, a); }
      if (frame >= 6) {
        for (const s of [-1, 1]) ball(s * 3.8, hover + 10.5, 2.2, 0.75, 0.75, 0.75, '#ffe850');
      }
      break;
    }
    case 'misdreavus': {
      const hover = 4 + Math.sin(t) * 1;
      ball(0, hover + 9, 0, 4.6, 4.6, 4.4, body); eyes(hover + 10, 3.8, 2, '#d03850');
      for (let i = 0; i < 7; i++) {
        const a = -1.2 + i * 0.4;
        spike(Math.sin(a) * 4.2, hover + 15 + Math.cos(a) * 0.6, -2 + Math.cos(a) * 1.6, 1.2, 3, 1.2, body, a * 0.6);
        ball(Math.sin(a) * 4.8, hover + 17.2 + Math.cos(a) * 0.5, -2.2 + Math.cos(a) * 1.6, 0.75, 0.95, 0.75, c.frill);
      }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI * 2 / 6 + t * 0.3; ball(Math.cos(a) * 4, hover + 4.6, Math.sin(a) * 4, 1.6, 2.4, 1.6, body); }
      for (let i = -2; i <= 2; i++) ball(i * 1.35, hover + 6.5 - Math.abs(i) * 0.15, 4.2 - Math.abs(i) * 0.35, 0.78, 0.78, 0.55, c.gem);
      ball(0, hover + 13.4, 2.6, 4.4, 0.6, 2, c.frill);
      if (frame >= 6) {
        ball(0, hover + 8.5, 5.8, 1.2, 1.2, 1.2, '#e04880');
        ball(0, hover + 8.5, 6.4, 0.65, 0.65, 0.65, '#58c0e8');
      }
      break;
    }
    // ---------------------------------------------------------------- aves
    case 'murkrow': {
      ball(0, 9, 0, 3.8, 4.6, 4, body); ball(0, 8.5, 2.8, 2.4, 3, 1.4, c.belly);
      ball(0, 15, 1.6, 3.4, 3.2, 3.2, body); eyes(15.6, 4.4, 1.8, '#d84040');
      spike(0, 14.6, 6.4, 0.9, 2.4, 0.9, c.beak, Math.PI / 2);
      ball(0, 12.2, 2.8, 2.2, 0.55, 1.4, c.beak);
      ball(0, 18.2, 0.4, 4.2, 1.2, 4.4, c.hat); spike(0, 19.6, -2.2, 1.6, 3, 1.4, c.hat, -1.2);
      wings(body, 5, 11, 3);
      for (const s of [-1, 1]) ball(s * 2, 2.6 + Math.max(0, s * gait), 0.6, 0.9, 2, 1.2, c.beak);
      ball(tail * 0.6, 7.6, -4.4, 1.5, 0.8, 0.8, c.belly);
      for (let i = -1; i <= 1; i++) ball(i * 1.4 + tail, 7, -6.5, 1.2, 0.8, 4.4, c.hat);
      if (frame >= 6) {
        ball(0, 13.8, 7.8, 1.1, 1.1, 1.1, '#e04880');
      }
      break;
    }
    case 'lugia': case 'hooh': {
      const lug = key === 'lugia';
      ball(0, 11 + bob, -1, 5.2, 6, 5.4, body); ball(0, 10.5 + bob, 3, 3.6, 4.6, 2.4, c.belly);
      ball(0, 20 + bob, 3.5, 3.2, 3.4, 4, body); eyes(20.6 + bob, 6.6, 1.9, lug ? c.eye : '#d84040');
      if (lug) {
        ball(0, 19.6 + bob, 7.4, 2, 1.4, 1.8, body); for (const s of [-1, 1]) ball(s * 2.1, 20.6 + bob, 6.1, 0.7, 0.9, 0.5, c.plate);
        for (let i = 0; i < 4; i++) spike(0, 15 + bob - i * 2.4, -5.5 - i * 0.6, 0.9, 2.4, 1, c.plate, -0.6);
        for (const s of [-1, 1]) { ball(s * 8.5, 14 + flap * 3 + bob, -1, 7.6, 1.4, 5.2, c.wing, s * flap); for (let j = 0; j < 4; j++) spike(s * (12.5 + j * 0.3), 13 + flap * 5 + bob - j, -3 + j * 2, 1.3, 4.2, 1.2, c.wing, s * (1.1 + flap)); ball(s * 6, 14 + flap * 2 + bob, 1, 2.8, 1, 1.2, c.plate, s * flap); }
        for (let i = 0; i < 5; i++) ball(tail * i / 5, 9 - i * 0.6, -6 - i * 2, 2.4 - i * 0.35, 1.8, 2.4, body);
        spike(tail, 6, -16, 1.6, 2.6, 0.6, c.plate, -1.4);
      } else {
        spike(0, 19.4 + bob, 7.8, 0.9, 2.6, 0.9, c.beak, Math.PI / 2.2);
        ball(0, 16.5 + bob, 3.2, 3.1, 1.4, 2.4, c.tail);
        for (let i = -2; i <= 2; i++) spike(i * 1.1, 24 + bob - Math.abs(i) * 0.6, 2, 0.8, 3.4, 0.8, c.crest, i * 0.22);
        for (const s of [-1, 1]) { ball(s * 8, 14 + flap * 3 + bob, -1, 7.2, 1.4, 4.8, c.wing, s * flap); for (let j = 0; j < 4; j++) spike(s * (12 + j * 0.4), 13 + flap * 5 + bob - j, -3 + j * 2, 1.3, 4.4, 1.2, j % 2 ? c.tail : c.wing, s * (1.1 + flap)); }
        for (let i = 0; i < 5; i++) ball((i - 2) * 1.6 + tail, 7, -7 - Math.abs(i - 2) * 0.6, 1.2, 0.8, 5.4, i % 2 ? c.tail : c.wing);
        for (const s of [-1, 1]) ball(s * 2.4, 2.4 + Math.max(0, s * gait), 0.6, 1, 2.2, 1.4, c.beak);
      }
      if (frame >= 6) {
        ball(0, 19.2 + bob, 9.2, 1.3, 1.3, 1.3, lug ? '#68b8f8' : '#ff7030');
        ball(0, 19.2 + bob, 9.8, 0.7, 0.7, 0.7, lug ? '#d8f4ff' : '#ffe850');
      }
      break;
    }
    // ---------------------------------------------------------------- serpientes
    case 'rayquaza': {
      for (let i = 0; i < 11; i++) {
        const r = 3.2 - i * 0.16, sway = Math.sin(i * 0.65 + t * 0.4) * 2.4;
        ball(sway, 16 - i * 1.25 + Math.sin(i * 0.5) * 1.5, 4 - i * 1.7, r, r, r, body);
        if (i % 2 === 0) for (const s of [-1, 1]) ball(sway + s * r * 0.9, 16 - i * 1.25 + Math.sin(i * 0.5) * 1.5, 4 - i * 1.7, 0.6, 0.6, 1.2, c.ring);
        if (i % 3 === 1) for (const s of [-1, 1]) spike(sway + s * r, 16.4 - i * 1.25, 4 - i * 1.7, 0.6, 2.2 + flap, 1.2, body, s * 1.3);
      }
      ball(0, 19, 6, 3.8, 3.4, 4.6, body); eyes(20, 9.6, 2.1, '#e8d040');
      ball(0, 18, 10, 2.2, 1.6, 1.4, body);
      for (const s of [-1, 1]) {
        ball(s * 3.8, 15.5, 5.2, 1.1, 2.2, 1.1, body, s * 0.4);
        ball(s * 4.2, 14.2, 6.2, 0.85, 0.85, 0.85, c.ring);
        spike(s * 2.6, 23, 3, 0.8, 4, 0.8, body, s * 0.35 - 0.4);
        ball(s * 3.4, 20.6, 7.4, 0.9, 0.5, 1, c.mark);
        spike(s * 1.8, 16.8, 9.6, 0.4, 1.8, 0.4, c.ring, s * 0.3 + Math.PI);
      }
      if (frame >= 6) {
        ball(0, 18, 11.2, 1.2, 1.2, 1.2, '#ffd850');
        ball(0, 18, 11.8, 0.65, 0.65, 0.65, '#d8f4ff');
      }
      break;
    }
  }
  return parts;
}
