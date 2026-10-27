// Comprueba estaciones, clima por zona, especies de temporada y condiciones de los legendarios errantes.
import { seasonAt, weatherAt, boostedTable, SEASON_MS, WEATHER_MS, SEASONAL } from '../shared/weather';
import { ROAMERS, roamerChance } from '../shared/encounters';
import { ZONES } from '../shared/zones';
import { SPECIES } from '../shared/species';
let fails = 0;
const ok = (n: string, c: boolean, i = '') => { if (!c) fails++; console.log(`${c ? 'OK' : 'FALLO'} ${n}${i ? ' — ' + i : ''}`); };

const seasons = [0, 1, 2, 3].map(k => seasonAt(k * SEASON_MS + 1000));
ok('Las cuatro estaciones se suceden', new Set(seasons).size === 4, seasons.join(' → '));
ok('El clima es el mismo para servidor y clientes', weatherAt(2, 123456789) === weatherAt(2, 123456789));
const counts: Record<string, number> = {};
for (let k = 0; k < 2000; k++) { const w = weatherAt(7, k * WEATHER_MS); counts[w] = (counts[w] || 0) + 1; }
ok('El tiempo varía en la Pradera Central', Object.keys(counts).length >= 4, JSON.stringify(counts));
ok('Picos Helados nieva casi siempre', (() => { let n = 0; for (let k = 0; k < 500; k++) if (weatherAt(16, k * WEATHER_MS) === 'snow') n++; return n > 250; })());
ok('Las cuevas e interiores no tienen clima', weatherAt(18, 5, 'dungeon') === 'clear' && weatherAt(21, 5) === 'clear');
ok('Todas las especies de temporada existen', SEASONAL.every(e => SPECIES[e.key]));
const winter = 3 * SEASON_MS + 1000, spring = 1000;
const has = (z: number, t: number, k: string) => boostedTable(ZONES[z], t, false).some(e => e[0] === k);
ok('Swinub sale en invierno en Ruta 1 y no en primavera', has(2, winter, 'swinub') && !has(2, spring, 'swinub'));
ok('Hoppip sale en primavera', has(2, spring, 'hoppip'));
const rk = ROAMERS.find(r => r.key === 'raikou')!;
ok('Raikou es más probable con tormenta', roamerChance(rk, false, 'storm', 'spring') > roamerChance(rk, false, 'clear', 'spring'));
const dk = ROAMERS.find(r => r.key === 'darkrai')!;
ok('Darkrai solo aparece de noche', roamerChance(dk, false, 'clear', 'autumn') === 0 && roamerChance(dk, true, 'clear', 'autumn') > 0);
ok('Todos los errantes existen y son legendarios o míticos', ROAMERS.every(r => ['legendary', 'mythic'].includes(SPECIES[r.key]?.rarity)));
process.exit(fails ? 1 : 0);
