// Fórmulas y definiciones de progresión compartidas (cliente las muestra, servidor las aplica).
import { SPECIES, SpeciesDef } from './species';
import { TYPES, TYPE_NAMES, PType } from './types';
import { MOVES, MoveDef } from './moves';
import { BAL } from './balance';

// ---------- Experiencia ----------
/** Sin tope práctico: a partir del 100 cada nivel cuesta un 4-5 % más que el anterior (farmeo infinito, cada vez más duro). */
export const MAX_LEVEL = 9999;
/** Curva de EXP de Pokémon: cúbica, que se endurece a partir del nivel MON_XP_LATE_FROM y se vuelve exponencial tras el 100. */
export function monXpForLevel(l: number) {
  const late = 1 + Math.max(0, l - BAL.MON_XP_LATE_FROM) / BAL.MON_XP_LATE_DIV;
  const beyond = l > 100 ? Math.pow(1.04, l - 100) : 1;
  return Math.floor(BAL.MON_XP_K * l * l * l * late * beyond);
}
export function trainerXpForLevel(l: number) {
  if (l <= 1) return 0;
  const beyond = l > 100 ? Math.pow(1.05, l - 100) : 1;
  return Math.floor(BAL.TRAINER_XP_K * Math.pow(l - 1, BAL.TRAINER_XP_EXP) * beyond);
}
export function levelFromXp(xp: number, fn: (l: number) => number, max = MAX_LEVEL) {
  let l = 1;
  while (l < max && xp >= fn(l + 1)) l++;
  return l;
}

// ---------- Estadísticas ----------
export interface Stats { hp: number; atk: number; def: number; spd: number; }
/** Naturalezas: cada Pokémon nace con una que sube una estadística un 10 % y baja otra un 10 %. */
export const NATURES: { name: string; up: number; down: number }[] = [
  ['Fuerte', -1, -1], ['Firme', 1, 3], ['Audaz', 1, 2], ['Pícara', 1, 0], ['Osada', 2, 1], ['Plácida', 2, 3], ['Agitada', 2, 0], ['Floja', 2, 1],
  ['Miedosa', 3, 1], ['Activa', 3, 2], ['Alegre', 3, 0], ['Ingenua', 3, 2], ['Serena', 0, 1], ['Grosera', 0, 3], ['Cauta', 0, 2], ['Seria', -1, -1],
].map(([name, up, down]) => ({ name: name as string, up: up as number, down: down as number }));
export const STAT_KEYS = ['hp', 'atk', 'def', 'spd'] as const;
/** Estadísticas reales: especie + nivel + IV (0-31, distintos en cada ejemplar) + naturaleza. */
export function calcStats(sp: SpeciesDef, lvl: number, iv: number[], nat = 0): Stats {
  const n = NATURES[nat] || NATURES[0];
  const m = (i: number) => (n.up === i && n.down !== i ? (i === 0 ? 1.05 : 1.1) : n.down === i && n.up !== i ? (i === 0 ? 0.95 : 0.9) : 1);
  return {
    hp: Math.floor(((2 * sp.base.hp + iv[0]) * lvl / 100 + lvl + 10) * m(0)),
    atk: Math.floor(((2 * sp.base.atk + iv[1]) * lvl / 100 + 5) * m(1)),
    def: Math.floor(((2 * sp.base.def + iv[2]) * lvl / 100 + 5) * m(2)),
    spd: Math.floor((sp.base.spd + iv[3]) * m(3)),
  };
}
/** Valoración de un ejemplar (0-100 %) según sus IV, para mostrar "★★★" y elegir los mejores. */
export function ivPercent(iv: number[]) { return Math.round((iv[0] + iv[1] + iv[2] + iv[3]) / (4 * 31) * 100); }

