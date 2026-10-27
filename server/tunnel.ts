// Túnel público automático (Cloudflare Quick Tunnel, gratis, sin abrir puertos).
// Con TUNNEL=true en .env el servidor lanza cloudflared, obtiene una dirección https://xxxx.trycloudflare.com
// y la comunica a la web (botón "Jugar ahora" y enlace fijo /jugar), que siempre apunta a la dirección vigente.
import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { ENV } from './env';

const CANDIDATES = [
  'cloudflared',
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
];

export class Tunnel {
  url = '';
  private proc: ChildProcess | null = null;
  private stopped = false;

  constructor(private onUrl: (url: string) => void) {}

  private bin() { return CANDIDATES.slice(1).find(c => fs.existsSync(c)) || CANDIDATES[0]; }

  start() {
    if (!ENV.TUNNEL) return;
    this.stopped = false;
    const exe = this.bin();
    console.log('[túnel] abriendo dirección pública con Cloudflare...');
    try {
      this.proc = spawn(exe, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${ENV.PORT}`], { windowsHide: true });
    } catch (e: any) { console.warn('[túnel] no se pudo iniciar cloudflared:', e?.message || e); return; }
    const read = (d: Buffer) => {
      const m = d.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (m && m[0] !== this.url) {
        this.url = m[0];
        console.log(`\n  Juega por Internet:       ${this.url}\n`);
        this.onUrl(this.url);
      }
    };
    this.proc.stdout?.on('data', read);
    this.proc.stderr?.on('data', read);
    this.proc.on('error', (e: any) => {
      if (e?.code === 'ENOENT') console.warn('[túnel] cloudflared no está instalado. Instálalo con: winget install --id Cloudflare.cloudflared');
      else console.warn('[túnel] error:', e?.message || e);
      this.proc = null;
    });
    this.proc.on('exit', () => {
      this.proc = null;
      if (this.stopped) return;
      console.warn('[túnel] se cerró; se reabrirá en 15 s');
      setTimeout(() => { if (!this.stopped) this.start(); }, 15000);
    });
  }

  stop() { this.stopped = true; try { this.proc?.kill(); } catch { /* ya cerrado */ } }
}
