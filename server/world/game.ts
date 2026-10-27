// Simulación autoritativa del mundo: ticks, IA, combate, capturas, recompensas y snapshots.
import { World, isWalkableFor, playerBlocked } from '../../shared/world/worldgen';
import { TICK_HZ, SNAP_EVERY, VIEW_RADIUS, PLAYER_SPEED, STATUS, dist, clamp, DAY_LENGTH_MS, T } from '../../shared/constants';
import { SPECIES, SPECIES_LIST, speciesBaseExp, RARITY_NAMES } from '../../shared/species';
import { pickEncounter, rollShiny, STEP_CHANCE, ENC, ROAMERS, aggroChance, roamerChance } from '../../shared/encounters';
import { boostedTable, weatherAt, seasonAt } from '../../shared/weather';
import { DuelManager, DUEL } from './pvp';
import type { Cloud } from '../cloud';
import { MOVES, MoveDef, MOVE_INDEX } from '../../shared/moves';
import { typeEffect, PType, TYPE_NAMES } from '../../shared/types';
import { ZONES, ZoneDef } from '../../shared/zones';
import { ITEMS, BALLS } from '../../shared/items';
import {
  attackSpeedMult, computeLinks, monXpForLevel, trainerXpForLevel, CATCH_BONUS, catchChance, teamSlotsFor, SKILLS, LINK_MAP,
  rollCapture, critCaptureChance, chainShinyMult, STATUS_CATCH, MAX_LEVEL, RARITY_CATCH,
} from '../../shared/progression';
import { MonEntity, PlayerSession, Party, DEFAULT_MODS } from './entities';
import { createMon, SaveData } from '../players/save';
import { DB } from '../database/db';
import { BossManager } from './bosses';
import { EventManager } from './events';
import { ENV } from '../env';
import { BAL, killXp, levelXpFactor } from '../../shared/balance';
import { rollItemBall, rollChest } from '../../shared/loot';
import { MEDAL_DMG, MEDAL_XP } from '../../shared/gyms';
import { GymManager } from './gyms';
import { TradeManager } from '../players/trade';
import { Ranking } from './ranking';

type Target = MonEntity | PlayerSession;
interface PendingHit {
  at: number; src: MonEntity; move: MoveDef; mult: number; kind: 'single' | 'area' | 'line' | 'raw' | 'selfFaint';
  tgt?: Target; x?: number; y?: number; r?: number; x2?: number; y2?: number; w?: number; raw?: number; proc?: string;
}
export interface Telegraph {
  id: number; shape: 'circle' | 'ring' | 'line'; x: number; y: number; r: number; r2: number; x2: number; y2: number; w: number;
  start: number; at: number; dmgPct: number; monPct: number; status?: number; boss: MonEntity; fx: string;
}
interface Evt { x: number; y: number; d: any[]; only?: number; }
/** Cofre que suelta un salvaje derrotado. */
export interface Drop { id: number; x: number; y: number; tier: number; owner: number; freeAt: number; until: number; }
/** Campamento: tienda y hoguera donde el equipo descansa, se cura y se reanima poco a poco. */
export interface Camp { id: number; owner: number; x: number; y: number; until: number; }
export const CAMP = { MS: 120000, CD: 180000, R: 3.6, SAFE: 9 };
const CAMP_GROUND = new Set<number>([T.GRASS, T.FLOWERS, T.FOREST, T.SAND, T.DRYGRASS, T.SNOW, T.ROCK, T.HAUNT, T.HILL]);

const r2 = (v: number) => Math.round(v * 100) / 100;
const ZONE_INTERIOR = 21;
const TRAIL_STEP = 0.42;   // separación entre puntos del rastro del entrenador (tiles)
const TRAIL_MAX = 48;

export function dayHour(now: number) { return ((now % DAY_LENGTH_MS) / DAY_LENGTH_MS) * 24; }
export function isNight(now: number) { const h = dayHour(now); return h < 6 || h >= 19.5; }

export class Game {
  world: World;
  db: DB;
  players = new Map<number, PlayerSession>();
  byAccount = new Map<number, PlayerSession>();
  mons = new Map<number, MonEntity>();
  nextId = 1; nextPlayerId = 1; nextPartyId = 1; nextTg = 1;
  hits: PendingHit[] = [];
  evts: Evt[] = [];
  telegraphs: Telegraph[] = [];
  grid = new Map<number, MonEntity[]>();
  tickN = 0; now = Date.now();
  bosses: BossManager;
  wevents: EventManager;
  gyms: GymManager;
  trades: TradeManager;
  ranking: Ranking;
  duels: DuelManager;
  drops = new Map<number, Drop>();
  camps = new Map<number, Camp>(); nextCamp = 1; campCd = new Map<number, number>();
  cloud: Cloud | null = null;
  nextDrop = 1;
  xpBoostUntil = 0;
  storm: { zone: number; type: PType; until: number } | null = null;
  timer: NodeJS.Timeout | null = null;
  tickCost = 0;

  constructor(world: World, db: DB) {
    this.world = world; this.db = db;
    this.bosses = new BossManager(this);
    this.wevents = new EventManager(this);
    this.gyms = new GymManager(this);
    this.trades = new TradeManager(this);
    this.ranking = new Ranking(this);
    this.duels = new DuelManager(this);
  }

  start() {
    this.timer = setInterval(() => {
      const t0 = performance.now();
      try { this.tick(); } catch (e) { console.error('[tick] error', e); }
      this.tickCost = this.tickCost * 0.95 + (performance.now() - t0) * 0.05;
    }, 1000 / TICK_HZ);
  }
  stop() { if (this.timer) clearInterval(this.timer); }

  // ------------------------------------------------------------------ utilidades
  emit(x: number, y: number, d: any[], only?: number) { this.evts.push({ x, y, d, only }); }
  personal(p: PlayerSession, d: any[]) { this.evts.push({ x: p.x, y: p.y, d, only: p.id }); }
  notify(p: PlayerSession, text: string, kind = 'info') { p.send({ t: 'note', text, kind }); }
  broadcast(msg: any) { const s = JSON.stringify(msg); for (const p of this.players.values()) if (!p.closed && p.ws.readyState === 1) p.ws.send(s); }

  zoneAt(x: number, y: number): ZoneDef { const tx = Math.floor(x), ty = Math.floor(y); return ZONES[this.world.zone[clamp(ty, 0, this.world.h - 1) * this.world.w + clamp(tx, 0, this.world.w - 1)]] || ZONES[0]; }
  walkable(x: number, y: number, hab: 'land' | 'water' | 'air') { return isWalkableFor(this.world, x, y, hab); }

