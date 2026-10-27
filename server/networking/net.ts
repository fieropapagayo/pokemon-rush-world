// Conexiones WebSocket: autenticación, límites de frecuencia y enrutado de mensajes.
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import { PROTOCOL_VERSION } from '../../shared/constants';
import { DB } from '../database/db';
import type { Game } from '../world/game';
import { coreOf } from '../world/game';
import { PlayerSession } from '../world/entities';
import { sanitizeSave, defaultSave } from '../players/save';
import { handle, ensureBounties, leaveParty, checkDaily } from '../players/actions';
import { ENV } from '../env';
import crypto from 'node:crypto';

const NAME_RE = /^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,16}$/;
const MAX_MSGS_PER_SEC = 90;

interface GoogleTicket { sub: string; email: string; given: string; linked: string; exp: number; }
/** Verifica el pase que firma la web de Cloudflare tras entrar con Google (misma clave secreta que CLOUD_KEY). */
export function verifyTicket(ticket: string): GoogleTicket | null {
  if (!ENV.CLOUD_KEY || typeof ticket !== 'string' || ticket.length > 2000) return null;
  const [body, sig] = ticket.split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', ENV.CLOUD_KEY).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const t = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof t.sub !== 'string' || !t.sub || !(t.exp > Date.now())) return null;
    return { sub: t.sub.slice(0, 64), email: String(t.email || ''), given: String(t.given || ''), linked: String(t.linked || ''), exp: t.exp };
  } catch { return null; }
}
const suggestName = (given: string) => given.normalize('NFD').replace(/[^A-Za-z0-9_]/g, '').slice(0, 14) || 'Entrenador';

/** Si la cuenta no existe en este servidor pero hay copia en la nube, se recrea con su partida
 *  (con su contraseña, o vinculada a su cuenta de Google). */
async function restoreFromCloud(game: Game, db: DB, msg: any) {
  if (!game.cloud?.enabled) return;
  let name = String(msg.name || '').trim(), googleSub = '', sessionHash = '';
  if (msg.mode === 'token') {
    sessionHash = DB.tokenHash(String(msg.token || ''));
    const owner = await game.cloud.sessionOwner(sessionHash);
    if (!owner) return;
    const local = db.findAccount(owner);
    if (local) { db.addSessionHash(sessionHash, local.id); return; }
    name = owner;
  }
  if (msg.mode === 'google') {
    const t = verifyTicket(String(msg.ticket || ''));
    if (!t || db.findGoogle(t.sub) || !t.linked) return;
    name = t.linked; googleSub = t.sub;
  } else if (msg.mode !== 'login' && msg.mode !== 'token') return;
  if (!NAME_RE.test(name) || db.findAccount(name)) return;
  const b = await game.cloud.restore(name);
  if (!b || db.findAccount(name)) return;
  if (!googleSub && !sessionHash && (!b.pass_hash || !b.salt)) return;
  const id = db.createAccountRaw(name, b.pass_hash || null, b.salt || null, !!b.guest && !b.pass_hash);
  if (googleSub) db.linkGoogle(id, googleSub);
  if (sessionHash) db.addSessionHash(sessionHash, id);
  db.writeSave(id, b.save);
  console.log(`[nube] cuenta ${name} restaurada desde la copia de seguridad`);
}

// ---------------------------------------------------------------- límites contra fuerza bruta
// Por IP: como mucho 12 accesos fallidos en 10 min y 40 conexiones por minuto.
// Por cuenta: 5 contraseñas incorrectas seguidas la bloquean 5 minutos (aunque cambie la IP).
const ipFails = new Map<string, { n: number; since: number }>();
const accFails = new Map<string, { n: number; until: number }>();
const ipConns = new Map<string, { n: number; since: number }>();
function hit(m: Map<string, { n: number; since: number }>, k: string, win: number) {
  const now = Date.now(); let e = m.get(k);
  if (!e || now - e.since > win) { e = { n: 0, since: now }; m.set(k, e); }
  e.n++; return e.n;
}
function blockedIp(ip: string) { const e = ipFails.get(ip); return !!e && e.n >= 12 && Date.now() - e.since < 600000; }
function accountLocked(name: string) { const e = accFails.get(name.toLowerCase()); return !!e && e.n >= 5 && Date.now() < e.until; }
function noteFail(ip: string, msg: any, error: string) {
  hit(ipFails, ip, 600000);
  if (msg.mode === 'login' && /contraseña incorrectos/.test(error)) {
    const k = String(msg.name || '').toLowerCase(); const e = accFails.get(k) || { n: 0, until: 0 };
    e.n++; if (e.n >= 5) e.until = Date.now() + 300000; accFails.set(k, e);
  }
}
setInterval(() => { const now = Date.now(); for (const [k, e] of ipFails) if (now - e.since > 600000) ipFails.delete(k); for (const [k, e] of ipConns) if (now - e.since > 60000) ipConns.delete(k); for (const [k, e] of accFails) if (now > e.until && e.n >= 5) accFails.delete(k); }, 60000).unref?.();

