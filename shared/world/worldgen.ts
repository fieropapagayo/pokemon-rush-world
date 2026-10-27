// Generación determinista del mundo. Cliente y servidor ejecutan exactamente
// la misma función con la misma semilla, así que solo se transmite la semilla.
import { T, SOLID_OF, OVER_W, OVER_H, WORLD_W, WORLD_H, clamp } from '../constants';
import { Noise, hash2, mulberry32 } from './noise';
import { ZONE, ZONES } from '../zones';
import { GYM_BY_TOWN } from '../gyms';

export type ObjKind = 'tree' | 'rock' | 'boulder' | 'bush' | 'grave' | 'pylon' | 'stalag' | 'crystal' | 'center' | 'mart' | 'house'
  | 'fountain' | 'lamp' | 'sign' | 'tower' | 'cave' | 'lab' | 'statue'
  | 'bed' | 'table' | 'shelf' | 'plant' | 'tv' | 'counter' | 'pc' | 'sofa' | 'rug' | 'machine' | 'stove' | 'window' | 'bookcase' | 'flowerbed';

export interface WObj { id: number; k: ObjKind; x: number; y: number; w: number; h: number; v: number; }
export interface Portal { id: number; x: number; y: number; tx: number; ty: number; name: string; minLevel: number; }
export interface NpcGift { money?: number; crystals?: number; items?: Record<string, number>; }
export interface NpcDef { id: number; x: number; y: number; name: string; role: 'prof' | 'villager' | 'guide' | 'sage' | 'nurse' | 'clerk' | 'leader'; lines: string[]; look: number; town: number; gym?: number; gift?: NpcGift; }
export interface RoomDef { id: number; x: number; y: number; w: number; h: number; name: string; kind: 'center' | 'mart' | 'house' | 'lab'; town: number; door: { x: number; y: number }; }
export interface TownDef { id: number; name: string; x: number; y: number; w: number; h: number; heal: { x: number; y: number }; shop: { x: number; y: number }; spawn: { x: number; y: number }; }
export interface Pickup { id: number; x: number; y: number; kind: 'chest' | 'item'; tier: number; zone: number; }
export interface BossSpot { key: string; x: number; y: number; zone: number; }
export interface SignDef { x: number; y: number; text: string; }

export interface World {
  seed: number; w: number; h: number;
  terrain: Uint8Array; solid: Uint8Array; zone: Uint8Array; biome: Uint8Array; reach: Uint8Array;
  objects: WObj[]; portals: Portal[]; npcs: NpcDef[]; towns: TownDef[]; pickups: Pickup[]; bosses: BossSpot[]; signs: SignDef[];
  rooms: RoomDef[];
}

// Mapa macro 16x16 (cada celda = 25x25 tiles). Norte arriba.
// O océano · B playa · P pradera · F bosque · W pantano · L lago · E campos eléctricos
// H cementerio · M montaña · V volcán · N nieve
const MACRO = [
  'OOOOOOOOOOOOOOOO',
  'ONNNNNNNNNNNNNOO',
  'ONNNNNNNNNNNNNOO',
  'ONNMMMMMMMMMNNNO',
  'OWMMMMMMMMMLLLNO',
  'OWWFFMMMPPLLLLEO',
  'OWWFFFPPPPPLLEEO',
  'OWWFFFPPPPPPPEEO',
  'OWWFFFPPPPPPHHEO',
  'OWWWFFPPPPPPHHEO',
  'OBWWFFPPPPPPHHBO',
  'OBBWFPPPPPPPPBBO',
  'OOBBPPPPPPPPBOOO',
  'OOOBBBBPPPBBOVVO',
  'OOOOOOBBBBBBOVVO',
  'OOOOOOOOOOOOOOOO',
];
const CELL = 25;

const FOOT: Record<string, [number, number]> = {
  center: [5, 3], mart: [4, 3], house: [4, 3], fountain: [3, 2], lamp: [1, 1], sign: [1, 1], tower: [3, 2], lab: [5, 3], statue: [1, 1],
  rock: [1, 1], boulder: [2, 1], bush: [1, 1], grave: [1, 1], pylon: [1, 1], stalag: [1, 1], crystal: [1, 1], cave: [0, 0],
  bed: [1, 2], table: [2, 1], shelf: [2, 1], plant: [1, 1], tv: [1, 1], counter: [3, 1], pc: [1, 1], sofa: [2, 1], rug: [3, 2],
  machine: [2, 1], stove: [1, 1], window: [2, 1], bookcase: [2, 1], flowerbed: [1, 1],
};
/** Objetos que se dibujan pero no bloquean el paso. */
export const WALKABLE_OBJ = new Set<ObjKind>(['rug', 'window']);
// variantes de árbol: 0 roble, 1 pino, 2 palmera, 3 seco, 4 pino nevado, 5 árbol tétrico
const TREE_FOOT: [number, number][] = [[2, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 1]];
export function footprint(k: ObjKind, v: number): [number, number] {
  if (k === 'tree') return TREE_FOOT[v] || [1, 1];
  return FOOT[k] || [1, 1];
}

export const TOWN_LIST = [
  { id: ZONE.PALETA, name: 'Pueblo Paleta', x: 212, y: 312, ground: T.GRASS },
  { id: ZONE.VERDE, name: 'Ciudad Verde', x: 187, y: 212, ground: T.GRASS },
  { id: ZONE.CELESTE, name: 'Ciudad Celeste', x: 230, y: 137, ground: T.GRASS },
  { id: ZONE.LAVANDA, name: 'Pueblo Lavanda', x: 312, y: 182, ground: T.GRASS },
  { id: ZONE.CANELA, name: 'Isla Canela', x: 340, y: 360, ground: T.SAND },
  { id: ZONE.ANIL, name: 'Meseta Añil', x: 187, y: 36, ground: T.SNOW },
];

const DUNGEONS = [
  { zone: ZONE.CUEVA_LUNA, x: 410, y: 8, w: 66, h: 66, floor: T.CAVE, wall: T.CAVEWALL, ent: { x: 443, y: 68 }, boss: { x: 443, y: 18 }, bossKey: 'onix', outside: { x: 158, y: 99 }, name: 'Cueva Luna', minLevel: 12 },
  { zone: ZONE.TORRE, x: 410, y: 90, w: 58, h: 62, floor: T.TOWERFLOOR, wall: T.TOWERWALL, ent: { x: 439, y: 146 }, boss: { x: 439, y: 99 }, bossKey: 'gengar', outside: { x: 328, y: 234 }, name: 'Torre Pokémon', minLevel: 20 },
  { zone: ZONE.CUEVA_CELESTE, x: 420, y: 168, w: 134, h: 132, floor: T.CRYSTAL, wall: T.CAVEWALL, ent: { x: 487, y: 293 }, boss: { x: 487, y: 182 }, bossKey: 'mewtwo', outside: { x: 292, y: 93 }, name: 'Cueva Celeste', minLevel: 30 },
];