/** Caramelos de la familia que cuesta evolucionar: más caro cuanto más avanzada la etapa. */
export function evoCandyCost(sp: SpeciesDef) { return sp.stage <= 1 ? 25 : sp.stage === 2 ? 75 : 150; }
export function attackSpeedMult(spd: number) { return 0.75 + spd / 220; }
export function knownMoves(sp: SpeciesDef, lvl: number): { basic: MoveDef; special: MoveDef | null } {
  let basic: MoveDef | null = null, special: MoveDef | null = null;
  let bl = -1, sl = -1;
  for (const [l, id] of sp.moves) {
    if (l > lvl) continue;
    const m = MOVES[id];
    if (!m) continue;
    if (m.cat === 'basic' && l >= bl) { basic = m; bl = l; }
    if (m.cat === 'special' && l >= sl) { special = m; sl = l; }
  }
  return { basic: basic || MOVES.placaje, special };
}

// ---------- Entrenador ----------
export function teamSlotsFor(level: number) { return level >= 10 ? 6 : level >= 6 ? 5 : level >= 3 ? 4 : 3; }
export function trainerMaxHp(level: number, hpUpg: number) { return Math.floor((100 + level * 12) * (1 + hpUpg * 0.05)); }

export interface SkillDef { n: number; id: string; name: string; desc: string; cd: number; unlock: number; key: string; }
export const SKILLS: SkillDef[] = [
  { n: 1, id: 'rush', name: 'Ataque Rush', desc: '+60% velocidad de ataque del equipo durante 6 s.', cd: 20, unlock: 1, key: '1' },
  { n: 2, id: 'heal', name: 'Pulso Curativo', desc: 'Cura 35% PS al equipo y 30% al entrenador. Elimina estados.', cd: 30, unlock: 3, key: '2' },
  { n: 3, id: 'order', name: 'Orden Definitiva', desc: 'Todo el equipo usa su movimiento especial al instante con +50% daño.', cd: 18, unlock: 5, key: '3' },
  { n: 4, id: 'dash', name: 'Esquiva', desc: 'Impulso rápido en la dirección de movimiento. Invulnerable 0,5 s.', cd: 5, unlock: 1, key: '4' },
];

// ---------- Mejoras ----------
export type Currency = 'money' | 'crystals' | PType;
export interface UpgradeDef { id: string; name: string; desc: string; cur: Currency; base: number; growth: number; max: number; group: 'core' | 'auto' | 'affinity'; effect: (l: number) => string; }

const pct = (v: number) => `+${Math.round(v * 100)}%`;
export const CATCH_BONUS = (l: number) => 0.6 * (1 - Math.pow(0.9, l));

