// Zonas del mundo: nombre, nivel recomendado y tablas de aparición.

export type SpawnEntry = [string, number, ('day' | 'night')?];

export interface ZoneDef {
  id: number;
  name: string;
  kind: 'ocean' | 'town' | 'wild' | 'dungeon';
  lvl: [number, number];
  spawns: SpawnEntry[];
  water?: SpawnEntry[];   // especies que aparecen en el agua
  density: number;        // Pokémon salvajes objetivo alrededor de cada jugador
  desc: string;
  color: string;
  weather?: 'rain' | 'snow' | 'ash' | 'fog' | 'spores' | 'none';
  minLevel?: number;      // nivel de entrenador recomendado (aviso)
}

export const ZONES: ZoneDef[] = [
  { id: 0, name: 'Mar Abierto', kind: 'ocean', lvl: [10, 20], spawns: [], water: [['magikarp', 40], ['psyduck', 10], ['lapras', 2]], density: 3, desc: 'Aguas profundas que rodean la región.', color: '#3c7fd8' },
  { id: 1, name: 'Pueblo Paleta', kind: 'town', lvl: [1, 1], spawns: [], density: 0, desc: 'Un pueblo tranquilo donde empiezan los grandes viajes.', color: '#f4e4b0' },
  { id: 2, name: 'Ruta 1', kind: 'wild', lvl: [2, 6], spawns: [['pidgey', 30], ['rattata', 30], ['caterpie', 18], ['jigglypuff', 6], ['pikachu', 4], ['eevee', 2], ['oddish', 8, 'night']], density: 9, desc: 'Praderas suaves ideales para empezar.', color: '#8fd16a' },
  { id: 3, name: 'Ciudad Verde', kind: 'town', lvl: [1, 1], spawns: [], density: 0, desc: 'Ciudad rodeada de naturaleza en el centro de la región.', color: '#bfe3a0' },
  { id: 4, name: 'Bosque Verde', kind: 'wild', lvl: [5, 11], spawns: [['caterpie', 22], ['metapod', 12], ['pidgey', 14], ['oddish', 16], ['bulbasaur', 4], ['pikachu', 6], ['pidgeotto', 4], ['butterfree', 3], ['zubat', 8, 'night'], ['scyther', 2]], density: 10, desc: 'Un bosque frondoso lleno de Pokémon bicho.', color: '#2f7a34', weather: 'spores' },
  { id: 5, name: 'Pantano Niebla', kind: 'wild', lvl: [15, 21], spawns: [['oddish', 18], ['gloom', 10], ['zubat', 14], ['gastly', 14, 'night'], ['psyduck', 10], ['golbat', 4], ['vileplume', 1]], water: [['magikarp', 20], ['psyduck', 8]], density: 10, desc: 'Ciénagas brumosas. De noche aparecen fantasmas.', color: '#5a7a4a', weather: 'fog' },
  { id: 6, name: 'Costa Brisa', kind: 'wild', lvl: [6, 12], spawns: [['psyduck', 20], ['squirtle', 6], ['rattata', 12], ['pidgey', 12], ['voltorb', 4]], water: [['magikarp', 30], ['psyduck', 10], ['lapras', 1]], density: 9, desc: 'Playas de arena dorada y brisa marina.', color: '#ecd99a' },
  { id: 7, name: 'Pradera Central', kind: 'wild', lvl: [9, 15], spawns: [['pidgeotto', 14], ['raticate', 10], ['growlithe', 10], ['vulpix', 10], ['eevee', 4], ['jigglypuff', 10], ['oddish', 10], ['abra', 7], ['pikachu', 5], ['ponyta', 5]], density: 10, desc: 'Grandes praderas en el corazón de la región.', color: '#7cc85a' },
  { id: 8, name: 'Lago Celeste', kind: 'wild', lvl: [11, 17], spawns: [['psyduck', 24], ['squirtle', 8], ['golduck', 4], ['pidgeotto', 8], ['jigglypuff', 6]], water: [['magikarp', 30], ['psyduck', 8], ['dratini', 2], ['lapras', 1]], density: 10, desc: 'Un enorme lago cristalino. Algo se agita en sus profundidades.', color: '#5fa0e8' },
  { id: 9, name: 'Ciudad Celeste', kind: 'town', lvl: [1, 1], spawns: [], density: 0, desc: 'Ciudad junto al lago, famosa por sus aguas.', color: '#a8d0f0' },
  { id: 10, name: 'Campos Voltio', kind: 'wild', lvl: [15, 22], spawns: [['pikachu', 18], ['magnemite', 20], ['voltorb', 20], ['electrode', 5], ['raichu', 2], ['magneton', 4]], density: 11, desc: 'Llanuras electrificadas junto a la vieja central.', color: '#d8d070', weather: 'none' },
  { id: 11, name: 'Pueblo Lavanda', kind: 'town', lvl: [1, 1], spawns: [], density: 0, desc: 'Un pueblo melancólico junto al cementerio.', color: '#c8b0e0' },
  { id: 12, name: 'Cementerio Lavanda', kind: 'wild', lvl: [19, 26], spawns: [['gastly', 28], ['haunter', 10], ['cubone', 18], ['zubat', 14], ['marowak', 4], ['golbat', 6]], density: 11, desc: 'Lápidas y niebla. Los Pokémon fantasma rondan por aquí.', color: '#7a6a86', weather: 'fog' },
  { id: 13, name: 'Montes Roca', kind: 'wild', lvl: [17, 24], spawns: [['geodude', 28], ['zubat', 12], ['onix', 5], ['cubone', 10], ['graveler', 8], ['charmander', 2], ['machop', 12], ['machoke', 3]], density: 11, desc: 'Montañas escarpadas con cuevas y desprendimientos.', color: '#a08a6a' },
  { id: 14, name: 'Volcán Canela', kind: 'wild', lvl: [25, 34], spawns: [['vulpix', 18], ['growlithe', 18], ['charmander', 8], ['geodude', 8], ['graveler', 10], ['ninetales', 3], ['arcanine', 2], ['charmeleon', 4], ['magnemite', 6], ['ponyta', 14], ['rapidash', 3]], density: 12, desc: 'Ríos de lava y ceniza. Solo los más fuertes sobreviven.', color: '#d06040', weather: 'ash' },
  { id: 15, name: 'Isla Canela', kind: 'town', lvl: [1, 1], spawns: [], density: 0, desc: 'Isla volcánica con un laboratorio abandonado.', color: '#f0a080' },
  { id: 16, name: 'Picos Helados', kind: 'wild', lvl: [31, 42], spawns: [['dratini', 8], ['dragonair', 4], ['golbat', 14], ['graveler', 10], ['golem', 4], ['snorlax', 2], ['ninetales', 3], ['kadabra', 8], ['wigglytuff', 5], ['machoke', 6], ['rapidash', 3]], water: [['lapras', 8], ['dratini', 6]], density: 12, desc: 'Cumbres nevadas donde habitan dragones.', color: '#e8f0f8', weather: 'snow' },
  { id: 17, name: 'Meseta Añil', kind: 'town', lvl: [1, 1], spawns: [], density: 0, desc: 'La cumbre de la región. Solo llegan los mejores entrenadores.', color: '#d0d8ff' },
  { id: 18, name: 'Cueva Luna', kind: 'dungeon', lvl: [18, 26], spawns: [['zubat', 28], ['geodude', 24], ['jigglypuff', 10], ['onix', 6], ['golbat', 8], ['graveler', 6], ['machop', 8]], density: 12, desc: 'Cueva misteriosa donde cayeron meteoritos.', color: '#5b4d48', minLevel: 12 },
  { id: 19, name: 'Torre Pokémon', kind: 'dungeon', lvl: [26, 34], spawns: [['gastly', 26], ['haunter', 22], ['cubone', 14], ['marowak', 8], ['gengar', 2]], density: 13, desc: 'Una torre encantada. Los espíritus no descansan.', color: '#5e4a6e', minLevel: 20 },
  { id: 20, name: 'Cueva Celeste', kind: 'dungeon', lvl: [42, 55], spawns: [['kadabra', 14], ['alakazam', 4], ['electrode', 10], ['magneton', 10], ['golem', 8], ['golbat', 10], ['dragonair', 6], ['arcanine', 4], ['raichu', 4], ['wigglytuff', 4], ['crobat', 3], ['gengar', 3], ['snorlax', 2], ['machamp', 4], ['rapidash', 4], ['scyther', 3]], density: 14, desc: 'La cueva más peligrosa. Algo inmensamente poderoso habita en su interior.', color: '#6a7ab8', minLevel: 30 },
  { id: 21, name: 'Interior', kind: 'town', lvl: [1, 1], spawns: [], density: 0, desc: 'Casas, Centros Pokémon y tiendas de la región.', color: '#d8c0a0' },
];

// Limpia entradas marcador (peso 0)
for (const z of ZONES) z.spawns = z.spawns.filter(e => e[1] > 0);

export const ZONE = {
  OCEAN: 0, PALETA: 1, RUTA1: 2, VERDE: 3, BOSQUE: 4, PANTANO: 5, COSTA: 6, PRADERA: 7, LAGO: 8, CELESTE: 9,
  VOLTIO: 10, LAVANDA: 11, CEMENTERIO: 12, MONTES: 13, VOLCAN: 14, CANELA: 15, PICOS: 16, ANIL: 17,
  CUEVA_LUNA: 18, TORRE: 19, CUEVA_CELESTE: 20, INTERIOR: 21,
} as const;
