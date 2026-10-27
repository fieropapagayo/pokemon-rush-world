// Acciones de jugador validadas por el servidor (economía, equipo, evoluciones, misiones, social...).
import { dist, clamp } from '../../shared/constants';
import { SPECIES, STARTERS, FAMILIES } from '../../shared/species';
import { ITEMS } from '../../shared/items';
import { ZONES } from '../../shared/zones';
import { TYPE_NAMES, TYPES, PType } from '../../shared/types';
import {
  UPGRADE_MAP, upgradeCost, QUEST_MAP, QUESTS, EXPEDITION_MAP, teamSlotsFor, monXpForLevel, candyCostForLevel, transferCandies, Reward, MAX_LEVEL, evoCandyCost,
} from '../../shared/progression';
import type { Game } from '../world/game';
import { isNight, coreOf } from '../world/game';
import { PlayerSession, Party, MonEntity } from '../world/entities';
import { createMon, familyComplete, Bounty, newUid } from './save';
import { ENV } from '../env';
import { pickEncounter, rollShiny, ROAMERS } from '../../shared/encounters';
import { BAL } from '../../shared/balance';
import { RESEARCH, researchProgress, researchClaimId } from '../../shared/research';

export const TOKEN_SHOP: Record<string, number> = { masterball: 30, caramelo_raro: 3, incienso: 4, cable_link: 6 };

const str = (v: any, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v: any, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), a, b) : a);

