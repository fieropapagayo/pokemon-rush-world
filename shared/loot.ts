// Tablas de botín explícitas: el servidor tira con ellas y la interfaz muestra los mismos porcentajes.

export interface LootOut { items: Record<string, number>; money: number; crystals: number; ess: number; }
const STONES = ['piedra_fuego', 'piedra_agua', 'piedra_trueno', 'piedra_hoja', 'piedra_lunar'];
const ri = (a: number, b: number, r: () => number) => a + Math.floor(r() * (b - a + 1));

/** Objeto del suelo (Poké Ball brillante). Una sola recompensa según esta tabla. */
export const ITEM_TABLE = [
  { w: 30, label: 'Poké Balls (2-4) · Super Balls desde zonas de nivel 20 · Ultra Balls en zonas 32+' },
  { w: 20, label: 'Poción (Superpoción en zonas 20+)' },
  { w: 22, label: 'Pokédólares (60-150 + 90 por nivel de zona)' },
  { w: 22, label: 'Esencias del tipo de la zona (3 + 2 por nivel de zona)' },
  { w: 5, label: 'Piedra evolutiva aleatoria' },
  { w: 1, label: 'Caramelo Raro' },
];

export function rollItemBall(tier: number, luck: number, r: () => number = Math.random): LootOut {
  const o: LootOut = { items: {}, money: 0, crystals: 0, ess: 0 };
  const tot = ITEM_TABLE.reduce((s, e) => s + e.w, 0);
  let x = r() * tot, k = 0;
  for (; k < ITEM_TABLE.length - 1; k++) { x -= ITEM_TABLE[k].w; if (x < 0) break; }
  switch (k) {
    case 0: o.items[tier >= 3 ? 'ultraball' : tier >= 2 ? 'superball' : 'pokeball'] = tier >= 3 ? ri(1, 3, r) : ri(2, 4, r); break;
    case 1: o.items[tier >= 2 ? 'superpocion' : 'pocion'] = 1; break;
    case 2: o.money = Math.round((60 + tier * 90) * luck * (0.7 + r() * 0.6)); break;
    case 3: o.ess = 3 + tier * 2; break;
    case 4: o.items[STONES[Math.floor(r() * STONES.length)]] = 1; break;
    default: o.items.caramelo_raro = 1;
  }
  return o;
}

/** Probabilidades de los extras de un cofre según su nivel (0-3). */
export function chestOdds(tier: number) {
  return { stone: 0.15 + tier * 0.03, candy: 0.1 + tier * 0.05, incense: tier >= 2 ? 0.08 : 0, master: tier >= 3 ? 0.02 : 0 };
}

export function rollChest(tier: number, luck: number, r: () => number = Math.random): LootOut {
  const o: LootOut = { items: {}, money: 0, crystals: 0, ess: 0 };
  o.money = Math.round(150 * Math.pow(tier + 1, 1.7) * luck * (0.8 + r() * 0.5));
  o.crystals = 1 + tier + (r() < 0.5 ? 1 : 0);
  o.items[tier >= 3 ? 'ultraball' : tier >= 1 ? 'superball' : 'pokeball'] = 3 + tier;
  const od = chestOdds(tier);
  if (r() < od.stone) o.items[STONES[Math.floor(r() * STONES.length)]] = 1;
  if (r() < od.candy) o.items.caramelo_raro = 1;
  if (r() < od.incense) o.items.incienso = 1;
  if (r() < od.master) o.items.masterball = 1;
  return o;
}

export const TIER_NAMES = ['Madera (zonas nv. <10)', 'Hierro (nv. 10-19)', 'Oro (nv. 20-31)', 'Cristal (nv. 32+)'];
