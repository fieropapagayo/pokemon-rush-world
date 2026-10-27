// Duelos PvP entre entrenadores: solicitud, cuenta atrás, arena y ranking Elo.
// Los equipos luchan solos con sus movimientos y tipos reales; el entrenador puede usar sus habilidades.
import { dist } from '../../shared/constants';
import type { Game } from './game';
import { PlayerSession } from './entities';

export interface Duel {
  id: number; a: PlayerSession; b: PlayerSession;
  cx: number; cy: number; r: number;
  goAt: number; end: number; state: 'countdown' | 'fight' | 'done';
}

export const DUEL = { RADIUS: 11, COUNTDOWN: 3500, TIME: 150000, DMG: 0.55, K: 32, REQ_MS: 45000, MAX_DIST: 18 };

export function eloExpected(a: number, b: number) { return 1 / (1 + Math.pow(10, (b - a) / 400)); }
export function eloDelta(winner: number, loser: number, k = DUEL.K) { return Math.max(4, Math.round(k * (1 - eloExpected(winner, loser)))); }

export class DuelManager {
  duels = new Map<number, Duel>();
  reqs = new Map<number, Map<number, number>>(); // destino → (origen → caducidad)
  nextId = 1;

  constructor(private g: Game) {}

  get(p: PlayerSession | null | undefined): Duel | null { return p && p.duelId ? this.duels.get(p.duelId) || null : null; }
  /** ¿Están estos dos entrenadores luchando entre sí ahora mismo? */
  hostile(a: PlayerSession, b: PlayerSession) {
    if (!a.duelId || a.duelId !== b.duelId) return false;
    const d = this.duels.get(a.duelId);
    return !!d && d.state === 'fight';
  }
  opponent(p: PlayerSession): PlayerSession | null { const d = this.get(p); return d ? (d.a === p ? d.b : d.a) : null; }

  private busy(p: PlayerSession) { return p.duelId || this.g.gyms.battles.has(p.id) || this.g.trades.byPlayer.has(p.id); }

  request(p: PlayerSession, targetId: number) {
    const g = this.g, o = g.players.get(targetId);
    if (!o || o === p) return;
    if (this.busy(p) || this.busy(o)) return g.notify(p, 'Uno de los dos está ocupado (duelo, gimnasio o intercambio).', 'bad');
    if (g.zoneAt(p.x, p.y).kind === 'dungeon') return g.notify(p, 'No se puede combatir en duelo dentro de una mazmorra.', 'bad');
    if (dist(p.x, p.y, o.x, o.y) > DUEL.MAX_DIST) return g.notify(p, `Acércate a ${o.name} para retarle (máx. ${DUEL.MAX_DIST} casillas).`, 'bad');
    if (!p.team.some(m => m.alive)) return g.notify(p, 'Tu equipo está debilitado.', 'bad');
    let m = this.reqs.get(o.id); if (!m) this.reqs.set(o.id, m = new Map());
    m.set(p.id, g.now + DUEL.REQ_MS);
    o.send({ t: 'duel_req', from: p.id, name: p.name, elo: p.save.pvp.elo, lvl: p.save.tlvl });
    g.notify(p, `Has retado a ${o.name} a un duelo.`, 'info');
  }