export function generateWorld(seed: number): World {
  const W = WORLD_W, H = WORLD_H, N = W * H;
  const terrain = new Uint8Array(N);
  const zone = new Uint8Array(N);
  const biome = new Uint8Array(N);
  const reserved = new Uint8Array(N);
  const occ = new Uint8Array(N);
  const I = (x: number, y: number) => y * W + x;
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const nwx = new Noise(seed ^ 0x1234), nwy = new Noise(seed ^ 0x5678);
  const n1 = new Noise(seed + 11), n2 = new Noise(seed + 23), n3 = new Noise(seed + 37);
  const rnd = mulberry32(seed);

  const zoneOf = (L: string, cy: number): number => {
    switch (L) {
      case 'O': return ZONE.OCEAN; case 'B': return ZONE.COSTA; case 'P': return cy >= 9 ? ZONE.RUTA1 : ZONE.PRADERA;
      case 'F': return ZONE.BOSQUE; case 'W': return ZONE.PANTANO; case 'L': return ZONE.LAGO; case 'E': return ZONE.VOLTIO;
      case 'H': return ZONE.CEMENTERIO; case 'M': return ZONE.MONTES; case 'V': return ZONE.VOLCAN; case 'N': return ZONE.PICOS;
    }
    return ZONE.OCEAN;
  };

  // ---------- 1. Biomas y terreno base ----------
  for (let y = 0; y < OVER_H; y++) {
    for (let x = 0; x < OVER_W; x++) {
      const i = I(x, y);
      const wx = x + (nwx.fbm(x / 38, y / 38, 3) - 0.5) * 30;
      const wy = y + (nwy.fbm(x / 38, y / 38, 3) - 0.5) * 30;
      const cx = clamp(Math.floor(wx / CELL), 0, 15), cy = clamp(Math.floor(wy / CELL), 0, 15);
      let L = MACRO[cy][cx];
      if (Math.min(x, y, OVER_W - 1 - x, OVER_H - 1 - y) < 5) L = 'O';
      biome[i] = L.charCodeAt(0);
      zone[i] = zoneOf(L, cy);
      const d1 = n1.fbm(x / 9, y / 9, 3), d2 = n2.fbm(x / 5 + 50, y / 5 + 50, 2), r = hash2(x, y, seed);
      let t: number = T.GRASS;
      switch (L) {
        case 'O': case 'L': t = T.WATER; break;
        case 'B': t = T.SAND; break;
        case 'P': t = d1 > 0.58 ? T.TALL : (d2 > 0.64 && r < 0.7 ? T.FLOWERS : T.GRASS); break;
        case 'F': t = d1 < 0.4 ? (d2 > 0.58 ? T.TALL : T.GRASS) : T.FOREST; break;
        case 'W': t = d1 > 0.6 ? T.SWAMP : (d2 > 0.6 ? T.TALL : T.MUD); break;
        case 'E': t = d1 > 0.6 ? T.TALL : T.DRYGRASS; break;
        case 'H': t = d2 > 0.66 ? T.TALL : T.HAUNT; break;
        case 'M': t = d1 > 0.62 ? T.CLIFF : T.ROCK; break;
        case 'V': t = d1 > 0.63 ? T.LAVA : T.ASH; break;
        case 'N': t = d1 > 0.64 ? T.CLIFF : (d2 > 0.7 ? T.ROCK : T.SNOW); break;
      }
      terrain[i] = t;
    }
  }
  // Cráter del volcán
  for (let y = 322; y < 352; y++) for (let x = 348; x < 378; x++) {
    const d = Math.hypot(x - 362, y - 336);
    if (biome[I(x, y)] !== 86 /*V*/) continue;
    if (d < 5) terrain[I(x, y)] = T.LAVA; else if (d < 7.5) terrain[I(x, y)] = T.CLIFF;
  }

  // ---------- 2. Orillas de arena ----------
  const shoreBiomes = new Set(['P', 'F', 'E', 'W', 'B', 'H'].map(c => c.charCodeAt(0)));
  const sandMark = new Uint8Array(N);
  for (let y = 0; y < OVER_H; y++) for (let x = 0; x < OVER_W; x++) {
    const i = I(x, y);
    if (terrain[i] !== T.WATER) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const nx = x + dx, ny = y + dy;
      if (!inB(nx, ny) || nx >= OVER_W) continue;
      const j = I(nx, ny);
      if (terrain[j] === T.WATER || terrain[j] === T.SWAMP) continue;
      if (dx * dx + dy * dy > 5) continue;
      if (shoreBiomes.has(biome[j])) sandMark[j] = 1;
    }
  }
  for (let i = 0; i < N; i++) if (sandMark[i]) terrain[i] = T.SAND;

  const objects: WObj[] = [];
  const portals: Portal[] = [];
  const npcs: NpcDef[] = [];
  const towns: TownDef[] = [];
  const signs: SignDef[] = [];
  let oid = 1;

  const solidAt = (x: number, y: number) => SOLID_OF[terrain[I(x, y)]] !== 0 || occ[I(x, y)] === 1;
  const placeObj = (k: ObjKind, v: number, x: number, y: number, force = false): WObj | null => {
    const [w, h] = footprint(k, v);
    if (!force) {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (!inB(xx, yy) || solidAt(xx, yy) || reserved[I(xx, yy)]) return null;
      }
    }
    if (!WALKABLE_OBJ.has(k)) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (inB(xx, yy)) occ[I(xx, yy)] = 1;
    const o: WObj = { id: oid++, k, x, y, w, h, v };
    objects.push(o);
    return o;
  };
  const fillRect = (x0: number, y0: number, w: number, h: number, t: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inB(x, y)) terrain[I(x, y)] = t;
  };
  const reserveRect = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inB(x, y)) reserved[I(x, y)] = 1;
  };

  // ---------- 3. Pueblos ----------
  let npcId = 1;
  const doors: { o: WObj; kind: RoomDef['kind']; town: number; name: string; v: number }[] = [];
  const door = (o: WObj | null, kind: RoomDef['kind'], town: number, name: string) => {
    if (!o) return;
    const dx = o.x + 2, dy = o.y + o.h - 1;
    occ[I(dx, dy)] = 0;                       // la puerta se puede cruzar
    terrain[I(dx, dy + 1)] = T.TOWN;          // felpudo de piedra delante
    doors.push({ o, kind, town, name, v: o.v });
  };
  for (const td of TOWN_LIST) {
    const cx = td.x, cy = td.y, tw = 28, th = 22;
    const x0 = cx - 14, y0 = cy - 11;
    // margen de tierra firme
    for (let y = y0 - 3; y < y0 + th + 3; y++) for (let x = x0 - 3; x < x0 + tw + 3; x++) {
      if (!inB(x, y)) continue;
      const t = terrain[I(x, y)];
      if (SOLID_OF[t] !== 0) terrain[I(x, y)] = td.ground === T.SAND ? T.SAND : td.ground;
    }
    fillRect(x0, y0, tw, th, td.ground);
    for (let y = y0; y < y0 + th; y++) for (let x = x0; x < x0 + tw; x++) zone[I(x, y)] = td.id;
    reserveRect(x0 - 2, y0 - 2, tw + 4, th + 4);
    // calles
    fillRect(x0, cy - 1, tw, 3, T.TOWN);
    fillRect(cx - 1, y0, 3, th, T.TOWN);
    fillRect(cx - 5, cy - 4, 11, 9, T.TOWN);
    // parterres
    fillRect(x0 + 1, y0 + 1, 3, 2, T.FLOWERS);
    fillRect(x0 + tw - 4, y0 + th - 3, 3, 2, T.FLOWERS);
    // edificios
    door(placeObj('center', 0, cx - 11, cy - 8, true), 'center', td.id, 'Centro Pokémon de ' + td.name);
    fillRect(cx - 9, cy - 5, 1, 4, T.TOWN);
    door(placeObj('mart', 0, cx + 6, cy - 8, true), 'mart', td.id, 'Tienda Pokémon de ' + td.name);
    fillRect(cx + 7, cy - 5, 2, 4, T.TOWN);
    const hn = HOUSE_NAMES[td.id] || HOUSE_NAMES[0];
    door(placeObj('house', (td.id * 3) % 4, cx - 11, cy + 4, true), 'house', td.id, hn[0]);
    fillRect(cx - 9, cy + 7, 1, 3, T.TOWN);
    door(placeObj('house', (td.id * 3 + 1) % 4, cx + 6, cy + 4, true), 'house', td.id, hn[1]);
    fillRect(cx + 8, cy + 7, 1, 3, T.TOWN);
    if (td.id === ZONE.PALETA) door(placeObj('lab', 0, cx - 3, cy + 6, true), 'lab', td.id, 'Laboratorio del Profesor Oak');
    for (const [fx, fy] of [[cx - 13, cy + 8], [cx + 12, cy + 8], [cx - 13, cy - 4], [cx + 12, cy - 4]]) placeObj('flowerbed', (fx + fy) % 3, fx, fy, true);
    placeObj('fountain', 0, cx - 1, cy - 1, true);
    placeObj('lamp', 0, cx - 5, cy - 4, true); placeObj('lamp', 0, cx + 5, cy - 4, true);
    placeObj('lamp', 0, cx - 5, cy + 4, true); placeObj('lamp', 0, cx + 5, cy + 4, true);
    placeObj('statue', 0, cx + 3, cy - 6, true);
    const signO = placeObj('sign', 0, cx + 2, cy + 7, true)!;
    signs.push({ x: signO.x, y: signO.y, text: td.name + ' — ' + ZONES[td.id].desc });
    towns.push({ id: td.id, name: td.name, x: x0, y: y0, w: tw, h: th, heal: { x: cx - 9, y: cy - 5 }, shop: { x: cx + 7, y: cy - 5 }, spawn: { x: cx, y: cy + 2 } });
    // NPCs de la calle (Joy y el dependiente están dentro de sus edificios)
    const vlines = VILLAGER_LINES[td.id] || VILLAGER_LINES[0];
    npcs.push({ id: npcId++, x: cx + 4, y: cy + 2, name: vlines[0], role: 'villager', look: 3 + (td.id % 3), town: td.id, lines: vlines.slice(1) });
    const street = STREET_LINES[td.id];
    if (street) npcs.push({ id: npcId++, x: cx - 7, y: cy + 1, name: street[0], role: 'villager', look: 3 + ((td.id + 1) % 3), town: td.id, lines: street.slice(1) });
    const gym = GYM_BY_TOWN[td.id];
    if (gym) npcs.push({ id: npcId++, x: cx - 4, y: cy - 2, name: 'Líder ' + gym.leader, role: 'leader', look: 8 + gym.id, town: td.id, gym: gym.id, lines: gym.lines });
    if (td.id === ZONE.PALETA) {
      npcs.push({ id: npcId++, x: cx - 4, y: cy + 3, name: 'Profesor Oak', role: 'prof', look: 6, town: td.id, lines: ['¡Hola! Soy el Profesor Oak. Bienvenido al mundo Pokémon.', 'Los Pokémon salvajes se esconden en la hierba alta, la arena y las cuevas. Saltan de repente cuando pasas cerca.', 'Algunos son tranquilos. Otros, agresivos: irán directos a por ti. Tu equipo te sigue y combate solo.', 'Haz clic en un salvaje para fijarlo: tu equipo lo dejará a 1 PS. Luego pulsa C para lanzar una Poké Ball.', 'Si un rival es demasiado fuerte, ¡huye con F! Y cura a tu equipo dentro del Centro Pokémon.', 'Entra en las casas, habla con todos... y cuando estés listo, ve al norte hacia Ciudad Verde.'] });
    } else {
      npcs.push({ id: npcId++, x: cx - 4, y: cy + 3, name: 'Guía', role: 'guide', look: 7, town: td.id, lines: GUIDE_LINES[td.id] || ['¡Explora y hazte más fuerte!'] });
    }
  }

  // ---------- 4. Caminos ----------
  const ROADS: number[][][] = [
    [[212, 300], [208, 262], [190, 225]],                       // Paleta -> Verde
    [[190, 200], [198, 170], [222, 150], [230, 142]],           // Verde -> Celeste
    [[240, 145], [258, 182], [300, 184]],                       // Celeste -> Lavanda
    [[312, 194], [318, 240], [306, 290], [302, 318], [330, 348]], // Lavanda -> Canela (puente)
    [[175, 212], [125, 216], [62, 222]],                        // Verde -> Bosque/Pantano
    [[187, 200], [187, 150], [186, 100], [187, 48]],            // Verde -> Montes -> Añil
    [[198, 312], [130, 302], [62, 270]],                        // Paleta -> oeste
    [[244, 130], [272, 100], [292, 94]],                        // Celeste -> Cueva Celeste
    [[186, 104], [168, 100], [158, 100]],                       // ramal Cueva Luna
    [[324, 184], [366, 176]],                                   // Lavanda -> Campos Voltio
    [[226, 312], [282, 300], [306, 300]],                       // Paleta -> este
  ];
  let segN = 0;
  for (const road of ROADS) {
    for (let s = 0; s < road.length - 1; s++) {
      const [ax, ay] = road[s], [bx, by] = road[s + 1];
      const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      const nx = -(by - ay) / (len || 1), ny = (bx - ax) / (len || 1);
      segN++;
      for (let k = 0; k <= len; k++) {
        const t = k / (len || 1);
        const fade = Math.sin(t * Math.PI);
        const off = (n3.value(k * 0.06, segN * 7.3) - 0.5) * 7 * fade;
        const px = Math.round(ax + (bx - ax) * t + nx * off), py = Math.round(ay + (by - ay) * t + ny * off);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const x = px + ox, y = py + oy;
          if (!inB(x, y)) continue;
          const i = I(x, y), t0 = terrain[i];
          if (t0 === T.TOWN) continue;
          if (zone[i] === ZONE.PALETA || zone[i] === ZONE.VERDE || zone[i] === ZONE.CELESTE || zone[i] === ZONE.LAVANDA || zone[i] === ZONE.CANELA || zone[i] === ZONE.ANIL) {
            terrain[i] = T.TOWN; continue;
          }
          terrain[i] = (t0 === T.WATER || t0 === T.SWAMP) ? T.BRIDGE : T.PATH;
        }
        for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) if (inB(px + ox, py + oy)) reserved[I(px + ox, py + oy)] = 1;
      }
    }
  }

  // ---------- 5. Mazmorras ----------
  for (const d of DUNGEONS) {
    genCave(d);
  }
  function genCave(d: typeof DUNGEONS[number]) {
    const r = mulberry32(seed + d.zone * 101);
    const { x: X, y: Y, w: Wd, h: Hd } = d;
    const g = new Uint8Array(Wd * Hd);
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const edge = x < 2 || y < 2 || x >= Wd - 2 || y >= Hd - 2;
      g[y * Wd + x] = edge ? 1 : (r() < 0.44 ? 1 : 0);
    }
    for (let it = 0; it < 5; it++) {
      const ng = new Uint8Array(g);
      for (let y = 1; y < Hd - 1; y++) for (let x = 1; x < Wd - 1; x++) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += g[(y + dy) * Wd + x + dx];
        ng[y * Wd + x] = c >= 5 ? 1 : 0;
      }
      g.set(ng);
    }
    const carve = (cx: number, cy: number, rad: number) => {
      for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
        if (x < 2 || y < 2 || x >= Wd - 2 || y >= Hd - 2) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad) g[y * Wd + x] = 0;
      }
    };
    const ex = d.ent.x - X, ey = d.ent.y - Y, bx = d.boss.x - X, by = d.boss.y - Y;
    carve(ex, ey - 2, 3.5);
    carve(bx, by, 7.5);
    // túnel serpenteante
    let px = ex, py = ey - 2, guard = 0;
    while ((Math.abs(px - bx) > 2 || Math.abs(py - by) > 2) && guard++ < 4000) {
      const ddx = Math.sign(bx - px), ddy = Math.sign(by - py);
      const rr = r();
      if (rr < 0.45) py += ddy; else if (rr < 0.8) px += ddx; else px += r() < 0.5 ? 1 : -1;
      px = clamp(px, 3, Wd - 4); py = clamp(py, 3, Hd - 4);
      carve(px, py, 1.6);
    }
    // conectividad: rellenar zonas no alcanzables
    const seen = new Uint8Array(Wd * Hd);
    const st = [(ey - 2) * Wd + ex]; seen[st[0]] = 1;
    while (st.length) {
      const c = st.pop()!; const cx = c % Wd, cy = (c / Wd) | 0;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ddx, ny = cy + ddy; const j = ny * Wd + nx;
        if (nx < 0 || ny < 0 || nx >= Wd || ny >= Hd || seen[j] || g[j]) continue;
        seen[j] = 1; st.push(j);
      }
    }
    for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
      const i = I(X + x, Y + y);
      const wall = g[y * Wd + x] === 1 || !seen[y * Wd + x];
      terrain[i] = wall ? d.wall : d.floor;
      zone[i] = d.zone;
      biome[i] = 'D'.charCodeAt(0);
    }
    // entrada (pasillo hasta el borde inferior)
    for (let y = ey - 2; y <= ey + 1; y++) for (let x = ex - 1; x <= ex + 1; x++) terrain[I(X + x, Y + y)] = d.floor;
    reserveRect(d.ent.x - 3, d.ent.y - 5, 7, 7);
    reserveRect(d.boss.x - 6, d.boss.y - 6, 13, 13);
    // portal de salida dentro de la mazmorra
    portals.push({ id: portals.length + 1, x: d.ent.x, y: d.ent.y, tx: d.outside.x, ty: d.outside.y, name: 'Salida', minLevel: 0 });
    // decoración de cueva
    for (let y = Y + 1; y < Y + Hd - 1; y++) for (let x = X + 1; x < X + Wd - 1; x++) {
      const h = hash2(x, y, seed + 9);
      if (terrain[I(x, y)] !== d.floor || reserved[I(x, y)]) continue;
      // solo junto a paredes, para no tapar pasillos
      let nearWall = 0;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (terrain[I(x + ddx, y + ddy)] === d.wall) nearWall++;
      if (nearWall === 0) continue;
      if (h < 0.06) placeObj(d.floor === T.CRYSTAL ? 'crystal' : (d.floor === T.TOWERFLOOR ? 'grave' : 'stalag'), 0, x, y);
      else if (h < 0.09) placeObj(d.floor === T.CAVE ? 'crystal' : 'rock', 0, x, y);
    }
  }

  // ---------- 6. Entradas a mazmorras ----------
  const caveEntrance = (ex: number, ey: number, d: typeof DUNGEONS[number]) => {
    // pared de roca con abertura
    for (let y = ey - 3; y <= ey; y++) for (let x = ex - 3; x <= ex + 3; x++) terrain[I(x, y)] = T.CLIFF;
    terrain[I(ex, ey)] = T.CAVE;
    for (let y = ey + 1; y <= ey + 3; y++) for (let x = ex - 3; x <= ex + 3; x++) if (SOLID_OF[terrain[I(x, y)]] !== 0 || terrain[I(x, y)] === T.SNOW) terrain[I(x, y)] = T.ROCK;
    reserveRect(ex - 4, ey - 4, 9, 9);
    objects.push({ id: oid++, k: 'cave', x: ex, y: ey, w: 0, h: 0, v: d.zone === ZONE.CUEVA_CELESTE ? 1 : 0 });
    portals.push({ id: portals.length + 1, x: ex, y: ey, tx: d.ent.x, ty: d.ent.y - 3, name: d.name, minLevel: d.minLevel });
  };
  caveEntrance(158, 97, DUNGEONS[0]);
  caveEntrance(292, 91, DUNGEONS[2]);
  // Torre Pokémon (edificio)
  {
    const d = DUNGEONS[1];
    fillRect(323, 226, 11, 12, T.HAUNT);
    fillRect(327, 234, 3, 4, T.PATH);
    placeObj('tower', 0, 327, 231, true);
    reserveRect(321, 224, 15, 16);
    portals.push({ id: portals.length + 1, x: 328, y: 233, tx: d.ent.x, ty: d.ent.y - 3, name: d.name, minLevel: d.minLevel });
    signs.push({ x: 326, y: 235, text: 'Torre Pokémon — Nivel recomendado 26+. Se oyen lamentos en su interior...' });
    placeObj('sign', 0, 326, 235, true);
  }
  // ---------- 6b. Colinas y mesetas: rompen la llanura con desniveles ----------
  const nh = new Noise(seed + 71), nh2 = new Noise(seed + 72);
  for (let y = 6; y < OVER_H - 6; y++) for (let x = 6; x < OVER_W - 6; x++) {
    const i = I(x, y);
    if (reserved[i] || occ[i]) continue;
    const L = biome[i], t = terrain[i];
    if (L !== 80 /*P*/ && L !== 70 /*F*/ && L !== 69 /*E*/ && L !== 72 /*H*/) continue;
    if (t !== T.GRASS && t !== T.TALL && t !== T.FLOWERS && t !== T.FOREST && t !== T.DRYGRASS && t !== T.HAUNT) continue;
    const h = nh.fbm(x / 15, y / 15, 3) + (nh2.value(x / 5, y / 5) - 0.5) * 0.06;
    if (h > 0.665) terrain[i] = T.HILL;
  }
  // Las colinas de una sola casilla de grosor quedan raras: se eliminan
  for (let pass = 0; pass < 2; pass++) for (let y = 6; y < OVER_H - 6; y++) for (let x = 6; x < OVER_W - 6; x++) {
    const i = I(x, y); if (terrain[i] !== T.HILL) continue;
    const v = terrain[I(x, y - 1)] === T.HILL || terrain[I(x, y + 1)] === T.HILL;
    const hz = terrain[I(x - 1, y)] === T.HILL || terrain[I(x + 1, y)] === T.HILL;
    if (!v || !hz) terrain[i] = T.GRASS;
  }

  // ---------- 6c. Interiores (franja este, bajo las mazmorras) ----------
  const rooms: RoomDef[] = [];
  const RW = 13, RH = 10;
  doors.forEach((d, idx) => {
    const rx = 402 + (idx % 11) * 14, ry = 303 + Math.floor(idx / 11) * 12;
    const floor = d.kind === 'house' ? T.WOODFLOOR : T.TILEFLOOR;
    for (let y = ry; y < ry + RH; y++) for (let x = rx; x < rx + RW; x++) {
      const i = I(x, y);
      const inside = x > rx && x < rx + RW - 1 && y > ry + 1 && y < ry + RH - 1;
      terrain[i] = inside ? floor : T.INWALL;
      zone[i] = ZONE.INTERIOR; biome[i] = 73; // I
    }
    const ex = rx + 6, ey = ry + RH - 2;
    reserveRect(rx, ry, RW, RH);
    const dx = d.o.x + 2, dy = d.o.y + d.o.h - 1;
    rooms.push({ id: idx + 1, x: rx, y: ry, w: RW, h: RH, name: d.name, kind: d.kind, town: d.town, door: { x: dx, y: dy } });
    portals.push({ id: portals.length + 1, x: dx, y: dy, tx: ex, ty: ey - 1, name: d.name, minLevel: 0 });
    portals.push({ id: portals.length + 1, x: ex, y: ey, tx: dx, ty: dy + 1, name: 'Salir', minLevel: 0 });
    const put = (k: ObjKind, v: number, x: number, y: number) => placeObj(k, v, rx + x, ry + y, true);
    put('window', 0, 2, 0); put('window', 0, RW - 4, 0);
    put('rug', d.kind === 'house' ? 0 : 1, 5, 4); put('rug', 2, 5, RH - 3);
    const tn = TOWN_LIST.find(t => t.id === d.town)?.name || '';
    if (d.kind === 'center') {
      put('counter', 0, 5, 3); put('pc', 0, RW - 3, 2); put('plant', 0, 1, 2); put('plant', 0, RW - 2, RH - 3);
      put('sofa', 0, 1, RH - 4); put('sofa', 0, RW - 4, RH - 5); put('bookcase', 0, 8, 2);
      npcs.push({ id: npcId++, x: rx + 6, y: ry + 2, name: 'Enfermera Joy', role: 'nurse', look: 1, town: d.town, lines: ['¡Bienvenido al Centro Pokémon de ' + tn + '!', 'Dame un momento... ¡Listo! Tus Pokémon están como nuevos.', 'He registrado este centro como punto de viaje rápido. ¡Vuelve cuando quieras!'] });
      const g = CENTER_GUESTS[d.town % CENTER_GUESTS.length];
      npcs.push({ id: npcId++, x: rx + 3, y: ry + 5, name: g[0], role: 'guide', look: 4 + (d.town % 3), town: d.town, lines: g.slice(1) });
    } else if (d.kind === 'mart') {
      put('counter', 1, 1, 3); put('shelf', 0, 6, 3); put('shelf', 1, 9, 3); put('shelf', 2, 6, 6); put('shelf', 0, 9, 6); put('plant', 0, RW - 2, 2);
      npcs.push({ id: npcId++, x: rx + 2, y: ry + 2, name: 'Dependiente Hugo', role: 'clerk', look: 2, town: d.town, lines: ['¡Bienvenido a la Tienda Pokémon!'] });
    } else if (d.kind === 'lab') {
      put('machine', 0, 1, 2); put('machine', 1, RW - 3, 2); put('bookcase', 0, 4, 2); put('bookcase', 1, 7, 2); put('pc', 0, 1, 5); put('table', 1, 8, 5); put('plant', 0, RW - 2, RH - 3);
      npcs.push({ id: npcId++, x: rx + 6, y: ry + 4, name: 'Ayudante Elm', role: 'sage', look: 6, town: d.town, lines: ['El Profesor está fuera ayudando a los nuevos entrenadores.', 'Aquí estudiamos cómo aparecen los Pokémon: saltan de la hierba alta cuando pasas cerca.', 'Los legendarios solo se dejan ver ante quien recorre mucho su territorio... ¡y casi nunca!', 'Toma, para tu investigación.'], gift: { items: { pokeball: 5, pocion: 2 } } });
    } else {
      const fam = (HOUSE_FOLK[d.town] || HOUSE_FOLK[0])[idx % 2];
      put('bed', d.v % 2, 1, 2); put('stove', 0, 4, 2); put('tv', 0, 7, 2); put('bookcase', d.v % 2, RW - 3, 2);
      put('table', 0, 5, 5); put('plant', 0, RW - 2, RH - 3); put('flowerbed', 0, 1, RH - 3);
      npcs.push({ id: npcId++, x: rx + 8, y: ry + 5, name: fam.name, role: 'villager', look: 3 + ((idx + d.town) % 3), town: d.town, lines: fam.lines, gift: fam.gift });
    }
  });

  // ---------- 7. Objetos del mundo exterior ----------
  for (let y = 1; y < OVER_H - 1; y++) {
    for (let x = 1; x < OVER_W - 1; x++) {
      const i = I(x, y);
      if (reserved[i] || occ[i]) continue;
      const t = terrain[i];
      if (SOLID_OF[t] !== 0 || t === T.PATH || t === T.BRIDGE || t === T.TOWN || t === T.TALL) continue;
      const L = String.fromCharCode(biome[i]);
      const h = hash2(x, y, seed + 5), h2 = hash2(x, y, seed + 6);
      switch (L) {
        case 'F':
          if (t === T.FOREST) {
            if (h < 0.17) placeObj('tree', 0, x, y);
            else if (h < 0.26) placeObj('tree', 1, x, y);
            else if (h < 0.29) placeObj('bush', h2 < 0.3 ? 1 : 0, x, y);
          } else if (h < 0.02) placeObj('tree', 0, x, y);
          else if (h < 0.035) placeObj('bush', 0, x, y);
          break;
        case 'P':
          if (h < 0.012) placeObj('tree', 0, x, y);
          else if (h < 0.02) placeObj('bush', h2 < 0.25 ? 1 : h2 > 0.78 ? 2 : 0, x, y);
          else if (h < 0.024) placeObj('rock', 0, x, y);
          break;
        case 'B':
          if (t === T.SAND && h < 0.012) placeObj('tree', 2, x, y);
          else if (h < 0.016) placeObj('rock', 0, x, y);
          break;
        case 'W':
          if (h < 0.035) placeObj('tree', 3, x, y);
          else if (h < 0.05) placeObj('bush', 0, x, y);
          break;
        case 'E':
          if (h < 0.008) placeObj('pylon', 0, x, y);
          else if (h < 0.016) placeObj('rock', 0, x, y);
          else if (h < 0.022) placeObj('bush', 0, x, y);
          break;
        case 'H':
          if (h < 0.045) placeObj('grave', (h2 * 3) | 0, x, y);
          else if (h < 0.065) placeObj('tree', 5, x, y);
          break;
        case 'M':
          if (h < 0.02) placeObj('boulder', 0, x, y);
          else if (h < 0.045) placeObj('rock', 0, x, y);
          else if (h < 0.06) placeObj('tree', 1, x, y);
          break;
        case 'V':
          if (h < 0.035) placeObj('rock', 2, x, y);
          else if (h < 0.045) placeObj('tree', 3, x, y);
          else if (h < 0.055) placeObj('boulder', 1, x, y);
          break;
        case 'N':
          if (h < 0.06) placeObj('tree', 4, x, y);
          else if (h < 0.08) placeObj('rock', 1, x, y);
          break;
      }
    }
  }

  // ---------- 8. Sólidos ----------
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) solid[i] = occ[i] ? 1 : SOLID_OF[terrain[i]];

  // ---------- 9. Alcanzabilidad ----------
  const reach = new Uint8Array(N);
  const flood = (sx: number, sy: number) => {
    const st = [I(sx, sy)];
    if (solid[st[0]] !== 0) return;
    reach[st[0]] = 1;
    while (st.length) {
      const c = st.pop()!; const cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!inB(nx, ny)) continue;
        const j = I(nx, ny);
        if (reach[j] || solid[j] !== 0) continue;
        reach[j] = 1; st.push(j);
      }
    }
  };
  flood(TOWN_LIST[0].x, TOWN_LIST[0].y + 2);
  for (const p of portals) { flood(p.x, p.y); flood(p.tx, p.ty); }
  for (const t of TOWN_LIST) flood(t.x, t.y + 2);

  // ---------- 10. Cofres y objetos ----------
  const pickups: Pickup[] = [];
  let pid = 1;
  const placePickups = (count: number, kind: 'chest' | 'item') => {
    let tries = 0;
    while (count > 0 && tries++ < count * 200) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      const i = I(x, y);
      if (!reach[i] || solid[i] !== 0 || reserved[i] || occ[i]) continue;
      const z = ZONES[zone[i]];
      if (!z || (z.kind !== 'wild' && z.kind !== 'dungeon')) continue;
      if (pickups.some(p => Math.abs(p.x - x) + Math.abs(p.y - y) < 10)) continue;
      const tier = z.lvl[0] < 10 ? 0 : z.lvl[0] < 20 ? 1 : z.lvl[0] < 32 ? 2 : 3;
      pickups.push({ id: pid++, x, y, kind, tier, zone: z.id });
      if (kind === 'chest') { occ[i] = 1; solid[i] = 1; }
      count--;
    }
  };
  placePickups(110, 'chest');
  placePickups(170, 'item');

  // ---------- 11. Jefes ----------
  const nearest = (x: number, y: number, want: number) => {
    for (let r = 0; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = x + dx, ny = y + dy;
      if (!inB(nx, ny)) continue;
      const s = solid[I(nx, ny)];
      if (s !== want) continue;
      if (want === 0 && !reach[I(nx, ny)]) continue;
      if (want === 2) { // agua con tierra cerca
        let land = false;
        for (let k = -4; k <= 4 && !land; k++) for (let m = -4; m <= 4; m++) if (inB(nx + k, ny + m) && reach[I(nx + k, ny + m)]) { land = true; break; }
        if (!land) continue;
      }
      return { x: nx, y: ny };
    }
    return { x, y };
  };
  const bosses: BossSpot[] = [];
  const addBoss = (key: string, x: number, y: number, want = 0) => { const p = nearest(x, y, want); bosses.push({ key, x: p.x, y: p.y, zone: zone[I(p.x, p.y)] }); };
  addBoss('snorlax', 186, 152);
  addBoss('gyarados', 262, 132, 2);
  addBoss('arcanine', 360, 346);
  addBoss('dragonite', 110, 48);
  for (const d of DUNGEONS) addBoss(d.bossKey, d.boss.x, d.boss.y);

  // Carteles de ruta
  const routeSigns: [number, number, string][] = [
    [214, 296, 'Ruta 1 — Norte: Ciudad Verde. Pokémon de nivel 2-6.'],
    [189, 186, 'Pradera Central — Cuidado: un Snorlax duerme en el camino del norte.'],
    [128, 213, 'Bosque Verde — Pokémon bicho y planta. Nivel 5-11.'],
    [186, 118, 'Montes Roca — Cueva Luna al oeste. Nivel 17-24.'],
    [246, 150, 'Lago Celeste — Dicen que un Gyarados enfurecido vive aquí.'],
    [303, 296, 'Puente a Isla Canela — Volcán activo. Nivel 25+.'],
    [270, 103, 'Cueva Celeste — Solo entrenadores de nivel 30 o superior.'],
    [360, 174, 'Campos Voltio — Pokémon eléctricos. Nivel 15-22.'],
    [65, 266, 'Pantano Niebla — Nivel 15-21. De noche aparecen fantasmas.'],
    [188, 62, 'Picos Helados — Hogar de dragones. Nivel 31+.'],
  ];
  for (const [x, y, text] of routeSigns) {
    const p = nearest(x, y, 0);
    if (solid[I(p.x, p.y)] === 0 && terrain[I(p.x, p.y)] !== T.PATH && terrain[I(p.x, p.y)] !== T.BRIDGE) {
      objects.push({ id: oid++, k: 'sign', x: p.x, y: p.y, w: 1, h: 1, v: 0 });
      solid[I(p.x, p.y)] = 1;
      signs.push({ x: p.x, y: p.y, text });
    } else {
      // buscar una casilla junto al camino
      let done = false;
      for (let dy = -3; dy <= 3 && !done; dy++) for (let dx = -3; dx <= 3 && !done; dx++) {
        const nx = p.x + dx, ny = p.y + dy;
        if (!inB(nx, ny)) continue;
        const j = I(nx, ny);
        if (solid[j] === 0 && terrain[j] !== T.PATH && terrain[j] !== T.BRIDGE && terrain[j] !== T.TOWN) {
          objects.push({ id: oid++, k: 'sign', x: nx, y: ny, w: 1, h: 1, v: 0 });
          solid[j] = 1; signs.push({ x: nx, y: ny, text }); done = true;
        }
      }
    }
  }

  return { seed, w: W, h: H, terrain, solid, zone, biome, reach, objects, portals, npcs, towns, pickups, bosses, signs, rooms };
}

