// run.bat lo llama al arrancar: si el juego está conectado a GitHub (subir-a-render.bat),
// sube los cambios y Render vuelve a desplegar solo. Nunca bloquea el arranque.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = args => spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 60000 });
if (git(['remote', 'get-url', 'origin']).status !== 0) process.exit(0);
git(['add', '-A']);
if (!(git(['status', '--porcelain']).stdout || '').trim()) { console.log('  [nube] el servidor de Render ya tiene la última versión.'); process.exit(0); }
git(['commit', '-q', '-m', 'Actualización automática ' + new Date().toISOString().slice(0, 16).replace('T', ' ')]);
const r = git(['push', '-q', 'origin', 'main']);
console.log(r.status === 0 ? '  [nube] cambios subidos: Render publicará la nueva versión en unos minutos.' : '  [nube] no se pudieron subir los cambios a GitHub (sin Internet o sesión caducada).');
