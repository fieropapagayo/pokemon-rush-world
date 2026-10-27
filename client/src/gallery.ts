import { SPECIES_LIST, SPECIES, RARITY_NAMES } from '../../shared/species';
import { TYPE_NAMES, TYPE_COLORS } from '../../shared/types';
import { MOVES } from '../../shared/moves';
import { shinyDenominator } from '../../shared/encounters';
import { renderMon3D, monSheet, MON_FRAME, MON_WORLD_SIZE } from './graphics/mon3d';
import { trainerPortrait, NPC_LOOKS } from './graphics/trainerArt';

/** Interactive review of silhouettes, back views and articulation. */
export function showGallery() {
  document.body.innerHTML = '';
  document.body.className = 'model-gallery';
  let selected = 'pikachu', shiny = new URLSearchParams(location.search).get('gallery') === 'shiny';
  let direction = 1, pose = 'walk', rotating = false, paused = false, catFilter = 'all';
  const cache = new Map<string, HTMLCanvasElement>();
  const root = document.createElement('main');
  root.innerHTML = `<header class="atelier-head"><a href="/">← Volver al juego</a><span>RUSH WORLD / ATELIER 03</span><b>${SPECIES_LIST.length} ESPECIES</b></header>
    <div class="atelier-intro"><span class="eyebrow">PEQUEÑOS. VIVOS. EN TRES DIMENSIONES.</span><h1>Un nuevo punto de vista<span>.</span></h1><p>Gira, compara y descubre cada Pokémon. Modelos 3D con el encanto del pixel art.</p></div>
    <div class="atelier-layout"><section class="model-inspector"><div class="model-stage"><span id="model-number"></span><span class="stage-label">VISTA ORTOGRÁFICA · 8 DIRECCIONES</span><canvas id="model-canvas" width="160" height="120" aria-label="Modelo 3D animado"></canvas><div class="stage-floor"></div></div>
    <div class="model-caption"><div><span id="model-types" class="eyebrow"></span><h2 id="model-name"></h2></div><span id="model-rarity"></span></div>
    <div class="model-controls"><button id="turn-left" aria-label="Girar a la izquierda">↶</button><button id="turn-right" aria-label="Girar a la derecha">↷</button><button id="auto-turn" aria-pressed="false">Giro 360°</button><button id="model-pause" aria-pressed="false">Pausar</button><button id="model-shiny" aria-pressed="false">✦ Shiny</button><button id="model-rand" title="Elegir especie al azar">🎲 Azar</button></div>
    <div class="model-controls poses" role="group" aria-label="Animación"><button data-pose="idle">Reposo</button><button data-pose="walk" class="active">Movimiento</button><button data-pose="attack">Ataque</button></div>
    <p id="model-desc" class="model-note" style="margin-top:8px;opacity:.92"></p>
    <div id="model-stats" style="margin:8px 0;font-size:12px"></div>
    <div id="model-moves" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0"></div>
    <div id="model-family" style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"></div>
    <p id="model-odds" class="model-odds"></p><p class="model-note">Comparación a escala con el entrenador. Usa ←/→ para girar, Espacio para pausar y S para alternar Shiny.</p></section>
    <section class="model-catalog"><div class="catalog-toolbar" style="flex-wrap:wrap;gap:6px"><label for="model-search">Pokédex de modelos</label><div style="display:flex;gap:4px;flex-wrap:wrap"><button data-cat="all" class="active" style="padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;background:#ffd86628;border:1px solid #ffd866;color:inherit">Todos</button><button data-cat="legend" style="padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;background:#ffffff12;border:1px solid #ffffff22;color:inherit">★ Leyendas</button><button data-cat="starter" style="padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;background:#ffffff12;border:1px solid #ffffff22;color:inherit">Iniciales</button><button data-cat="boss" style="padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;background:#ffffff12;border:1px solid #ffffff22;color:inherit">Jefes</button></div><input id="model-search" placeholder="Buscar especie o tipo…" type="search"></div><div id="model-grid"></div><p id="model-count"></p></section></div>`;
  document.body.appendChild(root);
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const canvas = q<HTMLCanvasElement>('#model-canvas'), ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const trainer = trainerPortrait(NPC_LOOKS[0], 1);
  const sheet = () => {
    const key = `${selected}:${shiny}:${direction}`;
    let c = cache.get(key);
    if (!c) { c = monSheet(selected, shiny, direction); cache.set(key, c); if (cache.size > 96) cache.delete(cache.keys().next().value!); }
    return c;
  };
  const update = () => {
    const sp = SPECIES[selected];
    q('#model-name').textContent = sp.name + (shiny ? ' ✦' : '');
    q('#model-number').textContent = '#' + String(sp.dex).padStart(3, '0');
    q('#model-types').textContent = sp.types.map(t => TYPE_NAMES[t]).join(' / ');
    q('#model-rarity').textContent = RARITY_NAMES[sp.rarity];
    q('#model-odds').textContent = `✦ Shiny · 1/${shinyDenominator(selected).toLocaleString('es-ES')} · ${(100 / shinyDenominator(selected)).toFixed(5)}%`;
    q('#model-desc').textContent = sp.desc;
    const bst = sp.base.hp + sp.base.atk + sp.base.def + sp.base.spd;
    const bar = (lbl: string, v: number, col: string) => `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="width:32px;opacity:.75">${lbl}</span><div style="flex:1;height:6px;background:#ffffff18;border-radius:3px;overflow:hidden"><div style="width:${Math.min(100, Math.round(v / 1.4))}%;height:100%;background:${col}"></div></div><b style="width:26px;text-align:right">${v}</b></div>`;
    q('#model-stats').innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>ESTADÍSTICAS BASE</span><b>BST ${bst}</b></div>` +
      bar('PS', sp.base.hp, '#58d878') + bar('ATQ', sp.base.atk, '#f07848') + bar('DEF', sp.base.def, '#58a8f8') + bar('VEL', sp.base.spd, '#f8d048');
    q('#model-moves').innerHTML = sp.moves.map(([lv, mv]) => {
      const m = MOVES[mv];
      return m ? `<span style="padding:2px 7px;border-radius:99px;font-size:11px;background:${TYPE_COLORS[m.type]}33;border:1px solid ${TYPE_COLORS[m.type]}88">Nv.${lv} ${m.name}</span>` : '';
    }).join('');
    const fam = SPECIES_LIST.filter(s => s.family === sp.family).sort((a, b) => a.stage - b.stage);
    const famEl = q('#model-family'); famEl.replaceChildren();
    if (fam.length > 1) {
      for (const f of fam) {
        const b = document.createElement('button');
        b.textContent = (f.key === selected ? '● ' : '') + f.name;
        b.style.cssText = `padding:3px 9px;border-radius:6px;font-size:11px;cursor:pointer;background:${f.key === selected ? '#ffd86628' : '#ffffff12'};border:1px solid ${f.key === selected ? '#ffd866' : '#ffffff22'};color:inherit`;
        b.onclick = () => { selected = f.key; update(); };
        famEl.append(b);
      }
    }
    q('#model-shiny').setAttribute('aria-pressed', String(shiny));
    q('.model-stage').classList.toggle('is-shiny', shiny);
    root.querySelectorAll<HTMLElement>('[data-species]').forEach(e => { const active = e.dataset.species === selected; e.classList.toggle('selected', active); e.setAttribute('aria-pressed', String(active)); });
  };
  const bossKeys = new Set(['snorlax', 'gyarados', 'onix', 'arcanine', 'gengar', 'dragonite', 'mewtwo']);
  const starterFams = new Set(['bulbasaur', 'charmander', 'squirtle', 'pikachu']);
  const populate = () => {
    const term = q<HTMLInputElement>('#model-search').value.toLowerCase();
    const grid = q('#model-grid'); grid.replaceChildren();
    const list = SPECIES_LIST.filter(sp => {
      if (catFilter === 'legend' && sp.rarity !== 'legendary' && sp.rarity !== 'mythic') return false;
      if (catFilter === 'starter' && !starterFams.has(sp.family)) return false;
      if (catFilter === 'boss' && !bossKeys.has(sp.key)) return false;
      return sp.name.toLowerCase().includes(term) || sp.types.some(t => TYPE_NAMES[t].toLowerCase().includes(term));
    });
    for (const sp of list) {
      const button = document.createElement('button'); button.dataset.species = sp.key;
      const img = renderMon3D(sp.key, shiny, 1).toCanvas(2); img.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.textContent = sp.name;
      const number = document.createElement('small'); number.textContent = '#' + String(sp.dex).padStart(3, '0');
      button.append(number, img, name); button.onclick = () => { selected = sp.key; update(); };
      grid.append(button);
    }
    q('#model-count').textContent = `${list.length} / ${SPECIES_LIST.length} especies`;
    update();
  };
  q('#model-search').oninput = populate;
  q('#model-shiny').onclick = () => { shiny = !shiny; populate(); };
  q('#model-rand').onclick = () => {
    const rnd = SPECIES_LIST[Math.floor(Math.random() * SPECIES_LIST.length)];
    if (rnd) { selected = rnd.key; update(); }
  };
  root.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(b => b.onclick = () => {
    catFilter = b.dataset.cat!;
    root.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach(e => {
      const act = e === b;
      e.style.background = act ? '#ffd86628' : '#ffffff12';
      e.style.borderColor = act ? '#ffd866' : '#ffffff22';
    });
    populate();
  });
  q('#turn-left').onclick = () => { direction = (direction + 7) % 8; };
  q('#turn-right').onclick = () => { direction = (direction + 1) % 8; };
  q('#auto-turn').onclick = () => { rotating = !rotating; q('#auto-turn').setAttribute('aria-pressed', String(rotating)); };
  q('#model-pause').onclick = () => { paused = !paused; q('#model-pause').textContent = paused ? 'Continuar' : 'Pausar'; q('#model-pause').setAttribute('aria-pressed', String(paused)); };
  root.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(b => b.onclick = () => { pose = b.dataset.pose!; root.querySelectorAll('[data-pose]').forEach(e => e.classList.toggle('active', e === b)); });
  window.addEventListener('keydown', e => {
    if (!root.isConnected || document.activeElement === q('#model-search')) return;
    if (e.key === 'ArrowLeft') { direction = (direction + 7) % 8; e.preventDefault(); }
    else if (e.key === 'ArrowRight') { direction = (direction + 1) % 8; e.preventDefault(); }
    else if (e.key === ' ') { q('#model-pause').click(); e.preventDefault(); }
    else if (e.key === 's' || e.key === 'S') { q('#model-shiny').click(); e.preventDefault(); }
  });
  populate();
  let prev = 0, elapsed = 0, turnElapsed = 0;
  const draw = (time: number) => {
    if (!root.isConnected) return;
    const dt = Math.min(100, time - prev); prev = time;
    if (!paused) { elapsed += dt; turnElapsed += dt; if (rotating && turnElapsed > 650) { direction = (direction + 1) % 8; turnElapsed = 0; } }
    const frame = pose === 'idle' ? Math.floor(elapsed / 750) % 2 : pose === 'attack' ? 6 + Math.floor(elapsed / 220) % 2 : 2 + Math.floor(elapsed / 110) % 4;
    ctx.clearRect(0, 0, 160, 120);
    ctx.fillStyle = '#112b36'; ctx.beginPath(); ctx.ellipse(68, 91, 23, 6, 0, 0, Math.PI * 2); ctx.fill();
    const sp = SPECIES[selected], scale = sp.size === 64 ? 2.6 : sp.size === 48 ? 2.3 : 2;
    const size = MON_WORLD_SIZE * scale;
    ctx.drawImage(sheet(), frame * MON_FRAME, 0, MON_FRAME, MON_FRAME, Math.round(68 - size / 2), Math.round(91 - size * 0.85), size, size);
    ctx.globalAlpha = 0.55; ctx.drawImage(trainer, 120, 43, 32, 48); ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
