// Intercambios entre jugadores: ofertas, doble confirmación con cuenta atrás y ejecución atómica en el servidor.
import { SPECIES } from '../../shared/species';
import { dist } from '../../shared/constants';
import type { Game } from '../world/game';
import { PlayerSession } from '../world/entities';
import type { MonSave } from './save';

export const TRADE_EVOS: Record<string, string> = { kadabra: 'alakazam', graveler: 'golem', haunter: 'gengar', machoke: 'machamp' };
const LOCK_MS = 3000;

interface Offer { uids: string[]; money: number; ready: boolean; }
interface Trade { id: number; a: PlayerSession; b: PlayerSession; oa: Offer; ob: Offer; lockAt: number; }

export class TradeManager {
  byPlayer = new Map<number, Trade>();
  reqs = new Map<number, Map<number, number>>(); // destino → (origen → caducidad)
  nextId = 1;

  constructor(private g: Game) {}

  request(p: PlayerSession, targetId: number) {
    const g = this.g, o = g.players.get(targetId);
    if (!o || o === p) return;
    if (this.byPlayer.has(p.id) || this.byPlayer.has(o.id)) return g.notify(p, 'Uno de los dos ya está intercambiando.', 'bad');
    if (dist(p.x, p.y, o.x, o.y) > 30) return g.notify(p, 'Acércate al otro jugador para intercambiar (máx. 30 casillas).', 'bad');
    let m = this.reqs.get(o.id); if (!m) this.reqs.set(o.id, m = new Map());
    m.set(p.id, g.now + 60000);
    o.send({ t: 'trade_req', from: p.id, name: p.name });
    g.notify(p, `Solicitud de intercambio enviada a ${o.name}.`, 'info');
  }

  accept(p: PlayerSession, fromId: number) {
    const g = this.g;
    const exp = this.reqs.get(p.id)?.get(fromId);
    this.reqs.get(p.id)?.delete(fromId);
    const o = g.players.get(fromId);
    if (!exp || exp < g.now || !o) return g.notify(p, 'La solicitud de intercambio ha caducado.', 'bad');
    if (this.byPlayer.has(p.id) || this.byPlayer.has(o.id)) return g.notify(p, 'Uno de los dos ya está intercambiando.', 'bad');
    const t: Trade = { id: this.nextId++, a: o, b: p, oa: { uids: [], money: 0, ready: false }, ob: { uids: [], money: 0, ready: false }, lockAt: 0 };
    this.byPlayer.set(o.id, t); this.byPlayer.set(p.id, t);
    this.sync(t);
  }

  offer(p: PlayerSession, uids: string[], money: number) {
    const t = this.byPlayer.get(p.id); if (!t) return;
    const busy = new Set(p.save.expeditions.flatMap(e => e.uids));
    const list = [...new Set(uids)].filter(u => p.monSave(u) && !busy.has(u)).slice(0, 6);
    const off = t.a === p ? t.oa : t.ob;
    off.uids = list;
    off.money = Math.max(0, Math.min(p.save.money, Math.floor(money) || 0));
    t.oa.ready = false; t.ob.ready = false; t.lockAt = 0;
    this.sync(t);
  }

  ready(p: PlayerSession, flag: boolean) {
    const t = this.byPlayer.get(p.id); if (!t) return;
    (t.a === p ? t.oa : t.ob).ready = flag;
    t.lockAt = t.oa.ready && t.ob.ready ? this.g.now + LOCK_MS : 0;
    this.sync(t);
  }

  cancel(p: PlayerSession, reason = 'Intercambio cancelado.') {
    const t = this.byPlayer.get(p.id); if (!t) return;
    this.close(t, reason);
  }

  close(t: Trade, reason: string) {
    this.byPlayer.delete(t.a.id); this.byPlayer.delete(t.b.id);
    for (const x of [t.a, t.b]) x.send({ t: 'trade_end', reason });
  }

