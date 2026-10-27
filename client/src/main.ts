// Punto de entrada del cliente: menú → conexión → Phaser + HUD.
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import '@fontsource/press-start-2p/400.css';
import './ui/style.css';
import './ui/models.css';
import './ui/exploration.css';
import './ui/v24.css';
import { Tutorial } from './ui/tutorial';
import { openNotebook, shouldAutoOpenNotebook, startLiveUpdater } from './ui/notebook';
import Phaser from 'phaser';
import { generateWorld } from '../../shared/world/worldgen';
import { S, bus } from './state';
import { net } from './networking/net';
import { Menu, AuthRequest } from './ui/menu';
import { GameScene } from './scenes/GameScene';
import { Hud } from './ui/hud';
import { showGallery } from './gallery';
import { audio } from './systems/audio';

let game: Phaser.Game | null = null;
let started = false;

const TIPS = [
  'Los Pokémon saltan de la hierba alta cuando menos lo esperas. ¡Vigila tu barra de vida!',
  'Pulsa V para cambiar el modo de tu equipo: Pasivo, Neutral, Ataque o Agresivo.',
  'Si un salvaje es demasiado fuerte, huye con F. Funciona mejor si tu equipo es rápido.',
  'Los salvajes derrotados a veces sueltan cofres. Los alfa, casi siempre.',
  'Los legendarios deambulan por su territorio. Solo uno entre miles de encuentros...',
  'Entra en las casas: los vecinos tienen consejos y algún regalo para ti.',
  'El mapa [M] muestra el nivel de cada zona y qué Pokémon viven allí.',
  'Reta a otros entrenadores a un duelo desde Social [O] o con /duelo nombre.',
];
function setLoading(text: string | null) {
  let d = document.getElementById('loading');
  if (!text) { d?.remove(); return; }
  if (!d) {
    d = document.createElement('div'); d.id = 'loading'; d.className = 'loading';
    d.innerHTML = `<div class="lt"></div><div class="lbar"><i></i></div><div class="tip">${TIPS[Math.floor(Math.random() * TIPS.length)]}</div>`;
    document.body.appendChild(d);
  }
  (d.querySelector('.lt') as HTMLElement).textContent = text;
}

