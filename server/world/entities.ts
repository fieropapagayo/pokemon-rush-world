// Entidades simuladas en el servidor.
import type { WebSocket } from 'ws';
import { SpeciesDef, SPECIES, SPECIES_INDEX } from '../../shared/species';
import { MoveDef } from '../../shared/moves';
import { calcStats, knownMoves, ActiveLink, trainerMaxHp } from '../../shared/progression';
import type { SaveData, MonSave } from '../players/save';

export interface Mods { dmg: number; def: number; aspd: number; crit: number; critDmg: number; cdSpecial: number; area: number; hp: number; }
export const DEFAULT_MODS: Mods = { dmg: 1, def: 1, aspd: 1, crit: 0, critDmg: 1.5, cdSpecial: 1, area: 1, hp: 1 };

export interface CaptureState { by: number; until: number; success: boolean; shakes: number; ball: string; }

export interface BossState {
  key: string; name: string; spotIndex: number;
  nextAbility: number; abilityIdx: number; enraged: boolean;
  barrierUntil: number; restUntil: number; restDmg: number; staggerUntil: number; lastRest: number;
  scaleCheck: number; players: number; baseMax: number; engaged: boolean; minionsAt: number;
  hidden: boolean; abilities: string[];
}

export class MonEntity {
  id: number;
  sp: SpeciesDef; key: string; spIdx: number;
  lvl: number; shiny: boolean; iv: number[];
  owner: PlayerSession | null = null; uid: string | null = null; slot = 0;
  x: number; y: number; homeX: number; homeY: number; facing = 1;
  hp = 1; maxHp = 1; atk = 1; def = 1; spd = 50;
  basic!: MoveDef; special: MoveDef | null = null;
  cdB = 0; cdS = 0;
  target: MonEntity | PlayerSession | null = null; targetEvalAt = 0;
  status = 0; statusUntil = 0; statusTick = 0; statusOwner = 0;
  heat = 0;
  fainted = false; reviveAt = 0; removeAt = 0;
  state: 'wander' | 'chase' | 'flee' | 'return' | 'capturing' | 'idle' = 'wander';
  wanderAt = 0; wx = 0; wy = 0;
  dmgBy = new Map<number, number>();
  lastHurtAt = 0; lastActAt = 0;
  rare = false; alpha = false; boss: BossState | null = null; eventId = 0;
  privateTo = 0; // Pokémon de líder de gimnasio: solo combate contra este jugador
  capture: CaptureState | null = null;
  exhaustedUntil = 0; triedBy = new Set<number>();
  invulnUntil = 0;
  habitat: 'land' | 'water' | 'air';
  spawnedAt = Date.now(); lonelySince = 0; fleeUntil = 0;
  mods: Mods = { ...DEFAULT_MODS };
  hpMult = 1;
  zone = 0;
  ambushFor = 0;          // jugador al que sorprendió (encuentro por pasos)
  aggro = false;          // va directo a por el entrenador
  roamer = false;         // legendario errante
  ignoreP = 0; ignoreUntil = 0; // tras huir, deja en paz a ese jugador un rato
  hitP = new Map<number, number>(); // jugadores a los que ha golpeado (y cuándo)
  nat = 0;
  // seguimiento natural (aliados)
  followPhase = Math.random() * Math.PI * 2; idleX = 0; idleY = 0; idleAt = 0; lag = 0.8 + Math.random() * 0.5;

  constructor(id: number, key: string, lvl: number, x: number, y: number, shiny = false, iv?: number[]) {
    this.id = id;
    this.key = key; this.sp = SPECIES[key]; this.spIdx = SPECIES_INDEX[key];
    this.lvl = lvl; this.shiny = shiny;
    this.iv = iv || [0, 0, 0, 0].map(() => Math.floor(Math.random() * 32));
    this.nat = Math.floor(Math.random() * 16);
    this.x = x; this.y = y; this.homeX = x; this.homeY = y;
    this.habitat = this.sp.habitat;
    this.recalc(true);
  }