export function handle(g: Game, p: PlayerSession, msg: any) {
  const now = g.now;
  switch (msg.t) {
    case 'mv': {
      const x = Number(msg.x), y = Number(msg.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      g.onMove(p, x, y, int(msg.d, 0, 3), !!msg.m, int(msg.s, 0, 1e9));
      return;
    }
    case 'tgt': {
      const m = g.mons.get(int(msg.id, 0, 1e9));
      const op = g.duels.opponent(p);
      p.focus = m && m.alive && (m.wild || (op && m.owner === op)) ? m : null;
      p.focusFight = !!p.focus && (!!msg.fight || !!op);
      return;
    }
    case 'throw': g.throwBall(p, int(msg.id, 0, 1e9), str(msg.ball, 20)); return;
    case 'skill': g.useSkill(p, int(msg.n, 1, 4), Number(msg.dx) || 0, Number(msg.dy) || 0); return;
    case 'pickup': g.openPickup(p, int(msg.id, 0, 1e6)); return;
    case 'heal': return heal(g, p);
    case 'camp': return camp(g, p);
    case 'travel': return travel(g, p, int(msg.town, 0, 100));
    case 'portal': return portal(g, p, int(msg.id, 0, 100));
    case 'starter': return starter(g, p, str(msg.sp, 20), msg.look);
    case 'look': p.save.look = sanitizeLook(msg.look); g.broadcastMeta(p); p.dirtyCore = true; return;
    case 'team': return setTeam(g, p, msg.uids);
    case 'evolve': return evolve(g, p, str(msg.uid, 20), str(msg.to, 20));
    case 'use': return useItem(g, p, str(msg.item, 30), str(msg.uid, 20));
    case 'buy': return buy(g, p, str(msg.item, 30), int(msg.qty, 1, 99), !!msg.tokens);
    case 'upgrade': return upgrade(g, p, str(msg.id, 30));
    case 'transfer': return transfer(g, p, Array.isArray(msg.uids) ? msg.uids.slice(0, 200).map((u: any) => str(u, 20)) : []);
    case 'feed': return feed(g, p, str(msg.uid, 20));
    case 'exp_start': return expStart(g, p, str(msg.id, 20), Array.isArray(msg.uids) ? msg.uids.slice(0, 3).map((u: any) => str(u, 20)) : []);
    case 'exp_claim': return expClaim(g, p, int(msg.slot, 0, 5));
    case 'quest': return questClaim(g, p, str(msg.id, 10));
    case 'research': return researchClaim(g, p, str(msg.id, 10));
    case 'bounty': return bountyClaim(g, p, str(msg.id, 20));
    case 'chat': return chat(g, p, str(msg.ch, 2), str(msg.msg, 200));
    case 'emote': {
      if (now - p.chatAt < 600) return;
      p.chatAt = now;
      g.emit(p.x, p.y, ['em', p.id, int(msg.e, 0, 9)]);
      return;
    }
    case 'invite': return invite(g, p, int(msg.id, 0, 1e9));
    case 'joinreq': return joinRequest(g, p, str(msg.name, 16));
    case 'join_ok': return joinAccept(g, p, int(msg.id, 0, 1e9));
    case 'accept': return accept(g, p, int(msg.id, 0, 1e9));
    case 'decline': p.invites.delete(int(msg.id, 0, 1e9)); return;
    case 'leave': return leaveParty(g, p);
    case 'inspect': return inspect(g, p, int(msg.id, 0, 1e9));
    case 'ping': p.send({ t: 'pong', c: msg.c, s: now }); return;
    case 'gym': g.gyms.challenge(p, int(msg.id, 0, 20)); return;
    case 'trade_req': g.trades.request(p, int(msg.id, 0, 1e9)); return;
    case 'trade_accept': g.trades.accept(p, int(msg.id, 0, 1e9)); return;
    case 'trade_decline': g.trades.reqs.get(p.id)?.delete(int(msg.id, 0, 1e9)); return;
    case 'trade_offer': g.trades.offer(p, Array.isArray(msg.uids) ? msg.uids.slice(0, 6).map((u: any) => str(u, 20)) : [], int(msg.money, 0, 1e12)); return;
    case 'trade_ready': g.trades.ready(p, !!msg.on); return;
    case 'trade_cancel': g.trades.cancel(p, `${p.name} ha cancelado el intercambio.`); return;
    case 'sell': return sell(g, p, str(msg.item, 30), int(msg.qty, 1, 999));
    case 'nick': return nick(g, p, str(msg.uid, 20), str(msg.name, 24));
    case 'fav': { const ms = p.monSave(str(msg.uid, 20)); if (ms) { ms.fav = !ms.fav; p.dirtyMons = true; } return; }
    case 'rank': p.send({ t: 'rank', data: g.ranking.get() }); return;
    case 'stance': g.setStance(p, str(msg.s, 12)); return;
    case 'flee': g.flee(p); return;
    case 'duel_req': g.duels.request(p, int(msg.id, 0, 1e9)); return;
    case 'duel_accept': g.duels.accept(p, int(msg.id, 0, 1e9)); return;
    case 'duel_decline': { const from = int(msg.id, 0, 1e9); g.duels.reqs.get(p.id)?.delete(from); g.players.get(from)?.send({ t: 'note', text: `${p.name} ha rechazado el duelo.`, kind: 'info' }); return; }
    case 'duel_top': p.send({ t: 'duel_top', list: g.duels.top() }); return;
    case 'gift': return gift(g, p, int(msg.id, 0, 1e6));
  }
}

function sell(g: Game, p: PlayerSession, item: string, qty: number) {
  const def = ITEMS[item];
  if (!def || !def.price) return g.notify(p, 'Ese objeto no se puede vender.', 'bad');
  if (ZONES[p.zone].kind !== 'town') return g.notify(p, 'Solo puedes vender dentro de un pueblo.', 'bad');
  const have = p.save.items[item] || 0;
  qty = Math.min(qty, have);
  if (qty <= 0) return;
  const gain = Math.floor(def.price * 0.5) * qty;
  p.save.items[item] -= qty; p.save.money += gain;
  p.dirtyCore = true;
  g.notify(p, `Vendido: ${def.name} x${qty} por ${gain} ₽.`, 'good');
}

const NICK_RE = /[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\-']/g;
function nick(g: Game, p: PlayerSession, uid: string, name: string) {
  const ms = p.monSave(uid); if (!ms) return;
  const clean = name.replace(NICK_RE, '').trim().slice(0, 12);
  ms.nick = clean || undefined;
  p.dirtyMons = true;
}

/** Recompensa diaria con racha de 7 días. */
const DAILY: { money?: number; crystals?: number; tokens?: number; items?: Record<string, number> }[] = [
  { money: 300, items: { pokeball: 5 } },
  { money: 500, items: { pocion: 3 } },
  { crystals: 3, items: { superball: 3 } },
  { money: 800, items: { revivir: 1 } },
  { crystals: 5, items: { ultraball: 2 } },
  { money: 1000, items: { caramelo_raro: 1 } },
  { crystals: 10, tokens: 2, items: { incienso: 1 } },
];
export function checkDaily(g: Game, p: PlayerSession) {
  const d = p.save.daily;
  const today = new Date().toLocaleDateString('sv-SE');
  if (d.last === today) return;
  const y = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
  d.streak = d.last === y ? d.streak + 1 : 1;
  d.last = today;
  const day = ((d.streak - 1) % 7);
  const r = DAILY[day];
  const scale = 1 + p.save.tlvl / 10;
  const lines: string[] = [];
  if (r.money) { const m = Math.round(r.money * scale); p.save.money += m; lines.push(`${m} ₽`); }
  if (r.crystals) { p.save.crystals += r.crystals; lines.push(`${r.crystals} Cristales Rush`); }
  if (r.tokens) { p.save.tokens += r.tokens; lines.push(`${r.tokens} Fragmentos de Jefe`); }
  for (const [k, n] of Object.entries(r.items || {})) { p.save.items[k] = (p.save.items[k] || 0) + n; lines.push(`${ITEMS[k].name} x${n}`); }
  p.dirtyCore = true;
  p.send({ t: 'daily', streak: d.streak, day: day + 1, lines, table: DAILY.map((x, i) => ({ day: i + 1, ...x })) });
}

export function sanitizeLook(l: any) {
  return { hat: int(l?.hat, 0, 7), shirt: int(l?.shirt, 0, 7), skin: int(l?.skin, 0, 3), hair: int(l?.hair, 0, 5) };
}

function starter(g: Game, p: PlayerSession, sp: string, look: any) {
  if (p.save.mons.length > 0 || !STARTERS.includes(sp)) return;
  const m = createMon(sp, 5, false, 1, [10 + rand(6), 10 + rand(6), 10 + rand(6), 10 + rand(6)]);
  m.fr = 90;
  p.save.mons.push(m);
  p.save.team = [m.uid];
  p.save.dex.seen[sp] = 1; p.save.dex.caught[sp] = 1;
  p.save.look = sanitizeLook(look);
  g.rebuildTeam(p);
  ensureBounties(p);
  p.dirtyMons = true; p.dirtyCore = true;
  g.broadcastMeta(p);
  p.send({ t: 'starter_ok', mon: m });
}

function rand(n: number) { return Math.floor(Math.random() * n); }

/** Regalo único de un vecino (dentro de las casas). */
function gift(g: Game, p: PlayerSession, npcId: number) {
  const npc: any = g.world.npcs.find(n => n.id === npcId);
  if (!npc || !npc.gift || dist(p.x, p.y, npc.x + 0.5, npc.y + 0.5) > 5.5) return; // pasean hasta 2 casillas de su sitio
  const id = 'gift_' + npc.id;
  if (p.save.claimed.includes(id)) return;
  p.save.claimed.push(id);
  const lines: string[] = [];
  if (npc.gift.money) { p.save.money += npc.gift.money; lines.push(`${npc.gift.money} ₽`); }
  if (npc.gift.crystals) { p.save.crystals += npc.gift.crystals; lines.push(`${npc.gift.crystals} Cristales Rush`); }
  for (const [k, n] of Object.entries((npc.gift.items || {}) as Record<string, number>)) { if (!ITEMS[k]) continue; p.save.items[k] = (p.save.items[k] || 0) + n; lines.push(`${ITEMS[k].name} x${n}`); }
  p.dirtyCore = true;
  p.send({ t: 'loot', kind: 'quest', title: 'Regalo de ' + npc.name, lines });
}

function heal(g: Game, p: PlayerSession) {
  const nurse = g.world.npcs.find(n => n.role === 'nurse' && dist(p.x, p.y, n.x + 0.5, n.y + 0.5) < 3.2);
  const town = (nurse && g.world.towns.find(t => t.id === nurse.town)) || g.world.towns.find(t => dist(p.x, p.y, t.heal.x + 0.5, t.heal.y + 0.5) < 3.5 || dist(p.x, p.y, t.heal.x + 2.5, t.heal.y + 1) < 3);
  if (!town) return g.notify(p, 'Acércate a la puerta del Centro Pokémon.', 'bad');
  g.healTeam(p, 1, true);
  p.hp = p.maxHp;
  p.save.lastTown = town.id;
  if (!p.save.towns.includes(town.id)) { p.save.towns.push(town.id); g.notify(p, `${town.name} añadido a los destinos de viaje rápido.`, 'good'); }
  p.dirtyCore = true;
  g.emit(p.x, p.y, ['x', 'heal', p.id]);
  p.send({ t: 'healed', town: town.id });
}

function camp(g: Game, p: PlayerSession) {
  if (p.hp <= 0) return g.notify(p, 'Estás debilitado.', 'bad');
  if (p.duelId) return g.notify(p, 'No puedes acampar durante un duelo.', 'bad');
  const r = g.canCamp(p);
  if (r) return g.notify(p, r, 'info');
  g.makeCamp(p);
}

function travel(g: Game, p: PlayerSession, townId: number) {
  const town = g.world.towns.find(t => t.id === townId);
  if (!town || !p.save.towns.includes(townId)) return g.notify(p, 'Aún no has visitado el Centro Pokémon de ese pueblo.', 'bad');
  if (g.now < p.combatUntil) return g.notify(p, 'No puedes viajar en mitad de un combate.', 'bad');
  g.teleport(p, town.spawn.x + 0.5, town.spawn.y + 0.5);
}

function portal(g: Game, p: PlayerSession, id: number) {
  const po = g.world.portals.find(x => x.id === id);
  if (!po || dist(p.x, p.y, po.x + 0.5, po.y + 0.5) > 1.8) return;
  if (p.save.tlvl < po.minLevel) return g.notify(p, `${po.name}: necesitas nivel de entrenador ${po.minLevel}.`, 'bad');
  g.teleport(p, po.tx + 0.5, po.ty + 0.5);
}

function setTeam(g: Game, p: PlayerSession, uids: any) {
  if (!Array.isArray(uids)) return;
  const slots = teamSlotsFor(p.save.tlvl);
  const list: string[] = [];
  for (const u of uids.slice(0, 6)) {
    const s = str(u, 20);
    if (!s || list.includes(s) || !p.monSave(s)) continue;
    if (p.save.expeditions.some(e => e.uids.includes(s))) continue;
    list.push(s);
  }
  if (!list.length) return g.notify(p, 'El equipo necesita al menos un Pokémon.', 'bad');
  if (list.length > slots) return g.notify(p, `Solo tienes ${slots} ranuras de equipo (más con nivel de entrenador).`, 'bad');
  p.save.team = list;
  g.rebuildTeam(p);
}

function evolve(g: Game, p: PlayerSession, uid: string, to: string) {
  const ms = p.monSave(uid);
  if (!ms) return;
  const sp = SPECIES[ms.sp];
  const evo = sp.evo?.find(e => e.to === to);
  if (!evo || !SPECIES[to]) return g.notify(p, 'Esa evolución no es posible.', 'bad');
  if (evo.level && ms.lvl < evo.level) return g.notify(p, `Necesita nivel ${evo.level}.`, 'bad');
  if (evo.item && (p.save.items[evo.item] || 0) < 1) return g.notify(p, `Necesitas ${ITEMS[evo.item].name}.`, 'bad');
  if (evo.friendship && ms.fr < evo.friendship) return g.notify(p, `Necesita más amistad (${ms.fr}/${evo.friendship}).`, 'bad');
  if (evo.time && isNight(g.now) !== (evo.time === 'night')) return g.notify(p, `Solo puede evolucionar de ${evo.time === 'night' ? 'noche' : 'día'}.`, 'bad');
  // evolucionar cuesta caramelos de su familia (se consiguen capturando y transfiriendo repetidos)
  const cost = evoCandyCost(sp), have = p.save.candies[sp.family] || 0;
  if (have < cost) return g.notify(p, `Para evolucionar necesitas ${cost} caramelos de ${SPECIES[FAMILIES[sp.family]?.[0] || ms.sp].name} (tienes ${have}). Captura y transfiere más de su familia.`, 'bad');
  p.save.candies[sp.family] = have - cost;
  if (evo.item) p.save.items[evo.item]--;
  const from = ms.sp;
  ms.sp = to;
  p.save.dex.seen[to] = 1;
  p.save.dex.caught[to] = (p.save.dex.caught[to] || 0) + 1;
  if (ms.shiny) p.save.dex.shiny[to] = (p.save.dex.shiny[to] || 0) + 1;
  p.save.stats.evolves++;
  ms.fr = Math.min(255, ms.fr + 10);
  const ent = p.team.find(m => m.uid === uid);
  if (ent) { ent.setSpecies(to); g.emit(ent.x, ent.y, ['ev', ent.id]); }
  g.rebuildTeam(p);
  g.giveTrainerXp(p, 120 + ms.lvl * 6);
  p.dirtyMons = true; p.dirtyCore = true;
  p.send({ t: 'evolved', uid, from, to, shiny: ms.shiny });
}

function useItem(g: Game, p: PlayerSession, item: string, uid: string) {
  const def = ITEMS[item];
  if (!def || (p.save.items[item] || 0) < 1) return;
  switch (item) {
    case 'pocion': g.healTeam(p, 0.5, false); break;
    case 'superpocion': g.healTeam(p, 1, false); break;
    case 'revivir': if (!p.team.some(m => m.fainted)) return g.notify(p, 'Ningún Pokémon debilitado.', 'info'); g.healTeam(p, 0.5, true); break;
    case 'caramelo_raro': {
      const ms = p.monSave(uid);
      if (!ms) return g.notify(p, 'Elige un Pokémon en su ficha.', 'bad');
      if (ms.lvl >= MAX_LEVEL) return g.notify(p, `¡${SPECIES[ms.sp].name} ya está en su nivel máximo!`, 'info');
      const ent = p.team.find(m => m.uid === uid);
      const need = monXpForLevel(ms.lvl + 1) - ms.xp;
      ms.fr = Math.min(255, ms.fr + 5);
      if (ent) g.giveMonXp(p, ent, need); else { ms.lvl++; ms.xp = monXpForLevel(ms.lvl); }
      p.dirtyMons = true;
      break;
    }
    case 'incienso': {
      if (ZONES[p.zone].kind === 'town' || ZONES[p.zone].kind === 'ocean') return g.notify(p, 'Úsalo en una zona salvaje.', 'bad');
      p.incenseUntil = g.now + 120000;
      const z = ZONES[p.zone];
      const pool = z.spawns.map(s => s[0]).filter(k => SPECIES[k].rarity !== 'common' && SPECIES[k].habitat !== 'water');
      const key = pickEncounter(pool.map(k => [k, 1] as const)) || 'eevee';
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * 6.28, x = p.x + Math.cos(a) * 6, y = p.y + Math.sin(a) * 6;
        if (g.walkable(x, y, 'land')) { g.spawnWild(key, z.lvl[1] + 2, x, y, { rare: true, shiny: rollShiny(key, BAL.SHINY_INCENSE * (p.upg('shinycharm') ? BAL.SHINY_CHARM : 1), ENV.SHINY_RATE), zone: z.id }); break; }
      }
      g.notify(p, 'El Incienso Raro atrae a un Pokémon especial... (2 min de shiny x3; bonificaciones totales hasta x8)', 'good');
      break;
    }
    default: return g.notify(p, 'Este objeto se usa desde la ficha del Pokémon (evolución).', 'info');
  }
  p.save.items[item]--;
  p.dirtyCore = true;
  g.emit(p.x, p.y, ['x', 'heal', p.id]);
}

function buy(g: Game, p: PlayerSession, item: string, qty: number, tokens: boolean) {
  const def = ITEMS[item];
  if (!def) return;
  if (ZONES[p.zone].kind !== 'town') return g.notify(p, 'Solo puedes comprar dentro de un pueblo (Tienda Pokémon).', 'bad');
  if (tokens) {
    const cost = TOKEN_SHOP[item];
    if (!cost) return;
    if (p.save.tokens < cost * qty) return g.notify(p, 'No tienes suficientes Fragmentos de Jefe.', 'bad');
    p.save.tokens -= cost * qty;
  } else {
    if (!def.price) return;
    if (def.unlock && p.save.tlvl < def.unlock) return g.notify(p, `Disponible a nivel de entrenador ${def.unlock}.`, 'bad');
    const money = def.price * qty, cr = (def.crystals || 0) * qty, es = def.essence ? def.essence[1] * qty : 0;
    if (p.save.money < money) return g.notify(p, 'No tienes suficiente dinero.', 'bad');
    if (p.save.crystals < cr) return g.notify(p, 'No tienes suficientes Cristales Rush.', 'bad');
    if (def.essence && (p.save.ess[def.essence[0]] || 0) < es) return g.notify(p, `Necesitas ${es} esencias de tipo ${TYPE_NAMES[def.essence[0]]}.`, 'bad');
    p.save.money -= money; p.save.crystals -= cr;
    if (def.essence) p.save.ess[def.essence[0]] -= es;
  }
  p.save.items[item] = (p.save.items[item] || 0) + qty;
  p.dirtyCore = true;
  p.send({ t: 'bought', item, qty });
}

function upgrade(g: Game, p: PlayerSession, id: string) {
  const u = UPGRADE_MAP[id];
  if (!u) return;
  const lvl = p.save.upgrades[id] || 0;
  if (lvl >= u.max) return g.notify(p, 'Mejora al máximo.', 'info');
  const cost = upgradeCost(u, lvl);
  if (u.cur === 'money') { if (p.save.money < cost) return g.notify(p, 'No tienes suficiente dinero.', 'bad'); p.save.money -= cost; }
  else if (u.cur === 'crystals') { if (p.save.crystals < cost) return g.notify(p, 'No tienes suficientes Cristales Rush.', 'bad'); p.save.crystals -= cost; }
  else { if ((p.save.ess[u.cur] || 0) < cost) return g.notify(p, `Necesitas ${cost} esencias ${TYPE_NAMES[u.cur as PType]}.`, 'bad'); p.save.ess[u.cur] -= cost; }
  p.save.upgrades[id] = lvl + 1;
  p.save.stats.upgrades++;
  g.rebuildTeam(p);
  p.dirtyCore = true;
  p.send({ t: 'upgraded', id, lvl: lvl + 1 });
}

function transfer(g: Game, p: PlayerSession, uids: string[]) {
  let n = 0; const gained: Record<string, number> = {};
  for (const uid of uids) {
    if (p.save.team.includes(uid) || p.save.expeditions.some(e => e.uids.includes(uid))) continue;
    if (p.monSave(uid)?.fav) continue;
    if (p.save.mons.length <= 1) break;
    const idx = p.save.mons.findIndex(m => m.uid === uid);
    if (idx < 0) continue;
    const ms = p.save.mons[idx];
    const sp = SPECIES[ms.sp];
    const c = transferCandies(sp.stage, ms.shiny);
    p.save.candies[sp.family] = (p.save.candies[sp.family] || 0) + c;
    gained[sp.family] = (gained[sp.family] || 0) + c;
    for (const t of sp.types) p.save.ess[t] = (p.save.ess[t] || 0) + 1 + sp.stage;
    p.save.money += 20 + ms.lvl * 3;
    p.save.mons.splice(idx, 1);
    n++;
  }
  if (!n) return g.notify(p, 'No se puede transferir (equipo, expedición, favorito o último Pokémon).', 'bad');
  p.dirtyMons = true; p.dirtyCore = true;
  const txt = Object.entries(gained).map(([f, c]) => `${c} Caramelos ${SPECIES[FAMILIES[f][0]].name}`).join(', ');
  g.notify(p, `Transferidos ${n} Pokémon al Profesor: ${txt}, esencias y dinero.`, 'good');
}

function feed(g: Game, p: PlayerSession, uid: string) {
  const ms = p.monSave(uid); if (!ms) return;
  if (ms.lvl >= MAX_LEVEL) return g.notify(p, `¡${SPECIES[ms.sp].name} ya está en su nivel máximo!`, 'info');
  const fam = SPECIES[ms.sp].family;
  const cost = candyCostForLevel(ms.lvl);
  if ((p.save.candies[fam] || 0) < cost) return g.notify(p, `Necesitas ${cost} caramelos de esta familia (se obtienen transfiriendo).`, 'bad');
  if (ms.lvl >= p.save.tlvl + 10) return g.notify(p, 'No puede superar en 10 niveles a tu nivel de entrenador con caramelos.', 'bad');
  p.save.candies[fam] -= cost;
  ms.fr = Math.min(255, ms.fr + 4);
  const ent = p.team.find(m => m.uid === uid);
  const need = monXpForLevel(ms.lvl + 1) - ms.xp;
  if (ent) g.giveMonXp(p, ent, need); else { ms.lvl++; ms.xp = monXpForLevel(ms.lvl); }
  p.dirtyMons = true; p.dirtyCore = true;
}

function expStart(g: Game, p: PlayerSession, id: string, uids: string[]) {
  const def = EXPEDITION_MAP[id];
  if (!def) return;
  if (p.save.tlvl < def.minTrainer) return g.notify(p, `Necesitas nivel de entrenador ${def.minTrainer}.`, 'bad');
  const slots = 1 + (p.save.upgrades.exp_slots || 0);
  if (p.save.expeditions.length >= slots) return g.notify(p, 'No tienes equipos de expedición libres (mejora "Base de expediciones").', 'bad');
  const list = [...new Set(uids)].filter(u => p.monSave(u) && !p.save.team.includes(u) && !p.save.expeditions.some(e => e.uids.includes(u)));
  if (!list.length || list.length !== uids.length) return g.notify(p, 'Elige de 1 a 3 Pokémon de reserva (no del equipo).', 'bad');
  const used = new Set(p.save.expeditions.map(e => e.slot));
  let slot = 0; while (used.has(slot)) slot++;
  p.save.expeditions.push({ slot, id, uids: list, start: g.now, end: g.now + def.dur * 1000 });
  p.dirtyCore = true;
  g.notify(p, `Expedición "${def.name}" en marcha.`, 'good');
}

function expClaim(g: Game, p: PlayerSession, slot: number) {
  const e = p.save.expeditions.find(x => x.slot === slot);
  if (!e) return;
  if (g.now < e.end) return g.notify(p, 'La expedición aún no ha vuelto.', 'info');
  const mons = e.uids.map(u => p.monSave(u)).filter(Boolean) as any[];
  const power = mons.reduce((s, m) => s + m.lvl, 0) || 1;
  const mult = 1 + (p.save.upgrades.exp_reward || 0) * 0.15;
  const lines: string[] = [];
  const addItem = (it: string, n: number) => { if (n <= 0) return; p.save.items[it] = (p.save.items[it] || 0) + n; lines.push(`${ITEMS[it].name} x${n}`); };
  switch (e.id) {
    case 'materials': {
      const types = new Set<string>(); for (const m of mons) SPECIES[m.sp].types.forEach(t => types.add(t));
      for (const t of types) { const n = Math.round((4 + power / 6) * mult); p.save.ess[t] = (p.save.ess[t] || 0) + n; lines.push(`Esencia ${TYPE_NAMES[t as PType]} x${n}`); }
      break;
    }
    case 'items': {
      addItem('pokeball', Math.round((4 + power / 10) * mult));
      addItem('pocion', Math.round((1 + power / 40) * mult));
      if (power > 40) addItem('superball', Math.round((power / 25) * mult));
      const money = Math.round((150 + power * 12) * mult); p.save.money += money; lines.push(`${money} ₽`);
      break;
    }
    case 'habitat': {
      for (const m of mons) {
        const xp = Math.round((monXpForLevel(m.lvl + 1) - monXpForLevel(m.lvl)) * 1.6 * mult);
        m.xp += xp; while (m.lvl < MAX_LEVEL && m.xp >= monXpForLevel(m.lvl + 1)) m.lvl++;
        const fam = SPECIES[m.sp].family; const c = Math.round((2 + rand(3)) * mult);
        p.save.candies[fam] = (p.save.candies[fam] || 0) + c;
        lines.push(`${SPECIES[m.sp].name}: +${xp} EXP, +${c} caramelos`);
      }
      p.dirtyMons = true;
      break;
    }
    case 'cave': {
      const cr = Math.round((2 + power / 25) * mult); p.save.crystals += cr; lines.push(`${cr} Cristales Rush`);
      if (Math.random() < 0.35 * mult) addItem(['piedra_fuego', 'piedra_agua', 'piedra_trueno', 'piedra_hoja', 'piedra_lunar'][rand(5)], 1);
      if (Math.random() < 0.12 * mult) addItem('caramelo_raro', 1);
      break;
    }
    case 'clues': {
      addItem('incienso', 1 + (Math.random() < 0.3 * mult ? 1 : 0));
      const cr = Math.round((3 + power / 20) * mult); p.save.crystals += cr; lines.push(`${cr} Cristales Rush`);
      if (Math.random() < 0.03 * mult) addItem('masterball', 1);
      break;
    }
  }
  p.save.expeditions = p.save.expeditions.filter(x => x !== e);
  p.save.stats.expeditions++;
  g.giveTrainerXp(p, Math.round(power * 4));
  p.dirtyCore = true;
  p.send({ t: 'loot', kind: 'expedition', lines, title: EXPEDITION_MAP[e.id].name });
}

export function statValue(p: PlayerSession, stat: string): number {
  const s = p.save;
  if (stat === 'teamSize') return s.team.length;
  if (stat.startsWith('zone_')) return s.zones.includes(parseInt(stat.slice(5), 10)) ? 1 : 0;
  if (stat === 'zones') return s.zones.length;
  if (stat === 'dexCaught') return Object.values(s.dex.caught).filter(v => v > 0).length;
  if (stat === 'families') return familyComplete(s);
  return s.stats[stat] || 0;
}

function grant(g: Game, p: PlayerSession, r: Reward | Bounty['reward']) {
  const lines: string[] = [];
  if (r.money) { p.save.money += r.money; lines.push(`${r.money} ₽`); }
  if (r.crystals) { p.save.crystals += r.crystals; lines.push(`${r.crystals} Cristales Rush`); }
  const items = (r as Reward).items;
  if (items) for (const [k, n] of Object.entries(items)) { p.save.items[k] = (p.save.items[k] || 0) + n; lines.push(`${ITEMS[k]?.name || k} x${n}`); }
  if (r.txp) { g.giveTrainerXp(p, r.txp); lines.push(`${r.txp} EXP de entrenador`); }
  p.dirtyCore = true;
  return lines;
}

function questClaim(g: Game, p: PlayerSession, id: string) {
  const q = QUEST_MAP[id];
  if (!q || p.save.claimed.includes(id)) return;
  if (statValue(p, q.stat) < q.n) return g.notify(p, 'Misión aún no completada.', 'bad');
  p.save.claimed.push(id);
  const lines = grant(g, p, q.reward);
  p.send({ t: 'loot', kind: 'quest', title: q.name, lines });
}

function researchClaim(g: Game, p: PlayerSession, id: string) {
  const task = RESEARCH.find(t => t.id === id);
  if (!task || p.save.claimed.includes(researchClaimId(id))) return;
  if (researchProgress(p.save, task) < task.goal) return g.notify(p, 'Sigue explorando: esta investigación aún no está completa.', 'bad');
  p.save.claimed.push(researchClaimId(id));
  const lines = grant(g, p, task.reward);
  p.send({ t: 'loot', kind: 'quest', title: 'Investigación: ' + task.name, lines });
}

export function ensureBounties(p: PlayerSession) {
  const s = p.save;
  while (s.bounties.length < 2) s.bounties.push(genBounty(p));
}

function genBounty(p: PlayerSession): Bounty {
  const s = p.save;
  const wild = s.zones.map(z => ZONES[z]).filter(z => z && (z.kind === 'wild' || z.kind === 'dungeon') && z.spawns.length);
  const z = wild.length ? wild[rand(wild.length)] : ZONES[2];
  const lv = s.tlvl;
  const reward = { money: 200 + lv * 60, crystals: 1 + Math.floor(lv / 10), txp: 100 + lv * 20 };
  const r = Math.random();
  if (r < 0.45) {
    const sp = SPECIES[z.spawns[rand(z.spawns.length)][0]];
    const t = sp.types[0];
    const n = 12 + Math.floor(lv / 2);
    return { id: newUid(), kind: 'kill_type', target: t, n, prog: 0, reward, desc: `Derrota ${n} Pokémon de tipo ${TYPE_NAMES[t]}` };
  }
  if (r < 0.8) {
    const n = 15 + Math.floor(lv / 2);
    return { id: newUid(), kind: 'kill_zone', target: String(z.id), n, prog: 0, reward, desc: `Derrota ${n} Pokémon en ${z.name}` };
  }
  const n = 3 + Math.floor(lv / 10);
  return { id: newUid(), kind: 'catch', target: '', n, prog: 0, reward: { ...reward, crystals: reward.crystals + 1 }, desc: `Captura ${n} Pokémon` };
}

function bountyClaim(g: Game, p: PlayerSession, id: string) {
  const i = p.save.bounties.findIndex(b => b.id === id);
  if (i < 0) return;
  const b = p.save.bounties[i];
  if (b.prog < b.n) return g.notify(p, 'Encargo sin completar.', 'bad');
  p.save.bounties.splice(i, 1);
  const lines = grant(g, p, b.reward);
  ensureBounties(p);
  p.send({ t: 'loot', kind: 'quest', title: 'Encargo: ' + b.desc, lines });
}

const BAD = /[\u0000-\u001f\u007f<>]/g;
function chat(g: Game, p: PlayerSession, ch: string, text: string) {
  const now = g.now;
  if (now - p.chatAt < 700) return;
  text = text.replace(BAD, '').trim().slice(0, 160);
  if (!text) return;
  p.chatAt = now;
  if (text.startsWith('/dev ') && ENV.DEV_CHEATS) return devCommand(g, p, text.slice(5).split(' '));
  const msg = { t: 'chat', ch, from: p.name, fid: p.id, msg: text };
  if (ch === 'p') {
    if (!p.party) return g.notify(p, 'No estás en un grupo.', 'info');
    for (const m of p.party.members) m.send(msg);
  } else if (ch === 'z') {
    for (const o of g.players.values()) if (o.zone === p.zone) o.send(msg);
  } else g.broadcast({ ...msg, ch: 'g' });
}

/** Comandos de prueba (solo con DEV_CHEATS=true en .env). */
function devCommand(g: Game, p: PlayerSession, a: string[]) {
  const n = (i: number, d = 1) => (Number.isFinite(Number(a[i])) ? Number(a[i]) : d);
  switch (a[0]) {
    case 'money': p.save.money += n(1, 10000); p.save.crystals += n(2, 50); p.save.tokens += n(3, 0); break;
    case 'item': p.save.items[a[1]] = (p.save.items[a[1]] || 0) + n(2, 1); break;
    case 'xp': g.giveTrainerXp(p, n(1, 1000)); break;
    case 'lvl': for (const m of p.team) { const ms = p.monSave(m.uid!)!; g.giveMonXp(p, m, Math.max(0, monXpForLevel(Math.min(100, n(1, ms.lvl + 5))) - ms.xp)); } break;
    case 'mon': { const ms = createMon(a[1], n(2, 10), a[3] === 'shiny', p.zone); if (!SPECIES[a[1]]) return; p.save.mons.push(ms); p.save.dex.caught[a[1]] = (p.save.dex.caught[a[1]] || 0) + 1; p.save.dex.seen[a[1]] = 1; p.dirtyMons = true; break; }
    case 'tp': g.teleport(p, n(1, p.x), n(2, p.y)); break;
    case 'boss': { const b = g.world.bosses.find(x => x.key === a[1]); if (b) g.teleport(p, b.x + 0.5, b.y + 6.5); break; }
    case 'event': g.wevents.start(a[1] || 'rare'); break;
    case 'ambush': p.lastEncAt = 0; g.ambush(p, g.zoneAt(p.x, p.y).id); break;
    case 'legend': p.lastEncAt = 0; g.ambush(p, g.zoneAt(p.x, p.y).id, ROAMERS.some(r => r.key === a[1]) ? a[1] : 'zapdos'); break;
    case 'heal': g.healTeam(p, 1, true); p.hp = p.maxHp; break;
    default: g.notify(p, 'dev: money|item id n|xp n|lvl n|mon key lvl [shiny]|tp x y|boss key|event kind|heal'); return;
  }
  p.dirtyCore = true;
  g.notify(p, 'dev: ' + a.join(' '), 'info');
}

function invite(g: Game, p: PlayerSession, id: number) {
  const o = g.players.get(id);
  if (!o || o === p) return;
  if (o.party && o.party === p.party) return;
  if (p.party && p.party.members.length >= 4) return g.notify(p, 'Tu grupo está lleno (máx. 4).', 'bad');
  o.invites.set(p.id, g.now + 60000);
  o.send({ t: 'invite', from: p.id, name: p.name });
  g.notify(p, `Invitación enviada a ${o.name}.`, 'info');
}

/** Enlace de invitación (?amigo=Nombre): pide entrar en el grupo de ese entrenador. */
function joinRequest(g: Game, p: PlayerSession, name: string) {
  const o = [...g.players.values()].find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!o || o === p) return g.notify(p, `${name} no está conectado ahora mismo.`, 'info');
  if (o.party && o.party.members.length >= 4) return g.notify(p, `El grupo de ${o.name} está lleno (máx. 4).`, 'bad');
  if (o.party && o.party === p.party) return;
  o.joinReqs.set(p.id, g.now + 90000);
  o.send({ t: 'joinreq', from: p.id, name: p.name, lvl: p.save.tlvl });
  g.notify(p, `Solicitud enviada a ${o.name}. Cuando acepte entrarás en su grupo.`, 'info');
}
function joinAccept(g: Game, p: PlayerSession, fromId: number) {
  const exp = p.joinReqs.get(fromId); p.joinReqs.delete(fromId);
  const o = g.players.get(fromId);
  if (!exp || exp < g.now || !o) return g.notify(p, 'La solicitud ha caducado.', 'bad');
  if (o.party) leaveParty(g, o);
  let party = p.party;
  if (!party) { party = new Party(g.nextPartyId++, p); p.party = party; }
  if (party.members.length >= 4) return g.notify(p, 'Tu grupo está lleno.', 'bad');
  party.members.push(o); o.party = party;
  for (const m of party.members) { m.send({ t: 'note', kind: 'good', text: `${o.name} se ha unido al grupo.` }); g.broadcastMeta(m); }
}

