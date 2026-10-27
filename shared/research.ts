import { SPECIES, FAMILIES } from './species';
import type { Reward } from './progression';

export interface ResearchState {
  dex: { caught: Record<string, number>; seen: Record<string, number> };
  stats: Record<string, number>; zones: number[]; towns: number[];
}
export interface ResearchTask { id: string; name: string; desc: string; goal: number; metric: string; reward: Reward; }
export const RESEARCH: ResearchTask[] = [
  { id: 'r01', name: 'Una nueva mirada', desc: 'Observa 5 especies diferentes en el mundo.', goal: 5, metric: 'seen', reward: { money: 180, items: { pokeball: 5 } } },
  { id: 'r02', name: 'Primer cuaderno', desc: 'Registra 3 especies capturadas.', goal: 3, metric: 'caught', reward: { txp: 100, items: { superball: 3 } } },
  { id: 'r03', name: 'Botánica de campo', desc: 'Captura 3 Pokémon de tipo Planta.', goal: 3, metric: 'type:grass', reward: { money: 300, items: { pocion: 3 } } },
  { id: 'r04', name: 'A orillas del agua', desc: 'Captura 3 Pokémon de tipo Agua.', goal: 3, metric: 'type:water', reward: { money: 300, items: { superball: 4 } } },
  { id: 'r05', name: 'Pequeños exploradores', desc: 'Captura 5 Pokémon de tipo Bicho.', goal: 5, metric: 'type:bug', reward: { crystals: 2, txp: 140 } },
  { id: 'r06', name: 'Horizontes', desc: 'Descubre 5 zonas de la región.', goal: 5, metric: 'zones', reward: { money: 500, items: { incienso: 1 } } },
  { id: 'r07', name: 'Una parada en el camino', desc: 'Registra 3 Centros Pokémon para viajar.', goal: 3, metric: 'towns', reward: { txp: 200, items: { superpocion: 4 } } },
  { id: 'r08', name: 'Tras las chispas', desc: 'Captura 3 Pokémon de tipo Eléctrico.', goal: 3, metric: 'type:electric', reward: { crystals: 3, items: { superball: 5 } } },
  { id: 'r09', name: 'Tras las brasas', desc: 'Captura 3 Pokémon de tipo Fuego.', goal: 3, metric: 'type:fire', reward: { money: 600, items: { ultraball: 2 } } },
  { id: 'r10', name: 'Tesoros del sendero', desc: 'Abre 8 cofres de exploración.', goal: 8, metric: 'stat:chests', reward: { crystals: 4, txp: 250 } },
  { id: 'r11', name: 'Árbol familiar', desc: 'Completa una familia evolutiva en la Pokédex.', goal: 1, metric: 'families', reward: { crystals: 5, items: { caramelo_raro: 2 } } },
  { id: 'r12', name: 'Naturalista de la región', desc: 'Captura 20 especies diferentes.', goal: 20, metric: 'caught', reward: { money: 1500, crystals: 8, items: { ultraball: 5 } } },
];
export function researchProgress(state: ResearchState, task: ResearchTask): number {
  const caught = state.dex.caught;
  if (task.metric === 'seen') return Object.keys(SPECIES).filter(k => state.dex.seen[k] > 0 || caught[k] > 0).length;
  if (task.metric === 'caught') return Object.keys(SPECIES).filter(k => caught[k] > 0).length;
  if (task.metric === 'zones') return new Set(state.zones).size;
  if (task.metric === 'towns') return new Set(state.towns).size;
  if (task.metric === 'families') return Object.values(FAMILIES).filter(f => f.length > 1 && f.every(k => caught[k] > 0)).length;
  if (task.metric.startsWith('type:')) return Object.entries(caught).reduce((n, [k, v]) => n + (SPECIES[k]?.types.some(t => t === task.metric.slice(5)) ? Math.max(0, v) : 0), 0);
  return state.stats[task.metric.slice(5)] || 0;
}
export function researchClaimId(id: string) { return 'research:' + id; }
