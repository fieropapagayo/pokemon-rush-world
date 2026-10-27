// Registro de todas las texturas generadas en Phaser + caché de retratos para la interfaz.
import Phaser from 'phaser';
import { SPECIES_LIST, SPECIES } from '../../../shared/species';
import { renderMon3D, monSheet, MON_FRAME } from './mon3d';
import { objectArt } from './objectArt';
import { trainerSheet, colsFromLook, NPC_LOOKS, TrainerCols, trainerPortrait } from './trainerArt';
import { font3Sheet, font5Sheet, FONT3_CHARS, FONT5_CHARS } from './font';
import { PixelArt } from './pixel';
import { TRAINER_W, TRAINER_H } from './trainer3d';
import { buildTileSet, TileSet } from './tileArt';

let tileSet: TileSet | null = null;
export function getTileSet() { return tileSet!; }

const portraitCache = new Map<string, string>();
export function monURL(key: string, shiny = false, scale = 2, dir = 1, frame = 0): string {
  const k = `${key}|${shiny ? 1 : 0}|${scale}|${dir}|${frame}`;
  let u = portraitCache.get(k);
  if (!u) {
    u = renderMon3D(key, shiny, dir, frame, scale).toCanvas().toDataURL();   // retrato nítido a su tamaño exacto
    portraitCache.set(k, u);
  }
  return u;
}
const trainerURLCache = new Map<string, string>();
export function trainerURL(look: any, scale = 3, dir = 0, step = 0): string {
  const k = JSON.stringify(look) + '|' + scale + '|' + dir + '|' + step;
  let u = trainerURLCache.get(k);
  if (!u) { u = trainerPortrait(colsFromLook(look), scale, dir, step).toDataURL(); trainerURLCache.set(k, u); }
  return u;
}

function addCanvas(scene: Phaser.Scene, key: string, c: HTMLCanvasElement) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}
function addSheet(scene: Phaser.Scene, key: string, c: HTMLCanvasElement, fw: number, fh: number) {
  if (scene.textures.exists(key)) return;
  scene.textures.addSpriteSheet(key, c as any, { frameWidth: fw, frameHeight: fh });
}

// Generate only the species, palette and view actually needed. Reused by all entities.
export function ensureMonTexture(scene: Phaser.Scene, species: string, shiny: boolean, direction = 1): string {
  const key = `mon3d:${species}:${+shiny}:${direction}`;
  if (!scene.textures.exists(key)) {
    addSheet(scene, key, monSheet(species, shiny, direction), MON_FRAME, MON_FRAME);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);   // modelos a 1,5×: se reducen con suavizado
  }
  return key;
}

export function ensureTrainerTexture(scene: Phaser.Scene, look: any): string {
  const key = 'tr:' + [look.hat, look.shirt, look.skin, look.hair].join('-');
  if (!scene.textures.exists(key)) addSheet(scene, key, trainerSheet(colsFromLook(look)), TRAINER_W, TRAINER_H);
  return key;
}
export function npcTexture(scene: Phaser.Scene, i: number): string {
  const key = 'npc:' + i;
  if (!scene.textures.exists(key)) addSheet(scene, key, trainerSheet(NPC_LOOKS[i % NPC_LOOKS.length] as TrainerCols), TRAINER_W, TRAINER_H);
  return key;
}

function fx(w: number, h: number, draw: (g: PixelArt) => void, outline = false) {
  const g = new PixelArt(w, h); draw(g); if (outline) g.outline(); return g.toCanvas();
}

function radial(size: number, inner: string, outer: string) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, size, size);
  return c;
}

