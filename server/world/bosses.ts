// Jefes de mundo: patrones de ataque telegrafiados, escalado cooperativo, recompensas y captura tras la derrota.
import { STATUS, dist } from '../../shared/constants';
import { SPECIES, speciesBaseExp } from '../../shared/species';
import { killXp } from '../../shared/balance';
import { rollShiny } from '../../shared/encounters';
import { ENV } from '../env';
import { ZONES } from '../../shared/zones';
import { TYPE_NAMES } from '../../shared/types';
import type { Game } from './game';
import { MonEntity, PlayerSession } from './entities';

export interface BossDef { name: string; lvl: number; hpMult: number; respawn: number; abilities: string[]; enrage: string[]; minions: string[]; leash: number; }

export const BOSSES: Record<string, BossDef> = {
  snorlax: { name: 'Snorlax Dormilón', lvl: 20, hpMult: 16, respawn: 5 * 60000, abilities: ['slam', 'yawn', 'slam', 'rest'], enrage: ['slam', 'yawn'], minions: [], leash: 8 },
  gyarados: { name: 'Gyarados Enfurecido', lvl: 26, hpMult: 16, respawn: 6 * 60000, abilities: ['hydro', 'whirl', 'hydro', 'summon'], enrage: ['dragonrage', 'hydro'], minions: ['magikarp'], leash: 7 },
  onix: { name: 'Onix Colosal', lvl: 27, hpMult: 16, respawn: 6 * 60000, abilities: ['rockslide', 'dig', 'sandtomb', 'summon'], enrage: ['rockslide', 'dig'], minions: ['geodude'], leash: 8 },
  arcanine: { name: 'Arcanine Ígneo', lvl: 35, hpMult: 17, respawn: 7 * 60000, abilities: ['flame', 'firespin', 'extremespeed', 'summon'], enrage: ['extremespeed', 'flame', 'firespin'], minions: ['growlithe', 'vulpix'], leash: 9 },
  gengar: { name: 'Gengar Sombrío', lvl: 37, hpMult: 17, respawn: 7 * 60000, abilities: ['shadowrain', 'curse', 'teleport', 'summon'], enrage: ['shadowrain', 'curse', 'teleport'], minions: ['gastly', 'haunter'], leash: 9 },
  dragonite: { name: 'Dragonite Salvaje', lvl: 47, hpMult: 19, respawn: 8 * 60000, abilities: ['hyperbeam', 'outrage', 'hurricane', 'summon'], enrage: ['outrage', 'hyperbeam', 'hurricane'], minions: ['dratini', 'dragonair'], leash: 9 },
  mewtwo: { name: 'Mewtwo', lvl: 62, hpMult: 24, respawn: 10 * 60000, abilities: ['psystrike', 'psychic', 'barrier', 'futuresight'], enrage: ['psystrike', 'futuresight', 'psychic'], minions: [], leash: 10 },
  // aves legendarias: solo aparecen como evento mundial temporal
  articuno: { name: 'Articuno Legendario', lvl: 50, hpMult: 20, respawn: 0, abilities: ['blizzard', 'icebeam', 'hurricane', 'icebeam'], enrage: ['blizzard', 'icebeam'], minions: [], leash: 9 },
  zapdos: { name: 'Zapdos Legendario', lvl: 45, hpMult: 20, respawn: 0, abilities: ['thunderstorm', 'discharge', 'thunderstorm', 'hurricane'], enrage: ['thunderstorm', 'discharge'], minions: [], leash: 9 },
  moltres: { name: 'Moltres Legendario', lvl: 48, hpMult: 20, respawn: 0, abilities: ['firespin', 'heatwave', 'flame', 'firespin'], enrage: ['heatwave', 'flame'], minions: [], leash: 9 },
};

interface Spot { key: string; x: number; y: number; zone: number; entity: MonEntity | null; respawnAt: number; until?: number; }

export class BossManager {
  spots: Spot[];
  temps: Spot[] = [];
  infoAt = 0;
  constructor(private g: Game) {
    this.spots = g.world.bosses.map(b => ({ ...b, entity: null, respawnAt: Date.now() + 2000 }));
  }