export const UPGRADES: UpgradeDef[] = [
  { id: 'dmg', name: 'Poder', desc: 'Daño de todo el equipo.', cur: 'money', base: 80, growth: 1.42, max: 60, group: 'core', effect: l => pct(l * 0.10) + ' daño' },
  { id: 'hp', name: 'Vitalidad', desc: 'PS del equipo (+10%/nivel) y del entrenador (+5%/nivel).', cur: 'money', base: 80, growth: 1.42, max: 60, group: 'core', effect: l => pct(l * 0.10) + ' PS' },
  { id: 'aspd', name: 'Ritmo', desc: 'Velocidad de ataque del equipo.', cur: 'money', base: 140, growth: 1.55, max: 20, group: 'core', effect: l => pct(l * 0.05) + ' vel. ataque' },
  { id: 'xp', name: 'Estudio', desc: 'Experiencia obtenida por Pokémon y entrenador.', cur: 'money', base: 150, growth: 1.5, max: 30, group: 'core', effect: l => pct(l * 0.08) + ' EXP' },
  { id: 'catch', name: 'Captura', desc: 'Probabilidad de captura (rendimiento decreciente, máx. +60%).', cur: 'money', base: 200, growth: 1.55, max: 25, group: 'core', effect: l => pct(CATCH_BONUS(l)) + ' captura' },
  { id: 'area', name: 'Alcance', desc: 'Radio de ataques en área y distancia de detección.', cur: 'money', base: 250, growth: 1.6, max: 15, group: 'core', effect: l => pct(l * 0.06) + ' radio' },
  { id: 'luck', name: 'Fortuna', desc: 'Dinero y probabilidad de botín.', cur: 'money', base: 150, growth: 1.5, max: 30, group: 'core', effect: l => pct(l * 0.10) + ' botín' },
  { id: 'crit', name: 'Precisión', desc: 'Probabilidad de golpe crítico.', cur: 'crystals', base: 2, growth: 1.5, max: 15, group: 'core', effect: l => pct(l * 0.02) + ' crítico' },
  { id: 'regen', name: 'Regeneración', desc: 'Regeneración de PS del equipo incluso en combate.', cur: 'crystals', base: 2, growth: 1.6, max: 10, group: 'core', effect: l => `${l}% PS/s` },
  { id: 'magnet', name: 'Imán de botín', desc: 'Recoge objetos del suelo automáticamente a tu alrededor.', cur: 'crystals', base: 3, growth: 2, max: 3, group: 'auto', effect: l => l ? `radio ${l * 2} casillas` : 'inactivo' },
  { id: 'autoball', name: 'Lanzador automático', desc: 'Lanza Poké Balls solo a especies que no tienes cuando su vida baja del 30%.', cur: 'crystals', base: 8, growth: 1, max: 1, group: 'auto', effect: l => l ? 'activo' : 'inactivo' },
  { id: 'autoheal', name: 'Botiquín automático', desc: 'Usa una Poción automáticamente cuando el equipo baja del 25% de PS.', cur: 'crystals', base: 6, growth: 1, max: 1, group: 'auto', effect: l => l ? 'activo' : 'inactivo' },
  { id: 'shinycharm', name: 'Amuleto Iris', desc: 'Duplica la probabilidad de que aparezcan Pokémon shiny para ti.', cur: 'crystals', base: 60, growth: 1, max: 1, group: 'auto', effect: l => l ? 'shiny x2' : 'inactivo' },
  { id: 'exp_slots', name: 'Base de expediciones', desc: 'Equipos de expedición simultáneos.', cur: 'crystals', base: 5, growth: 2.2, max: 2, group: 'auto', effect: l => `${1 + l} equipos` },
  { id: 'exp_reward', name: 'Logística', desc: 'Recompensas de las expediciones.', cur: 'crystals', base: 3, growth: 1.6, max: 10, group: 'auto', effect: l => pct(l * 0.15) + ' recompensas' },
  ...TYPES.map(t => ({
    id: 'aff_' + t, name: 'Afinidad ' + TYPE_NAMES[t], desc: `Daño de movimientos de tipo ${TYPE_NAMES[t]}. Se paga con esencias ${TYPE_NAMES[t]}.`,
    cur: t as Currency, base: 8, growth: 1.45, max: 20, group: 'affinity' as const, effect: (l: number) => pct(l * 0.06) + ' daño ' + TYPE_NAMES[t],
  })),
];
export const UPGRADE_MAP: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
export function upgradeCost(u: UpgradeDef, lvl: number) { return Math.ceil(u.base * Math.pow(u.growth, lvl)); }

