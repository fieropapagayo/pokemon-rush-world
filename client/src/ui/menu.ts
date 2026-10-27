// Menú inicial: acceso (invitado / cuenta), selección de inicial y apariencia, con un paisaje animado de fondo.
import { el, esc } from './dom';
import { STARTERS, SPECIES, SPECIES_LIST } from '../../../shared/species';
import { TYPE_NAMES, TYPE_COLORS } from '../../../shared/types';
import { monURL } from '../graphics/textures';
import { monSheet, MON_FRAME } from '../graphics/mon3d';
import { CHANGELOG, RELEASE } from '../../../shared/changelog';
import { trainerPortrait, colsFromLook, HAT_COLORS, SHIRT_COLORS, SKIN_COLORS, HAIR_COLORS } from '../graphics/trainerArt';
import { audio } from '../systems/audio';
import { openNotebook, shouldAutoOpenNotebook } from './notebook';

export interface AuthRequest { mode: 'guest' | 'login' | 'register' | 'token' | 'google'; name?: string; pass?: string; token?: string; ticket?: string; }

/** Pseudoaleatorio estable para que el paisaje no cambie entre fotogramas. */
const hr = (i: number, s: number) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

export class Menu {
  root: HTMLDivElement;
  box: HTMLDivElement;
  bgRaf = 0;
  starterTimer = 0;
  onAuth: (r: AuthRequest) => void = () => {};
  googleUrl = '';
  /** Activa el botón "Entrar con Google" (lleva a la web fija de Cloudflare, que devuelve un pase firmado). */
  setGoogle(url: string) {
    this.googleUrl = url;
    const b = this.box.querySelector<HTMLAnchorElement>('#mgoogle');
    if (b) { b.href = url; b.hidden = false; }
  }

  showGoogleName(err: string, suggest: string, onName: (name: string) => void) {
    this.box.innerHTML = `${this.title()}<p style="text-align:center;margin:14px 0 4px">Has entrado con <b class="gold">Google</b>. ¿Cómo se llamará tu entrenador?</p>
      <label>Nombre de entrenador</label><input type="text" id="mname" maxlength="16" value="${esc(suggest)}" placeholder="3-16 letras o números" />
      <div class="err" id="merr">${esc(err)}</div><button class="btn green play-btn" id="mgo">▶ Crear entrenador</button>
      <div class="foot">Tu progreso quedará ligado a tu cuenta de Google: podrás jugar desde cualquier PC o móvil, sin descargar nada.</div>`;
    const go = () => {
      const n = (this.box.querySelector('#mname') as HTMLInputElement).value.trim();
      if (!/^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,16}$/.test(n)) { (this.box.querySelector('#merr') as HTMLElement).textContent = 'Nombre no válido: 3-16 letras, números o _.'; return; }
      (this.box.querySelector('#merr') as HTMLElement).textContent = 'Creando...';
      onName(n);
    };
    (this.box.querySelector('#mgo') as HTMLButtonElement).onclick = go;
      const mnb = this.box.querySelector('#mnotebook') as HTMLButtonElement | null;
      if (mnb) mnb.onclick = () => openNotebook();
    (this.box.querySelector('#mname') as HTMLInputElement).addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  constructor() {
    this.root = el('div'); this.root.id = 'menu';
    const bg = el('canvas', 'bg'); this.root.appendChild(bg);
    this.box = el('div', 'panel box');
    this.root.appendChild(this.box);
    document.body.appendChild(this.root);
    this.animateBg(bg);
  }

