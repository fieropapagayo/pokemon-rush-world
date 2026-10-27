// Cliente WebSocket con despacho por tipo de mensaje y estimación de latencia/reloj del servidor.

type Handler = (m: any) => void;

export class Net {
  ws: WebSocket | null = null;
  handlers = new Map<string, Handler[]>();
  open = false;
  ping = 0;
  serverOffset = 0;       // serverTime - Date.now()
  bytesIn = 0;
  private pingTimer: any = null;

  url() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(this.url());
      this.ws = ws;
      ws.onopen = () => {
        this.open = true; settled = true; resolve();
        this.pingTimer = setInterval(() => this.send({ t: 'ping', c: Date.now() }), 2000);
      };
      ws.onerror = () => { if (!settled) { settled = true; reject(new Error('No se pudo conectar con el servidor')); } };
      ws.onclose = (ev) => {
        this.open = false;
        clearInterval(this.pingTimer);
        this.dispatch({ t: '_closed', code: ev.code, reason: ev.reason });
        if (!settled) { settled = true; reject(new Error('Conexión cerrada')); }
      };
      ws.onmessage = (ev) => {
        this.bytesIn += (ev.data as string).length;
        let m: any;
        try { m = JSON.parse(ev.data); } catch { return; }
        if (m.t === 'pong') {
          const now = Date.now();
          this.ping = now - m.c;
          const est = m.s + this.ping / 2 - now;
          this.serverOffset = this.serverOffset === 0 ? est : this.serverOffset * 0.8 + est * 0.2;
        }
        if (m.t === 's' && m.ts) {
          // corrección suave del reloj con cada snapshot
          const est = m.ts + this.ping / 2 - Date.now();
          if (this.serverOffset === 0) this.serverOffset = est;
          else this.serverOffset += (est - this.serverOffset) * 0.02;
        }
        this.dispatch(m);
      };
    });
  }

  serverNow() { return Date.now() + this.serverOffset; }

  dispatch(m: any) {
    const hs = this.handlers.get(m.t);
    if (hs) for (const h of hs) { try { h(m); } catch (e) { console.error('handler', m.t, e); } }
  }

  on(t: string, h: Handler) {
    let a = this.handlers.get(t); if (!a) { a = []; this.handlers.set(t, a); }
    a.push(h);
    return () => { const i = a!.indexOf(h); if (i >= 0) a!.splice(i, 1); };
  }

  send(m: any) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m));
  }

  close() { try { this.ws?.close(); } catch { /* */ } }
}

export const net = new Net();
