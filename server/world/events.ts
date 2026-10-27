// Eventos mundiales dinámicos: invasiones, raros, tormentas, EXP doble, portales y alfas.
import { dist } from '../../shared/constants';
import { SPECIES, SPECIES_LIST } from '../../shared/species';
import { pickEncounter, rollShiny } from '../../shared/encounters';
import { ENV } from '../env';
import { ZONES, ZONE } from '../../shared/zones';
import { TYPE_NAMES, PType } from '../../shared/types';
import type { Game } from './game';
import { MonEntity, PlayerSession } from './entities';

export interface WEvent {
  id: number; kind: string; name: string; desc: string; zone: number; x: number; y: number;
  start: number; end: number; type?: PType; species?: string;
  mons: Set<number>; participants: Set<number>; wave: number; waves: number; done: boolean; level: number;
}

const STORM_TYPE: Record<number, PType> = {
  [ZONE.VOLCAN]: 'fire', [ZONE.VOLTIO]: 'electric', [ZONE.LAGO]: 'water', [ZONE.COSTA]: 'water', [ZONE.BOSQUE]: 'grass',
  [ZONE.CEMENTERIO]: 'ghost', [ZONE.MONTES]: 'rock', [ZONE.PICOS]: 'dragon', [ZONE.PANTANO]: 'poison', [ZONE.PRADERA]: 'normal',
  [ZONE.RUTA1]: 'flying', [ZONE.CUEVA_LUNA]: 'rock', [ZONE.TORRE]: 'ghost', [ZONE.CUEVA_CELESTE]: 'psychic',
};
const RARES = ['eevee', 'dratini', 'snorlax', 'pikachu', 'abra', 'vulpix', 'growlithe', 'bulbasaur', 'charmander', 'squirtle', 'lapras', 'jigglypuff'];

export class EventManager {
  active: WEvent[] = [];
  nextAt = Date.now() + 75000;
  nextId = 1;
  checkAt = 0;

  constructor(private g: Game) {}

  list() { return this.active.map(e => this.pub(e)); }
  pub(e: WEvent) { return { id: e.id, kind: e.kind, name: e.name, desc: e.desc, zone: e.zone, x: e.x, y: e.y, end: e.end, type: e.type, left: e.mons.size, wave: e.wave, waves: e.waves }; }

  update() {
    const g = this.g, now = g.now;
    if (now < this.checkAt) return;
    this.checkAt = now + 1000;
    for (const e of this.active) {
      if (e.done) continue;
      // participantes presentes en la zona
      if (e.kind === 'storm' || e.kind === 'xp') {
        for (const p of g.players.values()) if (e.kind === 'xp' || p.zone === e.zone) e.participants.add(p.id);
      }
      for (const id of [...e.mons]) { const m = g.mons.get(id); if (!m || m.fainted) e.mons.delete(id); }
      if (e.kind === 'rare' && e.mons.size === 0 && now - e.start > 3000) { this.finish(e, true); continue; }
      if (now >= e.end) this.finish(e, e.kind === 'storm' || e.kind === 'xp');
    }
    this.active = this.active.filter(e => !e.done);
    if (now >= this.nextAt && g.players.size > 0) {
      this.nextAt = now + (180 + Math.random() * 150) * 1000;
      this.startRandom();
    }
  }

  startRandom() {
    const kinds = ['invasion', 'rare', 'storm', 'xp', 'portal', 'alpha', 'invasion', 'rare', 'portal'];
    for (let tries = 0; tries < 6; tries++) {
      const k = kinds[Math.floor(Math.random() * kinds.length)];
      if (this.start(k)) return;
    }
  }

  pickPlayer(): PlayerSession | null {
    const ps = [...this.g.players.values()].filter(p => { const z = ZONES[p.zone]; return z && (z.kind === 'wild' || z.kind === 'dungeon') && p.hp > 0; });
    return ps.length ? ps[Math.floor(Math.random() * ps.length)] : null;
  }

  spotNear(p: PlayerSession, rMin: number, rMax: number): { x: number; y: number } | null {
    const g = this.g;
    for (let k = 0; k < 40; k++) {
      const a = Math.random() * 6.28, r = rMin + Math.random() * (rMax - rMin);
      const x = Math.floor(p.x + Math.cos(a) * r) + 0.5, y = Math.floor(p.y + Math.sin(a) * r) + 0.5;
      const tx = Math.floor(x), ty = Math.floor(y);
      if (tx < 0 || ty < 0 || tx >= g.world.w || ty >= g.world.h) continue;
      const i = ty * g.world.w + tx;
      if (g.world.solid[i] !== 0 || !g.world.reach[i]) continue;
      if (ZONES[g.world.zone[i]].kind === 'town') continue;
      return { x, y };
    }
    return null;
  }

