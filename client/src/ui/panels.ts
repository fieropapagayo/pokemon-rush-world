// Ventanas del juego: Equipo, Pokédex, Mochila, Mejoras, Expediciones, Mapa, Misiones, Social, Ajustes, Tienda, Ayuda.
import { el, esc, fmt, time, draggable } from './dom';
import { shinyDenominator, encounterWeight } from '../../../shared/encounters';
import { CHANGELOG, RELEASE } from '../../../shared/changelog';
import { S, bus, monByUid, saveSettings, MonSave } from '../state';
import { net } from '../networking/net';
import { SPECIES, SPECIES_LIST, FAMILIES, RARITY_NAMES, RARITY_COLORS } from '../../../shared/species';
import { TYPES, TYPE_NAMES, TYPE_COLORS, PType, typeEffect } from '../../../shared/types';
import { ITEMS, ITEM_LIST, BALLS } from '../../../shared/items';
import { ZONES } from '../../../shared/zones';
import { MOVES } from '../../../shared/moves';
import {
  UPGRADES, upgradeCost, QUESTS, EXPEDITIONS, LINKS, LINK_MAP, calcStats, knownMoves, monXpForLevel, teamSlotsFor, candyCostForLevel,
  transferCandies, catchChance, CATCH_BONUS, computeLinks, SKILLS, NATURES, MAX_LEVEL, evoCandyCost,
} from '../../../shared/progression';
import { DUNGEON_DEFS } from '../../../shared/world/worldgen';
import { STATUS_NAMES } from '../../../shared/constants';
import { monURL, trainerURL } from '../graphics/textures';
import { HAT_COLORS, SHIRT_COLORS, SKIN_COLORS, HAIR_COLORS } from '../graphics/trainerArt';
import { iconURL } from '../graphics/iconArt';
import { audio } from '../systems/audio';
import { statValueClient } from './util';
import type { Hud } from './hud';
import { renderResearch, markZone } from './exploration';
import { playerBlocked } from '../../../shared/world/worldgen';
import { renderGyms } from './gyms';
import { GYMS } from '../../../shared/gyms';
import { openNotebook } from './notebook';
import { seasonAt, weatherAt, seasonLeft, SEASON_NAMES, SEASON_ICONS, WEATHER_NAMES, WEATHER_ICONS, SEASONAL } from '../../../shared/weather';

export const monCP = (s: any, lvl: number, iv: any) => { const st = calcStats(s, lvl, iv); return Math.floor(st.atk * 1.5 + st.hp * 0.8 + st.def * 1.2 + st.spd); };

const TOKEN_SHOP: Record<string, number> = { masterball: 30, caramelo_raro: 3, incienso: 4, cable_link: 6 };
const typeTag = (t: string) => `<span class="tag" style="background:${(TYPE_COLORS as any)[t]}">${(TYPE_NAMES as any)[t]}</span>`;
const typeMatchupHtml = (defTypes: readonly PType[]) => {
  const weak = TYPES.map(t => ({ t, m: typeEffect(t, defTypes) })).filter(x => x.m > 1).sort((a, b) => b.m - a.m);
  const res = TYPES.map(t => ({ t, m: typeEffect(t, defTypes) })).filter(x => x.m < 1).sort((a, b) => a.m - b.m);
  const chip = (x: { t: PType; m: number }) => `<span class="tag" style="background:${TYPE_COLORS[x.t]};color:#000;font-size:10px;padding:1px 5px">${TYPE_NAMES[x.t]} ×${x.m}</span>`;
  return `<div style="font-size:11px;display:flex;flex-direction:column;gap:3px;margin:4px 0"><div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center"><span class="muted" style="min-width:54px">Débil a:</span>${weak.length ? weak.map(chip).join('') : '<span class="muted">Ninguno</span>'}</div><div style="display:flex;flex-wrap:wrap;gap:3px;align-items:center"><span class="muted" style="min-width:54px">Resiste:</span>${res.length ? res.map(chip).join('') : '<span class="muted">Ninguno</span>'}</div></div>`;
};
const curIcon = (c: string) => c === 'money' ? iconURL('money') : c === 'crystals' ? iconURL('crystal') : c === 'tokens' ? iconURL('token') : iconURL('ess_' + c);

interface Win { root: HTMLElement; body: HTMLElement; render: () => void; }

export class Panels {
  wins = new Map<string, Win>();
  order: string[] = [];
  teamSel: string | null = null;
  teamFilter = ''; teamSort: 'lvl' | 'cp' | 'iv' | 'dex' | 'new' = 'lvl';
  teamTypeFilter = 'all';
  dexSel: string | null = null; dexShiny = false; dexFilter = ''; dexTypeFilter = ''; dexTab: 'all' | 'caught' | 'missing' | 'shiny' | 'legend' | 'season' = 'all';
  viewDir = 1; viewPose: 'idle' | 'walk' | 'attack' = 'walk'; viewSpin = false; viewStep = 0; trainerDir = 0;
  upgTab: 'core' | 'auto' | 'affinity' = 'core';
  invTab: 'all' | 'ball' | 'heal' | 'evo' | 'special' = 'all';
  shopTab: 'buy' | 'sell' = 'buy';
  socialTab: 'players' | 'rank' | 'pvp' = 'players';
  rankCat: 'nivel' | 'pokedex' | 'medallas' | 'jefes' | 'shinies' | 'derrotas' = 'nivel';
  mapFilter = '';
  expPick: string[] = []; expType = 'materials';
  inspect: any = null;

  constructor(private hud: Hud) {
    bus.on('core', () => this.rerender(['team', 'inv', 'upg', 'exp', 'quests', 'shop', 'map', 'dex', 'research', 'gyms', 'trade']));
    bus.on('mons', () => this.rerender(['team', 'exp', 'dex', 'trade']));
    bus.on('players', () => this.rerender(['social']));
    bus.on('party', () => this.rerender(['social']));
  }

  rerender(names: string[]) { for (const n of names) { const w = this.wins.get(n); if (w) w.render(); } }

  toggle(name: string) { if (this.wins.has(name)) this.close(name); else this.open(name); }

  open(name: string) {
    bus.emit('cancel_walk');
    audio.init(); audio.play('uiopen');
    let w = this.wins.get(name);
    if (w) { w.root.style.zIndex = String(41 + this.order.length); return; }
    const titles: Record<string, string> = { team: 'EQUIPO Y CAJA', dex: 'POKÉDEX', inv: 'MOCHILA', upg: 'MEJORAS', exp: 'EXPEDICIONES', map: 'MAPA DE LA REGIÓN', quests: 'MISIONES Y PROGRESO', social: 'SOCIAL Y RANKING', settings: 'AJUSTES', shop: 'TIENDA POKÉMON', help: 'AYUDA', trade: '⇄ INTERCAMBIO POKÉMON' };
    const root = el('div', 'panel win');
    titles.research = 'DIARIO DE CAMPO';
    titles.gyms = 'GIMNASIOS Y MEDALLAS';
    titles.trainer = 'TARJETA DE ENTRENADOR';
    root.innerHTML = `<div class="tb"><h3>${titles[name] || name.toUpperCase()}</h3><button class="x">✕</button></div><div class="body scroll"></div>`;
    const body = root.querySelector('.body') as HTMLElement;
    (root.querySelector('.x') as HTMLElement).onclick = () => { if (name === 'trade' && S.trade) net.send({ t: 'trade_cancel' }); this.close(name); };
    draggable(root, root.querySelector('.tb') as HTMLElement);
    root.addEventListener('mousedown', () => { root.style.zIndex = String(41 + this.order.length); });
    const renderers: Record<string, () => void> = {
      team: () => this.renderTeam(body), dex: () => this.renderDex(body), inv: () => this.renderInv(body), upg: () => this.renderUpg(body),
      exp: () => this.renderExp(body), map: () => this.renderMap(body), quests: () => this.renderQuests(body), social: () => this.renderSocial(body),
      settings: () => this.renderSettings(body), shop: () => this.renderShop(body), help: () => this.renderHelp(body),
      research: () => renderResearch(body),
      gyms: () => renderGyms(body, this.hud),
      trainer: () => this.renderTrainer(body),
      trade: () => this.renderTrade(body),
    };
    w = { root, body, render: renderers[name] || (() => {}) };
    if (name === 'map') root.style.width = 'min(980px, 96vw)';
    if (name === 'settings' || name === 'help' || name === 'trainer') root.style.width = 'min(640px, 96vw)';
    this.wins.set(name, w); this.order.push(name);
    this.hud.root.appendChild(root);
    w.render();
  }

  close(name: string) {
    const w = this.wins.get(name); if (!w) return;
    w.root.remove(); this.wins.delete(name); this.order = this.order.filter(n => n !== name);
    audio.play('ui');
  }
  closeTop(): boolean { const n = this.order[this.order.length - 1]; if (!n) return false; this.close(n); return true; }

  currentFrame(): number {
    if (this.viewPose === 'idle') return Math.floor(this.viewStep / 2) % 2;
    if (this.viewPose === 'walk') return 2 + (this.viewStep % 4);
    return 6 + (this.viewStep % 2);
  }

  controls3D(): string {
    return `<div class="row" style="gap:3px;justify-content:center;margin-top:4px">
      <button class="btn tiny gray" data-v3d="prev" title="Girar modelo 3D a la izquierda" style="padding:2px 5px;font-size:10px">◀</button>
      <button class="btn tiny ${this.viewSpin ? 'gold' : 'gray'}" data-v3d="spin" title="Rotación 360° en tiempo real" style="padding:2px 5px;font-size:10px">⟳ 360°</button>
      <button class="btn tiny gray" data-v3d="next" title="Girar modelo 3D a la derecha" style="padding:2px 5px;font-size:10px">▶</button>
      <button class="btn tiny ${this.viewPose === 'attack' ? 'red' : this.viewPose === 'walk' ? 'green' : 'gray'}" data-v3d="pose" title="Cambiar animación 3D" style="padding:2px 6px;font-size:10px">${this.viewPose === 'idle' ? 'Reposo' : this.viewPose === 'walk' ? 'Caminar' : '¡Ataque!'}</button>
    </div>`;
  }

  bind3D(body: HTMLElement, rerender: () => void) {
    body.querySelectorAll<HTMLElement>('[data-v3d]').forEach(b => b.onclick = () => {
      const k = b.dataset.v3d;
      if (k === 'prev') { this.viewSpin = false; this.viewDir = (this.viewDir + 7) % 8; }
      if (k === 'next') { this.viewSpin = false; this.viewDir = (this.viewDir + 1) % 8; }
      if (k === 'spin') { this.viewSpin = !this.viewSpin; }
      if (k === 'pose') { this.viewPose = this.viewPose === 'idle' ? 'walk' : this.viewPose === 'walk' ? 'attack' : 'idle'; }
      audio.play('ui');
      rerender();
    });
  }

  tick() {
    const w = this.wins.get('exp'); if (w && S.core?.expeditions.length) { const t = w.body.querySelectorAll('[data-left]'); t.forEach(x => { const e = S.core!.expeditions.find(ee => String(ee.slot) === (x as HTMLElement).dataset.left); if (e) x.textContent = time(e.end - net.serverNow()); }); }
    this.viewStep = (this.viewStep + 1) % 24;
    if (this.viewSpin && this.viewStep % 2 === 0) this.viewDir = (this.viewDir + 1) % 8;
    const fr = this.currentFrame();
    const tw = this.wins.get('team');
    if (tw && this.teamSel) {
      const img = tw.body.querySelector('#team3d') as HTMLImageElement | null;
      const m = monByUid(this.teamSel);
      if (img && m) img.src = monURL(m.sp, m.shiny, 3, this.viewDir, fr);
    }
    const dw = this.wins.get('dex');
    if (dw && this.dexSel) {
      const img = dw.body.querySelector('#dex3d') as HTMLImageElement | null;
      const d = S.core?.dex;
      if (img && d && (d.seen[this.dexSel] || d.caught[this.dexSel])) {
        img.src = monURL(this.dexSel, this.dexShiny && !!d.shiny[this.dexSel], 3, this.viewDir, fr);
      }
    }
    const tStep = [0, 1, 0, 2][this.viewStep % 4];
    const sw = this.wins.get('settings');
    if (sw && S.core) {
      const av = sw.body.querySelector('#set-avatar') as HTMLImageElement | null;
      if (av) av.src = trainerURL(S.core.look, 3, this.trainerDir, tStep);
    }
    const trw = this.wins.get('trainer');
    if (trw && S.core) {
      const av = trw.body.querySelector('#tc-avatar') as HTMLImageElement | null;
      if (av) av.src = trainerURL(S.core.look, 4, this.trainerDir, tStep);
    }
  }

  openMon(uid: string) { this.teamSel = uid; if (this.wins.has('team')) this.wins.get('team')!.render(); else this.open('team'); }

