// Prueba de jugabilidad 2.5 contra un servidor real (con DEV_CHEATS=true):
// encuentros sorpresa al caminar, salvajes agresivos, modos del equipo, huida, interiores, regalos y duelo PvP.
// Uso: npx tsx scripts/gameplay-test.ts [puerto]
import WebSocket from 'ws';
import { generateWorld } from '../shared/world/worldgen';
import { WORLD_SEED, T } from '../shared/constants';

const PORT = parseInt(process.argv[2] || process.env.PORT || '3020', 10);
const URL = `ws://localhost:${PORT}/ws`;
const world = generateWorld(WORLD_SEED);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (name: string, cond: boolean, info = '') => { if (!cond) fails++; console.log(`${cond ? '  OK ' : 'FALLO'}  ${name}${info ? ' — ' + info : ''}`); };

class Bot {
  ws!: WebSocket; msgs: any[] = []; id = 0; x = 0; y = 0; seq = 0; snap: any = null; core: any = null; ev: any[] = [];
  constructor(public name: string) {}
  connect() {
    return new Promise<void>((res, rej) => {
      this.ws = new WebSocket(URL);
      this.ws.on('open', () => res()); this.ws.on('error', rej);
      this.ws.on('message', d => {
        const m = JSON.parse(d.toString());
        this.msgs.push(m); if (this.msgs.length > 4000) this.msgs.splice(0, 2000);
        if (m.t === 'welcome') { this.id = m.id; this.x = m.x; this.y = m.y; this.seq = m.seq; this.core = m.core; }
        if (m.t === 's') { this.snap = m; for (const e of m.ev) this.ev.push(e); }
        if (m.t === 'core') this.core = m.core;
        if (m.t === 'pos') { this.x = m.x; this.y = m.y; }
        if (m.t === 'tp') { this.x = m.x; this.y = m.y; this.seq = m.seq; }
      });
    });
  }
  send(m: any) { this.ws.send(JSON.stringify(m)); }
  wait(t: string, ms = 5000, pred: (m: any) => boolean = () => true): Promise<any> {
    return new Promise((res, rej) => {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const m = this.msgs.find(x => x.t === t && pred(x));
        if (m) { clearInterval(iv); this.msgs = this.msgs.filter(x => x !== m); res(m); }
        else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout esperando ' + t)); }
      }, 20);
    });
  }
  async login() {
    await this.connect();
    this.send({ t: 'auth', mode: 'guest', name: this.name });
    const w = await this.wait('welcome');
    if (w.needStarter) { this.send({ t: 'starter', sp: 'charmander', look: {} }); await this.wait('starter_ok'); }
  }
  lastDev = 0;
  async dev(cmd: string) { const w = this.lastDev + 760 - Date.now(); if (w > 0) await sleep(w); this.lastDev = Date.now(); this.send({ t: 'chat', ch: 'g', msg: '/dev ' + cmd }); }
  async tp(x: number, y: number) { await this.dev(`tp ${x} ${y}`); await this.wait('tp'); await sleep(150); }
  /** Pasea de un lado a otro sobre una franja de hierba alta. */
  async pace(x0: number, x1: number, y: number, seconds: number) {
    const end = Date.now() + seconds * 1000; let dir = 1;
    while (Date.now() < end) {
      const nx = this.x + dir * 0.25;
      if (nx > x1 || nx < x0) dir = -dir;
      this.x += dir * 0.25;
      this.send({ t: 'mv', x: this.x, y: this.y, d: dir > 0 ? 3 : 2, m: 1, s: this.seq });
      await sleep(50);
    }
    this.send({ t: 'mv', x: this.x, y: this.y, d: 0, m: 0, s: this.seq });
  }
}

/** Busca una franja horizontal de hierba alta transitable en una zona. */
function tallStrip(zone: number, len = 7) {
  for (let y = 0; y < 400; y++) for (let x = 0; x < 400 - len; x++) {
    let good = true;
    for (let k = 0; k < len && good; k++) { const i = y * world.w + x + k; good = world.terrain[i] === T.TALL && world.solid[i] === 0 && world.zone[i] === zone && !!world.reach[i]; }
    if (good) return { x0: x + 0.5, x1: x + len - 0.5, y: y + 0.5 };
  }
  return null;
}

