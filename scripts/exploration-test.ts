import assert from 'node:assert/strict';
import { findWalkPath, nearestZonePoint } from '../client/src/systems/navigation';
import { generateWorld, playerBlocked, type World } from '../shared/world/worldgen';
import { RESEARCH, researchClaimId, researchProgress } from '../shared/research';
import { SPECIES_LIST } from '../shared/species';
import { ITEMS } from '../shared/items';
import { GYMS } from '../shared/gyms';
import { WORLD_SEED } from '../shared/constants';
import { defaultSave, sanitizeSave } from '../server/players/save';
import { PlayerSession } from '../server/world/entities';
import { Game, coreOf } from '../server/world/game';
import { handle } from '../server/players/actions';

let checks = 0;
const check = (name: string, fn: () => void) => { fn(); checks++; console.log('OK ' + name); };
const grid = { w: 20, h: 20, solid: new Uint8Array(400), zone: new Uint8Array(400) } as World;
for (let i = 0; i < 20; i++) { grid.solid[i] = grid.solid[380 + i] = grid.solid[i * 20] = grid.solid[i * 20 + 19] = 1; grid.solid[i * 20 + 7] = i === 13 ? 0 : 1; }
const start = { x: 3.5, y: 4.5 }, end = { x: 12.5, y: 4.5 };
check('Click path detours through an opening without clipping obstacles', () => {
  const path = findWalkPath(grid, start, end)!; assert(path && path.length > 20); assert.deepEqual(path.at(-1), end);
  for (let i = 0; i < path.length; i++) {
    assert(!playerBlocked(grid, path[i].x, path[i].y));
    const from = i ? path[i - 1] : start, to = path[i];
    for (let n = 0; n <= 10; n++) assert(!playerBlocked(grid, from.x + (to.x - from.x) * n / 10, from.y + (to.y - from.y) * n / 10));
  }
});
check('Unreachable, blocked, invalid and distant clicks terminate safely', () => {
  assert.equal(findWalkPath(grid, start, { x: 7.5, y: 4.5 }), null);
  assert.equal(findWalkPath(grid, start, end, 1), null);
  assert.equal(findWalkPath(grid, start, { x: NaN, y: 4 }), null);
  assert.equal(findWalkPath(grid, start, { x: 20, y: 3 }), null);
  grid.solid[13 * 20 + 7] = 1; assert.equal(findWalkPath(grid, start, end), null);
  assert.deepEqual(findWalkPath(grid, start, start), [start]);
});
check('Zone destination excludes collision tiles', () => {
  grid.zone[4 * 20 + 7] = 2; grid.zone[4 * 20 + 5] = 2;
  assert.deepEqual(nearestZonePoint(grid, start, 2), { x: 5.5, y: 4.5 });
  assert.equal(nearestZonePoint(grid, start, 9), null);
});

