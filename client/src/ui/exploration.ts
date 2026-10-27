import { S, bus } from '../state';
import { net } from '../networking/net';
import { SPECIES } from '../../../shared/species';
import { ZONES } from '../../../shared/zones';
import { RESEARCH, researchProgress, researchClaimId } from '../../../shared/research';
import { ITEMS } from '../../../shared/items';
import { DUNGEON_DEFS } from '../../../shared/world/worldgen';
import { nearestZonePoint } from '../systems/navigation';
import { monURL } from '../graphics/textures';
import { esc } from './dom';
import type { Hud } from './hud';

export function markZone(hud: Hud, zone: number) {
  const sc = hud.scene; if (!sc) return;
  const dungeon = DUNGEON_DEFS.find(d => d.zone === zone);
  const point = dungeon && sc.me.x < 400 ? { x: dungeon.outside.x + 0.5, y: dungeon.outside.y + 0.5 } : nearestZonePoint(hud.world, sc.me, zone);
  if (!point) return hud.toast('No se ha encontrado un punto accesible en esta zona.', 'info');
  S.waypoint = { ...point, name: ZONES[zone].name };
  hud.toast('Destino marcado: ' + ZONES[zone].name + '. Sigue la brújula dorada.', 'info');
}

export class ExplorationGuide {
  root: HTMLElement; compass: HTMLElement; context: HTMLButtonElement; last = ''; collapsed = false;
  constructor(private hud: Hud) {
    this.root = document.createElement('aside'); this.root.className = 'panel field-guide live'; this.root.setAttribute('aria-label', 'Guía de exploración');
    this.compass = document.createElement('div'); this.compass.className = 'panel compass live'; this.compass.hidden = true;
    this.context = document.createElement('button'); this.context.className = 'context-action live'; this.context.hidden = true;
    hud.root.append(this.root, this.compass, this.context);
    this.context.onclick = () => bus.emit('interact');
    this.compass.onclick = () => { S.waypoint = null; };
    this.compass.title = 'Pulsa para quitar el destino';
    this.root.onclick = e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-guide]'); if (!b) return;
      const action = b.dataset.guide;
      if (action === 'fold') { this.collapsed = !this.collapsed; this.last = ''; this.tick(); return; }
      if (action === 'heal') {
        const pos = this.hud.scene?.me; if (!pos) return;
        const town = [...hud.world.towns].filter(t => (t.heal.x < 400) === (pos.x < 400)).sort((a, b) => Math.hypot(a.heal.x - pos.x, a.heal.y - pos.y) - Math.hypot(b.heal.x - pos.x, b.heal.y - pos.y))[0];
        if (town) S.waypoint = { x: town.heal.x + 0.5, y: town.heal.y + 0.5, name: 'Centro · ' + town.name };
        else hud.toast('Sal de la cueva para localizar un Centro Pokémon.', 'info');
      } else if (action === 'route') markZone(hud, 2);
      else if (action === 'catch') bus.emit('throw');
      else if (action === 'select') bus.emit('select_target', Number(b.dataset.id));
      else hud.panels.open(action!);
    };
  }
  tick() {
    const c = S.core, sc = this.hud.scene; if (!c || !sc) return;
    const caught = c.stats.catches || 0, ready = RESEARCH.filter(t => !c.claimed.includes(researchClaimId(t.id)) && researchProgress(c, t) >= t.goal).length;
    const complete = RESEARCH.filter(t => c.claimed.includes(researchClaimId(t.id))).length;
    let title = 'Tu próxima aventura', hint = 'Explora, registra especies y completa el diario de campo.', action = 'research', label = 'Abrir diario [R]';
    if (S.me.hp < S.me.mhp * 0.4) { title = 'Recupera fuerzas'; hint = 'El Centro Pokémon cura gratis a todo tu equipo.'; action = 'heal'; label = 'Localizar Centro'; }
    else if (S.gym) { title = '¡Desafío de gimnasio!'; hint = 'Quédate cerca del líder. Usa Rush y tus pociones para vencer a sus Pokémon.'; action = 'gyms'; label = 'Ver el desafío [G]'; }
    else if (S.focusInfo && !(S.focusInfo.flags & (4 | 2048))) { title = 'Captura a ' + SPECIES[S.focusInfo.key].name; hint = S.focusInfo.hp > 25 ? 'Tu equipo lo debilita sin derrotarlo. Espera a que baje su vida.' : '¡Es el momento! Elige una Ball y lánzala para capturarlo.'; action = 'catch'; label = 'Lanzar Ball [C]'; }
    else if (ready) { title = '¡Investigación completada!'; hint = `${ready} recompensa${ready === 1 ? '' : 's'} disponible${ready === 1 ? '' : 's'} en tu diario.`; label = 'Recoger recompensas'; }
    else if (!caught) { title = 'Tu primera captura'; hint = 'Sal a la Ruta 1. Selecciona un salvaje y tu equipo lo debilitará.'; action = 'route'; label = 'Marcar Ruta 1'; }
    else if (c.team.length < 3) { title = 'Forma tu equipo'; hint = 'Abre la caja y equipa hasta tres compañeros para empezar.'; action = 'team'; label = 'Preparar equipo [T]'; }
    const nearby = [...sc.mons.values()].filter((m: any) => m.flags & 2 && !(m.flags & (8 | 32 | 256)) && !m.dead && Math.hypot(m.x - sc.me.x, m.y - sc.me.y) < 16).sort((a: any, b: any) => Number(b.shiny) - Number(a.shiny) || Number(!!(b.flags & 64)) - Number(!!(a.flags & 64)) || Number(!!c.dex.caught[a.key]) - Number(!!c.dex.caught[b.key]) || Math.hypot(a.x - sc.me.x, a.y - sc.me.y) - Math.hypot(b.x - sc.me.x, b.y - sc.me.y)).slice(0, 3) as any[];
    const z = ZONES[S.zone];
    const html = `<div class="field-heading"><span>CUADERNO DE VIAJE</span><div style="display:flex;gap:4px"><button data-guide="research" title="Diario de campo [R]">${complete}/${RESEARCH.length} ↗</button><button data-guide="fold" title="${this.collapsed ? 'Expandir guía' : 'Minimizar guía'}">${this.collapsed ? '▸' : '▾'}</button></div></div>
      ${this.collapsed ? '' : `<h3>${esc(title)}</h3><p>${esc(hint)}</p><button class="guide-primary" data-guide="${action}">${label} <span>→</span></button>
      <div class="field-heading radar-heading"><span>RADAR CERCANO</span><small>${z?.kind === 'town' ? 'ZONA SEGURA' : 'NV. ' + z?.lvl.join('–')}</small></div>
      <div class="radar-list">${nearby.length ? nearby.map(m => { const d = Math.round(Math.hypot(m.x - sc.me.x, m.y - sc.me.y)); return `<button class="radar-mon ${m.id === S.me.focus ? 'selected' : ''}" data-guide="select" data-id="${m.id}"><img src="${monURL(m.key, m.shiny, 1)}" alt=""><span><b>${m.shiny ? '✦ ' : m.flags & 64 ? '👑 ' : ''}${esc(SPECIES[m.key].name)}</b><small>Nv.${m.lvl} · ${d}m · ${m.flags & 4 ? 'Jefe' : m.flags & 64 ? 'Alfa' : c.dex.caught[m.key] ? 'Registrado' : '¡Nuevo!'}</small></span><span class="radar-dot ${m.shiny ? 'shiny' : ''}"></span></button>`; }).join('') : '<p class="radar-empty">' + (z?.kind === 'town' ? 'Sal a una ruta para encontrar Pokémon.' : 'Sigue explorando. Los encuentros aparecen cerca de ti.') + '</p>'}</div>
      <button class="guide-help" data-guide="help">WASD o clic para moverte · Ayuda [H]</button>`}`;
    if (html !== this.last) { this.last = html; this.root.innerHTML = html; }
    const it = sc.nearInteractable();
    this.context.hidden = !it || !!document.querySelector('.dialog, .win');
    if (it) this.context.innerHTML = `<kbd>E</kbd> ${esc(it.label)} <span>↵</span>`;
    const point = S.waypoint; this.compass.hidden = !point;
    if (point) {
      const angle = Math.atan2(point.y - sc.me.y, point.x - sc.me.x) * 180 / Math.PI + 90;
      const distance = Math.round(Math.hypot(point.x - sc.me.x, point.y - sc.me.y));
      this.compass.innerHTML = `<span class="compass-arrow" style="transform:rotate(${angle}deg)">↑</span><span><small>DESTINO · DIRECCIÓN</small><b>${esc(point.name)}</b></span><span>${distance} m</span><span aria-label="Quitar destino">×</span>`;
    }
  }
}