  make(kind: string, name: string, desc: string, zone: number, x: number, y: number, dur: number, extra: Partial<WEvent> = {}): WEvent {
    const now = this.g.now;
    const e: WEvent = { id: this.nextId++, kind, name, desc, zone, x, y, start: now, end: now + dur, mons: new Set(), participants: new Set(), wave: 0, waves: 0, done: false, level: ZONES[zone].lvl[1], ...extra };
    this.active.push(e);
    return e;
  }

  start(kind: string): boolean {
    const g = this.g;
    if (kind === 'xp') {
      if (this.active.some(e => e.kind === 'xp')) return false;
      const e = this.make('xp', '¡EXP doble!', 'Toda la experiencia obtenida se duplica durante 3 minutos.', 0, 0, 0, 180000);
      g.xpBoostUntil = e.end;
      this.announce(e);
      return true;
    }
    const p = this.pickPlayer();
    if (!p) return false;
    const z = ZONES[p.zone];
    const lvl = z.lvl[1];
    if (kind === 'storm') {
      if (this.active.some(e => e.kind === 'storm')) return false;
      const type = STORM_TYPE[z.id] || 'normal';
      const e = this.make('storm', `Tormenta ${TYPE_NAMES[type]}`, `Los ataques de tipo ${TYPE_NAMES[type]} hacen +50% de daño en ${z.name}, aparecen más Pokémon de ese tipo y las esencias se duplican.`, z.id, p.x, p.y, 180000, { type });
      g.storm = { zone: z.id, type, until: e.end };
      this.announce(e);
      return true;
    }
    const spot = this.spotNear(p, 9, 15);
    if (!spot) return false;
    if (kind === 'invasion') {
      const zoneSp = [...new Set(z.spawns.map(s => s[0]))].filter(k => SPECIES[k].habitat !== 'water');
      if (!zoneSp.length) return false;
      const lead = zoneSp[Math.floor(Math.random() * zoneSp.length)];
      const type = SPECIES[lead].types[0];
      let pool = zoneSp.filter(k => SPECIES[k].types.includes(type));
      if (pool.length < 3) pool = pool.concat(SPECIES_LIST.filter(s => s.types.includes(type) && s.stage === 1 && (s.rarity === 'common' || s.rarity === 'uncommon') && s.habitat !== 'water').map(s => s.key));
      const e = this.make('invasion', `Invasión ${TYPE_NAMES[type]}`, `¡Una horda de Pokémon de tipo ${TYPE_NAMES[type]} invade ${z.name}! Derrótalos a todos, incluido su líder alfa.`, z.id, spot.x, spot.y, 240000, { type, level: lvl });
      const near = g.playersNear(spot.x, spot.y, 25).length;
      const n = Math.min(20, (z.lvl[1] < 10 ? 5 : 9) + near * (z.lvl[1] < 10 ? 2 : 3));
      for (let i = 0; i < n; i++) this.spawnFor(e, pool[Math.floor(Math.random() * pool.length)] || lead, z.lvl[0] + Math.floor(Math.random() * (z.lvl[1] - z.lvl[0] + 1)), 4);
      this.spawnFor(e, lead, z.lvl[1] + 3, 1, { alpha: true });
      this.announce(e);
      return true;
    }
    if (kind === 'rare') {
      let key = pickEncounter([...RARES, 'mew'].map(k => [k, 1] as const))!;
      if (SPECIES[key].habitat === 'water') key = 'eevee';
      const e = this.make('rare', `¡${SPECIES[key].name} raro!`, `Se ha avistado un ${SPECIES[key].name} especial en ${z.name}. ¡Brilla con más intensidad y es más probable que sea shiny!`, z.id, spot.x, spot.y, 180000, { species: key });
      const m = this.spawnFor(e, key, lvl + 3, 0, { rare: true, shiny: rollShiny(key, 2, ENV.SHINY_RATE) });
      m.homeX = spot.x; m.homeY = spot.y;
      this.announce(e);
      return true;
    }
    if (kind === 'portal') {
      const e = this.make('portal', 'Portal Dimensional', `Un portal se ha abierto en ${z.name}. Resiste 3 oleadas de Pokémon de otras regiones.`, z.id, spot.x, spot.y, 240000, { waves: 3, level: lvl + 2 });
      this.nextWave(e);
      this.announce(e);
      return true;
    }
    if (kind === 'alpha') {
      const table = z.spawns.filter(s => SPECIES[s[0]].habitat !== 'water');
      if (!table.length) return false;
      const key = table[Math.floor(Math.random() * table.length)][0];
      const e = this.make('alpha', `${SPECIES[key].name} Alfa`, `Un ${SPECIES[key].name} gigantesco domina ${z.name}. Es mucho más fuerte de lo normal.`, z.id, spot.x, spot.y, 240000, { species: key });
      const m = this.spawnFor(e, key, lvl + 8, 0, { alpha: true });
      m.hpMult = 9; m.recalc(true);
      this.announce(e);
      return true;
    }
    return false;
  }

