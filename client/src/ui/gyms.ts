import { GYMS, GYM_TIME, MEDAL_DMG, MEDAL_XP } from '../../../shared/gyms';
import { SPECIES } from '../../../shared/species';
import { TYPES, TYPE_NAMES, TYPE_COLORS, typeEffect } from '../../../shared/types';
import { ZONES } from '../../../shared/zones';
import { S, monByUid } from '../state';
import { net } from '../networking/net';
import { monURL } from '../graphics/textures';
import { esc } from './dom';
import { audio } from '../systems/audio';
import type { Hud } from './hud';

export function renderGyms(body: HTMLElement, hud: Hud) {
  const medals = S.core?.medals || [], sc = hud.scene;
  const myTeamMons = (S.core?.team || []).map(u => monByUid(u)).filter(Boolean);
  body.innerHTML = `<div class="research-hero"><span class="eyebrow">LIGA REGIONAL / ${GYMS.length} LÍDERES</span><h2>El camino de las medallas.</h2><p>Desafía a los líderes en orden. Tienes ${GYM_TIME / 60} minutos para vencer a todo su equipo sin alejarte de la arena.</p><div class="research-rank"><b>${medals.length} / ${GYMS.length} medallas</b><span>Bonificación: +${Math.round(medals.length * MEDAL_DMG * 100)}% daño · +${Math.round(medals.length * MEDAL_XP * 100)}% EXP</span></div></div><div class="research-grid">${GYMS.map(g => {
    const won = medals.includes(g.id), locked = g.id > 0 && !medals.includes(g.id - 1);
    const npc = hud.world.npcs.find(n => n.role === 'leader' && n.gym === g.id);
    const dist = sc && npc ? Math.hypot(sc.me.x - npc.x - 0.5, sc.me.y - npc.y - 0.5) : 999;
    const near = dist <= 3.5;
    const counters = TYPES.filter(t => typeEffect(t, [g.type]) > 1);
    const myStrong = myTeamMons.filter(m => m && SPECIES[m.sp].types.some(t => counters.includes(t)));
    return `<article class="research-card gym-card ${won ? 'ready' : ''}" style="--medal:${g.color}"><div class="field-heading"><span>${esc(ZONES[g.town].name)} · ${near ? '✓ En rango' : dist < 900 ? `A ${Math.round(dist)}m` : ''}</span><span>${won ? '✓ GANADA' : locked ? 'BLOQUEADO' : 'DISPONIBLE'}</span></div><h3><span class="medal-icon">✦</span> ${g.leader} <small style="color:${TYPE_COLORS[g.type]}">${TYPE_NAMES[g.type]}</small></h3><p>${g.medal} · ${esc(g.lines[1])}</p><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:4px 0;font-size:11px"><span class="muted">Ventaja:</span>${counters.map(t => `<span class="tag" style="background:${TYPE_COLORS[t]};padding:1px 6px;font-size:10px">${TYPE_NAMES[t]}</span>`).join('')}</div><div style="font-size:11px;margin-bottom:4px;color:${myStrong.length ? '#60e088' : '#ffb870'}">${myStrong.length ? `✔ Tu equipo tiene ventaja (${myStrong.map(m => m!.nick || SPECIES[m!.sp].name).join(', ')})` : '⚠ Ningún titular de tu equipo tiene ventaja elemental'}</div><div class="gym-team">${g.team.map(([sp, lvl], idx) => {
      const isAce = idx === g.team.length - 1;
      return `<div style="${isAce ? 'border:1px solid #ffd86688;border-radius:8px;padding:2px 4px;background:#ffd86614' : ''}"><img src="${monURL(sp, false, 1)}" alt="${SPECIES[sp].name}" title="${SPECIES[sp].name}"><small>${isAce ? '★ ' : ''}Nv.${lvl}</small></div>`;
    }).join('')}</div><div class="research-reward">${won ? 'Revancha: 30% del dinero, cristales y EXP. Descanso de 10 minutos entre victorias.' : `${g.reward.money} ₽ · ${g.reward.crystals} cristales · +4% daño y +3% EXP permanentes`}</div><button class="btn small ${near && !locked ? 'gold' : 'gray'}" data-gym="${g.id}" ${locked || S.gym ? 'disabled' : ''}>${S.gym?.id === g.id ? 'Combate en curso' : locked ? 'Gana la medalla anterior' : near ? won ? 'Pedir revancha' : 'Desafiar al líder' : 'Localizar al líder ↗'}</button></article>`;
  }).join('')}</div>`;
  body.querySelectorAll<HTMLButtonElement>('[data-gym]').forEach(b => b.onclick = () => {
    const id = Number(b.dataset.gym), npc = hud.world.npcs.find(n => n.role === 'leader' && n.gym === id);
    if (!sc || !npc) return;
    if (Math.hypot(sc.me.x - npc.x - 0.5, sc.me.y - npc.y - 0.5) > 3.5) S.waypoint = { x: npc.x + 0.5, y: npc.y + 0.5, name: 'Líder ' + GYMS[id].leader };
    else net.send({ t: 'gym', id });
    audio.play('ui');
    hud.panels.close('gyms');
  });
}