export function attachNetwork(wss: WebSocketServer, game: Game, db: DB) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ip = (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    if (hit(ipConns, ip, 60000) > 40) { ws.close(4029, 'too many connections'); return; }
    let session: PlayerSession | null = null;
    let authTries = 0, restoring = false;
    let count = 0, windowStart = Date.now();
    const send = (m: any) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
    const authTimer = setTimeout(() => { if (!session) ws.close(4000, 'auth timeout'); }, 60000);

    ws.on('message', (data: Buffer, isBinary: boolean) => {
      if (isBinary) return;
      const now = Date.now();
      if (now - windowStart > 1000) { windowStart = now; count = 0; }
      if (++count > MAX_MSGS_PER_SEC) { ws.close(4008, 'rate limit'); return; }
      let msg: any;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
      if (!session) {
        if (msg.t === 'hello') { send({ t: 'server', name: ENV.SERVER_NAME, v: PROTOCOL_VERSION, players: game.players.size, guests: ENV.ALLOW_GUESTS, cloud: ENV.CLOUD_URL }); return; }
        if (msg.t !== 'auth') return;
        if (restoring) return;
        if (++authTries > 8) { ws.close(4009, 'too many auth attempts'); return; }
        if (blockedIp(ip)) { send({ t: 'auth_err', msg: 'Demasiados intentos fallidos desde tu conexión. Espera unos minutos.' }); return; }
        if (msg.mode === 'login' && accountLocked(String(msg.name || ''))) { send({ t: 'auth_err', msg: 'Cuenta bloqueada 5 minutos por demasiadas contraseñas incorrectas.' }); return; }
        const needsCloud = msg.mode === 'token' ? !db.findSession(String(msg.token || ''))
          : msg.mode === 'login' ? !db.findAccount(String(msg.name || '').trim())
          : msg.mode === 'google' ? (() => { const t = verifyTicket(String(msg.ticket || '')); return !!t && !db.findGoogle(t.sub) && !!t.linked; })() : false;
        if (needsCloud && game.cloud?.enabled) {
          restoring = true;
          restoreFromCloud(game, db, msg).catch(() => {}).finally(() => {
            restoring = false;
            if (session || ws.readyState !== 1) return;
            const r = authenticate(db, msg);
            if ('error' in r) { if (!r.code) noteFail(ip, msg, r.error); send({ t: 'auth_err', msg: r.error, code: r.code, suggest: r.suggest }); return; }
            clearTimeout(authTimer);
            session = login(game, db, ws, r.accountId, r.guest, r.token, ip);
          });
          return;
        }
        const res = authenticate(db, msg);
        if ('error' in res) { if (!res.code) noteFail(ip, msg, res.error); send({ t: 'auth_err', msg: res.error, code: res.code, suggest: res.suggest }); return; }
        if (msg.mode === 'login') accFails.delete(String(msg.name || '').toLowerCase());
        if (game.players.size >= ENV.MAX_PLAYERS && !game.byAccount.has(res.accountId)) { send({ t: 'auth_err', msg: 'El servidor está lleno.' }); return; }
        clearTimeout(authTimer);
        session = login(game, db, ws, res.accountId, res.guest, res.token, ip);
        return;
      }
      try { handle(game, session, msg); } catch (e) { console.error('[net] error manejando', msg.t, e); }
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      if (session) logout(game, session);
    });
    ws.on('error', () => { /* se gestiona en close */ });
  });
}