  accept(p: PlayerSession, fromId: number) {
    const g = this.g;
    const exp = this.reqs.get(p.id)?.get(fromId);
    this.reqs.get(p.id)?.delete(fromId);
    const o = g.players.get(fromId);
    if (!exp || exp < g.now || !o) return g.notify(p, 'El reto ha caducado.', 'bad');
    if (this.busy(p) || this.busy(o)) return g.notify(p, 'Uno de los dos está ocupado.', 'bad');
    if (dist(p.x, p.y, o.x, o.y) > DUEL.MAX_DIST + 6) return g.notify(p, 'Estáis demasiado lejos para el duelo.', 'bad');
    const d: Duel = { id: this.nextId++, a: o, b: p, cx: (o.x + p.x) / 2, cy: (o.y + p.y) / 2, r: DUEL.RADIUS, goAt: g.now + DUEL.COUNTDOWN, end: g.now + DUEL.COUNTDOWN + DUEL.TIME, state: 'countdown' };
    this.duels.set(d.id, d);
    for (const pl of [d.a, d.b]) {
      pl.duelId = d.id; pl.focus = null;
      g.healTeam(pl, 1, true); pl.hp = pl.maxHp;
      for (const m of pl.team) m.target = null;
    }
    // las mascotas salvajes dejan de molestar a los duelistas
    for (const m of g.mons.values()) if (m.wild && (m.target === d.a || m.target === d.b || (m.target as any)?.owner === d.a || (m.target as any)?.owner === d.b)) { m.target = null; m.state = 'return'; }
    const info = (me: PlayerSession, op: PlayerSession) => ({ t: 'duel_start', id: d.id, op: op.id, opName: op.name, opElo: op.save.pvp.elo, elo: me.save.pvp.elo, cx: d.cx, cy: d.cy, r: d.r, goAt: d.goAt, end: d.end });
    d.a.send(info(d.a, d.b)); d.b.send(info(d.b, d.a));
    g.emit(d.cx, d.cy, ['x', 'duel', d.cx, d.cy, d.r]);
    g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `⚔ Duelo: ${d.a.name} (${d.a.save.pvp.elo}) contra ${d.b.name} (${d.b.save.pvp.elo}).` });
  }

  alive(p: PlayerSession) { return p.team.filter(m => m.alive).length; }
  hpFrac(p: PlayerSession) { const t = p.team; return t.length ? t.reduce((s, m) => s + (m.alive ? m.hp / m.maxHp : 0), 0) / t.length : 0; }

  update() {
    const g = this.g, now = g.now;
    for (const d of this.duels.values()) {
      if (d.state === 'done') continue;
      if (d.a.closed || d.b.closed) { this.finish(d, d.a.closed ? d.b : d.a, 'abandono'); continue; }
      if (d.state === 'countdown' && now >= d.goAt) {
        d.state = 'fight';
        for (const pl of [d.a, d.b]) pl.send({ t: 'duel_go', id: d.id });
      }
      if (d.state !== 'fight') continue;
      for (const pl of [d.a, d.b]) {
        if (dist(pl.x, pl.y, d.cx, d.cy) > d.r + 3) { this.finish(d, pl === d.a ? d.b : d.a, `${pl.name} salió de la arena`); break; }
      }
      if (d.state !== 'fight') continue;
      const la = this.alive(d.a), lb = this.alive(d.b);
      if (!la || !lb) { this.finish(d, la ? d.a : d.b, 'equipo rival debilitado'); continue; }
      if (now >= d.end) { const fa = this.hpFrac(d.a), fb = this.hpFrac(d.b); this.finish(d, fa >= fb ? d.a : d.b, 'tiempo agotado: gana quien conserva más vida'); }
    }
    for (const [id, d] of this.duels) if (d.state === 'done') this.duels.delete(id);
  }

  finish(d: Duel, winner: PlayerSession, reason: string) {
    if (d.state === 'done') return;
    const g = this.g;
    d.state = 'done';
    const loser = winner === d.a ? d.b : d.a;
    const delta = eloDelta(winner.save.pvp.elo, loser.save.pvp.elo);
    winner.save.pvp.elo += delta; winner.save.pvp.w++;
    loser.save.pvp.elo = Math.max(0, loser.save.pvp.elo - delta); loser.save.pvp.l++;
    const prize = 80 + loser.save.tlvl * 12;
    if (!winner.closed) { winner.save.money += prize; winner.save.stats.pvpWins = (winner.save.stats.pvpWins || 0) + 1; }
    for (const pl of [d.a, d.b]) {
      pl.duelId = 0; pl.focus = null;
      if (pl.closed) continue;
      g.healTeam(pl, 1, true); pl.hp = pl.maxHp;
      for (const m of pl.team) m.target = null;
      pl.dirtyCore = true;
      pl.send({ t: 'duel_end', id: d.id, win: pl === winner, reason, delta: pl === winner ? delta : -delta, elo: pl.save.pvp.elo, prize: pl === winner ? prize : 0, op: (pl === d.a ? d.b : d.a).name });
    }
    g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `⚔ ${winner.name} gana el duelo contra ${loser.name} (${reason}). Elo ${winner.save.pvp.elo} (+${delta}).` });
    g.cloud?.feed('duel', `${winner.name} venció a ${loser.name} en duelo (Elo ${winner.save.pvp.elo})`);
    if (!winner.closed) g.savePlayer(winner);
    if (!loser.closed) g.savePlayer(loser);
  }

  /** Ranking PvP de los conectados (el ranking global vive en la web de estadísticas). */
  top() {
    return [...this.g.players.values()].map(p => ({ n: p.name, elo: p.save.pvp.elo, w: p.save.pvp.w, l: p.save.pvp.l })).sort((a, b) => b.elo - a.elo).slice(0, 20);
  }
}
