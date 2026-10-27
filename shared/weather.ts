// Estaciones y clima dinámico. Es determinista: servidor y clientes calculan lo mismo con la hora del servidor,
// así que no hace falta enviarlo por la red. El clima cambia las apariciones (tipos favorecidos y especies de temporada).
import type { PType } from './types';
import type { SpawnEntry, ZoneDef } from './zones';
import { SPECIES } from './species';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'clear' | 'sun' | 'rain' | 'storm' | 'snow' | 'fog' | 'wind' | 'ash';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES: Record<Season, string> = { spring: 'Primavera', summer: 'Verano', autumn: 'Otoño', winter: 'Invierno' };
export const SEASON_ICONS: Record<Season, string> = { spring: '❀', summer: '☀', autumn: '🍂', winter: '❄' };
export const WEATHER_NAMES: Record<Weather, string> = { clear: 'Despejado', sun: 'Soleado', rain: 'Lluvia', storm: 'Tormenta', snow: 'Nieve', fog: 'Niebla', wind: 'Viento', ash: 'Ceniza' };
export const WEATHER_ICONS: Record<Weather, string> = { clear: '◌', sun: '☀', rain: '☂', storm: '⚡', snow: '❄', fog: '≋', wind: '≈', ash: '♨' };

export const SEASON_MS = 24 * 60 * 60 * 1000;   // cada estación dura un día real
export const WEATHER_MS = 12 * 60 * 1000;        // el tiempo de cada zona cambia cada 12 minutos

export function seasonAt(now: number): Season { return SEASONS[Math.floor(now / SEASON_MS) % 4]; }
export function seasonLeft(now: number) { return SEASON_MS - (now % SEASON_MS); }

