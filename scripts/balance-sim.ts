// Simulación de progresión de un jugador para ajustar la economía (shared/balance.ts).
// Uso: npx tsx scripts/balance-sim.ts [horas]
import { SPECIES } from '../shared/species';
import { ZONES } from '../shared/zones';
import { calcStats, monXpForLevel, trainerXpForLevel, teamSlotsFor, UPGRADES, upgradeCost, attackSpeedMult, knownMoves } from '../shared/progression';
import { speciesBaseExp } from '../shared/species';
import { BAL, levelXpFactor, killXp } from '../shared/balance';
for (const a of process.argv.slice(3)) { const [k, v] = a.split('='); if (k in BAL) (BAL as any)[k] = parseFloat(v); }

const HOURS = parseFloat(process.argv[2] || '20');
const OVERHEAD = 3.5;
const LINES = [
  ['charmander', 'charmeleon', 'charizard'], ['pidgey', 'pidgeotto', 'pidgeot'], ['oddish', 'gloom', 'vileplume'],
  ['geodude', 'graveler', 'golem'], ['growlithe', 'arcanine'], ['psyduck', 'golduck'],
];
function speciesAt(line: string[], lvl: number) {
  let k = line[0];
  for (const s of line) {
    const prev = line[line.indexOf(s) - 1];
    if (!prev) continue;
    const evo = SPECIES[prev].evo?.find(e => e.to === s);
    const need = evo?.level ?? 26;
    if (lvl >= need) k = s;
  }
  return SPECIES[k];
}

// Zonas de combate en orden de dificultad (no pueblos ni océano)
const zones = ZONES.filter(z => (z.kind === 'wild' || z.kind === 'dungeon') && z.spawns.length).sort((a, b) => a.lvl[0] - b.lvl[0]);

function zoneWild(z: typeof zones[number]) {
  const tot = z.spawns.reduce((s, e) => s + e[1], 0);
  let hp = 0, def = 0, xp = 0, atk = 0;
  const L = (z.lvl[0] + z.lvl[1]) / 2;
  for (const [k, w] of z.spawns) {
    const sp = SPECIES[k]; const st = calcStats(sp, L, [8, 8, 8, 8]);
    hp += st.hp * w; def += st.def * w; atk += st.atk * w; xp += killXp(speciesBaseExp(sp), L) * w;
  }
  return { L, hp: hp / tot, def: def / tot, atk: atk / tot, xp: xp / tot };
}

function dmg(L: number, P: number, atk: number, def: number, mult: number) {
  return ((2 * L / 5 + 2) * P * atk / Math.max(1, def) / 50 + 2) * 1.2 * 1.03 * 0.94 * mult;
}

interface Mon { line: string[]; lvl: number; xp: number; }