async function main() {
  console.log(`Prueba de jugabilidad contra ${URL}\n`);
  const tag = Math.random().toString(36).slice(2, 6);
  const a = new Bot('Exp_' + tag), b = new Bot('Riv_' + tag);
  try { await a.login(); await b.login(); } catch (e) { console.error('No se pudo conectar:', e); process.exit(1); }

  // ---------------- encuentros por pasos ----------------
  const strip = tallStrip(2)!;
  ok('Hay hierba alta en la Ruta 1', !!strip);
  await a.dev('lvl 40'); await a.dev('heal');
  await a.tp(strip.x0, strip.y);
  a.ev = [];
  await a.pace(strip.x0, strip.x1, strip.y, 40);
  const encs = a.ev.filter(e => e[0] === 'enc' && e[4] === a.id);
  const aggro = encs.filter(e => e[2]);
  ok('Los Pokémon aparecen de repente al caminar por la hierba', encs.length >= 2, `${encs.length} encuentros en 40 s (${aggro.length} agresivos)`);
  ok('Los encuentros respetan el tiempo mínimo entre apariciones', encs.length <= 40 / 6.5 + 1, `${encs.length} ≤ ${Math.floor(40 / 6.5 + 1)}`);
  const wild = (a.snap?.mn || []).filter((m: any) => m[6] & 2);
  ok('Hay pocos salvajes "paseando" a la vista', wild.length <= 14, `${wild.length} salvajes visibles`);
  const encIds = new Set(encs.map(e => e[1]));
  const lvls = (a.snap?.mn || []).filter((m: any) => encIds.has(m[0])).map((m: any) => m[5]);
  ok('Los emboscados tienen el nivel de la zona (2-6, +4 si es un ejemplar fuerte)', lvls.every((l: number) => l >= 2 && l <= 10), lvls.join(',') || 'ya derrotados');

  // ---------------- modos del equipo ----------------
  for (const s of ['passive', 'neutral', 'aggressive', 'attack']) {
    a.send({ t: 'stance', s });
    await sleep(250);
    ok(`Modo de equipo "${s}" aplicado`, a.snap?.me?.[5] === s, String(a.snap?.me?.[5]));
  }

  // ---------------- huida ----------------
  a.send({ t: 'flee' });
  const fled = await a.wait('fled', 3000).catch(() => null);
  ok('Se puede huir (responde el servidor)', !!fled, fled ? (fled.ok ? `huida correcta (${fled.n} perseguidores)` : 'huida fallida esta vez') : '');

  // ---------------- interiores ----------------
  const room = world.rooms.find(r => r.kind === 'house' && r.town === 1)!;
  const door = world.portals.find(p => p.x === room.door.x && p.y === room.door.y)!;
  await a.tp(room.door.x + 0.5, room.door.y + 1.5);
  a.x = room.door.x + 0.5; a.y = room.door.y + 0.6;
  a.send({ t: 'mv', x: a.x, y: a.y, d: 1, m: 1, s: a.seq });
  await sleep(150);
  a.send({ t: 'portal', id: door.id });
  const tpIn = await a.wait('tp', 3000).catch(() => null);
  ok('Se puede entrar en una casa', !!tpIn && tpIn.x > 400, tpIn ? `${room.name} (${tpIn.x}, ${tpIn.y})` : 'sin teletransporte');
  const mom = world.npcs.find(n => n.gift && n.x >= room.x && n.x < room.x + room.w && n.y >= room.y && n.y < room.y + room.h)!;
  await a.tp(mom.x + 0.5, mom.y + 1.5);
  a.send({ t: 'gift', id: mom.id });
  const gift = await a.wait('loot', 3000, m => String(m.title).includes('Regalo')).catch(() => null);
  ok('Los vecinos dan un regalo', !!gift, gift ? gift.lines.join(', ') : '');
  a.send({ t: 'gift', id: mom.id });
  const again = await a.wait('loot', 1200, m => String(m.title).includes('Regalo')).catch(() => null);
  ok('El regalo solo se recibe una vez', !again);

  // ---------------- duelo PvP ----------------
  const tw = world.towns[1];
  await a.tp(tw.spawn.x + 0.5, tw.spawn.y + 0.5);
  await b.tp(tw.spawn.x + 2.5, tw.spawn.y + 0.5);
  await b.dev('lvl 30');
  await sleep(300);
  a.send({ t: 'duel_req', id: b.id });
  const req = await b.wait('duel_req', 3000).catch(() => null);
  ok('El rival recibe el reto de duelo', !!req);
  b.send({ t: 'duel_accept', id: a.id });
  const st = await a.wait('duel_start', 3000).catch(() => null);
  ok('El duelo comienza para ambos', !!st);
  await a.wait('duel_go', 6000).catch(() => null);
  const end = await a.wait('duel_end', 90000).catch(() => null);
  ok('El duelo termina con ganador y Elo', !!end && typeof end.elo === 'number', end ? `${end.win ? 'gana A' : 'gana B'} · ${end.reason} · Elo ${end.elo} (${end.delta})` : 'sin final');
  const dmgEvents = a.ev.filter(e => e[0] === 'd').length;
  ok('Hubo combate real entre equipos', dmgEvents > 5, `${dmgEvents} golpes`);

  a.ws.close(); b.ws.close();
  console.log(fails ? `\n${fails} prueba(s) fallida(s)` : '\nTodas las pruebas superadas');
  process.exit(fails ? 1 : 0);
}
main();