function h(a: number, b: number) {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const BY_SEASON: Record<Season, [Weather, number][]> = {
  spring: [['clear', 0.38], ['sun', 0.24], ['rain', 0.28], ['storm', 0.04], ['wind', 0.06]],
  summer: [['sun', 0.46], ['clear', 0.3], ['storm', 0.14], ['rain', 0.06], ['wind', 0.04]],
  autumn: [['clear', 0.32], ['rain', 0.3], ['fog', 0.2], ['wind', 0.14], ['storm', 0.04]],
  winter: [['clear', 0.34], ['snow', 0.32], ['fog', 0.16], ['rain', 0.12], ['wind', 0.06]],
};
// Zonas con clima propio (montañas nevadas, volcán, pantano, cementerio, cuevas)
const FIXED: Record<number, [Weather, number][]> = {
  16: [['snow', 0.7], ['clear', 0.2], ['wind', 0.1]],
  17: [['snow', 0.6], ['clear', 0.4]],
  14: [['ash', 0.8], ['sun', 0.2]],
  15: [['sun', 0.6], ['clear', 0.3], ['rain', 0.1]],
  5: [['fog', 0.55], ['rain', 0.3], ['clear', 0.15]],
  12: [['fog', 0.6], ['clear', 0.3], ['rain', 0.1]],
};
const NO_SNOW = new Set([6, 14, 15, 0]); // costa, volcán, isla y mar: llueve en vez de nevar

export function weatherAt(zone: number, now: number, kind?: ZoneDef['kind']): Weather {
  if (kind === 'dungeon' || zone === 21) return 'clear';
  const slot = Math.floor(now / WEATHER_MS);
  const table = FIXED[zone] || BY_SEASON[seasonAt(now)];
  let r = h(zone * 31 + 7, slot), w: Weather = table[table.length - 1][0];
  for (const [k, p] of table) { r -= p; if (r < 0) { w = k; break; } }
  if (w === 'snow' && NO_SNOW.has(zone)) w = 'rain';
  return w;
}

/** Multiplicador de aparición por tipo según el clima y la estación. */
export function typeBoost(w: Weather, s: Season): Partial<Record<PType, number>> {
  const b: Partial<Record<PType, number>> = {};
  const mul = (t: PType, m: number) => { b[t] = (b[t] || 1) * m; };
  if (w === 'rain') { mul('water', 2.2); mul('bug', 1.3); mul('grass', 1.2); }
  if (w === 'storm') { mul('electric', 3); mul('water', 1.6); mul('dragon', 1.5); }
  if (w === 'sun') { mul('fire', 2); mul('grass', 1.6); mul('ground', 1.3); }
  if (w === 'snow') { mul('ice', 3); mul('water', 1.3); }
  if (w === 'fog') { mul('ghost', 2.4); mul('psychic', 1.6); mul('dark', 1.5); }
  if (w === 'wind') { mul('flying', 2.2); mul('dragon', 1.3); }
  if (s === 'spring') { mul('grass', 1.5); mul('bug', 1.4); mul('fairy', 1.6); }
  if (s === 'summer') { mul('fire', 1.4); mul('water', 1.3); mul('electric', 1.4); }
  if (s === 'autumn') { mul('ghost', 1.5); mul('dark', 1.5); mul('poison', 1.3); mul('normal', 1.2); }
  if (s === 'winter') { mul('ice', 2); mul('water', 1.2); }
  return b;
}

/** Especies que solo salen en una estación (y zonas donde viven). */
export const SEASONAL: { key: string; season: Season; zones: number[]; weight: number; time?: 'day' | 'night' }[] = [
  { key: 'hoppip', season: 'spring', zones: [2, 7, 4], weight: 16 },
  { key: 'mareep', season: 'spring', zones: [7, 10], weight: 12 },
  { key: 'togepi', season: 'spring', zones: [7, 2], weight: 2 },
  { key: 'houndour', season: 'summer', zones: [14, 13], weight: 14 },
  { key: 'wooper', season: 'summer', zones: [5, 8, 6], weight: 14 },
  { key: 'mareep', season: 'summer', zones: [10], weight: 9 },
  { key: 'murkrow', season: 'autumn', zones: [4, 12, 5, 7], weight: 10 },
  { key: 'misdreavus', season: 'autumn', zones: [12, 5, 19], weight: 10, time: 'night' },
  { key: 'houndour', season: 'autumn', zones: [12], weight: 6, time: 'night' },
  { key: 'swinub', season: 'winter', zones: [16, 13, 2, 7], weight: 15 },
  { key: 'sneasel', season: 'winter', zones: [16, 13, 18], weight: 8 },
  { key: 'wooper', season: 'winter', zones: [8], weight: 6 },
];
// Algunas especies salen además cuando hace su tiempo, en cualquier estación
const WEATHER_SPECIES: Partial<Record<Weather, [string, number, number[]][]>> = {
  rain: [['wooper', 8, [2, 4, 5, 6, 7, 8]]],
  storm: [['mareep', 8, [2, 7, 10]]],
  fog: [['misdreavus', 6, [4, 5, 12]]],
  snow: [['swinub', 10, [16, 17, 13]]],
};

/** Tabla de apariciones de una zona para este momento (día/noche, estación y clima). */
export function spawnTable(z: ZoneDef, now: number, night: boolean): SpawnEntry[] {
  const s = seasonAt(now), w = weatherAt(z.id, now, z.kind);
  const out: SpawnEntry[] = z.spawns.filter(e => !e[2] || (e[2] === 'night') === night).map(e => [e[0], e[1]]);
  for (const e of SEASONAL) if (e.season === s && e.zones.includes(z.id) && (!e.time || (e.time === 'night') === night)) out.push([e.key, e.weight]);
  for (const [k, wt, zones] of WEATHER_SPECIES[w] || []) if (zones.includes(z.id)) out.push([k, wt]);
  return out;
}

/** spawnTable con los pesos multiplicados por los tipos favorecidos del momento. */
export function boostedTable(z: ZoneDef, now: number, night: boolean): SpawnEntry[] {
  const b = typeBoost(weatherAt(z.id, now, z.kind), seasonAt(now));
  return spawnTable(z, now, night).map(([k, wt]) => {
    let m = 1;
    for (const t of SPECIES[k]?.types || []) m *= b[t] || 1;
    return [k, wt * m] as SpawnEntry;
  });
}