  info() {
    const now = this.g.now;
    const row = (s: Spot, i: number) => ({
      i, key: s.key, name: BOSSES[s.key].name, lvl: BOSSES[s.key].lvl, x: s.x, y: s.y, zone: s.zone,
      alive: !!(s.entity && !s.entity.fainted), hp: s.entity ? Math.round(s.entity.hp / s.entity.maxHp * 100) : 0,
      respawn: s.entity ? 0 : Math.max(0, s.respawnAt - now), id: s.entity ? s.entity.id : 0, temp: i < 0,
    });
    return [...this.spots.map(row), ...this.temps.filter(t => t.entity).map(t => row(t, -1))];
  }

  update(_dt: number) {
    const now = this.g.now;
    this.spots.forEach((s, i) => {
      if (s.entity && !this.g.mons.has(s.entity.id)) { s.entity = null; s.respawnAt = now + BOSSES[s.key].respawn; }
      if (!s.entity && now >= s.respawnAt) this.spawn(s, i);
    });
    for (const t of this.temps) {
      if (t.entity && !this.g.mons.has(t.entity.id)) t.entity = null;
      else if (t.entity && now > (t.until || 0) && !t.entity.fainted) {
        this.g.emit(t.entity.x, t.entity.y, ['tp', -t.entity.id, t.entity.x, t.entity.y]);
        this.g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `${BOSSES[t.key].name} se ha marchado volando...` });
        this.g.removeMon(t.entity); t.entity = null;
      }
    }
    this.temps = this.temps.filter(t => t.entity);
    if (now >= this.infoAt) { this.infoAt = now + 3000; this.g.broadcast({ t: 'bosses', list: this.info() }); }
  }

  /** Jefe temporal (aves legendarias de los eventos). */
  spawnTemp(key: string, x: number, y: number, zone: number, durMs: number): MonEntity {
    const s: Spot = { key, x: Math.floor(x), y: Math.floor(y), zone, entity: null, respawnAt: 0, until: this.g.now + durMs };
    this.temps.push(s);
    this.spawn(s, -1);
    return s.entity!;
  }

  spawn(s: Spot, i: number) {
    const def = BOSSES[s.key];
    const m = new MonEntity(this.g.nextId++, s.key, def.lvl, s.x + 0.5, s.y + 0.5, rollShiny(s.key, 1, ENV.SHINY_RATE), [15, 15, 15, 15]);
    m.hpMult = def.hpMult; m.recalc(true);
    m.zone = s.zone;
    m.boss = {
      key: s.key, name: def.name, spotIndex: i, nextAbility: 0, abilityIdx: 0, enraged: false, barrierUntil: 0, restUntil: 0, restDmg: 0,
      staggerUntil: 0, lastRest: 0, scaleCheck: 0, players: 1, baseMax: m.maxHp, engaged: false, minionsAt: 0, hidden: false, abilities: def.abilities,
    };
    this.g.mons.set(m.id, m);
    s.entity = m;
    if (this.g.tickN > 100) this.g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `¡${def.name} (Nv. ${def.lvl}) ha aparecido en ${ZONES[s.zone].name}!` });
    this.g.emit(m.x, m.y, ['bsp', m.id]);
  }

  damageTakenMult(m: MonEntity) {
    const b = m.boss!; const now = this.g.now;
    if (now < b.barrierUntil) return 0.3;
    if (now < b.staggerUntil) return 1.35;
    return 1;
  }

  onDamaged(m: MonEntity, dmg: number) {
    const b = m.boss!; const now = this.g.now;
    b.engaged = true;
    if (now < b.restUntil) {
      b.restDmg += dmg;
      if (b.restDmg >= m.maxHp * 0.07) {
        b.restUntil = 0; b.staggerUntil = now + 5000; m.status = 0;
        this.g.emit(m.x, m.y, ['bs', m.id, 'stagger']);
        this.g.emit(m.x, m.y, ['s', m.id, 0]);
      }
    }
  }

  /** IA del jefe (llamada desde updateWild). */
  think(m: MonEntity, dt: number) {
    const g = this.g, b = m.boss!, now = g.now, def = BOSSES[b.key];
    // escalado por jugadores cercanos
    if (now >= b.scaleCheck) {
      b.scaleCheck = now + 3000;
      const n = Math.max(1, g.playersNear(m.x, m.y, 22).length);
      const desired = Math.round(b.baseMax * (1 + 0.6 * (n - 1)));
      if (desired > m.maxHp) { const frac = m.hp / m.maxHp; m.maxHp = desired; m.hp = Math.round(desired * frac); }
      b.players = n;
      // reinicio si no hay nadie
      if (g.playersNear(m.x, m.y, 24).length === 0) {
        if (b.engaged && now - m.lastHurtAt > 12000) {
          b.engaged = false; m.hp = m.maxHp; m.dmgBy.clear(); b.enraged = false; m.x = m.homeX; m.y = m.homeY; b.hidden = false;
        }
        return;
      }
    }
    if (b.hidden) return;
    // descanso (Snorlax)
    if (now < b.restUntil) { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.025 * dt); return; }
    if (m.status === STATUS.SLEEP || m.status === STATUS.FREEZE) return;
    if (!b.enraged && m.hp < m.maxHp * 0.3) {
      b.enraged = true; b.nextAbility = now + 500;
      g.emit(m.x, m.y, ['bs', m.id, 'enrage']);
    }
    // objetivo
    const players = g.playersNear(m.x, m.y, 16).filter(p => p.hp > 0);
    if (!players.length) { if (dist(m.x, m.y, m.homeX, m.homeY) > 0.5) g.step(m, m.homeX, m.homeY, 2.5, dt, m.habitat !== 'water'); return; }
    b.engaged = true;
    if (now >= m.targetEvalAt || !m.target || (m.target instanceof MonEntity && !m.target.alive)) {
      m.targetEvalAt = now + 1500;
      const cands: (MonEntity | PlayerSession)[] = [];
      for (const p of players) { cands.push(p); for (const t of p.team) if (t.alive) cands.push(t); }
      cands.sort((a, c) => dist(a.x, a.y, m.x, m.y) - dist(c.x, c.y, m.x, m.y));
      m.target = cands[0] || null;
    }
    const t = m.target;
    if (t) {
      const d = dist(m.x, m.y, t.x, t.y);
      const move = m.basic;
      const reach = move.range + 1.2;
      if (d > reach && dist(m.x, m.y, m.homeX, m.homeY) < def.leash) g.step(m, t.x, t.y, 2.6, dt, m.habitat === 'water');
      else if (d <= reach + 0.5 && now >= m.cdB) g.doAttack(m, t, move, 1);
      if (Math.abs(t.x - m.x) > 0.2) m.facing = t.x > m.x ? 1 : -1;
    }
    // habilidades
    if (!b.nextAbility) b.nextAbility = now + 2500;
    if (now >= b.nextAbility) {
      const list = b.enraged ? def.enrage : def.abilities;
      const id = list[b.abilityIdx % list.length];
      b.abilityIdx++;
      this.cast(m, id, players);
      b.nextAbility = now + (b.enraged ? 2800 : 4200) + Math.random() * 900;
    }
  }

  cast(m: MonEntity, id: string, players: PlayerSession[]) {
    const g = this.g, b = m.boss!, now = g.now;
    const rp = () => players[Math.floor(Math.random() * players.length)];
    const circle = (x: number, y: number, r: number, wind: number, dmg: number, mon: number, fx: string, status?: number) =>
      g.addTelegraph({ shape: 'circle', x, y, r, r2: 0, x2: 0, y2: 0, w: 0, at: now + wind, dmgPct: dmg, monPct: mon, status, boss: m, fx });
    const ring = (r: number, r2: number, wind: number, dmg: number, mon: number, fx: string, status?: number) =>
      g.addTelegraph({ shape: 'ring', x: m.x, y: m.y, r, r2, x2: 0, y2: 0, w: 0, at: now + wind, dmgPct: dmg, monPct: mon, status, boss: m, fx });
    const line = (ang: number, len: number, w: number, wind: number, dmg: number, mon: number, fx: string, status?: number) =>
      g.addTelegraph({ shape: 'line', x: m.x, y: m.y, r: 0, r2: 0, x2: m.x + Math.cos(ang) * len, y2: m.y + Math.sin(ang) * len, w, at: now + wind, dmgPct: dmg, monPct: mon, status, boss: m, fx });
    const angTo = (p: { x: number; y: number }) => Math.atan2(p.y - m.y, p.x - m.x);
    g.emit(m.x, m.y, ['bs', m.id, id]);
    switch (id) {
      case 'slam': { const p = rp(); circle(p.x, p.y, 2.6, 1400, 0.38, 0.35, 'slam', STATUS.PARALYZE); break; }
      case 'yawn': ring(1.6, 5.2, 1800, 0.12, 0.12, 'yawn', STATUS.SLEEP); break;
      case 'rest':
        if (m.hp < m.maxHp * 0.65 && now - b.lastRest > 40000) {
          b.lastRest = now; b.restUntil = now + 5000; b.restDmg = 0; m.status = STATUS.SLEEP; m.statusUntil = now + 5000;
          g.emit(m.x, m.y, ['s', m.id, STATUS.SLEEP]);
        } else { const p = rp(); circle(p.x, p.y, 2.6, 1300, 0.38, 0.35, 'slam'); }
        break;
      case 'hydro': { const p = rp(); line(angTo(p), 13, 1.9, 1200, 0.42, 0.4, 'hydro'); break; }
      case 'whirl': for (const p of players.slice(0, 4)) circle(p.x, p.y, 2.2, 1500, 0.3, 0.3, 'whirl'); break;
      case 'dragonrage': for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, r = 2 + Math.random() * 5; circle(m.x + Math.cos(a) * r, m.y + Math.sin(a) * r, 1.6, 1300 + i * 120, 0.3, 0.3, 'dragon'); } break;
      case 'flame': { const p = rp(); line(angTo(p), 9.5, 2.3, 1100, 0.38, 0.38, 'flame', STATUS.BURN); break; }
      case 'firespin': for (const p of players.slice(0, 4)) circle(p.x, p.y, 1.9, 1300, 0.3, 0.3, 'fire', STATUS.BURN); break;
      case 'extremespeed': {
        const p = rp(); const a = angTo(p);
        m.x = p.x - Math.cos(a) * 1.5; m.y = p.y - Math.sin(a) * 1.5;
        g.emit(m.x, m.y, ['tp', -m.id, m.x, m.y]);
        circle(m.x, m.y, 2.8, 900, 0.32, 0.32, 'fire');
        break;
      }
      case 'hyperbeam': { const p = rp(); line(angTo(p), 15, 2.5, 1700, 0.65, 0.6, 'hyperbeam'); break; }
      case 'outrage': { const p = rp(); const a = angTo(p); for (let i = 0; i < 3; i++) circle(m.x + Math.cos(a) * (2 + i * 2.6), m.y + Math.sin(a) * (2 + i * 2.6), 2.4, 1000 + i * 450, 0.32, 0.3, 'dragon'); break; }
      case 'hurricane': ring(2.6, 7.5, 1600, 0.33, 0.3, 'wind'); break;
      case 'rockslide': for (let i = 0; i < 7; i++) { const p = rp(); circle(p.x + (Math.random() - 0.5) * 6, p.y + (Math.random() - 0.5) * 6, 1.5, 1300 + i * 100, 0.28, 0.28, 'rock'); } break;
      case 'dig': {
        const p = rp();
        b.hidden = true; m.invulnUntil = now + 1700;
        const tg = circle(p.x, p.y, 2.6, 1600, 0.4, 0.38, 'dig');
        setTimeout(() => { if (!m.boss) return; m.x = tg.x; m.y = tg.y; b.hidden = false; }, 1600);
        break;
      }
      case 'sandtomb': circle(m.x, m.y, 3.8, 1400, 0.3, 0.3, 'rock'); break;
      case 'shadowrain': { for (const p of players.slice(0, 4)) circle(p.x, p.y, 1.9, 1200, 0.32, 0.3, 'shadow'); for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28; circle(m.x + Math.cos(a) * 4, m.y + Math.sin(a) * 4, 1.8, 1400, 0.3, 0.3, 'shadow'); } break; }
      case 'curse': ring(2.2, 6.6, 1500, 0.33, 0.3, 'shadow'); break;
      case 'teleport': {
        for (let k = 0; k < 8; k++) {
          const x = m.homeX + (Math.random() - 0.5) * 10, y = m.homeY + (Math.random() - 0.5) * 10;
          if (g.walkable(x, y, 'land')) { g.emit(m.x, m.y, ['tp', -m.id, m.x, m.y]); m.x = x; m.y = y; break; }
        }
        const p = rp(); circle(p.x, p.y, 2, 1100, 0.3, 0.3, 'shadow');
        break;
      }
      case 'psystrike': { const p = rp(); const a = angTo(p); for (const off of [-0.6, 0, 0.6]) line(a + off, 14, 1.7, 1500, 0.42, 0.4, 'psy'); break; }
      case 'psychic': { const p = rp(); circle(p.x, p.y, 3.3, 1600, 0.5, 0.45, 'psy'); break; }
      case 'barrier': b.barrierUntil = now + 5000; { const p = rp(); circle(p.x, p.y, 2.4, 1400, 0.35, 0.3, 'psy'); } break;
      case 'futuresight': for (let i = 0; i < 6; i++) { const p = rp(); circle(p.x + (Math.random() - 0.5) * 4, p.y + (Math.random() - 0.5) * 4, 1.9, 2400 + i * 150, 0.38, 0.35, 'psy'); } break;
      case 'summon': {
        const def = BOSSES[b.key];
        if (!def.minions.length || now < b.minionsAt) { const p = rp(); circle(p.x, p.y, 2.2, 1300, 0.3, 0.3, 'slam'); break; }
        b.minionsAt = now + 20000;
        const n = 2 + Math.min(3, b.players);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.28;
          let x = m.x + Math.cos(a) * 2.5, y = m.y + Math.sin(a) * 2.5;
          const key = def.minions[i % def.minions.length];
          const hab = SPECIES[key].habitat;
          if (!g.walkable(x, y, hab)) { x = m.x; y = m.y; }
          const mi = g.spawnWild(key, def.lvl - 6, x, y, { zone: m.zone });
          mi.target = rp(); mi.state = 'chase'; mi.homeX = m.homeX; mi.homeY = m.homeY;
        }
        break;
      }
    }
  }

  onDefeated(m: MonEntity) {
    const g = this.g, b = m.boss!, def = BOSSES[b.key], now = g.now;
    b.restUntil = 0; b.hidden = false;
    m.exhaustedUntil = now + 25000;
    g.telegraphs = g.telegraphs.filter(t => t.boss !== m);
    const rec = new Set<PlayerSession>();
    for (const [pid, d] of m.dmgBy) { const p = g.players.get(pid); if (p && d >= m.maxHp * 0.01) rec.add(p); }
    for (const p of [...rec]) if (p.party) for (const mem of p.party.members) if (dist(mem.x, mem.y, m.x, m.y) < 30) rec.add(mem);
    const names: string[] = [];
    for (const p of rec) {
      const lines: string[] = [];
      const money = 250 + def.lvl * 45; p.save.money += money; lines.push(`${money} ₽`);
      const cr = 3 + Math.floor(def.lvl / 8); p.save.crystals += cr; lines.push(`${cr} Cristales Rush`);
      const tk = 1 + Math.floor(def.lvl / 20); p.save.tokens += tk; lines.push(`${tk} Fragmentos de Jefe`);
      for (const t of m.sp.types) { p.save.ess[t] = (p.save.ess[t] || 0) + 10; lines.push(`Esencia ${TYPE_NAMES[t]} x10`); }
      const items = p.save.items;
      if (Math.random() < 0.3) { const st = ['piedra_fuego', 'piedra_agua', 'piedra_trueno', 'piedra_hoja', 'piedra_lunar'][Math.floor(Math.random() * 5)]; items[st] = (items[st] || 0) + 1; lines.push('¡Una piedra evolutiva!'); }
      if (Math.random() < (b.key === 'mewtwo' ? 0.25 : 0.04)) { items.masterball = (items.masterball || 0) + 1; lines.push('¡¡MASTER BALL!!'); }
      items.ultraball = (items.ultraball || 0) + 2; lines.push('Ultra Ball x2');
      const xp = Math.round(killXp(speciesBaseExp(m.sp), def.lvl) * 25);
      for (const tm of p.team) g.giveMonXp(p, tm, Math.round(xp * 0.7));
      g.giveTrainerXp(p, 150 + def.lvl * 25);
      p.save.stats.bosses++;
      p.dirtyCore = true;
      p.send({ t: 'boss_win', name: def.name, lines, captureFor: 25000, id: m.id });
      names.push(p.name);
    }
    g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `¡${def.name} ha sido derrotado por ${names.join(', ') || 'alguien'}! Está agotado: 25 s para intentar capturarlo.` });
    g.emit(m.x, m.y, ['bd', m.id]);
  }
}

