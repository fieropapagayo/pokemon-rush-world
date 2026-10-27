// Movimientos. kind:
//  melee: golpe cuerpo a cuerpo al objetivo
//  proj:  proyectil que viaja hasta el objetivo
//  aoe:   área circular centrada en el objetivo
//  nova:  área circular centrada en el usuario
//  beam:  rayo en línea recta hacia el objetivo (atraviesa)
//  self:  sin daño (Salpicadura)
import type { PType } from './types';
import { STATUS } from './constants';

export type MoveKind = 'melee' | 'proj' | 'aoe' | 'nova' | 'beam' | 'self';

export interface MoveDef {
  id: string;
  name: string;
  type: PType;
  power: number;
  kind: MoveKind;
  cat: 'basic' | 'special';
  range: number;      // tiles
  cd: number;         // segundos
  radius?: number;    // aoe / nova / ancho del rayo
  status?: [number, number]; // [estado, probabilidad]
  drain?: number;     // fracción del daño que cura
  hits?: number;      // golpes múltiples
  selfFaint?: boolean;
  fx: string;         // clave del efecto visual
  speed?: number;     // velocidad del proyectil (tiles/s)
}

const M: MoveDef[] = [
  // ---- básicos ----
  { id: 'placaje', name: 'Placaje', type: 'normal', power: 40, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.1, fx: 'hit' },
  { id: 'aranazo', name: 'Arañazo', type: 'normal', power: 40, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.0, fx: 'slash' },
  { id: 'destructor', name: 'Destructor', type: 'normal', power: 40, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.1, fx: 'hit' },
  { id: 'ataque_rapido', name: 'Ataque Rápido', type: 'normal', power: 40, kind: 'melee', cat: 'basic', range: 1.6, cd: 0.8, fx: 'hit' },
  { id: 'hipercolmillo', name: 'Hipercolmillo', type: 'normal', power: 70, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.2, fx: 'bite' },
  { id: 'salpicadura', name: 'Salpicadura', type: 'normal', power: 0, kind: 'self', cat: 'basic', range: 3, cd: 1.5, fx: 'splash' },
  { id: 'ascuas', name: 'Ascuas', type: 'fire', power: 40, kind: 'proj', cat: 'basic', range: 4, cd: 1.1, fx: 'fire', speed: 10, status: [STATUS.BURN, 0.1] },
  { id: 'colmillo_igneo', name: 'Colmillo Ígneo', type: 'fire', power: 65, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.1, fx: 'firebite', status: [STATUS.BURN, 0.15] },
  { id: 'pistola_agua', name: 'Pistola Agua', type: 'water', power: 40, kind: 'proj', cat: 'basic', range: 4, cd: 1.1, fx: 'water', speed: 11 },
  { id: 'burbuja', name: 'Burbuja', type: 'water', power: 40, kind: 'proj', cat: 'basic', range: 4, cd: 1.0, fx: 'bubble', speed: 7 },
  { id: 'cascada', name: 'Cascada', type: 'water', power: 80, kind: 'melee', cat: 'basic', range: 1.6, cd: 1.3, fx: 'splashhit' },
  { id: 'latigo_cepa', name: 'Látigo Cepa', type: 'grass', power: 45, kind: 'melee', cat: 'basic', range: 2.2, cd: 1.0, fx: 'vine' },
  { id: 'absorber', name: 'Absorber', type: 'grass', power: 35, kind: 'proj', cat: 'basic', range: 4, cd: 1.1, fx: 'leaf', speed: 9, drain: 0.5 },
  { id: 'impactrueno', name: 'Impactrueno', type: 'electric', power: 40, kind: 'proj', cat: 'basic', range: 4.5, cd: 1.0, fx: 'spark', speed: 14, status: [STATUS.PARALYZE, 0.1] },
  { id: 'chispa', name: 'Chispa', type: 'electric', power: 65, kind: 'melee', cat: 'basic', range: 1.5, cd: 1.1, fx: 'sparkhit', status: [STATUS.PARALYZE, 0.2] },
  { id: 'picotazo', name: 'Picotazo', type: 'flying', power: 35, kind: 'melee', cat: 'basic', range: 1.4, cd: 0.9, fx: 'peck' },
  { id: 'tornado', name: 'Tornado', type: 'flying', power: 40, kind: 'proj', cat: 'basic', range: 4, cd: 1.1, fx: 'wind', speed: 9 },
  { id: 'ataque_ala', name: 'Ataque Ala', type: 'flying', power: 60, kind: 'melee', cat: 'basic', range: 1.6, cd: 1.1, fx: 'wing' },
  { id: 'lenguetazo', name: 'Lengüetazo', type: 'ghost', power: 30, kind: 'melee', cat: 'basic', range: 1.6, cd: 1.0, fx: 'lick', status: [STATUS.PARALYZE, 0.3] },
  { id: 'tinieblas', name: 'Tinieblas', type: 'ghost', power: 50, kind: 'proj', cat: 'basic', range: 4.5, cd: 1.2, fx: 'shadow', speed: 9 },
  { id: 'confusion', name: 'Confusión', type: 'psychic', power: 50, kind: 'proj', cat: 'basic', range: 4.5, cd: 1.1, fx: 'psy', speed: 12 },
  { id: 'lanzarrocas', name: 'Lanzarrocas', type: 'rock', power: 50, kind: 'proj', cat: 'basic', range: 4, cd: 1.3, fx: 'rock', speed: 9 },
  { id: 'mordisco', name: 'Mordisco', type: 'dark', power: 60, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.1, fx: 'bite' },
  { id: 'hueso_palo', name: 'Hueso Palo', type: 'ground', power: 65, kind: 'melee', cat: 'basic', range: 1.6, cd: 1.2, fx: 'bonehit' },
  { id: 'picadura', name: 'Picadura', type: 'bug', power: 50, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.0, fx: 'bug' },
  { id: 'disparo_demora', name: 'Disparo Demora', type: 'bug', power: 25, kind: 'proj', cat: 'basic', range: 4, cd: 1.0, fx: 'string', speed: 10, status: [STATUS.PARALYZE, 0.15] },
  { id: 'picotazo_veneno', name: 'Picotazo Veneno', type: 'poison', power: 30, kind: 'proj', cat: 'basic', range: 4, cd: 1.0, fx: 'poison', speed: 11, status: [STATUS.POISON, 0.3] },
  { id: 'chupavidas', name: 'Chupavidas', type: 'bug', power: 55, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.1, fx: 'drain', drain: 0.5 },
  { id: 'viento_hielo', name: 'Viento Hielo', type: 'ice', power: 55, kind: 'proj', cat: 'basic', range: 4.5, cd: 1.2, fx: 'ice', speed: 10, status: [STATUS.FREEZE, 0.05] },
  { id: 'garra_dragon', name: 'Garra Dragón', type: 'dragon', power: 80, kind: 'melee', cat: 'basic', range: 1.6, cd: 1.2, fx: 'dragonslash' },
  { id: 'furia_dragon', name: 'Furia Dragón', type: 'dragon', power: 55, kind: 'proj', cat: 'basic', range: 4.5, cd: 1.2, fx: 'dragon', speed: 10 },
  { id: 'foco_resplandor', name: 'Foco Resplandor', type: 'steel', power: 70, kind: 'proj', cat: 'basic', range: 4.5, cd: 1.3, fx: 'steel', speed: 13 },
  { id: 'voz_cautivadora', name: 'Voz Cautivadora', type: 'fairy', power: 40, kind: 'proj', cat: 'basic', range: 4, cd: 1.0, fx: 'fairy', speed: 9 },
  { id: 'cola_ferrea', name: 'Cola Férrea', type: 'steel', power: 80, kind: 'melee', cat: 'basic', range: 1.8, cd: 1.3, fx: 'steelhit' },
  { id: 'rueda_fuego', name: 'Rueda Fuego', type: 'fire', power: 60, kind: 'melee', cat: 'basic', range: 1.6, cd: 1.0, fx: 'firebite', status: [STATUS.BURN, 0.1] },

  { id: 'golpe_karate', name: 'Golpe Kárate', type: 'fighting', power: 50, kind: 'melee', cat: 'basic', range: 1.4, cd: 1.0, fx: 'hit' },
  { id: 'patada_baja', name: 'Patada Baja', type: 'fighting', power: 65, kind: 'melee', cat: 'basic', range: 1.5, cd: 1.2, fx: 'hit' },
  { id: 'corte_furia', name: 'Corte Furia', type: 'bug', power: 40, kind: 'melee', cat: 'basic', range: 1.6, cd: 0.75, fx: 'slash' },
  { id: 'pisoton', name: 'Pisotón', type: 'normal', power: 65, kind: 'melee', cat: 'basic', range: 1.5, cd: 1.2, fx: 'hit', status: [STATUS.PARALYZE, 0.1] },

  // ---- especiales ----
  { id: 'puno_dinamico', name: 'Puño Dinámico', type: 'fighting', power: 100, kind: 'melee', cat: 'special', range: 1.8, cd: 6, fx: 'cross', status: [STATUS.PARALYZE, 0.25] },
  { id: 'a_bocajarro', name: 'A Bocajarro', type: 'fighting', power: 120, kind: 'melee', cat: 'special', range: 1.8, cd: 7, fx: 'cross' },
  { id: 'tijera_x', name: 'Tijera X', type: 'bug', power: 80, kind: 'melee', cat: 'special', range: 2, cd: 4, fx: 'cross' },
  { id: 'lanzallamas', name: 'Lanzallamas', type: 'fire', power: 90, kind: 'beam', cat: 'special', range: 5, cd: 5, radius: 0.9, fx: 'flamebeam', status: [STATUS.BURN, 0.2] },
  { id: 'llamarada', name: 'Llamarada', type: 'fire', power: 110, kind: 'aoe', cat: 'special', range: 5, cd: 8, radius: 2.2, fx: 'blast', status: [STATUS.BURN, 0.3] },
  { id: 'hidrobomba', name: 'Hidrobomba', type: 'water', power: 110, kind: 'beam', cat: 'special', range: 6, cd: 7, radius: 1, fx: 'waterbeam' },
  { id: 'surf', name: 'Surf', type: 'water', power: 90, kind: 'nova', cat: 'special', range: 3, cd: 7, radius: 3, fx: 'wave' },
  { id: 'rayo_burbuja', name: 'Rayo Burbuja', type: 'water', power: 65, kind: 'beam', cat: 'special', range: 5, cd: 4.5, radius: 0.8, fx: 'bubblebeam' },
  { id: 'hoja_afilada', name: 'Hoja Afilada', type: 'grass', power: 40, kind: 'proj', cat: 'special', range: 5, cd: 4, hits: 3, fx: 'leaves', speed: 12 },
  { id: 'rayo_solar', name: 'Rayo Solar', type: 'grass', power: 130, kind: 'beam', cat: 'special', range: 7, cd: 10, radius: 1.2, fx: 'solarbeam' },
  { id: 'danza_petalo', name: 'Danza Pétalo', type: 'grass', power: 110, kind: 'nova', cat: 'special', range: 2.5, cd: 8, radius: 2.6, fx: 'petals' },
  { id: 'megaagotar', name: 'Megaagotar', type: 'grass', power: 60, kind: 'proj', cat: 'special', range: 5, cd: 4, fx: 'drainorb', speed: 9, drain: 0.6 },
  { id: 'rayo', name: 'Rayo', type: 'electric', power: 90, kind: 'proj', cat: 'special', range: 6, cd: 5, fx: 'bolt', speed: 22, status: [STATUS.PARALYZE, 0.2] },
  { id: 'trueno', name: 'Trueno', type: 'electric', power: 120, kind: 'aoe', cat: 'special', range: 6, cd: 9, radius: 2.2, fx: 'thunder', status: [STATUS.PARALYZE, 0.3] },
  { id: 'vendaval', name: 'Vendaval', type: 'flying', power: 110, kind: 'aoe', cat: 'special', range: 5, cd: 8, radius: 2.4, fx: 'tornado' },
  { id: 'pajaro_osado', name: 'Pájaro Osado', type: 'flying', power: 120, kind: 'melee', cat: 'special', range: 3.5, cd: 7, fx: 'dive' },
  { id: 'bola_sombra', name: 'Bola Sombra', type: 'ghost', power: 85, kind: 'proj', cat: 'special', range: 6, cd: 5, fx: 'shadowball', speed: 9 },
  { id: 'pulso_umbrio', name: 'Pulso Umbrío', type: 'dark', power: 85, kind: 'nova', cat: 'special', range: 2.5, cd: 6, radius: 2.6, fx: 'darkpulse' },
  { id: 'psiquico', name: 'Psíquico', type: 'psychic', power: 95, kind: 'aoe', cat: 'special', range: 6, cd: 6, radius: 1.8, fx: 'psychic' },
  { id: 'psicorrayo', name: 'Psicorrayo', type: 'psychic', power: 70, kind: 'beam', cat: 'special', range: 5.5, cd: 4.5, radius: 0.8, fx: 'psybeam' },
  { id: 'onda_mental', name: 'Onda Mental', type: 'psychic', power: 140, kind: 'nova', cat: 'special', range: 3.5, cd: 9, radius: 3.6, fx: 'psywave' },
  { id: 'terremoto', name: 'Terremoto', type: 'ground', power: 100, kind: 'nova', cat: 'special', range: 3, cd: 8, radius: 3.2, fx: 'quake' },
  { id: 'huesomerang', name: 'Huesomerang', type: 'ground', power: 50, kind: 'proj', cat: 'special', range: 5, cd: 4, hits: 2, fx: 'bone', speed: 10 },
  { id: 'avalancha', name: 'Avalancha', type: 'rock', power: 75, kind: 'aoe', cat: 'special', range: 5, cd: 6, radius: 2, fx: 'rockslide' },
  { id: 'roca_afilada', name: 'Roca Afilada', type: 'rock', power: 100, kind: 'aoe', cat: 'special', range: 5, cd: 7, radius: 1.4, fx: 'stoneedge' },
  { id: 'autodestruccion', name: 'Autodestrucción', type: 'normal', power: 200, kind: 'nova', cat: 'special', range: 1.5, cd: 14, radius: 3, fx: 'explosion', selfFaint: true },
  { id: 'hiperrayo', name: 'Hiperrayo', type: 'normal', power: 150, kind: 'beam', cat: 'special', range: 7, cd: 11, radius: 1.2, fx: 'hyperbeam' },
  { id: 'golpe_cuerpo', name: 'Golpe Cuerpo', type: 'normal', power: 85, kind: 'nova', cat: 'special', range: 1.8, cd: 6, radius: 1.8, fx: 'slam', status: [STATUS.PARALYZE, 0.3] },
  { id: 'velocidad_extrema', name: 'Veloc. Extrema', type: 'normal', power: 90, kind: 'melee', cat: 'special', range: 4, cd: 5, fx: 'dash' },
  { id: 'canto', name: 'Canto', type: 'normal', power: 10, kind: 'nova', cat: 'special', range: 3, cd: 9, radius: 3, fx: 'sing', status: [STATUS.SLEEP, 0.6] },
  { id: 'brillo_magico', name: 'Brillo Mágico', type: 'fairy', power: 80, kind: 'nova', cat: 'special', range: 2.5, cd: 6, radius: 2.8, fx: 'gleam' },
  { id: 'fuerza_lunar', name: 'Fuerza Lunar', type: 'fairy', power: 95, kind: 'proj', cat: 'special', range: 6, cd: 6, fx: 'moon', speed: 9 },
  { id: 'cometa_draco', name: 'Cometa Draco', type: 'dragon', power: 130, kind: 'aoe', cat: 'special', range: 6, cd: 9, radius: 2.2, fx: 'meteor' },
  { id: 'enfado', name: 'Enfado', type: 'dragon', power: 120, kind: 'nova', cat: 'special', range: 2, cd: 8, radius: 2.4, fx: 'outrage' },
  { id: 'rayo_hielo', name: 'Rayo Hielo', type: 'ice', power: 90, kind: 'beam', cat: 'special', range: 6, cd: 6, radius: 0.9, fx: 'icebeam', status: [STATUS.FREEZE, 0.12] },
  { id: 'ventisca', name: 'Ventisca', type: 'ice', power: 110, kind: 'nova', cat: 'special', range: 3.5, cd: 9, radius: 3.4, fx: 'blizzard', status: [STATUS.FREEZE, 0.15] },
  { id: 'bomba_lodo', name: 'Bomba Lodo', type: 'poison', power: 90, kind: 'aoe', cat: 'special', range: 5, cd: 6, radius: 1.6, fx: 'sludge', status: [STATUS.POISON, 0.4] },
  { id: 'polvo_sueno', name: 'Somnífero', type: 'grass', power: 15, kind: 'aoe', cat: 'special', range: 5, cd: 9, radius: 2, fx: 'spores', status: [STATUS.SLEEP, 0.5] },
  { id: 'zumbido', name: 'Zumbido', type: 'bug', power: 90, kind: 'nova', cat: 'special', range: 2.5, cd: 6, radius: 2.6, fx: 'buzz' },
  { id: 'tajo_cruzado', name: 'Tajo Cruzado', type: 'fighting', power: 100, kind: 'melee', cat: 'special', range: 1.8, cd: 5, fx: 'cross' },
  { id: 'onda_voltio', name: 'Onda Voltio', type: 'electric', power: 80, kind: 'nova', cat: 'special', range: 2.5, cd: 6, radius: 2.8, fx: 'discharge', status: [STATUS.PARALYZE, 0.3] },
  { id: 'llama_azul', name: 'Envite Ígneo', type: 'fire', power: 120, kind: 'melee', cat: 'special', range: 3.5, cd: 7, fx: 'flaredash', status: [STATUS.BURN, 0.2] },
  { id: 'psicocorte', name: 'Psicocorte', type: 'psychic', power: 70, kind: 'melee', cat: 'special', range: 2, cd: 3.5, fx: 'psycut' },
  { id: 'bomba_iman', name: 'Bomba Imán', type: 'steel', power: 75, kind: 'aoe', cat: 'special', range: 5, cd: 6, radius: 1.6, fx: 'magnet' },
  { id: 'cabezazo_zen', name: 'Cabezazo Zen', type: 'psychic', power: 80, kind: 'melee', cat: 'special', range: 1.8, cd: 4, fx: 'psycut' },
  { id: 'aliento', name: 'Aliento Dragón', type: 'dragon', power: 75, kind: 'beam', cat: 'special', range: 5, cd: 5, radius: 1, fx: 'dragonbreath', status: [STATUS.PARALYZE, 0.25] },
];

export const MOVES: Record<string, MoveDef> = Object.fromEntries(M.map(m => [m.id, m]));
export const MOVE_LIST = M;
export const MOVE_INDEX: Record<string, number> = Object.fromEntries(M.map((m, i) => [m.id, i]));
