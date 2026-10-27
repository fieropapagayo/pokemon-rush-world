import { SPECIES, type Rarity } from './species';
import { BAL } from './balance';
import { T } from './constants';

// Project balance, not the rates of an official Pokémon title.
export const SHINY_RARITY: Record<Rarity, number> = { common: 1, uncommon: 1.5, rare: 2, epic: 4, legendary: 8, mythic: 16 };
export const ENCOUNTER_RARITY: Record<Rarity, number> = { common: 1, uncommon: 0.6, rare: 0.22, epic: 0.06, legendary: 0.006, mythic: 0.001 };
const SPECIAL_SHINY: Record<string, number> = { mew: 16, mewtwo: 16, articuno: 12, zapdos: 12, moltres: 12 };
const SPECIAL_ENCOUNTER: Record<string, number> = { mew: 0.001, mewtwo: 0.002, dratini: 0.12, dragonair: 0.035, lapras: 0.04 };
export const MAX_SHINY_BOOST = 8;
export function shinyDenominator(key: string, base = BAL.SHINY_RATE): number {
  const safeBase = Number.isFinite(base) && base >= 1 ? Math.floor(base) : BAL.SHINY_RATE;
  return Math.round(safeBase * (SPECIAL_SHINY[key] ?? SHINY_RARITY[SPECIES[key].rarity]));
}
export function shinyChance(key: string, boost = 1, base = BAL.SHINY_RATE): number {
  const safeBoost = Number.isFinite(boost) ? Math.max(1, Math.min(MAX_SHINY_BOOST, boost)) : 1;
  return Math.min(1, safeBoost / shinyDenominator(key, base));
}
export function rollShiny(key: string, boost = 1, base = BAL.SHINY_RATE, random = Math.random): boolean {
  return random() < shinyChance(key, boost, base);
}
export function encounterWeight(key: string, weight = 1): number {
  return Math.max(0, weight) * (SPECIAL_ENCOUNTER[key] ?? ENCOUNTER_RARITY[SPECIES[key].rarity]);
}
export function pickEncounter(table: readonly (readonly [string, number, unknown?])[], random = Math.random): string | null {
  const pool = table.filter(([key, weight]) => SPECIES[key] && Number.isFinite(weight) && weight > 0);
  const total = pool.reduce((sum, [key, weight]) => sum + encounterWeight(key, weight), 0);
  if (!total) return null;
  let roll = random() * total;
  for (const [key, weight] of pool) { roll -= encounterWeight(key, weight); if (roll < 0) return key; }
  return pool[pool.length - 1][0];
}

// ---------------------------------------------------------------- encuentros por pasos
// Los Pokémon no esperan quietos: al caminar por hierba, tierra o cuevas cada casilla
// recorrida tiene una probabilidad de que uno salte de repente junto al entrenador.
export const STEP_CHANCE: Record<number, number> = {
  [T.TALL]: 0.075, [T.GRASS]: 0.022, [T.FLOWERS]: 0.026, [T.DRYGRASS]: 0.03, [T.FOREST]: 0.034,
  [T.SAND]: 0.016, [T.ROCK]: 0.026, [T.SNOW]: 0.026, [T.ASH]: 0.03, [T.MUD]: 0.03, [T.HAUNT]: 0.034,
  [T.CAVE]: 0.045, [T.CRYSTAL]: 0.045, [T.TOWERFLOOR]: 0.05, [T.PATH]: 0.004, [T.BRIDGE]: 0.004,
};
export const ENC = {
  COOLDOWN_MS: 6500,        // mínimo entre encuentros sorpresa del mismo jugador
  RAMP_MS: 14000,           // la probabilidad crece hasta x2 tras este tiempo sin encuentros
  MAX_ACTIVE: 2,            // salvajes de encuentro vivos a la vez por jugador
  DIST_MIN: 2.6, DIST_MAX: 4.2,
  NATURAL_ALPHA: 1 / 220,   // alfa salvaje gigante
  STRONG_CHANCE: 0.12,      // "ejemplar fuerte": +2..+4 niveles sobre la zona
};

/** Legendarios y míticos que deambulan por su zona y solo aparecen en encuentros por pasos.
 *  chance es por encuentro; se multiplica si se cumplen sus condiciones (hora, clima o estación). */