// ---------- Pokémon Link (sinergias) ----------
export interface LinkDef { id: string; name: string; types?: PType[]; need: number; color: string; desc: string; }
export const LINKS: LinkDef[] = [
  { id: 'electric_chain', name: 'Electric Chain', types: ['electric'], need: 2, color: '#f8d030', desc: 'Los golpes eléctricos rebotan a 2 enemigos cercanos con 35% del daño. Nivel II (3+): 3 rebotes al 45%.' },
  { id: 'firestorm', name: 'Firestorm', types: ['fire'], need: 2, color: '#f08030', desc: 'Los golpes de fuego acumulan Calor; con 4 cargas el objetivo explota (150% del golpe en área 2). Nivel II: 3 cargas.' },
  { id: 'ocean_surge', name: 'Ocean Surge', types: ['water'], need: 2, color: '#6890f0', desc: 'Cada 7 s una gran ola barre el frente del equipo (daño Agua en línea). Nivel II: cada 5 s y más ancha.' },
  { id: 'shadow_rift', name: 'Shadow Rift', types: ['ghost'], need: 2, color: '#a070e0', desc: '20% de los golpes abren un portal sombrío que vuelve a golpear con 60% del daño. Nivel II: 30%.' },
  { id: 'verdant_bloom', name: 'Verdant Bloom', types: ['grass'], need: 2, color: '#78c850', desc: 'Cada 5 s el equipo recupera 4% de PS. Nivel II: 6%.' },
  { id: 'stone_guard', name: 'Stone Guard', types: ['rock', 'ground'], need: 2, color: '#b8a038', desc: 'El equipo recibe 15% menos daño. Nivel II: 25%.' },
  { id: 'mind_link', name: 'Mind Link', types: ['psychic'], need: 2, color: '#f85888', desc: 'Recarga de movimientos especiales -20%. Nivel II: -30%.' },
  { id: 'dragon_pride', name: 'Dragon Pride', types: ['dragon'], need: 2, color: '#7038f8', desc: '+50% daño crítico y +5% probabilidad de crítico para todo el equipo.' },
  { id: 'sky_squadron', name: 'Sky Squadron', types: ['flying'], need: 2, color: '#a890f0', desc: '+20% distancia de detección y +10% velocidad de ataque. Nivel II: +15%.' },
  { id: 'toxic_mist', name: 'Toxic Mist', types: ['poison'], need: 2, color: '#a040a0', desc: '+15% probabilidad de envenenar. Los enemigos envenenados reciben +15% daño.' },
  { id: 'swarm', name: 'Swarm', types: ['bug'], need: 2, color: '#a8b820', desc: 'Cada enemigo derrotado da +5% vel. de ataque durante 8 s (máx. 6 cargas).' },
  { id: 'fairy_light', name: 'Fairy Light', types: ['fairy', 'normal'], need: 3, color: '#ee99ac', desc: 'Los golpes curan al aliado más herido un 12% del daño causado.' },
  { id: 'steel_core', name: 'Steel Core', types: ['steel'], need: 1, color: '#b8b8d0', desc: '+12% defensa del equipo por cada Pokémon de tipo Acero.' },
  { id: 'evolution_resonance', name: 'Evolution Resonance', need: 2, color: '#ffffff', desc: 'Miembros de la misma familia evolutiva: +15% ataque y defensa. Con 3 de la familia: +30%.' },
  { id: 'prism', name: 'Prism Team', need: 5, color: '#ffcf3f', desc: '5 o más tipos distintos en el equipo: +10% daño y +10% EXP.' },
];
export const LINK_MAP: Record<string, LinkDef> = Object.fromEntries(LINKS.map(l => [l.id, l]));

export interface ActiveLink { id: string; tier: number; members: number[]; }
/** Calcula las sinergias activas para un equipo (lista de claves de especie). */
export function computeLinks(teamKeys: string[]): ActiveLink[] {
  const res: ActiveLink[] = [];
  const sps = teamKeys.map(k => SPECIES[k]).filter(Boolean);
  for (const L of LINKS) {
    if (L.types) {
      const members: number[] = [];
      sps.forEach((sp, i) => { if (sp.types.some(t => L.types!.includes(t))) members.push(i); });
      if (members.length >= L.need) res.push({ id: L.id, tier: members.length >= L.need + 1 ? 2 : 1, members });
    }
  }
  // familias
  const fam: Record<string, number[]> = {};
  sps.forEach((sp, i) => { (fam[sp.family] ||= []).push(i); });
  const famMembers: number[] = []; let tier = 0;
  for (const f in fam) if (fam[f].length >= 2) { famMembers.push(...fam[f]); tier = Math.max(tier, fam[f].length >= 3 ? 2 : 1); }
  if (famMembers.length) res.push({ id: 'evolution_resonance', tier, members: famMembers });
  // prisma
  const types = new Set<string>(); sps.forEach(sp => sp.types.forEach(t => types.add(t)));
  if (types.size >= 5) res.push({ id: 'prism', tier: 1, members: sps.map((_, i) => i) });
  return res;
}

