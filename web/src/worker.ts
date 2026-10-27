// Cloudflare Worker de Pokémon Rush World: API de estadísticas, ranking y copias de seguridad en la nube.
// Funciona en el plan gratuito (Workers + D1). La web pública (carpeta public/) la sirve el propio Worker.
//
//   Público:  GET  /api/stats · /api/leaderboard?by=level|dex|shiny|pvp|playtime|catches · /api/player/:nombre · /api/feed · /api/servers
//   Servidor: POST /api/sync · /api/heartbeat · /api/feed   GET /api/backup/:nombre      (cabecera Authorization: Bearer SYNC_KEY)

interface D1Result<T = any> { results: T[]; }
interface D1Stmt { bind(...v: unknown[]): D1Stmt; first<T = any>(): Promise<T | null>; all<T = any>(): Promise<D1Result<T>>; run(): Promise<unknown>; }
interface D1 { prepare(sql: string): D1Stmt; batch(stmts: D1Stmt[]): Promise<unknown[]>; }
interface Env { DB: D1; SYNC_KEY: string; GOOGLE_CLIENT_ID?: string; ASSETS: { fetch(r: Request): Promise<Response> }; }

// ---------------------------------------------------------------- Google y pase de acceso al juego
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function hmac(key: string, data: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}
/** Pase firmado (5 min) que el servidor de juego verifica con la misma clave secreta. */
async function makeTicket(env: Env, claims: Record<string, unknown>) {
  const body = b64u(new TextEncoder().encode(JSON.stringify({ ...claims, exp: Date.now() + 5 * 60000 })));
  return body + '.' + await hmac(env.SYNC_KEY, body);
}

/** Servidores de juego vivos (los que han enviado latido en los últimos 3 minutos). */
async function liveServers(env: Env) {
  const r = await env.DB.prepare('SELECT url FROM servers WHERE last_seen > ? AND url != \'\' ORDER BY last_seen DESC').bind(Date.now() - 180000).all();
  return r.results.map((x: any) => String(x.url).replace(/\/$/, ''));
}

async function google(req: Request, env: Env) {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'El acceso con Google no está configurado (falta GOOGLE_CLIENT_ID).' }, 503);
  const b: any = await req.json().catch(() => ({}));
  const cred = s(b.credential, 4096);
  if (!cred) return json({ error: 'Falta la credencial de Google.' }, 400);
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred));
  if (!r.ok) return json({ error: 'Google no ha validado el inicio de sesión.' }, 401);
  const t: any = await r.json();
  const okIss = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
  if (t.aud !== env.GOOGLE_CLIENT_ID || !okIss || Number(t.exp) * 1000 < Date.now() || String(t.email_verified) !== 'true') return json({ error: 'Credencial de Google no válida.' }, 401);
  const link: any = await env.DB.prepare('SELECT name FROM google_links WHERE sub = ?').bind(String(t.sub)).first();
  const ticket = await makeTicket(env, { sub: String(t.sub), email: s(t.email, 120), given: s(t.given_name || t.name, 40), linked: link?.name || '' });
  // solo se devuelve el pase a orígenes de confianza: servidores vivos o este mismo PC
  const live = await liveServers(env);
  let back = s(b.back, 300).replace(/\/$/, '');
  const okBack = back && (live.includes(back) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(back));
  if (!okBack) back = live[0] || '';
  return json({ ticket, name: link?.name || '', back });
}

