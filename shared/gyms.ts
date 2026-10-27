// Gimnasios: líderes con equipos fijos. Cada medalla da bonificaciones permanentes.
import type { PType } from './types';
import { ZONE } from './zones';

export interface GymDef {
  id: number; town: number; leader: string; type: PType; medal: string; color: string;
  team: [string, number][]; reward: { money: number; crystals: number; tokens: number; items: Record<string, number> };
  lines: string[];
}

export const MEDAL_DMG = 0.04;   // +4% daño del equipo por medalla
export const MEDAL_XP = 0.03;    // +3% EXP por medalla
export const GYM_TIME = 180;     // segundos para ganar
export const GYM_HP_MULT = 3;    // los Pokémon de líder son más resistentes
export const GYM_REMATCH_MS = 10 * 60000;

export const GYMS: GymDef[] = [
  { id: 0, town: ZONE.PALETA, leader: 'Erika', type: 'grass', medal: 'Medalla Arcoíris', color: '#78c850',
    team: [['oddish', 9], ['bulbasaur', 11], ['gloom', 13]],
    reward: { money: 800, crystals: 3, tokens: 0, items: { superball: 5, pocion: 3 } },
    lines: ['Los Pokémon planta crecen con paciencia... y golpean con fuerza.', 'Si me vences, te daré la Medalla Arcoíris.'] },
  { id: 1, town: ZONE.VERDE, leader: 'Brock', type: 'rock', medal: 'Medalla Roca', color: '#b8a038',
    team: [['geodude', 16], ['cubone', 17], ['onix', 19], ['graveler', 20]],
    reward: { money: 1800, crystals: 5, tokens: 1, items: { superball: 8, revivir: 2 } },
    lines: ['Mi defensa es dura como la roca.', 'Los ataques de agua y planta te vendrán bien.'] },
  { id: 2, town: ZONE.CELESTE, leader: 'Misty', type: 'water', medal: 'Medalla Cascada', color: '#6890f0',
    team: [['psyduck', 22], ['wartortle', 24], ['golduck', 26], ['lapras', 27]],
    reward: { money: 3200, crystals: 7, tokens: 1, items: { ultraball: 5, superpocion: 2 } },
    lines: ['¡Mi estilo es un torrente imparable!', 'Prepara Pokémon eléctricos o de planta.'] },
  { id: 3, town: ZONE.LAVANDA, leader: 'Agatha', type: 'ghost', medal: 'Medalla Espectro', color: '#705898',
    team: [['haunter', 30], ['golbat', 31], ['marowak', 32], ['gengar', 34]],
    reward: { money: 5000, crystals: 9, tokens: 2, items: { ultraball: 8, cable_link: 1 } },
    lines: ['Los espíritus de la torre me susurran tu llegada...', 'Los ataques siniestros y fantasma funcionan contra mi equipo.'] },
  { id: 4, town: ZONE.CANELA, leader: 'Blaine', type: 'fire', medal: 'Medalla Volcán', color: '#f08030',
    team: [['ninetales', 38], ['rapidash', 39], ['charmeleon', 40], ['arcanine', 42]],
    reward: { money: 8000, crystals: 12, tokens: 3, items: { ultraball: 10, caramelo_raro: 2 } },
    lines: ['¡Mi fuego arde más que el volcán!', 'El agua, la tierra y la roca apagan las llamas.'] },
  { id: 5, town: ZONE.ANIL, leader: 'Lance', type: 'dragon', medal: 'Medalla Dragón', color: '#7038f8',
    team: [['dragonair', 48], ['gyarados', 50], ['charizard', 52], ['dragonite', 55]],
    reward: { money: 15000, crystals: 20, tokens: 5, items: { ultraball: 15, masterball: 1 } },
    lines: ['Soy el maestro dragón de la Meseta Añil.', 'Solo el hielo, el hada y otros dragones pueden con nosotros.'] },
];
export const GYM_BY_TOWN: Record<number, GymDef> = Object.fromEntries(GYMS.map(g => [g.town, g]));