// ---------- Misiones ----------
export interface Reward { money?: number; crystals?: number; txp?: number; items?: Record<string, number>; }
export interface QuestDef { id: string; name: string; desc: string; stat: string; n: number; reward: Reward; }
export const QUESTS: QuestDef[] = [
  { id: 'q1', name: 'Primeros pasos', desc: 'Derrota 5 Pokémon salvajes.', stat: 'kills', n: 5, reward: { money: 150, txp: 60, items: { pokeball: 5 } } },
  { id: 'q2', name: '¡Atrápalo!', desc: 'Captura 2 Pokémon.', stat: 'catches', n: 2, reward: { money: 150, txp: 80, items: { pokeball: 5 } } },
  { id: 'q3', name: 'Un buen equipo', desc: 'Ten 3 Pokémon en tu equipo.', stat: 'teamSize', n: 3, reward: { crystals: 2, txp: 100 } },
  { id: 'q4', name: 'Inversión', desc: 'Compra 3 mejoras.', stat: 'upgrades', n: 3, reward: { money: 400, txp: 100 } },
  { id: 'q5', name: 'Hacia Ciudad Verde', desc: 'Descubre Ciudad Verde (al norte de Paleta).', stat: 'zone_3', n: 1, reward: { money: 500, txp: 160, items: { superball: 3 } } },
  { id: 'q6', name: 'Pokémon Link', desc: 'Activa una sinergia de equipo (2 Pokémon del mismo tipo).', stat: 'links', n: 1, reward: { crystals: 3, txp: 160 } },
  { id: 'q7', name: '¡Está evolucionando!', desc: 'Evoluciona un Pokémon.', stat: 'evolves', n: 1, reward: { crystals: 3, money: 600, txp: 220 } },
  { id: 'q8', name: 'Entrenamiento', desc: 'Derrota 100 Pokémon salvajes.', stat: 'kills', n: 100, reward: { money: 1500, txp: 400 } },
  { id: 'q9', name: 'Investigador', desc: 'Registra 12 especies capturadas en la Pokédex.', stat: 'dexCaught', n: 12, reward: { crystals: 5, txp: 500, items: { ultraball: 3 } } },
  { id: 'q10', name: 'Trotamundos', desc: 'Descubre 7 zonas distintas.', stat: 'zones', n: 7, reward: { crystals: 4, txp: 450 } },
  { id: 'q11', name: 'Espeleólogo', desc: 'Entra en una cueva o en la Torre Pokémon.', stat: 'dungeons', n: 1, reward: { money: 1200, txp: 450 } },
  { id: 'q12', name: 'Cazador de jefes', desc: 'Derrota a un jefe de mundo (Snorlax duerme al norte de Ciudad Verde).', stat: 'bosses', n: 1, reward: { crystals: 8, txp: 900, items: { ultraball: 5 } } },
  { id: 'q13', name: 'Héroe local', desc: 'Participa en un evento mundial.', stat: 'events', n: 1, reward: { crystals: 5, txp: 500 } },
  { id: 'q14', name: 'Exploradores', desc: 'Completa una expedición (nivel 5 de entrenador).', stat: 'expeditions', n: 1, reward: { crystals: 4, txp: 400 } },
  { id: 'q15', name: 'Familia completa', desc: 'Captura todas las etapas de una familia evolutiva.', stat: 'families', n: 1, reward: { crystals: 6, money: 2500, txp: 800 } },
  { id: 'q16', name: 'Cofres del mundo', desc: 'Abre 15 cofres.', stat: 'chests', n: 15, reward: { crystals: 6, txp: 600 } },
  { id: 'q17', name: 'Veterano', desc: 'Derrota 1000 Pokémon salvajes.', stat: 'kills', n: 1000, reward: { crystals: 12, money: 10000, txp: 3000 } },
  { id: 'q18', name: 'Leyenda', desc: 'Derrota 5 jefes de mundo.', stat: 'bosses', n: 5, reward: { crystals: 15, txp: 3000, items: { masterball: 1 } } },
  { id: 'q19', name: '¡Brillante!', desc: 'Captura un Pokémon shiny.', stat: 'shinies', n: 1, reward: { crystals: 20, txp: 2000, items: { masterball: 1 } } },
  { id: 'q20', name: 'Maestro Pokédex', desc: 'Registra 40 especies capturadas.', stat: 'dexCaught', n: 40, reward: { crystals: 30, txp: 6000, items: { masterball: 1 } } },
];
export const QUEST_MAP: Record<string, QuestDef> = Object.fromEntries(QUESTS.map(q => [q.id, q]));