async function play(env: Env, search = '') {
  const live = await liveServers(env);
  // se conserva ?amigo=Nombre para los enlaces de invitación
  const q = new URLSearchParams(search), amigo = (q.get('amigo') || '').replace(/[^A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]/g, '').slice(0, 16);
  if (live.length) return new Response(null, { status: 302, headers: { location: live[0] + '/' + (amigo ? '?amigo=' + encodeURIComponent(amigo) : ''), 'cache-control': 'no-store' } });
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pokémon Rush World</title>
    <body style="font-family:system-ui;background:#0c171c;color:#eef3ea;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center">
    <div><h1 style="color:#ffd24a">El servidor está apagado</h1><p>Ahora mismo no hay ningún servidor de juego encendido.<br>Vuelve a intentarlo cuando el anfitrión abra <b>run.bat</b>.</p>
    <p><a style="color:#f2d28b" href="/">Ver el ranking</a> · <a style="color:#f2d28b" href="/jugar">Reintentar</a></p></div>`, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

const SORTS: Record<string, string> = {
  level: 'level DESC, dex_caught DESC', dex: 'dex_caught DESC, level DESC', shiny: 'shinies DESC, legends DESC', pvp: 'elo DESC, pvp_w DESC',
  playtime: 'playtime DESC', catches: 'catches DESC', legends: 'legends DESC, shinies DESC',
};
const PUBLIC_COLS = 'name, server, guest, level, dex_caught, dex_seen, shinies, legends, catches, kills, bosses, medals, elo, pvp_w, pvp_l, playtime, team, look, created, updated';
const NAME_RE = /^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,16}$/;

const json = (data: unknown, status = 200, cache = 0) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': cache ? `public, max-age=${cache}` : 'no-store',
  },
});

function authed(req: Request, env: Env) {
  const h = req.headers.get('authorization') || '';
  const key = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!env.SYNC_KEY || key.length < 16 || key.length !== env.SYNC_KEY.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ env.SYNC_KEY.charCodeAt(i);
  return diff === 0;
}

const n = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : d);
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Resumen público calculado a partir del guardado completo que envía el servidor de juego. */
function summarize(save: any) {
  const dex = save?.dex || {};
  const caught = Object.values(dex.caught || {}).filter((v: any) => v > 0).length;
  const seen = Object.keys(dex.seen || {}).length;
  const mons: any[] = Array.isArray(save?.mons) ? save.mons : [];
  const legends = mons.filter(m => ['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'raikou', 'entei', 'suicune', 'lugia', 'hooh', 'rayquaza', 'celebi', 'jirachi', 'darkrai'].includes(m.sp)).length;
  const team = (Array.isArray(save?.team) ? save.team : []).map((u: string) => mons.find(m => m.uid === u)).filter(Boolean)
    .map((m: any) => ({ sp: s(m.sp, 20), lvl: n(m.lvl, 1), shiny: !!m.shiny, nick: s(m.nick, 12) || undefined }));
  const st = save?.stats || {};
  return {
    level: n(save?.tlvl, 1), dex_caught: caught, dex_seen: seen, shinies: n(st.shinies), legends, catches: n(st.catches), kills: n(st.kills),
    bosses: n(st.bosses), medals: Array.isArray(save?.medals) ? save.medals.length : 0, elo: n(save?.pvp?.elo, 1000), pvp_w: n(save?.pvp?.w), pvp_l: n(save?.pvp?.l),
    money: n(save?.money), playtime: n(save?.playtime), team: JSON.stringify(team.slice(0, 6)), look: JSON.stringify(save?.look || {}), created: n(save?.created),
  };
}

async function sync(req: Request, env: Env) {
  const body: any = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.players)) return json({ error: 'cuerpo no válido' }, 400);
  const server = s(body.server, 60);
  const now = Date.now();
  const stmts: D1Stmt[] = [];
  let done = 0;
  for (const p of body.players.slice(0, 100)) {
    const name = s(p?.name, 16);
    if (!NAME_RE.test(name) || !p.save || typeof p.save !== 'object') continue;
    const data = JSON.stringify(p.save);
    if (data.length > 900_000) continue;
    const sm = summarize(p.save);
    stmts.push(env.DB.prepare(`INSERT INTO players (name, server, guest, level, dex_caught, dex_seen, shinies, legends, catches, kills, bosses, medals, elo, pvp_w, pvp_l, money, playtime, team, look, created, updated)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
      ON CONFLICT(name) DO UPDATE SET server = ?2, guest = ?3, level = ?4, dex_caught = ?5, dex_seen = ?6, shinies = ?7, legends = ?8, catches = ?9, kills = ?10, bosses = ?11,
        medals = ?12, elo = ?13, pvp_w = ?14, pvp_l = ?15, money = ?16, playtime = ?17, team = ?18, look = ?19, updated = ?21`)
      .bind(name, server, p.guest ? 1 : 0, sm.level, sm.dex_caught, sm.dex_seen, sm.shinies, sm.legends, sm.catches, sm.kills, sm.bosses, sm.medals, sm.elo, sm.pvp_w, sm.pvp_l, sm.money, sm.playtime, sm.team, sm.look, sm.created || now, now));
    stmts.push(env.DB.prepare(`INSERT INTO saves (name, data, pass_hash, salt, guest, version, updated) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)
      ON CONFLICT(name) DO UPDATE SET data = ?2, pass_hash = COALESCE(?3, pass_hash), salt = COALESCE(?4, salt), guest = ?5, version = version + 1, updated = ?6`)
      .bind(name, data, p.pass_hash ? s(p.pass_hash, 256) : null, p.salt ? s(p.salt, 128) : null, p.guest ? 1 : 0, now));
    if (Array.isArray(p.sessions)) for (const h of p.sessions.slice(0, 5)) if (/^[0-9a-f]{64}$/.test(h)) stmts.push(env.DB.prepare('INSERT INTO session_links (hash, name, updated) VALUES (?1, ?2, ?3) ON CONFLICT(hash) DO UPDATE SET name = ?2, updated = ?3').bind(h, name, now));
    if (p.google_sub) stmts.push(env.DB.prepare('INSERT INTO google_links (sub, name, updated) VALUES (?1, ?2, ?3) ON CONFLICT(sub) DO UPDATE SET name = ?2, updated = ?3').bind(s(p.google_sub, 64), name, now));
    done++;
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, synced: done, at: now });
}

async function heartbeat(req: Request, env: Env) {
  const b: any = await req.json().catch(() => ({}));
  const id = s(b.id, 40) || 'principal';
  await env.DB.prepare(`INSERT INTO servers (id, name, url, online, max, version, tick_ms, last_seen) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    ON CONFLICT(id) DO UPDATE SET name = ?2, url = ?3, online = ?4, max = ?5, version = ?6, tick_ms = ?7, last_seen = ?8`)
    .bind(id, s(b.name, 60) || 'Servidor', s(b.url, 200), n(b.online), n(b.max), s(b.version, 20), Number(b.tickMs) || 0, Date.now()).run();
  return json({ ok: true });
}

async function addFeed(req: Request, env: Env) {
  const b: any = await req.json().catch(() => ({}));
  const items = Array.isArray(b.items) ? b.items.slice(0, 50) : [];
  const stmts = items.map((it: any) => env.DB.prepare('INSERT INTO feed (kind, text, at) VALUES (?, ?, ?)').bind(s(it.kind, 20), s(it.text, 200), n(it.at, Date.now())));
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, added: stmts.length });
}

async function stats(env: Env) {
  const t: any = await env.DB.prepare(`SELECT COUNT(*) AS players, COALESCE(SUM(catches),0) AS catches, COALESCE(SUM(shinies),0) AS shinies, COALESCE(SUM(legends),0) AS legends,
    COALESCE(SUM(kills),0) AS kills, COALESCE(SUM(playtime),0) AS playtime, COALESCE(SUM(pvp_w),0) AS duels, COALESCE(MAX(level),0) AS top_level FROM players`).first();
  const active: any = await env.DB.prepare('SELECT COUNT(*) AS n FROM players WHERE updated > ?').bind(Date.now() - 86400000).first();
  const servers = await env.DB.prepare('SELECT id, name, url, online, max, version, tick_ms, last_seen FROM servers ORDER BY last_seen DESC LIMIT 10').all();
  const now = Date.now();
  return json({ ...t, active24h: active?.n || 0, servers: servers.results.map((x: any) => ({ ...x, alive: now - x.last_seen < 3 * 60000 })), now }, 200, 30);
}

async function leaderboard(url: URL, env: Env) {
  const by = SORTS[url.searchParams.get('by') || 'level'] ? url.searchParams.get('by') || 'level' : 'level';
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
  const r = await env.DB.prepare(`SELECT ${PUBLIC_COLS} FROM players ORDER BY ${SORTS[by]} LIMIT ?`).bind(limit).all();
  return json({ by, players: r.results.map(fix) }, 200, 30);
}

function fix(p: any) {
  try { p.team = JSON.parse(p.team); } catch { p.team = []; }
  try { p.look = JSON.parse(p.look); } catch { p.look = {}; }
  return p;
}

async function player(name: string, env: Env) {
  const p = await env.DB.prepare(`SELECT ${PUBLIC_COLS} FROM players WHERE name = ?`).bind(name).first();
  if (!p) return json({ error: 'Entrenador no encontrado' }, 404);
  const rank: any = await env.DB.prepare('SELECT COUNT(*) + 1 AS r FROM players WHERE level > ? OR (level = ? AND dex_caught > ?)').bind((p as any).level, (p as any).level, (p as any).dex_caught).first();
  return json({ ...fix(p), rank: rank?.r || 0 }, 200, 20);
}

async function backup(name: string, env: Env) {
  const r: any = await env.DB.prepare('SELECT name, data, pass_hash, salt, guest, updated FROM saves WHERE name = ?').bind(name).first();
  if (!r) return json({ error: 'sin copia' }, 404);
  return json({ name: r.name, save: JSON.parse(r.data), pass_hash: r.pass_hash, salt: r.salt, guest: !!r.guest, updated: r.updated });
}

// ---------------------------------------------------------------- límites y cabeceras de seguridad
// Límite por IP en memoria de cada instancia (suficiente para frenar abusos y fuerza bruta).
const buckets = new Map<string, { n: number; since: number }>();
function tooMany(key: string, max: number, windowMs: number) {
  const now = Date.now(); let b = buckets.get(key);
  if (!b || now - b.since > windowMs) { b = { n: 0, since: now }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now - v.since > 600000) buckets.delete(k);
  return b.n > max;
}
const LIMITS: [RegExp, number, number][] = [
  [/^\/api\/google$/, 12, 60000],          // inicios de sesión con Google
  [/^\/api\/player\//, 90, 60000],
  [/^\/api\/(leaderboard|stats|feed|servers|config)$/, 120, 60000],
  [/^\/jugar$|^\/play$/, 60, 60000],
];
const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; frame-ancestors 'none'",
};
/** Límite compartido entre todas las instancias (en D1): para inicios de sesión e intentos con clave. */
async function limitedDb(env: Env, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const r: any = await env.DB.prepare(`INSERT INTO rate (k, n, since) VALUES (?1, 1, ?2)
    ON CONFLICT(k) DO UPDATE SET n = CASE WHEN ?2 - since > ?3 THEN 1 ELSE n + 1 END, since = CASE WHEN ?2 - since > ?3 THEN ?2 ELSE since END
    RETURNING n`).bind(key, now, windowMs).first();
  return (r?.n || 0) > max;
}

function withHeaders(r: Response) {
  const h = new Headers(r.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET' } });
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    for (const [re, max, win] of LIMITS) if (re.test(path) && tooMany(ip + path.replace(/\/[^/]+$/, ''), max, win)) return json({ error: 'Demasiadas peticiones. Espera un momento.' }, 429);
    try {
      if (path === '/api/health') return json({ ok: true, now: Date.now() });
      if (path === '/jugar' || path === '/play') return await play(env, url.search);
      if (path === '/api/config') return json({ googleClientId: env.GOOGLE_CLIENT_ID || '', servers: await liveServers(env) });
      if (path === '/api/google' && req.method === 'POST') { if (await limitedDb(env, 'g:' + ip, 12, 60000)) return json({ error: 'Demasiados intentos. Espera un minuto.' }, 429); return await google(req, env); }
      if (path === '/api/stats') return await stats(env);
      if (path === '/api/leaderboard') return await leaderboard(url, env);
      if (path === '/api/feed' && req.method === 'GET') return json((await env.DB.prepare('SELECT kind, text, at FROM feed ORDER BY at DESC LIMIT 40').all()).results, 200, 20);
      if (path === '/api/servers') return json((await env.DB.prepare('SELECT * FROM servers ORDER BY last_seen DESC').all()).results);
      const pm = path.match(/^\/api\/player\/([^/]{3,16})$/);
      if (pm) return await player(decodeURIComponent(pm[1]), env);
      if (path.startsWith('/api/')) {
        if (!authed(req, env)) {
          if (await limitedDb(env, 'bad:' + ip, 20, 600000)) return json({ error: 'Demasiados intentos. Bloqueado 10 minutos.' }, 429);
          return json({ error: 'no autorizado' }, 401);
        }
        if (path === '/api/sync' && req.method === 'POST') return await sync(req, env);
        if (path === '/api/heartbeat' && req.method === 'POST') return await heartbeat(req, env);
        if (path === '/api/feed' && req.method === 'POST') return await addFeed(req, env);
        const sm = path.match(/^\/api\/session\/([0-9a-f]{64})$/);
        if (sm) { const r: any = await env.DB.prepare('SELECT name FROM session_links WHERE hash = ?').bind(sm[1]).first(); return r ? json({ name: r.name }) : json({ error: 'sin sesión' }, 404); }
        const bm = path.match(/^\/api\/backup\/([^/]{3,16})$/);
        if (bm && req.method === 'GET') return await backup(decodeURIComponent(bm[1]), env);
        return json({ error: 'ruta desconocida' }, 404);
      }
      return withHeaders(await env.ASSETS.fetch(req));
    } catch (e: any) {
      return json({ error: 'error interno', detail: String(e?.message || e).slice(0, 200) }, 500);
    }
  },

  /** Cron (cada hora): histórico diario y limpieza del muro de eventos. */
  async scheduled(_ev: unknown, env: Env): Promise<void> {
    // Mantiene despiertos los servidores de juego en hostings gratuitos que se duermen sin tráfico
    const recent = await env.DB.prepare('SELECT url FROM servers WHERE last_seen > ? AND url LIKE \'https://%\' AND url NOT LIKE \'%trycloudflare.com%\'').bind(Date.now() - 7 * 86400000).all();
    await Promise.all(recent.results.map((r: any) => fetch(String(r.url).replace(/\/$/, '') + '/health').catch(() => null)));
    if (new Date().getUTCMinutes() >= 10) return; // el resto, una vez por hora
    const day = new Date().toISOString().slice(0, 10);
    const t: any = await env.DB.prepare('SELECT COUNT(*) AS p, COALESCE(SUM(catches),0) AS c, COALESCE(SUM(shinies),0) AS s FROM players').first();
    const peak: any = await env.DB.prepare('SELECT COALESCE(SUM(online),0) AS o FROM servers WHERE last_seen > ?').bind(Date.now() - 180000).first();
    await env.DB.prepare(`INSERT INTO daily (day, players, catches, shinies, peak) VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(day) DO UPDATE SET players = ?2, catches = ?3, shinies = ?4, peak = MAX(peak, ?5)`).bind(day, t.p, t.c, t.s, peak?.o || 0).run();
    await env.DB.prepare('DELETE FROM feed WHERE at < ?').bind(Date.now() - 14 * 86400000).run();
    await env.DB.prepare('DELETE FROM rate WHERE since < ?').bind(Date.now() - 86400000).run();
  },
};
