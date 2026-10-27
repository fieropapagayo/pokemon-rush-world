// Utilidades DOM mínimas.

export function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K';
  return String(Math.floor(n));
}

export function time(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}h ${m}m` : m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
}

/** Hace arrastrable una ventana por su barra de título. */
export function draggable(win: HTMLElement, handle: HTMLElement) {
  let sx = 0, sy = 0, ox = 0, oy = 0, drag = false, z = 1;
  handle.addEventListener('mousedown', e => {
    if ((e.target as HTMLElement).closest('button')) return;
    z = parseFloat(getComputedStyle(document.getElementById('ui')!).zoom || '1') || 1;
    const r = win.getBoundingClientRect();
    win.style.transform = 'none'; win.style.left = r.left / z + 'px'; win.style.top = r.top / z + 'px';
    drag = true; sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!drag) return;
    win.style.left = Math.max(0, Math.min(window.innerWidth - 80, ox + e.clientX - sx)) / z + 'px';
    win.style.top = Math.max(0, Math.min(window.innerHeight - 40, oy + e.clientY - sy)) / z + 'px';
  });
  window.addEventListener('mouseup', () => { drag = false; });
}
