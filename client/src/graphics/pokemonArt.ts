// Fan art pixel art original de cada especie, dibujado por código (formas + sombreado + contorno).
// Todos miran a la izquierda; el juego los voltea al moverse a la derecha.
import { PixelArt, shade } from './pixel';

type Pal = Record<string, string>;
export interface Art { pal: Pal; shiny: Pal; draw: (g: PixelArt, c: Pal) => void; }

const K = '#18101e', W = '#ffffff';
const T0 = '#00000000';

export const ART: Record<string, Art> = {
  // ------------------------------------------------------------ Bulbasaur
  bulbasaur: {
    pal: { body: '#6cc4a8', spot: '#3e9278', bulb: '#5cb24c', bulbD: '#3a8a30', eye: '#d03838' },
    shiny: { body: '#a8d858', spot: '#78a830', bulb: '#d8b040', bulbD: '#a88020', eye: '#d03838' },
    draw(g, c) {
      g.ell(24, 27, 2.5, 3, c.body); g.ell(19, 28, 2.5, 2.5, c.body);
      g.ell(18, 23, 9, 5.5, c.body);
      g.ell(21, 15, 7, 6.5, c.bulb); g.poly([[21, 6], [16.5, 12], [25.5, 12]], c.bulb);
      g.ell(9, 27, 2.6, 2.6, c.body); g.ell(14, 28, 2.5, 2.2, c.body);
      g.ell(10, 19, 7.5, 6, c.body);
      g.poly([[4, 16], [3.5, 10], [8.5, 13.5]], c.body); g.poly([[13, 14], [16, 9.5], [16.5, 15]], c.body);
      g.shadeAll();
      g.line(21, 8, 21, 20, c.bulbD); g.line(17.5, 12, 15.5, 19, c.bulbD); g.line(24.5, 12, 26.5, 19, c.bulbD);
      g.rect(12, 14, 2, 1, c.spot); g.rect(16, 21, 2, 2, c.spot); g.rect(23, 24, 2, 1, c.spot); g.rect(7, 23, 1, 1, c.spot); g.rect(20, 26, 2, 1, c.spot);
      g.rect(5, 17, 3, 3, W); g.rect(6, 17, 2, 2, c.eye); g.px(7, 18, K);
      g.rect(11, 17, 3, 3, W); g.rect(12, 17, 2, 2, c.eye); g.px(13, 18, K);
      g.line(6, 22, 12, 22, '#2e5a48'); g.px(9, 23, '#d06070');
      g.px(8, 29, W); g.px(13, 29, W);
    },
  },
  ivysaur: {
    pal: { body: '#68b2a8', spot: '#3e8278', leaf: '#4aa040', leafD: '#2f7a2a', bud: '#e870a0', budD: '#b04878', eye: '#d03838' },
    shiny: { body: '#9cd070', spot: '#6a9a40', leaf: '#c0a838', leafD: '#907818', bud: '#f0a0c0', budD: '#c06890', eye: '#d03838' },
    draw(g, c) {
      g.ell(25, 27, 2.6, 3, c.body); g.ell(20, 28, 2.5, 2.5, c.body);
      g.ell(18, 23, 9.5, 5.5, c.body);
      g.rell(12, 14, 6.5, 2.6, -0.3, c.leaf); g.rell(27, 14, 5, 2.4, 0.3, c.leaf);
      g.rell(15, 9, 5, 2.2, -0.75, c.leaf); g.rell(25, 9, 5, 2.2, 0.75, c.leaf);
      g.ell(20, 11, 4, 4.5, c.bud); g.poly([[20, 4], [17, 9], [23, 9]], c.bud);
      g.ell(9, 27, 2.6, 2.6, c.body); g.ell(14, 28, 2.5, 2.2, c.body);
      g.ell(10, 20, 7.5, 5.8, c.body);
      g.poly([[4, 17], [3.5, 11], [8.5, 14.5]], c.body); g.poly([[13, 15], [16, 10.5], [16.5, 16]], c.body);
      g.shadeAll();
      g.line(7, 14, 17, 14, c.leafD); g.line(23, 14, 30, 14, c.leafD); g.line(12, 7, 17, 11, c.leafD); g.line(28, 7, 23, 11, c.leafD);
      g.line(20, 6, 20, 14, c.budD);
      g.rect(12, 16, 2, 1, c.spot); g.rect(17, 22, 2, 2, c.spot); g.rect(24, 24, 2, 1, c.spot);
      g.rect(5, 18, 3, 3, W); g.rect(6, 18, 2, 2, c.eye); g.px(7, 19, K);
      g.rect(11, 18, 3, 3, W); g.rect(12, 18, 2, 2, c.eye); g.px(13, 19, K);
      g.line(5, 23, 12, 23, '#2e5a48');
      g.px(8, 29, W); g.px(13, 29, W);
    },
  },
  venusaur: {
    pal: { body: '#58aa98', spot: '#357a70', leaf: '#3e9a3a', leafD: '#26702a', petal: '#f07a90', petalD: '#c04860', dot: '#fff0f0', trunk: '#a87848', eye: '#c03030' },
    shiny: { body: '#88c868', spot: '#5a9040', leaf: '#c8b030', leafD: '#98801a', petal: '#f8c0d8', petalD: '#d090b0', dot: '#ffffff', trunk: '#a87848', eye: '#c03030' },
    draw(g, c) {
      g.rell(10, 19, 10, 3.5, -0.25, c.leaf); g.rell(38, 19, 9, 3.5, 0.25, c.leaf);
      g.rell(15, 12, 8.5, 3, -0.7, c.leaf); g.rell(33, 12, 8.5, 3, 0.7, c.leaf);
      g.rect(21, 10, 6, 12, c.trunk);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.ell(24 + Math.cos(a) * 7.5, 9 + Math.sin(a) * 3.2, 5.5, 3.2, c.petal); }
      g.ell(24, 9, 3.5, 2.2, '#f8e070');
      g.ell(37, 41, 4, 4.2, c.body); g.ell(30, 43, 4, 3.5, c.body);
      g.ell(26, 34, 16, 9, c.body);
      g.ell(11, 42, 4.5, 4.2, c.body); g.ell(19, 43, 4, 3.5, c.body);
      g.ell(13, 30, 10, 8, c.body);
      g.poly([[5, 26], [5, 19], [10, 23]], c.body); g.poly([[18, 23], [22, 18], [22, 25]], c.body);
      g.shadeAll();
      g.line(4, 19, 19, 19, c.leafD); g.line(30, 19, 46, 19, c.leafD); g.line(10, 7, 20, 15, c.leafD); g.line(38, 7, 28, 15, c.leafD);
      g.px(17, 8, c.dot); g.px(30, 8, c.dot); g.px(24, 5, c.dot); g.px(20, 11, c.dot); g.px(28, 12, c.dot);
      g.line(14, 8, 18, 10, c.petalD); g.line(34, 8, 30, 10, c.petalD);
      g.rect(14, 26, 3, 2, c.spot); g.rect(25, 31, 3, 2, c.spot); g.rect(33, 35, 2, 2, c.spot); g.rect(9, 34, 2, 1, c.spot);
      g.rect(6, 27, 4, 3, W); g.rect(7, 27, 3, 2, c.eye); g.px(9, 28, K); g.line(5, 26, 10, 27, K);
      g.rect(15, 27, 4, 3, W); g.rect(16, 27, 3, 2, c.eye); g.px(18, 28, K); g.line(14, 27, 19, 26, K);
      g.line(5, 34, 15, 34, '#2a4a40'); g.px(9, 35, '#d06070'); g.px(10, 35, '#d06070');
      g.px(8, 45, W); g.px(11, 45, W); g.px(14, 45, W); g.px(18, 46, W);
    },
  },
  // ------------------------------------------------------------ Charmander
  charmander: {
    pal: { body: '#f08838', belly: '#f8d888', flame: '#f8c830', flame2: '#f05020' },
    shiny: { body: '#f8c040', belly: '#f8eec0', flame: '#f8c830', flame2: '#f05020' },
    draw(g, c) {
      g.curve([[20, 25], [24, 25.5], [26.5, 22], [27, 19]], c.body, 3);
      g.ell(12, 27.5, 3, 2.4, c.body); g.ell(19, 27.5, 3, 2.4, c.body);
      g.ell(15.5, 21, 6, 6.5, c.body);
      g.ell(14.5, 22.5, 3.6, 4.5, c.belly);
      g.ell(9.5, 19.5, 2.4, 1.6, c.body); g.ell(21.5, 19.5, 2.2, 1.6, c.body);
      g.ell(14, 11, 7.5, 6.5, c.body);
      g.shadeAll();
      g.ell(27, 13.5, 3.2, 4.8, c.flame2); g.ell(27, 14.8, 2, 3.2, c.flame); g.px(27, 9, '#f8e8a0'); g.px(26, 15, '#fff8c0');
      g.eye(9, 9, 2, 3); g.eye(16, 9, 2, 3);
      g.line(8, 14, 13, 15, '#802010'); g.px(7, 12, '#a04020');
      g.px(7, 20, W); g.px(10, 29, W); g.px(17, 29, W); g.px(21, 29, W);
    },
  },
  charmeleon: {
    pal: { body: '#e05838', belly: '#f8d898', flame: '#f8c830', flame2: '#f04818' },
    shiny: { body: '#f0c050', belly: '#f8f0c8', flame: '#f8c830', flame2: '#f04818' },
    draw(g, c) {
      g.curve([[21, 26], [25, 26], [28, 22], [29, 18]], c.body, 3);
      g.ell(12, 28, 3.2, 2.4, c.body); g.ell(19.5, 28, 3.2, 2.4, c.body);
      g.ell(15.5, 20.5, 6, 7.2, c.body);
      g.ell(14.5, 22, 3.5, 5, c.belly);
      g.rell(9, 19, 3, 1.6, 0.6, c.body); g.rell(22, 19, 3, 1.6, -0.6, c.body);
      g.ell(14, 9.5, 6.5, 5.5, c.body); g.ell(8, 11.5, 3.2, 2.6, c.body);
      g.poly([[17, 6], [25, 3], [19.5, 9.5]], c.body);
      g.shadeAll();
      g.ell(29, 12.5, 2.8, 4.8, c.flame2); g.ell(29, 13.8, 1.6, 3, c.flame); g.px(29, 8, '#f8e8a0');
      g.eye(10, 8, 2, 2); g.eye(15, 8, 2, 2); g.line(9, 6, 12, 7, K); g.line(14, 7, 17, 6, K);
      g.line(5, 12, 11, 13, '#701808'); g.px(6, 13, W);
      g.px(6, 21, W); g.px(25, 21, W); g.px(10, 30, W); g.px(18, 30, W);
    },
  },
  charizard: {
    pal: { body: '#f08030', belly: '#f8d888', wing: '#3a8ca8', wingD: '#26627a', flame: '#f8c830', flame2: '#f04818' },
    shiny: { body: '#383842', belly: '#c8a070', wing: '#c03028', wingD: '#801818', flame: '#f8c830', flame2: '#f04818' },
    draw(g, c) {
      g.poly([[18, 22], [5, 6], [2, 11], [5, 15], [2, 20], [8, 24], [15, 27]], c.wing);
      g.poly([[30, 22], [43, 5], [46, 10], [43, 14], [46, 20], [40, 24], [33, 27]], c.wing);
      g.curve([[30, 38], [37, 40.5], [41.5, 36], [42.5, 31]], c.body, 4);
      g.ell(18, 42.5, 4.5, 3.8, c.body); g.ell(30, 42.5, 4.5, 3.8, c.body);
      g.ell(24, 32, 9, 10, c.body);
      g.ell(23, 34, 5.5, 7, c.belly);
      g.rell(15, 29, 4, 2, 0.6, c.body); g.rell(33, 29, 4, 2, -0.6, c.body);
      g.ell(22, 21, 4, 5, c.body);
      g.ell(20, 13, 7, 5.5, c.body); g.ell(14, 15.5, 4.5, 3, c.body);
      g.poly([[23, 9], [30, 4], [25.5, 11]], c.body); g.poly([[25, 11.5], [31, 9], [26, 13.5]], c.body);
      g.shadeAll();
      g.line(18, 22, 5, 6, shade(c.body, -0.15)); g.line(30, 22, 43, 5, shade(c.body, -0.15));
      g.line(6, 16, 15, 25, c.wingD); g.line(9, 12, 16, 23, c.wingD); g.line(42, 16, 33, 25, c.wingD); g.line(39, 12, 32, 23, c.wingD);
      g.ell(42.5, 25, 3.6, 5.2, c.flame2); g.ell(42.5, 26.5, 2.2, 3.5, c.flame); g.px(42, 20, '#f8e8a0');
      g.eye(17, 11, 2, 3); g.line(16, 10, 20, 11, K);
      g.line(10, 17, 17, 17, '#701808'); g.px(11, 16, W);
      g.line(20, 32, 26, 32, shade(c.belly, -0.2)); g.line(20, 35, 26, 35, shade(c.belly, -0.2)); g.line(21, 38, 25, 38, shade(c.belly, -0.2));
      g.px(14, 45, W); g.px(17, 46, W); g.px(28, 46, W); g.px(32, 46, W);
    },
  },
  // ------------------------------------------------------------ Squirtle
  squirtle: {
    pal: { skin: '#80c0ea', shell: '#c88040', shellD: '#8a5020', plastron: '#f0e0a0', eye: '#7a2a18' },
    shiny: { skin: '#94d8c4', shell: '#d8a040', shellD: '#9a7020', plastron: '#f8f0c8', eye: '#7a2a18' },
    draw(g, c) {
      g.ell(26, 25, 3.6, 3.6, c.skin); g.ell(26.5, 24.5, 1.4, 1.4, T0);
      g.ell(16, 21, 8.5, 8, c.shell);
      g.ell(15.5, 21.5, 6, 6.5, c.plastron);
      g.ell(11, 28.3, 3, 2.2, c.skin); g.ell(20.5, 28.3, 3, 2.2, c.skin);
      g.ell(7.5, 19, 2.6, 2, c.skin); g.ell(24, 19, 2.6, 2, c.skin);
      g.ell(15, 10.5, 7.5, 6.5, c.skin);
      g.shadeAll();
      const pl = shade(c.plastron, -0.28);
      g.line(11, 19, 20, 19, pl); g.line(10, 22, 21, 22, pl); g.line(11, 25, 20, 25, pl); g.line(15.5, 16, 15.5, 27, pl);
      g.rect(10, 8, 2, 3, c.eye); g.px(10, 8, W); g.rect(17, 8, 2, 3, c.eye); g.px(17, 8, W);
      g.line(11, 14, 16, 14, '#3a3050'); g.px(10, 13, '#3a3050');
      g.px(24, 26, shade(c.skin, -0.3));
    },
  },
  wartortle: {
    pal: { skin: '#8890e0', shell: '#b87838', plastron: '#f0e0a0', fur: '#f4f4ff', furD: '#b8c0e8', eye: '#6a2010' },
    shiny: { skin: '#90c8d0', shell: '#c89048', plastron: '#f8f0c8', fur: '#ffffff', furD: '#c0d8e0', eye: '#6a2010' },
    draw(g, c) {
      g.ell(26, 21, 5, 6.5, c.fur); g.ell(27, 20, 2.4, 3, c.furD);
      g.ell(15.5, 21, 8, 8, c.shell);
      g.ell(15, 21.5, 5.5, 6.5, c.plastron);
      g.ell(10.5, 28.3, 3, 2.2, c.skin); g.ell(20, 28.3, 3, 2.2, c.skin);
      g.ell(7, 19, 2.6, 2, c.skin); g.ell(23.5, 19, 2.6, 2, c.skin);
      g.ell(14, 10.5, 7, 6, c.skin);
      g.rell(7, 4.5, 2.6, 4.5, -0.5, c.fur); g.rell(21, 4.5, 2.6, 4.5, 0.5, c.fur);
      g.shadeAll();
      const pl = shade(c.plastron, -0.28);
      g.line(10, 19, 19, 19, pl); g.line(10, 22, 20, 22, pl); g.line(11, 25, 19, 25, pl);
      g.rect(9, 9, 2, 2, c.eye); g.px(9, 9, W); g.rect(16, 9, 2, 2, c.eye); g.px(16, 9, W);
      g.line(9, 8, 11, 8, K); g.line(16, 8, 18, 8, K);
      g.line(10, 13, 16, 13, '#3a3050'); g.px(15, 14, W);
    },
  },
  blastoise: {
    pal: { skin: '#5878c8', shell: '#b07038', plastron: '#f0e0a0', cannon: '#b8b8c8', cannonD: '#606078', eye: '#4a1810' },
    shiny: { skin: '#8070b8', shell: '#a87848', plastron: '#f8f0c8', cannon: '#c8c8d0', cannonD: '#606078', eye: '#4a1810' },
    draw(g, c) {
      g.ell(24, 30, 15.5, 14, c.shell);
      g.rect(7, 11, 7, 10, c.cannon); g.rect(6, 8, 9, 4, c.cannon);
      g.rect(34, 11, 7, 10, c.cannon); g.rect(33, 8, 9, 4, c.cannon);
      g.ell(24, 32, 9.5, 11, c.plastron);
      g.ell(15.5, 44, 5, 3.4, c.skin); g.ell(32.5, 44, 5, 3.4, c.skin);
      g.ell(8.5, 30, 4.5, 3.5, c.skin); g.ell(39.5, 30, 4.5, 3.5, c.skin);
      g.ell(22, 17, 8, 7, c.skin);
      g.poly([[16, 12], [15, 7], [19, 10]], c.skin); g.poly([[27, 10], [30, 6], [30, 12]], c.skin);
      g.shadeAll();
      g.ell(10.5, 9.5, 2.5, 1.2, c.cannonD); g.ell(37.5, 9.5, 2.5, 1.2, c.cannonD);
      const pl = shade(c.plastron, -0.28);
      g.line(17, 27, 31, 27, pl); g.line(16, 31, 32, 31, pl); g.line(17, 35, 31, 35, pl); g.line(19, 39, 29, 39, pl);
      g.rect(15, 15, 3, 3, W); g.rect(16, 16, 2, 2, c.eye); g.line(14, 14, 18, 15, K);
      g.rect(23, 15, 3, 3, W); g.rect(24, 16, 2, 2, c.eye); g.line(23, 15, 27, 14, K);
      g.line(17, 21, 25, 21, '#2a2a48');
      g.px(5, 32, W); g.px(7, 33, W); g.px(41, 33, W); g.px(43, 32, W);
    },
  },
  // ------------------------------------------------------------ Caterpie
  caterpie: {
    pal: { body: '#78c040', ring: '#f8d838', belly: '#f0d898', antenna: '#e03020' },
    shiny: { body: '#f0c838', ring: '#f8f080', belly: '#f8ecc0', antenna: '#e03020' },
    draw(g, c) {
      g.ell(26, 26, 3.5, 3.5, c.body); g.ell(21, 24.5, 4.5, 4.5, c.body); g.ell(16, 21.5, 5, 5, c.body);
      g.ell(26, 28.5, 2.5, 1.4, c.belly); g.ell(21, 28, 3, 1.4, c.belly); g.ell(16, 25.5, 3.2, 1.4, c.belly);
      g.poly([[9, 10], [6.5, 3], [9.5, 5.5], [11.5, 2.5], [12.5, 9.5]], c.antenna);
      g.ell(10, 15, 6.5, 6.5, c.body);
      g.ell(8, 20, 3.5, 1.6, c.belly);
      g.shadeAll();
      g.ell(21, 22.5, 1.6, 1.6, c.ring); g.ell(26, 24, 1.2, 1.2, c.ring); g.ell(16.5, 19.5, 1.7, 1.7, c.ring);
      g.ell(6.5, 13.5, 2.2, 2.6, K); g.px(5, 12, W); g.ell(13, 13.5, 1.6, 2, K); g.px(12, 12, W);
      g.px(8, 18, '#402030'); g.px(9, 18, '#402030');
    },
  },
  metapod: {
    pal: { body: '#78b848', bodyD: '#4a8a30' },
    shiny: { body: '#e8b030', bodyD: '#b07818' },
    draw(g, c) {
      g.rell(17, 18, 7.5, 12, 0.45, c.body);
      g.poly([[21, 3], [24, 8], [17, 8]], c.body);
      g.poly([[10, 27], [15, 30.5], [17, 26]], c.body);
      g.shadeAll();
      g.curve([[22, 8], [24, 15], [21, 24], [16, 28]], c.bodyD);
      g.line(10, 19, 15, 21, c.bodyD); g.line(12, 23, 17, 25, c.bodyD);
      g.rect(10, 13, 4, 1, c.bodyD); g.rect(10, 14, 4, 1, K); g.px(13, 14, W);
    },
  },
  butterfree: {
    pal: { body: '#4848a8', wing: '#f8f8f8', edge: '#28283a', eye: '#e03850' },
    shiny: { body: '#e070b0', wing: '#fff4fa', edge: '#3a2840', eye: '#40b8e0' },
    draw(g, c) {
      g.ell(8, 10, 7, 6.5, c.edge); g.ell(8, 10, 5.8, 5.3, c.wing);
      g.ell(9, 21, 5.5, 4.5, c.edge); g.ell(9, 21, 4.3, 3.3, c.wing);
      g.ell(16, 19, 3, 6, c.body);
      g.ell(16, 11, 5, 4.5, c.body);
      g.line(14, 24, 13, 28, c.body);
      g.curve([[14, 7], [12, 3], [10, 2]], c.body);
      g.mirror();
      g.shadeAll();
      for (const s of [1, -1]) {
        const X = (x: number) => (s > 0 ? x : 31 - x);
        g.ell(X(4), 6, 1.6, 1.6, c.edge); g.line(X(6), 9, X(11), 13, c.edge); g.ell(X(6), 21, 1.2, 1.2, c.edge);
        g.ell(X(13), 11, 2, 2.5, c.eye); g.px(X(12), 10, W);
      }
      g.px(15, 14, '#302040'); g.px(16, 14, '#302040');
    },
  },
  // ------------------------------------------------------------ Pidgey
  pidgey: {
    pal: { body: '#c89858', bodyD: '#906838', face: '#f0e0b8', beak: '#d8a080', feet: '#e0a080' },
    shiny: { body: '#d8c060', bodyD: '#a89040', face: '#f8f0c8', beak: '#d8a080', feet: '#e0a080' },
    draw(g, c) {
      g.poly([[23, 21], [30.5, 18], [30.5, 25]], c.bodyD);
      g.line(13, 27, 13, 29, c.feet); g.line(18, 27, 18, 29, c.feet); g.rect(11, 29, 3, 1, c.feet); g.rect(17, 29, 3, 1, c.feet);
      g.ell(17, 21, 8, 7, c.body);
      g.ell(14, 23, 5, 4.5, c.face);
      g.rell(21, 20, 5.5, 4, 0.4, c.bodyD);
      g.ell(12, 13, 6.5, 6, c.body);
      g.ell(9.5, 15.5, 4.5, 3.2, c.face);
      g.poly([[12, 7.5], [15.5, 3], [17, 8]], c.body); g.poly([[14, 8.5], [19.5, 5.5], [18, 10]], c.body);
      g.poly([[5.5, 14], [2, 16], [6, 17.5]], c.beak);
      g.shadeAll();
      g.line(9, 12, 14, 12, '#302020'); g.rect(8, 12, 2, 2, K); g.px(8, 12, W);
      g.line(19, 18, 24, 22, shade(c.bodyD, -0.3)); g.line(19, 21, 23, 24, shade(c.bodyD, -0.3));
    },
  },
  pidgeotto: {
    pal: { body: '#b88048', bodyD: '#805028', face: '#f0dcb0', crest: '#e04828', crest2: '#f8c838', beak: '#d89070', feet: '#d89070' },
    shiny: { body: '#c8b058', bodyD: '#987830', face: '#f8f0c8', crest: '#f070a0', crest2: '#f8d0e0', beak: '#d89070', feet: '#d89070' },
    draw(g, c) {
      g.poly([[22, 20], [31, 17], [31, 22], [29, 25]], c.crest); g.poly([[23, 21], [30, 19], [29, 23]], c.crest2);
      g.line(13, 27, 13, 29, c.feet); g.line(18, 27, 18, 29, c.feet); g.rect(11, 29, 3, 1, c.feet); g.rect(17, 29, 3, 1, c.feet);
      g.ell(17, 20, 8.5, 7.5, c.body);
      g.ell(14, 22.5, 5.5, 5, c.face);
      g.rell(21.5, 19, 6, 4.2, 0.4, c.bodyD);
      g.ell(12, 12, 6.5, 6, c.body);
      g.ell(9.5, 14.5, 4.5, 3, c.face);
      g.poly([[13, 7], [25, 1], [23, 5], [28, 4], [18, 10.5]], c.crest);
      g.poly([[5.5, 13], [1.5, 15], [3.5, 17], [6.5, 16.5]], c.beak);
      g.shadeAll();
      g.poly([[16, 7], [24, 3], [19, 8]], c.crest2);
      g.line(9, 11, 15, 11, '#302020'); g.rect(8, 11, 2, 2, K); g.px(8, 11, W);
      g.line(19, 17, 25, 21, shade(c.bodyD, -0.3)); g.line(18, 20, 24, 24, shade(c.bodyD, -0.3));
    },
  },
  pidgeot: {
    pal: { body: '#c08848', bodyD: '#86582c', face: '#f0dcb0', crest: '#e85030', crest2: '#f8d040', beak: '#d89070', feet: '#d89070' },
    shiny: { body: '#d0b060', bodyD: '#a08038', face: '#f8f0c8', crest: '#5aa0e0', crest2: '#a8e0f8', beak: '#d89070', feet: '#d89070' },
    draw(g, c) {
      g.poly([[31, 30], [46, 21], [47, 31], [46, 42]], c.crest); g.poly([[33, 31], [44, 25], [44, 38]], c.crest2);
      g.line(19, 40, 19, 45, c.feet); g.line(26, 40, 26, 45, c.feet); g.rect(16, 45, 5, 1, c.feet); g.rect(24, 45, 5, 1, c.feet);
      g.ell(24, 30, 11, 10, c.body);
      g.ell(21, 33, 7, 7, c.face);
      g.rell(30, 28, 9, 5.5, 0.5, c.bodyD);
      g.ell(17, 17, 8, 7, c.body);
      g.ell(13.5, 20.5, 6, 4, c.face);
      g.poly([[18, 10], [38, 2], [35, 7], [44, 6], [36, 11], [24, 15]], c.crest);
      g.poly([[8, 18], [2, 20], [5, 23], [10, 22]], c.beak);
      g.shadeAll();
      g.poly([[21, 10], [36, 4], [26, 12]], c.crest2); g.poly([[30, 9], [42, 7], [34, 10]], c.crest2);
      g.line(11, 16, 20, 16, '#302020'); g.rect(11, 16, 3, 2, K); g.px(11, 16, W);
      g.line(27, 25, 36, 31, shade(c.bodyD, -0.3)); g.line(26, 29, 34, 35, shade(c.bodyD, -0.3));
    },
  },
  // ------------------------------------------------------------ Rattata
  rattata: {
    pal: { body: '#a070c0', belly: '#f0e0c0', ear: '#f0a8b8', eye: '#d02838' },
    shiny: { body: '#c8d058', belly: '#f8f0d0', ear: '#f0a8b8', eye: '#d02838' },
    draw(g, c) {
      g.curve([[24, 24], [28, 22], [30, 17], [28.5, 13.5], [26, 14.5]], c.body, 2);
      g.ell(23, 27.5, 2.5, 2.4, c.body); g.ell(12, 28, 2.4, 2, c.body); g.ell(17, 28.3, 2.4, 1.8, c.body);
      g.ell(18, 22.5, 7.5, 5.8, c.body);
      g.ell(16, 25.5, 5, 2.8, c.belly);
      g.ell(11, 11, 3.5, 4.2, c.body); g.ell(16.5, 12.5, 3, 3.6, c.body);
      g.ell(10, 18, 6, 5.5, c.body);
      g.ell(5, 20.5, 3.2, 2.6, c.belly);
      g.shadeAll();
      g.ell(11, 11, 2, 2.6, c.ear); g.ell(16.5, 12.5, 1.6, 2, c.ear);
      g.rect(8, 16, 2, 3, c.eye); g.px(8, 16, W);
      g.rect(3, 22, 2, 2, W); g.px(2, 19, '#402030');
      g.line(3, 20, 0, 19, '#5a4060'); g.line(4, 21, 1, 22, '#5a4060');
    },
  },
  raticate: {
    pal: { body: '#c89058', belly: '#f0e0c0', ear: '#e8b098', eye: '#18101e' },
    shiny: { body: '#d07850', belly: '#f8e8d0', ear: '#e8b098', eye: '#18101e' },
    draw(g, c) {
      g.curve([[25, 24], [29, 22], [30.5, 17]], c.belly, 3);
      g.ell(24, 27.5, 3, 2.6, c.body); g.ell(12, 28.3, 2.8, 2, c.body); g.ell(18, 28.5, 2.8, 1.8, c.body);
      g.ell(18.5, 21.5, 8.5, 6.5, c.body);
      g.ell(17, 25, 6, 3.5, c.belly);
      g.ell(13, 10, 3, 3.5, c.body);
      g.ell(10, 16.5, 6.5, 6, c.body);
      g.ell(5, 19.5, 3.5, 3, c.belly);
      g.poly([[16, 15], [21, 11], [20, 17]], c.body); g.poly([[18, 17], [23, 14], [22, 19]], c.body);
      g.shadeAll();
      g.ell(13, 10, 1.6, 2, c.ear);
      g.rect(8, 14, 2, 2, c.eye); g.px(8, 14, W); g.line(7, 13, 10, 14, K);
      g.rect(3, 21, 2, 4, W); g.px(2, 18, '#402030');
      g.line(3, 19, 0, 17, W); g.line(3, 20, 0, 21, W);
    },
  },
  // ------------------------------------------------------------ Pikachu
  pikachu: {
    pal: { body: '#f8d030', tip: '#262030', cheek: '#e83838', stripe: '#a86020' },
    shiny: { body: '#f8b028', tip: '#262030', cheek: '#e83838', stripe: '#a86020' },
    draw(g, c) {
      g.poly([[20, 24], [24, 21], [22, 19], [27, 15], [25, 13], [30, 8], [31, 13], [28, 15.5], [30, 18], [25, 22], [27, 24], [22, 27]], c.body);
      g.ell(12, 28.3, 2.6, 1.8, c.body); g.ell(19, 28.3, 2.6, 1.8, c.body);
      g.ell(15.5, 22, 6, 6.5, c.body);
      g.ell(10.5, 21, 1.8, 1.5, c.body); g.ell(20.5, 21, 1.8, 1.5, c.body);
      g.ell(15, 13, 7, 6, c.body);
      g.poly([[10, 10], [5, 0.5], [8, 1], [13, 8.5]], c.body); g.poly([[18, 8.5], [24, 0.5], [26.5, 2], [21, 10.5]], c.body);
      g.shadeAll();
      g.poly([[20, 24], [22, 27], [24, 25], [22, 22.5]], c.stripe);
      g.poly([[5, 0.5], [8, 1], [7.6, 4], [6, 3.5]], c.tip); g.poly([[24, 0.5], [26.5, 2], [24.8, 4.5], [23, 3]], c.tip);
      g.ell(9.5, 15.5, 1.8, 1.6, c.cheek); g.ell(20.5, 15.5, 1.8, 1.6, c.cheek);
      g.eye(11, 11, 2, 3); g.eye(17, 11, 2, 3);
      g.px(14, 14, '#302020'); g.px(13, 16, '#802020'); g.px(15, 16, '#802020'); g.px(14, 15, '#802020');
    },
  },
  raichu: {
    pal: { body: '#f09030', belly: '#f8e0a8', ear: '#9a5a28', earIn: '#f8d030', tail: '#302828', bolt: '#f8d030', cheek: '#f8d030' },
    shiny: { body: '#d07040', belly: '#f8e8c8', ear: '#7a4020', earIn: '#f8d030', tail: '#302828', bolt: '#f8d030', cheek: '#f8d030' },
    draw(g, c) {
      g.curve([[20, 25], [25, 24.5], [28, 20], [29, 14]], c.tail, 1);
      g.poly([[27, 14], [31, 6], [29.5, 11], [31.5, 11], [27, 17]], c.bolt);
      g.ell(11.5, 28.3, 3, 2, c.body); g.ell(19.5, 28.3, 3, 2, c.body);
      g.ell(15.5, 21, 6.5, 7, c.body);
      g.ell(15, 23, 4, 4.5, c.belly);
      g.ell(9.5, 20, 2, 1.6, c.body); g.ell(21.5, 20, 2, 1.6, c.body);
      g.ell(15, 12, 7, 6, c.body);
      g.poly([[10, 9], [3, 1.5], [5, 0.5], [12.5, 7]], c.ear); g.poly([[18, 7], [25, 0.5], [27, 2], [21, 10]], c.ear);
      g.shadeAll();
      g.ell(5, 2.5, 1.2, 1.2, c.earIn); g.ell(25.3, 2.3, 1.2, 1.2, c.earIn);
      g.ell(9.5, 14.5, 1.8, 1.6, c.cheek); g.ell(20.5, 14.5, 1.8, 1.6, c.cheek);
      g.eye(11, 10, 2, 3); g.eye(17, 10, 2, 3);
      g.ell(14.5, 15.5, 1.5, 1.2, '#802020'); g.px(14, 16, '#e06070');
    },
  },
  // ------------------------------------------------------------ Jigglypuff
  jigglypuff: {
    pal: { body: '#f8b0c8', bodyD: '#e080a0', eye: '#30a0b0' },
    shiny: { body: '#f8cce0', bodyD: '#e8a0c0', eye: '#50c060' },
    draw(g, c) {
      g.ell(11, 28.5, 3.2, 1.8, c.body);
      g.ell(16, 18, 10.5, 10, c.body);
      g.poly([[7, 10], [5, 3], [11.5, 8]], c.body);
      g.ell(5, 20, 2, 2, c.body);
      g.ell(15.5, 8, 2.5, 2.5, c.body);
      g.mirror();
      g.shadeAll();
      g.poly([[6.5, 8], [5.6, 4.2], [9, 7.5]], '#302838'); g.poly([[25.5, 8], [26.4, 4.2], [23, 7.5]], '#302838');
      g.curve([[16, 10], [14, 8], [15, 5.5], [17.5, 6.5]], c.bodyD, 1);
      for (const x of [11, 21]) { g.ell(x, 17, 3, 3.5, W); g.ell(x + 0.5, 17.5, 2, 2.5, c.eye); g.rect(x, 17, 1, 2, K); g.px(x - 1, 15, W); }
      g.px(15, 22, '#a04060'); g.px(16, 22, '#a04060');
    },
  },
  wigglytuff: {
    pal: { body: '#f8b0c8', belly: '#f8f0f2', eye: '#3888c0', earIn: '#f8d8e4' },
    shiny: { body: '#f0cce8', belly: '#ffffff', eye: '#50a050', earIn: '#fff0f8' },
    draw(g, c) {
      g.ell(11, 29, 3.2, 1.6, c.body);
      g.ell(16, 19, 10, 10.5, c.body);
      g.ell(16, 22, 6, 6.5, c.belly);
      g.rell(8, 6, 3, 6, -0.35, c.body);
      g.ell(5, 21, 2, 2.4, c.body);
      g.mirror();
      g.ell(16, 9, 4.5, 3.2, c.belly); g.ell(14, 7, 2, 2, c.belly);
      g.shadeAll();
      g.rell(8, 6.5, 1.5, 4, -0.35, c.earIn); g.rell(24, 6.5, 1.5, 4, 0.35, c.earIn);
      for (const x of [11, 20]) { g.ell(x, 15.5, 2.5, 2.8, W); g.ell(x + 0.5, 16, 1.6, 2, c.eye); g.px(x, 16, K); g.px(x - 1, 14, W); }
      g.line(14, 20, 18, 20, '#a04060');
    },
  },
  // ------------------------------------------------------------ Zubat
  zubat: {
    pal: { body: '#6878d0', wing: '#9060b0', wingD: '#5a3a80', mouth: '#a02040' },
    shiny: { body: '#68c070', wing: '#e080b0', wingD: '#a05080', mouth: '#a02040' },
    draw(g, c) {
      g.poly([[12, 12], [1, 6], [3, 11], [1, 15], [5, 16], [3, 20], [10, 18], [13, 17]], c.wing);
      g.line(14, 20, 12, 29, c.body); g.line(12, 29, 10, 30, c.body);
      g.ell(16, 15, 5, 6, c.body);
      g.poly([[12, 11], [10, 1], [14.5, 8]], c.body);
      g.mirror();
      g.shadeAll();
      g.line(12, 12, 3, 11, c.wingD); g.line(12, 15, 5, 16, c.wingD); g.line(19, 12, 28, 11, c.wingD); g.line(19, 15, 26, 16, c.wingD);
      g.poly([[11.5, 9], [10.5, 3.5], [13.5, 8]], c.wing); g.poly([[20.5, 9], [21.5, 3.5], [18.5, 8]], c.wing);
      g.ell(16, 17, 2.6, 2, c.mouth); g.px(14, 16, W); g.px(17, 16, W);
    },
  },
  golbat: {
    pal: { body: '#5870c8', wing: '#a060b0', wingD: '#6a3a80', mouth: '#b02040', tongue: '#e06080' },
    shiny: { body: '#70c070', wing: '#e080b0', wingD: '#a05080', mouth: '#b02040', tongue: '#e06080' },
    draw(g, c) {
      g.poly([[10, 13], [0.5, 4], [2, 10], [0.5, 15], [4, 17], [2, 22], [9, 20], [11, 19]], c.wing);
      g.ell(13, 25.5, 1.6, 1.6, c.body);
      g.ell(16, 15, 8, 9, c.body);
      g.poly([[10, 9], [8, 2], [13, 6]], c.body);
      g.mirror();
      g.shadeAll();
      g.line(10, 13, 2, 10, c.wingD); g.line(10, 16, 4, 17, c.wingD); g.line(21, 13, 29, 10, c.wingD); g.line(21, 16, 27, 17, c.wingD);
      g.ell(16, 17.5, 5.5, 5, c.mouth); g.ell(16, 20.5, 3, 1.8, c.tongue);
      g.rect(12, 13, 1, 2, W); g.rect(19, 13, 1, 2, W); g.px(13, 22, W); g.px(18, 22, W);
      g.line(10, 9, 12, 10, K); g.line(21, 9, 19, 10, K);
    },
  },
  crobat: {
    pal: { body: '#8048a8', wing: '#a060c0', wingD: '#5a2a80', eye: '#f8d030', pupil: '#d02020' },
    shiny: { body: '#e070b0', wing: '#f090c0', wingD: '#b05080', eye: '#f8d030', pupil: '#d02020' },
    draw(g, c) {
      g.poly([[20, 20], [2, 4], [5, 12], [1.5, 18], [8, 20], [4, 26], [16, 26]], c.wing);
      g.poly([[20, 30], [5, 32], [9, 36], [5, 41], [18, 38]], c.wing);
      g.ell(24, 26, 7, 8, c.body);
      g.poly([[19, 20], [16, 10], [22.5, 17]], c.body);
      g.ell(22, 35, 1.5, 2.5, c.body);
      g.mirror();
      g.shadeAll();
      g.line(20, 20, 5, 12, c.wingD); g.line(18, 24, 8, 20, c.wingD); g.line(27, 20, 42, 12, c.wingD); g.line(29, 24, 39, 20, c.wingD);
      g.line(19, 31, 9, 36, c.wingD); g.line(28, 31, 38, 36, c.wingD);
      g.ell(20.5, 24, 2.5, 2, c.eye); g.px(20, 24, c.pupil); g.ell(27.5, 24, 2.5, 2, c.eye); g.px(27, 24, c.pupil);
      g.line(20, 29, 27, 29, '#401838'); g.px(21, 30, W); g.px(26, 30, W);
    },
  },
  // ------------------------------------------------------------ Oddish
  oddish: {
    pal: { body: '#4868b8', leaf: '#58b040', leafD: '#3a8028', eye: '#d02838' },
    shiny: { body: '#78b8c8', leaf: '#a0c050', leafD: '#708030', eye: '#d02838' },
    draw(g, c) {
      g.rell(9.5, 8.5, 2.8, 6.5, -0.6, c.leaf); g.rell(13, 6, 2.6, 6.5, -0.22, c.leaf); g.rell(16, 5, 2.6, 6.5, 0, c.leaf);
      g.ell(12, 28.5, 2.6, 1.8, c.body);
      g.ell(16, 21, 7, 7, c.body);
      g.mirror();
      g.shadeAll();
      g.line(16, 0, 16, 11, c.leafD); g.line(12, 1, 14, 11, c.leafD); g.line(19, 1, 17, 11, c.leafD); g.line(6, 5, 13, 12, c.leafD); g.line(25, 5, 18, 12, c.leafD);
      g.rect(12, 19, 2, 2, c.eye); g.px(12, 19, W); g.rect(18, 19, 2, 2, c.eye); g.px(18, 19, W);
      g.px(15, 23, '#302040'); g.px(16, 23, '#302040');
    },
  },
  gloom: {
    pal: { body: '#3858a0', petal: '#c84838', spot: '#e88070', drool: '#d8c040', eye: '#d02838', stamen: '#702020' },
    shiny: { body: '#78a0c8', petal: '#e8a030', spot: '#f8d080', drool: '#d8c040', eye: '#d02838', stamen: '#805020' },
    draw(g, c) {
      g.ell(12, 28.5, 3, 1.8, c.body);
      g.ell(16, 22, 7.5, 7, c.body);
      g.ell(8.5, 11, 6, 5, c.petal); g.ell(15.5, 8, 6, 5, c.petal); g.ell(12, 14, 6, 3, c.petal);
      g.mirror();
      g.shadeAll();
      g.ell(8, 10, 1.5, 1.2, c.spot); g.ell(14, 6, 1.5, 1.2, c.spot); g.ell(24, 10, 1.5, 1.2, c.spot); g.ell(18, 6, 1.5, 1.2, c.spot);
      g.ell(16, 11, 2.5, 2, c.stamen);
      g.rect(11, 20, 3, 1, K); g.rect(18, 20, 3, 1, K);
      g.ell(16, 25, 2, 1.5, '#401020'); g.line(17, 26, 17, 29, c.drool);
    },
  },
  vileplume: {
    pal: { body: '#3050a0', petal: '#d83838', spot: '#f8d8d8', center: '#702050', eye: '#d02838' },
    shiny: { body: '#60a0d0', petal: '#e070c0', spot: '#fff0f8', center: '#802060', eye: '#d02838' },
    draw(g, c) {
      g.ell(18, 44.5, 4.5, 2.5, c.body);
      g.ell(24, 34, 10, 10, c.body);
      g.ell(10, 18, 10, 7, c.petal); g.ell(17, 10, 9, 6, c.petal); g.ell(24, 19, 9, 7, c.petal);
      g.mirror();
      g.shadeAll();
      for (const [x, y] of [[8, 16], [12, 21], [16, 8], [20, 12], [5, 20]]) { g.ell(x, y, 1.8, 1.3, c.spot); g.ell(47 - x, y, 1.8, 1.3, c.spot); }
      g.ell(24, 16, 4.5, 3, c.center); g.ell(24, 15, 2, 1.2, shade(c.center, 0.3));
      g.rect(19, 31, 3, 2, c.eye); g.px(19, 31, W); g.rect(26, 31, 3, 2, c.eye); g.px(26, 31, W);
      g.line(22, 37, 26, 37, '#201030');
    },
  },
  // ------------------------------------------------------------ Psyduck
  psyduck: {
    pal: { body: '#f0d048', beak: '#f8e8b0', hair: '#302820' },
    shiny: { body: '#88c8f0', beak: '#f8f0d0', hair: '#302820' },
    draw(g, c) {
      g.ell(10.5, 29, 3.2, 1.5, c.beak); g.ell(20.5, 29, 3.2, 1.5, c.beak);
      g.ell(15.5, 22, 7, 7, c.body);
      g.ell(15.5, 12, 7.5, 6.5, c.body);
      g.line(9, 21, 7, 15, c.body, 2); g.line(22, 21, 24, 15, c.body, 2);
      g.ell(7, 13, 2.3, 2.6, c.body); g.ell(24, 13, 2.3, 2.6, c.body);
      g.shadeAll();
      g.ell(15.5, 16, 4.2, 2.1, c.beak); g.line(12, 16, 19, 16, shade(c.beak, -0.35));
      g.ell(12, 11.5, 2.2, 2.2, W); g.px(12, 11, K); g.ell(19, 11.5, 2.2, 2.2, W); g.px(19, 11, K);
      g.line(14, 6, 13, 2, c.hair); g.line(16, 6, 16, 1, c.hair); g.line(18, 6, 19, 2, c.hair);
    },
  },
  golduck: {
    pal: { body: '#4888d0', beak: '#f0e0a0', gem: '#e03038', eye: '#e03038' },
    shiny: { body: '#a8d4f0', beak: '#f8ecc0', gem: '#e03038', eye: '#e03038' },
    draw(g, c) {
      g.poly([[30, 36], [38, 38], [32, 41]], c.body);
      g.ell(19, 44, 4.2, 2.6, c.beak); g.ell(29, 44, 4.2, 2.6, c.beak);
      g.ell(24, 32, 8, 10, c.body);
      g.rell(15, 30, 5.5, 2.2, 0.7, c.body); g.rell(33, 30, 5.5, 2.2, -0.7, c.body);
      g.ell(11, 34, 2.8, 2.4, c.beak); g.ell(37, 34, 2.8, 2.4, c.beak);
      g.ell(22, 15, 8, 7, c.body);
      g.poly([[28, 10], [35, 6], [31, 14]], c.body);
      g.shadeAll();
      g.ell(15, 18.5, 6, 2.6, c.beak); g.line(10, 19, 20, 19, shade(c.beak, -0.35));
      g.ell(22, 10, 1.6, 1.6, c.gem); g.px(21, 9, W);
      g.rect(17, 13, 3, 2, c.eye); g.px(17, 13, W); g.rect(23, 13, 3, 2, c.eye); g.px(23, 13, W);
    },
  },
  // ------------------------------------------------------------ Growlithe
  growlithe: {
    pal: { body: '#f08838', fur: '#f0e0b0', stripe: '#302828' },
    shiny: { body: '#f8c050', fur: '#f8f0d0', stripe: '#302828' },
    draw(g, c) {
      g.ell(27, 17, 3.2, 4.2, c.fur);
      g.ell(24.5, 26, 2.6, 3, c.body); g.ell(20, 27, 2.5, 2.5, c.body);
      g.ell(19, 21.5, 7.5, 5.5, c.body);
      g.ell(13, 21, 4, 5, c.fur);
      g.ell(11, 27.5, 2.3, 2.4, c.body); g.ell(15.5, 28, 2.3, 2, c.body);
      g.ell(10, 14, 6, 5.5, c.body);
      g.ell(11, 9, 4.2, 2.6, c.fur);
      g.poly([[13, 10], [16.5, 6.5], [16.5, 12.5]], c.body);
      g.ell(5, 16, 3.2, 2.5, c.fur);
      g.shadeAll();
      for (const [x, y] of [[19, 18], [22, 18], [25, 19], [24, 23], [10, 26], [16, 26]]) g.line(x, y, x + 1, y + 2, c.stripe);
      g.px(2, 15, c.stripe); g.rect(7, 12, 2, 2, K); g.px(7, 12, W);
      g.line(3, 18, 6, 18, '#602020');
    },
  },
  arcanine: {
    pal: { body: '#f08030', fur: '#f0e0b0', stripe: '#302828' },
    shiny: { body: '#f8c048', fur: '#f8f0d8', stripe: '#302828' },
    draw(g, c) {
      g.ell(41, 21, 4.5, 6, c.fur); g.ell(43, 16, 3, 3.5, c.fur);
      g.ell(36, 40, 3.5, 5, c.body); g.ell(31, 41, 3.5, 4.5, c.body);
      g.ell(29, 31, 11, 7.5, c.body);
      g.ell(16, 28, 8.5, 9, c.fur);
      g.ell(14, 41, 3.2, 5, c.body); g.ell(20, 42, 3.2, 4.5, c.body);
      g.ell(14, 17, 7, 6, c.body);
      g.ell(17, 11, 6.5, 3.5, c.fur); g.poly([[18, 8], [26, 5], [22, 11]], c.fur);
      g.poly([[17, 12], [21, 8], [21, 15]], c.body);
      g.ell(8, 19.5, 3.8, 3, c.fur);
      g.shadeAll();
      for (const [x, y] of [[27, 26], [31, 25], [35, 26], [38, 29], [30, 33], [34, 34], [14, 42], [20, 43], [36, 41]]) g.line(x, y, x + 1, y + 3, c.stripe);
      g.rect(4, 18, 2, 2, c.stripe); g.rect(11, 15, 3, 2, K); g.px(11, 15, W); g.line(10, 14, 14, 15, K);
      g.line(5, 22, 10, 22, '#602020'); g.px(7, 23, W);
      g.px(12, 46, W); g.px(15, 46, W); g.px(19, 46, W); g.px(22, 46, W);
    },
  },
  // ------------------------------------------------------------ Abra
  abra: {
    pal: { body: '#e0b850', armor: '#906848' },
    shiny: { body: '#f0d070', armor: '#7888a0' },
    draw(g, c) {
      g.curve([[22, 26], [27, 26.5], [29.5, 22]], c.body, 3);
      g.ell(11, 27.5, 3.5, 2.5, c.body); g.ell(20, 27.5, 3.5, 2.5, c.body);
      g.ell(15.5, 21, 6.5, 6, c.armor);
      g.ell(15.5, 21.5, 5.5, 2, c.body);
      g.ell(15.5, 11, 7, 6, c.body);
      g.poly([[10, 7], [8, 1], [13.5, 5.5]], c.body); g.poly([[21, 7], [23, 1], [17.5, 5.5]], c.body);
      g.shadeAll();
      g.line(11, 11, 13, 11, K); g.line(18, 11, 20, 11, K);
      g.ell(15.5, 14, 2, 1.2, shade(c.body, -0.15)); g.px(15, 14, '#704020');
      g.line(10, 18, 13, 20, shade(c.armor, -0.3)); g.line(21, 18, 18, 20, shade(c.armor, -0.3));
    },
  },
  kadabra: {
    pal: { body: '#e0b040', armor: '#906848', star: '#e03028', spoon: '#c8c8d8', stache: '#a07030' },
    shiny: { body: '#f0c8a0', armor: '#7888a0', star: '#e03028', spoon: '#c8c8d8', stache: '#b08860' },
    draw(g, c) {
      g.curve([[21, 27], [26, 27.5], [29, 24], [29.5, 19]], c.body, 3);
      g.ell(11.5, 28.5, 3, 2, c.body); g.ell(19.5, 28.5, 3, 2, c.body);
      g.ell(15.5, 21, 6, 6.5, c.armor);
      g.ell(15.5, 20, 4, 4, c.body);
      g.line(9, 18, 6, 23, c.body, 2); g.line(22, 18, 24, 22, c.body, 2);
      g.ell(15, 10, 6.5, 5.5, c.body);
      g.poly([[10, 7], [7, 0.5], [12.5, 5]], c.body); g.poly([[20, 7], [24, 0.5], [18, 5]], c.body);
      g.shadeAll();
      g.line(5, 25, 3, 16, c.spoon); g.ell(3, 14.5, 1.6, 2.2, c.spoon);
      g.px(15, 6, c.star); g.px(14, 7, c.star); g.px(16, 7, c.star); g.px(15, 8, c.star);
      g.rect(11, 10, 3, 1, K); g.rect(17, 10, 3, 1, K); g.px(12, 9, '#e03030'); g.px(18, 9, '#e03030');
      g.curve([[13, 13], [9, 15], [7, 18]], c.stache); g.curve([[17, 13], [21, 15], [23, 18]], c.stache);
    },
  },
  alakazam: {
    pal: { body: '#e0b040', armor: '#8a6448', spoon: '#c8c8d8', stache: '#d8c8a0' },
    shiny: { body: '#f0c8a0', armor: '#7888a0', spoon: '#c8c8d8', stache: '#e8dcc0' },
    draw(g, c) {
      g.line(20, 34, 18, 44, c.body, 3); g.line(28, 34, 30, 44, c.body, 3);
      g.ell(17, 45, 3.5, 1.6, c.body); g.ell(31, 45, 3.5, 1.6, c.body);
      g.ell(24, 30, 7, 7, c.armor);
      g.ell(24, 27, 5, 4, c.body);
      g.line(17, 25, 10, 31, c.body, 3); g.line(31, 25, 38, 31, c.body, 3);
      g.ell(24, 14, 8, 7.5, c.body);
      g.poly([[18, 9], [14, 1], [21, 6]], c.body); g.poly([[30, 9], [34, 1], [27, 6]], c.body);
      g.shadeAll();
      g.line(9, 33, 7, 21, c.spoon); g.ell(7, 19, 2, 2.8, c.spoon); g.line(39, 33, 41, 21, c.spoon); g.ell(41, 19, 2, 2.8, c.spoon);
      g.rect(19, 13, 3, 2, K); g.rect(26, 13, 3, 2, K); g.px(20, 12, '#e03030'); g.px(27, 12, '#e03030');
      g.curve([[21, 18], [17, 22], [15, 28], [14, 33]], c.stache, 2); g.curve([[27, 18], [31, 22], [33, 28], [34, 33]], c.stache, 2);
      g.line(19, 26, 29, 26, shade(c.armor, -0.3));
    },
  },
  // ------------------------------------------------------------ Geodude
  geodude: {
    pal: { rock: '#a09880', rockD: '#6a6250' },
    shiny: { rock: '#c8b060', rockD: '#8a7438' },
    draw(g, c) {
      g.ell(7, 14, 4, 3, c.rock); g.ell(3.5, 19, 3.2, 3.6, c.rock);
      g.ell(16, 16, 8, 7.5, c.rock);
      g.mirror();
      g.shadeAll();
      g.line(11, 11, 13, 13, c.rockD); g.line(19, 21, 21, 22, c.rockD); g.line(15, 9, 17, 8, c.rockD); g.px(22, 12, c.rockD);
      g.line(2, 19, 5, 19, c.rockD); g.line(26, 19, 29, 19, c.rockD);
      g.rect(11, 15, 3, 2, K); g.px(11, 15, W); g.line(10, 13, 14, 15, '#302820');
      g.rect(18, 15, 3, 2, K); g.px(18, 15, W); g.line(21, 13, 17, 15, '#302820');
      g.line(14, 20, 18, 20, '#302820');
    },
  },
  graveler: {
    pal: { rock: '#a89878', rockD: '#706048' },
    shiny: { rock: '#c8a868', rockD: '#8a7040' },
    draw(g, c) {
      g.ell(5, 13, 3.2, 2.6, c.rock); g.ell(6, 22, 3.2, 2.6, c.rock);
      g.ell(12, 28.5, 3, 2, c.rock);
      g.ell(16, 17, 9, 8.5, c.rock);
      g.ell(9.5, 10, 4, 3.5, c.rock); g.ell(16, 8, 4, 3.5, c.rock);
      g.mirror();
      g.shadeAll();
      g.line(9, 9, 11, 11, c.rockD); g.line(20, 7, 22, 9, c.rockD); g.line(10, 22, 12, 24, c.rockD); g.line(21, 21, 23, 23, c.rockD);
      g.rect(11, 15, 3, 2, K); g.px(11, 15, W); g.line(10, 13, 14, 15, '#302820');
      g.rect(18, 15, 3, 2, K); g.px(18, 15, W); g.line(21, 13, 17, 15, '#302820');
      g.rect(14, 20, 4, 2, '#3a2020'); g.px(14, 20, W); g.px(17, 20, W);
    },
  },
  golem: {
    pal: { shell: '#a08868', shellD: '#6a5440', skin: '#c8c0a8', eye: '#d03028' },
    shiny: { shell: '#b07850', shellD: '#7a4a30', skin: '#c8d0b0', eye: '#d03028' },
    draw(g, c) {
      g.ell(9, 30, 5, 4, c.skin); g.ell(5, 34, 3, 3, c.skin);
      g.ell(16, 43, 5, 3.5, c.skin);
      g.ell(24, 27, 15, 14, c.shell);
      g.ell(24, 23, 7, 6, c.skin);
      g.mirror();
      g.shadeAll();
      g.line(12, 20, 16, 30, c.shellD); g.line(36, 20, 32, 30, c.shellD); g.line(14, 34, 34, 34, c.shellD); g.line(18, 14, 24, 16, c.shellD); g.line(30, 14, 24, 16, c.shellD);
      g.rect(20, 21, 3, 2, c.eye); g.px(20, 21, W); g.rect(26, 21, 3, 2, c.eye); g.px(26, 21, W);
      g.line(19, 19, 23, 21, K); g.line(29, 19, 25, 21, K);
      g.line(22, 26, 26, 26, '#403020');
    },
  },
  // ------------------------------------------------------------ Magnemite
  magnemite: {
    pal: { steel: '#b8c0d0', steelD: '#707888', magR: '#e03838', magB: '#3868d8' },
    shiny: { steel: '#d8c080', steelD: '#987838', magR: '#e03838', magB: '#3868d8' },
    draw(g, c) {
      g.rect(3, 12, 5, 10, c.steel); g.rect(1, 12, 3, 3, c.magB); g.rect(1, 19, 3, 3, c.magR);
      g.ell(16, 16, 8, 8, c.steel);
      g.rect(15, 4, 2, 4, c.steelD); g.rect(13, 3, 6, 2, c.steel);
      g.rect(10, 23, 2, 3, c.steelD); g.rect(9, 25, 4, 2, c.steel);
      g.mirror();
      g.shadeAll();
      g.rect(1, 12, 3, 3, c.magB); g.rect(1, 19, 3, 3, c.magR); g.rect(28, 12, 3, 3, c.magR); g.rect(28, 19, 3, 3, c.magB);
      g.ell(16, 15.5, 4, 4, W); g.ell(16, 15.5, 1.6, 1.6, K); g.px(14, 13, W);
      g.line(14, 3, 17, 4, c.steelD);
    },
  },
  magneton: {
    pal: { steel: '#b0b8c8', steelD: '#6a7282', magR: '#e03838', magB: '#3868d8' },
    shiny: { steel: '#d8c080', steelD: '#987838', magR: '#e03838', magB: '#3868d8' },
    draw(g, c) {
      for (const [x, y] of [[9, 11], [23, 11], [16, 22]]) {
        g.rect(x - 7.5, y - 2, 3, 5, c.steel); g.rect(x + 4.5, y - 2, 3, 5, c.steel);
        g.ell(x, y, 5, 5, c.steel);
        g.rect(x - 0.5, y - 8, 2, 3, c.steelD);
      }
      g.shadeAll();
      for (const [x, y] of [[9, 11], [23, 11], [16, 22]]) {
        g.rect(x - 7.5, y - 2, 2, 2, c.magB); g.rect(x - 7.5, y + 1, 2, 2, c.magR); g.rect(x + 5.5, y - 2, 2, 2, c.magR); g.rect(x + 5.5, y + 1, 2, 2, c.magB);
        g.ell(x, y, 2.6, 2.6, W); g.rect(x - 0.5, y - 0.5, 1, 1, K);
      }
    },
  },
  // ------------------------------------------------------------ Gastly
  gastly: {
    pal: { ball: '#3e2e4e', gas: '#9060c070', mouth: '#a02050' },
    shiny: { ball: '#2e4a4a', gas: '#60c0c070', mouth: '#a02050' },
    draw(g, c) {
      g.ell(16, 16, 13.5, 12.5, c.gas);
      g.ell(5, 9, 3, 3, c.gas); g.ell(27, 10, 3, 3, c.gas); g.ell(6, 25, 3, 3, c.gas); g.ell(26, 25, 3, 3, c.gas);
      g.ell(16, 16, 8.5, 8.5, c.ball);
      g.shadeAll();
      g.poly([[9, 12], [14, 14], [13.5, 17], [9, 16]], W); g.rect(12, 14, 2, 2, K);
      g.poly([[23, 12], [18, 14], [18.5, 17], [23, 16]], W); g.rect(18, 14, 2, 2, K);
      g.poly([[10, 19], [22, 19], [16, 23.5]], c.mouth); g.px(12, 19, W); g.px(19, 19, W);
    },
  },
  haunter: {
    pal: { body: '#7050a8', bodyD: '#4a2e7a', mouth: '#a02050', tongue: '#e070a0' },
    shiny: { body: '#5070a8', bodyD: '#304a7a', mouth: '#a02050', tongue: '#e070a0' },
    draw(g, c) {
      g.poly([[10, 21], [22, 21], [19, 26], [15, 31], [14, 26]], c.body);
      g.ell(16, 15, 8.5, 8, c.body);
      g.poly([[9, 11], [3, 4], [11.5, 7.5]], c.body); g.poly([[13, 8], [14, 0.5], [18, 7]], c.body); g.poly([[20, 8], [26, 2.5], [23, 11]], c.body);
      g.ell(4, 19, 3, 2.5, c.body); g.poly([[1, 19], [0.5, 15], [3, 17]], c.body);
      g.ell(28, 14, 3, 2.5, c.body); g.poly([[30, 13], [31.5, 10], [29, 11.5]], c.body);
      g.shadeAll();
      g.poly([[9, 12], [14, 13.5], [13.5, 16], [9.5, 15]], W); g.rect(12, 13, 2, 2, K);
      g.poly([[23, 12], [18, 13.5], [18.5, 16], [22.5, 15]], W); g.rect(18, 13, 2, 2, K);
      g.poly([[10, 18], [22, 18], [16, 23]], c.mouth); g.ell(16, 21, 2, 1.2, c.tongue);
    },
  },
  gengar: {
    pal: { body: '#6848a0', bodyD: '#422a72', eye: '#f04848', mouth: '#f8f8f8' },
    shiny: { body: '#9a9aaa', bodyD: '#686878', eye: '#f04848', mouth: '#f8f8f8' },
    draw(g, c) {
      g.ell(15, 44, 5, 3, c.body); g.ell(33, 44, 5, 3, c.body);
      g.poly([[10, 24], [5, 14], [14, 19]], c.body); g.poly([[16, 18], [17, 8], [22, 16]], c.body);
      g.poly([[28, 17], [33, 8], [33, 18]], c.body); g.poly([[37, 23], [44, 15], [41, 26]], c.body);
      g.poly([[11, 21], [8, 9], [17.5, 17]], c.body); g.poly([[37, 21], [40, 9], [30.5, 17]], c.body);
      g.ell(24, 30, 15, 13, c.body);
      g.ell(8.5, 32, 4, 3.2, c.body); g.ell(39.5, 32, 4, 3.2, c.body);
      g.shadeAll();
      g.poly([[13, 23], [21, 26], [20, 29], [13, 27.5]], c.eye); g.px(18, 26, K); g.px(18, 27, K);
      g.poly([[35, 23], [27, 26], [28, 29], [35, 27.5]], c.eye); g.px(29, 26, K); g.px(29, 27, K);
      g.poly([[12, 33], [36, 33], [31, 38.5], [17, 38.5]], c.mouth);
      for (let x = 15; x <= 33; x += 3) g.line(x, 33, x, 38, '#c0b8c8');
      g.line(14, 35, 34, 35, '#c0b8c8');
    },
  },
  // ------------------------------------------------------------ Onix
  onix: {
    pal: { rock: '#a8a8b8', rockD: '#6a6a7a' },
    shiny: { rock: '#c8b858', rockD: '#8a7828' },
    draw(g, c) {
      const segs: number[][] = [[58, 57, 4], [51, 58, 5], [43, 56.5, 6], [36, 51, 6.5], [34, 43, 6.5], [37, 35, 6], [35, 27, 6], [29, 21, 6]];
      for (const [x, y, r] of segs) g.ell(x, y, r, r * 0.92, c.rock);
      g.ell(17, 16, 10.5, 7.5, c.rock);
      g.poly([[16, 9], [30, 4], [24, 11]], c.rock);
      g.shadeAll();
      for (const [x, y, r] of segs) { g.line(x - r * 0.5, y - r * 0.2, x + r * 0.2, y + r * 0.5, c.rockD); }
      g.line(10, 17, 18, 15, c.rockD);
      g.rect(10, 13, 3, 3, K); g.px(10, 13, W); g.line(9, 12, 14, 13, K);
      g.line(7, 20, 16, 20, '#3a3a48');
    },
  },
  // ------------------------------------------------------------ Voltorb
  voltorb: {
    pal: { top: '#e03838', bottom: '#f8f8f8' },
    shiny: { top: '#3878e0', bottom: '#f8f8f8' },
    draw(g, c) {
      g.ellIf(16, 17, 11, 11, c.top, (_x, y) => y < 17);
      g.ellIf(16, 17, 11, 11, c.bottom, (_x, y) => y >= 17);
      g.shadeAll();
      g.line(5, 17, 27, 17, '#402030');
      g.poly([[8, 11], [14, 13], [14, 15.5], [8, 15]], W); g.rect(12, 13, 2, 2, K);
      g.poly([[24, 11], [18, 13], [18, 15.5], [24, 15]], W); g.rect(18, 13, 2, 2, K);
      g.px(9, 8, shade(c.top, 0.4)); g.px(10, 7, shade(c.top, 0.4));
    },
  },
  electrode: {
    pal: { top: '#f8f8f8', bottom: '#e03838' },
    shiny: { top: '#f8f8f8', bottom: '#3878e0' },
    draw(g, c) {
      g.ellIf(16, 17, 11.5, 11.5, c.top, (_x, y) => y < 17);
      g.ellIf(16, 17, 11.5, 11.5, c.bottom, (_x, y) => y >= 17);
      g.shadeAll();
      g.line(5, 17, 27, 17, '#402030');
      g.rect(10, 12, 3, 3, K); g.px(10, 12, W); g.rect(19, 12, 3, 3, K); g.px(19, 12, W);
      g.line(8, 10, 13, 12, K); g.line(24, 10, 19, 12, K);
      g.poly([[9, 17], [23, 17], [16, 22]], '#401020'); g.line(10, 17, 22, 17, W);
    },
  },
  // ------------------------------------------------------------ Cubone
  cubone: {
    pal: { body: '#c09860', belly: '#f0e0b0', skull: '#f0ece0', bone: '#f0ece0' },
    shiny: { body: '#a0b048', belly: '#f0f0c0', skull: '#f0ece0', bone: '#f0ece0' },
    draw(g, c) {
      g.curve([[21, 25], [25, 26], [26.5, 23]], c.body, 2);
      g.ell(12, 28, 3, 2, c.body); g.ell(19, 28, 3, 2, c.body);
      g.ell(15.5, 21, 6, 6.5, c.body);
      g.ell(15, 22.5, 3.6, 4.5, c.belly);
      g.line(4, 26, 9, 15, c.bone, 2); g.ell(4, 26.5, 1.8, 1.8, c.bone); g.ell(9.5, 14.5, 1.8, 1.8, c.bone);
      g.ell(8, 20, 2, 1.6, c.body);
      g.ell(15, 11, 7.5, 6.5, c.skull);
      g.poly([[19, 6], [25.5, 3], [22, 9.5]], c.skull);
      g.ell(12, 15.5, 4.2, 2.6, c.body);
      g.shadeAll();
      g.rect(9, 9, 3, 3, '#3a2a2a'); g.px(10, 10, W); g.rect(15, 9, 3, 3, '#3a2a2a'); g.px(16, 10, W);
      g.line(13, 6, 15, 8, shade(c.skull, -0.3)); g.px(10, 16, '#402020');
    },
  },
  marowak: {
    pal: { body: '#a88050', belly: '#f0e0b0', skull: '#e8e4d8', bone: '#e8e4d8' },
    shiny: { body: '#8aa040', belly: '#f0f0c0', skull: '#e8e4d8', bone: '#e8e4d8' },
    draw(g, c) {
      g.curve([[21, 26], [26, 26.5], [28, 22]], c.body, 3);
      g.ell(12, 28.5, 3.2, 2, c.body); g.ell(19.5, 28.5, 3.2, 2, c.body);
      g.ell(15.5, 20.5, 6.5, 7, c.body);
      g.ell(15, 22, 4, 5, c.belly);
      g.line(2, 27, 9, 12, c.bone, 3); g.ell(2.5, 27.5, 2.2, 2.2, c.bone); g.ell(9.5, 11, 2.2, 2.2, c.bone);
      g.ell(8, 20, 2.2, 1.8, c.body);
      g.ell(15, 10, 8, 6.5, c.skull);
      g.poly([[19, 5], [27, 1], [23, 9]], c.skull); g.poly([[11, 6], [7, 1], [13, 4]], c.skull);
      g.ell(12, 14.5, 4.5, 2.6, c.body);
      g.shadeAll();
      g.rect(9, 8, 3, 3, '#3a2a2a'); g.px(10, 9, '#f8e8a0'); g.rect(16, 8, 3, 3, '#3a2a2a'); g.px(17, 9, '#f8e8a0');
      g.line(8, 7, 12, 8, K); g.line(19, 7, 15, 8, K);
      g.line(9, 15, 13, 15, '#402020');
    },
  },
  // ------------------------------------------------------------ Magikarp
  magikarp: {
    pal: { body: '#f05030', bodyD: '#b82818', fin: '#f8e0a0' },
    shiny: { body: '#f0c030', bodyD: '#b08818', fin: '#f8f0d0' },
    draw(g, c) {
      g.poly([[22, 16], [30.5, 8], [29.5, 16], [31, 25], [22, 19]], c.fin);
      g.poly([[9, 9], [12, 3], [15, 6], [18, 2], [21, 7], [22, 10], [12, 10]], c.fin);
      g.poly([[12, 24], [9.5, 29.5], [17, 26]], c.fin);
      g.ell(15, 17, 10, 8.5, c.body);
      g.shadeAll();
      for (const [x, y] of [[13, 14], [17, 13], [21, 15], [15, 18], [19, 19], [12, 21], [17, 22]]) g.curve([[x, y], [x + 1, y + 1], [x + 2, y]], c.bodyD);
      g.ell(9, 14, 3, 3, W); g.rect(9, 14, 2, 2, K);
      g.ell(5, 20, 3, 3, '#f8c0a0'); g.ell(5, 20, 1.6, 1.6, '#a02030');
      g.curve([[6, 17], [3, 14], [2, 10]], c.fin); g.curve([[7, 23], [4, 26], [3, 29]], c.fin);
      g.rell(16, 21, 3, 1.5, 0.5, c.fin);
    },
  },
  gyarados: {
    pal: { body: '#4878d8', bodyD: '#2f58a8', belly: '#f0e0a8', fin: '#f4f4fc', mouth: '#c02838' },
    shiny: { body: '#e04838', bodyD: '#a82820', belly: '#f0e0a8', fin: '#f4f4fc', mouth: '#7a1828' },
    draw(g, c) {
      const segs: number[][] = [[56, 56, 5], [49, 58, 6], [41, 57, 6.5], [35, 52, 7], [32, 45, 7], [34, 38, 7], [38, 31, 6.5], [36, 24, 6], [30, 20, 6]];
      g.poly([[58, 52], [63, 45], [62.5, 57], [63, 62], [55, 60]], c.fin);
      for (const [x, y, r] of segs) g.ell(x, y, r, r, c.body);
      for (const [x, y, r] of segs) g.ell(x - r * 0.25, y + r * 0.35, r * 0.6, r * 0.55, c.belly);
      for (const [x, y, r] of segs.slice(2)) g.poly([[x + r * 0.2, y - r * 0.8], [x + r * 0.9, y - r * 1.4], [x + r * 0.9, y - r * 0.4]], c.fin);
      g.poly([[15, 10], [9, 1], [19, 7], [22, 0.5], [26, 10]], c.fin);
      g.ell(18, 17, 11, 8, c.body);
      g.poly([[5, 19], [23, 21], [11, 30]], c.mouth);
      g.ell(13, 27, 6, 3, c.body);
      g.shadeAll();
      g.px(8, 20, W); g.px(11, 20, W); g.px(15, 21, W); g.px(10, 26, W); g.px(14, 25, W);
      g.curve([[9, 17], [4, 13], [1, 14]], c.fin); g.curve([[10, 18], [5, 22], [1, 21]], c.fin);
      g.rect(16, 13, 3, 2, K); g.px(16, 13, '#f8e040'); g.line(14, 11, 20, 13, K);
      g.px(9, 15, K);
    },
  },
  lapras: {
    pal: { body: '#58a8e8', belly: '#f0e8c8', shell: '#a8a0a8', knob: '#6a6270' },
    shiny: { body: '#c088d0', belly: '#f8ecd8', shell: '#c8c0b0', knob: '#7a6a70' },
    draw(g, c) {
      g.rell(12, 39, 7, 3, -0.3, c.body); g.rell(38, 41, 7, 3, 0.3, c.body);
      g.ell(29, 30, 14, 11, c.shell);
      g.ell(22, 35, 10, 7.5, c.belly);
      g.line(20, 31, 14, 14, c.body, 6);
      g.ell(12, 12, 7, 5.5, c.body);
      g.poly([[11, 7.5], [13, 1], [15.5, 7]], c.body);
      g.poly([[16, 10], [20, 7], [18, 12]], c.body);
      g.shadeAll();
      for (const [x, y] of [[26, 22], [33, 21], [38, 26], [30, 28], [22, 25]]) { g.ell(x, y, 2.6, 2, c.knob); g.px(x - 1, y - 1, shade(c.knob, 0.4)); }
      g.line(17, 22, 20, 30, shade(c.belly, -0.2));
      g.rect(8, 11, 2, 2, K); g.px(8, 11, W);
      g.line(5, 15, 9, 15, '#2a3a5a');
    },
  },
  // ------------------------------------------------------------ Eevee
  eevee: {
    pal: { body: '#c08850', fur: '#f0e0b0', earIn: '#503828' },
    shiny: { body: '#d0d0c8', fur: '#ffffff', earIn: '#605858' },
    draw(g, c) {
      g.ell(25, 15, 4.5, 6, c.body); g.ell(26, 10.5, 3, 3, c.fur);
      g.ell(22.5, 27.5, 2.5, 2.4, c.body);
      g.ell(18, 23, 6.5, 5, c.body);
      g.ell(12, 21, 5.5, 4.5, c.fur);
      g.ell(10, 28, 2, 2, c.body); g.ell(14.5, 28.3, 2, 1.8, c.body);
      g.ell(11, 13, 6, 5.5, c.body);
      g.poly([[8, 9], [2, 0.5], [10.5, 6]], c.body); g.poly([[13, 8], [18, 0.5], [16.5, 9.5]], c.body);
      g.shadeAll();
      g.poly([[7, 7.5], [4, 2.5], [9, 6]], c.earIn); g.poly([[14, 7.5], [17, 2.5], [15.5, 8]], c.earIn);
      g.eye(7, 12, 2, 3); g.eye(12, 12, 2, 3);
      g.px(9, 16, '#402020'); g.px(10, 17, '#a04040');
    },
  },
  vaporeon: {
    pal: { body: '#68a8e8', frill: '#f0f0f8', fin: '#3868b8' },
    shiny: { body: '#d078c8', frill: '#fff0fa', fin: '#9848a0' },
    draw(g, c) {
      g.curve([[23, 24], [27, 22], [29, 17]], c.body, 3);
      g.poly([[29, 17], [26, 10], [31, 12]], c.fin); g.poly([[29, 17], [31.5, 13], [31, 19]], c.fin);
      g.ell(22.5, 27.5, 2.5, 2.4, c.body);
      g.ell(18, 23, 7, 5, c.body);
      g.ell(10, 28, 2, 2, c.body); g.ell(14.5, 28.3, 2, 1.8, c.body);
      g.ell(13, 18.5, 5, 3.2, c.frill);
      g.ell(11, 13, 6, 5, c.body);
      g.poly([[8, 9], [2, 3], [7, 10]], c.frill); g.poly([[14, 9], [18, 2.5], [17, 10]], c.frill);
      g.poly([[11, 8], [15, 4], [16, 8]], c.fin);
      g.shadeAll();
      g.line(19, 19, 25, 21, c.fin);
      g.eye(7, 12, 2, 2); g.eye(12, 12, 2, 2);
      g.px(9, 16, '#2a3a5a');
    },
  },
  jolteon: {
    pal: { body: '#f8d048', fur: '#f8f8f8' },
    shiny: { body: '#c0e060', fur: '#ffffff' },
    draw(g, c) {
      g.poly([[22, 20], [30, 15], [27, 20], [31, 22], [24, 25]], c.body);
      g.line(22, 25, 22, 29, c.body, 2);
      g.ell(18, 22, 7, 4.8, c.body);
      g.poly([[15, 18], [19, 13], [20, 18], [24, 14], [24, 20]], c.body);
      g.poly([[8, 17], [17, 17], [16, 24], [12, 22], [9, 25]], c.fur);
      g.line(10, 25, 10, 29, c.body, 2); g.line(14.5, 25, 14.5, 29, c.body, 2);
      g.ell(11, 12.5, 5.8, 5, c.body);
      g.poly([[8, 9], [3, 0.5], [10.5, 6.5]], c.body); g.poly([[13, 8], [18, 0.5], [16.5, 9.5]], c.body);
      g.shadeAll();
      g.eye(7, 11, 2, 2); g.eye(12, 11, 2, 2);
      g.px(9, 15, '#402020');
    },
  },
  flareon: {
    pal: { body: '#f07838', fur: '#f8e0a0' },
    shiny: { body: '#f8c050', fur: '#f8f0d0' },
    draw(g, c) {
      g.ell(26, 17, 5, 6.5, c.fur);
      g.ell(22.5, 27.5, 2.5, 2.4, c.body);
      g.ell(18, 23, 7, 5, c.body);
      g.ell(12, 20.5, 6, 5.5, c.fur);
      g.ell(10, 28, 2.2, 2, c.body); g.ell(14.5, 28.3, 2.2, 1.8, c.body);
      g.ell(11, 13, 6, 5.5, c.body);
      g.ell(12, 7.5, 3.5, 2.5, c.fur);
      g.poly([[7, 10], [2, 1.5], [10, 6]], c.body); g.poly([[14, 8], [19, 1], [17, 10]], c.body);
      g.shadeAll();
      g.eye(7, 12, 2, 3); g.eye(12, 12, 2, 3);
      g.px(9, 16, '#402020');
    },
  },
  espeon: {
    pal: { body: '#d8a0d8', gem: '#e03038', eye: '#6a2878' },
    shiny: { body: '#a8d870', gem: '#e03038', eye: '#3a6828' },
    draw(g, c) {
      g.curve([[24, 22], [28, 19], [29, 13]], c.body, 1); g.curve([[24, 22], [29, 21], [31, 17]], c.body, 1);
      g.line(23, 24, 23, 29, c.body, 2); g.line(20, 25, 20, 29, c.body, 2);
      g.ell(18.5, 22.5, 6.5, 4, c.body);
      g.line(11, 24, 11, 29, c.body, 2); g.line(14.5, 25, 14.5, 29, c.body, 2);
      g.ell(13, 19, 3.5, 4, c.body);
      g.ell(10.5, 12.5, 5.5, 5, c.body);
      g.poly([[7, 9], [1.5, 1], [10.5, 6]], c.body); g.poly([[13, 8], [19, 0.5], [16.5, 10]], c.body);
      g.shadeAll();
      g.ell(10.5, 9.2, 1.2, 1.2, c.gem); g.px(10, 9, W);
      g.rect(7, 12, 2, 2, c.eye); g.px(7, 12, W); g.rect(12, 12, 2, 2, c.eye); g.px(12, 12, W);
      g.px(9, 16, '#402040');
    },
  },
  umbreon: {
    pal: { body: '#343444', ring: '#f8d048', eye: '#e03030' },
    shiny: { body: '#343444', ring: '#58b0f0', eye: '#f0d030' },
    draw(g, c) {
      g.ell(25.5, 17, 3.5, 6, c.body);
      g.line(23, 24, 23, 29, c.body, 2); g.line(20, 25, 20, 29, c.body, 2);
      g.ell(18.5, 22.5, 6.5, 4.2, c.body);
      g.line(11, 24, 11, 29, c.body, 2); g.line(14.5, 25, 14.5, 29, c.body, 2);
      g.ell(13, 19, 3.6, 4, c.body);
      g.ell(10.5, 12.5, 5.6, 5, c.body);
      g.poly([[7, 9], [1.5, 0.5], [10.5, 6]], c.body); g.poly([[13, 8], [19, 0.5], [16.5, 10]], c.body);
      g.shadeAll();
      g.ell(10.5, 8.6, 1.6, 1.6, c.ring); g.ell(10.5, 8.6, 0.7, 0.7, c.body);
      g.line(3, 3, 6, 3, c.ring); g.line(15, 3, 17, 3, c.ring);
      g.line(25, 14, 27, 14, c.ring); g.rect(10, 26, 2, 1, c.ring); g.rect(22, 26, 2, 1, c.ring);
      g.rect(7, 12, 2, 2, c.eye); g.px(7, 12, W); g.rect(12, 12, 2, 2, c.eye); g.px(12, 12, W);
    },
  },
  // ------------------------------------------------------------ Snorlax
  snorlax: {
    pal: { body: '#3a6878', belly: '#f0e0c0' },
    shiny: { body: '#5a5a8e', belly: '#f0e4cc' },
    draw(g, c) {
      g.ell(18, 59, 8, 4.5, c.belly);
      g.ell(32, 38, 25, 22, c.body);
      g.ell(32, 42, 17, 16, c.belly);
      g.ell(8, 38, 6, 9, c.body);
      g.ell(32, 15, 15, 11, c.body);
      g.ell(32, 18.5, 11, 7.5, c.belly);
      g.poly([[19, 9], [20, 1], [26, 6]], c.body);
      g.mirror();
      g.shadeAll();
      g.line(23, 16, 28, 16, '#302830'); g.line(36, 16, 41, 16, '#302830');
      g.line(29, 22, 35, 22, '#302830'); g.px(29, 21, W); g.px(35, 21, W);
      for (const x of [13, 16, 19]) { g.px(x, 61, W); g.px(63 - x, 61, W); }
      g.px(4, 45, W); g.px(6, 46, W); g.px(59, 45, W); g.px(57, 46, W);
      g.ell(18, 59, 4, 2.5, shade(c.belly, -0.15)); g.ell(46, 59, 4, 2.5, shade(c.belly, -0.15));
    },
  },
  // ------------------------------------------------------------ Dratini
  dratini: {
    pal: { body: '#88a8f0', belly: '#f8f8f0', fin: '#f8f8f8' },
    shiny: { body: '#f0a0d0', belly: '#fff8fc', fin: '#ffffff' },
    draw(g, c) {
      for (const [x, y, r] of [[26, 26, 2.6], [22, 27.5, 3.4], [17, 26.5, 4], [13, 22.5, 4], [13, 17, 4]]) g.ell(x, y, r, r, c.body);
      g.ell(14, 11, 5.5, 5, c.body);
      g.ell(9.5, 13, 3.2, 2.6, c.belly);
      g.poly([[17, 8], [23, 4], [21, 10]], c.fin); g.poly([[18, 10], [23, 9], [20, 12]], c.fin);
      g.shadeAll();
      g.ell(13, 7, 1.2, 1.2, c.belly);
      g.rect(10, 9, 2, 3, '#3a2a6a'); g.px(10, 9, W);
      g.px(7, 14, '#402040');
    },
  },
  dragonair: {
    pal: { body: '#5888e0', belly: '#f8f8f0', orb: '#58c0f0', horn: '#f8f8f8' },
    shiny: { body: '#e070c0', belly: '#fff8fc', orb: '#58c0f0', horn: '#f8f8f8' },
    draw(g, c) {
      const segs: number[][] = [[42, 18, 2.5], [43, 23, 3], [41, 29, 3.6], [37, 34, 4.2], [31, 38, 4.6], [24, 39, 4.8], [18, 36, 4.6], [16, 30, 4.2], [17, 24, 3.8]];
      for (const [x, y, r] of segs) g.ell(x, y, r, r, c.body);
      g.ell(15, 15, 6, 5.5, c.body);
      g.ell(10, 17, 3.5, 2.6, c.body);
      g.poly([[19, 11], [26, 6], [24, 13]], c.horn); g.poly([[20, 14], [26, 12], [22, 16]], c.horn);
      g.shadeAll();
      g.ell(17, 22, 2.2, 2.2, c.orb); g.px(16, 21, W);
      g.ell(42.5, 15, 1.8, 1.8, c.orb); g.ell(42, 11.5, 1.4, 1.4, c.orb); g.ell(41.5, 8.5, 1.1, 1.1, c.orb);
      g.poly([[14, 10], [15, 6], [17, 10]], c.horn);
      g.rect(11, 13, 2, 3, '#1a1a3a'); g.px(11, 13, W);
      g.line(7, 18, 11, 18, '#2a2a4a');
      for (const [x, y, r] of segs.slice(3, 8)) g.px(x, y + r - 2, c.belly);
    },
  },
  dragonite: {
    pal: { body: '#f0a040', belly: '#f8e0a0', wing: '#58a8a8', wingD: '#3a7878' },
    shiny: { body: '#58b860', belly: '#e8e0a0', wing: '#3a6a70', wingD: '#284a50' },
    draw(g, c) {
      g.poly([[22, 30], [6, 18], [8, 26], [5, 31], [14, 33]], c.wing); g.poly([[42, 30], [58, 18], [56, 26], [59, 31], [50, 33]], c.wing);
      g.curve([[42, 50], [50, 54], [56, 52], [60, 48]], c.body, 5);
      g.ell(22, 58, 6.5, 4, c.body); g.ell(41, 58, 6.5, 4, c.body);
      g.ell(32, 41, 15, 17, c.body);
      g.ell(31, 43, 10, 13, c.belly);
      g.ell(16.5, 38, 4, 6.5, c.body); g.ell(47, 38, 4, 6.5, c.body);
      g.ell(30, 17, 10, 9, c.body);
      g.ell(23, 20, 6.5, 4.2, c.body);
      g.curve([[27, 9], [24, 4], [20, 2]], c.body, 2); g.curve([[34, 9], [37, 4], [41, 2]], c.body, 2);
      g.shadeAll();
      g.line(22, 30, 8, 20, c.wingD); g.line(42, 30, 56, 20, c.wingD);
      for (let y = 36; y <= 52; y += 4) g.line(25, y, 37, y, shade(c.belly, -0.22));
      g.rect(24, 14, 3, 3, K); g.px(24, 14, W); g.rect(33, 14, 3, 3, K); g.px(33, 14, W);
      g.curve([[18, 22], [22, 24], [27, 23]], '#6a3010');
      g.px(13, 44, W); g.px(15, 45, W); g.px(49, 45, W); g.px(51, 44, W);
    },
  },
  // ------------------------------------------------------------ Mewtwo / Mew
  mewtwo: {
    pal: { body: '#d8d0e0', belly: '#9060a8', eye: '#7030a0' },
    shiny: { body: '#e0e0e0', belly: '#60a050', eye: '#307030' },
    draw(g, c) {
      g.curve([[36, 50], [46, 56], [56, 54], [61, 46], [59, 40]], c.belly, 5);
      g.ell(24, 56, 4.5, 6, c.body); g.ell(39, 56, 4.5, 6, c.body);
      g.ell(23, 62, 4, 1.6, c.body); g.ell(40, 62, 4, 1.6, c.body);
      g.ell(32, 46, 9, 7, c.belly);
      g.ell(32, 35, 8, 10, c.body);
      g.line(36, 12, 39, 26, c.body, 3);
      g.rell(21, 34, 7, 2.6, 0.9, c.body); g.ell(16, 40, 2.8, 2.8, c.body);
      g.rell(43, 34, 7, 2.6, -0.9, c.body); g.ell(48, 40, 2.8, 2.8, c.body);
      g.ell(30, 14, 7, 6.5, c.body);
      g.poly([[25, 10], [23, 3], [28.5, 8]], c.body); g.poly([[34, 8], [37.5, 3], [35.5, 11]], c.body);
      g.shadeAll();
      g.rect(25, 13, 3, 2, c.eye); g.px(25, 13, W); g.rect(31, 13, 3, 2, c.eye); g.px(31, 13, W);
      g.line(24, 12, 28, 13, K); g.line(34, 12, 30, 13, K);
      g.line(28, 19, 31, 19, '#605870');
    },
  },
  mew: {
    pal: { body: '#f8b0d0', eye: '#3870c8' },
    shiny: { body: '#88c8f0', eye: '#3870c8' },
    draw(g, c) {
      g.curve([[18, 24], [24, 26], [28.5, 22], [28.5, 14], [25, 8]], c.body, 2);
      g.ell(24.5, 5.5, 2.5, 3, c.body);
      g.ell(13, 27.5, 2, 3, c.body); g.ell(19, 27.5, 2, 3, c.body);
      g.ell(16, 20, 5, 6, c.body);
      g.ell(10.5, 19, 2, 1.5, c.body); g.ell(21.5, 18, 2, 1.5, c.body);
      g.ell(15, 11, 7, 6, c.body);
      g.poly([[9, 8], [8, 2], [13, 6]], c.body); g.poly([[19, 6], [23, 2], [22, 9]], c.body);
      g.shadeAll();
      g.ell(12, 11, 1.8, 2.5, c.eye); g.px(11, 10, W); g.ell(18, 11, 1.8, 2.5, c.eye); g.px(17, 10, W);
      g.px(15, 15, '#a04060');
    },
  },
  // ------------------------------------------------------------ Vulpix
  vulpix: {
    pal: { body: '#d06838', tail: '#e88040', curl: '#f0a050', belly: '#f0c890', eye: '#4a2818' },
    shiny: { body: '#f0d060', tail: '#f8e080', curl: '#f8f0b0', belly: '#f8f0d0', eye: '#4a2818' },
    draw(g, c) {
      g.rell(24, 12, 3, 5.5, 0.5, c.tail); g.rell(27.5, 16.5, 3, 5, 1.0, c.tail); g.rell(21, 9.5, 2.6, 5, 0.05, c.tail);
      g.ell(22.5, 27.5, 2.2, 2.4, c.body);
      g.ell(18, 23, 6, 4.5, c.body);
      g.ell(17, 25.5, 4, 2, c.belly);
      g.ell(10, 28, 1.8, 2, c.body); g.ell(14, 28.3, 1.8, 1.8, c.body);
      g.ell(11, 15, 5.5, 5, c.body);
      g.ell(6.5, 17, 2.8, 2, c.belly);
      g.poly([[7, 11], [4, 4], [10, 9]], c.body); g.poly([[13, 10], [16.5, 4], [16, 11.5]], c.body);
      g.ell(12, 9.5, 3.5, 2.5, c.curl);
      g.shadeAll();
      g.ell(26, 9, 1.4, 1.4, c.curl); g.ell(30, 15, 1.4, 1.4, c.curl); g.ell(21, 5.5, 1.2, 1.2, c.curl);
      g.curve([[11, 9], [13, 8], [14, 10]], shade(c.curl, -0.3));
      g.poly([[6.5, 9.5], [5, 6], [8.5, 8.5]], '#502818');
      g.rect(8, 14, 2, 2, c.eye); g.px(8, 14, W); g.rect(12, 14, 2, 2, c.eye); g.px(12, 14, W);
      g.px(4, 16, '#402020');
    },
  },
  ninetales: {
    pal: { body: '#f0d890', tail: '#f8e8b8', tip: '#f0a050', eye: '#d02828' },
    shiny: { body: '#dde0f0', tail: '#eef0fa', tip: '#80a8e0', eye: '#3060c0' },
    draw(g, c) {
      for (let i = 0; i < 9; i++) {
        const a = -2.2 + i * 0.32;
        const x = 32 + Math.cos(a) * 10, y = 24 + Math.sin(a) * 9;
        g.rell(x, y, 2.8, 7, a + Math.PI / 2, c.tail);
      }
      g.ell(36, 40, 2.8, 4.5, c.body); g.ell(32, 41, 2.8, 4, c.body);
      g.ell(28, 33, 10, 6, c.body);
      g.ell(19, 30, 6, 6.5, c.tail);
      g.line(16, 36, 16, 45, c.body, 3); g.line(21, 37, 21, 45, c.body, 3);
      g.ell(15, 19, 6.5, 5.5, c.body);
      g.poly([[18, 15], [28, 12], [22, 19]], c.tail);
      g.poly([[11, 15], [8, 5], [14.5, 12.5]], c.body); g.poly([[17, 14], [21, 5], [20, 15]], c.body);
      g.ell(9.5, 21.5, 3.2, 2.4, c.body);
      g.shadeAll();
      for (let i = 0; i < 9; i++) {
        const a = -2.2 + i * 0.32;
        g.ell(32 + Math.cos(a) * 16.5, 24 + Math.sin(a) * 15.5, 1.6, 1.6, c.tip);
      }
      g.rect(12, 18, 2, 2, c.eye); g.px(12, 18, W); g.line(11, 17, 15, 18, K);
      g.px(6, 21, '#402020');
    },
  },
  // ------------------------------------------------------------ v2: Machop
  machop: {
    pal: { body: '#a0b0c8', belly: '#c8d4e4', eye: '#c83030' },
    shiny: { body: '#c0b080', belly: '#e0d4b0', eye: '#c83030' },
    draw(g, c) {
      g.ell(12, 27.5, 2.8, 2.4, c.body); g.ell(19.5, 27.5, 2.8, 2.4, c.body);
      g.ell(15.5, 20, 6, 6.5, c.body);
      g.ell(15.5, 21.5, 3.6, 4, c.belly);
      g.ell(8.5, 18.5, 2.6, 3.4, c.body); g.ell(7.5, 23, 2.6, 2.4, c.body);
      g.ell(22.5, 18.5, 2.6, 3.4, c.body); g.ell(23.5, 23, 2.6, 2.4, c.body);
      g.ell(15.5, 10.5, 6, 5.5, c.body);
      g.poly([[12, 6.5], [12.5, 1.5], [14.5, 5.5]], c.body); g.poly([[14.8, 5.5], [15.5, 0.5], [16.4, 5.5]], c.body); g.poly([[16.5, 5.5], [18.5, 1.5], [19, 6.5]], c.body);
      g.shadeAll();
      g.rect(12, 9, 2, 2, c.eye); g.px(12, 9, W); g.rect(17, 9, 2, 2, c.eye); g.px(17, 9, W);
      g.line(11, 8, 14, 9, K); g.line(20, 8, 17, 9, K);
      g.line(13, 13, 18, 13, '#4a4a60');
      g.line(15.5, 17, 15.5, 25, shade(c.belly, -0.25)); g.line(13, 20, 18, 20, shade(c.belly, -0.25));
    },
  },
  machoke: {
    pal: { body: '#9aa2b8', crest: '#7a8298', trunks: '#303040', belt: '#f0c030', eye: '#c83030' },
    shiny: { body: '#b8a8c8', crest: '#988aa8', trunks: '#303040', belt: '#f0c030', eye: '#c83030' },
    draw(g, c) {
      g.ell(11.5, 28, 3, 2.2, c.body); g.ell(20, 28, 3, 2.2, c.body);
      g.ell(15.5, 19, 7, 6.5, c.body);
      g.rect(10, 22, 11, 4, c.trunks);
      g.ell(7, 16, 3.2, 3, c.body); g.ell(5.5, 21.5, 3, 3, c.body);
      g.ell(24, 16, 3.2, 3, c.body); g.ell(25.5, 21.5, 3, 3, c.body);
      g.ell(15.5, 9.5, 5.5, 5, c.body);
      g.poly([[12.5, 6], [15.5, 0.5], [18.5, 6]], c.crest);
      g.shadeAll();
      g.rect(10, 22, 11, 1, c.belt); g.rect(14.5, 22, 2, 2, c.belt);
      g.rect(12, 8, 2, 2, c.eye); g.px(12, 8, W); g.rect(17, 8, 2, 2, c.eye); g.px(17, 8, W);
      g.line(11, 7, 14, 8, K); g.line(20, 7, 17, 8, K);
      g.line(13, 12, 18, 12, '#3a3a50');
      g.line(15.5, 14, 15.5, 21, shade(c.body, -0.25)); g.line(11, 17, 20, 17, shade(c.body, -0.15));
    },
  },
  machamp: {
    pal: { body: '#8a9ab8', crest: '#6a7898', trunks: '#283040', belt: '#f0c030', eye: '#c83030', lip: '#d8d8e0' },
    shiny: { body: '#9ab890', crest: '#789870', trunks: '#283040', belt: '#f0c030', eye: '#c83030', lip: '#e0e8d8' },
    draw(g, c) {
      g.ell(17, 44.5, 4.5, 2.6, c.body); g.ell(31, 44.5, 4.5, 2.6, c.body);
      g.rell(9, 18, 6, 3, -0.6, c.body); g.ell(4.5, 13, 3.5, 3.5, c.body);
      g.rell(39, 18, 6, 3, 0.6, c.body); g.ell(43.5, 13, 3.5, 3.5, c.body);
      g.rell(9, 28, 6, 3, 0.5, c.body); g.ell(4.5, 33, 3.5, 3.5, c.body);
      g.rell(39, 28, 6, 3, -0.5, c.body); g.ell(43.5, 33, 3.5, 3.5, c.body);
      g.ell(24, 26, 10, 11, c.body);
      g.rect(15, 33, 18, 7, c.trunks);
      g.ell(24, 11, 6.5, 6, c.body);
      g.poly([[19.5, 7], [20.5, 0.5], [23, 5.5]], c.crest); g.poly([[23, 5.5], [24, 0], [25, 5.5]], c.crest); g.poly([[25, 5.5], [27.5, 0.5], [28.5, 7]], c.crest);
      g.shadeAll();
      g.rect(15, 33, 18, 1.5, c.belt); g.rect(22.5, 33, 3, 3, c.belt);
      g.rect(20, 10, 2, 2, c.eye); g.px(20, 10, W); g.rect(26, 10, 2, 2, c.eye); g.px(26, 10, W);
      g.line(19, 9, 22, 10, K); g.line(29, 9, 26, 10, K);
      g.ell(24, 15, 3, 1.4, c.lip); g.line(22, 15, 26, 15, '#5a5a70');
      g.line(24, 19, 24, 31, shade(c.body, -0.25)); g.line(18, 23, 30, 23, shade(c.body, -0.18)); g.line(19, 27, 29, 27, shade(c.body, -0.18));
    },
  },
  // ------------------------------------------------------------ Ponyta / Rapidash
  ponyta: {
    pal: { body: '#f8e4b0', fire: '#f87828', fire2: '#f8d040', hoof: '#686070', eye: '#5a3020' },
    shiny: { body: '#f8f0e0', fire: '#5878f0', fire2: '#a8c8f8', hoof: '#686070', eye: '#5a3020' },
    draw(g, c) {
      g.poly([[24, 14], [31, 10], [29, 15], [31.5, 19], [25, 19]], c.fire); g.poly([[25, 15], [29.5, 12.5], [27.5, 17]], c.fire2);
      g.line(21, 22, 21, 29, c.body, 2); g.line(25, 21, 25.5, 29, c.body, 2);
      g.line(10, 22, 9.5, 29, c.body, 2); g.line(14, 22, 14, 29, c.body, 2);
      g.rect(8.5, 29, 2.5, 1.5, c.hoof); g.rect(13, 29, 2.5, 1.5, c.hoof); g.rect(20, 29, 2.5, 1.5, c.hoof); g.rect(24.5, 29, 2.5, 1.5, c.hoof);
      g.ell(18, 19, 8, 4.5, c.body);
      g.rell(9.5, 13, 3, 5.5, -0.3, c.body);
      g.ell(7, 8.5, 4, 3.5, c.body); g.ell(3.5, 10.5, 2.6, 2.2, c.body);
      g.poly([[8.5, 5.5], [10, 1.5], [11, 6]], c.body);
      g.poly([[9, 4], [14, 0.5], [12.5, 6], [16, 5], [13, 11], [17, 11], [12.5, 15], [10, 7]], c.fire);
      g.shadeAll();
      g.poly([[10.5, 5], [13, 3], [12, 8], [14, 9], [11.5, 11]], c.fire2);
      g.rect(5, 7.5, 2, 2, c.eye); g.px(5, 7.5, W);
      g.px(2, 10, '#5a4040');
    },
  },
  rapidash: {
    pal: { body: '#f8e8c0', fire: '#f87020', fire2: '#f8d040', hoof: '#686070', horn: '#e8e0d0', eye: '#5a3020' },
    shiny: { body: '#f0f0f0', fire: '#3a3a48', fire2: '#7a7a90', hoof: '#686070', horn: '#e8e0d0', eye: '#5a3020' },
    draw(g, c) {
      g.poly([[34, 20], [46, 13], [43, 21], [47, 28], [36, 27]], c.fire); g.poly([[36, 21], [43, 17], [40, 25]], c.fire2);
      g.line(31, 31, 32, 44, c.body, 3); g.line(37, 30, 39, 44, c.body, 3);
      g.line(14, 31, 12, 44, c.body, 3); g.line(19, 31, 19, 44, c.body, 3);
      for (const x of [11, 18, 31, 38]) g.rect(x, 44, 3.5, 2, c.hoof);
      g.ell(26, 27, 13, 6.5, c.body);
      g.rell(13, 19, 4, 8, -0.35, c.body);
      g.ell(9, 11, 5.5, 4.5, c.body); g.ell(4, 13.5, 3.2, 2.6, c.body);
      g.poly([[8, 7], [3, 0.5], [10, 6]], c.horn);
      g.poly([[12, 5], [19, 1], [17, 8], [23, 7], [18, 14], [24, 16], [17, 21], [13, 11]], c.fire);
      g.shadeAll();
      g.poly([[14, 6], [18, 4], [16, 10], [20, 12], [16, 15]], c.fire2);
      g.rect(7, 9.5, 2, 2, c.eye); g.px(7, 9.5, W); g.line(6, 8.5, 9, 9, K);
      g.px(2, 13, '#5a4040');
    },
  },
  // ------------------------------------------------------------ Scyther
  scyther: {
    pal: { body: '#5cbc5c', belly: '#e8e8b0', blade: '#eef4ea', wing: '#e8f8f0b0', eye: '#18101e' },
    shiny: { body: '#e0c040', belly: '#f8f0c0', blade: '#f4f4f0', wing: '#fff8e0b0', eye: '#18101e' },
    draw(g, c) {
      g.rell(31, 18, 9, 4, -0.4, c.wing); g.rell(33, 24, 8, 3.5, 0.1, c.wing);
      g.line(20, 32, 17, 44, c.body, 3); g.line(27, 32, 30, 44, c.body, 3);
      g.ell(15.5, 45, 3.5, 1.6, c.body); g.ell(31.5, 45, 3.5, 1.6, c.body);
      g.ell(24, 28, 6.5, 8, c.body);
      g.ell(23, 29, 3.6, 5.5, c.belly);
      g.line(19, 20, 11, 24, c.body, 3); g.line(29, 20, 35, 26, c.body, 3);
      g.poly([[11, 24], [3, 13], [6, 12], [14, 22]], c.blade);
      g.poly([[35, 26], [44, 17], [46, 19], [37, 28]], c.blade);
      g.ell(22, 12, 6, 5.5, c.body);
      g.poly([[24, 7], [31, 3], [27, 10]], c.body);
      g.shadeAll();
      g.line(4, 13, 12, 23, shade(c.blade, -0.3)); g.line(45, 18, 37, 27, shade(c.blade, -0.3));
      g.rect(18, 10, 3, 3, c.eye); g.px(18, 10, W); g.line(17, 9, 21, 10, K);
      g.line(16, 15, 21, 15, '#2a4a2a');
      g.line(21, 27, 25, 27, shade(c.belly, -0.25)); g.line(21, 30, 25, 30, shade(c.belly, -0.25));
    },
  },
  // ------------------------------------------------------------ Aves legendarias
  articuno: {
    pal: { body: '#78b8f0', wing: '#5898e0', crest: '#3a68c0', belly: '#c8e4f8', eye: '#c02838', beak: '#b0b8c8' },
    shiny: { body: '#a8e8f8', wing: '#88d0f0', crest: '#5aa0c8', belly: '#e8f8ff', eye: '#c02838', beak: '#b0b8c8' },
    draw(g, c) {
      g.poly([[34, 36], [50, 42], [62, 50], [60, 56], [48, 48], [36, 42]], c.crest);
      g.poly([[36, 38], [54, 50], [58, 60], [50, 58], [40, 46]], c.wing);
      g.poly([[28, 24], [6, 6], [2, 10], [8, 16], [3, 20], [12, 26], [8, 32], [22, 32]], c.wing);
      g.poly([[36, 24], [58, 6], [62, 10], [56, 16], [61, 20], [52, 26], [56, 32], [42, 32]], c.wing);
      g.line(28, 44, 26, 54, c.beak, 2); g.line(34, 44, 36, 54, c.beak, 2);
      g.ell(32, 32, 9, 12, c.body);
      g.ell(31, 35, 5, 8, c.belly);
      g.line(30, 22, 27, 13, c.body, 5);
      g.ell(26, 11, 5.5, 5, c.body);
      g.poly([[27, 7], [36, 1], [31, 8], [38, 6], [30, 11]], c.crest);
      g.poly([[21, 11], [16, 13], [21, 14]], c.beak);
      g.shadeAll();
      for (const [x1, y1, x2, y2] of [[26, 24, 8, 10], [24, 28, 10, 20], [38, 24, 56, 10], [40, 28, 54, 20]]) g.line(x1, y1, x2, y2, shade(c.wing, -0.25));
      g.rect(23, 9, 2, 2, c.eye); g.px(23, 9, W);
    },
  },
  zapdos: {
    pal: { body: '#f8d030', spike: '#e8b018', beak: '#f09030', leg: '#f09030', eye: '#18101e' },
    shiny: { body: '#f8e070', spike: '#e8c040', beak: '#f09030', leg: '#f09030', eye: '#18101e' },
    draw(g, c) {
      g.poly([[34, 38], [52, 46], [46, 47], [58, 56], [44, 52], [38, 44]], c.spike);
      g.poly([[28, 24], [10, 8], [14, 14], [2, 10], [10, 18], [1, 20], [12, 25], [4, 30], [22, 32]], c.body);
      g.poly([[36, 24], [54, 8], [50, 14], [62, 10], [54, 18], [63, 20], [52, 25], [60, 30], [42, 32]], c.body);
      g.line(28, 43, 26, 56, c.leg, 2); g.line(35, 43, 37, 56, c.leg, 2);
      g.ell(32, 33, 8.5, 11, c.body);
      g.line(30, 23, 27, 14, c.body, 5);
      g.ell(26, 12, 5.5, 5, c.body);
      g.poly([[27, 8], [24, 0.5], [29, 6], [31, 1], [32, 8], [36, 4], [32, 12]], c.spike);
      g.poly([[21, 11], [13, 14], [21, 15.5]], c.beak);
      g.shadeAll();
      for (const [x1, y1, x2, y2] of [[26, 24, 6, 12], [24, 28, 6, 24], [38, 24, 58, 12], [40, 28, 58, 24]]) g.line(x1, y1, x2, y2, shade(c.body, -0.3));
      g.rect(23, 10, 2, 2, c.eye); g.px(23, 10, W);
      g.line(26, 30, 34, 30, shade(c.body, -0.2)); g.line(26, 35, 34, 35, shade(c.body, -0.2));
    },
  },
  moltres: {
    pal: { body: '#f8c040', fire: '#f87020', fire2: '#f8e070', beak: '#d0a060', eye: '#18101e' },
    shiny: { body: '#f8a8a0', fire: '#e83850', fire2: '#f8c0d0', beak: '#d0a060', eye: '#18101e' },
    draw(g, c) {
      g.poly([[34, 38], [50, 44], [62, 54], [52, 52], [56, 60], [44, 52], [38, 44]], c.fire);
      g.poly([[28, 24], [8, 2], [10, 10], [1, 8], [8, 16], [0, 20], [10, 24], [4, 30], [22, 32]], c.fire);
      g.poly([[36, 24], [56, 2], [54, 10], [63, 8], [56, 16], [64, 20], [54, 24], [60, 30], [42, 32]], c.fire);
      g.poly([[27, 24], [12, 12], [14, 20], [8, 24], [22, 30]], c.body);
      g.poly([[37, 24], [52, 12], [50, 20], [56, 24], [42, 30]], c.body);
      g.line(28, 43, 26, 56, c.beak, 2); g.line(35, 43, 37, 56, c.beak, 2);
      g.ell(32, 33, 8.5, 11, c.body);
      g.line(30, 23, 27, 14, c.body, 5);
      g.ell(26, 12, 5.5, 5, c.body);
      g.poly([[27, 8], [26, 0], [30, 5], [33, 0], [33, 6], [38, 3], [33, 11]], c.fire);
      g.poly([[21, 11], [14, 13], [21, 14.5]], c.beak);
      g.shadeAll();
      g.poly([[29, 6], [30.5, 2], [32, 7]], c.fire2); g.poly([[12, 8], [20, 18], [14, 16]], c.fire2); g.poly([[52, 8], [44, 18], [50, 16]], c.fire2);
      g.rect(23, 10, 2, 2, c.eye); g.px(23, 10, W);
      g.line(26, 30, 34, 30, shade(c.body, -0.2));
    },
  },
};

/** Genera el PixelArt final (con contorno) de una especie. */
export function renderPokemon(key: string, size: number, shiny: boolean): PixelArt {
  const art = ART[key];
  const g = new PixelArt(size, size);
  if (!art) {
    g.ell(size / 2, size / 2, size / 3, size / 3, '#888888'); g.shadeAll(); g.outline();
    return g;
  }
  art.draw(g, shiny ? { ...art.pal, ...art.shiny } : art.pal);
  g.outline();
  return g;
}
