// HUD principal: entrenador, equipo, habilidades, minimapa, chat, eventos, misiones, notificaciones.
import { el, esc, fmt, time } from './dom';
import { S, bus, monByUid, saveSettings } from '../state';
import { net } from '../networking/net';
import { SPECIES, SPECIES_LIST, RARITY_NAMES, RARITY_COLORS } from '../../../shared/species';
import { ZONES } from '../../../shared/zones';
import { TYPE_NAMES, TYPE_COLORS, typeEffect } from '../../../shared/types';
import { ITEMS, BALLS } from '../../../shared/items';
import { SKILLS, QUESTS, trainerXpForLevel, monXpForLevel, teamSlotsFor, LINK_MAP, catchChance, CATCH_BONUS, STATUS_CATCH, critCaptureChance, captureProbability, chainShinyMult, RARITY_CATCH } from '../../../shared/progression';
import { TERRAIN_MAP_COLOR, STATUS_NAMES } from '../../../shared/constants';
import type { World } from '../../../shared/world/worldgen';
import { monURL, trainerURL } from '../graphics/textures';
import { iconURL } from '../graphics/iconArt';
import { renderOverview } from '../graphics/chunkRenderer';
import { audio } from '../systems/audio';
import { Panels } from './panels';
import { openNotebook } from './notebook';
import { statValueClient } from './util';
import { ExplorationGuide } from './exploration';
import { GYMS } from '../../../shared/gyms';
import { seasonAt, weatherAt, seasonLeft, SEASON_NAMES, SEASON_ICONS, WEATHER_NAMES, WEATHER_ICONS } from '../../../shared/weather';

const WEATHER_HINTS: Record<string, string> = {
  clear: 'Se despeja el cielo.', sun: 'Sale el sol: más Pokémon de fuego y planta.', rain: 'Empieza a llover: más Pokémon de agua.',
  storm: '¡Tormenta eléctrica! Más Pokémon eléctricos... y algún legendario del trueno.', snow: 'Nieva: salen Pokémon de hielo.',
  fog: 'La niebla cubre la zona: fantasmas y psíquicos rondan.', wind: 'Sopla el viento: más Pokémon voladores.', ash: 'Cae ceniza volcánica.',
};
/** Convierte una línea de botín ("Poké Ball x3", "120 ₽", "2 Cristales Rush"...) en una ficha con su icono. */
const ITEM_BY_NAME = new Map(Object.values(ITEMS).map(i => [i.name.toLowerCase(), i.id]));
function lootTile(line: string): string {
  const t = line.trim();
  let icon = '', n = '', label = t;
  let mm = t.match(/^(.+?) x(\d+)$/);
  if (mm && ITEM_BY_NAME.has(mm[1].toLowerCase())) { icon = ITEM_BY_NAME.get(mm[1].toLowerCase())!; n = mm[2]; label = mm[1]; }
  else if ((mm = t.match(/^([\d.,]+) ?₽$/))) { icon = 'money'; n = mm[1]; label = 'Pokédólares'; }
  else if ((mm = t.match(/^(\d+) Cristales?/))) { icon = 'crystal'; n = mm[1]; label = 'Cristales Rush'; }
  else if ((mm = t.match(/^(\d+) Fragmentos?/))) { icon = 'token'; n = mm[1]; label = 'Fragmentos de Jefe'; }
  else if ((mm = t.match(/^Esencia (.+) x(\d+)$/))) { icon = 'crystal'; n = mm[2]; label = 'Esencia ' + mm[1]; }
  else if ((mm = t.match(/^([\d.,]+) EXP/))) { icon = 'xp'; n = mm[1]; label = 'Experiencia'; }
  else if (ITEM_BY_NAME.has(t.toLowerCase())) { icon = ITEM_BY_NAME.get(t.toLowerCase())!; n = '1'; }
  if (!icon) return `<div class="loot-line">${esc(t)}</div>`;
  return `<div class="loot-tile" title="${esc(label)}"><img src="${iconURL(icon, 3)}" alt=""><b>${n ? '×' + esc(n) : ''}</b><small>${esc(label)}</small></div>`;
}

export const STANCES = [
  { id: 'passive', name: 'Pasivo', ic: '☮', desc: 'Tu equipo no ataca por su cuenta: solo al objetivo que tú fijes. +12% defensa.' },
  { id: 'neutral', name: 'Neutral', ic: '⛨', desc: 'No atacan a nadie: solo se defienden si un salvaje os golpea a ti o a tu equipo.' },
  { id: 'free', name: 'Libre', ic: '❦', desc: 'Pasean a su aire por los alrededores y solo pelean si les atacan.' },
  { id: 'attack', name: 'Ataque', ic: '⚔', desc: 'Atacan a los salvajes que tengas cerca.' },
  { id: 'aggressive', name: 'Agresivo', ic: '☠', desc: 'Buscan pelea de lejos: +50% alcance y +10% daño, pero -10% defensa.' },
];

export class Hud {
  root: HTMLElement;
  world: World;
  overview: HTMLCanvasElement;
  panels: Panels;
  els: Record<string, HTMLElement> = {};
  chatCh: 'g' | 'z' | 'p' = 'g';
  chatLog: { ch: string; html: string }[] = [];
  dialogQueue: string[] = []; dialogName = '';
  scene: any = null;
  lastTeamKey = '';
  guide: ExplorationGuide;

  constructor(world: World) {
    this.world = world;
    this.root = document.getElementById('ui')!;
    this.root.innerHTML = '';
    this.overview = renderOverview(world, TERRAIN_MAP_COLOR);
    this.build();
    this.panels = new Panels(this);
    this.guide = new ExplorationGuide(this);
    this.bind();
    bus.on('scene_ready', (s: any) => { this.scene = s; });
    setInterval(() => this.tick(), 200);
    setInterval(() => this.drawMinimap(), 250);
  }

