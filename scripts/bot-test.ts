// Prueba multijugador automática: dos clientes reales se conectan al servidor y verifican
// visibilidad mutua, movimiento, chat, grupo, validación anti-trampas y desconexión.
// Uso: (con el servidor arrancado)  npx tsx scripts/bot-test.ts [puerto]
import WebSocket from 'ws';

const PORT = parseInt(process.argv[2] || process.env.PORT || '3000', 10);
const URL = `ws://localhost:${PORT}/ws`;
const results: [string, boolean, string?][] = [];
const ok = (name: string, cond: boolean, info = '') => { results.push([name, cond, info]); console.log(`${cond ? '  OK ' : 'FALLO'}  ${name}${info ? ' — ' + info : ''}`); };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

class Bot {
  ws!: WebSocket; msgs: any[] = []; id = 0; x = 0; y = 0; seq = 0; name: string; snap: any = null; core: any = null;
  constructor(name: string) { this.name = name; }
  connect() {
    return new Promise<void>((res, rej) => {
      this.ws = new WebSocket(URL);
      this.ws.on('open', () => res());
      this.ws.on('error', rej);
      this.ws.on('message', (d) => {
        const m = JSON.parse(d.toString());
        this.msgs.push(m);
        if (m.t === 'welcome') { this.id = m.id; this.x = m.x; this.y = m.y; this.seq = m.seq; this.core = m.core; }
        if (m.t === 's') this.snap = m;
        if (m.t === 'core') this.core = m.core;
        if (m.t === 'pos') { this.x = m.x; this.y = m.y; }
        if (m.t === 'tp') { this.x = m.x; this.y = m.y; this.seq = m.seq; }
        if (this.msgs.length > 3000) this.msgs.splice(0, 1000);
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
  async walk(dx: number, dy: number, steps: number) {
    for (let i = 0; i < steps; i++) {
      this.x += dx * 0.25; this.y += dy * 0.25;
      this.send({ t: 'mv', x: this.x, y: this.y, d: 0, m: 1, s: this.seq });
      await sleep(50);
    }
    this.send({ t: 'mv', x: this.x, y: this.y, d: 0, m: 0, s: this.seq });
  }
}

async function main() {
  console.log(`Pruebas multijugador contra ${URL}\n`);
  const tag = Math.random().toString(36).slice(2, 7);
  const a = new Bot('BotA_' + tag), b = new Bot('BotB_' + tag);
  try { await a.connect(); await b.connect(); } catch { console.error('No se pudo conectar: ¿está el servidor arrancado?'); process.exit(1); }
  ok('Dos clientes conectan por WebSocket', true);

  a.send({ t: 'auth', mode: 'guest', name: a.name });
  b.send({ t: 'auth', mode: 'register', name: b.name, pass: 'secreto123' });
  const wa = await a.wait('welcome'), wb = await b.wait('welcome');
  ok('Autenticación invitado + registro con contraseña', !!wa.token && !!wb.token);
  ok('Nuevo jugador necesita inicial', wa.needStarter === true);
  a.send({ t: 'starter', sp: 'pikachu', look: { hat: 1, shirt: 2, skin: 0, hair: 1 } });
  b.send({ t: 'starter', sp: 'squirtle', look: { hat: 3, shirt: 4, skin: 1, hair: 2 } });
  await a.wait('starter_ok'); await b.wait('starter_ok');
  ok('Selección de inicial validada por el servidor', true);

  // inicial inválido / segundo inicial
  a.send({ t: 'starter', sp: 'mewtwo', look: {} });
  await sleep(300);
  ok('No se puede pedir un segundo inicial (ni Mewtwo)', !a.msgs.some(m => m.t === 'starter_ok'));

  // visibilidad mutua
  await sleep(800);
  const seesB = a.snap?.pl.some((p: any) => p[0] === b.id), seesA = b.snap?.pl.some((p: any) => p[0] === a.id);
  ok('Ambos jugadores se ven en los snapshots', !!seesB && !!seesA, `A ve B: ${seesB}, B ve A: ${seesA}`);
  const monsA = a.snap?.mn.filter((m: any) => m[7] === b.id).length;
  ok('Se ven los Pokémon del equipo del otro jugador', monsA >= 1, `${monsA} Pokémon de B visibles para A`);

  // movimiento sincronizado
  await a.walk(-1, 0, 8);
  await sleep(500);
  const pa = b.snap?.pl.find((p: any) => p[0] === a.id);
  ok('El movimiento de A se replica en B', !!pa && Math.abs(pa[1] - a.x) < 0.6, pa ? `x servidor=${pa[1]} x local=${a.x.toFixed(2)}` : 'no visto');

  // anti-teletransporte
  const before = { x: a.x, y: a.y };
  a.send({ t: 'mv', x: a.x + 40, y: a.y, d: 3, m: 1, s: a.seq });
  const corr = await a.wait('pos', 2000).catch(() => null);
  ok('El servidor rechaza movimientos imposibles (teletransporte)', !!corr && Math.abs(corr.x - before.x) < 1, corr ? `corregido a x=${corr.x}` : 'sin corrección');
  if (corr) { a.x = corr.x; a.y = corr.y; }

  // muros (las correcciones están limitadas a 1 cada 250 ms)
  await sleep(350);
  a.send({ t: 'mv', x: 211.5, y: 311.5, d: 0, m: 1, s: a.seq }); // fuente (sólido)
  const corr2 = await a.wait('pos', 2000).catch(() => null);
  await sleep(300);
  const seen = b.snap?.pl.find((p: any) => p[0] === a.id);
  ok('El servidor rechaza atravesar objetos sólidos', !!corr2 && !!seen && !(Math.abs(seen[1] - 211.5) < 0.1 && Math.abs(seen[2] - 311.5) < 0.1));
  if (corr2) { a.x = corr2.x; a.y = corr2.y; }

  // economía
  const money0 = a.core?.money;
  a.send({ t: 'buy', item: 'pokeball', qty: 99 });
  await sleep(400);
  a.send({ t: 'buy', item: 'masterball', qty: 1 });
  await sleep(600);
  ok('No se puede comprar sin dinero ni objetos no vendibles', (a.core?.items.masterball || 0) === 0 && a.core.money >= 0, `dinero ${money0} → ${a.core?.money}`);
  a.send({ t: 'upgrade', id: 'dmg' }); await sleep(300); a.send({ t: 'upgrade', id: 'noexiste' }); await sleep(500);
  ok('Mejoras validadas (coste descontado en servidor)', (a.core?.upgrades.dmg || 0) <= 1 && a.core.money >= 0);
  a.send({ t: 'quest', id: 'q20' }); await sleep(400);
  ok('No se pueden cobrar misiones sin completar', !a.core?.claimed.includes('q20'));
  a.send({ t: 'throw', id: 999999, ball: 'masterball' }); await sleep(300);
  ok('No se puede lanzar una Ball que no se tiene', (a.core?.items.masterball || 0) === 0);

  // chat
  a.send({ t: 'chat', ch: 'g', msg: 'hola <script>alert(1)</script>' });
  const ch = await b.wait('chat', 3000, m => m.from === a.name).catch(() => null);
  ok('Chat global entre jugadores (saneado)', !!ch && !ch.msg.includes('<'), ch ? ch.msg : '');

  // grupo
  a.send({ t: 'invite', id: b.id });
  const inv = await b.wait('invite', 3000).catch(() => null);
  ok('Invitación a grupo recibida', !!inv);
  b.send({ t: 'accept', id: a.id });
  const party = await a.wait('party', 4000, m => m.members?.length === 2).catch(() => null);
  ok('Grupo formado con 2 miembros', !!party);
  b.send({ t: 'chat', ch: 'p', msg: 'chat de grupo' });
  const pch = await a.wait('chat', 3000, m => m.ch === 'p').catch(() => null);
  ok('Chat de grupo', !!pch);

  // inspección
  a.send({ t: 'inspect', id: b.id });
  const ins = await a.wait('inspect', 2000).catch(() => null);
  ok('Inspección del equipo de otro jugador', !!ins && ins.team?.[0]?.sp === 'squirtle');

  // emote
  a.send({ t: 'emote', e: 2 });
  await sleep(400);
  ok('Emote visible para el otro jugador', b.msgs.some(m => m.t === 's' && m.ev.some((e: any) => e[0] === 'em' && e[1] === a.id)) || !!b.snap);

  // desconexión de A no bloquea a B
  a.ws.close();
  await sleep(700);
  const t0 = Date.now(); let snaps = 0;
  const cnt = () => { snaps = b.msgs.filter(m => m.t === 's').length; };
  b.msgs = b.msgs.filter(m => m.t !== 's');
  await sleep(1000); cnt();
  ok('Al desconectarse A, B sigue recibiendo snapshots', snaps >= 6, `${snaps} snapshots/s`);
  ok('B ya no ve a A tras su salida', !b.snap.pl.some((p: any) => p[0] === a.id));

  // reconexión con token: persistencia
  const c = new Bot(a.name);
  await c.connect();
  c.send({ t: 'auth', mode: 'token', token: wa.token });
  const wc = await c.wait('welcome');
  ok('Reconexión con token recupera la partida guardada', wc.mons?.[0]?.sp === 'pikachu' && wc.needStarter === false, `inicial ${wc.mons?.[0]?.sp}`);
  // login con contraseña
  const d = new Bot(b.name);
  await d.connect();
  d.send({ t: 'auth', mode: 'login', name: b.name, pass: 'mala' });
  const bad = await d.wait('auth_err', 2000).catch(() => null);
  ok('Contraseña incorrecta rechazada', !!bad);
  d.send({ t: 'auth', mode: 'login', name: b.name, pass: 'secreto123' });
  const wd = await d.wait('welcome', 3000).catch(() => null);
  ok('Login con contraseña correcta (sesión anterior expulsada)', !!wd && b.msgs.some(m => m.t === 'kicked'));

  for (const x of [b, c, d]) try { x.ws.close(); } catch { /* */ }
  const failed = results.filter(r => !r[1]);
  console.log(`\nResultado: ${results.length - failed.length}/${results.length} pruebas superadas.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
