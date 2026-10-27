// Prueba de carga: N bots (por defecto 20) se conectan, eligen inicial y pasean por Ruta 1 a la vez.
// Uso: npx tsx scripts/load-test.ts [bots] [segundos] [puerto]
import WebSocket from 'ws';
import http from 'node:http';

const N = parseInt(process.argv[2] || '20', 10);
const SECS = parseInt(process.argv[3] || '30', 10);
const PORT = parseInt(process.argv[4] || '3000', 10);
const STARTERS = ['bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee'];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function health(): Promise<any> {
  return new Promise(res => http.get(`http://localhost:${PORT}/health`, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', () => res(null)));
}

async function bot(i: number, stats: { bytes: number; snaps: number; errors: number }) {
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  let x = 0, y = 0, seq = 0, ready = false;
  ws.on('message', d => {
    const s = d.toString(); stats.bytes += s.length;
    const m = JSON.parse(s);
    if (m.t === 's') stats.snaps++;
    if (m.t === 'welcome') { x = m.x; y = m.y; seq = m.seq; if (m.needStarter) ws.send(JSON.stringify({ t: 'starter', sp: STARTERS[i % 5], look: { hat: i % 8, shirt: (i * 3) % 8, skin: i % 4, hair: i % 6 } })); else ready = true; }
    if (m.t === 'starter_ok') ready = true;
    if (m.t === 'pos') { x = m.x; y = m.y; }
    if (m.t === 'tp') { x = m.x; y = m.y; seq = m.seq; }
  });
  ws.on('error', () => stats.errors++);
  await new Promise(r => ws.on('open', r));
  ws.send(JSON.stringify({ t: 'auth', mode: 'guest', name: `Carga${Date.now() % 100000}_${i}`.slice(0, 16) }));
  while (!ready) await sleep(50);
  // salir del pueblo hacia el norte por la calle oeste
  const path = [[208.5, 312.5], [208.5, 290], [200 + (i % 8) * 2, 275 + (i % 5) * 2]];
  const t0 = Date.now();
  let k = 0;
  while (Date.now() - t0 < SECS * 1000) {
    const [tx, ty] = path[Math.min(k, path.length - 1)];
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy);
    if (d < 0.5) { k++; if (k >= path.length) { path.push([x + (Math.random() - 0.5) * 12, y + (Math.random() - 0.5) * 12]); } }
    else { const s = Math.min(d, 0.25); x += dx / d * s; y += dy / d * s; ws.send(JSON.stringify({ t: 'mv', x, y, d: 0, m: 1, s: seq })); }
    if (Math.random() < 0.01) ws.send(JSON.stringify({ t: 'chat', ch: 'z', msg: 'hola desde el bot ' + i }));
    await sleep(55);
  }
  ws.close();
}

async function main() {
  const stats = { bytes: 0, snaps: 0, errors: 0 };
  console.log(`Lanzando ${N} bots durante ${SECS}s contra el puerto ${PORT}...`);
  const bots = Array.from({ length: N }, (_, i) => sleep(i * 120).then(() => bot(i, stats)));
  const samples: number[] = [];
  const iv = setInterval(async () => { const h = await health(); if (h) { samples.push(h.tickMs); process.stdout.write(`  jugadores ${h.players}  pokémon ${h.mons}  tick ${h.tickMs} ms\r`); } }, 2000);
  await Promise.all(bots);
  clearInterval(iv);
  const kb = stats.bytes / 1024 / SECS / N;
  console.log(`\nTick medio: ${(samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length)).toFixed(2)} ms (máx ${Math.max(...samples).toFixed(2)} ms de 50 ms disponibles)`);
  console.log(`Ancho de banda por jugador: ${kb.toFixed(1)} KB/s · snapshots recibidos: ${stats.snaps} · errores: ${stats.errors}`);
}
main();