  build() {
    const r = this.root;
    r.insertAdjacentHTML('beforeend', `
      <div class="vignette" id="vig"></div>
      <div class="panel hud-tl live" id="tl">
        <div class="row">
          <img class="portrait" id="tlp" />
          <div class="grow col" style="gap:3px">
            <div class="row"><span class="nm" id="tlname"></span><span class="lv" id="tllv"></span></div>
            <div class="bar hp" title="PS del entrenador"><i id="tlhp"></i></div>
            <div class="bar xp" title="EXP de entrenador"><i id="tlxp"></i></div>
            <div class="muted" style="font-size:11px" id="tlxpt"></div>
          </div>
        </div>
        <div class="buffs-row" id="tlbuffs" style="display:none;gap:4px;flex-wrap:wrap;margin:3px 0 2px"></div>
        <div class="res" id="res"></div>
      </div>
      <div class="panel target live" id="target" style="display:none"></div>
      <div class="eventbox" id="events"></div>
      <div class="panel gym-status" id="gym-status" hidden></div>
      <div class="panel bossbar" id="boss" style="display:none"><div class="nm" id="bossn"></div><div class="bar"><i id="bossh"></i></div><div class="st" id="bosss"></div></div>
      <div class="hud-tr">
        <div class="panel minimap live" id="mm"><canvas id="mmc" width="168" height="168"></canvas><div class="zn" id="zn"></div></div>
        <div class="panel netinfo live"><span class="dot" id="netdot" style="background:#4c4"></span><span id="netping">-- ms</span><span id="online"></span><span id="clock"></span><button class="nb-hud-btn" id="nb-btn" title="Abrir Libreta de Novedades (Changelog) [N]">📓 Novedades</button></div>
      </div>
      <div class="panel tracker live" id="tracker"></div>
      <div class="toasts" id="toasts"></div>
      <div class="zonebanner" id="zb"><div class="t" id="zbt"></div><div class="s" id="zbs"></div></div>
      <div class="hud-bottom live">
        <div class="panel teambar" id="team"></div>
        <div class="panel actionbar" id="actions"></div>
      </div>
      <button class="chat-toggle live" id="chat-toggle" aria-expanded="false">Chat <kbd>Enter</kbd></button>
      <div class="panel chat live collapsed" id="chat">
        <div class="row" style="justify-content:space-between">
          <div class="tabs"><button class="btn small gold" data-ch="g">Global</button><button class="btn small gray" data-ch="z">Zona</button><button class="btn small gray" data-ch="p">Grupo</button></div>
          <div class="emotes" id="emotes"></div>
        </div>
        <div class="log scroll" id="clog"></div>
        <input id="cin" maxlength="160" placeholder="Pulsa Enter para escribir..." />
      </div>
      <div class="menubar panel live" id="menubar"></div>
      <div class="panel enc-card live" id="enc" hidden></div>
      <div class="panel duel-hud live" id="duelhud" hidden></div>
      <div class="legend-banner" id="legend" hidden></div>
    `);
    for (const id of ['vig', 'tl', 'tlp', 'tlname', 'tllv', 'tlhp', 'tlxp', 'tlxpt', 'tlbuffs', 'res', 'target', 'events', 'boss', 'bossn', 'bossh', 'bosss', 'mm', 'mmc', 'zn', 'netdot', 'netping', 'online', 'clock', 'tracker', 'toasts', 'zb', 'zbt', 'zbs', 'team', 'actions', 'chat', 'clog', 'cin', 'menubar', 'emotes', 'enc', 'duelhud', 'legend']) this.els[id] = document.getElementById(id)!;
    // Dock de menús: rejilla fija de iconos (antes los botones se apilaban de forma irregular).
    const menus: [string, string, string, string][] = [
      ['team', 'Equipo', 'T', '◓'], ['dex', 'Pokédex', 'P', '▣'], ['inv', 'Mochila', 'I', '✚'], ['map', 'Mapa', 'M', '⌖'],
      ['quests', 'Misiones', 'J', '!'], ['research', 'Diario', 'R', '✎'], ['gyms', 'Gimnasios', 'G', '★'], ['upg', 'Mejoras', 'U', '▲'],
      ['exp', 'Expedic.', 'X', '➹'], ['social', 'Social', 'O', '☺'], ['help', 'Ayuda', 'H', '?'], ['settings', 'Ajustes', 'Esc', '⚙'],
    ];
    this.els.menubar.innerHTML = `<div class="dock-grid">${menus.map(([id, n, k, ic]) => `<button class="dock-btn" data-open="${id}" title="${n} [${k}]"><span class="ic">${ic}</span><span class="lb">${n}</span><kbd>${k}</kbd></button>`).join('')}</div>`;
    this.els.menubar.querySelectorAll<HTMLElement>('[data-open]').forEach(b => b.onclick = () => this.panels.toggle(b.dataset.open!));
    this.els.emotes.innerHTML = ['!', '?', '<3', ':)', ':(', 'Zz', '...', 'GG', 'Ayuda', 'Hola'].map((t, i) => `<button class="btn tiny gray" data-em="${i}">${esc(t)}</button>`).join('');
    this.els.emotes.querySelectorAll<HTMLElement>('[data-em]').forEach(b => b.onclick = () => net.send({ t: 'emote', e: parseInt(b.dataset.em!, 10) }));
    this.els.mm.onclick = () => this.panels.toggle('map');
    const nbBtn = document.getElementById('nb-btn');
    if (nbBtn) nbBtn.onclick = () => openNotebook();
    this.els.tlp.style.cursor = 'pointer';
    this.els.tlp.title = 'Tarjeta de Entrenador (K)';
    this.els.tlp.onclick = () => this.panels.toggle('trainer');
    this.els.tlname.style.cursor = 'pointer';
    this.els.tlname.title = 'Tarjeta de Entrenador (K)';
    this.els.tlname.onclick = () => this.panels.toggle('trainer');
  }

