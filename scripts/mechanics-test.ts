// Prueba de las mecánicas de la 2.8 contra un servidor real con DEV_CHEATS=true.
// Uso: npx tsx scripts/mechanics-test.ts [puerto]
import WebSocket from 'ws';
import { generateWorld } from '../shared/world/worldgen';
import { WORLD_SEED, T } from '../shared/constants';
import { catchChance, RARITY_CATCH, calcStats, monXpForLevel } from '../shared/progression';
import { SPECIES } from '../shared/species';

const PORT = process.argv[2] || '3020';
const world = generateWorld(WORLD_SEED);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (n: string, c: boolean, i = '') => { if (!c) fails++; console.log(`${c ? '  OK ' : 'FALLO'}  ${n}${i ? ' — ' + i : ''}`); };

class Bot {
  ws!: WebSocket; msgs: any[] = []; id = 0; x = 0; y = 0; seq = 0; snap: any = null; ev: any[] = []; lastDev = 0;
  constructor(public name: string) {}
  connect() { return new Promise<void>((res, rej) => { this.ws = new WebSocket(`ws://localhost:${PORT}/ws`); this.ws.on('open', () => res()); this.ws.on('error', rej); this.ws.on('message', d => { const m = JSON.parse(d.toString()); this.msgs.push(m); if (this.msgs.length > 3000) this.msgs.splice(0, 1500); if (m.t === 'welcome') { this.id = m.id; this.x = m.x; this.y = m.y; this.seq = m.seq; } if (m.t === 's') { this.snap = m; this.ev.push(...m.ev); } if (m.t === 'tp') { this.x = m.x; this.y = m.y; this.seq = m.seq; } if (m.t === 'pos') { this.x = m.x; this.y = m.y; } }); }); }
  send(m: any) { this.ws.send(JSON.stringify(m)); }
  wait(t: string, ms = 5000, pred: (m: any) => boolean = () => true): Promise<any> { return new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { const m = this.msgs.find(x => x.t === t && pred(x)); if (m) { clearInterval(iv); this.msgs = this.msgs.filter(x => x !== m); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); res(null); } }, 20); }); }
  async dev(c: string) { const w = this.lastDev + 760 - Date.now(); if (w > 0) await sleep(w); this.lastDev = Date.now(); this.send({ t: 'chat', ch: 'g', msg: '/dev ' + c }); }
  async tp(x: number, y: number) { await this.dev(`tp ${x} ${y}`); await this.wait('tp'); await sleep(200); }
  async login(mode = 'guest', pass = '') { await this.connect(); this.send({ t: 'auth', mode, name: this.name, pass }); const w = await this.wait('welcome'); if (w?.needStarter) { this.send({ t: 'starter', sp: 'squirtle', look: {} }); await this.wait('starter_ok'); } return w; }
  mine() { return (this.snap?.mn || []).filter((m: any) => m[7] === this.id); }
  hitsOn(id: number) { return this.ev.filter(e => e[0] === 'd' && e[1] === id).length; }
}

