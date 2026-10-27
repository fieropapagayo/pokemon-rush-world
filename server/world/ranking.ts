// Clasificaciones del servidor (todas las partidas guardadas + jugadores conectados). Se recalcula como mucho cada 60 s.
import type { Game } from './game';

interface Row { n: string; lv: number; txp: number; dex: number; shiny: number; bosses: number; medals: number; kills: number; }

export class Ranking {
  cache: Record<string, { n: string; v: number }[]> | null = null;
  at = 0;
  constructor(private g: Game) {}

  get() {
    if (!this.cache || Date.now() - this.at > 60000) this.compute();
    return this.cache!;
  }

  compute() {
    const rows = this.g.db.db.prepare('SELECT a.username AS n, s.data AS d FROM saves s JOIN accounts a ON a.id = s.account_id').all() as any[];
    const map = new Map<string, any>();
    for (const r of rows) { try { map.set(r.n, JSON.parse(r.d)); } catch { /* guardado ilegible: se ignora */ } }
    for (const p of this.g.players.values()) map.set(p.name, p.save);
    const list: Row[] = [...map.entries()].filter(([, s]) => s && Array.isArray(s.mons) && s.mons.length).map(([n, s]) => ({
      n, lv: s.tlvl || 1, txp: s.txp || 0, dex: Object.values(s.dex?.caught || {}).filter((v: any) => v > 0).length,
      shiny: s.stats?.shinies || 0, bosses: s.stats?.bosses || 0, medals: (s.medals || []).length, kills: s.stats?.kills || 0,
    }));
    const top = (k: keyof Row, sec: keyof Row = 'txp') => [...list].sort((a, b) => ((b[k] as number) - (a[k] as number)) || ((b[sec] as number) - (a[sec] as number))).slice(0, 10).map(r => ({ n: r.n, v: r[k] as number }));
    this.cache = { nivel: top('lv'), pokedex: top('dex'), medallas: top('medals'), jefes: top('bosses'), shinies: top('shiny'), derrotas: top('kills') };
    this.at = Date.now();
  }
}