const world = generateWorld(WORLD_SEED), game = new Game(world, {} as any), messages: any[] = [];
const ws = { readyState: 1, send: (data: string) => messages.push(JSON.parse(data)) } as any;
const player = new PlayerSession(1, 1, ws, defaultSave('ExplorationTest'), true);
game.players.set(player.id, player);
handle(game, player, { t: 'starter', sp: 'charmander', look: {} });
check('New and existing saves share the same research progress', () => {
  const old = sanitizeSave({ ...player.save, claimed: ['q1'], medals: undefined }, 'OldSave');
  assert.deepEqual(old.medals, []); assert.equal(researchProgress(old, RESEARCH[0]), 1); assert(old.claimed.includes('q1'));
  assert.equal(new Set(RESEARCH.map(t => t.id)).size, RESEARCH.length);
  for (const task of RESEARCH) for (const id of Object.keys(task.reward.items || {})) assert(ITEMS[id]);
});
check('Unfinished and forged research claims award nothing', () => {
  const money = player.save.money, claimed = [...player.save.claimed];
  handle(game, player, { t: 'research', id: 'r01', progress: 999, reward: { money: 1e12 } });
  handle(game, player, { t: 'research', id: '__proto__' });
  assert.equal(player.save.money, money); assert.deepEqual(player.save.claimed, claimed);
});
check('Type surveys count captures; species surveys count distinct species', () => {
  player.save.dex.caught = { bulbasaur: 3, ivysaur: 0, squirtle: 2 };
  assert.equal(researchProgress(player.save, RESEARCH[1]), 2);
  assert.equal(researchProgress(player.save, RESEARCH[2]), 3);
  assert.equal(researchProgress(player.save, RESEARCH[3]), 2);
});
check('All twelve rewards are authoritative, persistent and idempotent', () => {
  player.save.dex.caught = Object.fromEntries(SPECIES_LIST.map(s => [s.key, 5]));
  player.save.dex.seen = { ...player.save.dex.caught }; player.save.zones = [1, 2, 3, 4, 5]; player.save.towns = [1, 3, 9]; player.save.stats.chests = 8;
  for (const task of RESEARCH) {
    assert(researchProgress(player.save, task) >= task.goal);
    const before = { money: player.save.money, crystals: player.save.crystals, txp: player.save.txp, items: { ...player.save.items } };
    handle(game, player, { t: 'research', id: task.id });
    assert(player.save.claimed.includes(researchClaimId(task.id)));
    assert.equal(player.save.money, before.money + (task.reward.money || 0));
    assert.equal(player.save.crystals, before.crystals + (task.reward.crystals || 0));
    assert.equal(player.save.txp, before.txp + (task.reward.txp || 0));
    for (const [id, count] of Object.entries(task.reward.items || {})) assert.equal(player.save.items[id], (before.items[id] || 0) + count);
    const after = JSON.stringify(player.save); handle(game, player, { t: 'research', id: task.id }); assert.equal(JSON.stringify(player.save), after);
  }
  const restored = sanitizeSave(JSON.parse(JSON.stringify(player.save)), player.name);
  assert(RESEARCH.every(t => restored.claimed.includes(researchClaimId(t.id))));
});
check('Real world route from Paleta reaches the first wild zone', () => {
  const point = nearestZonePoint(world, player, 2)!;
  assert(point); assert.equal(world.zone[Math.floor(point.y) * world.w + Math.floor(point.x)], 2);
  assert(findWalkPath(world, player, point));
});
check('Gym challenges require proximity and the preceding medal', () => {
  player.x = 0; player.y = 0; handle(game, player, { t: 'gym', id: 0 }); assert.equal(game.gyms.battles.size, 0);
  const brock = world.npcs.find(n => n.gym === 1)!; player.x = brock.x + 0.5; player.y = brock.y + 1.5;
  handle(game, player, { t: 'gym', id: 1 }); assert.equal(game.gyms.battles.size, 0);
});
check('Gym starts, rejects capture, awards a medal and prevents immediate rematches', () => {
  const leader = world.npcs.find(n => n.gym === 0)!; player.x = leader.x + 0.5; player.y = leader.y + 1.5;
  handle(game, player, { t: 'gym', id: 0 });
  const battle = game.gyms.battles.get(player.id)!; assert(battle); assert(messages.some(m => m.t === 'gym_start'));
  const balls = player.save.items.pokeball;
  handle(game, player, { t: 'throw', id: battle.mons[0], ball: 'pokeball' }); assert.equal(player.save.items.pokeball, balls);
  for (const id of battle.mons) { const mon = game.mons.get(id)!; assert.equal(mon.privateTo, player.id); mon.fainted = true; mon.hp = 0; }
  game.now += 600; game.gyms.update();
  assert(player.save.medals.includes(0)); assert(coreOf(player, game).medals.includes(0)); assert(messages.some(m => m.t === 'gym_win'));
  const reward = player.save.money; handle(game, player, { t: 'gym', id: 0 }); assert.equal(game.gyms.battles.size, 0); assert.equal(player.save.money, reward);
  assert.equal(GYMS.length, 6);
});
console.log(`PASS: ${checks} exploration, reward, navigation and gym scenarios.`);