function authenticate(db: DB, msg: any): { accountId: number; guest: boolean; token: string } | { error: string; code?: string; suggest?: string } {
  const mode = msg.mode;
  if (mode === 'google') {
    const t = verifyTicket(String(msg.ticket || ''));
    if (!t) return { error: 'El acceso con Google ha caducado. Vuelve a entrar con Google.' };
    const acc = db.findGoogle(t.sub);
    if (acc) return { accountId: acc.id, guest: false, token: db.createSession(acc.id) };
    const nm = String(msg.name || '').trim();
    const suggest = suggestName(t.given);
    if (!nm) return { error: '¡Bienvenido! Elige tu nombre de entrenador.', code: 'need_name', suggest };
    if (!NAME_RE.test(nm)) return { error: 'Nombre no válido: 3-16 letras, números o _.', code: 'need_name', suggest };
    if (db.findAccount(nm)) return { error: 'Ese nombre ya está en uso. Elige otro.', code: 'need_name', suggest };
    const id = db.createAccount(nm, null, false);
    db.linkGoogle(id, t.sub);
    return { accountId: id, guest: false, token: db.createSession(id) };
  }
  if (mode === 'token') {
    const id = db.findSession(String(msg.token || ''));
    if (!id) return { error: 'Sesión caducada. Inicia sesión de nuevo.' };
    const acc = db.getAccount(id);
    if (!acc) return { error: 'Cuenta no encontrada.' };
    return { accountId: id, guest: !!acc.guest, token: String(msg.token) };
  }
  const name = String(msg.name || '').trim();
  if (!NAME_RE.test(name)) return { error: 'Nombre no válido: 3-16 letras, números o _.' };
  if (mode === 'guest') {
    if (!ENV.ALLOW_GUESTS) return { error: 'Este servidor no admite invitados.' };
    if (db.findAccount(name)) return { error: 'Ese nombre ya está en uso. Elige otro o inicia sesión.' };
    const id = db.createAccount(name, null, true);
    return { accountId: id, guest: true, token: db.createSession(id) };
  }
  const pass = String(msg.pass || '');
  if (pass.length < 6 || pass.length > 64) return { error: 'La contraseña debe tener entre 6 y 64 caracteres.' };
  if (mode === 'register') {
    if (db.findAccount(name)) return { error: 'Ese nombre ya está registrado.' };
    const id = db.createAccount(name, pass, false);
    return { accountId: id, guest: false, token: db.createSession(id) };
  }
  if (mode === 'login') {
    const acc = db.findAccount(name);
    if (!acc || !acc.pass_hash || !acc.salt || !DB.verifyPassword(pass, acc.salt, acc.pass_hash)) return { error: 'Usuario o contraseña incorrectos.' };
    return { accountId: acc.id, guest: false, token: db.createSession(acc.id) };
  }
  return { error: 'Modo de acceso desconocido.' };
}

function login(game: Game, db: DB, ws: WebSocket, accountId: number, guest: boolean, token: string, ip: string): PlayerSession {
  const prev = game.byAccount.get(accountId);
  if (prev) {
    prev.send({ t: 'kicked', msg: 'Has iniciado sesión desde otro lugar.' });
    logout(game, prev);
    try { prev.ws.close(4001, 'replaced'); } catch { /* ya cerrada */ }
  }
  const acc = db.getAccount(accountId)!;
  db.touchLogin(accountId);
  const raw = db.loadSave(accountId);
  const save = raw ? sanitizeSave(raw, acc.username) : defaultSave(acc.username);
  save.name = acc.username;
  const p = new PlayerSession(game.nextPlayerId++, accountId, ws, save, guest);
  p.ip = ip;
  // si el guardado apunta a un lugar bloqueado, volver al pueblo
  const ti = Math.floor(p.y) * game.world.w + Math.floor(p.x);
  if (game.world.solid[ti] !== 0) { const t = game.world.towns[0]; p.x = t.spawn.x + 0.5; p.y = t.spawn.y + 0.5; }
  game.players.set(p.id, p);
  game.byAccount.set(accountId, p);
  p.zone = game.zoneAt(p.x, p.y).id;
  game.rebuildTeam(p);
  p.hp = p.maxHp;
  if (save.mons.length) ensureBounties(p);
  if (save.mons.length) setTimeout(() => { if (!p.closed) checkDaily(game, p); }, 2500);
  p.send({
      t: 'welcome', id: p.id, token, seed: game.world.seed, now: Date.now(), guest, shinyBase: ENV.SHINY_RATE,
    needStarter: save.mons.length === 0, x: p.x, y: p.y, seq: p.tpSeq,
    core: coreOf(p, game), mons: save.mons,
    players: [...game.players.values()].map(o => game.metaOf(o)),
    bosses: game.bosses.info(), events: game.wevents.list(),
  });
  game.broadcastMeta(p);
  game.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `${p.name} se ha conectado.` });
  console.log(`[+] ${p.name} conectado (${ip}) — ${game.players.size} jugador(es)`);
  return p;
}

function logout(game: Game, p: PlayerSession) {
  if (p.closed) return;
  game.trades.cancel(p, `${p.name} se ha desconectado.`);
  p.closed = true;
  leaveParty(game, p);
  game.savePlayer(p);
  for (const m of p.team) { game.mons.delete(m.id); game.emit(m.x, m.y, ['rm', m.id]); }
  game.players.delete(p.id);
  if (game.byAccount.get(p.accountId) === p) game.byAccount.delete(p.accountId);
  for (const m of game.mons.values()) if (m.target === p || (m.target && (m.target as any).owner === p)) m.target = null;
  game.broadcast({ t: 'pleft', id: p.id });
  game.broadcast({ t: 'chat', ch: 'sys', from: '', msg: `${p.name} se ha desconectado.` });
  console.log(`[-] ${p.name} desconectado — ${game.players.size} jugador(es)`);
}