  update() {
    for (const t of new Set(this.byPlayer.values())) {
      if (t.a.closed || t.b.closed) { this.close(t, 'El otro jugador se ha desconectado.'); continue; }
      if (t.lockAt && this.g.now >= t.lockAt) this.execute(t);
    }
  }

  private view(o: Offer, owner: PlayerSession) {
    return { uids: o.uids, money: o.money, ready: o.ready, mons: o.uids.map(u => owner.monSave(u)).filter(Boolean) };
  }

  sync(t: Trade) {
    const lock = t.lockAt ? Math.max(0, t.lockAt - this.g.now) : 0;
    t.a.send({ t: 'trade', id: t.id, me: this.view(t.oa, t.a), them: { name: t.b.name, ...this.view(t.ob, t.b) }, lock });
    t.b.send({ t: 'trade', id: t.id, me: this.view(t.ob, t.b), them: { name: t.a.name, ...this.view(t.oa, t.a) }, lock });
  }

  execute(t: Trade) {
    const g = this.g;
    const { a, b, oa, ob } = t;
    // revalidación completa en el momento de ejecutar
    const valid = (p: PlayerSession, o: Offer, recv: number) => {
      const busy = new Set(p.save.expeditions.flatMap(e => e.uids));
      if (o.uids.some(u => !p.monSave(u) || busy.has(u))) return false;
      if (o.money > p.save.money) return false;
      return p.save.mons.length - o.uids.length + recv >= 1;
    };
    if (!oa.uids.length && !ob.uids.length && !oa.money && !ob.money) return this.close(t, 'No había nada que intercambiar.');
    if (!valid(a, oa, ob.uids.length) || !valid(b, ob, oa.uids.length)) return this.close(t, 'El intercambio no es válido (cada entrenador debe quedarse al menos con un Pokémon).');
    const take = (p: PlayerSession, uids: string[]) => {
      const out: MonSave[] = [];
      for (const u of uids) { const i = p.save.mons.findIndex(m => m.uid === u); if (i >= 0) out.push(p.save.mons.splice(i, 1)[0]); }
      p.save.team = p.save.team.filter(u => !uids.includes(u));
      return out;
    };
    const toB = take(a, oa.uids), toA = take(b, ob.uids);
    a.save.money += ob.money - oa.money; b.save.money += oa.money - ob.money;
    const give = (p: PlayerSession, from: PlayerSession, mons: MonSave[]) => {
      const evolved: { uid: string; from: string; to: string; shiny: boolean }[] = [];
      for (const m of mons) {
        m.ot = m.ot || from.name; m.fr = 70; m.fav = false;
        const to = TRADE_EVOS[m.sp];
        if (to) { evolved.push({ uid: m.uid, from: m.sp, to, shiny: m.shiny }); m.sp = to; p.save.stats.evolves++; }
        p.save.mons.push(m);
        p.save.dex.seen[m.sp] = 1; p.save.dex.caught[m.sp] = (p.save.dex.caught[m.sp] || 0) + 1;
        if (m.shiny) p.save.dex.shiny[m.sp] = (p.save.dex.shiny[m.sp] || 0) + 1;
      }
      p.save.stats.trades = (p.save.stats.trades || 0) + 1;
      if (!p.save.team.length && p.save.mons.length) p.save.team = [p.save.mons[0].uid];
      g.rebuildTeam(p);
      p.dirtyMons = true; p.dirtyCore = true;
      p.send({ t: 'trade_done', got: mons, evolved, money: (p === a ? ob.money - oa.money : oa.money - ob.money), with: from.name });
    };
    give(a, b, toA); give(b, a, toB);
    this.byPlayer.delete(a.id); this.byPlayer.delete(b.id);
    g.savePlayer(a); g.savePlayer(b);
    const names = (ms: MonSave[]) => ms.map(m => SPECIES[m.sp].name).join(', ') || 'nada';
    console.log(`[intercambio] ${a.name} (${names(toB)}) <-> ${b.name} (${names(toA)})`);
  }
}