  /** Paisaje en capas (cielo, montañas, colinas, bosque, pradera) con Pokémon que cruzan corriendo o volando. */
  animateBg(c: HTMLCanvasElement) {
    const ctx = c.getContext('2d')!;
    const W = 384, H = 216;
    c.width = W; c.height = H;
    const walkers = ['bulbasaur', 'charmander', 'squirtle', 'pikachu', 'eevee', 'vulpix', 'growlithe', 'jigglypuff', 'oddish', 'rattata', 'psyduck', 'ponyta'];
    const flyers = ['pidgey', 'pidgeotto', 'butterfree', 'zubat'];
    const ents = [
      ...Array.from({ length: 9 }, (_, i) => ({ s: monSheet(walkers[i % walkers.length]), x: hr(i, 1) * W, y: 150 + hr(i, 2) * 48, v: 10 + hr(i, 3) * 16, f: hr(i, 4) < 0.5, fly: false, size: 26 + hr(i, 5) * 8 })),
      ...Array.from({ length: 3 }, (_, i) => ({ s: monSheet(flyers[i % flyers.length]), x: hr(i, 6) * W, y: 34 + hr(i, 7) * 50, v: 16 + hr(i, 8) * 14, f: hr(i, 9) < 0.5, fly: true, size: 22 })),
    ].sort((a, b) => a.y - b.y);
    // un ave legendaria cruza el cielo muy de vez en cuando
    const legend = { s: monSheet(['articuno', 'zapdos', 'moltres'][Math.floor(Math.random() * 3)]), x: -60, y: 26, active: false, next: performance.now() + 9000 };
    let last = performance.now();
    const ridge = (y0: number, amp: number, freq: number, seed: number, col: string, off: number) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const t = (x + off) * freq;
        ctx.lineTo(x, y0 - (Math.sin(t + seed) * 0.6 + Math.sin(t * 2.3 + seed * 2) * 0.3 + Math.sin(t * 5.1 + seed) * 0.1) * amp);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const scroll = t / 1000;
      // cielo de atardecer suave
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
      sky.addColorStop(0, '#6fb2d6'); sky.addColorStop(0.55, '#b9dce0'); sky.addColorStop(1, '#f3e1b4');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(300, 46, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6d840'; ctx.beginPath(); ctx.arc(300, 46, 26, 0, Math.PI * 2); ctx.fill();
      // nubes
      for (let i = 0; i < 6; i++) {
        const cx = ((hr(i, 11) * W + scroll * (4 + i)) % (W + 80)) - 40, cy = 18 + hr(i, 12) * 50;
        ctx.fillStyle = '#ffffffd0';
        for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(cx + k * 8 - 12), Math.round(cy - (k % 2) * 4), 18, 8);
      }
      ridge(118, 26, 0.012, 1, '#8fb4c8', scroll * 3);          // montañas lejanas
      ridge(112, 16, 0.012, 1, '#a9c6d6', scroll * 3);
      ridge(140, 18, 0.02, 4, '#6f9e6a', scroll * 7);            // colinas
      ridge(154, 12, 0.035, 7, '#4f8a52', scroll * 14);          // bosque
      for (let i = 0; i < 26; i++) {                              // copas de árboles
        const x = ((i * 17 - scroll * 14) % (W + 40) + W + 40) % (W + 40) - 20, y = 150 - hr(i, 13) * 8;
        ctx.fillStyle = '#3c7444'; ctx.beginPath(); ctx.arc(x, y, 9 + hr(i, 14) * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4e8c52'; ctx.beginPath(); ctx.arc(x - 3, y - 3, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#79b567'; ctx.fillRect(0, 158, W, H - 158);  // pradera
      for (let i = 0; i < 90; i++) {
        const x = ((i * 23 - scroll * 22) % W + W) % W, y = 162 + hr(i, 15) * 54;
        ctx.fillStyle = hr(i, 16) < 0.5 ? '#639854' : '#a6cf7d'; ctx.fillRect(Math.round(x), Math.round(y), 1, 3);
        if (hr(i, 17) < 0.12) { ctx.fillStyle = ['#f04850', '#fff060', '#4890f8'][i % 3]; ctx.fillRect(Math.round(x) + 2, Math.round(y), 2, 2); }
      }
      ctx.fillStyle = '#d8b878'; ctx.fillRect(0, 186, W, 10); ctx.fillStyle = '#c8a666'; ctx.fillRect(0, 194, W, 2); // camino
      // legendario
      if (!legend.active && t > legend.next) { legend.active = true; legend.x = -70; }
      if (legend.active) {
        legend.x += 46 * dt;
        const fr = 2 + Math.floor(t / 90) % 4;
        ctx.save(); ctx.translate(Math.round(legend.x) + 48, Math.round(legend.y + Math.sin(t / 300) * 4)); ctx.scale(-1, 1);
        ctx.drawImage(legend.s, fr * MON_FRAME, 0, MON_FRAME, MON_FRAME, 0, 0, 48, 48); ctx.restore();
        if (legend.x > W + 40) { legend.active = false; legend.next = t + 16000 + Math.random() * 12000; }
      }
      for (const e of ents) {
        e.x += (e.f ? 1 : -1) * e.v * dt;
        if (e.x < -40) e.x = W + 30; if (e.x > W + 40) e.x = -30;
        const frame = 2 + Math.floor(t / (e.fly ? 100 : 130) + e.v) % 4;
        const y = Math.round(e.y + (e.fly ? Math.sin(t / 400 + e.v) * 5 : -Math.abs(Math.sin(t / 130 + e.v)) * 1.5));
        if (!e.fly) { ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.ellipse(Math.round(e.x) + e.size / 2, Math.round(e.y) + e.size - 2, e.size * 0.3, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.save();
        if (e.f) { ctx.translate(Math.round(e.x) + e.size, y); ctx.scale(-1, 1); ctx.drawImage(e.s, frame * MON_FRAME, 0, MON_FRAME, MON_FRAME, 0, 0, e.size, e.size); }
        else ctx.drawImage(e.s, frame * MON_FRAME, 0, MON_FRAME, MON_FRAME, Math.round(e.x), y, e.size, e.size);
        ctx.restore();
      }
      this.bgRaf = requestAnimationFrame(loop);
    };
    this.bgRaf = requestAnimationFrame(loop);
  }

  title() {
    return `<div class="halloween" title="Llega pronto">🎃 <b>PRÓXIMAMENTE</b> · Actualización de Halloween: Pokémon fantasma, noches de niebla y un jefe espectral 👻</div>
      <div class="logo"><div class="ball"></div><h1>POKÉMON<br>RUSH WORLD<small>RPG INCREMENTAL MULTIJUGADOR</small></h1></div><div class="release-tag">${esc(RELEASE)} <span>· Un mundo salvaje y vivo</span></div>`;
  }

  showLogin(err = '', defaultName = '') {
    let mode: 'guest' | 'login' | 'register' = 'guest';
    const render = () => {
      this.box.innerHTML = `${this.title()}
        <div class="news"><div class="news-head"><b>✦ NOVEDADES</b><span>${esc(RELEASE)}</span></div><ul>${CHANGELOG.slice(0, 4).map(x => `<li>${esc(x.replace(/^[^A-Za-zÁÉÍÓÚÑ¡¿0-9]+/, '').split(':')[0].slice(0, 90))}</li>`).join('')}</ul></div>
        <div class="menu-feats"><div><b>❀</b>estaciones y clima</div><div><b>👑</b>${SPECIES_LIST.filter(x => x.rarity === 'legendary' || x.rarity === 'mythic').length} legendarios y míticos</div><div><b>⚔</b>PvP y grupos de 4</div><div><b>☁</b>juega desde cualquier sitio</div></div>
        <div class="tabs">
          <button class="btn ${mode === 'guest' ? 'gold' : 'gray'}" data-m="guest">Invitado</button>
          <button class="btn ${mode === 'login' ? 'gold' : 'gray'}" data-m="login">Iniciar sesión</button>
          <button class="btn ${mode === 'register' ? 'gold' : 'gray'}" data-m="register">Crear cuenta</button>
        </div>
        <label>Nombre de entrenador</label>
        <input type="text" id="mname" maxlength="16" placeholder="3-16 letras o números" value="${esc(defaultName)}" autocomplete="username" />
        ${mode !== 'guest' ? `<label>Contraseña</label><input type="password" id="mpass" maxlength="64" placeholder="mínimo 6 caracteres" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" />` : ''}
        <div class="err" id="merr">${esc(err)}</div>
        <button class="btn green play-btn" id="mgo">${mode === 'guest' ? '▶ Jugar como invitado' : mode === 'login' ? '▶ Entrar' : '▶ Crear cuenta y jugar'}</button>
        <a class="btn google-btn" id="mgoogle" href="${esc(this.googleUrl || '#')}" ${this.googleUrl ? '' : 'hidden'}><b>G</b> Entrar con Google</a>
        <button class="btn small gold" id="mnotebook" style="width:100%;margin-top:8px">📓 Libreta de Novedades · ${esc(RELEASE)}</button>
        <details class="release-notes"><summary>Changelog completo · ${esc(RELEASE)}</summary><ul>${CHANGELOG.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>
        <div class="foot">${mode === 'guest' ? 'Como invitado tu progreso se guarda en el servidor y queda ligado a este navegador. Crea una cuenta para jugar desde cualquier sitio.' : 'Las contraseñas se guardan cifradas (scrypt) en el servidor.'}<br>
        Juego de fans sin ánimo de lucro. Pokémon es una marca de Nintendo / Game Freak / The Pokémon Company. Gráficos y sonidos creados para este proyecto.</div>`;
      this.box.querySelectorAll<HTMLButtonElement>('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m as any; defaultName = (this.box.querySelector('#mname') as HTMLInputElement).value; err = ''; render(); audio.init(); audio.play('ui'); });
      const go = () => {
        audio.init();
        const name = (this.box.querySelector('#mname') as HTMLInputElement).value.trim();
        const pass = (this.box.querySelector('#mpass') as HTMLInputElement | null)?.value || '';
        if (!/^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{3,16}$/.test(name)) { (this.box.querySelector('#merr') as HTMLElement).textContent = 'Nombre no válido: 3-16 letras, números o _.'; return; }
        if (mode !== 'guest' && pass.length < 6) { (this.box.querySelector('#merr') as HTMLElement).textContent = 'La contraseña necesita al menos 6 caracteres.'; return; }
        (this.box.querySelector('#mgo') as HTMLButtonElement).disabled = true;
        (this.box.querySelector('#merr') as HTMLElement).textContent = 'Conectando...';
        this.onAuth({ mode, name, pass });
      };
      (this.box.querySelector('#mgo') as HTMLButtonElement).onclick = go;
      this.box.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') go(); }));
      setTimeout(() => (this.box.querySelector('#mname') as HTMLInputElement)?.focus(), 30);
    };
    render();
    if (shouldAutoOpenNotebook()) setTimeout(() => openNotebook({ auto: true }), 250);
  }

  showConnecting(name: string, onSwitch: () => void) {
    this.box.innerHTML = `${this.title()}<p style="text-align:center;margin:18px 0 6px">Entrando como <b class="gold">${esc(name || 'entrenador')}</b>...</p>
      <div class="loading-inline" style="text-align:center"><button class="btn gray small" id="msw">Cambiar de cuenta</button></div>`;
    (this.box.querySelector('#msw') as HTMLButtonElement).onclick = onSwitch;
  }

  showError(msg: string, retry: () => void) {
    this.box.innerHTML = `${this.title()}<p style="text-align:center;color:#ff9090">${esc(msg)}</p>
      <div style="text-align:center"><button class="btn" id="mre">Reintentar</button></div>`;
    (this.box.querySelector('#mre') as HTMLButtonElement).onclick = retry;
  }

  showStarter(onPick: (sp: string, look: any) => void) {
    let sel = 'charmander';
    let sDir = 1, sShiny = false, sSpin = true, tDir = 0, tick = 0;
    const look = { hat: 0, shirt: 0, skin: 0, hair: 0 };
    const stat = (n: string, v: number) => `<div><span>${n}</span><i style="width:${Math.min(100, v / 1.1)}%"></i></div>`;
    const evoChain = (k: string) => {
      const fam = Object.values(SPECIES).filter(s => s.family === SPECIES[k].family).sort((a, b) => a.stage - b.stage);
      return fam.map(s => `<span style="font-weight:${s.key === k ? '700' : '400'};color:${s.key === k ? '#ffd866' : '#b8c4d8'}">${esc(s.name)}${s.evo?.[0]?.level ? ` <small>(Nv.${s.evo[0].level})</small>` : ''}</span>`).join(' → ');
    };
    const drawTrainer = () => {
      const cv = this.box.querySelector('#tprev') as HTMLCanvasElement | null;
      if (!cv) return;
      const ctx = cv.getContext('2d')!;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.imageSmoothingEnabled = false;
      const step = [0, 1, 0, 2][tick % 4];
      ctx.drawImage(trainerPortrait(colsFromLook(look), 3, tDir, step), 0, 0);
    };
    const render = () => {
      const sp = SPECIES[sel];
      const pose = [2, 3, 4, 5, 2, 3, 6, 7][tick % 8];
      this.box.innerHTML = `${this.title()}
        <div class="step-title"><span>PASO 1 · ELIGE A TU COMPAÑERO</span><b><button class="btn tiny ${sSpin ? 'gold' : 'gray'}" id="sspin" style="padding:1px 6px;font-size:10px">⟳ 360°</button> <button class="btn tiny ${sShiny ? 'gold' : 'gray'}" id="sshiny" style="padding:1px 6px;font-size:10px">✦ Shiny</button></b></div>
        <div class="starters">${STARTERS.map(k => `<div class="starter ${k === sel ? 'sel' : ''}" data-k="${k}"><img id="stimg-${k}" src="${monURL(k, k === sel && sShiny, 3, k === sel ? sDir : 1, k === sel ? pose : 0)}" alt="" /><div>${SPECIES[k].name}</div><div class="tp">${SPECIES[k].types.map(t => `<i style="background:${TYPE_COLORS[t]}"></i>`).join('')}</div></div>`).join('')}</div>
        <div class="card starter-info"><div class="desc">${sp.types.map(t => `<span class="tag" style="background:${TYPE_COLORS[t]}">${TYPE_NAMES[t]}</span>`).join('')} ${esc(sp.desc)}<div style="margin-top:4px;font-size:11px;opacity:.9">Evolución: ${evoChain(sel)}</div></div>
          <div class="sbars">${stat('PS', sp.base.hp)}${stat('ATQ', sp.base.atk)}${stat('DEF', sp.base.def)}${stat('VEL', sp.base.spd)}</div></div>
        <div class="step-title"><span>PASO 2 · TU ENTRENADOR</span><b><button class="btn tiny gray" id="trot" style="padding:1px 6px;font-size:10px">⟳ Vista</button> <button class="btn tiny gold" id="trand" style="padding:1px 6px;font-size:10px">🎲 Aleatorio</button></b></div>
        <div class="look-card">
          <canvas id="tprev" class="px" width="48" height="72"></canvas>
          <div class="looks grow">
            <span>Gorra</span><div class="swatches" data-f="hat">${HAT_COLORS.map((c, i) => `<div class="sw ${look.hat === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
            <span>Ropa</span><div class="swatches" data-f="shirt">${SHIRT_COLORS.map((c, i) => `<div class="sw ${look.shirt === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
            <span>Piel</span><div class="swatches" data-f="skin">${SKIN_COLORS.map((c, i) => `<div class="sw ${look.skin === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
            <span>Pelo</span><div class="swatches" data-f="hair">${HAIR_COLORS.map((c, i) => `<div class="sw ${look.hair === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
          </div>
        </div>
        <button class="btn green play-btn" id="mgo" style="margin-top:14px">▶ ¡Empezar la aventura con ${esc(sp.name)}!</button>`;
      drawTrainer();
      this.box.querySelectorAll<HTMLElement>('.starter').forEach(s => s.onclick = () => { sel = s.dataset.k!; audio.play('ui'); render(); });
      this.box.querySelector<HTMLButtonElement>('#sspin')!.onclick = () => { sSpin = !sSpin; audio.play('ui'); render(); };
      this.box.querySelector<HTMLButtonElement>('#sshiny')!.onclick = () => { sShiny = !sShiny; audio.play(sShiny ? 'sparkle' : 'ui'); render(); };
      this.box.querySelector<HTMLButtonElement>('#trot')!.onclick = () => { tDir = (tDir + 1) % 3; audio.play('ui'); drawTrainer(); };
      this.box.querySelector<HTMLButtonElement>('#trand')!.onclick = () => {
        look.hat = Math.floor(Math.random() * HAT_COLORS.length);
        look.shirt = Math.floor(Math.random() * SHIRT_COLORS.length);
        look.skin = Math.floor(Math.random() * SKIN_COLORS.length);
        look.hair = Math.floor(Math.random() * HAIR_COLORS.length);
        audio.play('sparkle');
        render();
      };
      this.box.querySelectorAll<HTMLElement>('.swatches').forEach(sw => sw.querySelectorAll<HTMLElement>('.sw').forEach(d => d.onclick = () => { (look as any)[sw.dataset.f!] = parseInt(d.dataset.i!, 10); audio.play('ui'); render(); }));
      (this.box.querySelector('#mgo') as HTMLButtonElement).onclick = () => { clearInterval(this.starterTimer); audio.play('catch'); onPick(sel, look); };
    };
    clearInterval(this.starterTimer);
    render();
    this.starterTimer = window.setInterval(() => {
      tick++;
      if (sSpin && tick % 2 === 0) sDir = (sDir + 1) % 8;
      const img = this.box.querySelector<HTMLImageElement>(`#stimg-${sel}`);
      if (img) {
        const pose = [2, 3, 4, 5, 2, 3, 6, 7][tick % 8];
        img.src = monURL(sel, sShiny, 3, sDir, pose);
      }
      drawTrainer();
    }, 240);
  }

  hide() {
    clearInterval(this.starterTimer);
    cancelAnimationFrame(this.bgRaf);
    this.root.style.transition = 'opacity .45s'; this.root.style.opacity = '0';
    setTimeout(() => this.root.remove(), 460);
  }
}