// ---------- Expediciones ----------
export interface ExpeditionDef { id: string; name: string; desc: string; dur: number; minTrainer: number; }
export const EXPEDITIONS: ExpeditionDef[] = [
  { id: 'materials', name: 'Búsqueda de materiales', desc: 'Recolectan esencias de los tipos de los Pokémon enviados.', dur: 5 * 60, minTrainer: 5 },
  { id: 'items', name: 'Recolección de objetos', desc: 'Vuelven con Poké Balls, pociones y Pokédólares.', dur: 10 * 60, minTrainer: 5 },
  { id: 'habitat', name: 'Investigación de hábitats', desc: 'Ganan experiencia y caramelos de su familia.', dur: 15 * 60, minTrainer: 7 },
  { id: 'cave', name: 'Exploración de cuevas', desc: 'Cristales y probabilidad de piedras evolutivas.', dur: 30 * 60, minTrainer: 10 },
  { id: 'clues', name: 'Pistas de Pokémon raros', desc: 'Traen Incienso Raro y cristales.', dur: 60 * 60, minTrainer: 14 },
];
export const EXPEDITION_MAP: Record<string, ExpeditionDef> = Object.fromEntries(EXPEDITIONS.map(e => [e.id, e]));

// ---------- Captura ----------
/** Probabilidad de captura de un intento (fórmula de las ediciones clásicas: a/255). */
export function catchChance(catchRate: number, hpFrac: number, ballBonus: number, statusBonus: number, upgradeBonus: number, levelPenalty: number, rarityMult = 1) {
  if (ballBonus >= 999) return 1;
  // Como en los juegos originales cuenta mucho la vida que le queda: a tope apenas se deja; casi debilitado, mucho más.
  const h = Math.max(0, Math.min(1, hpFrac));
  const hpFactor = Math.pow((3 - 2 * h) / 3, 1.6);
  const a = catchRate * ballBonus * hpFactor * statusBonus;
  return Math.min(0.9, (a / 255) * BAL.CATCH_MULT * (1 + upgradeBonus) * levelPenalty * rarityMult);
}
/** Los Pokémon buenos cuestan mucho más de atrapar. */
export const RARITY_CATCH: Record<string, number> = { common: 1, uncommon: 0.85, rare: 0.65, epic: 0.45, legendary: 0.5, mythic: 0.35 };
export const STATUS_CATCH = [1, 1.5, 1.5, 1.5, 2.5, 2.5]; // ninguno, quemado, envenenado, paralizado, dormido, congelado
/** Captura crítica: más probable cuantas más especies has capturado (máx. 20%). */
export function critCaptureChance(dexCaught: number) { return Math.min(0.2, dexCaught / 320); }
/** Probabilidad total contando la captura crítica (que solo necesita superar una sacudida). */
export function captureProbability(p: number, crit: number) {
  if (p >= 1) return 1;
  return crit * Math.pow(p, 0.25) + (1 - crit) * p;
}
/** Tirada real: cuatro comprobaciones de sacudida con prob. p^(1/4) cada una (p total = p). */
export function rollCapture(p: number, crit: number, rnd: () => number = Math.random) {
  if (p >= 1) return { success: true, shakes: 3, critical: false };
  const q = Math.pow(p, 0.25);
  if (rnd() < crit) { const ok = rnd() < q; return { success: ok, shakes: 1, critical: true }; }
  let n = 0;
  while (n < 4 && rnd() < q) n++;
  return { success: n === 4, shakes: Math.min(3, n), critical: false };
}
/** Multiplicador shiny por cadena de capturas de la misma especie (x1 → x4 a las 30 seguidas). */
export function chainShinyMult(chain: number) { return Math.min(4, 1 + chain / 10); }

// ---------- Caramelos ----------
/** Caramelos para subir un nivel: barato al principio, muy caro en niveles altos. */
export function candyCostForLevel(lvl: number) { return Math.ceil(1 + lvl / 6 + Math.pow(lvl / 20, 3)); }
export function transferCandies(stage: number, shiny: boolean) { return (2 + stage) * (shiny ? 3 : 1); }

export function evolutionCandidates(key: string) { return SPECIES[key]?.evo || []; }
