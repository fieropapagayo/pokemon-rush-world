// Ruta guiada: comprueba que se llega a todos los pueblos desde el pueblo inicial, que el camino es transitable
// para el entrenador y que el cálculo es lo bastante rápido para hacerse en el navegador.
import { generateWorld, playerBlocked } from '../shared/world/worldgen';
import { WORLD_SEED } from '../shared/constants';
import { findRoute, routeLength } from '../client/src/systems/navigation';

const w = generateWorld(WORLD_SEED);
const outdoor = w.towns.filter(t => t.heal.x < 400);
const start = { x: outdoor[0].heal.x + 0.5, y: outdoor[0].heal.y + 1.5 };
let ok = 0, fail = 0, worst = 0;
for (const t of outdoor.slice(1)) {
  const t0 = performance.now();
  const r = findRoute(w, start, { x: t.heal.x + 0.5, y: t.heal.y + 1.5 }, true);
  const ms = performance.now() - t0; worst = Math.max(worst, ms);
  const bad = r ? r.filter(p => playerBlocked(w, p.x, p.y, true)).length : -1;
  const pass = !!r && bad === 0;
  pass ? ok++ : fail++;
  console.log(`${pass ? '✔' : '✘'} ${outdoor[0].name} → ${t.name}: ${r ? Math.round(routeLength(r)) + ' casillas, ' + r.length + ' puntos' : 'sin ruta'} · ${ms.toFixed(0)} ms${bad > 0 ? ' · ' + bad + ' puntos bloqueados' : ''}`);
}
console.log(`\n${ok}/${ok + fail} rutas correctas · peor tiempo ${worst.toFixed(0)} ms`);
if (fail || worst > 400) process.exit(1);
