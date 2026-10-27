// Sincronización con la nube (Cloudflare Worker + D1, carpeta web/): copia de seguridad de las partidas,
// estadísticas para la web pública, latido del servidor y muro de momentos épicos.
// Se activa poniendo CLOUD_URL y CLOUD_KEY en .env. Sin ellas el juego funciona igual, solo en local.
import { ENV } from './env';
import type { DB } from './database/db';
import type { PlayerSession } from './world/entities';

interface Item { name: string; guest: boolean; save: any; pass_hash?: string | null; salt?: string | null; google_sub?: string | null; sessions?: string[]; }

/** Dirección pública cuando el servidor corre en un hosting en la nube (Render, Fly.io, Koyeb, Railway). */
export function hostUrl() {
  const e = process.env;
  if (e.RENDER_EXTERNAL_URL) return e.RENDER_EXTERNAL_URL;
  if (e.FLY_APP_NAME) return `https://${e.FLY_APP_NAME}.fly.dev`;
  if (e.KOYEB_PUBLIC_DOMAIN) return `https://${e.KOYEB_PUBLIC_DOMAIN}`;
  if (e.RAILWAY_PUBLIC_DOMAIN) return `https://${e.RAILWAY_PUBLIC_DOMAIN}`;
  return '';
}

export class Cloud {
  enabled = /^https?:\/\//.test(ENV.CLOUD_URL) && !!ENV.CLOUD_KEY; // CLOUD_URL=off la desactiva
  private queue = new Map<string, Item>();
  private feedQ: { kind: string; text: string; at: number }[] = [];
  private timer: NodeJS.Timeout | null = null;
  private fails = 0;
  lastOk = 0;
  publicUrl = '';

  constructor(private db: DB, private stats: () => { online: number; max: number; tickMs: number }) {}

  start() {
    if (!this.enabled) { console.log('[nube] desactivada (añade CLOUD_URL y CLOUD_KEY a .env para guardar en Cloudflare)'); return; }
    console.log(`[nube] sincronizando con ${ENV.CLOUD_URL}`);
    setTimeout(() => this.heartbeat(), 3000);
    this.timer = setInterval(() => { this.flush(); this.heartbeat(); }, 60000);
  }
  stop() { if (this.timer) clearInterval(this.timer); }

  private async call(method: string, path: string, body?: unknown, timeoutMs = 8000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(ENV.CLOUD_URL.replace(/\/$/, '') + path, {
        method, signal: ctl.signal,
        headers: { authorization: 'Bearer ' + ENV.CLOUD_KEY, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!r.ok && r.status !== 404) throw new Error('HTTP ' + r.status);
      return r.status === 404 ? null : await r.json();
    } finally { clearTimeout(t); }
  }

  /** Pone en cola la partida de un jugador (se envía en el siguiente lote). */
  queuePlayer(p: PlayerSession) {
    if (!this.enabled) return;
    const acc = this.db.getAccount(p.accountId);
    this.queue.set(p.name.toLowerCase(), { name: p.name, guest: p.guest, save: p.save, pass_hash: ENV.CLOUD_AUTH ? acc?.pass_hash : null, salt: ENV.CLOUD_AUTH ? acc?.salt : null, google_sub: acc?.google_sub || null, sessions: this.db.sessionHashesOf(p.accountId) });
    // los guardados se agrupan: como mucho una subida cada 8 s
    if (!this.soon) this.soon = setTimeout(() => { this.soon = null; this.flush(); }, 8000);
  }
  private soon: NodeJS.Timeout | null = null;

  feed(kind: 'legend' | 'shiny' | 'duel' | 'boss', text: string) {
    if (!this.enabled) return;
    this.feedQ.push({ kind, text, at: Date.now() });
    if (this.feedQ.length > 50) this.feedQ.shift();
  }

  async flush() {
    if (!this.enabled) return;
    const items = [...this.queue.values()];
    this.queue.clear();
    try {
      for (let i = 0; i < items.length; i += 25) {
        // copia profunda en el momento del envío para no mandar un objeto a medio modificar
        const batch = items.slice(i, i + 25).map(it => ({ ...it, save: JSON.parse(JSON.stringify(it.save)) }));
        await this.call('POST', '/api/sync', { server: ENV.SERVER_NAME, players: batch }, 15000);
      }
      if (this.feedQ.length) { const items2 = this.feedQ.splice(0); await this.call('POST', '/api/feed', { items: items2 }); }
      if (this.fails) console.log('[nube] conexión recuperada');
      this.fails = 0; this.lastOk = Date.now();
    } catch (e: any) {
      for (const it of items) if (!this.queue.has(it.name.toLowerCase())) this.queue.set(it.name.toLowerCase(), it);
      if (this.fails++ % 10 === 0) console.warn('[nube] no se pudo sincronizar:', e?.message || e);
    }
  }

  async heartbeat() {
    if (!this.enabled) return;
    const s = this.stats();
    try { await this.call('POST', '/api/heartbeat', { id: ENV.CLOUD_SERVER_ID, name: ENV.SERVER_NAME, url: this.publicUrl || ENV.PUBLIC_URL || hostUrl(), online: s.online, max: s.max, tickMs: s.tickMs, version: ENV.VERSION }); }
    catch { /* el lote siguiente lo reintenta */ }
  }

  /** Busca a qué entrenador pertenece una sesión guardada (hash del token del navegador). */
  async sessionOwner(hash: string): Promise<string | null> {
    if (!this.enabled) return null;
    try { const r: any = await this.call('GET', '/api/session/' + hash, undefined, 6000); return r?.name || null; } catch { return null; }
  }

  /** Recupera una cuenta desde la nube si no existe en la base local (p. ej. tras perder data/). */
  async restore(name: string): Promise<{ save: any; pass_hash: string | null; salt: string | null; guest: boolean } | null> {
    if (!this.enabled) return null;
    try { return await this.call('GET', '/api/backup/' + encodeURIComponent(name), undefined, 6000); }
    catch (e: any) { console.warn('[nube] no se pudo consultar la copia de', name, e?.message || e); return null; }
  }
}
