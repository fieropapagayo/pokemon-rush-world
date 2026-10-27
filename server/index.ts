// Punto de entrada del servidor: HTTP (archivos del juego) + WebSocket (/ws) en el mismo puerto.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import { ENV, ROOT } from './env';
import { DB } from './database/db';
import { generateWorld } from '../shared/world/worldgen';
import { WORLD_SEED } from '../shared/constants';
import { Game } from './world/game';
import { attachNetwork } from './networking/net';
import { Cloud } from './cloud';
import { Tunnel } from './tunnel';

const DIST = path.join(ROOT, 'dist');
function getBuildHash(): string {
  try {
    const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
    return crypto.createHash('sha1').update(html).digest('hex').slice(0, 10);
  } catch { return ''; }
}
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

console.log('==============================================');
console.log('  POKÉMON RUSH WORLD — servidor multijugador');
console.log('==============================================');

const db = new DB(ENV.DB_FILE);
const t0 = Date.now();
const world = generateWorld(WORLD_SEED);
console.log(`[mundo] generado en ${Date.now() - t0} ms (${world.w}x${world.h} tiles, ${world.objects.length} objetos, ${world.pickups.length} cofres/objetos, ${world.bosses.length} jefes)`);
const game = new Game(world, db);
const cloud = new Cloud(db, () => ({ online: game.players.size, max: ENV.MAX_PLAYERS, tickMs: +game.tickCost.toFixed(2) }));
game.cloud = cloud;
const tunnel = new Tunnel(url => { cloud.publicUrl = url; cloud.heartbeat(); });

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://x');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ ok: true, version: ENV.VERSION, build: getBuildHash(), players: game.players.size, mons: game.mons.size, tickMs: +game.tickCost.toFixed(2), uptime: Math.round(process.uptime()), cloud: cloud.enabled ? { lastOk: cloud.lastOk } : false }));
    return;
  }
  if (url.pathname === '/config.json') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ cloud: ENV.CLOUD_URL.replace(/\/$/, ''), google: cloud.enabled && ENV.GOOGLE_LOGIN, guests: ENV.ALLOW_GUESTS }));
    return;
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.normalize(path.join(DIST, p));
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('El cliente no está compilado. Ejecuta "npm run build" (run.bat lo hace automáticamente).');
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('No encontrado'); return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': p.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'x-content-type-options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024, perMessageDeflate: { threshold: 1024 } });
attachNetwork(wss, game, db);
game.start();
cloud.start();

let lastBuildHash = getBuildHash();
setInterval(() => {
  const cur = getBuildHash();
  if (cur && lastBuildHash && cur !== lastBuildHash) {
    lastBuildHash = cur;
    console.log(`[servidor] Nueva compilación detectada (${cur}): actualizando jugadores en tiempo real...`);
    game.saveAll();
    for (const p of game.players.values()) {
      try {
        p.ws.send(JSON.stringify({ t: 'note', text: '✨ ¡Nueva actualización en tiempo real! Cargando novedades...', kind: 'shiny' }));
        p.ws.send(JSON.stringify({ t: 'live_update', build: cur, version: ENV.VERSION }));
      } catch { /* */ }
    }
  } else if (cur && !lastBuildHash) {
    lastBuildHash = cur;
  }
}, 2500);

server.on('error', (e: any) => {
  if (e.code === 'EADDRINUSE') console.error(`\n[ERROR] El puerto ${ENV.PORT} ya está en uso. Cierra la otra instancia o cambia PORT en .env`);
  else console.error('[ERROR] servidor HTTP:', e);
  process.exit(1);
});

server.listen(ENV.PORT, ENV.HOST, () => {
  console.log(`\n  Juega en este ordenador:  http://localhost:${ENV.PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const n of nets[name] || []) {
      if (n.family === 'IPv4' && !n.internal) console.log(`  Amigos en tu red (LAN):   http://${n.address}:${ENV.PORT}`);
    }
  }
  if (ENV.TUNNEL) tunnel.start();
  else console.log('\n  Para jugar por Internet consulta el README (Tailscale / Cloudflare Tunnel / servidor público).');
  if (cloud.enabled) console.log(`  Enlace fijo para jugar desde cualquier sitio: ${ENV.CLOUD_URL.replace(/\/$/, '')}/jugar`);
  console.log('  Pulsa Ctrl+C para detener el servidor (se guardan todas las partidas).\n');
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n[servidor] guardando partidas y cerrando...');
  game.stop();
  game.saveAll();
  for (const p of game.players.values()) { try { p.ws.close(1001, 'server shutdown'); } catch { /* */ } }
  db.close();
  cloud.stop();
  tunnel.stop();
  // última subida a la nube (como mucho 6 s) antes de salir
  Promise.race([cloud.flush(), new Promise(r => setTimeout(r, 6000))]).finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGBREAK', shutdown);
process.on('uncaughtException', (e) => { console.error('[ERROR no controlado]', e); });
