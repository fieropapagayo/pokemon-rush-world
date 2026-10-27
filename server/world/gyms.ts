// Combates de gimnasio: el líder saca su equipo solo contra el retador. Ganar da medallas permanentes.
import { dist } from '../../shared/constants';
import { GYMS, GymDef, GYM_TIME, GYM_HP_MULT, GYM_REMATCH_MS } from '../../shared/gyms';
import { ITEMS } from '../../shared/items';
import type { Game } from './game';
import { PlayerSession } from './entities';

interface Battle { gym: GymDef; mons: number[]; start: number; x: number; y: number; rematch: boolean; }

export class GymManager {
  battles = new Map<number, Battle>();     // por id de jugador
  lastTry = new Map<string, number>();      // cuenta:gym → última victoria (revanchas)
  checkAt = 0;

  constructor(private g: Game) {}

  challenge(p: PlayerSession, gymId: number) {
    const g = this.g;
    const gym = GYMS[gymId];
    if (!gym) return;
    const npc = g.world.npcs.find(n => n.role === 'leader' && n.gym === gymId);
    if (!npc || dist(p.x, p.y, npc.x + 0.5, npc.y + 0.5) > 3.5) return g.notify(p, 'Acércate al líder del gimnasio para desafiarle.', 'bad');
    if (this.battles.has(p.id)) return g.notify(p, 'Ya estás en un combate de gimnasio.', 'bad');
    if (gymId > 0 && !p.save.medals.includes(gymId - 1)) return g.notify(p, `Primero consigue la ${GYMS[gymId - 1].medal} (Líder ${GYMS[gymId - 1].leader}).`, 'bad');
    if (!p.team.some(m => m.alive)) return g.notify(p, 'Tu equipo está debilitado. Cúralo en el Centro Pokémon.', 'bad');
    const rematch = p.save.medals.includes(gymId);
    const k = p.accountId + ':' + gymId;
    if (rematch && g.now - (this.lastTry.get(k) || 0) < GYM_REMATCH_MS) return g.notify(p, 'El líder está descansando. Vuelve en unos minutos para la revancha.', 'info');
    const lvlBonus = rematch ? Math.max(0, Math.round(p.team.reduce((s, m) => s + m.lvl, 0) / p.team.length) - gym.team[gym.team.length - 1][1]) : 0;
    const ids: number[] = [];
    const ax = npc.x + 0.5, ay = npc.y - 2.5;
    gym.team.forEach(([key, lvl], i) => {
      const a = (i / gym.team.length) * Math.PI * 2;
      const m = g.spawnWild(key, lvl + lvlBonus, ax + Math.cos(a) * 2.2, ay + Math.sin(a) * 1.5, { zone: npc.town });
      m.iv = [15, 15, 15, 15]; m.hpMult = GYM_HP_MULT; m.recalc(true);
      m.privateTo = p.id; m.homeX = ax; m.homeY = ay; m.rare = false;
      m.target = p.team.find(t => t.alive) || p; m.state = 'chase';
      ids.push(m.id);
    });
    this.battles.set(p.id, { gym, mons: ids, start: g.now, x: ax, y: ay, rematch });
    g.emit(ax, ay, ['x', 'portal', ax, ay]);
    p.send({ t: 'gym_start', gym: gym.id, end: g.now + GYM_TIME * 1000, n: ids.length });
    g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `${p.name} desafía al Líder ${gym.leader} (${gym.medal}).` });
  }

  update() {
    const g = this.g;
    if (g.now < this.checkAt) return;
    this.checkAt = g.now + 500;
    for (const [pid, b] of this.battles) {
      const p = g.players.get(pid);
      const alive = b.mons.filter(id => { const m = g.mons.get(id); return m && !m.fainted; });
      if (!p || p.closed) { this.end(pid, b, false, ''); continue; }
      if (!alive.length) { this.win(p, b); continue; }
      if (g.now - b.start > GYM_TIME * 1000) { this.end(pid, b, false, 'Se acabó el tiempo.'); continue; }
      if (p.hp <= 0) { this.end(pid, b, false, 'Te has debilitado.'); continue; }
      if (dist(p.x, p.y, b.x, b.y) > 16) { this.end(pid, b, false, 'Has abandonado el gimnasio.'); continue; }
      if (!p.team.some(m => m.alive) && p.team.every(m => m.reviveAt - g.now > 3000)) { this.end(pid, b, false, 'Todo tu equipo se ha debilitado.'); continue; }
      p.send({ t: 'gym_up', left: alive.length, n: b.mons.length });
    }
  }

  end(pid: number, b: Battle, _won: boolean, reason: string) {
    const g = this.g;
    for (const id of b.mons) { const m = g.mons.get(id); if (m) { g.emit(m.x, m.y, ['x', 'poof', m.x, m.y]); g.removeMon(m); } }
    this.battles.delete(pid);
    const p = g.players.get(pid);
    if (p && reason) p.send({ t: 'gym_fail', gym: b.gym.id, reason });
  }

  win(p: PlayerSession, b: Battle) {
    const g = this.g, gym = b.gym;
    this.battles.delete(p.id);
    this.lastTry.set(p.accountId + ':' + gym.id, g.now);
    const lines: string[] = [];
    const f = b.rematch ? 0.3 : 1;
    const money = Math.round(gym.reward.money * f), cr = Math.round(gym.reward.crystals * f);
    p.save.money += money; p.save.crystals += cr; lines.push(`${money} ₽`, `${cr} Cristales Rush`);
    if (!b.rematch) {
      p.save.medals.push(gym.id);
      if (gym.reward.tokens) { p.save.tokens += gym.reward.tokens; lines.push(`${gym.reward.tokens} Fragmentos de Jefe`); }
      for (const [it, n] of Object.entries(gym.reward.items)) { p.save.items[it] = (p.save.items[it] || 0) + n; lines.push(`${ITEMS[it].name} x${n}`); }
      lines.unshift(`¡${gym.medal}! (+4% daño y +3% EXP permanentes)`);
      g.rebuildTeam(p);
      g.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `¡${p.name} ha ganado la ${gym.medal} al Líder ${gym.leader}!` });
    }
    g.giveTrainerXp(p, Math.round((300 + gym.team[gym.team.length - 1][1] * 60) * f));
    p.save.stats.gyms = (p.save.stats.gyms || 0) + 1;
    p.dirtyCore = true;
    p.send({ t: 'gym_win', gym: gym.id, rematch: b.rematch, lines });
  }
}