export function buildTextures(scene: Phaser.Scene) {
  tileSet = buildTileSet();
  // Pokémon 3D sheets are generated on demand (8 poses × 8 directions).
  // Objetos del mundo
  const objs: [string, number[]][] = [
    ['tree', [0, 1, 2, 3, 4, 5]], ['rock', [0, 1, 2]], ['boulder', [0, 1]], ['bush', [0, 1, 2]], ['grave', [0, 1, 2]], ['pylon', [0]], ['stalag', [0]],
    ['crystal', [0]], ['center', [0]], ['mart', [0]], ['house', [0, 1, 2, 3]], ['lab', [0]], ['fountain', [0]], ['lamp', [0]], ['sign', [0]],
    ['statue', [0]], ['tower', [0]], ['cave', [0, 1]], ['itemball', [0]],
    ['bed', [0, 1]], ['table', [0, 1]], ['shelf', [0, 1, 2]], ['bookcase', [0, 1]], ['plant', [0]], ['tv', [0]], ['counter', [0, 1]], ['pc', [0]],
    ['sofa', [0]], ['rug', [0, 1, 2]], ['machine', [0, 1]], ['stove', [0]], ['window', [0]], ['flowerbed', [0, 1, 2, 3]],
    ['hedge', [0, 1, 2]], ['bench', [0]], ['fence', [0]], ['flowerpatch', [0, 1, 2, 3]],
  ];
  for (const [k, vs] of objs) for (const v of vs) addCanvas(scene, `obj:${k}:${v}`, objectArt(k, v).toCanvas());
  for (let t = 0; t < 4; t++) for (const open of [0, 1]) addCanvas(scene, `chest:${t}:${open}`, objectArt('chest', t + open * 10).toCanvas());
  // NPCs
  for (let i = 0; i < NPC_LOOKS.length; i++) npcTexture(scene, i);
  // Fuentes
  const f3 = font3Sheet();
  addCanvas(scene, 'font3', f3.canvas);
  scene.cache.bitmapFont.add('f3', Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'font3', width: f3.cw, height: f3.chh, chars: FONT3_CHARS, charsPerRow: f3.perRow, spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: 0,
  } as any));
  const f5 = font5Sheet();
  addCanvas(scene, 'font5', f5.canvas);
  scene.cache.bitmapFont.add('f5', Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'font5', width: f5.cw, height: f5.chh, chars: FONT5_CHARS, charsPerRow: f5.perRow, spacing: { x: 0, y: 0 }, offset: { x: 0, y: 0 }, lineSpacing: 0,
  } as any));
  // Efectos
  addCanvas(scene, 'px', fx(2, 2, g => g.rect(0, 0, 2, 2, '#ffffff')));
  addCanvas(scene, 'dot', fx(4, 4, g => g.ell(2, 2, 2, 2, '#ffffff')));
  addCanvas(scene, 'shadow', fx(24, 8, g => g.ell(12, 4, 11.5, 3.5, '#00000058')));
  addCanvas(scene, 'spark', fx(7, 7, g => { g.rect(3, 0, 1, 7, '#ffffff'); g.rect(0, 3, 7, 1, '#ffffff'); g.rect(2, 2, 3, 3, '#ffffff'); }));
  addCanvas(scene, 'star', fx(9, 9, g => { g.poly([[4.5, 0], [5.6, 3.4], [9, 3.6], [6.3, 5.7], [7.3, 9], [4.5, 7], [1.7, 9], [2.7, 5.7], [0, 3.6], [3.4, 3.4]], '#ffffff'); }));
  addCanvas(scene, 'ring', fx(32, 32, g => { g.ell(16, 16, 15.5, 15.5, '#ffffff'); g.ell(16, 16, 13.5, 13.5, '#00000000'); }));
  addCanvas(scene, 'disc', fx(32, 32, g => g.ell(16, 16, 15.5, 15.5, '#ffffff')));
  addCanvas(scene, 'orb', fx(10, 10, g => { g.ell(5, 5, 4.5, 4.5, '#ffffff'); g.ell(4, 4, 1.5, 1.5, '#ffffff'); }, true));
  addCanvas(scene, 'flame', fx(10, 12, g => { g.ell(5, 7, 4, 4.5, '#f05020'); g.poly([[5, 0], [2, 6], [8, 6]], '#f05020'); g.ell(5, 8, 2.5, 3, '#f8c830'); g.px(5, 7, '#fff8c0'); }, true));
  addCanvas(scene, 'drop', fx(8, 10, g => { g.ell(4, 6, 3.5, 3.5, '#78b8f8'); g.poly([[4, 0], [1, 5], [7, 5]], '#78b8f8'); g.px(3, 5, '#ffffff'); }, true));
  addCanvas(scene, 'bubble', fx(9, 9, g => { g.ell(4.5, 4.5, 4, 4, '#a8e0ff'); g.ell(4.5, 4.5, 3, 3, '#4890e8a0'); g.px(3, 3, '#ffffff'); }));
  addCanvas(scene, 'leaf', fx(9, 7, g => { g.rell(4.5, 3.5, 4, 2, 0.4, '#58c048'); g.line(1, 5, 8, 2, '#2a7a2a'); }, true));
  addCanvas(scene, 'petal', fx(5, 5, g => g.ell(2.5, 2.5, 2.2, 1.6, '#f8a0c8')));
  addCanvas(scene, 'rockbit', fx(9, 8, g => { g.poly([[1, 3], [4, 0], [8, 2], [7, 7], [2, 7]], '#9a8a70'); g.shadeAll(); }, true));
  addCanvas(scene, 'bone', fx(10, 6, g => { g.rect(2, 2, 6, 2, '#f0ece0'); g.ell(1.5, 1.5, 1.5, 1.5, '#f0ece0'); g.ell(1.5, 4.5, 1.5, 1.5, '#f0ece0'); g.ell(8.5, 1.5, 1.5, 1.5, '#f0ece0'); g.ell(8.5, 4.5, 1.5, 1.5, '#f0ece0'); }, true));
  addCanvas(scene, 'bolt', fx(8, 12, g => g.poly([[5, 0], [1, 6], [4, 6], [3, 12], [7, 5], [4, 5]], '#f8e040'), true));
  addCanvas(scene, 'note', fx(8, 10, g => { g.ell(2.5, 8, 2.2, 1.8, '#ffffff'); g.rect(4, 1, 1, 7, '#ffffff'); g.rect(4, 1, 3, 1, '#ffffff'); }, true));
  addCanvas(scene, 'ball', fx(12, 12, g => {
    // Ball con volumen: mitad superior de color, franja negra, botón con aro y brillo especular
    g.ellIf(6, 6, 5.5, 5.5, '#e83030', (_x, y) => y < 6); g.ellIf(6, 6, 5.5, 5.5, '#f2f0ea', (_x, y) => y >= 6);
    g.shadeAll(0.7);
    
    g.rect(0.5, 5.4, 11, 1.3, '#18101e');
    g.ell(6, 6, 2.2, 2.2, '#18101e'); g.ell(6, 6, 1.4, 1.4, '#fafafa'); g.px(6, 6, '#d8d8e0');
    g.ell(3.6, 3, 1.3, 0.9, '#ffffffb0'); g.px(3, 2, '#ffffff');
  }, true));
  addCanvas(scene, 'ballB', fx(12, 12, g => {
    // Ball con volumen: mitad superior de color, franja negra, botón con aro y brillo especular
    g.ellIf(6, 6, 5.5, 5.5, '#3868d8', (_x, y) => y < 6); g.ellIf(6, 6, 5.5, 5.5, '#f2f0ea', (_x, y) => y >= 6);
    g.shadeAll(0.7);
    g.rect(2.5, 2.5, 2, 1, '#e84848'); g.rect(7.5, 2.5, 2, 1, '#e84848');
    g.rect(0.5, 5.4, 11, 1.3, '#18101e');
    g.ell(6, 6, 2.2, 2.2, '#18101e'); g.ell(6, 6, 1.4, 1.4, '#fafafa'); g.px(6, 6, '#d8d8e0');
    g.ell(3.6, 3, 1.3, 0.9, '#ffffffb0'); g.px(3, 2, '#ffffff');
  }, true));
  addCanvas(scene, 'ballU', fx(12, 12, g => {
    // Ball con volumen: mitad superior de color, franja negra, botón con aro y brillo especular
    g.ellIf(6, 6, 5.5, 5.5, '#303038', (_x, y) => y < 6); g.ellIf(6, 6, 5.5, 5.5, '#f2f0ea', (_x, y) => y >= 6);
    g.shadeAll(0.7);
    g.rect(3, 1.5, 1.2, 3.5, '#f8d030'); g.rect(7.8, 1.5, 1.2, 3.5, '#f8d030');
    g.rect(0.5, 5.4, 11, 1.3, '#18101e');
    g.ell(6, 6, 2.2, 2.2, '#18101e'); g.ell(6, 6, 1.4, 1.4, '#fafafa'); g.px(6, 6, '#d8d8e0');
    g.ell(3.6, 3, 1.3, 0.9, '#ffffffb0'); g.px(3, 2, '#ffffff');
  }, true));
  addCanvas(scene, 'ballM', fx(12, 12, g => {
    // Ball con volumen: mitad superior de color, franja negra, botón con aro y brillo especular
    g.ellIf(6, 6, 5.5, 5.5, '#8040b0', (_x, y) => y < 6); g.ellIf(6, 6, 5.5, 5.5, '#f2f0ea', (_x, y) => y >= 6);
    g.shadeAll(0.7);
    g.ell(3.6, 3.4, 1.2, 1.0, '#f070c0'); g.ell(8.4, 3.4, 1.2, 1.0, '#f070c0'); g.px(6, 2, '#ffffff');
    g.rect(0.5, 5.4, 11, 1.3, '#18101e');
    g.ell(6, 6, 2.2, 2.2, '#18101e'); g.ell(6, 6, 1.4, 1.4, '#fafafa'); g.px(6, 6, '#d8d8e0');
    g.ell(3.6, 3, 1.3, 0.9, '#ffffffb0'); g.px(3, 2, '#ffffff');
  }, true));
  addCanvas(scene, 'glow', radial(128, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
  addCanvas(scene, 'glowS', radial(32, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)'));
  // Hierba alta delante de quien la pisa: matas irregulares con puntas claras y base oscura, en 3 fotogramas de vaivén.
  for (let f = 0; f < 3; f++) addCanvas(scene, 'tallfront' + (f ? f : ''), fx(18, 10, g => {
    const sway = [0, 1, -1][f];
    for (let x = 0; x < 18; x++) {
      const h = 4 + ((x * 7 + 3) % 5) - (x === 0 || x === 17 ? 2 : 0);
      const lean = Math.round(sway * (h / 6));
      const col = x % 3 === 0 ? '#3c8a34' : x % 3 === 1 ? '#56ac44' : '#479a3a';
      g.line(x, 9, x + lean, 10 - h, col);
      g.px(x + lean, 10 - h, x % 2 ? '#9adc72' : '#7cc85a');
      g.px(x, 9, '#2c6a28');
    }
  }));
  // Campamento: tienda de lona con vientos y piquetas, y hoguera con piedras y troncos (la llama se anima aparte)
  addCanvas(scene, 'tent', fx(34, 28, g => {
    g.ell(17, 25.5, 15, 2.5, '#00000040');
    g.poly([[2, 25], [17, 3], [32, 25]], '#d88a3a'); g.poly([[17, 3], [24, 25], [32, 25]], '#b86a28');
    g.poly([[12, 25], [17, 12], [22, 25]], '#3a2418'); g.line(17, 12, 17, 25, '#f0c070');
    g.line(17, 1, 17, 4, '#6a4428'); g.line(2, 25, 0, 27, '#d8c8a8'); g.line(32, 25, 34, 27, '#d8c8a8');
    for (let y = 8; y < 24; y += 4) g.line(17 - (y - 3) * 0.66, y, 17 + (y - 3) * 0.66, y, '#c47a32');
    g.shadeAll(0.4);
  }, true));
  addCanvas(scene, 'campfire', fx(18, 12, g => {
    g.ell(9, 9, 8, 2.6, '#00000040');
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.ell(9 + Math.cos(a) * 6.5, 8.6 + Math.sin(a) * 2.2, 1.6, 1.2, i % 2 ? '#8a8a90' : '#a8a8b0'); }
    g.rell(9, 8, 6, 1.3, 0.5, '#6b4226'); g.rell(9, 8, 6, 1.3, -0.5, '#8b5a2b');
    g.ell(9, 7.6, 2.6, 1.2, '#ff8030'); g.ell(9, 7.4, 1.4, 0.7, '#ffe070');
    g.shadeAll(0.5);
  }, true));
  addCanvas(scene, 'rain', fx(2, 8, g => g.line(1, 0, 0, 7, '#a8c8f8c0')));
  addCanvas(scene, 'snow', fx(3, 3, g => { g.px(1, 0, '#ffffff'); g.px(0, 1, '#ffffff'); g.px(1, 1, '#ffffff'); g.px(2, 1, '#ffffff'); g.px(1, 2, '#ffffff'); }));
  addCanvas(scene, 'ember', fx(2, 2, g => g.rect(0, 0, 2, 2, '#ffa040')));
  addCanvas(scene, 'firefly', fx(3, 3, g => { g.px(1, 1, '#f8ff80'); g.px(0, 1, '#d8f06080'); g.px(2, 1, '#d8f06080'); g.px(1, 0, '#d8f06080'); g.px(1, 2, '#d8f06080'); }));
  addCanvas(scene, 'butterfly', fx(5, 4, g => { g.rect(0, 0, 2, 2, '#f8f0a0'); g.rect(3, 0, 2, 2, '#f8f0a0'); g.rect(2, 1, 1, 3, '#504030'); }));
  addCanvas(scene, 'spore', fx(2, 2, g => g.rect(0, 0, 2, 2, '#e8f0a0c0')));
  addCanvas(scene, 'fog', radial(64, 'rgba(220,220,235,0.35)', 'rgba(220,220,235,0)'));
  addCanvas(scene, 'portal', fx(32, 32, g => { g.ell(16, 16, 15, 15, '#7030c0'); g.ell(16, 16, 11, 11, '#a060f0'); g.ell(16, 16, 7, 7, '#2a1048'); g.ell(16, 16, 3, 3, '#f0d0ff'); }));
  addCanvas(scene, 'selring', fx(28, 12, g => { g.ell(14, 6, 13.5, 5.5, '#ffffff'); g.ell(14, 6, 11.5, 4, '#00000000'); }));
  // aura de rareza: anillo en el suelo con relleno tenue
  addCanvas(scene, 'aura', fx(30, 12, g => { g.ell(15, 6, 14.5, 5.5, '#ffffffd0'); g.ell(15, 6, 12.5, 4.3, '#ffffff40'); g.ell(15, 6, 8, 2.6, '#ffffff22'); }));
  // cofre caído (loot de salvajes)
  for (let t = 0; t < 4; t++) addCanvas(scene, `dropchest:${t}`, objectArt('chest', t).toCanvas());
  // signo de exclamación para emboscadas
  addCanvas(scene, 'excl', fx(9, 14, g => { g.rect(0, 0, 9, 14, '#00000000'); g.ell(4.5, 6, 4.5, 6, '#ffffff'); g.rect(3.5, 2, 2, 6, '#e03030'); g.rect(3.5, 9.5, 2, 2, '#e03030'); }, true));
  addCanvas(scene, 'excly', fx(9, 14, g => { g.ell(4.5, 6, 4.5, 6, '#ffffff'); g.rect(3.5, 2, 2, 6, '#e0a020'); g.rect(3.5, 9.5, 2, 2, '#e0a020'); }, true));
  addCanvas(scene, 'pillar', radial(64, 'rgba(255,240,180,0.9)', 'rgba(255,240,180,0)'));
  addCanvas(scene, 'slash', fx(16, 16, g => {
    g.poly([[1, 14], [3, 10], [9, 4], [14, 1], [12, 4], [6, 10], [1, 14]], '#ffffff');
    g.line(4, 12, 13, 3, '#ffffff');
  }));
  addCanvas(scene, 'frost', fx(9, 9, g => {
    g.line(4, 0, 4, 8, '#ffffff'); g.line(0, 4, 8, 4, '#ffffff');
    g.line(1, 1, 7, 7, '#d8f0ff'); g.line(1, 7, 7, 1, '#d8f0ff');
    g.px(4, 4, '#ffffff');
  }));
  addCanvas(scene, 'shadoworb', fx(12, 12, g => {
    g.ell(6, 6, 5.5, 5.5, '#401860'); g.ell(6, 6, 4, 4, '#6a2098');
    g.ell(5, 5, 2.5, 2.5, '#b050f8'); g.px(4, 4, '#f0d0ff');
  }));
  addCanvas(scene, 'ripple', fx(16, 16, g => {
    g.ell(8, 8, 7.5, 7.5, '#ffffff'); g.ell(8, 8, 6.0, 6.0, '#00000000');
  }));
  addCanvas(scene, 'meteor', fx(12, 12, g => {
    g.poly([[6, 0], [10, 4], [9, 10], [3, 11], [1, 6]], '#f05020');
    g.ell(6, 6, 3.5, 3.5, '#f8b030');
    g.px(5, 5, '#fff8b0');
  }, true));
  addCanvas(scene, 'sludge', fx(10, 10, g => {
    g.ell(5, 5, 4.2, 3.8, '#7030a0');
    g.ell(4, 4, 2.5, 2.0, '#a050e0');
    g.px(3, 3, '#e0a0ff');
    g.ell(8, 2, 1.2, 1.2, '#7030a0');
  }, true));
  addCanvas(scene, 'heart', fx(9, 8, g => {
    g.poly([[4, 7], [1, 4], [0, 2], [1, 0], [3, 0], [4, 2], [5, 0], [7, 0], [8, 2], [7, 4]], '#f05888');
    g.px(2, 1, '#ffffff');
  }, true));
}

export { SPECIES };