const VILLAGER_LINES: Record<number, string[]> = {
  0: ['Vecina Lola', '¡Qué buen día para explorar!'],
  [ZONE.PALETA]: ['Abuela Rosa', 'Mi nieto salió hacia la Ruta 1 y volvió con tres Pidgey... ¡y una gripe!', 'Los Pokémon no te esperan quietos: saltan de la hierba alta cuando menos lo esperas.', 'Si alguno viene a por ti con mala cara, deja que tu equipo te defienda.'],
  [ZONE.VERDE]: ['Leñador Bruno', 'El Bosque Verde está al oeste. Lleno de Caterpie y de algún Scyther con malas pulgas...', 'Al norte, un Snorlax enorme bloquea el camino a las montañas.'],
  [ZONE.CELESTE]: ['Pescador Iván', 'He visto un Gyarados gigantesco en el lago. Se enfada si alguien se acerca.', 'Mejor ve con amigos. ¡Y con muchas Super Balls!'],
  [ZONE.LAVANDA]: ['Médium Agatha', 'La Torre Pokémon está al sur, en el cementerio.', 'De noche, los Gastly salen de las tumbas y atacan a los viajeros despistados.'],
  [ZONE.CANELA]: ['Científico Blas', 'En la cima del volcán vive un Arcanine legendario.', 'Y dicen que entre la ceniza vuela un pájaro de fuego... nadie lo ha capturado jamás.'],
  [ZONE.ANIL]: ['Campeón retirado Lance', 'Dragonite vuela sobre estas cumbres.', 'Entre la ventisca, algunos han visto un ave de hielo. Solo a los que caminan mucho por la nieve.', 'Y en la Cueva Celeste... duerme algo creado por el hombre.'],
};
const STREET_LINES: Record<number, string[]> = {
  [ZONE.PALETA]: ['Niño Dani', '¡He visto un Pikachu en la Ruta 1! Bueno... era un Rattata amarillo. Creo.', 'Mi madre dice que entre en casa a merendar. ¡Las casas se abren, pasa a verla!'],
  [ZONE.VERDE]: ['Corredora Ana', 'Si te persigue un Pokémon salvaje muy fuerte, ¡huye! Pulsa F o el botón Huir.', 'Contra los rápidos cuesta más escapar, pero cada intento te da ventaja.'],
  [ZONE.CELESTE]: ['Nadadora Misty Jr.', 'Ponle a tu equipo en modo Neutral si solo quieres pasear: solo se defenderán.', 'En modo Agresivo buscan pelea de lejos, ¡pero reciben más daño!'],
  [ZONE.LAVANDA]: ['Chico Moreno', 'Los Pokémon derrotados a veces sueltan un cofre. Los alfa casi siempre.', '¡Corre a recogerlo antes de que desaparezca!'],
  [ZONE.CANELA]: ['Turista Gema', 'He retado a mi novio a un duelo PvP y le he ganado tres veces.', 'Desde Social [O] puedes retar a cualquier entrenador cercano.'],
  [ZONE.ANIL]: ['Veterana Clara', 'El mapa [M] marca el nivel de cada zona.', 'Si tus Pokémon tienen menos nivel, mejor no subas aún. Aquí arriba no perdonan.'],
};
const HOUSE_NAMES: Record<number, [string, string]> = {
  0: ['Casa de los vecinos', 'Casa del pueblo'],
  [ZONE.PALETA]: ['Casa de tu familia', 'Casa de la familia Robles'],
  [ZONE.VERDE]: ['Cabaña del leñador', 'Casa de la familia Pino'],
  [ZONE.CELESTE]: ['Casa del pescador', 'Casa de la nadadora'],
  [ZONE.LAVANDA]: ['Casa de la médium', 'Casa del señor Fuji'],
  [ZONE.CANELA]: ['Casa del científico', 'Casa de la playa'],
  [ZONE.ANIL]: ['Refugio de montaña', 'Casa del campeón'],
};
type Folk = { name: string; lines: string[]; gift?: NpcGift };
const HOUSE_FOLK: Record<number, [Folk, Folk]> = {
  0: [{ name: 'Vecino', lines: ['¡Hola! Ponte cómodo.'] }, { name: 'Vecina', lines: ['¿Te apetece un té?'] }],
  [ZONE.PALETA]: [
    { name: 'Mamá', lines: ['¡Cariño! Sabía que vendrías a casa antes de irte.', 'Toma, te he preparado algo para el viaje. ¡Abrígate y llama de vez en cuando!'], gift: { items: { pocion: 3, pokeball: 5 }, money: 200 } },
    { name: 'Señora Robles', lines: ['Mi hijo se fue a la Meseta Añil hace años... aún no ha vuelto.', 'Si lo ves, dile que su perro Growlithe le echa de menos.'], gift: { items: { superball: 2 } } },
  ],
  [ZONE.VERDE]: [
    { name: 'Leñador Ramiro', lines: ['Los árboles del bosque esconden cofres antiguos.', 'Llévate esto, a mí ya no me hace falta.'], gift: { items: { revivir: 1 } } },
    { name: 'Abuelo Pino', lines: ['En mis tiempos capturábamos Caterpie con la mano. ¡Je, je!', 'Las Super Balls valen la pena a partir de las zonas de nivel 15.'], gift: { money: 400 } },
  ],
  [ZONE.CELESTE]: [
    { name: 'Pescador Tomás', lines: ['¿Sabías que en el lago a veces salta un Lapras?', 'Solo aparece en el agua, y muy de vez en cuando.'], gift: { items: { ultraball: 1 } } },
    { name: 'Nadadora Irene', lines: ['Entreno cada mañana en el lago. Los Psyduck me miran raro.', 'Toma esta Piedra Agua: la encontré buceando.'], gift: { items: { piedra_agua: 1 } } },
  ],
  [ZONE.LAVANDA]: [
    { name: 'Médium Ofelia', lines: ['Siento una presencia... algo rosa, muy pequeño, que vuela entre las rutas.', 'Dicen que es Mew. Solo uno entre miles de encuentros lo ve.'], gift: { crystals: 3 } },
    { name: 'Señor Fuji', lines: ['Cuido de los Pokémon que nadie quiere.', 'Trata bien a los tuyos: la amistad también los hace evolucionar.'], gift: { items: { caramelo_raro: 1 } } },
  ],
  [ZONE.CANELA]: [
    { name: 'Doctora Vega', lines: ['El calor del volcán despierta a los Pokémon de fuego más fieros.', 'Si te atacan en manada, usa Esquiva [4] y retrocede.'], gift: { items: { piedra_fuego: 1 } } },
    { name: 'Surfista Leo', lines: ['¡Las olas de hoy son perfectas! Bueno, para un Magikarp.'], gift: { money: 900 } },
  ],
  [ZONE.ANIL]: [
    { name: 'Guía Marta', lines: ['Este refugio salva vidas cuando sopla la ventisca.', 'Llévate provisiones. Arriba no hay tiendas.'], gift: { items: { superpocion: 2, revivir: 1 } } },
    { name: 'Campeón Rojo (retirado)', lines: ['...', '... ...', '(Te mira fijamente y te entrega algo.)'], gift: { items: { masterball: 1 } } },
  ],
};
const CENTER_GUESTS: string[][] = [
  ['Entrenador Paco', 'Viajar es más seguro con el equipo en modo Neutral: atacan solo si os atacan.', 'Pulsa V para cambiar el modo de tu equipo.'],
  ['Entrenadora Sara', 'Hoy me ha salido un Pokémon de la hierba y me ha mordido la mochila.', 'Los agresivos van directos a por ti. ¡Ojo con tu barra de vida!'],
  ['Montañero Luis', 'El mapa muestra el nivel de cada zona en colores. Rojo significa que te van a dar una paliza.'],
  ['Coleccionista Eva', 'Llevo 300 horas buscando un shiny legendario. Dicen que es 1 entre decenas de miles.', 'Pero cuando sale... ¡todo el servidor se entera!'],
  ['Ranger Nico', 'Cuando un Pokémon te embosca puedes luchar, capturarlo o huir.', 'Huir funciona mejor si tu equipo es rápido.'],
  ['Señora Pili', 'Ay, mis rodillas... Este Centro Pokémon es lo mejor del pueblo.'],
];
const GUIDE_LINES: Record<number, string[]> = {
  [ZONE.VERDE]: ['Consejo: las Piedras evolutivas se compran en la tienda.', 'Necesitarás esencias del tipo correspondiente.'],
  [ZONE.CELESTE]: ['Consejo: equipa dos Pokémon de agua para activar Ocean Surge.', 'Las expediciones se desbloquean al nivel 5 de entrenador.'],
  [ZONE.LAVANDA]: ['Consejo: los Pokémon fantasma combinados abren portales sombríos.'],
  [ZONE.CANELA]: ['Consejo: invita a tus amigos a un grupo para compartir experiencia.'],
  [ZONE.ANIL]: ['Has llegado lejos. Los jefes de esta zona requieren equipos completos.'],
};

export function isWalkableFor(world: World, x: number, y: number, habitat: 'land' | 'water' | 'air'): boolean {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return false;
  const s = world.solid[ty * world.w + tx];
  if (habitat === 'land') return s === 0;
  if (habitat === 'water') return s === 2;
  return s !== 1;
}

/** Colisión del jugador: caja pequeña en los pies. */
export function playerBlocked(world: World, x: number, y: number, surf = false): boolean {
  const r = 0.28;
  const pts = [[x - r, y - 0.15], [x + r, y - 0.15], [x - r, y + 0.2], [x + r, y + 0.2]];
  for (const [px, py] of pts) {
    const tx = Math.floor(px), ty = Math.floor(py);
    if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return true;
    const s = world.solid[ty * world.w + tx];
    if (s !== 0 && !(surf && s === 2)) return true;   // con Surf se cruza el agua
  }
  return false;
}

export const DUNGEON_DEFS = DUNGEONS;