  bind() {
    const cin = this.els.cin as HTMLInputElement;
    const chatToggle = document.getElementById('chat-toggle')!;
    const setChat = (open: boolean) => { this.els.chat.classList.toggle('collapsed', !open); chatToggle.setAttribute('aria-expanded', String(open)); };
    chatToggle.onclick = () => { const open = this.els.chat.classList.contains('collapsed'); setChat(open); if (open) cin.focus(); };
    this.els.chat.querySelectorAll<HTMLElement>('[data-ch]').forEach(b => b.onclick = () => {
      this.chatCh = b.dataset.ch as any;
      this.els.chat.querySelectorAll<HTMLElement>('[data-ch]').forEach(x => x.className = 'btn small ' + (x.dataset.ch === this.chatCh ? 'gold' : 'gray'));
      this.renderChat();
    });
    cin.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const v = cin.value.trim();
        if (v) {
          if (v.startsWith('/')) this.command(v);
          else net.send({ t: 'chat', ch: this.chatCh, msg: v });
        }
        cin.value = ''; cin.blur();
      } else if (e.key === 'Escape') { cin.blur(); setChat(false); }
    });
    window.addEventListener('keydown', e => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const k = e.key.toLowerCase();
      if (this.dialogQueue.length && (k === 'e' || k === ' ' || e.key === 'Enter')) { this.nextDialog(); e.stopImmediatePropagation(); return; }
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' && tag !== 'button' && tag !== 'a') { e.preventDefault(); setChat(true); cin.focus(); return; }
      if (k === 'n') { openNotebook(); return; }
      const map: Record<string, string> = { t: 'team', p: 'dex', i: 'inv', u: 'upg', x: 'exp', m: 'map', j: 'quests', o: 'social', h: 'help', r: 'research', g: 'gyms', k: 'trainer' };
      if (map[k]) { this.panels.toggle(map[k]); return; }
      if (e.key === 'Escape') { if (this.dialogQueue.length) { this.closeDialog(); return; } if (!this.panels.closeTop()) this.panels.toggle('settings'); }
    }, true);

    bus.on('core', () => this.refreshCore());
    bus.on('mons', () => { this.lastTeamKey = ''; this.renderTeam(); });
    net.on('chat', m => this.addChat(m));
    net.on('note', m => this.toast(m.text, m.kind));
    net.on('party', m => { S.party = { id: m.id, members: m.members }; bus.emit('party'); });
    net.on('bosses', m => { S.bosses = m.list; });
    net.on('wev', m => { S.events.set(m.ev.id, { ...m.ev, recv: Date.now() }); this.toast(`EVENTO: ${m.ev.name}`, 'shiny'); audio.play('event'); this.renderEvents(); });
    net.on('wev_up', m => { const e = S.events.get(m.ev.id); if (e) Object.assign(e, m.ev); this.renderEvents(); });
    net.on('wev_end', m => { S.events.delete(m.id); this.renderEvents(); this.toast(`Evento "${m.name}" ${m.success ? 'completado' : 'terminado'}.`, m.success ? 'good' : 'info'); });
    net.on('invite', m => this.inviteToast(m.from, m.name));
    net.on('joinreq', m => {
      const t = el('div', 'panel toast live shiny');
      t.innerHTML = `<b>${esc(m.name)}</b> (Nv.${m.lvl}) quiere unirse a tu grupo con tu enlace. <button class="btn tiny green">Aceptar</button> <button class="btn tiny red">No</button>`;
      const [a, b] = t.querySelectorAll('button');
      (a as HTMLElement).onclick = () => { net.send({ t: 'join_ok', id: m.from }); t.remove(); };
      (b as HTMLElement).onclick = () => t.remove();
      this.els.toasts.prepend(t); audio.play('quest'); setTimeout(() => t.remove(), 90000);
    });
    // enlace de invitación ?amigo=Nombre
    const amigo = new URLSearchParams(location.search).get('amigo');
    if (amigo && amigo.toLowerCase() !== (S.core?.name || '').toLowerCase()) setTimeout(() => net.send({ t: 'joinreq', name: amigo }), 2500);
    net.on('caught', m => this.onCaught(m));
    net.on('cap_fail', m => this.toast(`¡Oh, no! ${m.name} se ha escapado.`, 'bad'));
    net.on('mlv', m => {
      const ms = monByUid(m.uid); const sp = ms ? SPECIES[ms.sp] : null;
      if (ms) ms.lvl = m.lvl;
      if (sp) {
        this.toast(`¡${sp.name} subió al Nivel ${m.lvl}! (+Estadísticas)`, 'good');
        if (m.move) this.toast(`¡${sp.name} aprendió ${m.move}!`, 'shiny');
        if (m.evo) this.toast(`¡${sp.name} puede evolucionar a ${SPECIES[m.evo].name}! Abre el Equipo (T).`, 'shiny');
      }
    });
    net.on('tlv', m => this.levelUp(m));
    net.on('evolved', m => this.panels.evolution(m));
    net.on('loot', m => this.loot(m));
    net.on('zone_new', m => { const z = ZONES[m.zone]; this.toast(`Nueva zona descubierta: ${z.name}`, 'good'); });
    net.on('boss_win', m => this.loot({ title: '¡' + m.name + ' derrotado!', lines: [...m.lines, '¡Lánzale una Ball en los próximos 25 s!'] }));
    net.on('healed', () => { this.toast('Tus Pokémon están en plena forma. ¡Centro registrado para viaje rápido!', 'good'); audio.play('heal'); });
    net.on('camped', () => { this.toast('🏕 ¡Hoguera encendida! Tu equipo ha descansado y recuperado energía.', 'good'); audio.play('heal'); });
    net.on('bought', m => { this.toast(`Comprado: ${ITEMS[m.item].name} x${m.qty}`, 'good'); audio.play('coin'); });
    net.on('upgraded', m => { audio.play('levelup'); });
    net.on('inspect', m => this.panels.showInspect(m));
    net.on('starter_ok', () => {});
    net.on('gym_start', m => { S.gym = { id: m.gym, end: m.end, left: m.n, total: m.n }; this.toast('¡Desafío de ' + GYMS[m.gym].leader + '! Vence a su equipo en 3 minutos.', 'shiny'); });
    net.on('gym_up', m => { if (S.gym) S.gym.left = m.left; });
    net.on('gym_fail', m => { S.gym = null; this.toast('Fin del desafío: ' + m.reason, 'info'); });
    net.on('gym_win', m => { S.gym = null; audio.play('victory'); this.loot({ kind: 'quest', title: m.rematch ? '¡Revancha ganada!' : GYMS[m.gym].medal, lines: m.lines }); });
    bus.on('toast', (d: any) => this.toast(d.text, d.kind));
    bus.on('dialog', (d: any) => this.dialog(d.name, d.lines, d.onEnd));
    bus.on('flee', () => net.send({ t: 'flee' }));
    bus.on('quick_potion', () => (this as any)._usePotion?.());
    bus.on('cycle_stance', () => { const i = STANCES.findIndex(s => s.id === S.me.stance); this.setStance(STANCES[(i + 1) % STANCES.length].id); });
    bus.on('ambush', (d: any) => this.encCard(d.id, d.aggro));
    net.on('fled', m => { if (m.ok) { this.toast(m.n ? '¡Has escapado sin problemas!' : 'Tu equipo deja de combatir unos segundos.', 'good'); audio.play('dash'); this.hideEnc(); } else audio.play('error'); });
    net.on('legend', m => this.legendBanner(m.key, m.shiny, `${ZONES[m.zone]?.name || ''} · ante ${m.who} · Nv.${m.lvl}`, false));
    net.on('legend_caught', m => this.legendBanner(m.key, m.shiny, `¡Capturado por ${m.who}!`, true));
    net.on('duel_req', m => this.duelInvite(m));
    net.on('duel_start', m => { S.duel = { id: m.id, op: m.op, opName: m.opName, opElo: m.opElo, elo: m.elo, cx: m.cx, cy: m.cy, r: m.r, goAt: m.goAt, end: m.end, go: false }; audio.play('event'); this.toast(`Duelo contra ${m.opName}. ¡No salgas del círculo!`, 'shiny'); });
    net.on('duel_go', () => { if (S.duel) S.duel.go = true; this.bigText('¡COMBATE!', '#ff6a5a'); audio.play('boss'); });
    net.on('duel_end', m => { S.duel = null; if (m.win) audio.play('victory'); this.loot({ kind: 'quest', title: m.win ? '¡Has ganado el duelo!' : 'Has perdido el duelo', lines: [`Rival: ${m.op}`, m.reason, `Elo ${m.elo} (${m.delta > 0 ? '+' : ''}${m.delta})`, ...(m.prize ? [`Premio: ${m.prize} ₽`] : [])] }); });
    net.on('trade_req', m => this.tradeInvite(m));
    net.on('trade', m => { S.trade = m; this.panels.open('trade'); this.panels.rerender(['trade']); });
    net.on('trade_end', m => { S.trade = null; this.panels.close('trade'); this.toast(m.reason, 'info'); });
    net.on('trade_done', m => {
      S.trade = null; this.panels.close('trade'); audio.play('victory');
      this.loot({ kind: 'quest', title: `⇄ ¡Intercambio con ${m.with}!`, lines: [...(m.got || []).map((x: any) => `Recibido: ${x.shiny ? '✦ ' : ''}${SPECIES[x.sp]?.name || x.sp} Nv.${x.lvl}`), ...(m.money > 0 ? [`Recibido: +${fmt(m.money)} ₽`] : m.money < 0 ? [`Entregado: ${fmt(m.money)} ₽`] : [])] });
      for (const ev of m.evolved || []) setTimeout(() => this.panels.evolution(ev), 700);
    });
    net.on('rank', m => { S.rank = m.data; this.panels.rerender(['social']); });
    net.on('duel_top', m => { S.duelTop = m.list || []; this.panels.rerender(['social']); });
    bus.on('daily', (m: any) => this.showDaily(m));
    if ((S.daily as any)?.fresh) { delete (S.daily as any).fresh; setTimeout(() => this.showDaily(S.daily), 750); }
    bus.on('open', (p: string) => this.panels.open(p));
    bus.on('zone', (z: number) => this.zoneBanner(z));
    bus.on('hurt', () => { this.els.vig.classList.add('hurt'); setTimeout(() => this.els.vig.classList.remove('hurt'), 160); });
    bus.on('danger', () => { this.els.vig.classList.add('danger'); clearTimeout((this as any)._dt); (this as any)._dt = setTimeout(() => this.els.vig.classList.remove('danger'), 450); });
    bus.on('cycle_ball', () => {
      const have = BALLS.filter(b => (S.core?.items[b] || 0) > 0);
      if (!have.length) { this.toast('No tienes Poké Balls disponibles en la mochila.', 'info'); return; }
      const i = have.indexOf(S.settings.ball);
      S.settings.ball = have[(i + 1) % have.length];
      saveSettings();
      audio.play('ui');
      this.toast('Ball activa [B]: ' + ITEMS[S.settings.ball].name, 'good');
      this.renderActions();
    });
    bus.on('snap', () => { this.renderTeam(); this.renderTarget(); this.renderBoss(); });
    bus.on('streak', (n: number) => { (this as any)._streak = n; (this as any)._streakAt = Date.now(); this.refreshCore(); });
  }

  command(v: string) {
    const [cmd, ...rest] = v.slice(1).split(' ');
    if (cmd === 'p' || cmd === 'g' || cmd === 'z') { net.send({ t: 'chat', ch: cmd, msg: rest.join(' ') }); return; }
    if (cmd === 'ayuda' || cmd === 'help') { this.panels.open('help'); return; }
    if (cmd === 'novedades' || cmd === 'changelog' || cmd === 'libreta') { openNotebook(); return; }
    if (cmd === 'acampar' || cmd === 'camp') { net.send({ t: 'camp' }); return; }
    if (cmd === 'dev') { net.send({ t: 'chat', ch: 'g', msg: v }); return; }
    if (cmd === 'duelo' || cmd === 'duel') {
      const name = rest.join(' ').trim().toLowerCase();
      const pl = [...S.players.values()].find(p => p.id !== S.myId && p.n.toLowerCase() === name);
      if (!pl) { this.toast('Escribe /duelo NombreDelJugador (debe estar conectado y cerca).', 'info'); return; }
      net.send({ t: 'duel_req', id: pl.id }); return;
    }
    if (cmd === 'intercambio' || cmd === 'trade') {
      const name = rest.join(' ').trim().toLowerCase();
      const pl = [...S.players.values()].find(p => p.id !== S.myId && p.n.toLowerCase() === name);
      if (!pl) { this.toast('Escribe /intercambio NombreDelJugador (debe estar conectado y cerca).', 'info'); return; }
      net.send({ t: 'trade_req', id: pl.id }); return;
    }
    if (cmd === 'ranking' || cmd === 'top') { (this.panels as any).socialTab = 'rank'; this.panels.open('social'); return; }
    if (cmd === 'huir') { net.send({ t: 'flee' }); return; }
    if (cmd === 'pokedex' || cmd === 'dex') { this.panels.open('dex'); return; }
    if (cmd === 'equipo' || cmd === 'team') { this.panels.open('team'); return; }
    if (cmd === 'mochila' || cmd === 'inv') { this.panels.open('inv'); return; }
    if (cmd === 'mapa' || cmd === 'map') { this.panels.open('map'); return; }
    if (cmd === 'pocion' || cmd === 'potion') { (this as any)._usePotion?.(); return; }
    this.toast('Comandos: /g /z /p mensaje · /duelo nombre · /intercambio nombre · /ranking · /acampar · /novedades · /huir · /ayuda', 'info');
  }

  // ------------------------------------------------------------------ entrenador y recursos
  refreshCore() {
    const c = S.core; if (!c) return;
    (this.els.tlp as HTMLImageElement).src = trainerURL(c.look, 3);
    this.els.tlname.textContent = c.name;
    this.els.tllv.textContent = 'NV.' + c.tlvl;
    const a = trainerXpForLevel(c.tlvl), b = trainerXpForLevel(c.tlvl + 1);
    this.els.tlxp.style.width = Math.min(100, (c.txp - a) / Math.max(1, b - a) * 100) + '%';
    this.els.tlxpt.textContent = `EXP ${fmt(c.txp - a)} / ${fmt(b - a)}`;
    const buffs: string[] = [];
    if (c.xpBoost > 0) {
      const s = Math.ceil(c.xpBoost / 1000);
      buffs.push(`<span class="buff-pill xp" title="Potenciador de experiencia: ¡EXP x2 activa durante ${s}s!">⭐ EXP x2 (${s}s)</span>`);
    }
    if (c.incense > 0) {
      const s = Math.ceil(c.incense / 1000);
      buffs.push(`<span class="buff-pill incense" title="Incienso Raro: atracción salvaje aumentada y prob. shiny x3 (${s}s restantes)">🕯 Incienso (${s}s)</span>`);
    }
    if (c.links && c.links.length > 0) {
      const names = c.links.map(l => LINK_MAP[l.id]?.name || l.id).join(', ');
      buffs.push(`<span class="buff-pill link" title="Sinergias Link activas: ${esc(names)}">⚡ ${c.links.length} Link</span>`);
    }
    const bEl = this.els.tlbuffs;
    if (bEl) {
      bEl.innerHTML = buffs.join('');
      bEl.style.display = buffs.length ? 'flex' : 'none';
    }
    const hits: { t: number; d: number }[] = (S as any)._dmgHits || [];
    const nowMs = Date.now();
    const recent = hits.filter(h => nowMs - h.t <= 5000);
    const dps = recent.length ? Math.round(recent.reduce((s, h) => s + h.d, 0) / 5) : 0;
    this.els.res.innerHTML = `
      <span title="Pokédólares"><img src="${iconURL('money')}">${fmt(c.money)}</span>
      <span title="Cristales Rush"><img src="${iconURL('crystal')}">${fmt(c.crystals)}</span>
      <span title="Fragmentos de Jefe"><img src="${iconURL('token')}">${fmt(c.tokens)}</span>
      <span title="Pokédex: capturados"><img src="${iconURL('pokeball')}">${Object.values(c.dex.caught).filter(v => v > 0).length}/${SPECIES_LIST.length}</span>
      ${S.chain && S.chain.n >= 2 ? `<span style="color:#a8e8ff" title="Cadena de capturas consecutivas de ${SPECIES[S.chain.sp]?.name || ''}: probabilidad shiny x${chainShinyMult(S.chain.n).toFixed(1)}">⛓️ ${esc(SPECIES[S.chain.sp]?.name || '')} x${S.chain.n}</span>` : ''}
      ${((this as any)._streak || 0) >= 3 && Date.now() - ((this as any)._streakAt || 0) < 18000 ? `<span class="gold" title="Racha de victorias consecutivas">🔥 x${(this as any)._streak}</span>` : ''}
      ${dps > 0 ? `<span style="color:#ff9470" title="Daño por segundo en vivo · Golpe máx: ${fmt((S as any)._maxHit || 0)}">⚔ ${fmt(dps)}/s</span>` : ''}`;
    this.renderActions();
    this.renderTracker();
    this.lastTeamKey = '';
  }

  // ------------------------------------------------------------------ equipo
  renderTeam() {
    const c = S.core; if (!c) return;
    const slots = teamSlotsFor(c.tlvl);
    const key = S.team.map(t => { const ms = monByUid(t.uid); return `${t.uid}:${t.lvl}:${Math.round(t.hp / t.mhp * 20)}:${t.revive > 0 ? Math.ceil(t.revive / 1000) : -1}:${t.status}:${ms?.nick || ''}:${ms?.fav ? 1 : 0}`; }).join('|') + slots;
    if (key === this.lastTeamKey) return;
    this.lastTeamKey = key;
    let html = '';
    for (let i = 0; i < 6; i++) {
      const t = S.team[i];
      if (!t) { html += `<div class="tslot ${i >= slots ? 'locked' : ''}" data-i="${i}" title="${i >= slots ? 'Se desbloquea con nivel de entrenador' : 'Ranura libre: equipa desde Equipo (T)'}">${i >= slots ? '<span class="muted" style="font-size:11px;margin-bottom:24px">BLOQ.</span>' : '<span class="muted" style="font-size:22px;margin-bottom:20px">+</span>'}</div>`; continue; }
      const ms = monByUid(t.uid); if (!ms) continue;
      const sp = SPECIES[ms.sp];
      const frac = t.mhp ? t.hp / t.mhp : 0;
      const canEvo = (sp.evo || []).some(e => e.level && t.lvl >= e.level);
      const dispName = ms.nick ? `${ms.nick} (${sp.name})` : sp.name;
      const isDanger = t.revive < 0 && frac > 0 && frac < 0.25;
      html += `<div class="tslot ${t.revive >= 0 ? 'fainted' : isDanger ? 'low-hp' : ''}" data-uid="${t.uid}" title="${ms.fav ? '⭐ ' : ''}${esc(dispName)} Nv.${t.lvl} — ${Math.ceil(t.hp)}/${t.mhp} PS${t.status ? ' · ' + STATUS_NAMES[t.status] : ''}">
        <img src="${monURL(ms.sp, ms.shiny, 2)}"><span class="lvl">${t.lvl}</span>${ms.shiny ? '<span class="shiny">✦</span>' : ms.fav ? '<span class="shiny" style="color:#ffd866">★</span>' : ''}${canEvo ? '<span class="evo">EVO</span>' : ''}
        ${t.revive >= 0 ? `<span class="rev">${Math.ceil(t.revive / 1000)}s</span>` : ''}
        <div class="bar hp ${frac < 0.25 ? 'low' : frac < 0.5 ? 'mid' : ''}"><i style="width:${frac * 100}%"></i></div></div>`;
    }
    this.els.team.innerHTML = html;
    this.els.team.querySelectorAll<HTMLElement>('[data-uid]').forEach(d => d.onclick = () => this.panels.openMon(d.dataset.uid!));
    this.els.team.querySelectorAll<HTMLElement>('[data-i]').forEach(d => d.onclick = () => this.panels.open('team'));
  }

  renderActions() {
    const c = S.core; if (!c) return;
    const icons = ['', 'sk_rush', 'sk_heal', 'sk_order', 'sk_dash'];
    let html = SKILLS.map(s => `<button class="skill ${c.tlvl < s.unlock ? 'locked' : ''}" data-sk="${s.n}" data-name="${['', 'Rush', 'Curar', 'Orden', 'Esquiva'][s.n]}" aria-label="${esc(s.name)}" title="${esc(s.name)} [${s.key}${s.n === 4 ? ' / Espacio' : ''}] — ${esc(s.desc)}${c.tlvl < s.unlock ? ' (nivel ' + s.unlock + ')' : ''}">
      <img src="${iconURL(icons[s.n])}" alt=""><span class="k">${s.key}</span><span class="cd" id="cd${s.n}" style="height:0"></span><span class="cdt" id="cdt${s.n}"></span></button>`).join('');
    html += `<div class="ballsel">${BALLS.map(b => `<div class="b ${S.settings.ball === b ? 'sel' : ''}" data-ball="${b}" title="${ITEMS[b].name} (B para cambiar)"><img src="${iconURL(b)}"><span>${c.items[b] || 0}</span></div>`).join('')}</div>
      <button class="btn red throwbtn" id="throw" ${(c.items[S.settings.ball] || 0) < 1 ? 'disabled' : ''} title="Lanzar Ball al objetivo [C] o clic derecho">Lanzar [C]</button>
      <button class="btn green small" id="usepot" ${(c.items.pocion || 0) + (c.items.superpocion || 0) < 1 ? 'disabled' : ''} title="Usar Poción en el equipo [Q]">Poción [Q] (${(c.items.pocion || 0) + (c.items.superpocion || 0)})</button>
      ${(c.items.revivir || 0) > 0 ? `<button class="btn gold small" id="userev" title="Revivir Pokémon debilitados del equipo">Revivir (${c.items.revivir})</button>` : ''}
      <button class="btn gold small" id="usecamp" title="Montar hoguera y descansar [Z] (restaura 60% de PS y revive Pokémon fuera de combate)">🏕 [Z]</button>
      ${(c.items.incienso || 0) > 0 && (c.incense || 0) <= 0 ? `<button class="btn purple small" id="useinc" title="Encender Incienso Raro (atrae Pokémon raros y aumenta probabilidad shiny x3)">🕯 Incienso (${c.items.incienso})</button>` : ''}
      <button class="btn gray small fleebtn" id="flee" title="Huir de los salvajes que te persiguen [F]">Huir [F]</button>
      <div class="stances" title="Modo del equipo [V]">${STANCES.map(s => `<button class="st ${S.me.stance === s.id ? 'on' : ''}" data-st="${s.id}" title="${s.name}: ${esc(s.desc)}"><span>${s.ic}</span><small>${s.name}</small></button>`).join('')}</div>`;
    this.els.actions.innerHTML = html;
    this.lastStance = S.me.stance;
    (this.els.actions.querySelector('#flee') as HTMLElement).onclick = () => net.send({ t: 'flee' });
    const revBtn = this.els.actions.querySelector('#userev') as HTMLElement | null;
    if (revBtn) revBtn.onclick = () => { net.send({ t: 'use', item: 'revivir' }); audio.play('heal', { pitch: 1.25 }); };
    const campBtn = this.els.actions.querySelector('#usecamp') as HTMLElement | null;
    if (campBtn) campBtn.onclick = () => net.send({ t: 'camp' });
    const incBtn = this.els.actions.querySelector('#useinc') as HTMLElement | null;
    if (incBtn) incBtn.onclick = () => { net.send({ t: 'use', item: 'incienso' }); audio.play('sparkle'); };
    // pulsar el modo activo pasa al siguiente (en pantallas estrechas solo se ve el activo)
    this.els.actions.querySelectorAll<HTMLElement>('[data-st]').forEach(b => b.onclick = () => b.dataset.st === S.me.stance ? bus.emit('cycle_stance') : this.setStance(b.dataset.st!));
    this.els.actions.querySelectorAll<HTMLElement>('[data-sk]').forEach(d => d.onclick = () => bus.emit('skill', parseInt(d.dataset.sk!, 10)));
    this.els.actions.querySelectorAll<HTMLElement>('[data-ball]').forEach(d => d.onclick = () => { S.settings.ball = d.dataset.ball!; saveSettings(); audio.play('ui'); this.renderActions(); });
    (this.els.actions.querySelector('#throw') as HTMLElement).onclick = () => bus.emit('throw');
    const usePotion = () => {
      const curC = S.core; if (!curC) return;
      const it = (curC.items.superpocion || 0) > 0 && (!(curC.items.pocion > 0) || S.team.some(t => t.hp < t.mhp * 0.4)) ? 'superpocion' : 'pocion';
      if ((curC.items[it] || 0) > 0) {
        net.send({ t: 'use', item: it });
        audio.play('heal', { pitch: 1.1 });
      } else {
        this.toast('No te quedan pociones disponibles.', 'info');
      }
    };
    (this.els.actions.querySelector('#usepot') as HTMLElement).onclick = usePotion;
    (this as any)._usePotion = usePotion;
  }

  updateCooldowns() {
    for (const s of SKILLS) {
      const cd = S.me.cds[s.n] || 0;
      const bar = document.getElementById('cd' + s.n), txt = document.getElementById('cdt' + s.n);
      if (!bar || !txt) continue;
      bar.style.height = cd > 0 ? Math.min(100, cd / (s.cd * 1000) * 100) + '%' : '0';
      txt.textContent = cd > 0 ? String(Math.ceil(cd / 1000)) : '';
      const node = bar.parentElement!;
      node.classList.toggle('on', s.n === 1 && S.me.rush > 0);
    }
  }

  // ------------------------------------------------------------------ objetivo y jefe
  renderTarget() {
    const f = S.focusInfo;
    const box = this.els.target;
    if (!f || f.flags & 4) { box.style.display = 'none'; return; }
    const sp = SPECIES[f.key];
    const c = S.core;
    const caught = (c?.dex.caught[f.key] || 0) > 0;
    const ballId = S.settings.ball || 'pokeball';
    const key = `${f.id}|${f.hp}|${f.lvl}|${f.flags}|${f.status || 0}|${caught}|${ballId}|${S.me.fight}`;
    box.style.display = 'flex';
    // siempre debajo del recuadro del jugador, crezca lo que crezca (buffs, DPS...)
    const tlr = this.els.tl.getBoundingClientRect(), top = Math.round(tlr.bottom + 8) + 'px';
    if (box.style.top !== top) box.style.top = top;
    if ((box as any)._k === key) return;
    (box as any)._k = key;
    const topLvl = Math.max(1, ...S.team.map(t => t.lvl));
    const levelPenalty = f.lvl > topLvl + 8 ? 0.5 : 1;
    const rate = sp.catchRate * (f.flags & 64 ? 0.4 : 1);
    const rawP = catchChance(rate, (f.flags & 128) ? 0 : f.hp / 100, ITEMS[ballId]?.ballBonus || 1, STATUS_CATCH[f.status || 0] || 1, CATCH_BONUS(c?.upgrades?.catch || 0), levelPenalty, (RARITY_CATCH[sp.rarity] ?? 1) * (f.flags & 8192 ? 0.7 : 1));
    const dexCaught = c ? Object.values(c.dex.caught).filter(v => v > 0).length : 0;
    const critP = critCaptureChance(dexCaught);
    const totPct = Math.round(captureProbability(rawP, critP) * 100);
    const isGymOrPvp = !!(f.flags & (2048 | 16384));
    let bestEff = 1, bestAttacker = '';
    for (const t of S.team) {
      if (t.hp <= 0) continue;
      const ms = monByUid(t.uid); if (!ms) continue;
      const tsp = SPECIES[ms.sp];
      for (const tp of tsp.types) {
        const eff = typeEffect(tp, sp.types);
        if (eff > bestEff || !bestAttacker) { bestEff = eff; bestAttacker = ms.nick || tsp.name; }
      }
    }
    const effTag = bestEff > 1 ? ` <span class="tag" style="background:#1e3a28;color:#68f090;font-size:10px" title="Tu ${esc(bestAttacker)} tiene ventaja elemental (×${bestEff})">⚔ ×${bestEff}</span>` : bestEff < 1 ? ` <span class="tag" style="background:#3a2418;color:#ffb070;font-size:10px" title="Resiste los tipos de tu equipo">⚠ ×${bestEff}</span>` : '';
    const stTag = f.status ? ` <span class="tag" style="background:#3a2048;color:#f0c0ff;font-size:10px">${esc(STATUS_NAMES[f.status] || '')}</span>` : '';
    const tierTag = (f.flags & 64) ? ' <span class="tag" style="background:#5a1820;color:#ffd080;font-size:10px">👑 ALFA</span>' : (f.flags & 8192) ? ' <span class="tag" style="background:#4a3010;color:#ffe060;font-size:10px">⚡ ERRANTE</span>' : '';
    box.innerHTML = `<img src="${monURL(f.key, f.shiny, 2)}"><div class="grow col" style="gap:2px">
      <div class="row" style="justify-content:space-between"><div class="nm">${f.shiny ? '<span class="gold">✦</span> ' : ''}${esc(sp.name)} <span class="muted">Nv.${f.lvl}</span></div>${!isGymOrPvp ? `<span class="row" style="gap:3px"><button class="btn tiny ${S.me.fight ? 'gray' : 'green'}" id="tgt-fight" title="Ordena a tu equipo atacarlo (o doble clic sobre él)">${S.me.fight ? '⚔ Atacando' : '⚔ Luchar'}</button><button class="btn tiny red" id="tgt-throw" title="Probabilidad real con ${esc(ITEMS[ballId]?.name || 'Ball')} (incluye ${Math.round(critP * 100)}% crítico) · Pulsa [C]">◓ ${totPct}%</button></span>` : ''}</div>
      <div>${sp.types.map(t => `<span class="tag" style="background:${TYPE_COLORS[t]}">${TYPE_NAMES[t]}</span>`).join('')} <span class="tag" style="background:${RARITY_COLORS[sp.rarity]};color:#000">${RARITY_NAMES[sp.rarity]}</span>${tierTag}${stTag}${effTag}</div>
      <div class="bar hp ${f.hp < 25 ? 'low' : f.hp < 50 ? 'mid' : ''}"><i style="width:${f.hp}%"></i></div>
      <div class="catch muted">${f.flags & 2048 ? 'Pokémon de líder · Derrota a todo su equipo para ganar la medalla.' : f.flags & 16384 ? 'Pokémon de entrenador rival en duelo PvP.' : `${caught ? '✔ Registrado' : '★ ¡Nuevo!'} · ${f.flags & 128 ? '<b class="gold">¡Agotado! Lanza una Ball</b>' : f.hp <= 15 ? '<b class="gold">¡Debilitado! Pulsa C</b>' : (S.me.fight ? 'Tu equipo lo está atacando. Cuanta menos vida, más fácil capturarlo.' : 'Solo seleccionado: pulsa Luchar o haz doble clic para atacar.')}`}</div></div>`;
    const tb = box.querySelector('#tgt-throw') as HTMLElement | null;
    if (tb) tb.onclick = () => bus.emit('throw');
    const fb = box.querySelector('#tgt-fight') as HTMLElement | null;
    if (fb) fb.onclick = () => bus.emit('fight_target', f.id);
  }

  renderBoss() {
    const sc = this.scene; if (!sc) return;
    let best: any = null, bd = 18;
    for (const v of sc.mons.values()) {
      if (!(v.flags & 4)) continue;
      const d = Math.hypot(v.x - sc.me.x, v.y - sc.me.y);
      if (d < bd) { bd = d; best = v; }
    }
    const box = this.els.boss;
    if (!best) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    const info = S.bosses.find(b => b.id === best.id);
    this.els.bossn.textContent = (info?.name || SPECIES[best.key].name) + '  NV.' + best.lvl;
    this.els.bossh.style.width = best.hp + '%';
    const st: string[] = [];
    if (best.flags & 128) st.push('¡AGOTADO! Lanza una Ball (25 s)');
    else {
      if (best.flags & 512) st.push('Barrera psíquica: -70% daño');
      if (best.status === 4) st.push('Duerme: ¡golpéale fuerte para interrumpir el Descanso!');
      if (best.hp < 30) st.push('¡ENFURECIDO!');
      if (!st.length) st.push('Esquiva las zonas rojas · Escala con jugadores cercanos');
    }
    this.els.bosss.textContent = st.join(' · ');
  }

  // ------------------------------------------------------------------ eventos y misiones
  renderEvents() {
    this.els.events.innerHTML = [...S.events.values()].map(e => {
      const left = Math.max(0, e.end - net.serverNow());
      return `<div class="panel ev live" data-ev="${e.id}" title="${esc(e.desc)}"><b>★ ${esc(e.name)}</b>${e.zone ? `<span>${esc(ZONES[e.zone].name)}</span>` : ''}<span class="muted">${time(left)}</span>${e.waves ? `<span>Oleada ${e.wave}/${e.waves}</span>` : ''}${e.kind === 'invasion' || e.kind === 'portal' ? `<span>${e.left} restantes</span>` : ''}</div>`;
    }).join('');
    this.els.events.querySelectorAll<HTMLElement>('[data-ev]').forEach(d => d.onclick = () => this.panels.open('map'));
  }

  renderTracker() {
    const c = S.core; if (!c) return;
    const min = !!(this as any)._trackerMin;
    const active = QUESTS.filter(q => !c.claimed.includes(q.id)).slice(0, 2);
    const bounties = (c.bounties || []).slice(0, 1);
    const readyQ = QUESTS.some(q => !c.claimed.includes(q.id) && statValueClient(q.stat) >= q.n) || (c.bounties || []).some((b: any) => b.prog >= b.n);
    const readyExp = (c.expeditions || []).some((e: any) => net.serverNow() >= e.end);
    const readyEvo = S.team.some(t => { const ms = monByUid(t.uid); return ms && (SPECIES[ms.sp]?.evo || []).some(e => e.level && t.lvl >= e.level); });
    const badgeMap: Record<string, boolean> = { quests: readyQ, exp: readyExp, team: readyEvo };
    this.els.menubar.querySelectorAll<HTMLElement>('[data-open]').forEach(b => {
      const id = b.dataset.open!;
      b.style.borderColor = badgeMap[id] ? '#ffd866' : '';
    });
    let html = `<div class="row" style="justify-content:space-between;cursor:pointer" id="trk-head"><h4 style="margin:0">Misiones · J${readyQ ? ' <span class="gold">●</span>' : ''}</h4><span class="muted" style="font-size:11px">${min ? '▸' : '▾'}</span></div>`;
    if (!min) {
      for (const q of active) {
        const v = statValueClient(q.stat), done = v >= q.n;
        html += `<div class="q ${done ? 'done' : ''}">${done ? '✔ ' : ''}${esc(q.name)} <span class="muted">${Math.min(v, q.n)}/${q.n}</span>${done ? ` <button class="btn tiny green" data-q="${q.id}">Cobrar</button>` : ''}<div class="bar xp"><i style="width:${Math.min(100, v / q.n * 100)}%"></i></div></div>`;
      }
      for (const b of bounties) {
        const done = b.prog >= b.n;
        html += `<div class="q ${done ? 'done' : ''}">⚑ ${esc(b.desc)} <span class="muted">${Math.min(b.prog, b.n)}/${b.n}</span>${done ? ` <button class="btn tiny green" data-b="${b.id}">Cobrar</button>` : ''}<div class="bar xp"><i style="width:${Math.min(100, b.prog / b.n * 100)}%"></i></div></div>`;
      }
    }
    this.els.tracker.innerHTML = html;
    const th = this.els.tracker.querySelector('#trk-head') as HTMLElement | null;
    if (th) th.onclick = () => { (this as any)._trackerMin = !min; this.renderTracker(); };
    this.els.tracker.querySelectorAll<HTMLElement>('[data-q]').forEach(b => b.onclick = () => { net.send({ t: 'quest', id: b.dataset.q }); audio.play('quest'); });
    this.els.tracker.querySelectorAll<HTMLElement>('[data-b]').forEach(b => b.onclick = () => { net.send({ t: 'bounty', id: b.dataset.b }); audio.play('quest'); });
  }

  // ------------------------------------------------------------------ minimapa
  drawMinimap() {
    const sc = this.scene; if (!sc) return;
    const cv = this.els.mmc as HTMLCanvasElement;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const R = 42, S2 = 2;
    const cx = Math.floor(sc.me.x), cy = Math.floor(sc.me.y);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 168, 168);
    if (S.zone === 21) { ctx.fillStyle = '#2a2018'; ctx.fillRect(40, 52, 88, 64); ctx.fillStyle = '#f2d28b'; ctx.fillRect(81, 81, 6, 6); return; }
    ctx.drawImage(this.overview, cx - R, cy - R, R * 2, R * 2, 0, 0, R * 2 * S2, R * 2 * S2);
    const toM = (x: number, y: number) => [(x - cx + R) * S2, (y - cy + R) * S2];
    for (const t of this.world.towns) { const [x, y] = toM(t.x + t.w / 2, t.y + t.h / 2); ctx.fillStyle = '#fff8'; ctx.fillRect(x - 2, y - 2, 4, 4); }
    for (const v of sc.mons.values()) {
      if (v.dead || !(v.flags & 2)) continue;
      const [x, y] = toM(v.x, v.y);
      if (v.shiny) {
        const pulse = 1 + Math.sin(performance.now() / 140) * 0.35;
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x - 2.5 * pulse, y - 2.5 * pulse, 5 * pulse, 5 * pulse);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      } else if (v.flags & 4) { ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 3, y - 3, 6, 6); }
      else if (v.flags & 1) { ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 2, y - 2, 4, 4); }
      else if (v.flags & 16) { ctx.fillStyle = '#c070ff'; ctx.fillRect(x - 1.5, y - 1.5, 3, 3); }
      else { ctx.fillStyle = '#e06060'; ctx.fillRect(x - 1, y - 1, 2, 2); }
      if (v.id === S.me.focus) {
        ctx.strokeStyle = S.me.fight ? '#ff4040' : '#60d8ff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 3.5, y - 3.5, 7, 7);
      }
    }
    for (const b of S.bosses) { if (!b.alive) continue; const [x, y] = toM(b.x, b.y); if (x < 0 || y < 0 || x > 168 || y > 168) continue; ctx.strokeStyle = '#ff3030'; ctx.strokeRect(x - 4, y - 4, 8, 8); }
    for (const e of S.events.values()) { if (!e.x) continue; const [x, y] = toM(e.x, e.y); ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(Math.max(4, Math.min(164, x)), Math.max(4, Math.min(164, y)), 4, 0, 7); ctx.fill(); }
    for (const p of sc.players.values()) { const [x, y] = toM(p.x, p.y); const meta = S.players.get(p.id); ctx.fillStyle = S.party.id && meta?.party === S.party.id ? '#60f0ff' : '#ffffff'; ctx.fillRect(x - 2, y - 2, 4, 4); }
    if (S.route && S.route.length > 1) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pts = S.route.filter((_, i) => i % 2 === 0 || i === S.route!.length - 1);
      for (const [w, c] of [[4, '#2a1a00aa'], [2, '#ffd860']] as const) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.setLineDash(w === 2 ? [4, 3] : []); ctx.lineDashOffset = -performance.now() / 90;
        ctx.beginPath(); const [x0, y0] = toM(sc.me.x, sc.me.y); ctx.moveTo(x0, y0);
        for (const p of pts) { const [x, y] = toM(p.x, p.y); ctx.lineTo(x, y); }
        ctx.stroke();
      }
      ctx.restore();
    }
    if (S.waypoint) { const [x, y] = toM(S.waypoint.x, S.waypoint.y); ctx.strokeStyle = '#ffe5a4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Math.max(5, Math.min(163, x)), Math.max(5, Math.min(163, y)), 4, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ffe040'; ctx.fillRect(R * S2 - 3, R * S2 - 3, 6, 6); ctx.strokeStyle = '#000'; ctx.strokeRect(R * S2 - 3.5, R * S2 - 3.5, 7, 7);
  }

  zoneBanner(z: number) {
    const zd = ZONES[z]; if (!zd) return;
    const me = this.scene?.me;
    const room = z === 21 && me ? this.world.rooms.find(r => me.x >= r.x && me.x < r.x + r.w && me.y >= r.y && me.y < r.y + r.h) : null;
    const name = room ? room.name : zd.name;
    this.els.zn.textContent = name;
    this.els.zbt.textContent = name.toUpperCase();
    this.els.zbs.textContent = room ? 'Interior · Habla con todos' : zd.kind === 'town' ? 'Zona segura · Entra en las casas, el Centro y la Tienda' : zd.kind === 'ocean' ? '' : `Pokémon de nivel ${zd.lvl[0]}-${zd.lvl[1]}${zd.minLevel ? ` · Recomendado entrenador ${zd.minLevel}+` : ''}`;
    this.els.zb.classList.add('show');
    clearTimeout((this as any)._zb);
    (this as any)._zb = setTimeout(() => this.els.zb.classList.remove('show'), 2600);
  }

  // ------------------------------------------------------------------ chat
  addChat(m: any) {
    const ch = m.ch === 'sys' ? 'sys' : m.ch;
    const html = ch === 'sys' ? `<div class="sys">${esc(m.msg)}</div>` : `<div class="${ch}"><span class="from">${ch === 'p' ? '[G] ' : ch === 'z' ? '[Z] ' : ''}${esc(m.from)}:</span> ${esc(m.msg)}</div>`;
    this.chatLog.push({ ch, html });
    if (this.chatLog.length > 150) this.chatLog.shift();
    this.renderChat();
    if (ch === 'p' && m.fid !== S.myId) audio.play('ui');
  }
  renderChat() {
    const log = this.els.clog;
    const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 20;
    log.innerHTML = this.chatLog.filter(l => l.ch === 'sys' || this.chatCh === 'g' || l.ch === this.chatCh).map(l => l.html).join('');
    if (atBottom) log.scrollTop = log.scrollHeight;
  }

  // ------------------------------------------------------------------ notificaciones
  toast(text: string, kind = 'info') {
    const t = el('div', `panel toast ${kind}`); t.textContent = text;
    this.els.toasts.prepend(t);
    while (this.els.toasts.children.length > 6) this.els.toasts.lastChild!.remove();
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, kind === 'bad' ? 3500 : 4500);
    if (kind === 'bad') audio.play('error');
  }

  inviteToast(from: number, name: string) {
    const t = el('div', 'panel toast live shiny');
    t.innerHTML = `<b>${esc(name)}</b> te invita a su grupo. <button class="btn tiny green">Aceptar</button> <button class="btn tiny red">No</button>`;
    const [a, b] = t.querySelectorAll('button');
    (a as HTMLElement).onclick = () => { net.send({ t: 'accept', id: from }); t.remove(); };
    (b as HTMLElement).onclick = () => { net.send({ t: 'decline', id: from }); t.remove(); };
    this.els.toasts.prepend(t);
    audio.play('quest');
    setTimeout(() => t.remove(), 60000);
  }

  onCaught(m: any) {
    const sp = SPECIES[m.mon.sp];
    S.chain = S.chain && S.chain.sp === m.mon.sp ? { sp: m.mon.sp, n: S.chain.n + 1 } : { sp: m.mon.sp, n: 1 };
    this.refreshCore();
    const d = el('div', 'panel cream capture-pop live');
    d.innerHTML = `<div style="font-family:var(--title);font-size:12px;color:#c03030">¡ATRAPADO!</div><img src="${monURL(m.mon.sp, m.mon.shiny, 3)}"><div style="font-size:18px">${m.mon.shiny ? '✦ ' : ''}${esc(sp.name)} <span style="color:#776">Nv.${m.mon.lvl}</span></div>
      <div style="font-size:13px;color:#554">${m.first ? '¡Nuevo registro en la Pokédex! · ' : ''}${m.equipped ? 'Añadido al equipo' : 'Enviado a la caja (T para equipar)'}${S.chain.n >= 2 ? `<br><b style="color:#1e6898">⛓️ Cadena x${S.chain.n} (Shiny x${chainShinyMult(S.chain.n).toFixed(1)})</b>` : ''}</div>`;
    this.root.appendChild(d);
    d.onclick = () => this.panels.openMon(m.mon.uid);
    setTimeout(() => { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 500); }, 2800);
  }

  levelUp(m: any) {
    audio.play('tlevel');
    bus.emit('player_lvl');
    const d = el('div', 'levelup');
    d.innerHTML = `<div class="big">¡NIVEL ${m.lvl}!</div><div class="sm">Entrenador más fuerte: +PS${m.unlocks.length ? '<br>' + m.unlocks.map(esc).join('<br>') : ''}</div>`;
    this.root.appendChild(d);
    setTimeout(() => { d.style.transition = 'opacity .6s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 600); }, 3200);
  }

  loot(m: any) {
    audio.play(m.kind === 'quest' ? 'quest' : 'chest');
    const d = el('div', 'panel loot');
    const title = m.title || (m.kind === 'chest' ? 'Cofre' : m.kind === 'item' ? 'Objeto encontrado' : 'Recompensa');
    d.innerHTML = `<h4>${esc(title)}</h4><div class="loot-grid">${(m.lines || []).map((l: string) => lootTile(l)).join('')}</div><div style="text-align:right;margin-top:8px"><button class="btn small">OK</button></div>`;
    (d.querySelector('button') as HTMLElement).onclick = () => d.remove();
    this.root.appendChild(d);
    setTimeout(() => d.remove(), m.kind === 'item' ? 2200 : 4500);
  }

  setStance(id: string) {
    const st = STANCES.find(s => s.id === id); if (!st) return;
    S.me.stance = id; net.send({ t: 'stance', s: id });
    this.renderActions(); audio.play('ui');
    this.toast(`Modo del equipo: ${st.name}. ${st.desc}`, 'info');
  }

  /** Tarjeta de encuentro sorpresa: luchar, capturar o huir. */
  encCard(id: number, aggro: boolean) {
    const sc = this.scene; const v = sc?.mons.get(id); if (!v) return;
    const sp = SPECIES[v.key];
    const box = this.els.enc;
    const caught = (S.core?.dex.caught[v.key] || 0) > 0;
    box.innerHTML = `<img src="${monURL(v.key, v.shiny, 2)}" alt=""><div class="grow"><small>${aggro ? '¡TE ATACA!' : 'ENCUENTRO SALVAJE'}</small>
      <b>${v.shiny ? '✦ ' : ''}${esc(sp.name)} <span class="muted">Nv.${v.lvl}</span></b>
      <div>${sp.types.map(t => `<span class="tag" style="background:${TYPE_COLORS[t]}">${TYPE_NAMES[t]}</span>`).join('')}${aggro ? '<span class="tag aggro">Agresivo</span>' : ''}${v.tier?.label ? `<span class="tag" style="background:${v.tier.color};color:#1a1220">${esc(v.tier.label)}</span>` : ''}${caught ? '' : '<span class="tag new">¡Nuevo!</span>'}</div></div>
      <div class="enc-actions"><button class="btn small red" data-e="fight">Luchar</button><button class="btn small" data-e="catch">Capturar [C]</button><button class="btn small gray" data-e="flee">Huir [F]</button></div>`;
    box.hidden = false; box.classList.toggle('aggro', aggro);
    box.querySelectorAll<HTMLElement>('[data-e]').forEach(b => b.onclick = () => {
      const e = b.dataset.e;
      if (e === 'fight') bus.emit('fight_target', id);
      else if (e === 'catch') { bus.emit('select_target', id); bus.emit('throw'); }
      else net.send({ t: 'flee' });
      if (e !== 'catch') this.hideEnc();
    });
    clearTimeout(this.encTimer); this.encTimer = setTimeout(() => this.hideEnc(), 7000);
    this.encId = id;
  }
  hideEnc() { this.els.enc.hidden = true; this.encId = 0; }
  encTimer: any = 0; encId = 0; lastStance = ''; lastWx = '';

  /** Anuncio a pantalla completa cuando aparece (o se captura) un legendario o mítico. */
  legendBanner(key: string, shiny: boolean, sub: string, caught: boolean) {
    const sp = SPECIES[key]; if (!sp) return;
    const b = this.els.legend;
    const title = caught ? (shiny ? '✦ ¡SHINY LEGENDARIO CAPTURADO! ✦' : '¡LEGENDARIO CAPTURADO!') : shiny ? '✦ ¡UN SHINY LEGENDARIO HA APARECIDO! ✦' : sp.rarity === 'mythic' ? '¡UN POKÉMON MÍTICO HA APARECIDO!' : '¡UN POKÉMON LEGENDARIO HA APARECIDO!';
    b.className = 'legend-banner ' + (shiny ? 'shiny' : sp.rarity);
    b.innerHTML = `<div class="rays"></div><div class="lb-in"><small>${esc(title)}</small><img src="${monURL(key, shiny, 4)}" alt=""><h2>${esc(sp.name)}</h2><p>${esc(sub)}</p></div>`;
    b.hidden = false;
    audio.play(caught ? 'evodone' : 'shiny');
    clearTimeout((this as any)._lb); (this as any)._lb = setTimeout(() => { b.hidden = true; }, caught ? 4200 : 5200);
  }

  bigText(text: string, color: string) {
    const d = el('div', 'levelup'); d.innerHTML = `<div class="big" style="color:${color}">${esc(text)}</div>`;
    this.root.appendChild(d);
    setTimeout(() => { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 500); }, 1300);
  }

  duelInvite(m: any) {
    const t = el('div', 'panel toast live shiny');
    t.innerHTML = `⚔ <b>${esc(m.name)}</b> (Nv.${m.lvl}, Elo ${m.elo}) te reta a un duelo. <button class="btn tiny green">Aceptar</button> <button class="btn tiny red">No</button>`;
    const [a, b] = t.querySelectorAll('button');
    (a as HTMLElement).onclick = () => { net.send({ t: 'duel_accept', id: m.from }); t.remove(); };
    (b as HTMLElement).onclick = () => { net.send({ t: 'duel_decline', id: m.from }); t.remove(); };
    this.els.toasts.prepend(t);
    audio.play('quest');
    setTimeout(() => t.remove(), 45000);
  }

  tradeInvite(m: any) {
    const t = el('div', 'panel toast live shiny');
    t.innerHTML = `⇄ <b>${esc(m.name)}</b> quiere intercambiar Pokémon contigo. <button class="btn tiny green">Aceptar</button> <button class="btn tiny red">No</button>`;
    const [a, b] = t.querySelectorAll('button');
    (a as HTMLElement).onclick = () => { net.send({ t: 'trade_accept', id: m.from }); t.remove(); };
    (b as HTMLElement).onclick = () => { net.send({ t: 'trade_decline', id: m.from }); t.remove(); };
    this.els.toasts.prepend(t);
    audio.play('quest');
    setTimeout(() => t.remove(), 60000);
  }

  showDaily(m: any) {
    if (!m) return;
    audio.play('quest');
    this.loot({
      kind: 'quest',
      title: `🎁 ¡Recompensa Diaria · Día ${m.day}/7 (Racha x${m.streak})!`,
      lines: [...(m.lines || []), 'Vuelve mañana para mejorar tu racha de 7 días (consulta el calendario en Misiones [J]).'],
    });
  }

  renderDuel() {
    const box = this.els.duelhud, d = S.duel;
    box.hidden = !d;
    if (!d) return;
    const now = net.serverNow();
    const mine = S.team.filter(t => t.revive < 0 && t.hp > 0).length;
    const sc = this.scene;
    const theirs = sc ? [...sc.mons.values()].filter((v: any) => v.flags & 16384 && !v.dead).length : 0;
    const left = d.go ? time(d.end - now) : 'Empieza en ' + Math.max(0, Math.ceil((d.goAt - now) / 1000));
    box.innerHTML = `<b>⚔ DUELO</b><span>Tú <strong>${mine}</strong> · <strong>${theirs}</strong> ${esc(d.opName)}</span><span class="muted">Elo ${d.elo} vs ${d.opElo}</span><strong>${left}</strong>`;
  }

  dialogEnd: (() => void) | null = null;
  dialog(name: string, lines: string[], onEnd?: () => void) {
    this.dialogName = name; this.dialogQueue = [...lines];
    this.dialogEnd = onEnd || null;
    this.showDialogLine();
  }
  showDialogLine() {
    document.getElementById('dlg')?.remove();
    if (!this.dialogQueue.length) { const f = this.dialogEnd; this.dialogEnd = null; f?.(); return; }
    const d = el('div', 'panel cream dialog live'); d.id = 'dlg';
    d.innerHTML = `<div class="who">${esc(this.dialogName)}</div><div>${esc(this.dialogQueue[0])}</div><div class="more">▼</div>`;
    d.onclick = () => this.nextDialog();
    this.root.appendChild(d);
    audio.play('ui');
  }
  nextDialog() { this.dialogQueue.shift(); this.showDialogLine(); }
  closeDialog() { this.dialogQueue = []; document.getElementById('dlg')?.remove(); const f = this.dialogEnd; this.dialogEnd = null; f?.(); }

  // ------------------------------------------------------------------ bucle
  tick() {
    const c = S.core; if (!c) return;
    const hp = S.me.hp, mhp = S.me.mhp || 1;
    this.els.tlhp.style.width = Math.max(0, hp / mhp * 100) + '%';
    this.els.tlhp.parentElement!.className = 'bar hp ' + (hp / mhp < 0.25 ? 'low' : hp / mhp < 0.5 ? 'mid' : '');
    this.updateCooldowns();
    this.els.netping.textContent = net.open ? net.ping + ' ms' : 'desconectado';
    (this.els.netdot as HTMLElement).style.background = !net.open ? '#e44' : net.ping < 120 ? '#4c4' : net.ping < 250 ? '#ec4' : '#e84';
    this.els.online.textContent = `${S.players.size} online`;
    const h = ((net.serverNow() % (20 * 60000)) / (20 * 60000)) * 24;
    const now = net.serverNow(), zd = ZONES[S.zone] || ZONES[0], se = seasonAt(now), we = weatherAt(zd.id, now, zd.kind);
    this.els.clock.textContent = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')} ${h >= 6 && h < 19.5 ? 'Día' : 'Noche'} · ${SEASON_ICONS[se]} ${SEASON_NAMES[se]} · ${WEATHER_ICONS[we]} ${WEATHER_NAMES[we]}`;
    this.els.clock.title = `Estación: ${SEASON_NAMES[se]} (cambia en ${time(seasonLeft(now))}). El clima y la estación cambian qué Pokémon aparecen.`;
    const wk = `${zd.id}|${we}|${se}`;
    if (this.lastWx && wk !== this.lastWx && zd.kind === 'wild') {
      const [lz, lw, ls] = this.lastWx.split('|');
      if (ls !== se) this.toast(`${SEASON_ICONS[se]} ¡Llega ${SEASON_NAMES[se].toLowerCase() === 'otoño' ? 'el otoño' : SEASON_NAMES[se].toLowerCase() === 'invierno' ? 'el invierno' : SEASON_NAMES[se].toLowerCase() === 'verano' ? 'el verano' : 'la primavera'}! Aparecen otras especies.`, 'shiny');
      else if (Number(lz) === zd.id && lw !== we) this.toast(`${WEATHER_ICONS[we]} ${WEATHER_HINTS[we]}`, 'info');
    }
    this.lastWx = wk;
    if (S.events.size) this.renderEvents();
    this.panels.tick();
    this.guide.tick();
    this.renderDuel();
    if (S.me.stance !== this.lastStance) this.renderActions();
    if (this.encId && !this.scene?.mons.get(this.encId)) this.hideEnc();
    const chased = this.scene ? [...this.scene.mons.values()].some((v: any) => v.flags & 4096 && !v.dead && Math.hypot(v.x - this.scene.me.x, v.y - this.scene.me.y) < 8) : false;
    document.getElementById('flee')?.classList.toggle('hot', chased);
    const gymBox = document.getElementById('gym-status')!;
    gymBox.hidden = !S.gym;
    if (S.gym) gymBox.innerHTML = `<b>✦ ${GYMS[S.gym.id].leader}</b><span>${S.gym.total - S.gym.left}/${S.gym.total} rivales vencidos</span><strong>${time(S.gym.end - net.serverNow())}</strong>`;
  }
}

export { monXpForLevel, LINK_MAP };