export interface Roamer { key: string; zones: number[]; chance: number; lvl: number; time?: 'day' | 'night'; weather?: string[]; season?: string; boost?: number; }
export const ROAMERS: Roamer[] = [
  { key: 'articuno', zones: [16], chance: 1 / 1400, lvl: 50, weather: ['snow'], boost: 2 },
  { key: 'zapdos', zones: [10], chance: 1 / 1400, lvl: 45, weather: ['storm'], boost: 3 },
  { key: 'moltres', zones: [14], chance: 1 / 1400, lvl: 48, weather: ['sun', 'ash'], boost: 1.5 },
  { key: 'raikou', zones: [10, 7], chance: 1 / 2200, lvl: 46, weather: ['storm'], boost: 3 },
  { key: 'entei', zones: [14, 13], chance: 1 / 2200, lvl: 48, season: 'summer', boost: 2 },
  { key: 'suicune', zones: [8, 6], chance: 1 / 2200, lvl: 47, weather: ['rain'], boost: 3 },
  { key: 'lugia', zones: [6, 8], chance: 1 / 4000, lvl: 55, time: 'night', weather: ['storm', 'rain'], boost: 2 },
  { key: 'hooh', zones: [16, 7], chance: 1 / 4000, lvl: 55, time: 'day', weather: ['sun', 'clear'], boost: 1.5 },
  { key: 'rayquaza', zones: [16, 13], chance: 1 / 6000, lvl: 60, weather: ['storm', 'wind'], boost: 2 },
  { key: 'mew', zones: [2, 4, 5, 6, 7, 8, 10, 12, 13, 14, 16], chance: 1 / 9000, lvl: 40 },
  { key: 'celebi', zones: [4], chance: 1 / 9000, lvl: 42, season: 'spring', boost: 3 },
  { key: 'jirachi', zones: [7, 2], chance: 1 / 9000, lvl: 42, time: 'night', boost: 1 },
  { key: 'darkrai', zones: [12, 19], chance: 1 / 9000, lvl: 50, time: 'night', boost: 1 },
];
/** Probabilidad efectiva de un errante en este encuentro (0 si no se cumple su hora). */
export function roamerChance(r: Roamer, night: boolean, weather: string, season: string) {
  if (r.time && (r.time === 'night') !== night) return 0;
  let c = r.chance;
  if ((r.weather && r.weather.includes(weather)) || (r.season && r.season === season)) c *= r.boost || 1;
  return c;
}

/** Probabilidad de que un salvaje recién aparecido vaya directo a por ti. */
export function aggroChance(key: string, zoneLvl: number, night: boolean): number {
  const sp = SPECIES[key];
  let c = sp.temper === 'aggressive' ? 0.72 : sp.temper === 'skittish' ? 0.04 : 0.18;
  if (night) c += 0.1;
  c += Math.min(0.2, zoneLvl / 200);
  if (sp.rarity === 'legendary') c = Math.max(c, 0.6);
  if (sp.rarity === 'mythic') c = 0.05;
  return Math.max(0, Math.min(0.95, c));
}

export type Tier = { label: string; color: string; glow: number };
/** Etiqueta visual del encuentro (combinación de rareza, shiny y alfa). */
export function encounterTier(rarity: Rarity, shiny: boolean, alpha: boolean): Tier {
  const legend = rarity === 'legendary' || rarity === 'mythic';
  if (shiny && legend) return { label: rarity === 'mythic' ? '✦ SHINY MÍTICO ✦' : '✦ SHINY LEGENDARIO ✦', color: '#fff1a0', glow: 5 };
  if (legend) return { label: rarity === 'mythic' ? 'MÍTICO' : 'LEGENDARIO', color: rarity === 'mythic' ? '#ff7ad9' : '#ffcf3f', glow: 4 };
  if (shiny && alpha) return { label: '✦ ALFA SHINY', color: '#ffe680', glow: 4 };
  if (shiny) return { label: '✦ SHINY', color: '#ffe680', glow: 3 };
  if (alpha) return { label: 'ALFA', color: '#ff6a5a', glow: 2 };
  if (rarity === 'epic') return { label: 'ÉPICO', color: '#d07cff', glow: 1 };
  if (rarity === 'rare') return { label: 'RARO', color: '#5fb4ff', glow: 0 };
  return { label: '', color: '#ffffff', glow: 0 };
}