  rebuildGrid() {
    this.grid.clear();
    for (const m of this.mons.values()) {
      const k = Math.floor(m.x / 8) * 1000 + Math.floor(m.y / 8);
      let a = this.grid.get(k); if (!a) { a = []; this.grid.set(k, a); }
      a.push(m);
    }
  }
  monsNear(x: number, y: number, r: number, out: MonEntity[] = []): MonEntity[] {
    const x0 = Math.floor((x - r) / 8), x1 = Math.floor((x + r) / 8), y0 = Math.floor((y - r) / 8), y1 = Math.floor((y + r) / 8);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.grid.get(cx * 1000 + cy); if (!a) continue;
      for (const m of a) { const dx = m.x - x, dy = m.y - y; if (dx * dx + dy * dy <= r * r) out.push(m); }
    }
    return out;
  }
  playersNear(x: number, y: number, r: number) { const o: PlayerSession[] = []; for (const p of this.players.values()) if (dist(p.x, p.y, x, y) <= r) o.push(p); return o; }

  // ------------------------------------------------------------------ tick
  tick() {
    const now = Date.now();
    const dt = Math.min(0.2, Math.max(0.01, (now - this.now) / 1000));
    this.now = now; this.tickN++;
    this.rebuildGrid();
    for (const p of this.players.values()) this.updatePlayer(p, dt);
    if (this.tickN % 20 === 0) this.spawner();
    for (const m of this.mons.values()) {
      if (m.owner) this.updateAlly(m, dt); else this.updateWild(m, dt);
      this.updateStatus(m);
    }
    this.resolveHits();
    this.resolveTelegraphs();
    this.bosses.update(dt);
    this.wevents.update();
    this.gyms.update();
    this.trades.update();
    this.duels.update();
    if (this.tickN % 5 === 0) this.updateDrops();
    if (this.tickN % 10 === 0) this.updateCamps();
    if (this.tickN % SNAP_EVERY === 0) this.sendSnapshots();
    if (this.tickN % 10 === 0) this.periodic();
  }

  // ------------------------------------------------------------------ jugadores
  updatePlayer(p: PlayerSession, dt: number) {
    const now = this.now;
    p.moveBudget = Math.min(PLAYER_SPEED * 1.6, p.moveBudget + PLAYER_SPEED * 1.35 * dt);
    if (p.hp > 0 && now - p.lastHurtAt > 5000) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * BAL.TRAINER_REGEN * dt);
    // rastro para que el equipo siga tus pasos de forma natural
    const last = p.trail[p.trail.length - 1];
    if (!last || Math.abs(last.x - p.x) > 6 || Math.abs(last.y - p.y) > 6) p.trail = [{ x: p.x, y: p.y }];
    else if (dist(last.x, last.y, p.x, p.y) >= TRAIL_STEP) { p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > TRAIL_MAX) p.trail.shift(); }
    if (this.tickN % 4 === p.id % 4) this.encounterStep(p);
    if (now >= p.zoneCheckAt) {
      p.zoneCheckAt = now + 1000;
      const z = this.zoneAt(p.x, p.y);
      if (z.id !== p.zone) { p.zone = z.id; }
      if (!p.save.zones.includes(z.id) && z.kind !== 'ocean' && z.id !== ZONE_INTERIOR) {
        p.save.zones.push(z.id);
        if (z.kind === 'dungeon') p.save.stats.dungeons++;
        this.giveTrainerXp(p, 40 + z.lvl[0] * 8);
        p.send({ t: 'zone_new', zone: z.id });
        p.dirtyCore = true;
      }
      if (now - p.lastSaveAt > 30000) this.savePlayer(p);
    }
    if (now >= p.seenCheckAt) {
      p.seenCheckAt = now + 2000;
      for (const m of this.monsNear(p.x, p.y, 12)) {
        if (m.wild && !p.save.dex.seen[m.key]) { p.save.dex.seen[m.key] = 1; p.dirtyCore = true; }
      }
    }
    // imán de botín
    const mag = p.upg('magnet');
    if (mag > 0 && this.tickN % 10 === 0) {
      for (const pk of this.world.pickups) {
        if (pk.kind !== 'item' || Math.abs(pk.x + 0.5 - p.x) > mag * 2 || Math.abs(pk.y + 0.5 - p.y) > mag * 2) continue;
        this.openPickup(p, pk.id, true);
      }
    }
    // automatizaciones
    if (p.upg('autoball') && now >= p.autoBallAt) {
      p.autoBallAt = now + 1500;
      const ball = ['pokeball', 'superball', 'ultraball'].find(b => (p.save.items[b] || 0) > 0);
      if (ball) {
        for (const m of this.monsNear(p.x, p.y, 7)) {
          if (!m.wild || !m.alive || m.boss || m.capture || m.alpha || m.eventId || m.privateTo) continue;
          if ((p.save.dex.caught[m.key] || 0) > 0 && !m.shiny) continue;
          if (m.hp / m.maxHp > 0.3) continue;
          this.throwBall(p, m.id, ball); break;
        }
      }
    }
    if (p.upg('autoheal') && now >= p.autoHealAt && (p.save.items.pocion || 0) > 0) {
      p.autoHealAt = now + 3000;
      const alive = p.team.filter(m => m.alive);
      if (alive.length) {
        const frac = alive.reduce((s, m) => s + m.hp / m.maxHp, 0) / alive.length;
        if (frac < 0.25) { p.save.items.pocion--; this.healTeam(p, 0.5, false); this.personal(p, ['x', 'heal', p.id]); p.dirtyCore = true; }
      }
    }
    // sinergias periódicas
    const surge = p.linkTier.get('ocean_surge');
    if (surge && p.combatUntil > now && now >= p.surgeAt) {
      p.surgeAt = now + (surge === 2 ? 5000 : 7000);
      const tgt = this.nearestWild(p.x, p.y, this.aggroRange(p), p.id);
      const src = p.team.filter(m => m.alive && m.sp.types.includes('water')).sort((a, b) => b.atk - a.atk)[0];
      if (tgt && src) {
        const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1;
        const x2 = p.x + dx / d * 8, y2 = p.y + dy / d * 8, w = surge === 2 ? 3 : 2.2;
        this.emit(p.x, p.y, ['x', 'surge', r2(p.x), r2(p.y), r2(x2), r2(y2), w]);
        this.hits.push({ at: now + 350, src, move: MOVES.surf, mult: 0.8, kind: 'line', x: p.x, y: p.y, x2, y2, w, proc: 'surge' });
      }
    }
    const bloom = p.linkTier.get('verdant_bloom');
    if (bloom && now >= p.bloomAt) {
      p.bloomAt = now + 5000;
      if (p.team.some(m => m.alive && m.hp < m.maxHp)) {
        for (const m of p.team) if (m.alive) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * (bloom === 2 ? 0.06 : 0.04));
        this.emit(p.x, p.y, ['x', 'bloom', p.id]);
      }
    }
    if (p.swarmN && now > p.swarmUntil) p.swarmN = 0;
  }

  medalXp(p: PlayerSession) { return 1 + MEDAL_XP * p.save.medals.length; }

  aggroRange(p: PlayerSession) {
    return 6.5 * (1 + p.upg('area') * 0.06) * (p.linkTier.has('sky_squadron') ? 1.2 : 1) * (p.stance === 'aggressive' ? 1.5 : 1);
  }

  setStance(p: PlayerSession, s: string) {
    if (!['passive', 'neutral', 'free', 'attack', 'aggressive'].includes(s)) return;
    p.stance = s as PlayerSession['stance'];
    p.save.stance = s;
    if (s === 'passive') for (const m of p.team) if (m.target !== p.focus) m.target = null;
    this.rebuildTeam(p);
  }

  nearestWild(x: number, y: number, r: number, forPlayer = 0): MonEntity | null {
    let best: MonEntity | null = null, bd = r;
    for (const m of this.monsNear(x, y, r)) {
      if (!m.wild || !m.alive || m.capture || m.exhaustedUntil || (m.boss && m.boss.hidden)) continue;
      if (m.privateTo && m.privateTo !== forPlayer) continue;
      const d = dist(m.x, m.y, x, y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  /** Recalcula equipo, sinergias y modificadores del jugador. */
  rebuildTeam(p: PlayerSession) {
    const old = new Map(p.team.map(m => [m.uid, m]));
    const slots = teamSlotsFor(p.save.tlvl);
    p.save.team = p.save.team.filter(u => p.monSave(u) && !p.save.expeditions.some(e => e.uids.includes(u))).slice(0, slots);
    const keys = p.save.team.map(u => p.monSave(u)!.sp);
    p.links = computeLinks(keys);
    // Surf: con un Pokémon de agua en el equipo puedes cruzar lagos y mares nadando
    p.canSurf = keys.some(k => SPECIES[k]?.types.includes('water') || SPECIES[k]?.habitat === 'water');
    p.linkTier = new Map(p.links.map(l => [l.id, l.tier]));
    if (p.links.length && !p.save.stats.links) { p.save.stats.links = 1; }
    const newTeam: MonEntity[] = [];
    p.save.team.forEach((uid, i) => {
      const ms = p.monSave(uid)!;
      let m = old.get(uid);
      if (m && m.key === ms.sp) { old.delete(uid); m.lvl = ms.lvl; }
      else {
        if (m) { old.delete(uid); this.mons.delete(m.id); }
        m = new MonEntity(this.nextId++, ms.sp, ms.lvl, p.x + (Math.random() - 0.5) * 2, p.y + 1 + Math.random(), ms.shiny, ms.iv);
        m.owner = p; m.uid = uid; m.nat = ms.nat || 0; m.recalc(true);
        this.mons.set(m.id, m);
      }
      m.slot = i;
      newTeam.push(m);
    });
    for (const m of old.values()) { this.mons.delete(m.id); this.emit(m.x, m.y, ['rm', m.id]); }
    p.team = newTeam;
    // modificadores
    const L = p.linkTier;
    const fams: Record<string, number> = {};
    for (const m of newTeam) fams[m.sp.family] = (fams[m.sp.family] || 0) + 1;
    const steel = newTeam.filter(m => m.sp.types.includes('steel')).length;
    for (const m of newTeam) {
      const mods = { ...DEFAULT_MODS };
      mods.dmg = (1 + p.upg('dmg') * 0.10) * (L.has('prism') ? 1.1 : 1) * (1 + MEDAL_DMG * p.save.medals.length);
      mods.hp = (1 + p.upg('hp') * 0.10) * BAL.ALLY_HP;
      mods.aspd = (1 + p.upg('aspd') * 0.05) * (L.has('sky_squadron') ? (L.get('sky_squadron') === 2 ? 1.15 : 1.1) : 1);
      mods.crit = p.upg('crit') * 0.02 + (L.has('dragon_pride') ? 0.05 : 0);
      mods.critDmg = L.has('dragon_pride') ? 2.25 : 1.5;
      mods.cdSpecial = L.has('mind_link') ? (L.get('mind_link') === 2 ? 0.7 : 0.8) : 1;
      mods.area = 1 + p.upg('area') * 0.06;
      let def = 1;
      if (L.has('stone_guard')) def *= L.get('stone_guard') === 2 ? 1.33 : 1.18;
      if (steel) def *= 1 + 0.12 * steel;
      const famN = fams[m.sp.family] || 0;
      if (famN >= 2) { const b = famN >= 3 ? 1.3 : 1.15; mods.dmg *= b; def *= b; }
      if (p.stance === 'aggressive') { mods.dmg *= 1.1; def *= 0.9; }
      else if (p.stance === 'passive') def *= 1.12;
      mods.def = def;
      m.mods = mods;
      m.recalc(false);
    }
    p.recalcHp();
    p.dirtyCore = true;
  }

  // ------------------------------------------------------------------ IA aliada
  updateAlly(m: MonEntity, dt: number) {
    const p = m.owner!;
    const now = this.now;
    if (m.fainted) {
      if (p.duelId) { m.reviveAt = Math.max(m.reviveAt, now + 1000); return; }
      if (now >= m.reviveAt) {
        m.fainted = false; m.hp = Math.max(1, Math.round(m.maxHp * BAL.REVIVE_HP)); m.status = 0;
        m.x = p.x + (Math.random() - 0.5); m.y = p.y + 0.8;
        this.emit(m.x, m.y, ['rv', m.id]);
      }
      return;
    }
    if (now - m.lastHurtAt > 4000) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.03 * dt);
    const regen = p.upg('regen');
    if (regen) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.01 * regen * dt);
    if (m.status === STATUS.SLEEP || m.status === STATUS.FREEZE) return;
    const slow = m.status === STATUS.PARALYZE ? 0.6 : 1;
    // esquivar telegrafías de jefes
    const tg = this.telegraphHit(m.x, m.y, 0.6);
    if (tg) {
      let ax = m.x - tg.x, ay = m.y - tg.y;
      if (tg.shape === 'line') { const dx = tg.x2 - tg.x, dy = tg.y2 - tg.y; ax = -dy; ay = dx; if ((m.x - tg.x) * ax + (m.y - tg.y) * ay < 0) { ax = -ax; ay = -ay; } }
      if (tg.shape === 'ring') { ax = -ax; ay = -ay; }
      const d = Math.hypot(ax, ay) || 1;
      m.x += ax / d * 5 * dt; m.y += ay / d * 5 * dt;
      return;
    }
    if (now >= m.targetEvalAt) { m.targetEvalAt = now + 350; m.target = this.pickAllyTarget(m, p); }
    const t = m.target;
    if (t && t instanceof MonEntity && t.alive && !t.capture && !t.exhaustedUntil && !(t.boss && t.boss.hidden)) {
      const special = m.special && now >= m.cdS ? m.special : null;
      const move = special || m.basic;
      const big = t.boss || t.alpha ? 1.3 : 0;
      const d = dist(m.x, m.y, t.x, t.y);
      if (d > move.range * 0.9 + big) {
        // se acerca rodeando un poco al objetivo en vez de ir todos en fila
        const side = Math.sin(m.followPhase) * 0.9;
        const ax = t.x - m.x, ay = t.y - m.y, al = Math.hypot(ax, ay) || 1;
        this.step(m, t.x - ay / al * side, t.y + ax / al * side, (d > 8 ? 6.2 : 4.6) * slow, dt, false);
      } else {
        if (Math.abs(t.x - m.x) > 0.1) m.facing = t.x > m.x ? 1 : -1;
        const ready = special ? true : now >= m.cdB;
        if (ready && now - m.lastActAt > 300) {
          if (m.status === STATUS.PARALYZE && Math.random() < 0.25) { m.cdB = now + 600; return; }
          this.doAttack(m, t, move, 1);
        }
      }
      return;
    }
    m.target = null;
    this.follow(m, p, dt);
  }

  /** Seguimiento orgánico: cada Pokémon pisa el rastro del entrenador a su propia distancia,
   *  con un vaivén lateral propio, y cuando el entrenador se para se dispersan a su aire. */
  follow(m: MonEntity, p: PlayerSession, dt: number) {
    const now = this.now;
    let tx: number, ty: number, speed: number;
    const trail = p.trail;
    const free = p.stance === 'free';
    if (p.moving && trail.length > 1 && !(free && dist(m.x, m.y, p.x, p.y) < 7)) {
      const back = Math.round((1.6 + m.slot * 1.35) * m.lag / TRAIL_STEP);
      const i = Math.max(0, trail.length - 1 - back);
      const pt = trail[i], prev = trail[Math.max(0, i - 1)];
      let dx = pt.x - prev.x, dy = pt.y - prev.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const sway = Math.sin(now / (700 + m.slot * 90) + m.followPhase) * 0.45 + (m.slot % 2 ? 0.55 : -0.55) * (m.slot > 0 ? 1 : 0.4);
      tx = pt.x - dy * sway; ty = pt.y + dx * sway;
      const d = dist(m.x, m.y, tx, ty);
      // casi a tu paso; solo aceleran (sin pasar de un trote) si se han quedado muy atrás
      speed = d > 6 ? Math.min(9, PLAYER_SPEED * 1.5) : Math.min(PLAYER_SPEED * 1.12, PLAYER_SPEED * (0.72 + d * 0.16));
      m.idleAt = 0;
    } else if (p.campAt && now - p.campSeen < 1500) {
      const c = p.campAt, a = (m.slot / Math.max(1, p.team.length)) * Math.PI * 2 + 0.6;
      tx = c.x + Math.cos(a) * 1.7; ty = c.y + 0.4 + Math.sin(a) * 1.1;
      speed = Math.min(PLAYER_SPEED * 0.7, 0.8 + dist(m.x, m.y, tx, ty) * 0.5);
    } else {
      if (!m.idleAt || now >= m.idleAt || dist(m.idleX, m.idleY, p.x, p.y) > (free ? 8 : 3.4)) {
        const ang = m.followPhase + m.slot * 1.05 + (Math.random() - 0.5) * (free ? 4 : 1.6);
        // en modo Libre se van de paseo por los alrededores
        const r = free ? 2.5 + Math.random() * 4.5 : 1.0 + Math.random() * 1.5 + m.slot * 0.12;
        m.idleX = p.x + Math.cos(ang) * r; m.idleY = p.y + Math.sin(ang) * r * 0.8 + 0.25;
        if (!this.walkable(m.idleX, m.idleY, m.habitat === 'land' ? 'land' : 'air')) { m.idleX = p.x + (Math.random() - 0.5) * 1.6; m.idleY = p.y + 0.7; }
        m.idleAt = now + 2600 + Math.random() * 4200;
        m.followPhase += (Math.random() - 0.5) * 0.8;
      }
      tx = m.idleX; ty = m.idleY;
      speed = Math.min(PLAYER_SPEED * 0.75, 0.9 + dist(m.x, m.y, tx, ty) * 0.55);
    }
    const d = dist(m.x, m.y, tx, ty);
    if (d > 16) { m.x = tx; m.y = ty; return; }
    if (d > 0.18) this.step(m, tx, ty, speed, dt, false);
  }

  pickAllyTarget(m: MonEntity, p: PlayerSession): MonEntity | null {
    // duelo PvP: solo el equipo rival
    const op = this.duels.opponent(p);
    if (op) {
      if (!this.duels.hostile(p, op)) return null;
      const cur = m.target;
      if (cur instanceof MonEntity && cur.alive && cur.owner === op) return cur;
      if (p.focus && p.focus.owner === op && p.focus.alive) return p.focus;
      let best: MonEntity | null = null, bd = Infinity;
      for (const o of op.team) { if (!o.alive) continue; const d = dist(m.x, m.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
      return best;
    }
    const valid = (t: MonEntity | null | PlayerSession) => t instanceof MonEntity && t.wild && t.alive && !t.capture && !t.exhaustedUntil && !(t.boss && t.boss.hidden)
      && !(t.hp <= 1 && this.isProtectedFor(p, t)) && (!t.privateTo || t.privateTo === p.id);
    const range = this.aggroRange(p);
    // un clic solo selecciona para ver sus datos; se ataca con doble clic o con "Luchar"
    if (p.focus && p.focusFight && valid(p.focus) && dist(p.x, p.y, p.focus.x, p.focus.y) < 14) return p.focus;
    if (p.focus && !valid(p.focus) && !(p.focus.alive && p.focus.hp <= 1 && !p.focus.capture)) { p.focus = null; p.focusFight = false; }
    // neutral / libre / pasivo: solo responden a quien os ha golpeado de verdad hace poco
    const threat = (w: MonEntity) => this.now - (w.hitP.get(p.id) || 0) < 12000;
    if (this.now < p.peaceUntil) return null;
    if (p.stance === 'passive') {
      const cur0 = m.target as MonEntity | null;
      return cur0 && valid(cur0) && threat(cur0) && dist(p.x, p.y, cur0.x, cur0.y) < 9 ? cur0 : null;
    }
    const calm = p.stance === 'neutral' || p.stance === 'free';
    const inspected = (w: MonEntity) => w === p.focus && !p.focusFight && !threat(w);
    const cur = m.target as MonEntity | null;
    if (cur && valid(cur) && !inspected(cur) && dist(p.x, p.y, cur.x, cur.y) < range + 3 && (!calm || threat(cur))) return cur;
    let best: MonEntity | null = null, bs = Infinity;
    for (const w of this.monsNear(p.x, p.y, range)) {
      if (!valid(w) || inspected(w)) continue;
      if (calm && !threat(w)) continue;
      let score = dist(m.x, m.y, w.x, w.y);
      if (w.target && ((w.target instanceof MonEntity && w.target.owner === p) || w.target === p)) score -= 3;
      if (score < bs) { bs = score; best = w; }
    }
    return best;
  }

  step(m: MonEntity, tx: number, ty: number, speed: number, dt: number, collide: boolean) {
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
    if (d < 0.01) return;
    const s = Math.min(d, speed * dt);
    const nx = m.x + dx / d * s, ny = m.y + dy / d * s;
    if (Math.abs(dx) > 0.05) m.facing = dx > 0 ? 1 : -1;
    if (!collide) { m.x = nx; m.y = ny; return; }
    if (this.walkable(nx, ny, m.habitat)) { m.x = nx; m.y = ny; }
    else if (this.walkable(nx, m.y, m.habitat)) m.x = nx;
    else if (this.walkable(m.x, ny, m.habitat)) m.y = ny;
  }

  // ------------------------------------------------------------------ IA salvaje
  updateWild(m: MonEntity, dt: number) {
    const now = this.now;
    if (m.capture) { if (now >= m.capture.until) this.resolveCapture(m); return; }
    if (m.fainted) {
      if (m.exhaustedUntil) { if (now >= m.exhaustedUntil) { m.exhaustedUntil = 0; this.removeMon(m); } return; }
      if (now >= m.removeAt) this.removeMon(m);
      return;
    }
    if (m.boss) { this.bosses.think(m, dt); return; }
    if (m.privateTo) {
      // Pokémon de líder de gimnasio: solo persigue al retador y a su equipo
      const owner = this.players.get(m.privateTo);
      if (!owner) return;
      const tt = m.target;
      const ok = tt && (tt instanceof MonEntity ? tt.alive && tt.owner === owner : tt === owner && owner.hp > 0);
      if (!ok && now >= m.targetEvalAt) {
        m.targetEvalAt = now + 500;
        const allies = owner.team.filter(a => a.alive);
        m.target = allies.length ? allies[Math.floor(Math.random() * allies.length)] : owner;
        m.state = 'chase';
      }
    }
    // despawn si no hay jugadores cerca
    if (!m.privateTo && this.tickN % 20 === m.id % 20) {
      const near = this.playersNear(m.x, m.y, 36).length > 0;
      if (!near) { if (!m.lonelySince) m.lonelySince = now; else if (now - m.lonelySince > 8000) { this.removeMon(m); return; } }
      else m.lonelySince = 0;
      if (m.rare && !m.eventId && now - m.spawnedAt > 240000 && !m.target) { this.emit(m.x, m.y, ['x', 'poof', r2(m.x), r2(m.y)]); this.removeMon(m); return; }
      if (m.ambushFor && !m.rare && !m.shiny && !m.target && now - m.spawnedAt > 75000 && now - m.lastHurtAt > 20000) { this.emit(m.x, m.y, ['x', 'poof', r2(m.x), r2(m.y)]); this.removeMon(m); return; }
    }
    if (m.status === STATUS.SLEEP || m.status === STATUS.FREEZE) return;
    const slow = m.status === STATUS.PARALYZE ? 0.6 : 1;
    let t = m.target;
    const validT = (x: Target | null) => x && (x instanceof MonEntity ? x.alive && x.owner && !x.owner.closed : (x.hp > 0 && !x.closed));
    if (t && (!validT(t) || dist(m.x, m.y, t.x, t.y) > 13 || dist(m.x, m.y, m.homeX, m.homeY) > 18)) {
      m.target = null; t = null; if (!m.eventId) m.state = 'return';
    }
    if (!t && m.state !== 'return' && (m.aggro || m.sp.temper === 'aggressive' || m.alpha || m.eventId) && now >= m.targetEvalAt) {
      m.targetEvalAt = now + 600;
      const aggro = m.aggro ? 7.5 : m.eventId ? 6.5 : 4.5;
      let best: PlayerSession | null = null, bd = aggro;
      for (const p of this.players.values()) {
        if (p.hp <= 0 || p.duelId || (m.ignoreP === p.id && now < m.ignoreUntil) || (p.campAt && now - p.campSeen < 1500)) continue;
        const d = dist(p.x, p.y, m.x, m.y);
        if (d < bd && this.zoneAt(p.x, p.y).kind !== 'town') { bd = d; best = p; }
      }
      if (best) {
        const allies = best.team.filter(a => a.alive);
        m.target = allies.length && Math.random() < (m.aggro ? 0.55 : 0.6) ? allies[Math.floor(Math.random() * allies.length)] : best;
        m.state = 'chase';
        t = m.target;
      }
    }
    if (m.state === 'flee') {
      const ref = m.target || this.nearestPlayer(m.x, m.y, 10);
      if (ref) { const dx = m.x - ref.x, dy = m.y - ref.y, d = Math.hypot(dx, dy) || 1; this.step(m, m.x + dx / d * 3, m.y + dy / d * 3, 4.2 * slow, dt, true); }
      if (now > m.fleeUntil) m.state = 'chase';
      return;
    }
    if (t) {
      const move = m.special && now >= m.cdS && Math.random() < 0.5 ? m.special : m.basic;
      const d = dist(m.x, m.y, t.x, t.y);
      if (move.kind === 'self') {
        if (now >= m.cdB) { this.doAttack(m, t, move, 1); }
        if (d < 3) this.step(m, m.x - (t.x - m.x), m.y - (t.y - m.y), 2.5, dt, true);
        return;
      }
      if (d > move.range * 0.9) this.step(m, t.x, t.y, (m.alpha ? 4.6 : m.aggro ? 4.4 : 3.8) * slow, dt, true);
      else {
        if (Math.abs(t.x - m.x) > 0.1) m.facing = t.x > m.x ? 1 : -1;
        const ready = move === m.special ? now >= m.cdS : now >= m.cdB;
        if (ready && now - m.lastActAt > 450) {
          if (m.status === STATUS.PARALYZE && Math.random() < 0.25) { m.cdB = now + 800; return; }
          this.doAttack(m, t, move, 1);
        }
      }
      return;
    }
    if (m.state === 'return') {
      this.step(m, m.homeX, m.homeY, 3.5, dt, true);
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.15 * dt);
      if (dist(m.x, m.y, m.homeX, m.homeY) < 1 || now - m.lastHurtAt > 9000) { m.state = 'wander'; m.dmgBy.clear(); }
      return;
    }
    // deambular: recorren su zona a paso tranquilo, con paradas para olfatear o mirar alrededor
    if (now >= m.wanderAt) {
      const pause = Math.random() < 0.35;
      m.wanderAt = now + (pause ? 2500 + Math.random() * 3500 : 1800 + Math.random() * 2600);
      if (!pause) {
        // el "hogar" se desplaza poco a poco: así van de paseo en lugar de quedarse en un punto
        if (Math.random() < 0.3 && dist(m.x, m.y, m.homeX, m.homeY) < 3) { m.homeX = m.x; m.homeY = m.y; }
        for (let k = 0; k < 8; k++) {
          const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4;
          const wx = m.homeX + Math.cos(a) * r, wy = m.homeY + Math.sin(a) * r;
          if (this.walkable(wx, wy, m.habitat) && this.zoneAt(wx, wy).kind !== 'town') { m.wx = wx; m.wy = wy; break; }
        }
      } else m.wx = 0;
    }
    if (m.wx && dist(m.x, m.y, m.wx, m.wy) > 0.2) this.step(m, m.wx, m.wy, m.sp.temper === 'skittish' ? 2.2 : 1.7, dt, true);
  }

  nearestPlayer(x: number, y: number, r: number): PlayerSession | null {
    let best: PlayerSession | null = null, bd = r;
    for (const p of this.players.values()) { const d = dist(p.x, p.y, x, y); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  // ------------------------------------------------------------------ combate
  doAttack(src: MonEntity, tgt: Target, move: MoveDef, mult: number, ignoreCd = false) {
    const now = this.now;
    const p = src.owner;
    let aspd = attackSpeedMult(src.spd) * src.mods.aspd;
    if (p) {
      if (now < p.rushUntil) aspd *= 1.6;
      if (p.swarmN) aspd *= 1 + 0.05 * p.swarmN;
    }
    if (!ignoreCd) {
      if (move.cat === 'special') src.cdS = now + move.cd * src.mods.cdSpecial / Math.sqrt(aspd) * 1000;
      else src.cdB = now + move.cd / aspd * 1000;
    }
    src.cdB = Math.max(src.cdB, now + 300);
    src.lastActAt = now;
    const tid = tgt instanceof PlayerSession ? -tgt.id : tgt.id;
    this.emit(src.x, src.y, ['a', src.id, tid, MOVE_INDEX[move.id], r2(tgt.x), r2(tgt.y)]);
    const area = src.mods.area;
    switch (move.kind) {
      case 'self': return;
      case 'melee':
        if (move.range > 2.5) { // embestidas: el atacante se lanza junto al objetivo
          const dx = src.x - tgt.x, dy = src.y - tgt.y, d = Math.hypot(dx, dy) || 1;
          src.x = tgt.x + dx / d * 0.9; src.y = tgt.y + dy / d * 0.9;
        }
        this.hits.push({ at: now + 150, src, move, mult, kind: 'single', tgt });
        break;
      case 'proj': {
        const travel = dist(src.x, src.y, tgt.x, tgt.y) / (move.speed || 10) * 1000;
        const n = move.hits || 1;
        for (let i = 0; i < n; i++) this.hits.push({ at: now + travel + i * 140, src, move, mult, kind: 'single', tgt });
        break;
      }
      case 'aoe':
        this.hits.push({ at: now + 320, src, move, mult, kind: 'area', x: tgt.x, y: tgt.y, r: (move.radius || 1.5) * area });
        break;
      case 'nova':
        this.hits.push({ at: now + 220, src, move, mult, kind: 'area', x: src.x, y: src.y, r: (move.radius || 2) * area });
        break;
      case 'beam': {
        const dx = tgt.x - src.x, dy = tgt.y - src.y, d = Math.hypot(dx, dy) || 1, len = move.range + 0.8;
        this.hits.push({ at: now + 200, src, move, mult, kind: 'line', x: src.x, y: src.y, x2: src.x + dx / d * len, y2: src.y + dy / d * len, w: (move.radius || 1) * 2 * area });
        break;
      }
    }
    if (move.selfFaint) this.hits.push({ at: now + 380, src, move, mult: 0, kind: 'selfFaint' });
  }

  hostileTargets(src: MonEntity, x: number, y: number, r: number): Target[] {
    const out: Target[] = [];
    for (const m of this.monsNear(x, y, r + 1.5)) {
      if (!m.alive || m.capture || m.exhaustedUntil || (m.boss && m.boss.hidden)) continue;
      if (!!src.owner === !!m.owner && !(src.owner && m.owner && this.duels.hostile(src.owner, m.owner))) continue;
      if (src.owner && !m.owner && src.owner.duelId) continue;
      if (src.owner && m.privateTo && m.privateTo !== src.owner.id) continue;
      if (src.privateTo && m.owner && m.owner.id !== src.privateTo) continue;
      const rr = r + (m.boss || m.alpha ? 1.2 : 0.3);
      if (dist(m.x, m.y, x, y) <= rr) out.push(m);
    }
    if (!src.owner) for (const p of this.playersNear(x, y, r + 0.3)) if (p.hp > 0 && (!src.privateTo || p.id === src.privateTo)) out.push(p);
    return out;
  }

  resolveHits() {
    const now = this.now;
    if (!this.hits.length) return;
    const due: PendingHit[] = [];
    this.hits = this.hits.filter(h => (h.at <= now ? (due.push(h), false) : true));
    for (const h of due) {
      const src = h.src;
      switch (h.kind) {
        case 'selfFaint':
          if (src.alive) this.faint(src, null);
          break;
        case 'single':
          if (h.tgt) {
            if (h.tgt instanceof MonEntity && (!h.tgt.alive || !this.mons.has(h.tgt.id))) break;
            this.applyHit(src, h.tgt, h.move, h.mult, !!h.proc);
          }
          break;
        case 'raw':
          if (h.tgt instanceof MonEntity && h.tgt.alive) this.applyRaw(src, h.tgt, h.raw || 0, h.proc || 'raw');
          break;
        case 'area':
          for (const t of this.hostileTargets(src, h.x!, h.y!, h.r!)) this.applyHit(src, t, h.move, h.mult, !!h.proc);
          break;
        case 'line': {
          const cand = this.hostileTargets(src, (h.x! + h.x2!) / 2, (h.y! + h.y2!) / 2, dist(h.x!, h.y!, h.x2!, h.y2!) / 2 + h.w!);
          for (const t of cand) {
            const big = t instanceof MonEntity && (t.boss || t.alpha) ? 1.2 : 0;
            if (segDist(t.x, t.y, h.x!, h.y!, h.x2!, h.y2!) <= h.w! / 2 + big) this.applyHit(src, t, h.move, h.mult, !!h.proc);
          }
          break;
        }
      }
    }
  }

  calcDamage(src: MonEntity, defStat: number, defTypes: readonly PType[], move: MoveDef, mult: number) {
    const eff = defTypes.length ? typeEffect(move.type, defTypes) : 1;
    const stab = src.sp.types.includes(move.type) ? 1.5 : 1;
    const crit = Math.random() < 0.0625 + src.mods.crit;
    let dmg = ((2 * src.lvl / 5 + 2) * move.power * src.atk / Math.max(1, defStat) / 50 + 2) * stab * eff * (crit ? src.mods.critDmg : 1) * (0.88 + Math.random() * 0.12) * mult;
    const p = src.owner;
    if (p) {
      dmg *= src.mods.dmg * (1 + (p.save.upgrades['aff_' + move.type] || 0) * 0.06);
      if (this.storm && this.storm.until > this.now && this.storm.type === move.type && p.zone === this.storm.zone) dmg *= 1.5;
    } else {
      dmg *= BAL.WILD_DMG * (src.aggro ? BAL.AGGRO_ATK : 1);
      if (src.boss || src.alpha) dmg *= 1.15;
    }
    return { dmg, crit, eff };
  }

  applyHit(src: MonEntity, tgt: Target, move: MoveDef, mult: number, isProc: boolean) {
    const now = this.now;
    if (move.power <= 0) return;
    if (src.wild) { const vp = tgt instanceof PlayerSession ? tgt : tgt.owner; if (vp) src.hitP.set(vp.id, now); }
    if (tgt instanceof PlayerSession) {
      if (tgt.hp <= 0 || now < tgt.invulnUntil) return;
      const { dmg } = this.calcDamage(src, 8 + tgt.save.tlvl * 3, [], move, mult * BAL.WILD_TRAINER_DMG / BAL.WILD_DMG);
      this.damagePlayer(tgt, Math.max(1, Math.round(dmg)));
      return;
    }
    if (!tgt.alive || tgt.capture || now < tgt.invulnUntil) return;
    let { dmg, crit, eff } = this.calcDamage(src, tgt.def * tgt.mods.def, tgt.sp.types, move, mult);
    const p = src.owner;
    if (p && tgt.owner) { if (!this.duels.hostile(p, tgt.owner)) return; dmg *= DUEL.DMG; }
    if (p && p.linkTier.has('toxic_mist') && tgt.status === STATUS.POISON) dmg *= 1.15;
    if (tgt.boss) dmg *= this.bosses.damageTakenMult(tgt);
    dmg = Math.max(1, Math.round(dmg));
    this.dealDamage(src, tgt, dmg, (crit ? 1 : 0) | (eff > 1 ? 2 : 0) | (eff < 1 ? 4 : 0));
    if (!tgt.alive) return;
    if (move.status) {
      let ch = move.status[1];
      if (p && p.linkTier.has('toxic_mist') && move.status[0] === STATUS.POISON) ch += 0.15;
      if (Math.random() < ch) this.applyStatus(tgt, move.status[0], p ? p.id : 0);
    } else if (p && p.linkTier.has('toxic_mist') && move.type === 'poison' && Math.random() < 0.15) this.applyStatus(tgt, STATUS.POISON, p.id);
    if (move.drain && src.alive) src.hp = Math.min(src.maxHp, src.hp + dmg * move.drain);
    if (p && !isProc) this.linkProcs(src, tgt, move, dmg);
    if (tgt.wild && !tgt.boss) {
      if (!tgt.target || Math.random() < 0.25) { tgt.target = src; if (tgt.state !== 'flee') tgt.state = 'chase'; }
      if (tgt.sp.temper === 'skittish' && tgt.hp < tgt.maxHp * 0.5 && tgt.state !== 'flee' && Math.random() < 0.5) { tgt.state = 'flee'; tgt.fleeUntil = now + 2500; }
    }
  }

  /** El equipo no derrota al objetivo fijado por su entrenador (lo deja a 1 PS para capturarlo). */
  isProtectedFor(p: PlayerSession | null | undefined, tgt: MonEntity) {
    if (!p || !tgt.wild || tgt.boss || tgt.privateTo) return false;
    const rar = (tgt.sp || SPECIES[tgt.key])?.rarity;
    if ((tgt.shiny || tgt.roamer || rar === 'legendary' || rar === 'mythic') && !tgt.alpha && !tgt.eventId) return true;
    return p.upg('autoball') > 0 && !tgt.alpha && !tgt.eventId && (!(p.save.dex.caught[tgt.key] > 0) || tgt.shiny);
  }

  dealDamage(src: MonEntity | null, tgt: MonEntity, dmg: number, flags: number) {
    if (src?.owner && this.isProtectedFor(src.owner, tgt)) {
      dmg = Math.min(dmg, tgt.hp - 1);
      if (dmg <= 0) return;
    }
    tgt.hp -= dmg; tgt.lastHurtAt = this.now;
    const p = src?.owner;
    if (p) { tgt.dmgBy.set(p.id, (tgt.dmgBy.get(p.id) || 0) + dmg); p.combatUntil = this.now + 5000; }
    if (tgt.owner) tgt.owner.combatUntil = this.now + 5000;
    if (tgt.boss) this.bosses.onDamaged(tgt, dmg);
    this.emit(tgt.x, tgt.y, ['d', tgt.id, dmg, flags]);
    if (tgt.hp <= 0) this.faint(tgt, src);
  }

  applyRaw(src: MonEntity, tgt: MonEntity, amount: number, kind: string) {
    if (!tgt.alive || tgt.capture) return;
    let dmg = amount;
    if (tgt.boss) dmg *= this.bosses.damageTakenMult(tgt);
    this.dealDamage(src, tgt, Math.max(1, Math.round(dmg)), 8);
  }

  linkProcs(src: MonEntity, tgt: MonEntity, move: MoveDef, dmg: number) {
    const p = src.owner!; const L = p.linkTier; const now = this.now;
    const chain = L.get('electric_chain');
    if (chain && move.type === 'electric') {
      const n = chain === 2 ? 3 : 2, pct = chain === 2 ? 0.45 : 0.35;
      const others = this.monsNear(tgt.x, tgt.y, 3.6).filter(o => o !== tgt && o.wild && o.alive && !o.capture && !o.exhaustedUntil)
        .sort((a, b) => dist(a.x, a.y, tgt.x, tgt.y) - dist(b.x, b.y, tgt.x, tgt.y)).slice(0, n);
      if (others.length) {
        this.emit(tgt.x, tgt.y, ['x', 'chain', tgt.id, others.map(o => o.id)]);
        for (const o of others) this.applyRaw(src, o, dmg * pct, 'chain');
      }
    }
    const fire = L.get('firestorm');
    if (fire && move.type === 'fire' && tgt.alive) {
      tgt.heat++;
      if (tgt.heat >= (fire === 2 ? 3 : 4)) {
        tgt.heat = 0;
        this.emit(tgt.x, tgt.y, ['x', 'firestorm', r2(tgt.x), r2(tgt.y)]);
        for (const o of this.monsNear(tgt.x, tgt.y, 2.2)) if (o.wild && o.alive) this.applyRaw(src, o, dmg * 1.5, 'firestorm');
      }
    }
    const rift = L.get('shadow_rift');
    if (rift && Math.random() < (rift === 2 ? 0.3 : 0.2)) {
      this.emit(tgt.x, tgt.y, ['x', 'rift', tgt.id]);
      this.hits.push({ at: now + 450, src, move, mult: 0, kind: 'raw', tgt, raw: dmg * 0.6, proc: 'rift' });
    }
    if (L.has('fairy_light')) {
      const hurt = p.team.filter(m => m.alive).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt && hurt.hp < hurt.maxHp) hurt.hp = Math.min(hurt.maxHp, hurt.hp + dmg * 0.12);
    }
  }

  applyStatus(m: MonEntity, code: number, ownerId: number) {
    if (m.status && m.status !== code) return;
    if (m.boss && Math.random() < 0.5) return;
    const durs = [0, 4000, 6000, 4000, 3000, 2000];
    let d = durs[code] || 3000;
    if (m.boss) d *= 0.35;
    m.status = code; m.statusUntil = this.now + d; m.statusTick = this.now + 1000; m.statusOwner = ownerId;
    this.emit(m.x, m.y, ['s', m.id, code]);
  }

  updateStatus(m: MonEntity) {
    if (!m.status) return;
    const now = this.now;
    if (now >= m.statusUntil || !m.alive) { m.status = 0; this.emit(m.x, m.y, ['s', m.id, 0]); return; }
    if ((m.status === STATUS.BURN || m.status === STATUS.POISON) && now >= m.statusTick) {
      m.statusTick = now + 1000;
      const pct = m.status === STATUS.BURN ? 0.045 : 0.035;
      let amt = Math.max(1, Math.round(m.maxHp * pct * (m.boss ? 0.12 : 1)));
      if (m.statusOwner && this.isProtectedFor(this.players.get(m.statusOwner), m)) amt = Math.min(amt, m.hp - 1);
      if (amt <= 0) return;
      m.hp -= amt; m.lastHurtAt = now;
      if (m.statusOwner) m.dmgBy.set(m.statusOwner, (m.dmgBy.get(m.statusOwner) || 0) + amt);
      this.emit(m.x, m.y, ['d', m.id, amt, 16]);
      if (m.hp <= 0) this.faint(m, null);
    }
  }

  damagePlayer(p: PlayerSession, amount: number) {
    const now = this.now;
    if (p.hp <= 0 || now < p.invulnUntil) return;
    p.hp -= amount; p.lastHurtAt = now; p.combatUntil = now + 5000;
    this.emit(p.x, p.y, ['d', -p.id, amount, 0]);
    if (p.hp <= 0) this.playerFaint(p);
  }

  playerFaint(p: PlayerSession) {
    p.hp = 0;
    p.save.stats.deaths++;
    const lost = Math.floor(p.save.money * BAL.DEATH_MONEY_LOSS);
    p.save.money -= lost;
    this.emit(p.x, p.y, ['pf', p.id]);
    setTimeout(() => {
      if (p.closed) return;
      const town = this.world.towns.find(t => t.id === p.save.lastTown) || this.world.towns[0];
      this.teleport(p, town.spawn.x + 0.5, town.spawn.y + 0.5);
      p.hp = p.maxHp;
      this.healTeam(p, 1, true);
      this.notify(p, `Te has debilitado. Has perdido ${lost} ₽ y vuelves a ${town.name}.`, 'bad');
      p.dirtyCore = true;
    }, 1600);
  }

  faint(m: MonEntity, killer: MonEntity | null) {
    if (m.fainted) return;
    m.hp = 0; m.fainted = true; m.status = 0; m.target = null;
    this.emit(m.x, m.y, ['f', m.id]);
    if (m.owner) { m.reviveAt = this.now + (m.owner.duelId ? 1e9 : BAL.REVIVE_MS); return; }
    m.removeAt = this.now + 1000;
    if (m.boss) { this.bosses.onDefeated(m); return; }
    this.rewardKill(m, killer);
    this.maybeDrop(m, killer);
    if (m.eventId) this.wevents.onMonKilled(m);
    if (m.rare) this.wevents.onRareResolved(m, null);
  }

  rewardKill(m: MonEntity, killer: MonEntity | null) {
    const rec = new Map<PlayerSession, number>();
    const ko = killer?.owner || null;
    if (ko && !ko.closed) rec.set(ko, 1);
    for (const [pid, d] of m.dmgBy) {
      const p = this.players.get(pid);
      if (p && !rec.has(p) && d > 0) rec.set(p, d >= m.maxHp * 0.25 ? 0.9 : 0.6);
    }
    for (const p of [...rec.keys()]) {
      if (!p.party) continue;
      for (const mem of p.party.members) if (!rec.has(mem) && dist(mem.x, mem.y, m.x, m.y) < 26) rec.set(mem, 0.75);
    }
    for (const [p, share] of rec) this.grantKill(p, m, share, ko === p ? killer : null);
  }

  grantKill(p: PlayerSession, m: MonEntity, share: number, killerMon: MonEntity | null) {
    const now = this.now;
    const base = killXp(speciesBaseExp(m.sp), m.lvl) * (m.alpha ? 4 : 1) * (m.rare ? 1.5 : 1);
    const xpMult = (1 + p.upg('xp') * 0.08) * (now < this.xpBoostUntil ? 2 : 1) * (p.linkTier.has('prism') ? 1.1 : 1) * this.medalXp(p);
    const xp = base * xpMult * share;
    for (const tm of p.team) {
      const f = tm.fainted ? BAL.XP_FAINTED : tm === killerMon ? BAL.XP_KILLER : BAL.XP_TEAM;
      this.giveMonXp(p, tm, Math.max(1, Math.round(xp * f * levelXpFactor(m.lvl, tm.lvl))));
      const ms = p.monSave(tm.uid!); if (ms && ms.fr < 255 && Math.random() < 0.5) ms.fr = Math.min(255, ms.fr + 1);
    }
    this.giveTrainerXp(p, Math.max(1, Math.round(xp * BAL.XP_TRAINER)));
    const money = Math.max(1, Math.round((BAL.MONEY_BASE + m.lvl * BAL.MONEY_PER_LVL) * (1 + p.upg('luck') * 0.1) * share * (m.rare ? 3 : 1) * (m.alpha ? 6 : 1)));
    p.save.money += money;
    p.save.stats.earned = (p.save.stats.earned || 0) + money;
    let essT: string | null = null, essN = 0;
    if (Math.random() < BAL.ESS_CHANCE * (1 + p.upg('luck') * 0.05) || m.alpha) {
      essT = m.sp.types[Math.floor(Math.random() * m.sp.types.length)];
      essN = 1 + (m.alpha ? 6 : 0) + (m.rare ? 2 : 0);
      if (this.storm && this.storm.until > now && this.storm.zone === p.zone) essN *= 2;
      p.save.ess[essT] = (p.save.ess[essT] || 0) + essN;
    }
    p.save.stats.kills++;
    if (Math.random() < 0.12) p.save.candies[m.sp.family] = (p.save.candies[m.sp.family] || 0) + 1;
    for (const b of p.save.bounties) {
      if (b.prog >= b.n) continue;
      if ((b.kind === 'kill_type' && m.sp.types.includes(b.target as PType)) || (b.kind === 'kill_zone' && String(m.zone) === b.target)) b.prog++;
    }
    if (p.linkTier.has('swarm')) { p.swarmN = Math.min(6, p.swarmN + 1); p.swarmUntil = now + 8000; }
    this.personal(p, ['rw', m.id, money, Math.round(xp), essT, essN]);
    p.dirtyCore = true;
  }

  giveMonXp(p: PlayerSession, tm: MonEntity, xp: number) {
    const ms = p.monSave(tm.uid!); if (!ms || xp <= 0) return;
    ms.xp += xp;
    let lv = false;
    while (ms.lvl < MAX_LEVEL && ms.xp >= monXpForLevel(ms.lvl + 1)) { ms.lvl++; lv = true; }
    if (lv) {
      const oldSpecial = tm.special?.id, oldBasic = tm.basic.id;
      tm.lvl = ms.lvl; tm.recalc(false);
      tm.hp = Math.min(tm.maxHp, tm.hp + tm.maxHp * 0.2);
      this.emit(tm.x, tm.y, ['lv', tm.id, ms.lvl]);
      const newMove = tm.special?.id !== oldSpecial ? tm.special?.name : tm.basic.id !== oldBasic ? tm.basic.name : null;
      const evo = (tm.sp.evo || []).find(e => e.level && ms.lvl >= e.level);
      p.send({ t: 'mlv', uid: ms.uid, lvl: ms.lvl, move: newMove, evo: evo ? evo.to : null });
      p.dirtyMons = true;
    }
  }

  giveTrainerXp(p: PlayerSession, xp: number) {
    if (xp <= 0) return;
    p.save.txp += xp;
    const oldSlots = teamSlotsFor(p.save.tlvl);
    let lv = false;
    while (p.save.tlvl < MAX_LEVEL && p.save.txp >= trainerXpForLevel(p.save.tlvl + 1)) { p.save.tlvl++; lv = true; }
    if (lv) {
      p.recalcHp(); p.hp = p.maxHp;
      const unlocks: string[] = [];
      if (teamSlotsFor(p.save.tlvl) > oldSlots) unlocks.push(`¡Nueva ranura de equipo! (${teamSlotsFor(p.save.tlvl)})`);
      for (const s of SKILLS) if (s.unlock === p.save.tlvl) unlocks.push(`Habilidad desbloqueada: ${s.name} [${s.key}]`);
      if (p.save.tlvl === 5) unlocks.push('Expediciones desbloqueadas');
      for (const it of Object.values(ITEMS)) if (it.unlock === p.save.tlvl) unlocks.push(`Nuevo en la tienda: ${it.name}`);
      p.send({ t: 'tlv', lvl: p.save.tlvl, unlocks });
      this.emit(p.x, p.y, ['tl', p.id]);
      this.broadcastMeta(p);
    }
    p.dirtyCore = true;
  }

  healTeam(p: PlayerSession, frac: number, revive: boolean) {
    for (const m of p.team) {
      if (m.fainted) { if (!revive) continue; m.fainted = false; m.hp = 0; m.reviveAt = 0; m.x = p.x; m.y = p.y + 1; this.emit(m.x, m.y, ['rv', m.id]); }
      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * frac);
      m.status = 0;
    }
  }

  // ------------------------------------------------------------------ telegrafías de jefe
  telegraphHit(x: number, y: number, margin = 0): Telegraph | null {
    for (const t of this.telegraphs) if (inShape(t, x, y, margin)) return t;
    return null;
  }
  addTelegraph(t: Omit<Telegraph, 'id' | 'start'>) {
    const tg: Telegraph = { ...t, id: this.nextTg++, start: this.now };
    this.telegraphs.push(tg);
    return tg;
  }
  resolveTelegraphs() {
    const now = this.now;
    if (!this.telegraphs.length) return;
    const keep: Telegraph[] = [];
    for (const t of this.telegraphs) {
      if (now < t.at) { keep.push(t); continue; }
      this.emit(t.x, t.y, ['tgx', t.id, t.fx, t.shape, r2(t.x), r2(t.y), r2(t.r), r2(t.r2), r2(t.x2), r2(t.y2), r2(t.w)]);
      for (const p of this.playersNear(t.x, t.y, 20)) {
        if (inShape(t, p.x, p.y, 0.25)) this.damagePlayer(p, Math.round(p.maxHp * t.dmgPct));
      }
      for (const m of this.monsNear(t.x, t.y, 20)) {
        if (!m.owner || !m.alive || !inShape(t, m.x, m.y, 0.3)) continue;
        this.dealDamage(t.boss, m, Math.max(1, Math.round(m.maxHp * t.monPct)), 0);
        if (t.status && m.alive) this.applyStatus(m, t.status, 0);
      }
    }
    this.telegraphs = keep;
  }

  // ------------------------------------------------------------------ aparición de salvajes
  spawner() {
    const now = this.now;
    let total = 0;
    for (const m of this.mons.values()) if (m.wild) total++;
    if (total > 900) return;
    const night = isNight(now);
    for (const p of this.players.values()) {
      if (p.hp <= 0) continue;
      const pz = this.zoneAt(p.x, p.y);
      if (pz.kind === 'town') continue;
      const near = this.monsNear(p.x, p.y, 24).filter(m => m.wild && !m.boss && !m.eventId && !m.privateTo && !m.ambushFor).length;
      // Solo unos pocos pasean a la vista: el resto aparece de golpe mientras caminas (encounterStep).
      let target = Math.max(2, Math.round(pz.density * BAL.AMBIENT_DENSITY));
      if (this.storm && this.storm.until > now && this.storm.zone === pz.id) target = Math.round(target * 1.5);
      const attempts = Math.min(1, target - near);
      for (let a = 0; a < attempts; a++) {
        const ang = Math.random() * Math.PI * 2, r = 9 + Math.random() * 11;
        const x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r;
        const tx = Math.floor(x), ty = Math.floor(y);
        if (tx < 0 || ty < 0 || tx >= this.world.w || ty >= this.world.h) continue;
        const z = this.zoneAt(x, y);
        if (z.kind === 'town') continue;
        const s = this.world.solid[ty * this.world.w + tx];
        let table = s === 2 ? z.water : (s === 0 && this.world.reach[ty * this.world.w + tx] ? boostedTable(z, now, night) : null);
        if (!table || !table.length) continue;
        table = table.filter(e => !e[2] || (e[2] === 'night') === night);
        if (this.storm && this.storm.until > now && this.storm.zone === z.id) {
          const st = this.storm.type;
          table = table.map(e => (SPECIES[e[0]]?.types.includes(st) ? [e[0], e[1] * 3, e[2]] : e) as any);
        }
        const key = pickEncounter(table);
        if (!key || !SPECIES[key]) continue;
        const sp = SPECIES[key];
        if (s === 2 && sp.habitat === 'land') continue;
        const lvl = z.lvl[0] + Math.floor(Math.random() * (z.lvl[1] - z.lvl[0] + 1));
        const chain = p.save.chain;
        const shinyMult = (now < p.incenseUntil ? BAL.SHINY_INCENSE : 1) * (p.upg('shinycharm') ? BAL.SHINY_CHARM : 1) * (chain && chain.sp === key ? chainShinyMult(chain.n) : 1);
        this.spawnWild(key, lvl, tx + 0.5, ty + 0.5, { shiny: rollShiny(key, shinyMult, ENV.SHINY_RATE), zone: z.id });
      }
    }
  }

  spawnWild(key: string, lvl: number, x: number, y: number, o: { shiny?: boolean; zone?: number; alpha?: boolean; eventId?: number; rare?: boolean } = {}) {
    const m = new MonEntity(this.nextId++, key, clamp(lvl, 1, MAX_LEVEL), x, y, !!o.shiny);
    m.hpMult = BAL.WILD_HP; m.recalc(true);
    m.zone = o.zone ?? this.zoneAt(x, y).id;
    m.rare = !!o.rare || ['rare', 'epic', 'legendary', 'mythic'].includes(m.sp.rarity);
    if (o.alpha) { m.alpha = true; m.hpMult = 5 * BAL.WILD_HP * 0.6; m.recalc(true); }
    if (o.eventId) m.eventId = o.eventId;
    this.mons.set(m.id, m);
    if (m.shiny || m.rare || m.alpha) this.emit(x, y, ['sp', m.id, m.shiny ? 1 : 0]);
    return m;
  }

  removeMon(m: MonEntity) {
    this.mons.delete(m.id);
    for (const p of this.players.values()) if (p.focus === m) p.focus = null;
  }

  // ------------------------------------------------------------------ encuentros sorpresa (estilo Pokémon GO / hierba alta)
  encounterStep(p: PlayerSession) {
    const now = this.now;
    const d = dist(p.x, p.y, p.encX, p.encY);
    if (d < 0.9) return;
    p.encX = p.x; p.encY = p.y;
    if (d > 5 || p.hp <= 0 || p.duelId || this.gyms.battles.has(p.id) || now < p.peaceUntil) return;
    if (now - p.lastEncAt < ENC.COOLDOWN_MS) return;
    const z = this.zoneAt(p.x, p.y);
    if (z.kind === 'town' || z.kind === 'ocean' || !z.spawns.length) return;
    const terr = this.world.terrain[Math.floor(p.y) * this.world.w + Math.floor(p.x)];
    const base = STEP_CHANCE[terr] ?? 0.012;
    let active = 0;
    for (const m of this.monsNear(p.x, p.y, 30)) if (m.ambushFor === p.id && m.alive) active++;
    if (active >= ENC.MAX_ACTIVE) return;
    const ramp = 1 + Math.min(1, (now - p.lastEncAt - ENC.COOLDOWN_MS) / ENC.RAMP_MS);
    const chance = base * d * ramp * (now < p.incenseUntil ? 1.5 : 1);
    if (Math.random() < chance) this.ambush(p, z.id);
  }

  ambush(p: PlayerSession, zoneId: number, forceRoamer?: string) {
    const now = this.now, z = ZONES[zoneId], night = isNight(now);
    const incense = now < p.incenseUntil ? 3 : 1;
    let key: string | null = null, lvl = 0, roamer = false;
    const forced = forceRoamer ? ROAMERS.find(r => r.key === forceRoamer) : null;
    if (forced) { key = forced.key; lvl = forced.lvl; roamer = true; }
    else for (const r of ROAMERS) {
      if (!r.zones.includes(zoneId) || Math.random() >= roamerChance(r, night, weatherAt(zoneId, now, z.kind), seasonAt(now)) * incense) continue;
      if ([...this.mons.values()].some(m => m.key === r.key && m.wild && m.alive)) continue;
      key = r.key; lvl = r.lvl + Math.floor(Math.random() * 6); roamer = true; break;
    }
    if (!key) {
      let table = boostedTable(z, now, night);
      if (this.storm && this.storm.until > now && this.storm.zone === zoneId) {
        const st = this.storm.type;
        table = table.map(e => (SPECIES[e[0]]?.types.includes(st) ? [e[0], e[1] * 3, e[2]] : e) as any);
      }
      key = pickEncounter(table);
      if (!key || !SPECIES[key]) return;
      lvl = z.lvl[0] + Math.floor(Math.random() * (z.lvl[1] - z.lvl[0] + 1));
      if (Math.random() < ENC.STRONG_CHANCE) lvl += 2 + Math.floor(Math.random() * 3);
    }
    const sp = SPECIES[key];
    // punto de aparición: entre la hierba, cerca y preferiblemente por delante
    const fwd = [[0, 1], [0, -1], [-1, 0], [1, 0]][p.dir] || [0, 1];
    let sx = 0, sy = 0, ok = false;
    for (let k = 0; k < 10 && !ok; k++) {
      const a = Math.atan2(fwd[1], fwd[0]) + (Math.random() - 0.5) * (k < 5 ? 2.2 : 6.2);
      const r = ENC.DIST_MIN + Math.random() * (ENC.DIST_MAX - ENC.DIST_MIN);
      sx = p.x + Math.cos(a) * r; sy = p.y + Math.sin(a) * r;
      const tx = Math.floor(sx), ty = Math.floor(sy);
      if (tx < 0 || ty < 0 || tx >= this.world.w || ty >= this.world.h) continue;
      if (this.zoneAt(sx, sy).kind === 'town') continue;
      const hab = sp.habitat === 'air' ? 'air' : 'land';
      if (!this.walkable(sx, sy, hab) || !this.world.reach[ty * this.world.w + tx]) continue;
      ok = true;
    }
    if (!ok) return;
    const chain = p.save.chain;
    const shinyMult = (now < p.incenseUntil ? BAL.SHINY_INCENSE : 1) * (p.upg('shinycharm') ? BAL.SHINY_CHARM : 1) * (chain && chain.sp === key ? chainShinyMult(chain.n) : 1);
    const alpha = !roamer && sp.rarity !== 'mythic' && Math.random() < ENC.NATURAL_ALPHA;
    const m = this.spawnWild(key, lvl, sx, sy, { shiny: rollShiny(key, shinyMult, ENV.SHINY_RATE), zone: zoneId, alpha });
    m.ambushFor = p.id;
    m.aggro = Math.random() < aggroChance(key, z.lvl[1], night) || alpha;
    if (roamer) { m.roamer = true; m.rare = true; m.hpMult = 3.2 * BAL.WILD_HP; m.iv = m.iv.map(v => Math.max(v, 20)); m.recalc(true); m.aggro = sp.rarity !== 'mythic'; }
    p.lastEncAt = now;
    if (m.aggro) {
      const allies = p.team.filter(a => a.alive);
      m.target = allies.length && Math.random() < 0.5 ? allies[Math.floor(Math.random() * allies.length)] : p;
      m.state = 'chase'; m.targetEvalAt = now + 600;
    } else if (sp.temper === 'skittish' && Math.random() < 0.35) { m.state = 'flee'; m.fleeUntil = now + 1800; m.target = null; }
    else {
      // los tranquilos aparecen ya caminando, cruzándose en tu camino
      const a = Math.random() * Math.PI * 2;
      for (let k = 0; k < 6; k++) { const wx = sx + Math.cos(a + k) * 4.5, wy = sy + Math.sin(a + k) * 4.5; if (this.walkable(wx, wy, sp.habitat === 'air' ? 'air' : 'land')) { m.wx = wx; m.wy = wy; break; } }
      m.wanderAt = now + 3500;
    }
    this.emit(sx, sy, ['enc', m.id, m.aggro ? 1 : 0, roamer ? 1 : 0, p.id]);
    if (!p.save.dex.seen[key]) { p.save.dex.seen[key] = 1; p.dirtyCore = true; }
    if (roamer || (m.shiny && (sp.rarity === 'legendary' || sp.rarity === 'mythic'))) {
      const label = m.shiny ? `✦ ${sp.name} SHINY` : sp.name;
      this.broadcast({ t: 'legend', key, shiny: m.shiny, zone: zoneId, who: p.name, lvl: m.lvl });
      this.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `⚡ ¡${label} (${RARITY_NAMES[sp.rarity]}, Nv.${m.lvl}) ha aparecido ante ${p.name} en ${z.name}!` });
      this.cloud?.feed('legend', `¡${label} apareció ante ${p.name} en ${z.name}!`);
    }
  }

  /** Huir del combate: los salvajes que te persiguen te pierden el rastro. Puede fallar contra rivales rápidos. */
  flee(p: PlayerSession) {
    const now = this.now;
    if (p.duelId) return this.notify(p, 'No puedes huir de un duelo. ¡Sal de la arena si quieres rendirte!', 'bad');
    if (now < p.fleeAt) return;
    p.fleeAt = now + 2500;
    const chasers = this.monsNear(p.x, p.y, 14).filter(m => m.wild && m.alive && !m.boss && !m.privateTo && (m.target === p || (m.target instanceof MonEntity && m.target.owner === p) || m === p.focus || m.ambushFor === p.id));
    if (!chasers.length) { p.focus = null; for (const t of p.team) t.target = null; p.peaceUntil = now + 4000; p.send({ t: 'fled', ok: true, n: 0 }); return; }
    const teamSpd = p.team.filter(m => m.alive).reduce((s, m) => Math.max(s, m.spd), 40);
    const wildSpd = chasers.reduce((s, m) => Math.max(s, m.spd + (m.alpha || m.roamer ? 40 : 0)), 0);
    const chance = clamp(0.6 + (teamSpd - wildSpd) / 180 + p.fleeTries * 0.18, 0.2, 0.97);
    if (Math.random() > chance) { p.fleeTries++; this.notify(p, '¡No has podido escapar!', 'bad'); p.send({ t: 'fled', ok: false }); return; }
    p.fleeTries = 0;
    p.focus = null; p.peaceUntil = now + 5000; p.invulnUntil = Math.max(p.invulnUntil, now + 1200);
    for (const t of p.team) t.target = null;
    for (const m of chasers) {
      m.target = null; m.ignoreP = p.id; m.ignoreUntil = now + 15000; m.state = 'return';
      if (m.ambushFor === p.id && !m.roamer && !m.shiny) { this.emit(m.x, m.y, ['x', 'poof', r2(m.x), r2(m.y)]); this.removeMon(m); this.emit(m.x, m.y, ['rm', m.id]); }
    }
    p.send({ t: 'fled', ok: true, n: chasers.length });
  }

  // ------------------------------------------------------------------ cofres de salvajes
  maybeDrop(m: MonEntity, killer: MonEntity | null) {
    let owner = killer?.owner || null, best = 0;
    for (const [pid, d] of m.dmgBy) if (d > best) { const p = this.players.get(pid); if (p) { best = d; owner = owner || p; } }
    if (!owner) return;
    const luck = 1 + owner.upg('luck') * 0.05;
    const ch = BAL.DROP_CHEST * luck * (m.aggro ? 1.6 : 1) * (m.rare ? 2.5 : 1) * (m.alpha ? 12 : 1) * (m.roamer ? 40 : 1) * (m.lvl > ZONES[m.zone]?.lvl[1] ? 1.5 : 1);
    if (Math.random() >= ch) return;
    const zl = ZONES[m.zone]?.lvl[0] || m.lvl;
    const tier = Math.min(3, (zl < 10 ? 0 : zl < 20 ? 1 : zl < 32 ? 2 : 3) + (m.alpha || m.roamer ? 1 : 0));
    const dr: Drop = { id: this.nextDrop++, x: m.x, y: m.y, tier, owner: owner.id, freeAt: this.now + 20000, until: this.now + 90000 };
    this.drops.set(dr.id, dr);
    this.emit(m.x, m.y, ['drop', dr.id, r2(dr.x), r2(dr.y), tier, owner.id]);
  }

  /** Devuelve el motivo por el que no se puede acampar aquí (o '' si se puede). */
  canCamp(p: PlayerSession): string {
    const z = this.zoneAt(p.x, p.y);
    if (z.kind !== 'wild') return 'Solo se puede acampar en rutas y zonas salvajes (no en pueblos, cuevas ni en el agua).';
    const t = this.world.terrain[Math.floor(p.y) * this.world.w + Math.floor(p.x)];
    if (!CAMP_GROUND.has(t)) return 'Busca un claro de hierba, arena, nieve o roca: aquí no se puede montar la tienda.';
    if (this.now < p.combatUntil) return 'No puedes acampar en mitad de un combate.';
    const cd = this.campCd.get(p.accountId) || 0;
    if (this.now < cd) return `Aún estás recogiendo el último campamento. Espera ${Math.ceil((cd - this.now) / 1000)} s.`;
    for (const m of this.monsNear(p.x, p.y, CAMP.SAFE)) if (m.wild && m.alive && (m.aggro || m.target) && !m.privateTo) return 'Hay Pokémon hostiles cerca. Aléjate o derrótalos antes de acampar.';
    for (const c of this.camps.values()) if (dist(c.x, c.y, p.x, p.y) < 6) return 'Ya hay un campamento aquí al lado: únete a él.';
    return '';
  }

  makeCamp(p: PlayerSession) {
    for (const [id, c] of this.camps) if (c.owner === p.id) this.camps.delete(id);
    const c: Camp = { id: this.nextCamp++, owner: p.id, x: p.x, y: p.y, until: this.now + CAMP.MS };
    this.camps.set(c.id, c);
    this.campCd.set(p.accountId, this.now + CAMP.CD);
    this.emit(p.x, p.y, ['x', 'camp', p.id, r2(p.x), r2(p.y)]);
    p.send({ t: 'camped', until: c.until });
    this.notify(p, '🏕 Has montado el campamento. Quédate cerca de la hoguera: tu equipo descansa, se cura y los debilitados se recuperan poco a poco.', 'good');
  }

  /** Cada medio segundo: curación junto a la hoguera para el dueño y su grupo. */
  updateCamps() {
    const now = this.now;
    for (const [id, c] of this.camps) {
      const owner = this.players.get(c.owner);
      if (!owner || now > c.until) { this.camps.delete(id); this.emit(c.x, c.y, ['x', 'campend', id]); continue; }
      for (const p of this.playersNear(c.x, c.y, CAMP.R)) {
        if (p !== owner && (!p.party || p.party !== owner.party)) continue;
        if (now < p.combatUntil) continue;
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.025);
        for (const m of p.team) {
          if (m.fainted) { m.reviveAt = Math.min(m.reviveAt, now + 12000); continue; }
          m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.02);
          if (m.status && Math.random() < 0.08) m.status = 0;
        }
        p.campAt = c; p.campSeen = now;
      }
    }
  }

  updateDrops() {
    const now = this.now;
    for (const [id, dr] of this.drops) {
      if (now > dr.until) { this.drops.delete(id); continue; }
      for (const p of this.playersNear(dr.x, dr.y, 1.3)) {
        if (p.hp <= 0 || (p.id !== dr.owner && now < dr.freeAt)) continue;
        this.openDrop(p, dr); break;
      }
    }
  }

  openDrop(p: PlayerSession, dr: Drop) {
    this.drops.delete(dr.id);
    const luck = 1 + p.upg('luck') * 0.1;
    const out = rollChest(dr.tier, luck);
    const lines: string[] = [];
    if (out.money) { p.save.money += out.money; lines.push(`${out.money} ₽`); }
    if (out.crystals) { p.save.crystals += out.crystals; lines.push(`${out.crystals} Cristales Rush`); }
    for (const [it, n] of Object.entries(out.items)) { p.save.items[it] = (p.save.items[it] || 0) + n; lines.push(`${ITEMS[it].name} x${n}`); }
    p.save.stats.chests++;
    p.dirtyCore = true;
    this.emit(dr.x, dr.y, ['dropx', dr.id, p.id]);
    p.send({ t: 'loot', kind: 'chest', title: ['Cofre de madera', 'Cofre de hierro', 'Cofre de oro', 'Cofre de cristal'][dr.tier] + ' del salvaje', lines });
  }

  // ------------------------------------------------------------------ capturas
  throwBall(p: PlayerSession, monId: number, ball: string) {
    const now = this.now;
    if (now - p.throwAt < 900) return;
    if (!BALLS.includes(ball) || (p.save.items[ball] || 0) <= 0) { this.notify(p, 'No te quedan Balls de ese tipo.', 'bad'); return; }
    const m = this.mons.get(monId);
    if (!m || !m.wild || m.capture) return;
    if (m.privateTo) { this.notify(p, '¡No puedes capturar el Pokémon de un líder de gimnasio!', 'bad'); return; }
    if (dist(p.x, p.y, m.x, m.y) > 9.5) { this.notify(p, 'Está demasiado lejos para lanzar la Ball.', 'bad'); return; }
    const exhausted = m.boss && m.exhaustedUntil > now;
    if (m.boss && !exhausted) { this.notify(p, '¡No puedes capturar a un jefe mientras combate! Derrótalo primero.', 'bad'); return; }
    if (!m.alive && !exhausted) return;
    if (exhausted && m.triedBy.has(p.id) && ball !== 'masterball') { this.notify(p, 'Ya lo intentaste: espera a la próxima aparición o usa una Master Ball.', 'bad'); return; }
    p.throwAt = now;
    p.save.items[ball]--;
    p.dirtyCore = true;
    const hpFrac = exhausted ? 0 : m.hp / m.maxHp;
    const statusBonus = STATUS_CATCH[m.status] || 1;
    const topLvl = Math.max(1, ...p.team.map(t => t.lvl));
    const levelPenalty = m.lvl > topLvl + 8 ? 0.5 : 1;
    let rate = m.sp.catchRate * (exhausted ? 0.6 : 1) * (m.alpha ? 0.4 : 1);
    const chance = catchChance(rate, hpFrac, ITEMS[ball].ballBonus || 1, statusBonus, CATCH_BONUS(p.upg('catch')), levelPenalty, (RARITY_CATCH[m.sp.rarity] ?? 1) * (m.roamer ? 0.7 : 1));
    const dexCaught = Object.values(p.save.dex.caught).filter(v => v > 0).length;
    const { success, shakes, critical } = rollCapture(chance, critCaptureChance(dexCaught));
    const dur = 700 + shakes * 520 + 350;
    this.emit(p.x, p.y, ['cap', p.id, m.id, BALLS.indexOf(ball), shakes, success ? 1 : 0, r2(m.x), r2(m.y), critical ? 1 : 0]);
    if (exhausted) {
      m.triedBy.add(p.id);
      setTimeout(() => this.finishCapture(p, m, success, true), dur);
      return;
    }
    m.capture = { by: p.id, until: now + dur, success, shakes, ball };
    m.target = null;
  }

  resolveCapture(m: MonEntity) {
    const c = m.capture!; m.capture = null;
    const p = this.players.get(c.by);
    if (!p) return;
    this.finishCapture(p, m, c.success, false);
  }

  finishCapture(p: PlayerSession, m: MonEntity, success: boolean, fromBoss: boolean) {
    if (p.closed) return;
    if (!success) {
      p.send({ t: 'cap_fail', name: m.sp.name });
      if (!fromBoss && m.alive) { m.target = p.team.find(t => t.alive) || p; m.state = 'chase'; if (m.sp.temper === 'skittish') { m.state = 'flee'; m.fleeUntil = this.now + 3000; } }
      return;
    }
    if (!fromBoss) { if (m.rare) this.wevents.onRareResolved(m, p); this.removeMon(m); this.emit(m.x, m.y, ['rm', m.id]); }
    const lvl = fromBoss ? Math.max(5, m.lvl - 5) : m.lvl;
    const ms = createMon(m.key, lvl, m.shiny, m.zone, fromBoss ? undefined : m.iv, fromBoss ? undefined : m.nat);
    p.save.mons.push(ms);
    p.save.dex.seen[m.key] = 1;
    p.save.dex.caught[m.key] = (p.save.dex.caught[m.key] || 0) + 1;
    if (m.shiny) { p.save.dex.shiny[m.key] = (p.save.dex.shiny[m.key] || 0) + 1; p.save.stats.shinies++; }
    p.save.stats.catches++;
    // caramelos de la familia: la base para evolucionar
    const fam = m.sp.family, cn = m.shiny ? 12 : m.sp.rarity === 'common' ? 3 : m.sp.rarity === 'uncommon' ? 4 : 6;
    p.save.candies[fam] = (p.save.candies[fam] || 0) + cn;
    for (const b of p.save.bounties) if (b.kind === 'catch' && b.prog < b.n) b.prog++;
    // auto-equipar si hay hueco
    let equipped = false;
    if (p.save.team.length < teamSlotsFor(p.save.tlvl)) { p.save.team.push(ms.uid); this.rebuildTeam(p); equipped = true; }
    this.giveTrainerXp(p, Math.round(killXp(speciesBaseExp(m.sp), m.lvl) * 4));
    const ch = p.save.chain;
    p.save.chain = ch && ch.sp === m.key ? { sp: m.key, n: ch.n + 1 } : { sp: m.key, n: 1 };
    if (p.save.chain.n >= 2) this.notify(p, `Cadena de captura de ${m.sp.name}: ${p.save.chain.n} (shiny x${chainShinyMult(p.save.chain.n).toFixed(1)})`, 'good');
    p.dirtyCore = true; p.dirtyMons = true;
    p.send({ t: 'caught', mon: ms, equipped, first: p.save.dex.caught[m.key] === 1 });
    const legend = m.sp.rarity === 'legendary' || m.sp.rarity === 'mythic';
    if (m.shiny || legend || m.sp.rarity === 'epic' || fromBoss || m.alpha) {
      this.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `${legend ? '👑 ' : ''}${p.name} ha capturado ${m.shiny ? 'un ✦' : 'un'} ${m.alpha ? 'ALFA ' : ''}${m.sp.name}${m.shiny ? ' shiny' : ''} (${RARITY_NAMES[m.sp.rarity]}).` });
      if (legend) this.broadcast({ t: 'legend_caught', key: m.key, shiny: m.shiny, who: p.name });
      if (legend || m.shiny) this.cloud?.feed(legend ? 'legend' : 'shiny', `${p.name} capturó ${m.shiny ? 'un ✦ ' : 'a '}${m.sp.name}${m.shiny ? ' shiny' : ''} (Nv.${m.lvl})`);
      this.savePlayer(p);
    }
  }

  // ------------------------------------------------------------------ habilidades
  useSkill(p: PlayerSession, n: number, dx: number, dy: number) {
    const now = this.now;
    const sk = SKILLS.find(s => s.n === n);
    if (!sk || p.save.tlvl < sk.unlock || p.hp <= 0) return;
    if (now < p.cds[n]) return;
    p.cds[n] = now + sk.cd * 1000;
    switch (sk.id) {
      case 'rush': p.rushUntil = now + 6000; break;
      case 'heal': this.healTeam(p, 0.35, false); p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3); break;
      case 'order':
        for (const m of p.team) {
          if (!m.alive || !m.special) continue;
          const t = (p.focus && p.focus.alive ? p.focus : null) || this.nearestWild(m.x, m.y, 9, p.id);
          if (t) this.doAttack(m, t, m.special, 1.5, true);
        }
        break;
      case 'dash': p.invulnUntil = now + 550; p.dashBudget = 4.2; p.dashUntil = now + 600; break;
    }
    this.emit(p.x, p.y, ['sk', p.id, n, r2(dx), r2(dy)]);
  }

  // ------------------------------------------------------------------ movimiento / teletransporte
  onMove(p: PlayerSession, x: number, y: number, dir: number, moving: boolean, seq: number) {
    if (seq !== p.tpSeq || p.hp <= 0) return;
    const now = this.now;
    const d = dist(p.x, p.y, x, y);
    let budget = p.moveBudget + (now < p.dashUntil ? p.dashBudget : 0);
    if (d > budget + 0.35 || playerBlocked(this.world, x, y, p.canSurf)) {
      if (now - p.posCorrectAt > 250) { p.posCorrectAt = now; p.send({ t: 'pos', x: r2(p.x), y: r2(p.y), seq: p.tpSeq }); }
      return;
    }
    if (now < p.dashUntil && d > p.moveBudget) { p.dashBudget = Math.max(0, p.dashBudget - (d - p.moveBudget)); p.moveBudget = 0; }
    else p.moveBudget = Math.max(0, p.moveBudget - d);
    p.x = x; p.y = y; p.dir = dir & 3; p.moving = moving;
    p.save.x = x; p.save.y = y;
  }

  teleport(p: PlayerSession, x: number, y: number) {
    this.emit(p.x, p.y, ['tp', p.id, r2(p.x), r2(p.y)]);
    p.x = x; p.y = y; p.save.x = x; p.save.y = y; p.tpSeq++;
    p.focus = null;
    for (const m of p.team) { m.x = x + (Math.random() - 0.5) * 1.5; m.y = y + 0.5 + Math.random(); m.target = null; }
    p.send({ t: 'tp', x, y, seq: p.tpSeq });
    this.emit(x, y, ['tp', p.id, r2(x), r2(y)]);
  }

  // ------------------------------------------------------------------ cofres y objetos
  openPickup(p: PlayerSession, id: number, auto = false) {
    const pk = this.world.pickups[id - 1];
    if (!pk || pk.id !== id) return;
    const d = dist(p.x, p.y, pk.x + 0.5, pk.y + 0.5);
    const maxD = auto ? p.upg('magnet') * 2 + 0.8 : 2.2;
    if (d > maxD) return;
    const last = p.save.pickups[id] || 0;
    const respawn = pk.kind === 'chest' ? 20 * 60000 : 10 * 60000;
    if (this.now - last < respawn) { if (!auto) this.notify(p, 'Ya lo has abierto. Vuelve más tarde.', 'info'); return; }
    p.save.pickups[id] = this.now;
    const tier = pk.tier;
    const lines: string[] = [];
    const luck = 1 + p.upg('luck') * 0.1;
    const add = (it: string, n: number) => { p.save.items[it] = (p.save.items[it] || 0) + n; lines.push(`${ITEMS[it].name} x${n}`); };
    const out = pk.kind === 'item' ? rollItemBall(tier, luck) : rollChest(tier, luck);
    if (out.money) { p.save.money += out.money; lines.push(`${out.money} ₽`); }
    if (out.crystals) { p.save.crystals += out.crystals; lines.push(`${out.crystals} Cristales Rush`); }
    for (const [it, n] of Object.entries(out.items)) add(it, n);
    if (out.ess) {
      const z = ZONES[pk.zone]; const pool = z.spawns.length ? z.spawns : [['pidgey', 1]] as any;
      const sp = SPECIES[pool[Math.floor(Math.random() * pool.length)][0]]; const t = sp.types[0];
      p.save.ess[t] = (p.save.ess[t] || 0) + out.ess; lines.push(`Esencia ${TYPE_NAMES[t]} x${out.ess}`);
    }
    if (pk.kind === 'chest') { p.save.stats.chests++; this.giveTrainerXp(p, Math.round(trainerXpForLevel(p.save.tlvl + 1) * 0.004 + 20 + tier * 25)); }
    p.dirtyCore = true;
    this.emit(pk.x + 0.5, pk.y + 0.5, ['ch', pk.id, p.id, pk.kind === 'chest' ? 1 : 0]);
    p.send({ t: 'loot', id: pk.id, kind: pk.kind, lines });
  }

  // ------------------------------------------------------------------ red
  broadcastMeta(p: PlayerSession) {
    this.broadcast({ t: 'pm', p: [this.metaOf(p)] });
  }
  metaOf(p: PlayerSession) {
    return { id: p.id, n: p.name, lv: p.save.tlvl, look: p.save.look, party: p.party ? p.party.id : 0, z: p.zone };
  }

  sendSnapshots() {
    const now = this.now;
    const VR = VIEW_RADIUS, VRY = VIEW_RADIUS * 0.75;
    const tgs = this.telegraphs.map(t => [t.id, t.shape, r2(t.x), r2(t.y), r2(t.r), r2(t.r2), r2(t.x2), r2(t.y2), r2(t.w), t.at - now, t.at - t.start, t.fx]);
    for (const p of this.players.values()) {
      if (p.closed || p.ws.readyState !== 1) continue;
      if (p.ws.bufferedAmount > 512 * 1024) continue; // cliente lento: saltar este snapshot
      const pl: any[] = [];
      for (const o of this.players.values()) {
        if (o === p || Math.abs(o.x - p.x) > VR || Math.abs(o.y - p.y) > VRY) continue;
        pl.push([o.id, r2(o.x), r2(o.y), o.dir, o.moving ? 1 : 0, Math.round(o.hp / o.maxHp * 100), now < o.invulnUntil ? 1 : 0]);
      }
      const mn: any[] = [];
      for (const m of this.monsNear(p.x, p.y, VR + 2)) {
        if (Math.abs(m.y - p.y) > VRY + 4) continue;
        let f = 0;
        if (m.shiny) f |= 1; if (m.wild) f |= 2; if (m.boss) f |= 4; if (m.fainted) f |= 8; if (m.rare) f |= 16;
        if (m.capture) f |= 32; if (m.alpha) f |= 64; if (m.exhaustedUntil) f |= 128; if (m.boss?.hidden) f |= 256;
        if (m.boss && now < m.boss.barrierUntil) f |= 512; if (m.eventId) f |= 1024;
        if (m.privateTo) { if (m.privateTo !== p.id) continue; f |= 2048; }
        if (m.wild && (m.aggro || (m.target && m.state === 'chase'))) f |= 4096;
        if (m.roamer) f |= 8192;
        if (m.owner && m.owner !== p && this.duels.hostile(p, m.owner)) f |= 16384;
        mn.push([m.id, m.spIdx, r2(m.x), r2(m.y), Math.max(0, Math.ceil(m.hp / m.maxHp * 100)), m.lvl, f, m.owner ? m.owner.id : 0, m.status, m.facing < 0 ? 1 : 0]);
      }
      const ev: any[] = [];
      for (const e of this.evts) {
        if (e.only !== undefined) { if (e.only === p.id) ev.push(e.d); continue; }
        if (Math.abs(e.x - p.x) <= VR + 4 && Math.abs(e.y - p.y) <= VRY + 4) ev.push(e.d);
      }
      const tm = p.team.map(m => { const ms = p.monSave(m.uid!)!; return [m.uid, ms.lvl, ms.xp, Math.ceil(m.hp), m.maxHp, m.fainted ? Math.max(0, m.reviveAt - now) : -1, m.status, m.id]; });
      const me = [Math.ceil(p.hp), p.maxHp, p.cds.map(c => Math.max(0, c - now)), Math.max(0, p.rushUntil - now), p.focus ? p.focus.id : 0, p.stance, p.duelId, p.focusFight];
      const tg = tgs.filter(t => Math.abs((t[2] as number) - p.x) < VR + 10 && Math.abs((t[3] as number) - p.y) < VR + 10);
      const dr: any[] = [];
      for (const d of this.drops.values()) if (Math.abs(d.x - p.x) < VR && Math.abs(d.y - p.y) < VRY + 2) dr.push([d.id, r2(d.x), r2(d.y), d.tier, d.owner === p.id || now >= d.freeAt ? 1 : 0]);
      const cp: any[] = [];
      for (const c of this.camps.values()) if (Math.abs(c.x - p.x) < VR && Math.abs(c.y - p.y) < VRY + 2) cp.push([c.id, r2(c.x), r2(c.y), c.owner, Math.max(0, c.until - now)]);
      p.send({ t: 's', ts: now, pl, mn, ev, tm, me, tg, dr, cp });
    }
    this.evts.length = 0;
  }

  periodic() {
    const now = this.now;
    for (const p of this.players.values()) {
      if (p.dirtyMons) { p.dirtyMons = false; p.send({ t: 'mons', mons: p.save.mons }); }
      if (p.dirtyCore && now - p.lastCoreSent > 450) { p.dirtyCore = false; p.lastCoreSent = now; p.send({ t: 'core', core: coreOf(p, this) }); }
    }
    if (this.tickN % 40 === 0) {
      for (const p of this.players.values()) {
        if (!p.party) continue;
        p.send({ t: 'party', id: p.party.id, members: p.party.members.map(m => ({ id: m.id, n: m.name, lv: m.save.tlvl, hp: Math.round(m.hp / m.maxHp * 100), z: m.zone, x: Math.round(m.x), y: Math.round(m.y) })) });
      }
    }
  }

  savePlayer(p: PlayerSession) {
    try {
      p.save.playtime += Math.round((Date.now() - p.lastSaveAt) / 1000);
      p.lastSaveAt = Date.now();
      this.db.writeSave(p.accountId, p.save);
      this.cloud?.queuePlayer(p);
    } catch (e) { console.error('[save] error guardando', p.name, e); }
  }
  saveAll() { for (const p of this.players.values()) this.savePlayer(p); }
}