function accept(g: Game, p: PlayerSession, fromId: number) {
  const exp = p.invites.get(fromId);
  p.invites.delete(fromId);
  const from = g.players.get(fromId);
  if (!exp || exp < g.now || !from) return g.notify(p, 'La invitación ha caducado.', 'bad');
  if (p.party) leaveParty(g, p);
  let party = from.party;
  if (!party) { party = new Party(g.nextPartyId++, from); from.party = party; }
  if (party.members.length >= 4) return g.notify(p, 'El grupo está lleno.', 'bad');
  party.members.push(p); p.party = party;
  for (const m of party.members) { m.send({ t: 'note', kind: 'good', text: `${p.name} se ha unido al grupo.` }); g.broadcastMeta(m); }
}

export function leaveParty(g: Game, p: PlayerSession) {
  const party = p.party;
  if (!party) return;
  party.members = party.members.filter(m => m !== p);
  p.party = null;
  p.send({ t: 'party', id: 0, members: [] });
  g.broadcastMeta(p);
  for (const m of party.members) m.send({ t: 'note', kind: 'info', text: `${p.name} ha dejado el grupo.` });
  if (party.members.length === 1) { const last = party.members[0]; last.party = null; last.send({ t: 'party', id: 0, members: [] }); g.broadcastMeta(last); }
}

function inspect(g: Game, p: PlayerSession, id: number) {
  const o = g.players.get(id);
  if (!o) return;
  p.send({
    t: 'inspect', id, name: o.name, lvl: o.save.tlvl, look: o.save.look,
    team: o.save.team.map(u => o.monSave(u)).filter(Boolean).map(m => ({ sp: m!.sp, lvl: m!.lvl, shiny: m!.shiny })),
    dex: Object.values(o.save.dex.caught).filter(v => v > 0).length, bosses: o.save.stats.bosses, kills: o.save.stats.kills,
    links: o.links.map(l => l.id), zone: o.zone,
  });
}

export { coreOf, QUESTS, TYPES, MonEntity };