async function main() {
  // --- fórmulas
  const common = catchChance(255, 1, 1, 1, 0, 1, RARITY_CATCH.common), commonLow = catchChance(255, 0.02, 1, 1, 0, 1, RARITY_CATCH.common);
  const legend = catchChance(3, 0.02, 2.2, 2.5, 0, 1, RARITY_CATCH.legendary);
  ok('Capturar a vida completa es difícil', common < 0.2, `común a tope: ${(common * 100).toFixed(1)} %`);
  ok('Casi debilitado es mucho más fácil', commonLow > common * 3, `común a 2 %: ${(commonLow * 100).toFixed(1)} %`);
  ok('Un legendario es durísimo incluso dormido y con Ultra Ball', legend < 0.03, `${(legend * 100).toFixed(2)} %`);
  const a = calcStats(SPECIES.pikachu, 30, [0, 0, 0, 0], 2), b = calcStats(SPECIES.pikachu, 30, [31, 31, 31, 31], 3);
  ok('Dos Pikachu del mismo nivel pueden tener estadísticas muy distintas', b.atk - a.atk >= 10, `ATQ ${a.atk} vs ${b.atk}`);
  ok('Los niveles siguen más allá del 100 y cuestan cada vez más', monXpForLevel(150) - monXpForLevel(149) > 10 * (monXpForLevel(50) - monXpForLevel(49)), `nivel 50: ${monXpForLevel(50) - monXpForLevel(49)} EXP · nivel 150: ${monXpForLevel(150) - monXpForLevel(149)} EXP`);

  const tag = Math.random().toString(36).slice(2, 6);
  const p = new Bot('Mec_' + tag); await p.login();
  await p.dev('lvl 30'); await p.dev('heal');

  // --- seleccionar no ataca; luchar sí
  const strip = (() => { for (let y = 250; y < 300; y++) for (let x = 180; x < 240; x++) { const i = y * world.w + x; if (world.zone[i] === 2 && world.terrain[i] === T.GRASS && world.solid[i] === 0 && world.reach[i]) return { x: x + 0.5, y: y + 0.5 }; } return null; })()!;
  await p.tp(strip.x, strip.y);
  p.send({ t: 'stance', s: 'neutral' });
  await sleep(300);
  p.ev = [];
  let target: any = null;
  for (let k = 0; k < 20 && !target; k++) { await p.dev('ambush'); await sleep(900); target = (p.snap?.mn || []).find((m: any) => m[6] & 2 && !(m[6] & 4096) && Math.hypot(m[2] - p.x, m[3] - p.y) < 8); }
  if (!target) { ok('Aparece un salvaje tranquilo para la prueba', false); process.exit(1); }
  p.send({ t: 'tgt', id: target[0], fight: false });
  p.ev = [];
  await sleep(3500);
  const still = (p.snap?.mn || []).find((m: any) => m[0] === target[0]);
  ok('En Neutral, seleccionar con un clic NO hace atacar', !!still && p.hitsOn(target[0]) === 0, `golpes: ${p.hitsOn(target[0])}`);
  p.send({ t: 'tgt', id: target[0], fight: true });
  await sleep(4000);
  ok('Con "Luchar" (o doble clic) el equipo ataca', p.hitsOn(target[0]) > 0, `golpes: ${p.hitsOn(target[0])}`);

  // --- nadar
  const shore = (() => { for (let y = 120; y < 300; y++) for (let x = 150; x < 300; x++) { const i = y * world.w + x; if (world.solid[i] === 0 && world.reach[i] && world.terrain[i + 1] === T.WATER && world.terrain[i + 2] === T.WATER) return { x: x + 0.5, y: y + 0.5 }; } return null; })()!;
  await p.tp(shore.x, shore.y);
  p.x = shore.x + 1.0; p.send({ t: 'mv', x: p.x, y: p.y, d: 3, m: 1, s: p.seq });
  const back = await p.wait('pos', 1200);
  ok('Con un Pokémon de agua se puede cruzar el agua', !back, back ? 'el servidor lo devolvió a tierra' : 'nadando');

  // --- campamento
  await p.tp(strip.x, strip.y);
  p.send({ t: 'flee' }); await sleep(600);
  for (const m of (p.snap?.mn || [])) if (m[6] & 2) { /* espera a que se calmen */ }
  await sleep(5500);
  p.send({ t: 'camp' });
  const camped = await p.wait('camped', 2500);
  const why = camped ? '' : (p.msgs.filter(m => m.t === 'note').pop()?.text || '');
  ok('Se puede acampar en un claro de una ruta', !!camped, why);
  await sleep(800);
  ok('El campamento aparece para los jugadores cercanos', (p.snap?.cp || []).length > 0);
  const town = world.towns[0];
  await p.tp(town.spawn.x + 0.5, town.spawn.y + 0.5);
  p.send({ t: 'camp' });
  const no = await p.wait('note', 2000, m => /rutas y zonas salvajes/.test(m.text));
  ok('No se puede acampar en un pueblo', !!no);

  // --- seguridad: bloqueo por contraseñas
  const acc = new Bot('Seg_' + tag); await acc.connect(); acc.send({ t: 'auth', mode: 'register', name: acc.name, pass: 'correcta123' }); await acc.wait('welcome'); acc.ws.close();
  let locked = false;
  for (let k = 0; k < 7; k++) { const x = new Bot(acc.name); await x.connect(); x.send({ t: 'auth', mode: 'login', name: acc.name, pass: 'malaclave' + k }); const e = await x.wait('auth_err', 3000); x.ws.close(); if (e && /bloqueada/.test(e.msg)) locked = true; }
  const good = new Bot(acc.name); await good.connect(); good.send({ t: 'auth', mode: 'login', name: acc.name, pass: 'correcta123' }); const g2 = await good.wait('auth_err', 3000); good.ws.close();
  ok('Tras 5 contraseñas malas la cuenta se bloquea (aunque luego aciertes)', locked && !!g2 && /bloqueada|intentos/.test(g2.msg), g2?.msg);

  p.ws.close();
  console.log(fails ? `\n${fails} prueba(s) fallida(s)` : '\nTodas las pruebas superadas');
  process.exit(fails ? 1 : 0);
}
main();