async function boot() {
  if (location.search.includes('gallery')) { showGallery(); return; }
  try { await (document as any).fonts?.ready; } catch { /* sin fuentes */ }
  startLiveUpdater();
  const menu = new Menu();
  const token = localStorage.getItem('prw_token');
  // vuelta desde "Entrar con Google" de la web: el pase llega en el fragmento (#gticket=...) y se borra de la barra
  let gticket = '';
  const hm = location.hash.match(/gticket=([^&]+)/);
  if (hm) { gticket = decodeURIComponent(hm[1]); history.replaceState(null, '', location.pathname + location.search); }
  fetch('/config.json').then(r => r.json()).then(c => { if (c.google && c.cloud) menu.setGoogle(`${c.cloud}/login.html?back=${encodeURIComponent(location.origin)}`); }).catch(() => {});
  const lastName = localStorage.getItem('prw_name') || '';

  const authenticate = async (req: AuthRequest) => {
    try {
      if (!net.open) await net.connect();
    } catch (e: any) {
      menu.showError('No se pudo conectar con el servidor. ¿Está arrancado (run.bat)?', () => menu.showLogin('', lastName));
      return;
    }
    net.send({ t: 'auth', ...req });
  };

  // estado global (se registra antes de crear el HUD para no perder mensajes)
  try { const rawD = localStorage.getItem('prw_daily'); if (rawD) S.daily = JSON.parse(rawD); } catch { /* */ }
  net.on('core', m => { S.core = m.core; bus.emit('core'); });
  net.on('mons', m => { S.mons = m.mons; bus.emit('mons'); });
  net.on('daily', m => { S.daily = { ...m, fresh: true }; try { localStorage.setItem('prw_daily', JSON.stringify({ streak: m.streak, day: m.day, lines: m.lines, table: m.table })); } catch { /* */ } bus.emit('daily', m); });
  net.on('starter_ok', m => { if (!S.mons.find(x => x.uid === m.mon.uid)) S.mons.push(m.mon); bus.emit('mons'); });
  net.on('pm', m => { for (const p of m.p) S.players.set(p.id, p); bus.emit('players'); });
  net.on('pleft', m => { S.players.delete(m.id); bus.emit('players'); });

  net.on('auth_err', m => {
    if (localStorage.getItem('prw_token') && m.msg.includes('Sesión')) localStorage.removeItem('prw_token');
    if (m.code === 'need_name' && gticket) { menu.showGoogleName(m.msg, m.suggest || '', name => authenticate({ mode: 'google', ticket: gticket, name })); return; }
    menu.showLogin(m.msg, lastName);
  });
  net.on('kicked', m => { alert(m.msg); localStorage.removeItem('prw_token'); });
  net.on('_closed', () => {
    S.connected = false;
    if (!started) return;
    const o = document.createElement('div'); o.className = 'offline';
    o.innerHTML = `<div class="panel" style="padding:20px;text-align:center"><b>Conexión perdida con el servidor</b><br><span class="muted">Reconectando...</span></div>`;
    document.getElementById('ui')?.appendChild(o);
    const retry = () => {
      const ws = new WebSocket(net.url());
      ws.onopen = () => { ws.close(); location.reload(); };
      ws.onerror = () => setTimeout(retry, 2500);
    };
    setTimeout(retry, 1500);
  });

  net.on('welcome', m => {
    S.shinyBase = m.shinyBase || 4096;
    localStorage.setItem('prw_token', m.token);
    localStorage.setItem('prw_name', m.core.name);
    S.myId = m.id; S.guest = m.guest; S.seed = m.seed; S.core = m.core; S.mons = m.mons; S.bosses = m.bosses; S.connected = true;
    net.serverOffset = m.now - Date.now();
    S.players.clear(); for (const p of m.players) S.players.set(p.id, p);
    S.events.clear(); for (const e of m.events) S.events.set(e.id, e);
    if (m.needStarter) {
      menu.showStarter((sp, look) => {
        net.send({ t: 'starter', sp, look });
      });
      const off = net.on('starter_ok', () => { off(); start(m); });
    } else start(m);
  });

  const start = (m: any) => {
    if (started) return;
    started = true;
    menu.hide();
    setLoading('GENERANDO EL MUNDO...');
    setTimeout(() => {
      const world = generateWorld(m.seed);
      setLoading('PREPARANDO GRÁFICOS...');
      setTimeout(() => {
        const hud = new Hud(world);
        hud.refreshCore();
        new Tutorial(hud);
        if (shouldAutoOpenNotebook()) setTimeout(() => openNotebook({ auto: true }), 420);
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: 'game',
          backgroundColor: '#0a0810',
          pixelArt: true,
          roundPixels: true,
          antialias: false,
          scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
          fps: { target: 60 },
          disableContextMenu: true,
          banner: false,
          scene: [],
        });
        game.scene.add('game', GameScene, true, { world, x: m.x, y: m.y, seq: m.seq });
        setTimeout(() => setLoading(null), 300);
        window.addEventListener('pointerdown', () => audio.init(), { once: true });
        window.addEventListener('keydown', () => audio.init(), { once: true });
        (window as any).__prw = { game, S, net, world };
      }, 30);
    }, 30);
  };

  menu.onAuth = req => authenticate(req);
  if (gticket) {
    menu.showConnecting('tu cuenta de Google', () => { net.close(); location.reload(); });
    authenticate({ mode: 'google', ticket: gticket });
  } else if (token) {
    menu.showConnecting(lastName, () => { localStorage.removeItem('prw_token'); net.close(); location.reload(); });
    authenticate({ mode: 'token', token });
  } else menu.showLogin('', lastName);
}

boot();