  setSpecies(key: string) {
    this.key = key; this.sp = SPECIES[key]; this.spIdx = SPECIES_INDEX[key];
    this.habitat = this.sp.habitat;
    this.recalc(false);
  }

  recalc(full: boolean) {
    const st = calcStats(this.sp, this.lvl, this.iv, this.nat);
    const frac = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = Math.max(1, Math.floor(st.hp * this.hpMult * this.mods.hp));
    this.atk = st.atk; this.def = st.def; this.spd = st.spd;
    const mv = knownMoves(this.sp, this.lvl);
    this.basic = mv.basic; this.special = mv.special;
    this.hp = full ? this.maxHp : Math.max(this.fainted ? 0 : 1, Math.round(this.maxHp * frac));
  }

  get alive() { return !this.fainted && this.hp > 0; }
  get wild() { return this.owner === null; }
}

export type Stance = 'passive' | 'neutral' | 'free' | 'attack' | 'aggressive';
export const STANCES: Stance[] = ['passive', 'neutral', 'free', 'attack', 'aggressive'];

export class PlayerSession {
  id: number;
  accountId: number;
  ws: WebSocket;
  save: SaveData;
  guest: boolean;
  x: number; y: number; dir = 0; moving = false;
  hp = 100; maxHp = 100;
  team: MonEntity[] = [];
  focus: MonEntity | null = null;
  moveBudget = 3; lastMoveAt = Date.now(); tpSeq = 0;
  party: Party | null = null;
  invites = new Map<number, number>();
  joinReqs = new Map<number, number>(); // quien pide entrar en mi grupo → caducidad
  cds = [0, 0, 0, 0, 0];
  rushUntil = 0; invulnUntil = 0; dashUntil = 0; dashBudget = 0;
  links: ActiveLink[] = [];
  linkTier = new Map<string, number>();
  swarmN = 0; swarmUntil = 0;
  surgeAt = 0; bloomAt = 0;
  dirtyCore = true; dirtyMons = true; lastCoreSent = 0;
  chatAt = 0; msgCount = 0; msgWindow = Date.now();
  zone = 0; zoneCheckAt = 0; seenCheckAt = 0;
  combatUntil = 0; lastHurtAt = 0;
  throwAt = 0; autoBallAt = 0; autoHealAt = 0; incenseUntil = 0;
  lastSaveAt = Date.now(); joinedAt = Date.now();
  posCorrectAt = 0;
  events: any[] = [];
  closed = false;
  ip = '';
  stance: Stance = 'attack';
  trail: { x: number; y: number }[] = [];
  stepAcc = 0; lastEncAt = Date.now(); encX = 0; encY = 0;
  duelId = 0; peaceUntil = 0; fleeAt = 0; fleeTries = 0; focusFight = false; canSurf = false;
  campAt: { x: number; y: number } | null = null; campSeen = 0; campCd = 0;

  constructor(id: number, accountId: number, ws: WebSocket, save: SaveData, guest: boolean) {
    this.id = id; this.accountId = accountId; this.ws = ws; this.save = save; this.guest = guest;
    this.x = save.x; this.y = save.y;
    this.encX = save.x; this.encY = save.y;
    if (STANCES.includes(save.stance as Stance)) this.stance = save.stance as Stance;
  }

  get name() { return this.save.name; }
  upg(id: string) { return this.save.upgrades[id] || 0; }

  recalcHp() {
    const frac = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = trainerMaxHp(this.save.tlvl, this.upg('hp'));
    this.hp = Math.max(1, Math.round(this.maxHp * frac));
  }

  send(msg: any) {
    if (this.closed || this.ws.readyState !== 1) return;
    try { this.ws.send(JSON.stringify(msg)); } catch { /* conexión cerrada */ }
  }

  monSave(uid: string): MonSave | undefined { return this.save.mons.find(m => m.uid === uid); }
}

export class Party {
  id: number;
  members: PlayerSession[] = [];
  constructor(id: number, leader: PlayerSession) { this.id = id; this.members.push(leader); }
  get leader() { return this.members[0]; }
}