  // =================================================================== EQUIPO
  renderTeam(body: HTMLElement) {
    const c = S.core; if (!c) return;
    const slots = teamSlotsFor(c.tlvl);
    const busy = new Set(c.expeditions.flatMap((e: any) => e.uids));
    const team = c.team.map(u => monByUid(u)).filter(Boolean) as MonSave[];

    let list = S.mons.filter(m => !this.teamFilter || SPECIES[m.sp].name.toLowerCase().includes(this.teamFilter.toLowerCase()) || (m.nick || '').toLowerCase().includes(this.teamFilter.toLowerCase()) || SPECIES[m.sp].types.some(t => TYPE_NAMES[t].toLowerCase().startsWith(this.teamFilter.toLowerCase())));
    if (this.teamTypeFilter !== 'all') {
      if (this.teamTypeFilter === 'fav') list = list.filter(m => m.fav);
      else if (this.teamTypeFilter === 'shiny') list = list.filter(m => m.shiny);
      else if (this.teamTypeFilter === 'elite') list = list.filter(m => (m.iv[0] + m.iv[1] + m.iv[2] + m.iv[3]) >= 105);
      else if (this.teamTypeFilter === 'evo') list = list.filter(m => (SPECIES[m.sp].evo || []).length > 0);
      else if (this.teamTypeFilter.startsWith('r_')) { const r = this.teamTypeFilter.slice(2); list = list.filter(m => r === 'legend' ? ['legendary', 'mythic'].includes(SPECIES[m.sp].rarity) : SPECIES[m.sp].rarity === r); }
      else list = list.filter(m => SPECIES[m.sp].types.includes(this.teamTypeFilter as any));
    }
    list = list.sort((a, b) => {
      if (this.teamSort === 'lvl') return b.lvl - a.lvl;
      if (this.teamSort === 'cp') return monCP(SPECIES[b.sp], b.lvl, b.iv) - monCP(SPECIES[a.sp], a.lvl, a.iv);
      if (this.teamSort === 'iv') return (b.iv[0] + b.iv[1] + b.iv[2] + b.iv[3]) - (a.iv[0] + a.iv[1] + a.iv[2] + a.iv[3]);
      if (this.teamSort === 'dex') return SPECIES[a.sp].dex - SPECIES[b.sp].dex;
      return b.caught - a.caught;
    });
    const sel = this.teamSel ? monByUid(this.teamSel) : null;
    const links = computeLinks(team.map(m => m.sp));
    const availByCp = S.mons.filter(m => !busy.has(m.uid)).sort((a, b) => monCP(SPECIES[b.sp], b.lvl, b.iv) - monCP(SPECIES[a.sp], a.lvl, a.iv));
    const linkPresets: { id: string; name: string; color: string; desc: string; uids: string[] }[] = [];
    for (const L of LINKS) {
      if (slots < L.need) continue;
      let corePick: MonSave[] = [];
      if (L.types) {
        const matching = availByCp.filter(m => SPECIES[m.sp].types.some(t => L.types!.includes(t)));
        if (matching.length >= L.need) corePick = matching.slice(0, Math.min(slots, Math.max(L.need, Math.min(3, matching.length))));
      } else if (L.id === 'evolution_resonance') {
        const byFam: Record<string, MonSave[]> = {};
        availByCp.forEach(m => { (byFam[SPECIES[m.sp].family] ||= []).push(m); });
        let bestF: MonSave[] = [];
        for (const f in byFam) if (byFam[f].length >= 2 && (!bestF.length || monCP(SPECIES[byFam[f][0].sp], byFam[f][0].lvl, byFam[f][0].iv) > monCP(SPECIES[bestF[0].sp], bestF[0].lvl, bestF[0].iv))) bestF = byFam[f];
        if (bestF.length >= 2) corePick = bestF.slice(0, Math.min(slots, 3));
      } else if (L.id === 'prism') {
        const covered = new Set<string>();
        for (const m of availByCp) {
          if (corePick.length >= slots) break;
          const spT = SPECIES[m.sp].types;
          if (spT.some(t => !covered.has(t))) {
            corePick.push(m);
            spT.forEach(t => covered.add(t));
          }
          if (covered.size >= 5) break;
        }
        if (covered.size < 5) corePick = [];
      }
      if (corePick.length) {
        const pickedIds = new Set(corePick.map(m => m.uid));
        for (const m of availByCp) {
          if (corePick.length >= slots) break;
          if (!pickedIds.has(m.uid)) { corePick.push(m); pickedIds.add(m.uid); }
        }
        linkPresets.push({ id: L.id, name: L.name, color: L.color, desc: L.desc, uids: corePick.map(m => m.uid) });
      }
    }
    body.innerHTML = `
      <div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1 1 380px;min-width:300px">
          <div class="row" style="justify-content:space-between"><b>Equipo activo (${team.length}/${slots})</b><div class="row" style="gap:6px"><button class="btn tiny gold" id="tbest" title="Equipa automáticamente tus Pokémon disponibles con mayor Poder (PC)">⚡ Equipar mejores</button><span class="muted" style="font-size:11px">Ranuras: 3→6</span></div></div>
          <div class="grid" style="grid-template-columns:repeat(3,1fr);margin:6px 0">
            ${[0, 1, 2, 3, 4, 5].map(i => { const m = team[i]; if (!m) return `<div class="card" style="height:64px;display:flex;align-items:center;justify-content:center;${i >= slots ? 'opacity:.4' : ''}">${i >= slots ? 'Bloqueada' : '<span class="muted">Vacía</span>'}</div>`; const sp = SPECIES[m.sp]; const cp = monCP(sp, m.lvl, m.iv); const ivTot = m.iv[0] + m.iv[1] + m.iv[2] + m.iv[3]; const star = ivTot === 124 ? '<span style="color:#ff3388" title="100% IVs">✦</span>' : ivTot >= 105 ? '<span class="gold" title="Élite (85%+ IV)">★</span>' : ''; return `<div class="card mon-card ${this.teamSel === m.uid ? 'sel' : ''}" data-uid="${m.uid}"><img src="${monURL(m.sp, m.shiny, 1)}"><div><div>${m.fav ? '⭐ ' : ''}${m.shiny ? '<span class="gold">✦ </span>' : ''}${star ? star + ' ' : ''}${esc(m.nick || sp.name)}</div><div class="muted" style="font-size:12px">Nv.${m.lvl} · <b class="gold">PC ${cp}</b></div><div>${sp.types.map(typeTag).join('')}</div></div></div>`; }).join('')}
          </div>
          <div class="card" style="margin-bottom:6px"><b style="color:var(--gold)">Pokémon Link activos</b>
            ${links.length ? links.map(l => { const d = LINK_MAP[l.id]; return `<div class="linkrow"><span class="sw" style="background:${d.color}"></span><div><b>${d.name}${l.tier === 2 ? ' II' : ''}</b> <span class="muted">(${l.members.length} miembros)</span><div class="muted" style="font-size:12px">${esc(d.desc)}</div></div></div>`; }).join('') : '<div class="muted" style="font-size:12px;padding:2px 0">Ninguno. Equipa 2+ del mismo tipo, familia o 5 tipos distintos.</div>'}
            ${linkPresets.length ? `<details style="margin-top:4px;padding-top:4px;border-top:1px solid #ffffff14"><summary style="cursor:pointer;font-size:11px;color:#ffd866">⚡ Armar sinergia en 1 clic (${linkPresets.length} disponibles)</summary><div class="row" style="gap:4px;flex-wrap:wrap;margin-top:4px">${linkPresets.map(p => `<button class="btn tiny ${links.some(l => l.id === p.id) ? 'gold' : 'gray'}" data-buildlink="${p.id}" style="border-left:3px solid ${p.color};font-size:10px;padding:1px 6px" title="${esc(p.desc)}">${esc(p.name)}</button>`).join('')}</div></details>` : ''}
          </div>
          <div class="row" style="margin:4px 0 6px;gap:4px;flex-wrap:wrap;align-items:center">
            <input id="tf" placeholder="🔍 Buscar..." value="${esc(this.teamFilter)}" style="flex:1 1 110px;min-width:80px;padding:3px 6px;background:#10141f;color:#fff;border:1px solid #334455;border-radius:4px;font-size:11px" />
            <select id="tsort" style="background:#10141f;color:#ffd866;border:1px solid #334455;border-radius:4px;padding:2px 4px;font-size:11px">
              <option value="lvl" ${this.teamSort === 'lvl' ? 'selected' : ''}>Nivel</option>
              <option value="cp" ${this.teamSort === 'cp' ? 'selected' : ''}>Poder (PC)</option>
              <option value="iv" ${this.teamSort === 'iv' ? 'selected' : ''}>% IV</option>
              <option value="dex" ${this.teamSort === 'dex' ? 'selected' : ''}>Nº</option>
              <option value="new" ${this.teamSort === 'new' ? 'selected' : ''}>Recientes</option>
            </select>
            <select id="tfilter-type" style="background:#10141f;color:#a8e0ff;border:1px solid #334455;border-radius:4px;padding:2px 4px;font-size:11px">
              <option value="all">Tipo...</option>
              ${Object.entries(TYPE_NAMES).map(([k, v]) => `<option value="${k}" ${this.teamTypeFilter === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
            <select id="tfilter-rar" style="background:#10141f;color:#ffcf3f;border:1px solid #334455;border-radius:4px;padding:2px 4px;font-size:11px">
              <option value="all" ${!this.teamTypeFilter.startsWith('r_') ? 'selected' : ''}>Rareza...</option>
              <option value="r_legend" ${this.teamTypeFilter === 'r_legend' ? 'selected' : ''}>👑 Legendarios</option>
              <option value="r_epic" ${this.teamTypeFilter === 'r_epic' ? 'selected' : ''}>Épicos</option>
              <option value="r_rare" ${this.teamTypeFilter === 'r_rare' ? 'selected' : ''}>Raros</option>
              <option value="r_uncommon" ${this.teamTypeFilter === 'r_uncommon' ? 'selected' : ''}>Poco comunes</option>
              <option value="r_common" ${this.teamTypeFilter === 'r_common' ? 'selected' : ''}>Comunes</option>
            </select>
            <div class="row" style="gap:2px">
              <button class="btn tiny ${this.teamTypeFilter === 'all' && !this.teamFilter ? 'on' : 'gray'}" data-tfilter="all" title="Ver todos">Todos</button>
              <button class="btn tiny ${this.teamTypeFilter === 'fav' ? 'on' : 'gray'}" data-tfilter="fav" title="Solo Favoritos">⭐</button>
              <button class="btn tiny ${this.teamTypeFilter === 'shiny' ? 'on' : 'gray'}" data-tfilter="shiny" title="Solo Shinies">✦</button>
              <button class="btn tiny ${this.teamTypeFilter === 'elite' ? 'on' : 'gray'}" data-tfilter="elite" title="Élite 85%+ IV">★</button>
              <button class="btn tiny ${this.teamTypeFilter === 'evo' ? 'on' : 'gray'}" data-tfilter="evo" title="Listos para evolucionar">▲</button>
            </div>
            <button class="btn tiny red" id="tdup" title="Transfiere los repetidos conservando el mejor de cada especie">♻ Repetidos</button>
          </div>
          <div class="grid boxgrid">${list.map(m => { const sp = SPECIES[m.sp]; const inT = c.team.includes(m.uid); const cp = monCP(sp, m.lvl, m.iv); return `<div class="card boxcell ${inT ? 'inteam' : ''} ${busy.has(m.uid) ? 'exp' : ''} ${this.teamSel === m.uid ? 'sel' : ''}" data-uid="${m.uid}" title="${esc(m.nick ? `${m.nick} (${sp.name})` : sp.name)} Nv.${m.lvl} · PC ${cp}${busy.has(m.uid) ? ' (en expedición)' : ''}">${m.shiny ? '<span class="s">✦</span>' : m.fav ? '<span class="s">⭐</span>' : ''}${inT ? '<span class="t">EQ</span>' : ''}<img src="${monURL(m.sp, m.shiny, 1)}">${m.fav && m.shiny ? '⭐ ' : ''}${esc(m.nick || sp.name)}<br><span class="muted">Nv.${m.lvl} · PC ${cp}</span></div>`; }).join('')}</div>
          <div class="muted" style="font-size:12px;margin-top:4px">${S.mons.length} Pokémon en total.</div>
        </div>
        <div style="flex:1 1 300px;min-width:280px" id="mondetail">${sel ? this.monDetail(sel, busy.has(sel.uid)) : '<div class="card muted" style="padding:20px;text-align:center">Selecciona un Pokémon para ver su ficha, evolucionarlo o mejorarlo.</div>'}</div>
      </div>`;
    body.querySelectorAll<HTMLElement>('[data-uid]').forEach(d => d.onclick = () => {
      this.teamSel = d.dataset.uid!;
      const ms = monByUid(this.teamSel);
      if (ms) audio.cry(SPECIES[ms.sp].dex - 1);
      else audio.play('ui');
      this.renderTeam(body);
    });
    const sSort = body.querySelector('#tsort') as HTMLSelectElement | null;
    if (sSort) sSort.onchange = () => { this.teamSort = sSort.value as any; this.renderTeam(body); };
    const sType = body.querySelector('#tfilter-type') as HTMLSelectElement | null;
    if (sType) sType.onchange = () => { this.teamTypeFilter = sType.value; this.renderTeam(body); };
    const sRar = body.querySelector('#tfilter-rar') as HTMLSelectElement | null;
    if (sRar) sRar.onchange = () => { this.teamTypeFilter = sRar.value; this.renderTeam(body); };
    body.querySelectorAll<HTMLElement>('[data-sort]').forEach(d => d.onclick = () => { this.teamSort = d.dataset.sort as any; this.renderTeam(body); });
    body.querySelectorAll<HTMLElement>('[data-tfilter]').forEach(d => d.onclick = () => { this.teamTypeFilter = d.dataset.tfilter!; this.renderTeam(body); });
    body.querySelectorAll<HTMLElement>('[data-buildlink]').forEach(b => b.onclick = () => {
      const p = linkPresets.find(x => x.id === b.dataset.buildlink);
      if (p && p.uids.length) {
        net.send({ t: 'team', uids: p.uids });
        audio.play('sparkle');
        this.hud.toast(`⚡ Sinergia equipada: ${p.name}`, 'gold');
      }
    });
    const tf = body.querySelector('#tf') as HTMLInputElement;
    tf.oninput = () => { this.teamFilter = tf.value; clearTimeout((this as any)._tf); (this as any)._tf = setTimeout(() => { this.renderTeam(body); const n = body.querySelector('#tf') as HTMLInputElement; n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
    tf.onkeydown = e => e.stopPropagation();
    (body.querySelector('#tdup') as HTMLElement).onclick = () => {
      const best: Record<string, MonSave> = {};
      for (const m of S.mons) { if (!best[m.sp] || m.lvl > best[m.sp].lvl || c.team.includes(m.uid)) if (!best[m.sp] || !c.team.includes(best[m.sp].uid)) best[m.sp] = m; }
      const out = S.mons.filter(m => !m.shiny && !m.fav && !c.team.includes(m.uid) && !busy.has(m.uid) && best[m.sp] && best[m.sp].uid !== m.uid).map(m => m.uid);
      if (!out.length) { this.hud.toast('No hay repetidos que transferir (los favoritos y shinies están protegidos).', 'info'); return; }
      if (confirm(`¿Transferir ${out.length} Pokémon repetidos al Profesor a cambio de caramelos, esencias y dinero?`)) net.send({ t: 'transfer', uids: out });
    };
    const tb = body.querySelector('#tbest') as HTMLElement | null;
    if (tb) tb.onclick = () => {
      const pick = availByCp.slice(0, slots).map(m => m.uid);
      if (pick.length) { net.send({ t: 'team', uids: pick }); audio.play('sparkle'); }
    };
    this.bindDetail(body);
  }

  monDetail(m: MonSave, busy: boolean): string {
    const c = S.core!;
    const sp = SPECIES[m.sp];
    const st = calcStats(sp, m.lvl, m.iv, m.nat || 0);
    const mv = knownMoves(sp, m.lvl);
    const inTeam = c.team.includes(m.uid);
    const slots = teamSlotsFor(c.tlvl);
    const a = monXpForLevel(m.lvl), b = monXpForLevel(m.lvl + 1);
    const tl = S.team.find(t => t.uid === m.uid);
    const night = (() => { const h = ((net.serverNow() % (20 * 60000)) / (20 * 60000)) * 24; return h < 6 || h >= 19.5; })();
    const evos = (sp.evo || []).map(e => {
      const to = SPECIES[e.to];
      let ok = true; const req: string[] = [];
      if (e.level) { req.push(`Nivel ${e.level}`); if (m.lvl < e.level) ok = false; }
      if (e.item) { const have = c.items[e.item] || 0; req.push(`${ITEMS[e.item].name} (${have})`); if (!have) ok = false; }
      if (e.friendship) { req.push(`Amistad ${m.fr}/${e.friendship}`); if (m.fr < e.friendship) ok = false; }
      if (e.time) { req.push(e.time === 'night' ? 'De noche' : 'De día'); if ((e.time === 'night') !== night) ok = false; }
      { const need = evoCandyCost(sp), have = c.candies[sp.family] || 0; req.push(`Caramelos ${have}/${need}`); if (have < need) ok = false; }
      return `<div class="row card" style="margin:3px 0"><img class="px" src="${monURL(e.to, m.shiny, 1)}" style="width:40px;height:40px"><div class="grow"><b>${esc(to.name)}</b><div class="muted" style="font-size:12px">${req.map(esc).join(' · ')}</div></div><button class="btn small ${ok ? 'gold' : 'gray'}" data-evo="${e.to}" ${ok ? '' : 'disabled'}>Evolucionar</button></div>`;
    }).join('');
    const fam = sp.family, candies = c.candies[fam] || 0, cost = candyCostForLevel(m.lvl);
    let cost5 = 0;
    for (let k = 0; k < 5 && m.lvl + k < MAX_LEVEL; k++) cost5 += candyCostForLevel(m.lvl + k);
    const statRow = (n: string, v: number, iv: number, max: number) => `<div class="stat"><span>${n}</span><div class="bar"><i style="width:${Math.min(100, v / max * 100)}%;background:#58a8f0"></i></div><span>${v}</span></div><div class="muted" style="font-size:11px;margin:-3px 0 2px 76px">IV ${iv}/15</div>`;
    const mvRow = (x: any) => x ? `<div class="row" style="font-size:13px">${typeTag(x.type)}<b>${esc(x.name)}</b><span class="muted">Pot. ${x.power} · ${x.kind === 'melee' ? 'cuerpo a cuerpo' : x.kind === 'proj' ? 'proyectil' : x.kind === 'aoe' ? 'área' : x.kind === 'nova' ? 'área propia' : x.kind === 'beam' ? 'rayo' : 'especial'} · ${x.cd}s</span></div>` : '';
    const ivSum = m.iv[0] + m.iv[1] + m.iv[2] + m.iv[3];
    const ivPct = Math.round(ivSum / 124 * 100);
    const nature = NATURES[m.nat || 0]; const STATN = ['PS', 'Ataque', 'Defensa', 'Velocidad'];
    const natTag = `<span class="tag" style="background:#2a3a48;font-size:10px" title="${nature.up < 0 || nature.up === nature.down ? 'Naturaleza neutra' : `+10% ${STATN[nature.up]} · -10% ${STATN[nature.down]}`}">Naturaleza ${esc(nature.name)}</span>`;
    const ivBadge = ivPct === 100 ? '<span class="tag" style="background:#ff3388;color:#fff;font-size:10px;font-weight:bold">✦ 100% IV</span>' : ivPct >= 85 ? `<span class="tag" style="background:#f4c938;color:#000;font-size:10px;font-weight:bold">★ ${ivPct}% IV</span>` : `<span class="tag" style="background:#334466;color:#ccc;font-size:10px">${ivPct}% IV</span>`;
    const heartsCount = Math.max(1, Math.min(5, Math.ceil(m.fr / 51)));
    const hearts = '<span style="color:#ff6088;letter-spacing:1px">' + '♥'.repeat(heartsCount) + '</span><span style="color:#555;letter-spacing:1px">' + '♡'.repeat(5 - heartsCount) + '</span>';
    const zName = m.zone != null && ZONES[m.zone] ? ZONES[m.zone].name : 'Kanto';
    const cDate = m.caught ? new Date(m.caught).toLocaleDateString('es-ES') : '';
    const swapTeam = !busy && !inTeam && c.team.length >= slots ? c.team.map(u => monByUid(u)).filter(Boolean) as MonSave[] : [];
    return `<div class="card">
      <div class="row"><div class="col" style="align-items:center"><img id="team3d" class="px" src="${monURL(m.sp, m.shiny, 3, this.viewDir, this.currentFrame())}" style="width:144px;height:144px;background:#0003;border-radius:6px;transition:transform .2s ease">${this.controls3D()}</div>
        <div class="col" style="gap:3px">
          <div class="row" style="gap:4px;flex-wrap:wrap"><span style="font-size:19px">${m.shiny ? '<span class="gold">✦ </span>' : ''}${m.nick ? `${esc(m.nick)} <span class="muted" style="font-size:13px">(${esc(sp.name)})</span>` : esc(sp.name)} <span class="muted">#${String(sp.dex).padStart(3, '0')}</span></span></div>
          <div class="row" style="gap:4px;flex-wrap:wrap"><button class="btn tiny ${m.fav ? 'gold' : 'gray'}" data-act="fav" title="Proteger como Favorito">${m.fav ? '⭐ Favorito' : '☆ Favorito'}</button><button class="btn tiny gray" data-act="nick" title="Poner o cambiar mote">✏ Mote</button><button class="btn tiny" data-act="pet" style="background:#ff5c8a;color:#fff;border-color:#000" title="Acariciar a tu Pokémon">♥ Acariciar</button>${m.ot ? `<span class="tag" style="background:#2a3a58;color:#a8d8ff;font-size:10px" title="Intercambiado con ${esc(m.ot)}">EO: ${esc(m.ot)}</span>` : ''}</div>
          <div>${sp.types.map(typeTag).join('')} <span class="tag" style="background:${RARITY_COLORS[sp.rarity]};color:#000">${RARITY_NAMES[sp.rarity]}</span></div>
          <div>Nivel <b>${m.lvl}</b> · Amistad ${hearts} <span class="muted" style="font-size:11px">(${m.fr}/255)</span> · <b class="gold">PC ${monCP(sp, m.lvl, m.iv)}</b> ${ivBadge} ${natTag}</div>
          <div class="bar xp" style="width:160px"><i style="width:${Math.min(100, (m.xp - a) / Math.max(1, b - a) * 100)}%"></i></div>
          <div class="muted" style="font-size:11px">📍 Capturado en <b>${esc(zName)}</b>${cDate ? ` · ${cDate}` : ''}</div>
          ${tl ? `<div class="muted" style="font-size:12px">PS ${Math.ceil(tl.hp)}/${tl.mhp}${tl.status ? ' · ' + STATUS_NAMES[tl.status] : ''}</div>` : ''}
          ${busy ? '<div class="gold" style="font-size:12px">En expedición</div>' : ''}
        </div></div>
      <div class="hr"></div>
      ${statRow('PS', st.hp, m.iv[0], 400)}${statRow('Ataque', st.atk, m.iv[1], 300)}${statRow('Defensa', st.def, m.iv[2], 300)}${statRow('Velocidad', st.spd, m.iv[3], 170)}
      <div class="hr"></div>
      <div class="col" style="gap:3px"><div class="muted" style="font-size:12px">Movimientos (automáticos)</div>${mvRow(mv.basic)}${mvRow(mv.special)}</div><div class="hr"></div>${typeMatchupHtml(sp.types)}
      ${evos ? `<div class="hr"></div><div class="muted" style="font-size:12px">Evoluciones</div>${evos}${['kadabra', 'graveler', 'haunter', 'machoke'].includes(m.sp) ? '<div class="muted" style="font-size:11px;color:#a8d8ff">💡 También evoluciona gratis al intercambiarlo con otro entrenador desde Social [O].</div>' : ''}` : ''}
      <div class="hr"></div>
      <div class="row" style="flex-wrap:wrap">
        ${busy ? '' : inTeam ? `<button class="btn small gray" data-act="unequip">Quitar del equipo</button>` : `<button class="btn small green" data-act="equip">Equipar</button>`}
        <button class="btn small purple" data-act="feed" title="Sube 1 nivel con caramelos de su familia">Caramelos (${candies}/${cost})</button>
        ${m.lvl < 100 && candies >= cost5 && cost5 > cost ? `<button class="btn small purple" data-act="feed5" title="Subir 5 niveles seguidos (${cost5} caramelos)">+5 Nv (${cost5})</button>` : ''}
        <button class="btn small gold" data-act="rare" ${(c.items.caramelo_raro || 0) > 0 ? '' : 'disabled'}>Caramelo Raro (${c.items.caramelo_raro || 0})</button>
        ${!inTeam && !busy ? `<button class="btn small red" data-act="transfer" ${m.fav ? 'disabled' : ''} title="${m.fav ? 'Quita la estrella de Favorito para transferir' : `+${transferCandies(sp.stage, m.shiny)} caramelos, esencias y dinero`}">Transferir</button>` : ''}
      </div>
      ${swapTeam.length ? `<div class="row" style="gap:4px;flex-wrap:wrap;margin-top:6px;padding:4px 6px;background:#ffffff08;border-radius:4px"><span class="muted" style="font-size:11px">⇄ Sustituir por:</span>${swapTeam.map(tm => `<button class="btn tiny gray" data-swap="${tm.uid}" style="display:inline-flex;align-items:center;gap:3px;padding:1px 5px;font-size:10px" title="Cambiar por ${esc(tm.nick || SPECIES[tm.sp].name)} Nv.${tm.lvl}"><img class="px" src="${monURL(tm.sp, tm.shiny, 1)}" style="width:18px;height:18px">${esc(tm.nick || SPECIES[tm.sp].name)}</button>`).join('')}</div>` : ''}
      <div class="muted" style="font-size:12px;margin-top:6px">${esc(sp.desc)}</div>
    </div>`;
  }

  bindDetail(body: HTMLElement) {
    const uid = this.teamSel; if (!uid) return;
    const c = S.core!;
    const ms = monByUid(uid);
    body.querySelectorAll<HTMLElement>('[data-evo]').forEach(b => b.onclick = () => net.send({ t: 'evolve', uid, to: b.dataset.evo }));
    body.querySelectorAll<HTMLElement>('[data-swap]').forEach(b => b.onclick = () => {
      const targetUid = b.dataset.swap!;
      const next = c.team.map(u => u === targetUid ? uid : u);
      net.send({ t: 'team', uids: next });
      audio.play('sparkle');
    });
    body.querySelectorAll<HTMLElement>('[data-act]').forEach(b => b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'fav' && ms) { ms.fav = !ms.fav; net.send({ t: 'fav', uid }); this.renderTeam(body); return; }
      if (a === 'nick' && ms) {
        const v = prompt(`Nuevo mote para ${SPECIES[ms.sp].name} (máx. 12 caracteres, vacío para borrar):`, ms.nick || '');
        if (v !== null) { ms.nick = v.trim().slice(0, 12) || undefined; net.send({ t: 'nick', uid, name: v }); this.renderTeam(body); }
        return;
      }
      if (a === 'pet' && ms) {
        audio.play('sparkle');
        const img = body.querySelector('#team3d') as HTMLElement | null;
        if (img) {
          img.style.transform = 'translateY(-10px) scale(1.08)';
          setTimeout(() => { img.style.transform = ''; }, 240);
        }
        const sc = this.hud.scene();
        const overworldMon = S.team.find(t => t.uid === ms.uid);
        const mv = sc && overworldMon ? sc.mons.get(overworldMon.eid) : undefined;
        if (sc && mv) sc.petMon(mv);
        else this.hud.toast(`♥ ¡A ${ms.nick || SPECIES[ms.sp].name} le encanta que lo acaricies! (Amistad: ${ms.fr}/255)`, 'gold');
        return;
      }
      if (a === 'equip') {
        const slots = teamSlotsFor(c.tlvl);
        let team = [...c.team];
        if (team.length >= slots) { this.hud.toast(`Equipo lleno (${slots}). Usa "⇄ Sustituir por" abajo para intercambiarlo.`, 'bad'); return; }
        team.push(uid); net.send({ t: 'team', uids: team });
      }
      if (a === 'unequip') net.send({ t: 'team', uids: c.team.filter(u => u !== uid) });
      if (a === 'feed') net.send({ t: 'feed', uid });
      if (a === 'feed5') { for (let k = 0; k < 5; k++) net.send({ t: 'feed', uid }); audio.play('sparkle'); }
      if (a === 'rare') net.send({ t: 'use', item: 'caramelo_raro', uid });
      if (a === 'transfer') { if (confirm('¿Transferir este Pokémon al Profesor?')) { net.send({ t: 'transfer', uids: [uid] }); this.teamSel = null; } }
      audio.play('ui');
    });
    this.bind3D(body, () => this.renderTeam(body));
  }

  // =================================================================== EVOLUCIÓN
  evolution(m: any) {
    const from = SPECIES[m.from], to = SPECIES[m.to];
    const ov = el('div', 'overlay');
    ov.innerHTML = `<div class="evo-text">¿Qué? ¡${esc(from.name)} está evolucionando!</div><div class="evo-stage"><img id="ea" src="${monURL(m.from, m.shiny, 6)}"><img id="eb" src="${monURL(m.to, m.shiny, 6)}" style="opacity:0"></div><div class="evo-text" id="et">&nbsp;</div>`;
    this.hud.root.appendChild(ov);
    const a = ov.querySelector('#ea') as HTMLElement, b = ov.querySelector('#eb') as HTMLElement;
    a.style.filter = 'brightness(1)';
    audio.play('evolve');
    let t = 0, i = 0;
    const steps = [500, 450, 400, 330, 270, 220, 180, 140, 110, 90, 80, 70, 60, 60];
    const flip = () => {
      if (i >= steps.length) {
        a.style.opacity = '0'; b.style.opacity = '1'; b.style.filter = 'brightness(6)';
        setTimeout(() => { b.style.transition = 'filter .6s'; b.style.filter = 'brightness(1)'; }, 60);
        (ov.querySelector('#et') as HTMLElement).innerHTML = `¡Enhorabuena! ¡Tu ${esc(from.name)}<br>ha evolucionado a ${esc(to.name)}!`;
        audio.play('evodone');
        bus.emit('evolve_fx', m);
        const close = () => ov.remove();
        ov.onclick = close; setTimeout(close, 3500);
        return;
      }
      const showB = i % 2 === 1;
      a.style.opacity = showB ? '0' : '1'; b.style.opacity = showB ? '1' : '0';
      (showB ? b : a).style.filter = 'brightness(4)';
      setTimeout(() => { (showB ? b : a).style.filter = 'brightness(1.6)'; }, 40);
      t += steps[i]; i++;
      setTimeout(flip, steps[i - 1]);
    };
    setTimeout(flip, 700);
  }

  // =================================================================== POKÉDEX
  renderDex(body: HTMLElement) {
    const c = S.core!; const d = c.dex;
    const seen = SPECIES_LIST.filter(s => d.seen[s.key] || d.caught[s.key]).length, caught = SPECIES_LIST.filter(s => d.caught[s.key]).length, shiny = SPECIES_LIST.filter(s => d.shiny[s.key]).length;
    const sel = this.dexSel ? SPECIES[this.dexSel] : null;
    let detail = '<div class="card muted" style="padding:20px;text-align:center">Selecciona una especie.</div>';
    if (sel) {
      const isC = !!d.caught[sel.key], isS = !!(d.seen[sel.key] || isC);
      const fam = FAMILIES[sel.family];
      const locs = ZONES.filter(z => z.spawns.some(s => s[0] === sel.key) || (z.water || []).some(s => s[0] === sel.key));
      const seasEntries = SEASONAL.filter(x => x.key === sel.key);
      const showShiny = this.dexShiny && !!d.shiny[sel.key];
      const bst = sel.base;
      const ownedMons = S.mons.filter(m => m.sp === sel.key);
      detail = `<div class="card"><div class="row"><div class="col" style="align-items:center"><img id="dex3d" class="px" src="${monURL(sel.key, showShiny, 3, this.viewDir, isS ? this.currentFrame() : 0)}" style="width:144px;height:144px;background:#0003;border-radius:6px;${isS ? '' : 'filter:brightness(0)'}">${isS ? this.controls3D() : ''}</div>
        <div class="col" style="gap:3px"><div style="font-size:19px">#${String(sel.dex).padStart(3, '0')} ${isS ? esc(sel.name) : '???'}</div>
        ${isS ? `<div>${sel.types.map(typeTag).join('')}</div><div class="row" style="gap:4px;flex-wrap:wrap"><span class="tag" style="background:${RARITY_COLORS[sel.rarity]};color:#000">${RARITY_NAMES[sel.rarity]}</span><span class="tag" style="background:#253048;color:#f0e080;font-size:11px">BST ${bst.hp + bst.atk + bst.def + bst.spd}</span><span class="muted" style="font-size:12px">Ratio ${sel.catchRate}</span></div>` : ''}
        <div class="muted" style="font-size:12px">${isC ? `Capturados: ${d.caught[sel.key]}${d.shiny[sel.key] ? ` · Shiny: ${d.shiny[sel.key]}` : ''}` : isS ? 'Visto, aún no capturado' : 'Desconocido'}</div>
        <div class="row" style="gap:4px;flex-wrap:wrap">${d.shiny[sel.key] ? `<button class="btn tiny gold" id="dshiny">${this.dexShiny ? 'Ver normal' : 'Ver shiny ✦'}</button>` : ''}${ownedMons.length ? `<button class="btn tiny gray" id="dexbox" title="Ver tus ejemplares de ${esc(sel.name)} en Equipo [T]">◓ En Caja (${ownedMons.length})</button>` : ''}</div>
        </div></div>
        ${isS ? `<div class="hr"></div><div style="font-size:12px">${esc(sel.desc)}</div><div class="hr"></div>${typeMatchupHtml(sel.types)}<div class="hr"></div>
        <div class="stat"><span>PS</span><div class="bar"><i style="width:${bst.hp / 1.6}%;background:#58e070"></i></div><span>${bst.hp}</span></div>
        <div class="stat"><span>Ataque</span><div class="bar"><i style="width:${bst.atk / 1.4}%;background:#f0a040"></i></div><span>${bst.atk}</span></div>
        <div class="stat"><span>Defensa</span><div class="bar"><i style="width:${bst.def / 1.4}%;background:#58a0f0"></i></div><span>${bst.def}</span></div>
        <div class="stat"><span>Velocidad</span><div class="bar"><i style="width:${bst.spd / 1.5}%;background:#f070c0"></i></div><span>${bst.spd}</span></div>
        ${sel.moves && sel.moves.length ? `
          <div class="hr"></div><details><summary class="muted" style="font-size:12px;cursor:pointer">Movimientos aprendidos por nivel (${sel.moves.length})</summary>
          <div style="max-height:110px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;padding:4px 4px 0 0">
            ${sel.moves.map(([lvl, mid]) => {
              const mv = (MOVES as any)[mid];
              if (!mv) return '';
              return `<div class="row" style="justify-content:space-between;background:#0002;padding:2px 6px;border-radius:3px;font-size:11px">
                <span><b class="gold">Nv.${lvl}</b> ${esc(mv.name)}</span>
                <div class="row" style="gap:4px">
                  <span class="tag" style="background:${(TYPE_COLORS as any)[mv.type] || '#888'};color:#000;font-size:10px;padding:1px 4px">${(TYPE_NAMES as any)[mv.type] || mv.type}</span>
                  <span class="muted">${mv.power ? `Pot. ${mv.power}` : 'Estado'}</span>
                </div>
              </div>`;
            }).join('')}
          </div></details>
        ` : ''}
        <div class="hr"></div><div class="muted" style="font-size:12px">Familia evolutiva</div>
        <div class="row" style="flex-wrap:wrap">${fam.map(k => `<div style="text-align:center;font-size:11px;cursor:pointer" data-dx="${k}"><img class="px" src="${monURL(k, false, 1)}" style="width:40px;${d.seen[k] || d.caught[k] ? '' : 'filter:brightness(0)'}"><br>${d.seen[k] || d.caught[k] ? esc(SPECIES[k].name) : '???'}</div>`).join('<span class="muted">→</span>')}</div>
        <div class="hr"></div><div class="muted" style="font-size:12px">Hábitat · probabilidad por encuentro natural</div><div style="font-size:12px">${locs.length ? locs.map(z => {
          const table = z.spawns.some(s => s[0] === sel.key) ? z.spawns : z.water || [];
          const rates = ['day', 'night'].map(period => {
            const active = table.filter(s => !s[2] || s[2] === period);
            const total = active.reduce((n, s) => n + encounterWeight(s[0], s[1]), 0);
            const selected = active.filter(s => s[0] === sel.key).reduce((n, s) => n + encounterWeight(s[0], s[1]), 0);
            return total ? (100 * selected / total).toFixed(2) : '0.00';
          });
          return `<div class="row" style="justify-content:space-between;margin:2px 0"><span>${esc(z.name)} · ${rates[0] === rates[1] ? `${rates[0]}%` : `${rates[0]}% día / ${rates[1]}% noche`}</span><button class="btn tiny gray" data-dexroute="${z.id}" style="padding:1px 6px;font-size:10px">⌖ Ir</button></div>`;
        }).join('') : seasEntries.length ? seasEntries.map(se => `<div>${SEASON_ICONS[se.season]} <b>${SEASON_NAMES[se.season]}</b>${se.time === 'night' ? ' (noche)' : ''}: ${se.zones.map(zid => `<button class="btn tiny gray" data-dexroute="${zid}" style="padding:1px 5px;font-size:10px;margin:1px">⌖ ${esc(ZONES[zid]?.name || '')}</button>`).join(' ')}</div>`).join('') : 'Legendario errante, mítico o evento especial.'}</div>
        <div class="hr"></div><div class="row" style="justify-content:space-between;font-size:11px"><b class="gold">✦ Shiny: 1/${shinyDenominator(sel.key, S.shinyBase).toLocaleString('es-ES')}</b><span class="muted">Por aparición</span></div>` : ''}
      </div>`;
    }
    const curSeason = seasonAt(net.serverNow());
    const curSeasonKeys = new Set(SEASONAL.filter(x => x.season === curSeason).map(x => x.key));
    const search = this.dexFilter.toLowerCase().trim();
    const filteredList = [...SPECIES_LIST].filter(s => {
      const isC = !!d.caught[s.key], isS = !!(d.seen[s.key] || isC);
      if (this.dexTab === 'caught' && !isC) return false;
      if (this.dexTab === 'missing' && isC) return false;
      if (this.dexTab === 'shiny' && !d.shiny[s.key]) return false;
      if (this.dexTab === 'legend' && s.rarity !== 'legendary' && s.rarity !== 'mythic') return false;
      if (this.dexTab === 'season' && !curSeasonKeys.has(s.key)) return false;
      if (this.dexTypeFilter && !s.types.includes(this.dexTypeFilter as any)) return false;
      if (!search) return true;
      const nameMatch = isS && s.name.toLowerCase().includes(search);
      const dexMatch = String(s.dex).includes(search) || `#${String(s.dex).padStart(3, '0')}`.includes(search);
      const typeMatch = isS && s.types.some(t => TYPE_NAMES[t].toLowerCase().startsWith(search));
      return nameMatch || dexMatch || typeMatch;
    }).sort((a, b) => a.dex - b.dex);