  spawnFor(e: WEvent, key: string, lvl: number, spread: number, o: { alpha?: boolean; rare?: boolean; shiny?: boolean } = {}): MonEntity {
    const g = this.g;
    let x = e.x, y = e.y;
    for (let k = 0; k < 10 && spread > 0; k++) {
      const tx = e.x + (Math.random() - 0.5) * spread * 2, ty = e.y + (Math.random() - 0.5) * spread * 2;
      if (g.walkable(tx, ty, SPECIES[key].habitat === 'water' ? 'air' : SPECIES[key].habitat)) { x = tx; y = ty; break; }
    }
    const m = g.spawnWild(key, lvl, x, y, { zone: e.zone, alpha: o.alpha, rare: o.rare, shiny: o.shiny ?? rollShiny(key, 1, ENV.SHINY_RATE), eventId: e.kind === 'rare' ? 0 : e.id });
    if (SPECIES[key].habitat === 'water') m.habitat = 'air';
    e.mons.add(m.id);
    if (e.kind === 'rare') m.eventId = 0;
    return m;
  }

  nextWave(e: WEvent) {
    e.wave++;
    const z = ZONES[e.zone];
    const pool = SPECIES_LIST.filter(s => s.rarity !== 'legendary' && s.habitat !== 'water' && (z.lvl[1] < 15 ? s.stage === 1 && s.rarity !== 'epic' : s.stage <= 2)).map(s => s.key);
    const n = (z.lvl[1] < 10 ? 3 : 5) + Math.min(8, this.g.playersNear(e.x, e.y, 25).length * 2) + e.wave;
    for (let i = 0; i < n; i++) this.spawnFor(e, pool[Math.floor(Math.random() * pool.length)], z.lvl[0] + e.wave * 2 + Math.floor(Math.random() * 3), 3);
    this.g.emit(e.x, e.y, ['x', 'portal', e.x, e.y]);
    this.g.broadcast({ t: 'wev_up', ev: this.pub(e) });
  }

  onMonKilled(m: MonEntity) {
    const e = this.active.find(ev => ev.id === m.eventId);
    if (!e || e.done) return;
    e.mons.delete(m.id);
    for (const pid of m.dmgBy.keys()) e.participants.add(pid);
    if (e.mons.size === 0) {
      if (e.kind === 'portal' && e.wave < e.waves) { this.nextWave(e); return; }
      this.finish(e, true);
    } else this.g.broadcast({ t: 'wev_up', ev: this.pub(e) });
  }

  /** Captura o derrota del Pokémon raro. */
  onRareResolved(m: MonEntity, by: PlayerSession | null) {
    for (const e of this.active) {
      if (e.kind !== 'rare' || !e.mons.has(m.id)) continue;
      if (by) e.participants.add(by.id);
      for (const pid of m.dmgBy.keys()) e.participants.add(pid);
      e.mons.delete(m.id);
    }
  }

  finish(e: WEvent, success: boolean) {
    const g = this.g;
    if (e.done) return;
    e.done = true;
    for (const id of e.mons) { const m = g.mons.get(id); if (m && !m.fainted && e.kind !== 'rare') { g.emit(m.x, m.y, ['x', 'poof', m.x, m.y]); g.removeMon(m); } }
    if (e.kind === 'storm' && g.storm) g.storm = null;
    if (e.kind === 'rare') for (const id of e.mons) { const m = g.mons.get(id); if (m) for (const pid of m.dmgBy.keys()) e.participants.add(pid); }
    if (success) {
      for (const pid of e.participants) {
        const p = g.players.get(pid); if (!p) continue;
        const big = e.kind === 'portal' || e.kind === 'invasion' || e.kind === 'alpha';
        const cr = big ? 3 + Math.floor(e.level / 10) : 1 + Math.floor(e.level / 20);
        const money = (big ? 300 : 120) + e.level * (big ? 25 : 10);
        p.save.crystals += cr; p.save.money += money;
        if (big) { p.save.items.superball = (p.save.items.superball || 0) + 3; if (Math.random() < 0.25) p.save.items.caramelo_raro = (p.save.items.caramelo_raro || 0) + 1; }
        p.save.stats.events++;
        g.giveTrainerXp(p, 80 + e.level * 12);
        p.dirtyCore = true;
        p.send({ t: 'note', kind: 'good', text: `Evento "${e.name}" completado: +${cr} Cristales, +${money} ₽${big ? ', +3 Super Ball' : ''}.` });
      }
    }
    g.broadcast({ t: 'wev_end', id: e.id, success, name: e.name });
  }

  announce(e: WEvent) {
    this.g.broadcast({ t: 'wev', ev: this.pub(e) });
    this.g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `EVENTO: ${e.name}${e.zone ? ' en ' + ZONES[e.zone].name : ''}.` });
  }
}

export { dist };
