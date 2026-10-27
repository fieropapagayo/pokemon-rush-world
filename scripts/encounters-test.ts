import assert from 'node:assert/strict';
import { shinyChance, shinyDenominator, rollShiny, encounterWeight, pickEncounter } from '../shared/encounters';
import { SPECIES_LIST } from '../shared/species';
import { ZONES } from '../shared/zones';
import { Game } from '../server/world/game';

assert.equal(shinyDenominator('rattata'), 4096);
assert.equal(shinyDenominator('jigglypuff'), 6144);
assert.equal(shinyDenominator('pikachu'), 8192);
assert.equal(shinyDenominator('lapras'), 16384);
assert.equal(shinyDenominator('dragonite'), 32768);
assert.equal(shinyDenominator('articuno'), 49152);
assert.equal(shinyDenominator('mew'), 65536);
for (const sp of SPECIES_LIST) {
  const probability = shinyChance(sp.key);
  assert(probability > 0 && probability < 0.001);
  assert(rollShiny(sp.key, 1, 4096, () => probability - 1e-10));
  assert(!rollShiny(sp.key, 1, 4096, () => probability));
  assert.equal(shinyChance(sp.key, 1000), probability * 8);
  assert.equal(shinyChance(sp.key, NaN), probability);
  assert.equal(shinyDenominator(sp.key, NaN), shinyDenominator(sp.key));
}
assert.equal(shinyDenominator('pikachu', 1000), 2000);
assert.equal(pickEncounter([]), null);
assert.equal(pickEncounter([['missing', 5], ['pikachu', 0]]), null);
assert.equal(pickEncounter([['pikachu', 1]], () => 0.9999), 'pikachu');
// Stratified rolls validate tiny weighted intervals without flaky random tests.
for (const z of ZONES) for (const table of [z.spawns, z.water || []]) {
  if (!table.length) continue;
  const total = table.reduce((n, [key, weight]) => n + encounterWeight(key, weight), 0);
  let cumulative = 0;
  for (const [key, weight] of table) {
    const effective = encounterWeight(key, weight);
    assert.equal(pickEncounter(table, () => (cumulative + effective / 2) / total), key, `${z.name}: ${key}`);
    cumulative += effective;
  }
}
// A seeded million-encounter sample catches gross distribution errors.
let seed = 1234567;
const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
for (const key of ['rattata', 'pikachu', 'mew']) {
  let hits = 0; for (let n = 0; n < 1000000; n++) if (rollShiny(key, 1, 4096, rng)) hits++;
  const expected = 1000000 * shinyChance(key);
  assert(Math.abs(hits - expected) < 6 * Math.sqrt(expected), `${key}: ${hits} vs ${expected}`);
  console.log(`${key}: ${hits}/1000000 shiny; expected ${expected.toFixed(1)}`);
}
const trainer = { focus: null, upg: () => 0, save: { dex: { caught: { pikachu: 1 } } } } as any;
const target = { key: 'pikachu', wild: true, shiny: true, boss: null, privateTo: 0, alpha: false, eventId: 0 } as any;
assert(Game.prototype.isProtectedFor(trainer, target));
assert(!Game.prototype.isProtectedFor(trainer, { ...target, shiny: false }));
assert(!Game.prototype.isProtectedFor(trainer, { ...target, boss: {} }));
assert(!Game.prototype.isProtectedFor(trainer, { ...target, alpha: true }));
console.log('PASS: shiny thresholds, boost cap, all zone weights and shiny capture protection.');