// ---------------------------------------------------------------------- helpers
export function coreOf(p: PlayerSession, g: Game) {
  const s = p.save;
  return {
    name: s.name, look: s.look, tlvl: s.tlvl, txp: s.txp, money: s.money, crystals: s.crystals, tokens: s.tokens,
    ess: s.ess, candies: s.candies, items: s.items, team: s.team, dex: s.dex, upgrades: s.upgrades, claimed: s.claimed,
    bounties: s.bounties, stats: { ...s.stats, teamSize: s.team.length, zones: s.zones.length }, zones: s.zones, towns: s.towns,
    expeditions: s.expeditions, links: p.links, lastTown: s.lastTown, pickups: s.pickups, medals: s.medals,
    xpBoost: Math.max(0, g.xpBoostUntil - g.now), incense: Math.max(0, p.incenseUntil - g.now),
    stance: p.stance, pvp: s.pvp, playtime: s.playtime,
  };
}

export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function inShape(t: { shape: string; x: number; y: number; r: number; r2: number; x2: number; y2: number; w: number }, x: number, y: number, margin: number) {
  if (t.shape === 'circle') return dist(x, y, t.x, t.y) <= t.r + margin;
  if (t.shape === 'ring') { const d = dist(x, y, t.x, t.y); return d >= t.r - margin && d <= t.r2 + margin; }
  return segDist(x, y, t.x, t.y, t.x2, t.y2) <= t.w / 2 + margin;
}

export { pickEncounter as weighted, SPECIES_LIST, LINK_MAP };

