// Esquema del guardado de un jugador + valores por defecto + saneamiento.
import crypto from 'node:crypto';
import { SPECIES, FAMILIES } from '../../shared/species';
import { TYPES } from '../../shared/types';
import { monXpForLevel, trainerXpForLevel } from '../../shared/progression';
import { TOWN_LIST } from '../../shared/world/worldgen';

export interface MonSave { uid: string; sp: string; lvl: number; xp: number; iv: number[]; shiny: boolean; fr: number; caught: number; zone: number; nick?: string; fav?: boolean; ot?: string; nat?: number; }
export interface Look { hat: number; shirt: number; skin: number; hair: number; pants?: number; cap?: number; style?: number; acc?: number; }
export interface Bounty { id: string; kind: 'kill_type' | 'kill_zone' | 'catch'; target: string; n: number; prog: number; reward: { money: number; crystals: number; txp: number }; desc: string; }
export interface Expedition { slot: number; id: string; uids: string[]; start: number; end: number; }

export interface SaveData {
  v: number;
  name: string;
  look: Look;
  x: number; y: number;
  lastTown: number;
  tlvl: number; txp: number;
  money: number; crystals: number; tokens: number;
  ess: Record<string, number>;
  candies: Record<string, number>;
  items: Record<string, number>;
  mons: MonSave[];
  team: string[];
  dex: { seen: Record<string, number>; caught: Record<string, number>; shiny: Record<string, number> };
  upgrades: Record<string, number>;
  claimed: string[];
  bounties: Bounty[];
  stats: Record<string, number>;
  zones: number[];
  towns: number[];
  pickups: Record<string, number>;
  expeditions: Expedition[];
  playtime: number;
  created: number;
  chain: { sp: string; n: number } | null;
  medals: number[];
  daily: { last: string; streak: number };
  stance?: string;
  pvp: { elo: number; w: number; l: number };
}

export function newUid() { return crypto.randomBytes(6).toString('base64url'); }

export function createMon(sp: string, lvl: number, shiny = false, zone = 0, ivs?: number[], nat?: number): MonSave {
  // cada ejemplar es distinto: IV de 0 a 31 en cada estadística y una naturaleza al azar
  const iv = ivs || [0, 0, 0, 0].map(() => Math.floor(Math.random() * 32));
  return { uid: newUid(), sp, lvl, xp: monXpForLevel(lvl), iv, shiny, fr: 70, caught: Date.now(), zone, nat: nat ?? Math.floor(Math.random() * 16) };
}

export function defaultSave(name: string): SaveData {
  const t = TOWN_LIST[0];
  return {
    v: 1, name,
    look: { hat: 0, shirt: 0, skin: 0, hair: 0 },
    x: t.x + 0.5, y: t.y + 2.5, lastTown: t.id,
    tlvl: 1, txp: 0, money: 300, crystals: 0, tokens: 0,
    ess: Object.fromEntries(TYPES.map(t => [t, 0])),
    candies: {},
    items: { pokeball: 10, pocion: 3 },
    mons: [], team: [],
    dex: { seen: {}, caught: {}, shiny: {} },
    upgrades: {},
    claimed: [], bounties: [],
    stats: { kills: 0, catches: 0, evolves: 0, bosses: 0, events: 0, chests: 0, expeditions: 0, upgrades: 0, shinies: 0, dungeons: 0, links: 0, deaths: 0 },
    zones: [t.id], towns: [t.id],
    pickups: {}, expeditions: [],
    playtime: 0, created: Date.now(),
    chain: null, medals: [], daily: { last: '', streak: 0 },
    stance: 'attack', pvp: { elo: 1000, w: 0, l: 0 },
  };
}

const num = (v: any, d: number, min = -Infinity, max = Infinity) => (typeof v === 'number' && isFinite(v) ? Math.min(max, Math.max(min, v)) : d);

