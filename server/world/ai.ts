// Vida en el mundo: entrenadores IA que viajan, entrenan, suben de nivel y evolucionan; mercaderes ambulantes
// con objetos exclusivos según la zona; y cuevas misteriosas que aparecen como evento con un guardián y botín.
import { MonEntity, PlayerSession } from './entities';
import type { Game } from './game';
import { SPECIES } from '../../shared/species';
import { ZONES, type ZoneDef } from '../../shared/zones';
import { ITEMS } from '../../shared/items';
import { dist } from '../../shared/constants';
import { playerBlocked, DUNGEON_DEFS } from '../../shared/world/worldgen';
import { findRoute, type Point } from '../../shared/world/route';

export type Mood = 'amistosa' | 'rival' | 'cobarde';
export const MOODS: Mood[] = ['amistosa', 'rival', 'cobarde'];
interface Slot { key: string; lvl: number; shiny: boolean; ent: MonEntity | null; reviveAt: number; }
export interface AiTrainer {
  id: number; name: string; look: number[]; x: number; y: number; dir: number; moving: boolean;
  lvl: number; xp: number; mood: Mood; roster: Slot[]; route: Point[]; goalAt: number;
  foe: PlayerSession | null; met: Map<number, number>; gifted: Map<number, number>;
  restUntil: number; say: string; sayUntil: number; wins: number; losses: number;
}
export interface Merchant { id: number; name: string; x: number; y: number; zone: number; until: number; stock: { item: string; price: number; qty: number }[]; }
export interface MysteryCave { id: number; x: number; y: number; until: number; dungeon: number; boss: MonEntity | null; cleared: boolean; lvl: number; }

