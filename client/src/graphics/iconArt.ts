// Iconos 16x16 de objetos, recursos y habilidades (para la interfaz).
import { PixelArt, shade } from './pixel';
import { TYPE_COLORS, PType } from '../../../shared/types';

const K = '#18101e', W = '#ffffff';

function ball(top: string, deco?: (g: PixelArt) => void) {
  const g = new PixelArt(16, 16);
  g.ellIf(8, 8, 6.5, 6.5, top, (_x, y) => y < 8); g.ellIf(8, 8, 6.5, 6.5, '#f4f4f4', (_x, y) => y >= 8);
  g.shadeAll(); if (deco) deco(g);
  g.rect(1.5, 7, 13, 1.5, K); g.ell(8, 8, 2.2, 2.2, W); g.ell(8, 8, 1, 1, '#c8c8c8'); g.px(5, 4, '#ffffffb0');
  g.outline(); return g;
}

export function iconArt(id: string): PixelArt {
  switch (id) {
    case 'pokeball': return ball('#e83030');
    case 'superball': return ball('#3868d8', g => { g.rect(4, 3, 2, 3, '#e83030'); g.rect(10, 3, 2, 3, '#e83030'); });
    case 'ultraball': return ball('#303038', g => { g.rect(4, 3, 2, 4, '#f8d030'); g.rect(10, 3, 2, 4, '#f8d030'); g.rect(4, 5, 8, 1, '#f8d030'); });
    case 'masterball': return ball('#8040b0', g => { g.ell(4.5, 4.5, 1.5, 1.5, '#f070b0'); g.ell(11.5, 4.5, 1.5, 1.5, '#f070b0'); g.px(7, 3, W); g.px(8, 4, W); g.px(9, 3, W); });
    case 'pocion': case 'superpocion': {
      const g = new PixelArt(16, 16);
      const c = id === 'pocion' ? '#a050d0' : '#f0a030';
      g.rect(6, 1, 4, 3, '#c8c8d0'); g.rect(7, 4, 2, 2, '#e8e8f0');
      g.ell(8, 10, 5, 5, c); g.rect(5, 6, 6, 4, c);
      g.shadeAll(); g.px(6, 8, W); g.px(6, 9, W); g.rect(6, 10, 4, 2, W); g.rect(7, 9, 2, 4, W);
      g.outline(); return g;
    }
    case 'revivir': {
      const g = new PixelArt(16, 16);
      g.poly([[8, 1], [14, 8], [8, 15], [2, 8]], '#f8d830'); g.shadeAll(); g.poly([[8, 4], [11, 8], [8, 12], [5, 8]], '#fff4a0');
      g.outline(); return g;
    }
    case 'piedra_fuego': case 'piedra_agua': case 'piedra_trueno': case 'piedra_hoja': case 'piedra_lunar': {
      const g = new PixelArt(16, 16);
      const base = { piedra_fuego: '#f07830', piedra_agua: '#4890e8', piedra_trueno: '#78c050', piedra_hoja: '#3a9a40', piedra_lunar: '#58506a' }[id]!;
      g.poly([[8, 1], [14, 6], [12, 14], [4, 14], [2, 6]], base);
      g.shadeAll();
      if (id === 'piedra_fuego') { g.poly([[8, 4], [11, 9], [8, 12], [5, 9]], '#f8d040'); g.px(8, 7, '#fff8c0'); }
      if (id === 'piedra_agua') { g.ell(8, 9.5, 2.5, 3, '#a8e0ff'); g.poly([[8, 4], [10, 8], [6, 8]], '#a8e0ff'); }
      if (id === 'piedra_trueno') { g.poly([[9, 3], [5, 9], [8, 9], [7, 13], [11, 7], [8, 7]], '#f8e040'); }
      if (id === 'piedra_hoja') { g.rell(8, 8, 2, 5, 0.6, '#a8e070'); g.line(5, 11, 11, 5, '#2a6a2a'); }
      if (id === 'piedra_lunar') { g.ell(8, 8, 3.5, 3.5, '#d8d8f0'); g.ell(9.5, 7, 3, 3, '#58506a'); }
      g.outline(); return g;
    }
    case 'cable_link': {
      const g = new PixelArt(16, 16);
      g.curve([[3, 4], [8, 3], [12, 7], [8, 11], [12, 13]], '#7080a0', 2);
      g.rect(1, 2, 4, 4, '#c8c8d8'); g.rect(11, 11, 4, 4, '#c8c8d8'); g.shadeAll(); g.px(2, 3, '#f8d030'); g.px(13, 13, '#f8d030');
      g.outline(); return g;
    }
    case 'caramelo_raro': case 'candy': {
      const g = new PixelArt(16, 16);
      const c = id === 'candy' ? '#f0a0c0' : '#5890e8';
      g.poly([[1, 5], [4, 8], [1, 11]], c); g.poly([[15, 5], [12, 8], [15, 11]], c);
      g.ell(8, 8, 4.5, 4, c); g.shadeAll(); g.line(6, 5, 10, 11, W); g.px(6, 6, W);
      g.outline(); return g;
    }
    case 'incienso': {
      const g = new PixelArt(16, 16);
      g.ell(8, 11, 5, 4, '#8a5aa0'); g.rect(5, 6, 6, 3, '#a070c0'); g.shadeAll();
      g.curve([[8, 5], [6, 3], [9, 1]], '#e0d0f0'); g.px(10, 3, '#f8e0ff');
      g.outline(); return g;
    }
    case 'money': {
      const g = new PixelArt(16, 16);
      g.ell(8, 8, 6.5, 6.5, '#f0c030'); g.shadeAll(); g.ell(8, 8, 4.5, 4.5, '#f8d850');
      g.rect(6, 4, 1, 8, '#a87818'); g.rect(6, 4, 4, 1, '#a87818'); g.rect(9, 5, 1, 2, '#a87818'); g.rect(6, 7, 4, 1, '#a87818'); g.rect(5, 9, 4, 1, '#a87818');
      g.outline(); return g;
    }
    case 'crystal': {
      const g = new PixelArt(16, 16);
      g.poly([[8, 1], [13, 6], [8, 15], [3, 6]], '#58d8f0'); g.shadeAll(); g.poly([[8, 3], [10, 6], [8, 11], [6, 6]], '#c8f8ff'); g.line(3, 6, 13, 6, '#2898c0');
      g.outline(); return g;
    }
    case 'token': {
      const g = new PixelArt(16, 16);
      g.poly([[7, 1], [13, 5], [11, 14], [4, 13], [2, 6]], '#d04878'); g.shadeAll(); g.poly([[7, 4], [10, 6], [9, 11], [5, 10]], '#f898b8'); g.px(6, 5, W);
      g.outline(); return g;
    }
    case 'xp': {
      const g = new PixelArt(16, 16);
      g.poly([[8, 1], [10, 6], [15, 6], [11, 9], [13, 15], [8, 11], [3, 15], [5, 9], [1, 6], [6, 6]], '#f8d030'); g.shadeAll(); g.outline(); return g;
    }
    case 'sk_rush': {
      const g = new PixelArt(16, 16);
      g.poly([[10, 1], [3, 9], [7, 9], [5, 15], [13, 6], [9, 6]], '#f86030'); g.shadeAll(); g.outline(); return g;
    }
    case 'sk_heal': {
      const g = new PixelArt(16, 16);
      g.rect(6, 2, 4, 12, '#48c858'); g.rect(2, 6, 12, 4, '#48c858'); g.shadeAll(); g.outline(); return g;
    }
    case 'sk_order': {
      const g = new PixelArt(16, 16);
      g.ell(8, 8, 6, 6, '#f8d030'); g.shadeAll(); g.poly([[8, 3], [9.5, 7], [13, 7], [10, 9.5], [11, 13], [8, 10.5], [5, 13], [6, 9.5], [3, 7], [6.5, 7]], '#ffffff'); g.outline(); return g;
    }
    case 'sk_dash': {
      const g = new PixelArt(16, 16);
      g.rell(10, 8, 5, 3, -0.4, '#58b8f0'); g.line(1, 5, 5, 5, '#a8e0ff'); g.line(0, 8, 5, 8, '#a8e0ff'); g.line(1, 11, 5, 11, '#a8e0ff');
      g.shadeAll(); g.outline(); return g;
    }
  }
  if (id.startsWith('ess_')) {
    const t = id.slice(4) as PType;
    const c = TYPE_COLORS[t] || '#888888';
    const g = new PixelArt(16, 16);
    g.ell(8, 8, 5.5, 5.5, c); g.shadeAll(); g.ell(6.5, 6.5, 1.6, 1.6, shade(c, 0.6)); g.px(6, 6, W);
    g.outline(); return g;
  }
  const g = new PixelArt(16, 16); g.ell(8, 8, 5, 5, '#888888'); g.outline(); return g;
}

const cache = new Map<string, string>();
export function iconURL(id: string, scale = 2): string {
  const k = id + '@' + scale;
  let u = cache.get(k);
  if (!u) { u = iconArt(id).toCanvas(scale).toDataURL(); cache.set(k, u); }
  return u;
}
