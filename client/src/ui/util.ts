// Cálculos de progreso en cliente (solo para mostrar; el servidor valida).
import { S } from '../state';
import { FAMILIES } from '../../../shared/species';

export function statValueClient(stat: string): number {
  const c = S.core; if (!c) return 0;
  if (stat === 'teamSize') return c.team.length;
  if (stat.startsWith('zone_')) return c.zones.includes(parseInt(stat.slice(5), 10)) ? 1 : 0;
  if (stat === 'zones') return c.zones.length;
  if (stat === 'dexCaught') return Object.values(c.dex.caught).filter(v => v > 0).length;
  if (stat === 'families') {
    let n = 0;
    for (const f in FAMILIES) { const m = FAMILIES[f]; if (m.length >= 2 && m.every(k => (c.dex.caught[k] || 0) > 0)) n++; }
    return n;
  }
  return c.stats[stat] || 0;
}