const NAMES = ['Nova', 'Kai', 'Luma', 'Orión', 'Vega', 'Iris', 'Zeta', 'Dante', 'Mika', 'Sol', 'Bruma', 'Eco', 'Atlas', 'Runa'];
export const AI = { COUNT: 9, SPEED: 2.9, SEE: 7, MEET_CD: 90000, GIFT_CD: 600000, REST: 120000 };
const MERCHANT = { MAX: 2, EVERY: [360000, 720000], LIFE: 600000 };
const CAVE = { EVERY: [600000, 1080000], LIFE: 900000 };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export class WorldLife {
  trainers: AiTrainer[] = []; merchants = new Map<number, Merchant>(); caves = new Map<number, MysteryCave>();
  nextId = 1; nextMerchantAt = Date.now() + 120000; nextCaveAt = Date.now() + 240000;
  wildZones: ZoneDef[];
  constructor(private g: Game) {
    this.wildZones = ZONES.filter(z => z.kind === 'wild' && z.spawns.length);
  }

  // ------------------------------------------------------------------ utilidades
  private walkable(x: number, y: number) {
    const w = this.g.world;
    return x > 1 && y > 1 && x < 399 && y < w.h - 1 && !playerBlocked(w, x, y);
  }
  private randomSpotIn(z: ZoneDef, near?: Point, radius = 40): Point | null {
    for (let i = 0; i < 200; i++) {
      const x = near ? near.x + rnd(-radius, radius) : rnd(4, 396), y = near ? near.y + rnd(-radius, radius) : rnd(4, 396);
      if (!this.walkable(x, y)) continue;
      const zz = this.g.zoneAt(x, y);
      if (zz.id === z.id || (!near && zz.kind === 'wild')) return { x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 };
    }
    return null;
  }
  private zoneFor(lvl: number) { const ok = this.wildZones.filter(z => z.lvl[0] <= lvl + 3 && z.lvl[1] >= lvl - 8); return ok.length ? pick(ok) : pick(this.wildZones); }
  private speak(t: AiTrainer, text: string, ms = 4000) { t.say = text; t.sayUntil = this.g.now + ms; }

  // ------------------------------------------------------------------ entrenadores IA
  spawnTrainer() {
    const lvl = Math.floor(rnd(4, 38));
    const z = this.zoneFor(lvl), at = this.randomSpotIn(z);
    if (!at) return;
    const used = new Set(this.trainers.map(t => t.name));
    const name = NAMES.find(n => !used.has(n) && Math.random() < 0.5) || NAMES.find(n => !used.has(n)) || 'Pixel';
    const r = Math.random(), mood: Mood = r < 0.4 ? 'rival' : r < 0.8 ? 'amistosa' : 'cobarde';
    const n = lvl < 10 ? 2 : 3;
    const roster: Slot[] = [];
    for (let i = 0; i < n; i++) {
      const sp = pick(z.spawns)[0] as string;
      if (!SPECIES[sp] || ['legendary', 'mythic'].includes(SPECIES[sp].rarity)) continue;
      roster.push({ key: sp, lvl: Math.max(2, lvl - i * 2), shiny: Math.random() < 0.01, ent: null, reviveAt: 0 });
    }
    if (!roster.length) return;
    const look = [Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 6), Math.floor(Math.random() * 10), Math.floor(Math.random() * 6), Math.floor(Math.random() * 3), Math.floor(Math.random() * 5), Math.floor(Math.random() * 4)];
    this.trainers.push({ id: -(100 + this.nextId++), name, look, x: at.x, y: at.y, dir: 0, moving: false, lvl, xp: 0, mood, roster, route: [], goalAt: 0, foe: null, met: new Map(), gifted: new Map(), restUntil: 0, say: '', sayUntil: 0, wins: 0, losses: 0 });
  }

  private spawnSlot(t: AiTrainer, s: Slot) {
    const m = new MonEntity(this.g.nextId++, s.key, s.lvl, t.x + rnd(-1, 1), t.y + rnd(0.5, 1.5), s.shiny);
    m.ai = t; m.zone = this.g.zoneAt(t.x, t.y).id; m.hpMult = 1.25; m.recalc(true);
    this.g.mons.set(m.id, m); s.ent = m;
  }

  /** Recompensa y cambios de nivel cuando un Pokémon de IA derrota a un salvaje. */
  onKill(killer: MonEntity, victim: MonEntity) {
    const t = killer.ai as AiTrainer | null; if (!t || victim.ai) return;
    t.xp += victim.lvl * 12;
    while (t.xp >= t.lvl * 50) {
      t.xp -= t.lvl * 50; t.lvl++;
      for (const [i, s] of t.roster.entries()) {
        s.lvl = Math.max(s.lvl, t.lvl - i * 2);
        const evo = SPECIES[s.key].evo?.find(e => e.level && s.lvl >= e.level);
        if (evo && SPECIES[evo.to]) {
          const from = SPECIES[s.key].name; s.key = evo.to;
          this.speak(t, `¡Mi ${from} ha evolucionado a ${SPECIES[evo.to].name}!`, 5000);
          if (s.ent) { s.ent.setSpecies(evo.to); this.g.emit(s.ent.x, s.ent.y, ['x', 'evo', s.ent.id]); }
        }
        if (s.ent) { s.ent.lvl = s.lvl; s.ent.recalc(false); }
      }
    }
  }

  /** Un Pokémon de IA cae: si cae todo su equipo ante un jugador, este gana. */
  onMonFaint(m: MonEntity) {
    const t = m.ai as AiTrainer | null; if (!t) return;
    const s = t.roster.find(r => r.ent === m); if (s) { s.ent = null; s.reviveAt = this.g.now + 60000; }
    if (t.roster.every(r => !r.ent)) {
      const foe = t.foe;
      if (foe && !foe.closed) {
        const money = 45 * t.lvl, crys = 1 + Math.floor(t.lvl / 15);
        foe.save.money += money; foe.save.crystals += crys; foe.dirtyCore = true;
        this.g.giveTrainerXp(foe, t.lvl * 20);
        this.g.notify(foe, `🏆 ¡Has derrotado a IA·${t.name} (Nv.${t.lvl})! +${money} ₽, +${crys} cristales.`, 'good');
        t.losses++;
        if (t.mood === 'rival' && Math.random() < 0.35) { t.mood = 'amistosa'; this.speak(t, `Eres muy fuerte, ${foe.name}. ¡Seamos amigos!`, 6000); }
        else this.speak(t, '¡Increíble! Me retiro a curar a mi equipo...', 5000);
      }
      t.foe = null; t.restUntil = this.g.now + AI.REST;
      for (const r of t.roster) r.reviveAt = t.restUntil;
    }
  }

  private teamPower(p: PlayerSession) { return p.team.filter(m => m.alive).reduce((a, m) => a + m.lvl, 0); }
  private aiPower(t: AiTrainer) { return t.roster.filter(s => s.ent?.alive).reduce((a, s) => a + s.lvl, 0); }

  private updateTrainer(t: AiTrainer, dt: number) {
    const now = this.g.now;
    for (const s of t.roster) if (!s.ent && now >= s.reviveAt && !t.foe) this.spawnSlot(t, s);
    // ---- combate contra un jugador
    if (t.foe) {
      const p = t.foe;
      if (p.closed || p.hp <= 0 || dist(p.x, p.y, t.x, t.y) > 16 || p.duelId || this.g.zoneAt(p.x, p.y).kind === 'town') {
        if (!p.closed && p.hp > 0 && dist(p.x, p.y, t.x, t.y) > 16) this.g.notify(p, `Has escapado de IA·${t.name}.`, 'info');
        t.foe = null; for (const s of t.roster) if (s.ent) s.ent.target = null; return;
      }
      if (!p.team.some(m => m.alive)) {
        t.wins++; t.xp += 30 * p.team.length; this.speak(t, `¡He ganado, ${p.name}! Entrena más y vuelve.`, 5000);
        this.g.notify(p, `IA·${t.name} ha derrotado a tu equipo. ¡Cúrate y pídele la revancha!`, 'bad');
        t.foe = null; t.met.set(p.id, now + AI.MEET_CD * 2); for (const s of t.roster) if (s.ent) s.ent.target = null; return;
      }
      for (const s of t.roster) if (s.ent?.alive && (!(s.ent.target instanceof MonEntity) || !s.ent.target.alive || s.ent.target.owner !== p)) s.ent.target = this.g.wildPick(s.ent, p);
      const d = dist(p.x, p.y, t.x, t.y);
      this.walk(t, d > 6 ? { x: p.x, y: p.y } : null, dt);
      return;
    }
    if (now < t.restUntil) { this.walk(t, null, dt); return; }
    // ---- encuentros con jugadores
    for (const p of this.g.playersNear(t.x, t.y, AI.SEE)) {
      if (p.hp <= 0 || p.duelId || this.g.zoneAt(p.x, p.y).kind !== 'wild' || (t.met.get(p.id) || 0) > now) continue;
      t.met.set(p.id, now + AI.MEET_CD);
      const ai = this.aiPower(t), pl = Math.max(1, this.teamPower(p));
      if (t.mood === 'rival') {
        if (ai >= pl * 0.75 && p.team.some(m => m.alive)) {
          t.foe = p; this.speak(t, `¡Eh, ${p.name}! Te reto a un combate.`, 4500);
          this.g.notify(p, `⚔ IA·${t.name} (Nv.${t.lvl}) te desafía. Derrota a su equipo para ganar premios, o aléjate para huir.`, 'bad');
          return;
        }
        this.speak(t, 'Hoy no me apetece pelear... ¡pero ya nos veremos!');
        this.fleeFrom(t, p);
      } else if (t.mood === 'cobarde') {
        if (pl > ai * 0.8) { this.speak(t, '¡Uy! Pareces muy fuerte... ¡me voy!'); this.fleeFrom(t, p); }
        else this.speak(t, 'Hola... no molestes a mis Pokémon, ¿vale?');
      } else {
        const gift = (t.gifted.get(p.id) || 0) <= now && Math.random() < 0.45;
        if (gift) {
          t.gifted.set(p.id, now + AI.GIFT_CD);
          if (Math.random() < 0.5) { this.g.healTeam(p, 0.3, false); this.speak(t, `¡Hola, ${p.name}! Deja que cure un poco a tu equipo.`); this.g.notify(p, `💚 IA·${t.name} ha curado a tu equipo un 30 %.`, 'good'); }
          else { const it = pick(['pokeball', 'pokeball', 'pocion', 'superball']); p.save.items[it] = (p.save.items[it] || 0) + 2; p.dirtyCore = true; this.speak(t, `¡Toma, ${p.name}! Para tu viaje.`); this.g.notify(p, `🎁 IA·${t.name} te ha regalado ${ITEMS[it].name} ×2.`, 'good'); }
        } else this.speak(t, pick([`¡Hola, ${p.name}! Buen día para entrenar.`, '¿Has visto algún shiny por aquí?', 'Dicen que en las cuevas misteriosas hay tesoros...', '¡Cuida bien de tus Pokémon!']));
      }
    }
    // ---- entrenar contra salvajes cercanos
    const busy = t.roster.some(s => s.ent?.alive && s.ent.target instanceof MonEntity && s.ent.target.alive && !s.ent.target.owner);
    if (!busy && Math.random() < 0.05) {
      let best: MonEntity | null = null, bd = 6;
      for (const w of this.g.monsNear(t.x, t.y, 6)) if (w.wild && !w.ai && w.alive && !w.boss && !w.privateTo && !w.capture && w.lvl <= t.lvl + 5 && !w.roamer) { const d = dist(w.x, w.y, t.x, t.y); if (d < bd) { bd = d; best = w; } }
      if (best) for (const s of t.roster) if (s.ent?.alive) s.ent.target = best;
    }
    if (busy) { this.walk(t, null, dt); return; }
    // ---- viajar
    if (!t.route.length && now >= t.goalAt) {
      t.goalAt = now + rnd(3000, 9000);
      const z = Math.random() < 0.7 ? this.g.zoneAt(t.x, t.y) : this.zoneFor(t.lvl);
      const goal = this.randomSpotIn(z.kind === 'wild' ? z : this.zoneFor(t.lvl), { x: t.x, y: t.y }, 28);
      if (goal) t.route = (findRoute(this.g.world, t, goal, false, 30000) || []).slice(1);
    }
    this.walk(t, null, dt);
  }

  private fleeFrom(t: AiTrainer, p: PlayerSession) {
    const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy) || 1;
    const goal = { x: t.x + dx / d * 14, y: t.y + dy / d * 14 };
    if (this.walkable(goal.x, goal.y)) t.route = (findRoute(this.g.world, t, goal, false, 12000) || []).slice(1);
  }

  private walk(t: AiTrainer, chase: Point | null, dt: number) {
    let tx: number, ty: number;
    if (chase) { tx = chase.x; ty = chase.y; t.route = []; }
    else if (t.route.length) { tx = t.route[0].x; ty = t.route[0].y; }
    else { t.moving = false; return; }
    const dx = tx - t.x, dy = ty - t.y, d = Math.hypot(dx, dy);
    if (d < 0.15) { if (!chase) t.route.shift(); t.moving = false; return; }
    const sp = Math.min(d, AI.SPEED * dt * (chase ? 1.2 : 1));
    const nx = t.x + dx / d * sp, ny = t.y + dy / d * sp;
    if (this.walkable(nx, ny)) { t.x = nx; t.y = ny; } else if (this.walkable(nx, t.y)) t.x = nx; else if (this.walkable(t.x, ny)) t.y = ny; else { t.route = []; t.moving = false; return; }
    t.moving = true;
    t.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : (dy < 0 ? 1 : 0);
  }

  /** Pokémon de un entrenador IA: le siguen y pelean contra su objetivo. */
  updateMon(m: MonEntity, dt: number) {
    const t = m.ai as AiTrainer;
    if (!this.trainers.includes(t)) { this.g.removeMon(m); return; }
    if (!m.alive) return;
    const now = this.g.now;
    let tgt = m.target;
    if (tgt && (tgt instanceof MonEntity ? !tgt.alive || dist(tgt.x, tgt.y, t.x, t.y) > 14 : tgt.hp <= 0 || tgt.closed)) { m.target = tgt = null; }
    if (tgt) {
      const move = m.special && now >= m.cdS && Math.random() < 0.4 ? m.special : m.basic;
      const d = dist(m.x, m.y, tgt.x, tgt.y);
      if (d > move.range * 0.9) this.g.step(m, tgt.x, tgt.y, 3.9, dt, true);
      else {
        if (Math.abs(tgt.x - m.x) > 0.1) m.facing = tgt.x > m.x ? 1 : -1;
        const ready = move === m.special ? now >= m.cdS : now >= m.cdB;
        if (ready && now - m.lastActAt > 500) this.g.doAttack(m, tgt, move, 1);
      }
      return;
    }
    const i = t.roster.findIndex(s => s.ent === m), ang = Math.PI / 2 + (i - 1) * 0.9;
    const fx = t.x + Math.cos(ang) * 1.6, fy = t.y + Math.sin(ang) * 1.2;
    const d = dist(m.x, m.y, fx, fy);
    if (d > 14) { m.x = fx; m.y = fy; return; }
    if (d > 0.6) this.g.step(m, fx, fy, d > 4 ? 5 : 3.1, dt, true);
    if (m.hp < m.maxHp && !t.foe) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.02 * dt);
  }

  // ------------------------------------------------------------------ mercaderes ambulantes
  private stockFor(z: ZoneDef) {
    const tier = z.lvl[1] < 14 ? 0 : z.lvl[1] < 28 ? 1 : 2, v = () => rnd(0.85, 1.15);
    const S = (item: string, price: number, qty: number) => ({ item, price: Math.round(price * v() / 10) * 10, qty });
    const pool = [
      [S('superball', 110, 6), S('pocion', 70, 4), S('revivir', 280, 1), S('incienso', 900, 1), S('caramelo_raro', 2400, 1)],
      [S('ultraball', 320, 6), S('superpocion', 210, 3), S('revivir', 260, 2), S(pick(['piedra_fuego', 'piedra_agua', 'piedra_trueno', 'piedra_hoja', 'piedra_lunar']), 1100, 1), S('caramelo_raro', 2200, 2)],
      [S('ultraball', 290, 10), S('revivir', 240, 3), S('caramelo_raro', 2000, 3), S('cable_link', 6000, 1), S('masterball', 60000, 1)],
    ][tier];
    return pool.filter(s => ITEMS[s.item]);
  }
  spawnMerchant() {
    const online = [...this.g.players.values()].filter(p => !p.closed);
    const ref = online.length ? pick(online) : null;
    const z0 = ref ? this.g.zoneAt(ref.x, ref.y) : null;
    const z = z0 && z0.kind === 'wild' ? z0 : pick(this.wildZones);
    const at = this.randomSpotIn(z, ref && z0?.kind === 'wild' ? { x: ref.x, y: ref.y } : undefined, 30) || this.randomSpotIn(z);
    if (!at) return;
    const mz = this.g.zoneAt(at.x, at.y);
    const mc: Merchant = { id: this.nextId++, name: pick(['Mercader Zoe', 'Buhonero Tico', 'Comerciante Rai', 'Viajera Lúa']), x: at.x, y: at.y, zone: mz.id, until: this.g.now + MERCHANT.LIFE, stock: this.stockFor(mz) };
    this.merchants.set(mc.id, mc);
    for (const p of online) p.send({ t: 'merchant', x: mc.x, y: mc.y, name: mc.name, zone: mz.name, mins: Math.round(MERCHANT.LIFE / 60000) });
  }
  buy(p: PlayerSession, id: number, item: string) {
    const mc = this.merchants.get(id);
    if (!mc || this.g.now > mc.until) return this.g.notify(p, 'El mercader ya se ha ido.', 'bad');
    if (dist(p.x, p.y, mc.x, mc.y) > 3.5) return this.g.notify(p, 'Acércate al mercader para comprar.', 'bad');
    const s = mc.stock.find(x => x.item === item);
    if (!s || s.qty <= 0) return this.g.notify(p, 'Ese objeto se ha agotado.', 'bad');
    if (p.save.money < s.price) return this.g.notify(p, 'No tienes suficiente dinero.', 'bad');
    p.save.money -= s.price; s.qty--; p.save.items[item] = (p.save.items[item] || 0) + 1; p.dirtyCore = true;
    this.g.notify(p, `🛒 Has comprado ${ITEMS[item].name} por ${s.price} ₽.${s.qty ? '' : ' ¡Era el último!'}`, 'good');
    p.send({ t: 'mstock', id, stock: mc.stock });
  }

  // ------------------------------------------------------------------ cuevas misteriosas
  spawnCave() {
    const online = [...this.g.players.values()].filter(p => !p.closed && p.hp > 0);
    if (!online.length) return;
    const ref = pick(online), z0 = this.g.zoneAt(ref.x, ref.y);
    const z = z0.kind === 'wild' ? z0 : this.zoneFor(ref.save.tlvl);
    const at = this.randomSpotIn(z, z0.kind === 'wild' ? { x: ref.x, y: ref.y } : undefined, 26) || this.randomSpotIn(z);
    if (!at) return;
    const di = Math.floor(Math.random() * DUNGEON_DEFS.length), lvl = Math.max(z.lvl[1] + 4, Math.round(ref.save.tlvl * 0.9));
    const cv: MysteryCave = { id: this.nextId++, x: at.x, y: at.y, until: this.g.now + CAVE.LIFE, dungeon: di, boss: null, cleared: false, lvl };
    this.caves.set(cv.id, cv);
    for (const p of online) p.send({ t: 'cave', x: cv.x, y: cv.y, zone: this.g.zoneAt(cv.x, cv.y).name, mins: Math.round(CAVE.LIFE / 60000) });
  }
  enterCave(p: PlayerSession, id: number) {
    const cv = this.caves.get(id);
    if (!cv || this.g.now > cv.until) return this.g.notify(p, 'La entrada se ha derrumbado.', 'bad');
    if (dist(p.x, p.y, cv.x, cv.y) > 2.6) return;
    if (this.g.now < p.combatUntil) return this.g.notify(p, 'No puedes entrar en mitad de un combate.', 'bad');
    const d = DUNGEON_DEFS[cv.dungeon];
    if (!cv.boss && !cv.cleared) {
      // el guardián espera en lo más hondo, lejos de la entrada
      let spot: Point | null = null;
      for (let i = 0; i < 400 && !spot; i++) {
        const x = d.x + 3 + Math.random() * (d.w - 6), y = d.y + 3 + Math.random() * (d.h - 6);
        if (!playerBlocked(this.g.world, x, y) && dist(x, y, d.ent.x, d.ent.y) > Math.min(d.w, d.h) * 0.45) spot = { x, y };
      }
      spot ||= { x: d.boss.x + 0.5, y: d.boss.y + 2.5 };
      const pool = ['gyarados', 'snorlax', 'dragonite', 'gengar', 'machamp', 'golem', 'arcanine', 'lapras', 'alakazam', 'tyranitar', 'aerodactyl'].filter(k => SPECIES[k]);
      const boss = this.g.spawnWild(pick(pool), cv.lvl, spot.x, spot.y, { alpha: true, rare: true, zone: d.zone });
      boss.hpMult *= 1.8; boss.recalc(true); boss.caveId = cv.id; boss.aggro = true;
      for (let i = 0; i < 4; i++) { const mm = this.g.spawnWild(pick(pool), Math.max(3, cv.lvl - 6), spot.x + rnd(-3, 3), spot.y + rnd(-3, 3), { zone: d.zone }); mm.aggro = true; }
      cv.boss = boss;
    }
    this.g.teleport(p, d.ent.x + 0.5, d.ent.y - 1.5);
    this.g.notify(p, cv.cleared ? 'La cueva ya está en calma: su guardián fue derrotado.' : `🕳 Has entrado en una cueva misteriosa (${d.name}). En lo más hondo espera un guardián de Nv.${cv.lvl}: derrótalo para llevarte su tesoro.`, 'info');
    if (cv.boss) p.send({ t: 'cavegoal', x: cv.boss.x, y: cv.boss.y });
  }
  onCaveBoss(m: MonEntity) {
    const cv = this.caves.get(m.caveId); if (!cv) return;
    cv.cleared = true; cv.boss = null;
    for (const [pid, dmg] of m.dmgBy) {
      const p = this.g.players.get(pid); if (!p || dmg <= 0) continue;
      const money = 120 * cv.lvl, crys = 3 + Math.floor(cv.lvl / 10);
      p.save.money += money; p.save.crystals += crys;
      const loot: string[] = [`${money} ₽`, `${crys} cristales`];
      const add = (k: string, n: number) => { if (!ITEMS[k]) return; p.save.items[k] = (p.save.items[k] || 0) + n; loot.push(`${ITEMS[k].name} ×${n}`); };
      add('ultraball', 3); add('revivir', 2);
      if (Math.random() < 0.5) add('caramelo_raro', 1);
      if (Math.random() < 0.06) add('masterball', 1);
      p.dirtyCore = true;
      this.g.giveTrainerXp(p, cv.lvl * 40);
      this.g.notify(p, '💎 ¡Guardián de la cueva derrotado! Tesoro: ' + loot.join(', ') + '.', 'good');
    }
  }

  // ------------------------------------------------------------------ bucle
  update(dt: number) {
    const now = this.g.now;
    const anyone = this.g.players.size > 0;
    if (anyone && this.trainers.length < AI.COUNT && Math.random() < 0.02) this.spawnTrainer();
    for (const t of this.trainers) this.updateTrainer(t, dt);
    for (const [id, mc] of this.merchants) if (now > mc.until) this.merchants.delete(id);
    for (const [id, cv] of this.caves) if (now > cv.until && !cv.boss?.alive) { this.caves.delete(id); if (cv.boss) this.g.removeMon(cv.boss); }
    if (anyone && now >= this.nextMerchantAt) { this.nextMerchantAt = now + rnd(MERCHANT.EVERY[0], MERCHANT.EVERY[1]); if (this.merchants.size < MERCHANT.MAX) this.spawnMerchant(); }
    if (anyone && now >= this.nextCaveAt) { this.nextCaveAt = now + rnd(CAVE.EVERY[0], CAVE.EVERY[1]); if (this.caves.size < 1) this.spawnCave(); }
  }

  /** Datos para la instantánea de un jugador. */
  snapshot(p: PlayerSession, VR: number, VRY: number) {
    const now = this.g.now, near = (x: number, y: number) => Math.abs(x - p.x) < VR + 2 && Math.abs(y - p.y) < VRY + 3;
    const r2 = (v: number) => Math.round(v * 100) / 100;
    const ai = this.trainers.filter(t => near(t.x, t.y)).map(t => [t.id, r2(t.x), r2(t.y), t.dir, t.moving ? 1 : 0, t.name, t.lvl, MOODS.indexOf(t.mood), t.look, now < t.sayUntil ? t.say : '', t.foe === p ? 1 : 0]);
    const mc = [...this.merchants.values()].filter(m => near(m.x, m.y)).map(m => [m.id, m.x, m.y, m.name, Math.max(0, m.until - now), m.stock]);
    const cv = [...this.caves.values()].filter(c => near(c.x, c.y)).map(c => [c.id, c.x, c.y, Math.max(0, c.until - now), c.cleared ? 1 : 0, c.lvl]);
    return { ai, mc, cv };
  }
}
