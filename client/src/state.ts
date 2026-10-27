// Estado del cliente (copia de lo que envía el servidor) + bus de eventos para la interfaz.
import type { ActiveLink } from '../../shared/progression';
import type { Waypoint } from './systems/navigation';

export interface MonSave { uid: string; sp: string; lvl: number; xp: number; iv: number[]; shiny: boolean; fr: number; caught: number; zone: number; nick?: string; fav?: boolean; ot?: string; nat?: number; }
export interface Core {
  name: string; look: any; tlvl: number; txp: number; money: number; crystals: number; tokens: number;
  ess: Record<string, number>; candies: Record<string, number>; items: Record<string, number>; team: string[];
  dex: { seen: Record<string, number>; caught: Record<string, number>; shiny: Record<string, number> };
  upgrades: Record<string, number>; claimed: string[]; bounties: any[]; stats: Record<string, number>;
  zones: number[]; towns: number[]; expeditions: any[]; links: ActiveLink[]; lastTown: number; pickups: Record<string, number>;
  xpBoost: number; incense: number;
  stance?: string; pvp?: { elo: number; w: number; l: number }; playtime?: number;
  medals?: number[];
}
export interface PMeta { id: number; n: string; lv: number; look: any; party: number; z: number; }
export interface TeamLive { uid: string; lvl: number; xp: number; hp: number; mhp: number; revive: number; status: number; eid: number; }

export interface Settings { music: number; sfx: number; particles: 'high' | 'low'; names: boolean; dmg: boolean; zoom: number; ball: string; vfx?: boolean; }

const defaults: Settings = { music: 0.35, sfx: 0.6, particles: 'high', names: true, dmg: true, zoom: 0, ball: 'pokeball', vfx: true };

function loadSettings(): Settings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('prw_settings') || '{}') }; } catch { return { ...defaults }; }
}

export const S = {
  myId: 0,
  guest: true,
  core: null as Core | null,
  mons: [] as MonSave[],
  team: [] as TeamLive[],
  players: new Map<number, PMeta>(),
  bosses: [] as any[],
  events: new Map<number, any>(),
  party: { id: 0, members: [] as any[] },
  me: { hp: 100, mhp: 100, cds: [0, 0, 0, 0, 0], rush: 0, focus: 0, stance: 'attack', duel: 0, fight: false },
  duel: null as null | { id: number; op: number; opName: string; opElo: number; elo: number; cx: number; cy: number; r: number; goAt: number; end: number; go: boolean },
  drops: [] as { id: number; x: number; y: number; tier: number; mine: boolean }[],
  tg: [] as any[],
  zone: 0,
  focusInfo: null as null | { id: number; key: string; lvl: number; hp: number; shiny: boolean; flags: number; status?: number },
  waypoint: null as Waypoint | null,
  route: null as { x: number; y: number }[] | null,   // ruta guiada hasta S.waypoint (se recalcula sola)
  routeLen: 0,
  life: { ai: [] as any[], mc: [] as any[], cv: [] as any[] },   // IAs, mercaderes y cuevas cercanos (instantánea)
  gym: null as null | { id: number; end: number; left: number; total: number },
  trade: null as any,
  rank: null as null | Record<string, { n: string; v: number }[]>,
  duelTop: [] as { n: string; elo: number; w: number; l: number }[],
  daily: null as null | { streak: number; day: number; lines: string[]; table: any[] },
  chain: null as null | { sp: string; n: number },
  settings: loadSettings(),
  connected: false,
  seed: 0,
  shinyBase: 4096,
};

export function saveSettings() { try { localStorage.setItem('prw_settings', JSON.stringify(S.settings)); } catch { /* */ } }
export function monByUid(uid: string) { return S.mons.find(m => m.uid === uid); }

type Fn = (d?: any) => void;
const listeners = new Map<string, Fn[]>();
export const bus = {
  on(ev: string, fn: Fn) { let a = listeners.get(ev); if (!a) { a = []; listeners.set(ev, a); } a.push(fn); return () => { const i = a!.indexOf(fn); if (i >= 0) a!.splice(i, 1); }; },
  emit(ev: string, d?: any) { const a = listeners.get(ev); if (a) for (const f of [...a]) { try { f(d); } catch (e) { console.error('bus', ev, e); } } },
};