/** Sanea un guardado cargado de la base de datos (tolerante a versiones antiguas). */
export function sanitizeSave(raw: any, name: string): SaveData {
  const d = defaultSave(name);
  if (!raw || typeof raw !== 'object') return d;
  const s: SaveData = { ...d, ...raw };
  s.look = { ...d.look, ...(raw.look || {}) };
  s.x = num(raw.x, d.x, 0, 560); s.y = num(raw.y, d.y, 0, 400);
  s.tlvl = num(raw.tlvl, 1, 1, 9999); s.txp = num(raw.txp, 0, 0);
  s.money = Math.floor(num(raw.money, d.money, 0)); s.crystals = Math.floor(num(raw.crystals, 0, 0)); s.tokens = Math.floor(num(raw.tokens, 0, 0));
  s.ess = { ...d.ess, ...(raw.ess || {}) };
  s.candies = { ...(raw.candies || {}) };
  s.items = { ...(raw.items || {}) };
  s.mons = Array.isArray(raw.mons) ? raw.mons.filter((m: any) => m && SPECIES[m.sp] && typeof m.uid === 'string').map((m: any) => ({
    uid: m.uid, sp: m.sp, lvl: num(m.lvl, 1, 1, 9999), xp: num(m.xp, 0, 0), iv: Array.isArray(m.iv) && m.iv.length === 4 ? m.iv.map((x: any) => num(x, 0, 0, 31)) : [8, 8, 8, 8], nat: Math.floor(num(m.nat, 0, 0, 15)),
    shiny: !!m.shiny, fr: num(m.fr, 70, 0, 255), caught: num(m.caught, Date.now()), zone: num(m.zone, 0, 0, 30),
    nick: typeof m.nick === 'string' ? m.nick.slice(0, 12) : undefined, fav: !!m.fav, ot: typeof m.ot === 'string' ? m.ot.slice(0, 16) : undefined,
  })) : [];
  // migración v2: curvas de EXP nuevas → la EXP guardada nunca queda por debajo del nivel alcanzado
  for (const m of s.mons) if (m.xp < monXpForLevel(m.lvl)) m.xp = monXpForLevel(m.lvl);
  if (s.txp < trainerXpForLevel(s.tlvl)) s.txp = trainerXpForLevel(s.tlvl);
  s.chain = raw.chain && typeof raw.chain.sp === 'string' && SPECIES[raw.chain.sp] ? { sp: raw.chain.sp, n: num(raw.chain.n, 1, 1, 9999) } : null;
  s.medals = Array.isArray(raw.medals) ? raw.medals.filter((x: any) => typeof x === 'number') : [];
  s.pvp = { elo: num(raw.pvp?.elo, 1000, 0, 5000), w: num(raw.pvp?.w, 0, 0), l: num(raw.pvp?.l, 0, 0) };
  s.stance = typeof raw.stance === 'string' ? raw.stance : 'attack';
  s.daily = { last: typeof raw.daily?.last === 'string' ? raw.daily.last : '', streak: num(raw.daily?.streak, 0, 0, 10000) };
  const uids = new Set(s.mons.map(m => m.uid));
  s.team = Array.isArray(raw.team) ? raw.team.filter((u: any) => uids.has(u)).slice(0, 6) : [];
  s.dex = { seen: { ...(raw.dex?.seen || {}) }, caught: { ...(raw.dex?.caught || {}) }, shiny: { ...(raw.dex?.shiny || {}) } };
  s.upgrades = { ...(raw.upgrades || {}) };
  s.claimed = Array.isArray(raw.claimed) ? raw.claimed.filter((x: any) => typeof x === 'string') : [];
  s.bounties = Array.isArray(raw.bounties) ? raw.bounties : [];
  s.stats = { ...d.stats, ...(raw.stats || {}) };
  s.zones = Array.isArray(raw.zones) ? raw.zones.filter((z: any) => typeof z === 'number') : d.zones;
  s.towns = Array.isArray(raw.towns) ? raw.towns.filter((z: any) => typeof z === 'number') : d.towns;
  s.pickups = { ...(raw.pickups || {}) };
  s.expeditions = Array.isArray(raw.expeditions) ? raw.expeditions.filter((e: any) => e && Array.isArray(e.uids)) : [];
  return s;
}

export function familyComplete(save: SaveData): number {
  let n = 0;
  for (const f in FAMILIES) {
    const members = FAMILIES[f];
    if (members.length >= 2 && members.every(k => (save.dex.caught[k] || 0) > 0)) n++;
  }
  return n;
}
