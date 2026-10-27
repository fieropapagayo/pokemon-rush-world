// Entrenador personalizable: modelo articulado 3D rasterizado en 32×48 (3 direcciones x 3 fotogramas).
import { renderTrainer, TRAINER_W, TRAINER_H } from './trainer3d';

export const HAT_COLORS = ['#e03838', '#3868d8', '#38a848', '#f0c030', '#303038', '#f0f0f0', '#8848c0', '#f08030'];
export const SHIRT_COLORS = ['#3a78d8', '#e04848', '#48b058', '#f0b030', '#404050', '#f4f4f4', '#9a58d0', '#f07838'];
export const SKIN_COLORS = ['#f8d0a8', '#e8b080', '#b87848', '#7a4a2a'];
export const HAIR_COLORS = ['#6a4020', '#282028', '#f0d070', '#c84828', '#283868', '#e8e8f0'];
export const SHOE_COLORS = ['#d83848', '#3868d8', '#38a848', '#e0a020', '#484858', '#d83848', '#8848c0', '#e06828'];
export const BAG_COLORS = ['#c87830', '#3a4a68', '#487848', '#b86828', '#303040', '#c84848', '#684088', '#b85828'];

export interface TrainerCols { hat: string | null; shirt: string; skin: string; hair: string; pants: string; shoes: string; bag: string; }

export function colsFromLook(l: { hat: number; shirt: number; skin: number; hair: number }): TrainerCols {
  return {
    hat: l.hat < 0 ? null : HAT_COLORS[l.hat % 8],
    shirt: SHIRT_COLORS[l.shirt % 8],
    skin: SKIN_COLORS[l.skin % 4],
    hair: HAIR_COLORS[l.hair % 6],
    pants: '#344470',
    shoes: SHOE_COLORS[(l.hat >= 0 ? l.hat : l.shirt) % 8],
    bag: BAG_COLORS[l.shirt % 8],
  };
}

export const NPC_LOOKS: TrainerCols[] = [
  { hat: '#e03838', shirt: '#3a78d8', skin: '#f8d0a8', hair: '#6a4020', pants: '#3a4a78', shoes: '#d83848', bag: '#c87830' },
  { hat: '#f8f8f8', shirt: '#f8a8c8', skin: '#f8d0a8', hair: '#f070a0', pants: '#f8f8f8', shoes: '#f8a8c8', bag: '#f8f8f8' }, // enfermera
  { hat: '#3868d8', shirt: '#5890e8', skin: '#e8b080', hair: '#282028', pants: '#2a3a68', shoes: '#3868d8', bag: '#5890e8' }, // dependiente
  { hat: null, shirt: '#58a848', skin: '#f8d0a8', hair: '#c84828', pants: '#6a5038', shoes: '#488838', bag: '#58a848' },
  { hat: '#f0c030', shirt: '#e8e0d0', skin: '#b87848', hair: '#282028', pants: '#4a5a40', shoes: '#b88828', bag: '#e8e0d0' },
  { hat: null, shirt: '#a060c0', skin: '#e8b080', hair: '#e8e8f0', pants: '#3a3048', shoes: '#784098', bag: '#a060c0' },
  { hat: null, shirt: '#f4f4f4', skin: '#f8d0a8', hair: '#b8b8c0', pants: '#6a5a48', shoes: '#4a3a30', bag: '#8a6a48' }, // profesor
  { hat: '#48b058', shirt: '#f0b030', skin: '#7a4a2a', hair: '#282028', pants: '#3a4a78', shoes: '#48b058', bag: '#c87830' },
  // líderes de gimnasio (8 + id)
  { hat: null, shirt: '#58a848', skin: '#f8d8b8', hair: '#282028', pants: '#c84848', shoes: '#c84848', bag: '#58a848' },   // Erika
  { hat: null, shirt: '#d07030', skin: '#b87848', hair: '#4a3020', pants: '#5a6a48', shoes: '#6a5038', bag: '#d07030' },   // Brock
  { hat: null, shirt: '#f8d040', skin: '#f8d0a8', hair: '#f07030', pants: '#3a78d8', shoes: '#e04848', bag: '#3890d8' },   // Misty
  { hat: null, shirt: '#7050a0', skin: '#e8c0a0', hair: '#d8d8e0', pants: '#4a3a60', shoes: '#282028', bag: '#7050a0' },   // Agatha
  { hat: '#e03838', shirt: '#f4f4f4', skin: '#e8b080', hair: '#f4f4f4', pants: '#3a3a48', shoes: '#282028', bag: '#e03838' }, // Blaine
  { hat: null, shirt: '#283048', skin: '#f8d0a8', hair: '#c83030', pants: '#283048', shoes: '#c83030', bag: '#c83030' },   // Lance
];

/** Hoja de sprites 9 fotogramas (dir 0 abajo, 1 arriba, 2 lado) x (0 quieto, 1 paso, 2 paso). */
export function trainerSheet(c: TrainerCols): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = TRAINER_W * 9; cv.height = TRAINER_H;
  const ctx = cv.getContext('2d')!;
  let i = 0;
  for (let d = 0; d < 3; d++) for (let f = 0; f < 3; f++) { ctx.drawImage(renderTrainer(c, d, f).toCanvas(), i * TRAINER_W, 0); i++; }
  return cv;
}

export function trainerPortrait(c: TrainerCols, scale = 3, dir = 0, f = 0): HTMLCanvasElement { return renderTrainer(c, dir, f).toCanvas(scale); }