function run() {
  let t = 0; // segundos
  let tlvl = 1, txp = 0, money = 300, crystals = 0, kills = 0, chestsT = 0;
  const upg: Record<string, number> = {};
  const team: Mon[] = [{ line: LINES[0], lvl: 5, xp: monXpForLevel(5) }];
  let nextCatch = 60;
  const log: string[] = [];
  const milestones = [3, 5, 10, 15, 20, 25, 30, 35, 40, 50];
  let mi = 0;
  const report = new Set<number>();
  const marks = [5, 15, 30, 60, 120, 240, 480, 720, 960, 1200];
  while (t < HOURS * 3600) {
    const slots = teamSlotsFor(tlvl);
    if (t >= nextCatch && team.length < slots) {
      const avg = team.reduce((s, m) => s + m.lvl, 0) / team.length;
      const lvl = Math.max(3, Math.round(avg * 0.75));
      team.push({ line: LINES[team.length % LINES.length], lvl, xp: monXpForLevel(lvl) });
      nextCatch = t + 120;
    }
    const avgL = team.reduce((s, m) => s + m.lvl, 0) / team.length;
    // DPS del equipo contra cada zona; elegir la zona más alta "cómoda"
    const dmgMult = 1 + (upg.dmg || 0) * 0.1;
    const aspdU = 1 + (upg.aspd || 0) * 0.05;
    let best = zones[0], bestRate = 0, bestK = 1;
    for (const z of zones) {
      if (z.minLevel && tlvl < z.minLevel) continue;
      const w = zoneWild(z);
      if (w.L > avgL + 2) continue;
      let dps = 0, ehp = 0;
      for (const m of team) {
        const sp = speciesAt(m.line, m.lvl); const st = calcStats(sp, m.lvl, [8, 8, 8, 8]);
        const mv = knownMoves(sp, m.lvl); const as = attackSpeedMult(st.spd) * aspdU;
        dps += dmg(m.lvl, mv.basic.power, st.atk, w.def, dmgMult) / (mv.basic.cd / as);
        if (mv.special) dps += dmg(m.lvl, mv.special.power, st.atk, w.def, dmgMult) * (mv.special.kind === 'aoe' || mv.special.kind === 'nova' || mv.special.kind === 'beam' ? 1.6 : 1) / (mv.special.cd / Math.sqrt(as));
        ehp += st.hp * (1 + (upg.hp || 0) * 0.1);
      }
      // peligro: los salvajes también pegan; si el equipo cae demasiado rápido la zona no es viable
      const incoming = dmg(w.L, 55, w.atk, 60, 1) / 1.3 * 3; // ~3 atacantes
      const survive = ehp / Math.max(1, incoming);
      const tk = w.hp / dps + OVERHEAD; // tiempo buscando/persiguiendo objetivo
      if (survive < tk * 3) continue;
      const rate = w.xp * levelXpFactor(w.L, avgL) / tk;
      if (rate > bestRate) { bestRate = rate; best = z; bestK = tk; }
    }
    const w = zoneWild(best);
    // una derrota
    t += bestK; kills++;
    const xpMult = 1 + (upg.xp || 0) * 0.08;
    const xp = w.xp * xpMult;
    const n = team.length;
    for (const m of team) {
      m.xp += xp * levelXpFactor(w.L, m.lvl) * (BAL.XP_KILLER / n + BAL.XP_TEAM * (n - 1) / n);
      while (m.lvl < 100 && m.xp >= monXpForLevel(m.lvl + 1)) m.lvl++;
    }
    txp += xp * BAL.XP_TRAINER * 1.15; // +15% por misiones, zonas y cofres
    while (tlvl < 100 && txp >= trainerXpForLevel(tlvl + 1)) tlvl++;
    money += (BAL.MONEY_BASE + w.L * BAL.MONEY_PER_LVL) * (1 + (upg.luck || 0) * 0.1) * 0.85; // 15% en Balls/pociones
    if (t - chestsT > 180) { chestsT = t; const tier = w.L < 10 ? 0 : w.L < 20 ? 1 : w.L < 32 ? 2 : 3; money += 150 * Math.pow(tier + 1, 1.7); crystals += 1.5 + tier; }
    // compra codiciosa de la mejora más barata
    for (let guard = 0; guard < 5; guard++) {
      const opts = ['dmg', 'hp', 'aspd', 'xp', 'luck'].map(id => ({ id, u: UPGRADES.find(u => u.id === id)! })).filter(o => (upg[o.id] || 0) < o.u.max).map(o => ({ ...o, c: upgradeCost(o.u, upg[o.id] || 0) })).sort((a, b) => a.c - b.c);
      if (!opts.length || opts[0].c > money) break;
      money -= opts[0].c; upg[opts[0].id] = (upg[opts[0].id] || 0) + 1;
    }
    while (mi < milestones.length && tlvl >= milestones[mi]) {
      log.push(`Entrenador nv.${String(milestones[mi]).padStart(2)} a los ${fmtT(t)} · equipo nv.${Math.round(avgL)} · zona ${best.name}`);
      mi++;
    }
    for (const mk of marks) if (!report.has(mk) && t >= mk * 60) {
      report.add(mk);
      log.push(`  [${fmtT(t)}] zona ${best.name.padEnd(18)} equipo ${team.map(m => m.lvl).join('/')} · ${Math.round(bestK * 10) / 10}s/derrota · ${Math.round(money)}₽ · mejoras ${JSON.stringify(upg)}`);
    }
  }
  console.log(log.join('\n'));
  console.log(`\nTotal: ${kills} derrotas en ${HOURS}h`);
}
function fmtT(s: number) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`; }
run();