    body.innerHTML = `<div class="row" style="gap:12px;margin-bottom:8px"><b>Vistos ${seen}</b><b class="gold">Capturados ${caught}/${SPECIES_LIST.length}</b><b>Shiny ${shiny}</b><div class="bar xp grow"><i style="width:${caught / SPECIES_LIST.length * 100}%"></i></div></div>
      <div class="row" style="gap:4px;margin-bottom:6px;flex-wrap:wrap">
        ${[['all', `Todos (${SPECIES_LIST.length})`], ['caught', `✔ Capturados (${caught})`], ['missing', `？ Faltan (${SPECIES_LIST.length - caught})`], ['shiny', `✦ Shiny (${shiny})`], ['legend', '★ Leyendas'], ['season', `${SEASON_ICONS[curSeason]} ${SEASON_NAMES[curSeason]}`]].map(([k, n]) => `<button class="btn tiny ${this.dexTab === k ? 'gold' : 'gray'}" data-dtab="${k}" style="font-size:10px;padding:2px 6px">${n}</button>`).join('')}
      </div>
      <div class="row" style="margin-bottom:6px;gap:4px">
        <input id="df" placeholder="Buscar por nombre, número o tipo…" value="${esc(this.dexFilter)}" style="flex:1;min-width:140px;padding:4px 8px;background:#10141f;color:#fff;border:1px solid #334455;border-radius:3px;font-size:12px" />
        <select id="df-type" style="background:#10141f;color:#a8e0ff;border:1px solid #334455;border-radius:3px;padding:3px 6px;font-size:11px">
          <option value="" ${!this.dexTypeFilter ? 'selected' : ''}>Todos los tipos</option>
          ${Object.entries(TYPE_NAMES).map(([k, v]) => `<option value="${k}" ${this.dexTypeFilter === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        ${(this.dexFilter || this.dexTypeFilter) ? `<button class="btn tiny gray" id="dfclear" title="Limpiar filtros" style="padding:2px 8px">✕</button>` : ''}
      </div>
      <div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div class="grid dexgrid" style="flex:1 1 420px">${filteredList.length ? filteredList.map(s => { const C = !!d.caught[s.key], V = !!d.seen[s.key]; return `<div class="card dexcell ${C ? '' : V ? 'seen' : 'unseen'} ${this.dexSel === s.key ? 'sel' : ''}" data-dx="${s.key}"><img src="${monURL(s.key, false, 2)}">#${String(s.dex).padStart(3, '0')}<br>${C || V ? esc(s.name) : '???'}${d.shiny[s.key] ? ' <span class="gold">✦</span>' : ''}</div>`; }).join('') : '<div class="card muted" style="padding:16px;text-align:center;grid-column:1/-1">No se encontraron especies coincidentes.</div>'}</div>
        <div style="flex:1 1 300px">${detail}</div>
      </div>`;
    body.querySelectorAll<HTMLElement>('[data-dx]').forEach(x => x.onclick = () => {
      this.dexSel = x.dataset.dx!;
      this.dexShiny = false;
      const sp = SPECIES[this.dexSel];
      if (sp) audio.cry(sp.dex - 1);
      else audio.play('ui');
      this.renderDex(body);
    });
    const sb = body.querySelector('#dshiny') as HTMLElement | null; if (sb) sb.onclick = () => { this.dexShiny = !this.dexShiny; audio.play('sparkle'); this.renderDex(body); };
    const dbx = body.querySelector('#dexbox') as HTMLElement | null;
    if (dbx && sel) dbx.onclick = () => {
      const m = S.mons.find(x => x.sp === sel.key);
      this.teamFilter = sel.name;
      this.teamTypeFilter = 'all';
      if (m) this.teamSel = m.uid;
      this.close('dex');
      this.open('team');
      this.rerender(['team']);
    };
    body.querySelectorAll<HTMLElement>('[data-dtab]').forEach(b => b.onclick = () => { this.dexTab = b.dataset.dtab as any; audio.play('ui'); this.renderDex(body); });
    body.querySelectorAll<HTMLElement>('[data-dexroute]').forEach(b => b.onclick = () => { markZone(this.hud, Number(b.dataset.dexroute)); this.close('dex'); });
    this.bind3D(body, () => this.renderDex(body));
    const df = body.querySelector('#df') as HTMLInputElement | null;
    if (df) {
      df.oninput = () => {
        this.dexFilter = df.value;
        clearTimeout((this as any)._df);
        (this as any)._df = setTimeout(() => {
          this.renderDex(body);
          const n = body.querySelector('#df') as HTMLInputElement;
          if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
        }, 200);
      };
      df.onkeydown = e => e.stopPropagation();
    }
    const dft = body.querySelector('#df-type') as HTMLSelectElement | null;
    if (dft) {
      dft.onchange = () => {
        this.dexTypeFilter = dft.value;
        audio.play('ui');
        this.renderDex(body);
      };
    }
    const dfc = body.querySelector('#dfclear') as HTMLElement | null;
    if (dfc) dfc.onclick = () => { this.dexFilter = ''; this.dexTypeFilter = ''; audio.play('ui'); this.renderDex(body); };
  }

  // =================================================================== MOCHILA
  renderInv(body: HTMLElement) {
    const c = S.core!;
    const inTown = ZONES[S.zone]?.kind === 'town';
    const allCats: [string, string][] = [['ball', 'Poké Balls'], ['heal', 'Curación'], ['evo', 'Evolución'], ['special', 'Especiales']];
    const cats = this.invTab === 'all' ? allCats : allCats.filter(([k]) => k === this.invTab);
    const totalEss = TYPES.reduce((s, t) => s + (c.ess[t] || 0), 0);
    const candyFams = Object.keys(FAMILIES).filter(f => (c.candies[f] || 0) > 0);
    body.innerHTML = `
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:8px">
        <div class="res" style="font-size:16px"><span><img src="${iconURL('money')}">${fmt(c.money)} ₽</span><span><img src="${iconURL('crystal')}">${fmt(c.crystals)} Cristales</span><span><img src="${iconURL('token')}">${fmt(c.tokens)} Frag.</span></div>
        <button class="btn small ${inTown ? 'gold' : 'gray'}" id="inv-shop" title="Abrir Tienda Pokémon">🛒 Abrir Tienda</button>
      </div>
      <div class="tabsbar" style="margin-bottom:8px">
        ${[['all', 'Todos'], ...allCats].map(([k, n]) => `<button class="btn small ${this.invTab === k ? 'on' : 'gray'}" data-invtab="${k}">${n}</button>`).join('')}
      </div>
      ${cats.map(([cat, name]) => `<div class="muted" style="margin:6px 0 3px;font-size:12px">${name}</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(225px,1fr))">${ITEM_LIST.filter(i => i.cat === cat).map(i => {
        const have = c.items[i.id] || 0;
        const unitSell = i.price ? Math.max(1, Math.floor(i.price * 0.5)) : 0;
        return `<div class="card row" title="${esc(i.desc)}"><img class="px" src="${iconURL(i.id)}" style="width:32px"><div class="grow"><div>${esc(i.name)} <b>x${have}</b></div><div class="muted" style="font-size:11px">${esc(i.desc)}</div></div><div class="col" style="gap:3px">${['pocion', 'superpocion', 'revivir', 'incienso'].includes(i.id) ? `<button class="btn tiny green" data-use="${i.id}" ${have > 0 ? '' : 'disabled'}>Usar</button>` : i.id === 'caramelo_raro' ? `<button class="btn tiny gold" data-rare ${have > 0 ? '' : 'disabled'}>Usar</button>` : i.cat === 'evo' ? `<button class="btn tiny purple" data-evoteam="${i.id}" title="Ver tus Pokémon que pueden evolucionar">▲ Equipo</button>` : ''}${inTown && unitSell > 0 && have > 0 ? `<button class="btn tiny gray" data-sell1="${i.id}" title="Vender 1 en el pueblo por ${unitSell} ₽">💰 +${unitSell} ₽</button>` : ''}</div></div>`;
      }).join('')}</div>`).join('')}
      <details class="card" style="margin-top:8px"><summary style="cursor:pointer;font-size:12px"><b class="gold">✨ Esencias por tipo (${fmt(totalEss)} totales)</b> <span class="muted">· Sirven para Afinidades y piedras</span></summary>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(115px,1fr));margin-top:6px">${TYPES.map(t => `<div class="card row" style="padding:3px 6px;font-size:12px"><img class="px" src="${iconURL('ess_' + t)}" style="width:20px">${TYPE_NAMES[t]} <b class="grow" style="text-align:right">${c.ess[t] || 0}</b></div>`).join('')}</div>
      </details>
      <details class="card" style="margin-top:6px"><summary style="cursor:pointer;font-size:12px"><b class="gold">🍬 Caramelos por familia (${candyFams.length} familias)</b> <span class="muted">· Suben de nivel a esa familia</span></summary>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-top:6px">${candyFams.map(f => `<div class="card row" style="padding:3px 6px;font-size:12px"><img class="px" src="${monURL(FAMILIES[f][0], false, 1)}" style="width:26px">${esc(SPECIES[FAMILIES[f][0]].name)} <b class="grow" style="text-align:right">${c.candies[f]}</b></div>`).join('') || '<div class="muted" style="font-size:12px">Aún no tienes caramelos. Transfiere Pokémon repetidos desde el Equipo.</div>'}</div>
      </details>`;
    body.querySelectorAll<HTMLElement>('[data-invtab]').forEach(b => b.onclick = () => { this.invTab = b.dataset.invtab as any; this.renderInv(body); });
    body.querySelectorAll<HTMLElement>('[data-use]').forEach(b => b.onclick = () => net.send({ t: 'use', item: b.dataset.use }));
    body.querySelectorAll<HTMLElement>('[data-sell1]').forEach(b => b.onclick = () => { net.send({ t: 'sell', item: b.dataset.sell1, qty: 1 }); audio.play('coin'); });
    body.querySelectorAll<HTMLElement>('[data-evoteam]').forEach(b => b.onclick = () => { this.teamTypeFilter = 'evo'; this.open('team'); this.rerender(['team']); });
    const shBtn = body.querySelector('#inv-shop') as HTMLElement | null;
    if (shBtn) shBtn.onclick = () => this.open('shop');
    body.querySelectorAll<HTMLElement>('[data-rare]').forEach(b => b.onclick = () => {
      const leader = S.mons[0];
      if (leader) net.send({ t: 'use', item: 'caramelo_raro', uid: leader.uid });
      else this.open('team');
    });
  }

  // =================================================================== MEJORAS
  renderUpg(body: HTMLElement) {
    const c = S.core!;
    const have = (cur: string) => cur === 'money' ? c.money : cur === 'crystals' ? c.crystals : (c.ess[cur] || 0);
    const list = UPGRADES.filter(u => u.group === this.upgTab);
    const affordable = list.filter(u => { const l = c.upgrades[u.id] || 0; return l < u.max && have(u.cur) >= upgradeCost(u, l); }).sort((a, b) => upgradeCost(a, c.upgrades[a.id] || 0) - upgradeCost(b, c.upgrades[b.id] || 0));
    const med = (c.medals || []).length;
    const u = c.upgrades;
    body.innerHTML = `<div class="card row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px;font-size:11px;justify-content:space-between">
        <div><b class="gold">Bonificaciones activas:</b> Daño <b>+${(u.dmg || 0) * 10 + med * 4}%</b> · PS <b>+${(u.hp || 0) * 10}%</b> · Vel. <b>+${(u.aspd || 0) * 5}%</b> · EXP <b>+${(u.xp || 0) * 8 + med * 3}%</b> · Captura <b>+${Math.round(CATCH_BONUS(u.catch || 0) * 100)}%</b> · Botín <b>+${(u.luck || 0) * 10}%</b> · Crítico <b>+${(u.crit || 0) * 2}%</b></div>
        ${affordable.length ? `<button class="btn tiny gold" id="ubest" title="Mejorar ${esc(affordable[0].name)} (${fmt(upgradeCost(affordable[0], u[affordable[0].id] || 0))})">⚡ Mejorar: ${esc(affordable[0].name)}</button>` : ''}
      </div>
      <div class="tabsbar">${[['core', 'Entrenamiento'], ['auto', 'Automatización'], ['affinity', 'Afinidades de tipo']].map(([k, n]) => `<button class="btn small ${this.upgTab === k ? 'on' : 'gray'}" data-tab="${k}">${n}</button>`).join('')}
      <span class="grow"></span><span class="res"><span><img src="${iconURL('money')}">${fmt(c.money)}</span><span><img src="${iconURL('crystal')}">${fmt(c.crystals)}</span></span></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">${list.map(u => {
        const lvl = c.upgrades[u.id] || 0; const max = lvl >= u.max; const cost = upgradeCost(u, lvl); const ok = !max && have(u.cur) >= cost;
        return `<div class="card upg"><div><div class="nm">${esc(u.name)} <span class="muted">${lvl}/${u.max}</span></div><div class="muted" style="font-size:12px">${esc(u.desc)}</div><div class="ef">${u.effect(lvl)}${max ? '' : ' → ' + u.effect(lvl + 1)}</div><div class="bar xp" style="margin-top:4px;height:5px"><i style="width:${Math.min(100, lvl / u.max * 100)}%"></i></div></div>
        <div style="text-align:right">${max ? '<b class="gold">MÁX</b>' : `<div class="cost"><img src="${curIcon(u.cur)}">${fmt(cost)}</div><button class="btn small ${ok ? 'green' : 'gray'}" data-up="${u.id}" ${ok ? '' : 'disabled'}>Mejorar</button>`}</div></div>`;
      }).join('')}</div>
      <div class="muted" style="font-size:12px;margin-top:8px">Las mejoras son permanentes y se aplican a todo tu equipo. Los costes crecen exponencialmente: combina distintas mejoras para progresar más rápido.</div>`;
    body.querySelectorAll<HTMLElement>('[data-tab]').forEach(b => b.onclick = () => { this.upgTab = b.dataset.tab as any; this.renderUpg(body); });
    body.querySelectorAll<HTMLElement>('[data-up]').forEach(b => b.onclick = () => net.send({ t: 'upgrade', id: b.dataset.up }));
    const ub = body.querySelector('#ubest') as HTMLElement | null;
    if (ub && affordable[0]) ub.onclick = () => net.send({ t: 'upgrade', id: affordable[0].id });
  }

  // =================================================================== EXPEDICIONES
  renderExp(body: HTMLElement) {
    const c = S.core!;
    if (c.tlvl < 5) { body.innerHTML = `<div class="card" style="padding:20px;text-align:center">Las expediciones se desbloquean al <b class="gold">nivel 5 de entrenador</b>.<br><span class="muted">Envía Pokémon de reserva a explorar mientras juegas (o mientras estás desconectado).</span></div>`; return; }
    const slots = 1 + (c.upgrades.exp_slots || 0);
    const busy = new Set(c.expeditions.flatMap((e: any) => e.uids));
    const reserve = S.mons.filter(m => !c.team.includes(m.uid) && !busy.has(m.uid)).sort((a, b) => b.lvl - a.lvl);
    this.expPick = this.expPick.filter(u => reserve.some(m => m.uid === u));
    const now = net.serverNow();
    body.innerHTML = `<div class="row"><b>Equipos de expedición: ${c.expeditions.length}/${slots}</b><span class="muted" style="font-size:12px">(más con la mejora "Base de expediciones")</span></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));margin:6px 0">${c.expeditions.map((e: any) => {
        const d = EXPEDITIONS.find(x => x.id === e.id)!; const done = now >= e.end;
        return `<div class="card"><b>${esc(d.name)}</b><div class="row" style="margin:4px 0">${e.uids.map((u: string) => { const m = monByUid(u); return m ? `<img class="px" src="${monURL(m.sp, m.shiny, 1)}" style="width:36px" title="${esc(SPECIES[m.sp].name)} Nv.${m.lvl}">` : ''; }).join('')}</div>
          <div class="bar xp"><i style="width:${Math.min(100, (now - e.start) / (e.end - e.start) * 100)}%"></i></div>
          <div class="row" style="margin-top:4px">${done ? `<button class="btn small gold" data-claim="${e.slot}">¡Recoger recompensas!</button>` : `<span class="muted">Vuelve en <span data-left="${e.slot}">${time(e.end - now)}</span></span>`}</div></div>`;
      }).join('') || '<div class="muted">No hay expediciones en curso.</div>'}</div>
      <div class="hr"></div>
      <b>Nueva expedición</b>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));margin:6px 0">${EXPEDITIONS.map(e => `<div class="card ${this.expType === e.id ? 'sel' : ''}" data-et="${e.id}" style="cursor:pointer;${c.tlvl < e.minTrainer ? 'opacity:.45' : ''}"><b>${esc(e.name)}</b> <span class="muted">${time(e.dur * 1000)}</span><div class="muted" style="font-size:12px">${esc(e.desc)}</div>${c.tlvl < e.minTrainer ? `<div class="gold" style="font-size:12px">Nivel ${e.minTrainer}</div>` : ''}</div>`).join('')}</div>
      <div class="muted" style="font-size:12px">Elige hasta 3 Pokémon de reserva (no del equipo). Más nivel = mejores recompensas. Se calcula en el servidor aunque te desconectes.</div>
      <div class="grid boxgrid" style="margin:6px 0">${reserve.map(m => `<div class="card boxcell ${this.expPick.includes(m.uid) ? 'sel' : ''}" data-pk="${m.uid}"><img src="${monURL(m.sp, m.shiny, 1)}">${esc(SPECIES[m.sp].name)}<br><span class="muted">Nv.${m.lvl}</span></div>`).join('') || '<div class="muted">No tienes Pokémon de reserva. ¡Captura más!</div>'}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn green" id="estart" ${this.expPick.length && c.expeditions.length < slots ? '' : 'disabled'}>Enviar expedición (${this.expPick.length}/3)</button><button class="btn small gold" id="equick" ${reserve.length && c.expeditions.length < slots ? '' : 'disabled'} title="Selecciona los 3 mejores de reserva y envía la expedición actual en 1 clic">🚀 Envío rápido (3 mejores)</button><button class="btn small gray" id="eauto" ${reserve.length && c.expeditions.length < slots ? '' : 'disabled'}>⚡ Elegir 3 mejores</button>${c.expeditions.some((e: any) => now >= e.end) ? `<button class="btn small purple" id="eclaimall">🎉 Recoger listas</button>` : ''}</div>`;
    body.querySelectorAll<HTMLElement>('[data-claim]').forEach(b => b.onclick = () => net.send({ t: 'exp_claim', slot: parseInt(b.dataset.claim!, 10) }));
    body.querySelectorAll<HTMLElement>('[data-et]').forEach(b => b.onclick = () => { this.expType = b.dataset.et!; this.renderExp(body); });
    body.querySelectorAll<HTMLElement>('[data-pk]').forEach(b => b.onclick = () => { const u = b.dataset.pk!; if (this.expPick.includes(u)) this.expPick = this.expPick.filter(x => x !== u); else if (this.expPick.length < 3) this.expPick.push(u); this.renderExp(body); });
    (body.querySelector('#estart') as HTMLElement).onclick = () => { net.send({ t: 'exp_start', id: this.expType, uids: this.expPick }); this.expPick = []; };
    const equick = body.querySelector('#equick') as HTMLElement | null;
    if (equick) equick.onclick = () => { const pick = reserve.slice(0, 3).map(m => m.uid); if (pick.length) { net.send({ t: 'exp_start', id: this.expType, uids: pick }); this.expPick = []; audio.play('sparkle'); } };
    const eauto = body.querySelector('#eauto') as HTMLElement | null;
    if (eauto) eauto.onclick = () => { this.expPick = reserve.slice(0, 3).map(m => m.uid); audio.play('ui'); this.renderExp(body); };
    const eca = body.querySelector('#eclaimall') as HTMLElement | null;
    if (eca) eca.onclick = () => { c.expeditions.filter((e: any) => net.serverNow() >= e.end).forEach((e: any) => net.send({ t: 'exp_claim', slot: e.slot })); audio.play('quest'); };
  }

  // =================================================================== MAPA
  renderMap(body: HTMLElement) {
    const c = S.core!;
    const w = this.hud.world;
    const sc = this.hud.scene;
    const scale = 2;
    const cv = document.createElement('canvas'); cv.width = 400 * scale; cv.height = 400 * scale;
    const ctx = cv.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.hud.overview, 0, 0, 400, 400, 0, 0, 400 * scale, 400 * scale);
    // niebla en zonas no descubiertas
    const img = ctx.getImageData(0, 0, cv.width, cv.height);
    const disc = new Set(c.zones);
    for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) {
      const z = w.zone[y * w.w + x];
      if (disc.has(z) || ZONES[z].kind === 'ocean') continue;
      for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) { const i = ((y * scale + a) * cv.width + x * scale + b) * 4; img.data[i] *= 0.35; img.data[i + 1] *= 0.35; img.data[i + 2] *= 0.45; }
    }
    ctx.putImageData(img, 0, 0);
    // Dificultad por zona respecto a tu equipo: tinte de color y etiqueta de nivel en el centro de cada zona.
    const teamLvl = Math.max(1, ...S.team.map(t => t.lvl));
    const diff = (z: typeof ZONES[number]) => { const d = z.lvl[1] - teamLvl; return d <= -6 ? ['#5fd07a', 'Fácil'] : d <= 0 ? ['#b8e070', 'Adecuada'] : d <= 5 ? ['#f2d050', 'Exigente'] : d <= 12 ? ['#f08a40', 'Peligrosa'] : ['#f04848', 'Mortal']; };
    const sums = new Map<number, [number, number, number]>();
    for (let y = 0; y < 400; y += 2) for (let x = 0; x < 400; x += 2) { const z = w.zone[y * w.w + x]; const a = sums.get(z) || [0, 0, 0]; a[0] += x; a[1] += y; a[2]++; sums.set(z, a); }
    ctx.globalAlpha = 0.16;
    for (let y = 0; y < 400; y += 2) for (let x = 0; x < 400; x += 2) {
      const z = ZONES[w.zone[y * w.w + x]]; if (!z || z.kind !== 'wild' || !disc.has(z.id)) continue;
      ctx.fillStyle = diff(z)[0]; ctx.fillRect(x * scale, y * scale, 2 * scale, 2 * scale);
    }
    ctx.globalAlpha = 1;
    const pct = (x: number, y: number) => `left:${x / 400 * 100}%;top:${y / 400 * 100}%`;
    const marks: string[] = [];
    for (const z of ZONES) {
      const a = sums.get(z.id); if (!a || z.kind !== 'wild' || a[2] < 30) continue;
      const known = disc.has(z.id);
      marks.push(`<div class="zone-chip" style="${pct(a[0] / a[2], a[1] / a[2] + 6)};background:${known ? diff(z)[0] : '#8a8a8a'}" title="${known ? esc(z.name) + ' · ' + diff(z)[1] : 'Zona sin descubrir'}" data-zone="${z.id}">Nv ${z.lvl[0]}-${z.lvl[1]}</div>`);
    }
    for (const t of w.towns) {
      const known = c.towns.includes(t.id);
      marks.push(`<div class="wm-mark" style="${pct(t.x + t.w / 2, t.y + t.h / 2)}" data-town="${t.id}" title="${known ? 'Clic para viajar' : 'Visita su Centro Pokémon para desbloquear el viaje'}"><i style="background:${known ? '#ffe060' : '#888'}"></i>${esc(t.name)}${known ? ' ✈' : ''}</div>`);
    }
    for (const b of S.bosses) { if (b.x >= 400) continue; marks.push(`<div class="wm-mark" style="${pct(b.x, b.y)};color:${b.alive ? '#ff7070' : '#aaa'}" title="${esc(b.name)} Nv.${b.lvl}"><i style="background:${b.alive ? '#e03030' : '#555'}"></i>${esc(b.name)}${b.alive ? '' : ' (' + time(b.respawn) + ')'}</div>`); }
    for (const d of DUNGEON_DEFS) marks.push(`<div class="wm-mark" style="${pct(d.outside.x, d.outside.y - 3)};color:#c8b0ff" title="Mazmorra: ${esc(d.name)} (nivel ${d.minLevel}+)"><i style="background:#8050c0"></i>${esc(d.name)}</div>`);
    for (const g of GYMS) { const gt = w.towns.find(t => t.id === g.town); if (gt) marks.push(`<div class="wm-mark" style="${pct(gt.x + gt.w / 2, gt.y - 3)};color:#ffe880" title="Gimnasio: ${esc(g.leader)} (${esc(g.medal)})"><i style="background:${g.color}"></i>★ ${esc(g.leader)}</div>`); }
    for (const e of S.events.values()) if (e.x && e.x < 400) marks.push(`<div class="wm-mark" style="${pct(e.x, e.y)};color:#ffd040"><i style="background:#ffd040"></i>${esc(e.name)}</div>`);
    for (const m of S.party.members) if (m.id !== S.myId) marks.push(`<div class="wm-mark" style="${pct(m.x, m.y)};color:#60f0ff"><i style="background:#60f0ff"></i>${esc(m.n)}</div>`);
    if (sc && sc.me.x < 400) marks.push(`<div class="wm-mark" style="${pct(sc.me.x, sc.me.y)};color:#fff"><i style="background:#fff;border-color:#f00"></i>TÚ</div>`);
    const qMap = this.mapFilter.toLowerCase().trim();
    const zoneRows = ZONES.filter(z => z.kind === 'wild' || z.kind === 'dungeon').filter(z => {
      if (!qMap) return true;
      if (z.name.toLowerCase().includes(qMap)) return true;
      const sp = [...new Set([...z.spawns.map(s => s[0]), ...(z.water || []).map(s => s[0])])];
      return sp.some(k => SPECIES[k]?.name.toLowerCase().includes(qMap) || SPECIES[k]?.types.some(t => TYPE_NAMES[t].toLowerCase().startsWith(qMap)));
    }).map(z => {
      const known = c.zones.includes(z.id);
      const sp = [...new Set([...z.spawns.map(s => s[0]), ...(z.water || []).map(s => s[0])])];
      const got = sp.filter(k => (c.dex.caught[k] || 0) > 0).length;
      const [dc, dn] = diff(z);
      const icons = sp.map(k => { const seen = (c.dex.seen[k] || 0) > 0; const night = z.spawns.some(e => e[0] === k && e[2] === 'night'); return `<div class="zm" title="${seen ? esc(SPECIES[k].name) : '???'}${night ? ' (de noche)' : ''}">${seen ? `<img src="${monURL(k, false, 1)}" alt="">` : '<b style="width:32px;text-align:center">?</b>'}<span>${seen ? esc(SPECIES[k].name) : '???'}${night ? ' ☾' : ''}${(c.dex.caught[k] || 0) > 0 ? ' ✔' : ''}</span></div>`; }).join('');
      const zw = weatherAt(z.id, net.serverNow(), z.kind);
      return `<details class="card" ${qMap ? 'open' : ''} style="font-size:13px;${known ? '' : 'opacity:.65'}"><summary class="row" style="cursor:pointer"><b class="grow">${known ? esc(z.name) : 'Zona sin descubrir'} ${known ? `<span class="muted" style="font-weight:400;font-size:11px">${WEATHER_ICONS[zw]} ${WEATHER_NAMES[zw]}</span>` : ''}</b><span style="color:${dc}">Nv.${z.lvl[0]}-${z.lvl[1]} · ${dn}</span><span>${got}/${sp.length}</span><button class="btn tiny" data-route="${z.id}" title="Marcar dirección hacia ${esc(z.name)}">Ir ↗</button></summary>${known ? `<div class="zone-info">${icons}</div>` : '<div class="muted" style="margin-top:6px">Descúbrela para ver qué Pokémon viven aquí.</div>'}</details>`;
    }).join('');
    if (S.waypoint && S.waypoint.x < 400) marks.push(`<div class="wm-mark" style="${pct(S.waypoint.x, S.waypoint.y)};color:#ffe5a4">◎ ${esc(S.waypoint.name)}</div>`);
    if (S.route && S.route.length > 1 && S.route[0].x < 400) {
      const pts = S.route.filter((_, i) => i % 3 === 0 || i === S.route!.length - 1).map(p => `${(p.x / 4).toFixed(2)},${(p.y / 4).toFixed(2)}`).join(' ');
      marks.push(`<svg class="wm-route" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#2a1a00" stroke-opacity=".7" stroke-width="1.3" vector-effect="non-scaling-stroke" style="stroke-width:5px"/><polyline points="${pts}" fill="none" stroke="#ffd860" stroke-dasharray="6 4" vector-effect="non-scaling-stroke" style="stroke-width:2.5px"/></svg>`);
      marks.push(`<div class="wm-mark" style="${pct(S.waypoint!.x, S.waypoint!.y)};color:#ffd860;transform:translate(-50%,-140%)">📍 ${Math.round(S.routeLen)} m</div>`);
    }
    const lastTown = c.towns.length ? w.towns.find(t => t.id === c.towns[c.towns.length - 1]) : null;
    const bossRows = S.bosses.filter(b => b.x < 400).map((b, idx) => {
      const spKey = b.sp || Object.keys(SPECIES).find(k => (b.name || '').toLowerCase().includes(SPECIES[k].name.toLowerCase())) || 'snorlax';
      return `<div class="row" style="font-size:11px;padding:2px 4px;background:#ffffff06;border-radius:4px;gap:5px"><img class="px" src="${monURL(spKey, false, 1)}" style="width:22px;height:22px"><b class="grow">${esc(b.name)} <span class="muted">Nv.${b.lvl}</span></b><span style="color:${b.alive ? '#68e888' : '#aaa'}">${b.alive ? '● Vivo' : '⏳ ' + time(b.respawn)}</span><button class="btn tiny" data-boss="${idx}" style="padding:1px 5px;font-size:10px" title="Marcar rumbo hacia ${esc(b.name)}">⌖ Ir</button></div>`;
    }).join('');
    body.innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:wrap;margin-bottom:4px"><p class="map-tip" style="margin:0">Clic en el mapa: marcar destino · Centros registrados: viaje rápido · La brújula indica la dirección.</p><div class="row" style="gap:6px">${lastTown ? `<button class="btn tiny gold" id="mfast" title="Viaje rápido a ${esc(lastTown.name)}">✈ ${esc(lastTown.name)}</button>` : ''}<span class="tag" style="background:#25324c;color:#ffe5a4;font-size:11px">${SEASON_ICONS[seasonAt(net.serverNow())]} Estación: ${SEASON_NAMES[seasonAt(net.serverNow())]} (${time(seasonLeft(net.serverNow()))})</span></div></div>
      <div class="zone-legend"><span>Dificultad para tu equipo (Nv.${teamLvl}):</span><span><i style="background:#5fd07a"></i>Fácil</span><span><i style="background:#b8e070"></i>Adecuada</span><span><i style="background:#f2d050"></i>Exigente</span><span><i style="background:#f08a40"></i>Peligrosa</span><span><i style="background:#f04848"></i>Mortal</span></div><div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap"><div class="worldmap" style="flex:1 1 520px;max-width:620px"></div><div style="flex:1 1 280px" class="col">${bossRows ? `<details class="card" style="margin-bottom:4px"><summary class="row" style="cursor:pointer;font-size:12px"><b class="gold grow">☠ Jefes de Mundo (${S.bosses.filter(b => b.x < 400 && b.alive).length}/${S.bosses.filter(b => b.x < 400).length} vivos)</b></summary><div class="col" style="gap:3px;margin-top:5px">${bossRows}</div></details>` : ''}<b>Progreso regional</b><div class="row" style="margin:2px 0"><input id="mapf" placeholder="🔍 Filtrar por Pokémon, tipo o ruta…" value="${esc(this.mapFilter)}" style="flex:1;padding:4px 7px;background:#10141f;color:#fff;border:1px solid #334;border-radius:3px;font-size:11px" /></div>${zoneRows || '<div class="muted" style="font-size:12px;padding:8px 0">Ninguna zona coincide con tu búsqueda.</div>'}</div></div>`;
    const wm = body.querySelector('.worldmap') as HTMLElement;
    wm.appendChild(cv); wm.insertAdjacentHTML('beforeend', marks.join(''));
    cv.onclick = e => {
      const rect = cv.getBoundingClientRect(), x = Math.floor((e.clientX - rect.left) / rect.width * 400) + 0.5, y = Math.floor((e.clientY - rect.top) / rect.height * 400) + 0.5;
      if (playerBlocked(w, x, y)) { this.hud.toast('Elige un punto de tierra despejado.', 'info'); return; }
      S.waypoint = { x, y, name: ZONES[w.zone[Math.floor(y) * w.w + Math.floor(x)]].name };
      this.close('map');
    };
    const mf = body.querySelector('#mapf') as HTMLInputElement | null;
    if (mf) {
      mf.oninput = () => {
        this.mapFilter = mf.value;
        clearTimeout((this as any)._mf);
        (this as any)._mf = setTimeout(() => {
          this.renderMap(body);
          const n = body.querySelector('#mapf') as HTMLInputElement;
          if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
        }, 200);
      };
      mf.onkeydown = e => e.stopPropagation();
    }
    const mfast = body.querySelector('#mfast') as HTMLElement | null;
    if (mfast && lastTown) mfast.onclick = () => { net.send({ t: 'travel', town: lastTown.id }); this.close('map'); };
    const overworldBosses = S.bosses.filter(b => b.x < 400);
    body.querySelectorAll<HTMLElement>('[data-boss]').forEach(btn => btn.onclick = e => {
      e.preventDefault();
      const b = overworldBosses[Number(btn.dataset.boss)];
      if (b) { S.waypoint = { x: b.x, y: b.y, name: `☠ ${b.name} (Nv.${b.lvl})` }; audio.play('ui'); this.close('map'); }
    });
    body.querySelectorAll<HTMLElement>('[data-route]').forEach(b => b.onclick = e => { e.preventDefault(); markZone(this.hud, Number(b.dataset.route)); this.close('map'); });
    wm.querySelectorAll<HTMLElement>('[data-zone]').forEach(m => m.onclick = () => { markZone(this.hud, Number(m.dataset.zone)); this.close('map'); });
    wm.querySelectorAll<HTMLElement>('[data-town]').forEach(m => m.onclick = () => {
      const id = parseInt(m.dataset.town!, 10);
      if (!c.towns.includes(id)) { const town = w.towns.find(t => t.id === id)!; S.waypoint = { x: town.heal.x + 0.5, y: town.heal.y + 0.5, name: town.name }; this.close('map'); return; }
      net.send({ t: 'travel', town: id }); this.close('map');
    });
  }

  // =================================================================== MISIONES
  renderQuests(body: HTMLElement) {
    const c = S.core!;
    const firstOpen = QUESTS.findIndex(q => !c.claimed.includes(q.id));
    const readyQ = QUESTS.filter(q => !c.claimed.includes(q.id) && statValueClient(q.stat) >= q.n);
    const readyB = (c.bounties || []).filter((b: any) => b.prog >= b.n);
    const scale = 1 + c.tlvl / 10;
    const dailyTable = [
      { d: 1, r: `${Math.round(300 * scale)} ₽ · Poké Ball x5` },
      { d: 2, r: `${Math.round(500 * scale)} ₽ · Poción x3` },
      { d: 3, r: `3 Cristales · Super Ball x3` },
      { d: 4, r: `${Math.round(800 * scale)} ₽ · Revivir x1` },
      { d: 5, r: `5 Cristales · Ultra Ball x2` },
      { d: 6, r: `${Math.round(1000 * scale)} ₽ · Caramelo Raro x1` },
      { d: 7, r: `10 Cristales · 2 Frag. · Incienso x1` },
    ];
    const curDay = S.daily?.day || 1;
    const curStreak = S.daily?.streak || 1;
    const dexCaught = SPECIES_LIST.filter(s => c.dex.caught[s.key]).length;
    const trophies = [
      { icon: '📖', name: 'Erudito de Kanto', unit: 'esp.', v: dexCaught, tiers: [10, 25, 50, SPECIES_LIST.length] },
      { icon: '✦', name: 'Cazador Variocolor', unit: 'shinies', v: c.stats.shinies || 0, tiers: [1, 3, 5, 10] },
      { icon: '☠', name: 'Verdugo de Titanes', unit: 'jefes', v: c.stats.bosses || 0, tiers: [1, 5, 15, 30] },
      { icon: '★', name: 'Campeón de Gimnasios', unit: 'medallas', v: (c.medals || []).length, tiers: [1, 3, 5, 6] },
      { icon: '🧭', name: 'Trotamundos', unit: 'zonas', v: c.zones.length, tiers: [5, 10, 15, 20] },
      { icon: '💰', name: 'Magnate Pokémon', unit: '₽', v: c.money || 0, tiers: [2500, 10000, 50000, 150000] },
    ];
    const tierMeta = [
      { label: 'Sin rango', color: '#667' },
      { label: '🥉 Bronce', color: '#cd7f32' },
      { label: '🥈 Plata', color: '#c0c8d8' },
      { label: '🥇 Oro', color: '#ffd866' },
      { label: '💎 Platino', color: '#60f0ff' },
    ];
    body.innerHTML = `<details class="card" style="margin-bottom:8px;padding:6px 10px">
        <summary class="row" style="justify-content:space-between;cursor:pointer"><b class="gold" style="font-size:12px">🎁 Calendario de Recompensa Diaria (7 Días)</b><span class="tag" style="background:#3a2810;color:#ffd866;font-size:11px">🔥 Racha: ${curStreak}d (Día ${curDay}/7)</span></summary>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:5px;margin-top:6px">${dailyTable.map(x => `<div class="card" style="padding:5px 7px;font-size:11px;border-color:${x.d === curDay ? '#ffd866' : x.d < curDay ? '#48a868' : '#2a3042'};background:${x.d === curDay ? '#2e2412' : '#141824'}"><div class="row" style="justify-content:space-between"><b class="${x.d === curDay ? 'gold' : ''}">Día ${x.d}</b><span>${x.d < curDay ? '✔' : x.d === curDay ? '★ Hoy' : ''}</span></div><div class="muted" style="font-size:10px;margin-top:2px">${esc(x.r)}</div></div>`).join('')}</div>
      </details>
      <div class="row" style="justify-content:space-between"><b>Misiones principales (${c.claimed.length}/${QUESTS.length})</b>${readyQ.length + readyB.length > 0 ? `<button class="btn small gold" id="qclaimall">🎉 Cobrar todas (${readyQ.length + readyB.length})</button>` : ''}</div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin:6px 0">${QUESTS.map((q, i) => {
        const claimed = c.claimed.includes(q.id); const v = statValueClient(q.stat); const done = v >= q.n;
        const locked = !claimed && i > firstOpen + 2;
        const r = q.reward; const rw = [r.money ? `${r.money} ₽` : '', r.crystals ? `${r.crystals} cristales` : '', r.txp ? `${r.txp} EXP` : '', ...(r.items ? Object.entries(r.items).map(([k, n]) => `${ITEMS[k].name} x${n}`) : [])].filter(Boolean).join(', ');
        return `<div class="card" style="${locked ? 'opacity:.4' : ''}"><div class="row"><b class="grow">${claimed ? '✔ ' : ''}${esc(q.name)}</b>${done && !claimed ? `<button class="btn tiny green" data-q="${q.id}">Cobrar</button>` : ''}</div><div style="font-size:12px">${locked ? '???' : esc(q.desc)}</div><div class="bar xp" style="margin:4px 0"><i style="width:${claimed ? 100 : Math.min(100, v / q.n * 100)}%"></i></div><div class="muted" style="font-size:11px">${Math.min(v, q.n)}/${q.n} · ${esc(rw)}</div></div>`;
      }).join('')}</div>
      <b>Encargos repetibles</b>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));margin:6px 0">${(c.bounties || []).map((b: any) => `<div class="card"><div class="row"><b class="grow">⚑ ${esc(b.desc)}</b>${b.prog >= b.n ? `<button class="btn tiny green" data-b="${b.id}">Cobrar</button>` : ''}</div><div class="bar xp" style="margin:4px 0"><i style="width:${Math.min(100, b.prog / b.n * 100)}%"></i></div><div class="muted" style="font-size:11px">${Math.min(b.prog, b.n)}/${b.n} · ${b.reward.money} ₽, ${b.reward.crystals} cristales, ${b.reward.txp} EXP</div></div>`).join('')}</div>
      <details class="card" open style="margin-top:6px"><summary style="cursor:pointer;font-size:12px"><b class="gold">🏅 Trofeos de Coleccionista y Estadísticas</b></summary>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr));margin:6px 0">${trophies.map(t => {
          let rank = 0;
          for (let i = 0; i < t.tiers.length; i++) if (t.v >= t.tiers[i]) rank = i + 1;
          const nextGoal = t.tiers[Math.min(rank, t.tiers.length - 1)];
          const tm = tierMeta[rank];
          return `<div class="card" style="padding:5px 8px;border-color:${rank >= 3 ? tm.color + '66' : ''}"><div class="row"><b class="grow" style="font-size:12px">${t.icon} ${esc(t.name)}</b><span style="color:${tm.color};font-size:10px;font-weight:700">${tm.label}</span></div><div class="bar xp" style="margin:3px 0"><i style="width:${Math.min(100, t.v / nextGoal * 100)}%;background:${tm.color}"></i></div><div class="muted" style="font-size:10px">${fmt(t.v)} / ${fmt(nextGoal)} ${t.unit}</div></div>`;
        }).join('')}</div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));margin-top:6px;font-size:12px">${[['Derrotados', c.stats.kills], ['Capturas', c.stats.catches], ['Evoluciones', c.stats.evolves], ['Jefes', c.stats.bosses], ['Eventos', c.stats.events], ['Cofres', c.stats.chests], ['Expediciones', c.stats.expeditions], ['Shinies', c.stats.shinies], ['Zonas', c.zones.length], ['Debilitado', c.stats.deaths], ['Golpe Máx.', (S as any)._maxHit || 0], ['Daño Sesión', (S as any)._totalDmg || 0]].map(([n, v]) => `<div class="card row" style="padding:3px 7px"><span class="grow">${n}</span><b>${fmt(v as number || 0)}</b></div>`).join('')}</div>
      </details>`;
    body.querySelectorAll<HTMLElement>('[data-q]').forEach(b => b.onclick = () => { net.send({ t: 'quest', id: b.dataset.q }); audio.play('quest'); });
    body.querySelectorAll<HTMLElement>('[data-b]').forEach(b => b.onclick = () => { net.send({ t: 'bounty', id: b.dataset.b }); audio.play('quest'); });
    const qca = body.querySelector('#qclaimall') as HTMLElement | null;
    if (qca) qca.onclick = () => {
      readyQ.forEach(q => net.send({ t: 'quest', id: q.id }));
      readyB.forEach((b: any) => net.send({ t: 'bounty', id: b.id }));
      audio.play('quest');
    };
  }

  // =================================================================== SOCIAL
  showInspect(m: any) { this.inspect = m; this.socialTab = 'players'; this.open('social'); this.rerender(['social']); }

  renderSocial(body: HTMLElement) {
    const players = [...S.players.values()].sort((a, b) => b.lv - a.lv);
    const party = S.party;
    const tabs = `<div class="tabsbar" style="margin-bottom:8px">
      ${[['players', `👥 Jugadores (${players.length})`], ['rank', '🏆 Salón de la Fama'], ['pvp', '⚔ Top Duelos PvP']].map(([k, n]) => `<button class="btn small ${this.socialTab === k ? 'on' : 'gray'}" data-stab="${k}">${n}</button>`).join('')}
      <span class="grow"></span><span class="gold" style="font-size:12px">Tu Elo: ${S.core?.pvp?.elo ?? 1000} (${S.core?.pvp?.w ?? 0}V/${S.core?.pvp?.l ?? 0}D)</span>
    </div>`;
    if (this.socialTab === 'rank') {
      if (!S.rank) net.send({ t: 'rank' });
      const cats: [string, string, string][] = [['nivel', '⭐ Nivel', 'Nv.'], ['pokedex', '▣ Pokédex', 'esp.'], ['medallas', '★ Medallas', 'med.'], ['jefes', '☠ Jefes', 'jefes'], ['shinies', '✦ Shinies', '✦'], ['derrotas', '⚔ Victorias', 'vict.']];
      const rows = S.rank?.[this.rankCat] || [];
      const unit = cats.find(x => x[0] === this.rankCat)?.[2] || '';
      body.innerHTML = `${tabs}
        <div class="row" style="gap:4px;margin-bottom:8px;flex-wrap:wrap">
          ${cats.map(([k, n]) => `<button class="btn tiny ${this.rankCat === k ? 'gold' : 'gray'}" data-rcat="${k}">${n}</button>`).join('')}
          <span class="grow"></span><button class="btn tiny gray" id="rrefresh">🔄 Actualizar</button>
        </div>
        <div class="col" style="gap:4px">${rows.length ? rows.map((r, i) => `<div class="card row" style="border-color:${r.n === S.core?.name ? '#ffd866' : ''}"><b style="width:28px;color:${i === 0 ? '#ffd866' : i === 1 ? '#d0d8e8' : i === 2 ? '#e09860' : '#889'}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</b><b class="grow">${esc(r.n)} ${r.n === S.core?.name ? '<span class="gold">(tú)</span>' : ''}</b><span class="gold">${fmt(r.v)} ${unit}</span></div>`).join('') : '<div class="card muted" style="padding:16px;text-align:center">Cargando clasificación del servidor...</div>'}</div>`;
      body.querySelectorAll<HTMLElement>('[data-stab]').forEach(b => b.onclick = () => { this.socialTab = b.dataset.stab as any; this.renderSocial(body); });
      body.querySelectorAll<HTMLElement>('[data-rcat]').forEach(b => b.onclick = () => { this.rankCat = b.dataset.rcat as any; this.renderSocial(body); });
      const rr = body.querySelector('#rrefresh') as HTMLElement | null; if (rr) rr.onclick = () => net.send({ t: 'rank' });
      return;
    }
    if (this.socialTab === 'pvp') {
      net.send({ t: 'duel_top' });
      const list = S.duelTop || [];
      body.innerHTML = `${tabs}
        <div class="col" style="gap:4px">${list.length ? list.map((r, i) => `<div class="card row"><b style="width:28px">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</b><b class="grow">${esc(r.n)} ${r.n === S.core?.name ? '<span class="gold">(tú)</span>' : ''}</b><span class="muted" style="font-size:12px">${r.w} V · ${r.l} D</span><b class="gold">Elo ${r.elo}</b></div>`).join('') : '<div class="card muted" style="padding:16px;text-align:center">No hay entrenadores en la tabla PvP ahora mismo.</div>'}</div>`;
      body.querySelectorAll<HTMLElement>('[data-stab]').forEach(b => b.onclick = () => { this.socialTab = b.dataset.stab as any; this.renderSocial(body); });
      return;
    }
    body.innerHTML = `${tabs}<div class="row" style="align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div style="flex:1 1 360px"><div class="card" style="margin-bottom:8px"><b class="gold">👥 Juega con amigos (grupos de hasta 4)</b><div class="muted" style="font-size:12px;margin:3px 0 6px">Pásales tu enlace: entran desde cualquier PC o móvil sin descargar nada y te llega su solicitud para unirse a tu grupo. En grupo compartís EXP, dinero y recompensas de jefes.</div><button class="btn small green" id="invlink">🔗 Copiar enlace de invitación</button></div><b>Jugadores conectados (${players.length})</b>
        <div class="col" style="margin-top:6px">${players.map(p => `<div class="card row"><img class="px" src="${trainerURL(p.look, 2)}" style="width:32px;height:48px"><div class="grow"><div>${esc(p.n)} ${p.id === S.myId ? '<span class="gold">(tú)</span>' : ''}${party.id && p.party === party.id ? ' <span style="color:#60f0ff">[grupo]</span>' : ''}</div><div class="muted" style="font-size:12px">Nivel ${p.lv} · ${esc(ZONES[p.z]?.name || '')}</div></div>
          ${p.id !== S.myId ? `<button class="btn tiny red" data-duel="${p.id}" title="Retar a un duelo PvP (debe estar cerca)">⚔ Retar</button><button class="btn tiny gold" data-trade="${p.id}" title="Solicitar intercambio de Pokémon (debe estar cerca)">⇄ Intercambiar</button><button class="btn tiny" data-insp="${p.id}">Ver equipo</button>${!(party.id && p.party === party.id) ? `<button class="btn tiny green" data-inv="${p.id}">Invitar</button>` : ''}` : ''}</div>`).join('')}</div>
      </div>
      <div style="flex:1 1 300px"><b>Grupo ${party.id ? `(${party.members.length}/4)` : ''}</b>
        ${party.id ? `<div class="col" style="margin-top:6px">${party.members.map((m: any) => `<div class="card"><div class="row"><b class="grow">${esc(m.n)}</b><span class="muted">Nv.${m.lv}</span></div><div class="bar hp"><i style="width:${m.hp}%"></i></div><div class="muted" style="font-size:12px">${esc(ZONES[m.z]?.name || '')}</div></div>`).join('')}<button class="btn small red" id="pleave">Salir del grupo</button></div>
          <div class="muted" style="font-size:12px;margin-top:6px">En grupo compartís experiencia y dinero de los Pokémon derrotados cerca (75%) y las recompensas de jefes. Chat de grupo: pestaña "Grupo".</div>`
        : '<div class="muted" style="font-size:13px;margin-top:6px">No estás en un grupo. Invita a otros jugadores (máx. 4) para cazar jefes juntos y compartir experiencia.</div>'}
        ${this.inspect ? `<div class="hr"></div><b>Equipo de ${esc(this.inspect.name)} (Nv.${this.inspect.lvl})</b>
          <div class="grid" style="grid-template-columns:repeat(3,1fr);margin:6px 0">${this.inspect.team.map((m: any) => `<div class="card" style="text-align:center;font-size:12px"><img class="px" src="${monURL(m.sp, m.shiny, 1)}" style="width:48px"><br>${m.shiny ? '✦' : ''}${esc(SPECIES[m.sp].name)} Nv.${m.lvl}</div>`).join('')}</div>
          <div class="muted" style="font-size:12px">Pokédex ${this.inspect.dex} · Jefes ${this.inspect.bosses} · Derrotados ${fmt(this.inspect.kills)}${this.inspect.links.length ? ' · Links: ' + this.inspect.links.map((l: string) => LINK_MAP[l]?.name).join(', ') : ''}</div>` : ''}
      </div></div>`;
    body.querySelectorAll<HTMLElement>('[data-stab]').forEach(b => b.onclick = () => { this.socialTab = b.dataset.stab as any; this.renderSocial(body); });
    body.querySelectorAll<HTMLElement>('[data-insp]').forEach(b => b.onclick = () => net.send({ t: 'inspect', id: parseInt(b.dataset.insp!, 10) }));
    body.querySelectorAll<HTMLElement>('[data-inv]').forEach(b => b.onclick = () => net.send({ t: 'invite', id: parseInt(b.dataset.inv!, 10) }));
    body.querySelectorAll<HTMLElement>('[data-duel]').forEach(b => b.onclick = () => net.send({ t: 'duel_req', id: parseInt(b.dataset.duel!, 10) }));
    body.querySelectorAll<HTMLElement>('[data-trade]').forEach(b => b.onclick = () => net.send({ t: 'trade_req', id: parseInt(b.dataset.trade!, 10) }));
    const pl = body.querySelector('#pleave') as HTMLElement | null; if (pl) pl.onclick = () => net.send({ t: 'leave' });
    const il = body.querySelector('#invlink') as HTMLElement | null;
    if (il) il.onclick = async () => {
      const cfg = await fetch('/config.json').then(r => r.json()).catch(() => ({}));
      const base = cfg.cloud && /^https?:/.test(cfg.cloud) ? cfg.cloud + '/jugar' : location.origin + '/';
      const link = `${base}?amigo=${encodeURIComponent(S.core?.name || '')}`;
      try { await navigator.clipboard.writeText(link); this.hud.toast('Enlace copiado: ' + link, 'good'); } catch { prompt('Copia tu enlace de invitación:', link); }
    };
  }

  // =================================================================== INTERCAMBIO
  renderTrade(body: HTMLElement) {
    const t = S.trade, c = S.core;
    if (!t || !c) { body.innerHTML = `<div class="card muted" style="padding:20px;text-align:center">No hay ningún intercambio activo.</div>`; return; }
    const me = t.me, them = t.them;
    const busy = new Set(c.expeditions.flatMap((e: any) => e.uids));
    const avail = S.mons.filter(m => !busy.has(m.uid));
    const tradeEvos: Record<string, string> = { kadabra: 'Alakazam', graveler: 'Golem', haunter: 'Gengar', machoke: 'Machamp' };
    const monCard = (m: any) => {
      const sp = SPECIES[m.sp];
      const ivPct = Math.round((m.iv[0] + m.iv[1] + m.iv[2] + m.iv[3]) / 124 * 100);
      return `<div class="card row" style="padding:4px 8px;gap:6px"><img class="px" src="${monURL(m.sp, m.shiny, 1)}" style="width:36px;height:36px"><div class="grow" style="font-size:12px"><b>${m.shiny ? '✦ ' : ''}${esc(m.nick || sp.name)}</b> <span class="muted">Nv.${m.lvl} · ${ivPct}% IV</span>${tradeEvos[m.sp] ? `<div class="gold" style="font-size:10px">⚡ Evoluciona a ${tradeEvos[m.sp]}</div>` : ''}</div></div>`;
    };
    body.innerHTML = `<div class="row" style="align-items:stretch;gap:12px;flex-wrap:wrap">
      <div class="card" style="flex:1 1 260px;border-color:${me.ready ? '#58e070' : ''}">
        <div class="row" style="justify-content:space-between"><b>Tu oferta (${me.uids.length}/6)</b><span class="${me.ready ? 'gold' : 'muted'}" style="font-size:12px">${me.ready ? '✔ LISTO' : 'Eligiendo...'}</span></div>
        <div class="col" style="gap:4px;margin:6px 0;min-height:90px">${me.mons.length ? me.mons.map(monCard).join('') : '<div class="muted" style="font-size:12px;padding:12px 0;text-align:center">Haz clic en tus Pokémon de abajo para añadirlos a la oferta.</div>'}</div>
        <div class="row" style="gap:6px"><span style="font-size:12px">Pokédólares:</span><input id="tmoney" type="number" min="0" max="${c.money}" value="${me.money}" style="width:100px;padding:3px 6px;background:#10141f;color:#fff;border:1px solid #445;border-radius:3px" /><button class="btn tiny gray" id="tsetm">Fijar ₽</button></div>
      </div>
      <div class="card" style="flex:1 1 260px;border-color:${them.ready ? '#58e070' : ''}">
        <div class="row" style="justify-content:space-between"><b>Oferta de ${esc(them.name)} (${them.uids.length}/6)</b><span class="${them.ready ? 'gold' : 'muted'}" style="font-size:12px">${them.ready ? '✔ LISTO' : 'Eligiendo...'}</span></div>
        <div class="col" style="gap:4px;margin:6px 0;min-height:90px">${them.mons.length ? them.mons.map(monCard).join('') : '<div class="muted" style="font-size:12px;padding:12px 0;text-align:center">Sin Pokémon ofrecidos.</div>'}</div>
        <div style="font-size:13px">Pokédólares ofrecidos: <b class="gold">${fmt(them.money)} ₽</b></div>
      </div>
    </div>
    <div class="muted" style="font-size:12px;margin:6px 0 4px">Selecciona hasta 6 Pokémon para ofrecer (Kadabra, Graveler, Haunter y Machoke evolucionan al instante al intercambiarse):</div>
    <div class="grid boxgrid" style="max-height:175px;overflow-y:auto">${avail.map(m => { const sel = me.uids.includes(m.uid); const sp = SPECIES[m.sp]; return `<div class="card boxcell ${sel ? 'sel' : ''}" data-tpk="${m.uid}">${m.shiny ? '<span class="s">✦</span>' : ''}<img src="${monURL(m.sp, m.shiny, 1)}">${esc(m.nick || sp.name)}<br><span class="muted">Nv.${m.lvl}</span></div>`; }).join('')}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px">
      <button class="btn small red" id="tcancel">✕ Cancelar intercambio</button>
      <button class="btn ${me.ready ? 'gray' : 'green'}" id="tready">${t.lock ? '⏳ Confirmando en 3 s...' : me.ready ? 'Quitar confirmación' : '✔ Confirmar intercambio'}</button>
    </div>`;
    const sendOffer = (uids: string[], money: number) => net.send({ t: 'trade_offer', uids, money });
    body.querySelectorAll<HTMLElement>('[data-tpk]').forEach(d => d.onclick = () => {
      const u = d.dataset.tpk!;
      const next = me.uids.includes(u) ? me.uids.filter((x: string) => x !== u) : me.uids.length < 6 ? [...me.uids, u] : me.uids;
      sendOffer(next, me.money);
    });
    const tm = body.querySelector('#tmoney') as HTMLInputElement;
    tm.onkeydown = e => e.stopPropagation();
    (body.querySelector('#tsetm') as HTMLElement).onclick = () => sendOffer(me.uids, Math.max(0, Math.min(c.money, parseInt(tm.value, 10) || 0)));
    (body.querySelector('#tready') as HTMLElement).onclick = () => net.send({ t: 'trade_ready', on: !me.ready });
    (body.querySelector('#tcancel') as HTMLElement).onclick = () => { net.send({ t: 'trade_cancel' }); this.close('trade'); };
  }

  // =================================================================== TIENDA
  renderShop(body: HTMLElement) {
    const c = S.core!;
    const inTown = ZONES[S.zone]?.kind === 'town';
    const sellable = ITEM_LIST.filter(i => i.price && (c.items[i.id] || 0) > 0);
    body.innerHTML = `${inTown ? '' : '<div class="card" style="color:#ff9090">Solo puedes comprar o vender dentro de un pueblo. Habla con el dependiente o entra por la puerta de la Tienda.</div>'}
      <div class="row" style="justify-content:space-between;margin-bottom:8px;flex-wrap:wrap">
        <div class="tabsbar">
          <button class="btn small ${this.shopTab === 'buy' ? 'on' : 'gray'}" data-shoptab="buy">🛒 Comprar objetos</button>
          <button class="btn small ${this.shopTab === 'sell' ? 'on' : 'gray'}" data-shoptab="sell">💰 Vender objetos (50% ₽)</button>
        </div>
        <div class="res"><span><img src="${iconURL('money')}">${fmt(c.money)}</span><span><img src="${iconURL('crystal')}">${fmt(c.crystals)}</span><span><img src="${iconURL('token')}">${fmt(c.tokens)}</span></div>
      </div>
      ${this.shopTab === 'sell' ? `
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${sellable.length ? sellable.map(i => {
          const have = c.items[i.id] || 0;
          const unit = Math.floor(i.price! * 0.5);
          return `<div class="card row"><img class="px" src="${iconURL(i.id)}" style="width:32px"><div class="grow"><div>${esc(i.name)} <b>x${have}</b></div><div class="muted" style="font-size:11px">Valor de venta: <b class="gold">${fmt(unit)} ₽</b> c/u</div></div>
            <div class="col" style="gap:3px">${[1, 5].map(q => `<button class="btn tiny gold" data-sell="${i.id}" data-q="${q}" ${!inTown || have < q ? 'disabled' : ''}>Vender x${q}</button>`).join('')}</div></div>`;
        }).join('') : '<div class="card muted" style="padding:16px;text-align:center;grid-column:1/-1">No tienes objetos vendibles en la mochila.</div>'}</div>
      ` : `
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${ITEM_LIST.filter(i => i.price).map(i => {
          const locked = (i.unlock || 0) > c.tlvl;
          const costs = [`<span class="cost"><img src="${iconURL('money')}">${fmt(i.price!)}</span>`];
          if (i.crystals) costs.push(`<span class="cost"><img src="${iconURL('crystal')}">${i.crystals}</span>`);
          if (i.essence) costs.push(`<span class="cost"><img src="${iconURL('ess_' + i.essence[0])}">${i.essence[1]} (${c.ess[i.essence[0]] || 0})</span>`);
          return `<div class="card row" style="${locked ? 'opacity:.5' : ''}"><img class="px" src="${iconURL(i.id)}" style="width:32px"><div class="grow"><div>${esc(i.name)} <span class="muted">(tienes ${c.items[i.id] || 0})</span></div><div class="muted" style="font-size:11px">${esc(i.desc)}</div><div class="row" style="gap:6px">${costs.join('')}</div>${locked ? `<div class="gold" style="font-size:11px">Nivel de entrenador ${i.unlock}</div>` : ''}</div>
            <div class="col" style="gap:3px">${[1, 5, 10].map(q => `<button class="btn tiny green" data-buy="${i.id}" data-q="${q}" ${locked || !inTown ? 'disabled' : ''}>x${q}</button>`).join('')}</div></div>`;
        }).join('')}</div>
        <div class="hr"></div><b>Intercambio de Fragmentos de Jefe</b>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));margin-top:6px">${Object.entries(TOKEN_SHOP).map(([id, cost]) => `<div class="card row"><img class="px" src="${iconURL(id)}" style="width:32px"><div class="grow">${esc(ITEMS[id].name)}<div class="cost"><img src="${iconURL('token')}">${cost}</div></div><button class="btn tiny gold" data-tok="${id}" ${inTown && c.tokens >= cost ? '' : 'disabled'}>Canjear</button></div>`).join('')}</div>
      `}`;
    body.querySelectorAll<HTMLElement>('[data-shoptab]').forEach(b => b.onclick = () => { this.shopTab = b.dataset.shoptab as any; this.renderShop(body); });
    body.querySelectorAll<HTMLElement>('[data-buy]').forEach(b => b.onclick = () => net.send({ t: 'buy', item: b.dataset.buy, qty: parseInt(b.dataset.q!, 10) }));
    body.querySelectorAll<HTMLElement>('[data-sell]').forEach(b => b.onclick = () => { net.send({ t: 'sell', item: b.dataset.sell, qty: parseInt(b.dataset.q!, 10) }); audio.play('coin'); });
    body.querySelectorAll<HTMLElement>('[data-tok]').forEach(b => b.onclick = () => net.send({ t: 'buy', item: b.dataset.tok, qty: 1, tokens: true }));
  }

  // =================================================================== AJUSTES
  renderSettings(body: HTMLElement) {
    const st = S.settings;
    const look = S.core?.look || { hat: 0, shirt: 0, skin: 0, hair: 0 };
    const tStep = [0, 1, 0, 2][this.viewStep % 4];
    body.innerHTML = `<div class="col">
      <div class="card" style="padding:10px">
        <div class="row" style="justify-content:space-between;margin-bottom:6px">
          <b class="gold">👕 Vestidor del Entrenador</b>
          <div class="row" style="gap:4px">
            <button class="btn tiny gray" id="trot-set">⟳ Vista</button>
            <button class="btn tiny gold" id="trand-set">🎲 Aleatorio</button>
          </div>
        </div>
        <div class="row" style="gap:12px;align-items:center">
          <img id="set-avatar" class="px" src="${trainerURL(look, 3, this.trainerDir, tStep)}" style="width:48px;height:72px;background:#0003;border-radius:6px;padding:4px" alt="Entrenador" />
          <div class="looks grow" style="display:grid;grid-template-columns:46px 1fr;gap:5px;align-items:center;font-size:12px">
            <span>Gorra</span><div class="swatches" data-f="hat">${HAT_COLORS.map((c, i) => `<div class="sw ${look.hat === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
            <span>Ropa</span><div class="swatches" data-f="shirt">${SHIRT_COLORS.map((c, i) => `<div class="sw ${look.shirt === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
            <span>Piel</span><div class="swatches" data-f="skin">${SKIN_COLORS.map((c, i) => `<div class="sw ${look.skin === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
            <span>Pelo</span><div class="swatches" data-f="hair">${HAIR_COLORS.map((c, i) => `<div class="sw ${look.hair === i ? 'sel' : ''}" style="background:${c}" data-i="${i}"></div>`).join('')}</div>
          </div>
        </div>
      </div>
      <label>Música <input type="range" min="0" max="1" step="0.05" value="${st.music}" id="smus"></label>
      <label>Efectos <input type="range" min="0" max="1" step="0.05" value="${st.sfx}" id="ssfx"></label>
      <label>Calidad de partículas <select id="spart"><option value="high" ${st.particles === 'high' ? 'selected' : ''}>Alta</option><option value="low" ${st.particles === 'low' ? 'selected' : ''}>Baja (equipos modestos)</option></select></label>
      <label><input type="checkbox" id="snames" ${st.names ? 'checked' : ''}> Mostrar nombres de jugadores</label>
      <label><input type="checkbox" id="sdmg" ${st.dmg ? 'checked' : ''}> Mostrar números de daño</label>
      <label><input type="checkbox" id="svfx" ${st.vfx !== false ? 'checked' : ''}> Efectos de iluminación ambiental y sombras</label>
      <div class="row">Zoom de cámara <button class="btn small" id="zm">−</button><b>${st.zoom > 0 ? '+' : ''}${st.zoom}</b><button class="btn small" id="zp">+</button></div>
      <div class="hr"></div>
      <div class="row"><button class="btn" id="shelp">Controles y ayuda</button><span class="grow"></span><button class="btn red" id="slogout">Cerrar sesión</button></div>
      <div class="muted" style="font-size:12px">${S.guest ? 'Cuenta de invitado: tu progreso está ligado a este navegador (token guardado). Si borras los datos del navegador perderás el acceso.' : 'Cuenta registrada: puedes entrar desde cualquier dispositivo con tu usuario y contraseña.'}</div>
    </div>`;
    const upd = () => { saveSettings(); audio.applyVolumes(); bus.emit('settings'); };
    (body.querySelector('#smus') as HTMLInputElement).oninput = e => { st.music = parseFloat((e.target as HTMLInputElement).value); upd(); };
    (body.querySelector('#ssfx') as HTMLInputElement).oninput = e => { st.sfx = parseFloat((e.target as HTMLInputElement).value); upd(); audio.play('ui'); };
    (body.querySelector('#spart') as HTMLSelectElement).onchange = e => { st.particles = (e.target as HTMLSelectElement).value as any; upd(); };
    (body.querySelector('#snames') as HTMLInputElement).onchange = e => { st.names = (e.target as HTMLInputElement).checked; upd(); };
    (body.querySelector('#sdmg') as HTMLInputElement).onchange = e => { st.dmg = (e.target as HTMLInputElement).checked; upd(); };
    (body.querySelector('#svfx') as HTMLInputElement).onchange = e => { st.vfx = (e.target as HTMLInputElement).checked; upd(); };
    (body.querySelector('#zm') as HTMLElement).onclick = () => { st.zoom = Math.max(-2, st.zoom - 1); upd(); this.renderSettings(body); };
    (body.querySelector('#zp') as HTMLElement).onclick = () => { st.zoom = Math.min(2, st.zoom + 1); upd(); this.renderSettings(body); };
    (body.querySelector('#shelp') as HTMLElement).onclick = () => this.open('help');
    (body.querySelector('#trot-set') as HTMLElement).onclick = () => { this.trainerDir = (this.trainerDir + 1) % 3; audio.play('ui'); this.renderSettings(body); };
    (body.querySelector('#trand-set') as HTMLElement).onclick = () => {
      if (!S.core) return;
      const l = {
        hat: Math.floor(Math.random() * HAT_COLORS.length),
        shirt: Math.floor(Math.random() * SHIRT_COLORS.length),
        skin: Math.floor(Math.random() * SKIN_COLORS.length),
        hair: Math.floor(Math.random() * HAIR_COLORS.length),
      };
      S.core.look = l;
      net.send({ t: 'look', look: l });
      bus.emit('core');
      audio.play('sparkle');
      this.renderSettings(body);
    };
    body.querySelectorAll<HTMLElement>('.swatches').forEach(sw => sw.querySelectorAll<HTMLElement>('.sw').forEach(d => d.onclick = () => {
      if (!S.core) return;
      const l = { ...S.core.look, [sw.dataset.f!]: parseInt(d.dataset.i!, 10) };
      S.core.look = l;
      net.send({ t: 'look', look: l });
      bus.emit('core');
      audio.play('ui');
      this.renderSettings(body);
    }));
    (body.querySelector('#slogout') as HTMLElement).onclick = () => { if (confirm('¿Cerrar sesión? (como invitado necesitarás este navegador para volver a entrar)')) { localStorage.removeItem('prw_token'); location.reload(); } };
  }

  renderHelp(body: HTMLElement) {
    body.innerHTML = `<div class="help">
      <b class="gold">Controles</b><br>
      <kbd>WASD</kbd>/<kbd>Flechas</kbd> o clic en el suelo para moverse · <kbd>E</kbd> interactuar · <kbd>Clic</kbd> seleccionar Pokémon salvaje · <kbd>Tab</kbd> siguiente objetivo<br>
      <kbd>R</kbd> Diario de campo: 12 investigaciones con recompensas · <kbd>M</kbd> mapa: marca destinos para la brújula.<br>
      <kbd>G</kbd> Gimnasios: localiza a los líderes, desafíalos y consigue seis medallas con mejoras permanentes.<br>
      <kbd>C</kbd> o <kbd>clic derecho</kbd> lanzar Ball · <kbd>B</kbd> cambiar Ball · <kbd>1-4</kbd> habilidades · <kbd>Espacio</kbd> esquiva<br>
      <kbd>T</kbd> equipo · <kbd>P</kbd> Pokédex · <kbd>I</kbd> mochila · <kbd>U</kbd> mejoras · <kbd>X</kbd> expediciones · <kbd>M</kbd> mapa · <kbd>J</kbd> misiones · <kbd>O</kbd> social · <kbd>N</kbd> novedades · <kbd>Enter</kbd> chat · <kbd>Esc</kbd> cerrar/ajustes<br>
      <kbd>F</kbd> huir de los salvajes que te persiguen · <kbd>Z</kbd> encender hoguera de campamento (cura a tus aliados) · <kbd>V</kbd> modo del equipo (Pasivo / Neutral / Ataque / Agresivo) · <kbd>K</kbd> Tarjeta de Entrenador · <kbd>/duelo</kbd> · <kbd>/intercambio</kbd> · <kbd>/ranking</kbd> · <kbd>/acampar</kbd>
      <div class="hr"></div>
      <b class="gold">Cómo se juega</b><br>
      • Los salvajes <b>saltan de repente</b> al caminar por hierba alta, arena, tierra o cuevas. Los <b>agresivos</b> (nivel en rojo) van directos a por ti; otros pasean o huyen.<br>
      • Tus Pokémon te siguen y combaten según su <b>modo</b>: Pasivo (solo tu objetivo), Neutral (se defienden), Ataque o Agresivo (más alcance y daño, menos defensa). ¡Haz clic sobre tus compañeros en el mundo (o en su ficha 3D) para <b>acariciarlos</b>!<br>
      • Los derrotados a veces sueltan <b>cofres</b>: pasa por encima para abrirlos. Los alfa y los legendarios casi siempre.<br>
      • <b>Legendarios errantes</b>: Articuno (Picos Helados), Zapdos (Campos Voltio), Moltres (Volcán) y Mew (casi cualquier ruta) aparecen en muy pocos encuentros. Los shiny legendarios son de los más raros del juego.<br>
      • Entra en las <b>casas</b>, el <b>Centro Pokémon</b> y la <b>Tienda</b>: los vecinos dan consejos y regalos únicos.<br>
      • Debilita a un Pokémon y lánzale una Ball: cuanta menos vida y mejor Ball, más probabilidad. Dormidos o congelados se capturan mejor.<br>
      • Gana Pokédólares y Cristales para comprar <b>Mejoras</b> (U). Las esencias de cada tipo mejoran sus <b>Afinidades</b>.<br>
      • <b>Pokémon Link</b>: equipa varios del mismo tipo para desbloquear sinergias (cadenas eléctricas, explosiones de fuego, olas...).<br>
      • Los <b>jefes</b> (Snorlax, Gyarados, Onix, Arcanine, Gengar, Dragonite, Mewtwo) marcan zonas rojas: ¡sal de ellas! Tras derrotarlos tienes 25 s para intentar capturarlos.<br>
      • Visita los <b>Centros Pokémon</b> para curarte y desbloquear el viaje rápido desde el mapa (M).<br>
      • Los <b>eventos</b> (invasiones, portales, tormentas, raros, EXP doble...) aparecen cada pocos minutos.<br>
      • Juega con amigos: invítalos a tu grupo desde Social (O) para compartir experiencia y recompensas.
      <div class="hr"></div>
      <b class="gold">Habilidades</b><br>${SKILLS.map(s => `[${s.key}] <b>${esc(s.name)}</b> (nv.${s.unlock}, ${s.cd}s): ${esc(s.desc)}`).join('<br>')}
      <div class="hr"></div><b class="gold">Changelog · ${RELEASE}</b><ul>${CHANGELOG.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn tiny gold" id="hnotebook">📓 Abrir Libreta de Novedades [N]</button>
        <a class="btn tiny" href="/?gallery=n" target="_blank" rel="noopener">🎨 Abrir visor de modelos 3D</a>
      </div>
    </div>`;
    const nb = body.querySelector('#hnotebook') as HTMLElement | null;
    if (nb) nb.onclick = () => openNotebook();
  }
  // =================================================================== TARJETA DE ENTRENADOR
  renderTrainer(body: HTMLElement) {
    const c = S.core!;
    const medals = c.medals || [];
    const dex = c.dex;
    const seen = SPECIES_LIST.filter(s => dex.seen[s.key] || dex.caught[s.key]).length;
    const caught = SPECIES_LIST.filter(s => dex.caught[s.key]).length;
    const shinyCount = SPECIES_LIST.reduce((n, s) => n + (dex.shiny[s.key] || 0), 0);
    const myTeam = c.team.map(uid => monByUid(uid)).filter((m): m is MonSave => !!m && !!SPECIES[m.sp]);
    let bestMon: any = null, bestCP = 0, totalCP = 0;
    const eliteCount = S.mons.filter(m => (m.iv[0] + m.iv[1] + m.iv[2] + m.iv[3]) >= 105).length;
    const streak = (S as any)._st || 0;
    for (const m of myTeam) {
      const sp = SPECIES[m.sp];
      const cp = monCP(sp, m.lvl, m.iv);
      totalCP += cp;
      if (cp > bestCP) { bestCP = cp; bestMon = { m, cp, sp }; }
    }
    const medalCount = medals.length;
    let title = 'Aspirante de Kanto';
    if (medalCount >= 6) title = 'Campeón de la Meseta Añil';
    else if (medalCount >= 5) title = 'As de la Liga';
    else if (medalCount >= 3) title = 'Veterano de Gimnasio';
    else if (medalCount >= 1) title = 'Entrenador Promesa';

    body.innerHTML = `<div class="trainer-card">
      <div class="tc-header">
        <img id="tc-avatar" class="tc-avatar" src="${trainerURL(c.look, 4, this.trainerDir, [0, 1, 0, 2][this.viewStep % 4])}" alt="Avatar" style="cursor:pointer" title="Clic para girar vista" />
        <div class="col grow" style="gap:4px">
          <div class="row" style="justify-content:space-between">
            <b style="font-size:18px;color:#fff">${esc(c.name)}</b>
            <span class="gold" style="font-size:14px">Nv. ${c.tlvl}</span>
          </div>
          <div class="tc-rank">${esc(title)}${shinyCount > 0 ? ' ✦ Shiny Hunter' : ''}</div>
          <div class="muted" style="font-size:11px">EXP Total: ${fmt(c.txp)}</div>
        </div>
      </div>

      <div class="card" style="padding:10px 12px">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <b style="font-size:13px;letter-spacing:1px;color:#f2d28b">MEDALLERO OFICIAL (${medalCount}/${GYMS.length})</b>
          <span class="muted" style="font-size:11px">+${medalCount * 4}% daño · +${medalCount * 3}% EXP</span>
        </div>
        <div class="badge-case">
          ${GYMS.map((g, i) => {
            const has = medals.includes(i);
            return `<div class="badge-slot" title="${esc(g.medal)} (${esc(g.leader)} - ${esc(g.type)})">
              <div class="badge-gem ${has ? 'earned' : 'locked'}" style="background:${g.color};color:${has ? '#fff' : '#666'}">
                ${has ? '★' : '✦'}
              </div>
              <span style="font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;color:${has ? '#f2d28b' : '#666'}">
                ${esc(g.leader)}
              </span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card" style="padding:8px 12px;margin-bottom:8px">
        <div class="row" style="justify-content:space-between;margin-bottom:6px">
          <b style="font-size:12px;letter-spacing:1px;color:#a8d8ff">EQUIPO TITULAR EN 3D (${myTeam.length}/6)</b>
          <span class="muted" style="font-size:11px">Élite IV (≥85%): <b class="gold">★ ${eliteCount}</b> · Racha: <b style="color:#ff9a40">🔥 x${streak}</b></span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;text-align:center">
          ${myTeam.map(m => {
            const ivPct = Math.round((m.iv[0] + m.iv[1] + m.iv[2] + m.iv[3]) / 124 * 100);
            return `<div style="background:#ffffff0c;border-radius:8px;padding:4px 2px;border:1px solid ${m.shiny ? '#ffd86688' : '#ffffff18'}">
              <img class="px" src="${monURL(m.sp, m.shiny, 1, 1, 2)}" style="width:40px;height:40px" alt="" />
              <div style="font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.fav ? '⭐' : ''}${m.shiny ? '✦' : ''}${esc(m.nick || SPECIES[m.sp].name)}</div>
              <div class="muted" style="font-size:9px">Nv.${m.lvl} · ${ivPct}% IV</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="tc-stats-grid">
        <div class="tc-stat-box">
          <small>Pokédex Registrada</small>
          <b>${caught} / ${SPECIES_LIST.length}</b>
          <div class="muted" style="font-size:10px">Vistos: ${seen}</div>
        </div>
        <div class="tc-stat-box">
          <small>Shinies Capturados</small>
          <b class="gold">✦ ${shinyCount}</b>
          <div class="muted" style="font-size:10px">Tasa base: 1/${S.shinyBase}</div>
        </div>
        <div class="tc-stat-box">
          <small>Poder del Equipo (PC)</small>
          <b style="color:#60e0a0">${totalCP}</b>
          <div class="muted" style="font-size:10px">Máx: ${bestMon ? `${bestMon.sp.name} (${bestCP})` : '--'}</div>
        </div>
        <div class="tc-stat-box">
          <small>Monedas Rush</small>
          <b style="color:#f2d28b">${fmt(c.money)} ₽</b>
        </div>
        <div class="tc-stat-box">
          <small>Cristales Rush</small>
          <b style="color:#78d8ff">${c.crystals}</b>
        </div>
        <div class="tc-stat-box">
          <small>Victorias de Gimnasio</small>
          <b style="color:#ffb070">${c.stats.gyms || 0}</b>
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;margin-top:4px;gap:6px;flex-wrap:wrap">
        <button class="btn small gray" id="tc-look">👕 Vestidor</button>
        <button class="btn small gray" id="tc-rank">🏆 Salón de la Fama</button>
        <button class="btn small gray" id="tc-help">Guía de Ayuda (H)</button>
        <button class="btn small gold" id="tc-gyms">Desafiar Gimnasios (G)</button>
      </div>
    </div>`;

    const av = body.querySelector('#tc-avatar') as HTMLElement | null;
    if (av) av.onclick = () => { this.trainerDir = (this.trainerDir + 1) % 3; audio.play('ui'); this.renderTrainer(body); };
    const lk = body.querySelector('#tc-look') as HTMLElement | null;
    if (lk) lk.onclick = () => { this.close('trainer'); this.open('settings'); };
    const rk = body.querySelector('#tc-rank') as HTMLElement | null;
    if (rk) rk.onclick = () => { this.close('trainer'); this.socialTab = 'rank'; this.open('social'); };
    const gh = body.querySelector('#tc-gyms') as HTMLElement | null;
    if (gh) gh.onclick = () => { this.close('trainer'); this.open('gyms'); };
    const hlp = body.querySelector('#tc-help') as HTMLElement | null;
    if (hlp) hlp.onclick = () => { this.close('trainer'); this.open('help'); };
  }
}

export { BALLS, catchChance, MOVES, LINKS };
