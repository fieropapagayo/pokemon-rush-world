// Vida del mundo (2.12): entrenadores IA, mercaderes ambulantes y cuevas misteriosas, contra un servidor con DEV_CHEATS=true.
// Uso: npx tsx scripts/life-test.ts [puerto]
import WebSocket from 'ws';
import { generateWorld } from '../shared/world/worldgen';
import { WORLD_SEED, T } from '../shared/constants';

const PORT = process.argv[2] || '3020';
const world = generateWorld(WORLD_SEED);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (n: string, c: boolean, i = '') => { if (!c) fails++; console.log(`${c ? '  OK ' : 'FALLO'}  ${n}${i ? ' — ' + i : ''}`); };

class Bot {
  ws!: WebSocket; says: string[] = []; msgs: any[] = []; id = 0; x = 0; y = 0; snap: any = null; ev: any[] = []; lastDev = 0;
  constructor(public name: string) {}
  connect() { return new Promise<void>((res, rej) => { this.ws = new WebSocket(`ws://localhost:${PORT}/ws`); this.ws.on('open', () => res()); this.ws.on('error', rej); this.ws.on('message', d => { const m = JSON.parse(d.toString()); this.msgs.push(m); if (this.msgs.length > 3000) this.msgs.splice(0, 1500); if (m.t === 'welcome') { this.id = m.id; this.x = m.x; this.y = m.y; } if (m.t === 's') { this.snap = m; this.ev.push(...m.ev); for (const a of m.ai || []) if (a[9]) this.says.push(a[9]); } if (m.t === 'tp') { this.x = m.x; this.y = m.y; } }); }); }
  send(m: any) { this.ws.send(JSON.stringify(m)); }
  wait(t: string, ms = 5000, pred: (m: any) => boolean = () => true): Promise<any> { return new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => { const m = this.msgs.find(x => x.t === t && pred(x)); if (m) { clearInterval(iv); this.msgs = this.msgs.filter(x => x !== m); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); res(null); } }, 20); }); }
  async dev(c: string) { const w = this.lastDev + 760 - Date.now(); if (w > 0) await sleep(w); this.lastDev = Date.now(); this.send({ t: 'chat', ch: 'g', msg: '/dev ' + c }); }
  async tp(x: number, y: number) { await this.dev(`tp ${x} ${y}`); await this.wait('tp'); await sleep(200); }
  async login() { await this.connect(); this.send({ t: 'auth', mode: 'guest', name: this.name, pass: '' }); const w = await this.wait('welcome'); if (w?.needStarter) { this.send({ t: 'starter', sp: 'charmander', look: { hat: 2, shirt: 9, skin: 4, hair: 7, pants: 3, cap: 1, style: 2, acc: 1 } }); await this.wait('starter_ok'); } return w; }
}

async function main() {
  const tag = Math.random().toString(36).slice(2, 6);
  const p = new Bot('Vida_' + tag); await p.login();
  await p.dev('lvl 25'); await p.dev('heal');
  const spot = (() => { for (let y = 250; y < 300; y++) for (let x = 180; x < 240; x++) { const i = y * world.w + x; if (world.zone[i] === 2 && world.terrain[i] === T.GRASS && world.solid[i] === 0 && world.reach[i]) return { x: x + 0.5, y: y + 0.5 }; } return null; })()!;
  await p.tp(spot.x, spot.y);

  // --- IA amistosa
  await p.dev('ai amistosa 8');
  await sleep(2500);
  const ai = (p.snap?.ai || [])[0];
  ok('Aparece un entrenador IA cerca con nombre, nivel y apariencia', !!ai && String(ai[5]).length > 1 && Array.isArray(ai[8]), ai ? `IA·${ai[5]} Nv.${ai[6]}` : 'ninguno');
  const aiMons = (p.snap?.mn || []).filter((m: any) => m[6] & 32768);
  ok('Sus Pokémon le acompañan y se marcan como de IA', aiMons.length > 0, `${aiMons.length} Pokémon`);
  await sleep(1500);
  ok('La IA amistosa saluda (bocadillo o regalo)', p.says.length > 0, p.says[0]);
  if (aiMons[0]) { p.send({ t: 'throw', id: aiMons[0][0], ball: 'pokeball' }); const n = await p.wait('note', 3000, m => /no se puede capturar/.test(m.text)); ok('No se pueden capturar los Pokémon de una IA', !!n); }

  // --- IA rival: reta y combate contra tu equipo
  await p.tp(spot.x + 30, spot.y); await sleep(600);
  await p.dev('ai rival 40');
  const ch = await p.wait('note', 9000, m => /te desafía/.test(m.text));
  ok('Una IA rival más fuerte te desafía', !!ch, ch?.text);
  await sleep(4000);
  const hits = p.ev.filter(e => e[0] === 'd').length;
  ok('Hay combate real entre su equipo y el tuyo', hits > 0, `${hits} golpes`);
  await p.tp(spot.x - 25, spot.y); await sleep(1500);

  // --- mercader ambulante
  await p.dev('merchant');
  const mc = await p.wait('merchant', 4000);
  ok('Llega un mercader ambulante y se avisa a los jugadores', !!mc, mc ? `${mc.name} en ${mc.zone}` : '');
  if (mc) {
    await p.tp(mc.x, mc.y + 1); await sleep(800);
    const m = (p.snap?.mc || [])[0];
    ok('El mercader aparece en la instantánea con existencias', !!m && m[5].length > 0, m ? m[5].map((s: any) => `${s.item}×${s.qty} ${s.price}₽`).join(', ') : '');
    await p.dev('money 100000');
    if (m) { p.send({ t: 'mbuy', id: m[0], item: m[5][0].item }); const st = await p.wait('mstock', 3000); ok('Se puede comprar y las existencias bajan', !!st && st.stock[0].qty === m[5][0].qty - 1); }
  }

  // --- cueva misteriosa
  await p.dev('cave');
  const cv = await p.wait('cave', 4000);
  ok('Aparece una cueva misteriosa como evento', !!cv, cv ? `en ${cv.zone}` : '');
  if (cv) {
    await p.tp(cv.x, cv.y + 1); await sleep(800);
    const c = (p.snap?.cv || [])[0];
    if (c) p.send({ t: 'cavein', id: c[0] });
    const tp = await p.wait('tp', 4000), goal = await p.wait('cavegoal', 3000);
    ok('Se entra a la cueva y se marca el guardián', !!tp && tp.x >= 400 && !!goal, tp ? `(${Math.round(tp.x)}, ${Math.round(tp.y)})` : '');
  }
  console.log(fails ? `\n${fails} pruebas fallidas` : '\nTodas las pruebas superadas');
  process.exit(fails ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