export function renderResearch(body: HTMLElement) {
  const c = S.core; if (!c) return;
  const complete = RESEARCH.filter(t => c.claimed.includes(researchClaimId(t.id))).length;
  const readyList = RESEARCH.filter(t => !c.claimed.includes(researchClaimId(t.id)) && researchProgress(c, t) >= t.goal);
  const rank = complete >= 12 ? 'Naturalista' : complete >= 8 ? 'Investigador' : complete >= 4 ? 'Explorador' : 'Aprendiz';
  body.innerHTML = `<div class="research-hero"><div class="row" style="justify-content:space-between"><span class="eyebrow">LABORATORIO DE CAMPO / REGIÓN KANTO</span>${readyList.length ? `<button class="btn small gold" id="rclaimall">🎉 Entregar listas (${readyList.length})</button>` : ''}</div><h2>Cada descubrimiento cuenta.</h2><p>Observa, captura y explora. Tu progreso anterior también cuenta.</p><div class="research-rank"><b>${rank}</b><span>${complete} / ${RESEARCH.length} investigaciones entregadas</span></div><div class="bar xp"><i style="width:${complete / RESEARCH.length * 100}%"></i></div></div><div class="research-grid">${RESEARCH.map((t, i) => {
    const claimed = c.claimed.includes(researchClaimId(t.id)), n = Math.min(t.goal, researchProgress(c, t)), done = n >= t.goal;
    const rewards = [t.reward.money ? `${t.reward.money} ₽` : '', t.reward.crystals ? `${t.reward.crystals} cristales` : '', t.reward.txp ? `${t.reward.txp} EXP` : '', ...Object.entries(t.reward.items || {}).map(([id, qty]) => `${ITEMS[id].name} ×${qty}`)].filter(Boolean);
    return `<article class="research-card ${claimed ? 'claimed' : done ? 'ready' : ''}"><div class="field-heading"><span>ESTUDIO ${String(i + 1).padStart(2, '0')}</span><span>${claimed ? '✓ ENTREGADO' : done ? 'LISTO' : `${n}/${t.goal}`}</span></div><h3>${t.name}</h3><p>${t.desc}</p><div class="bar xp"><i style="width:${n / t.goal * 100}%"></i></div><div class="research-reward">${rewards.join(' · ')}</div><button class="btn small ${done ? 'gold' : 'gray'}" data-research="${t.id}" ${!done || claimed ? 'disabled' : ''}>${claimed ? 'Recompensa recibida' : done ? 'Entregar investigación' : 'En progreso'}</button></article>`;
  }).join('')}</div>`;
  body.querySelectorAll<HTMLButtonElement>('[data-research]').forEach(b => b.onclick = () => { b.disabled = true; net.send({ t: 'research', id: b.dataset.research }); });
  const rca = body.querySelector('#rclaimall') as HTMLButtonElement | null;
  if (rca) rca.onclick = () => { rca.disabled = true; readyList.forEach(t => net.send({ t: 'research', id: t.id })); };
}
