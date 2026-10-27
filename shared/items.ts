// Objetos del inventario y tienda.
import type { PType } from './types';

export type ItemCat = 'ball' | 'heal' | 'evo' | 'special';

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  cat: ItemCat;
  price?: number;              // precio en Pokédólares (si se vende)
  crystals?: number;           // coste adicional en cristales
  essence?: [PType, number];   // coste adicional en esencias
  unlock?: number;             // nivel de entrenador requerido para comprar
  ballBonus?: number;
}

const L: ItemDef[] = [
  { id: 'pokeball', name: 'Poké Ball', desc: 'Ball básica para capturar Pokémon salvajes.', cat: 'ball', price: 40, ballBonus: 1 },
  { id: 'superball', name: 'Super Ball', desc: 'Mejor índice de captura que la Poké Ball (x1.5).', cat: 'ball', price: 140, unlock: 5, ballBonus: 1.5 },
  { id: 'ultraball', name: 'Ultra Ball', desc: 'Ball de alto rendimiento (x2.2).', cat: 'ball', price: 380, unlock: 12, ballBonus: 2.2 },
  { id: 'masterball', name: 'Master Ball', desc: 'Captura cualquier Pokémon sin fallar. Solo se obtiene de jefes y eventos.', cat: 'ball', ballBonus: 999 },
  { id: 'pocion', name: 'Poción', desc: 'Restaura el 50% de PS de todo el equipo.', cat: 'heal', price: 90 },
  { id: 'superpocion', name: 'Superpoción', desc: 'Restaura el 100% de PS de todo el equipo.', cat: 'heal', price: 260, unlock: 8 },
  { id: 'revivir', name: 'Revivir', desc: 'Reanima al instante a todos los Pokémon debilitados del equipo con 50% de PS.', cat: 'heal', price: 320, unlock: 6 },
  { id: 'piedra_fuego', name: 'Piedra Fuego', desc: 'Hace evolucionar a ciertos Pokémon (Growlithe, Vulpix, Eevee).', cat: 'evo', price: 1500, essence: ['fire', 12], unlock: 4 },
  { id: 'piedra_agua', name: 'Piedra Agua', desc: 'Hace evolucionar a ciertos Pokémon (Eevee).', cat: 'evo', price: 1500, essence: ['water', 12], unlock: 4 },
  { id: 'piedra_trueno', name: 'Piedra Trueno', desc: 'Hace evolucionar a ciertos Pokémon (Pikachu, Eevee).', cat: 'evo', price: 1500, essence: ['electric', 12], unlock: 4 },
  { id: 'piedra_hoja', name: 'Piedra Hoja', desc: 'Hace evolucionar a ciertos Pokémon (Gloom).', cat: 'evo', price: 1500, essence: ['grass', 12], unlock: 4 },
  { id: 'piedra_lunar', name: 'Piedra Lunar', desc: 'Hace evolucionar a ciertos Pokémon (Jigglypuff).', cat: 'evo', price: 1500, essence: ['fairy', 6], unlock: 4 },
  { id: 'cable_link', name: 'Cable Link', desc: 'Simula un intercambio: evoluciona a Kadabra, Graveler, Haunter y Machoke (también evolucionan al intercambiarlos de verdad con otro jugador).', cat: 'evo', price: 3000, crystals: 5, unlock: 10 },
  { id: 'caramelo_raro', name: 'Caramelo Raro', desc: 'Sube un nivel a un Pokémon. Se obtiene en cofres, eventos, expediciones o con Fragmentos de Jefe.', cat: 'special' },
  { id: 'incienso', name: 'Incienso Raro', desc: 'Atrae a un Pokémon raro cerca de ti y aumenta la probabilidad shiny durante 2 minutos.', cat: 'special', price: 800, crystals: 3, unlock: 8 },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(L.map(i => [i.id, i]));
export const ITEM_LIST = L;
export const BALLS = ['pokeball', 'superball', 'ultraball', 'masterball'];
