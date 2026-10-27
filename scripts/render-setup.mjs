// Sube el juego a tu repositorio de GitHub y abre Render para desplegarlo gratis (siempre encendido).
// Lo ejecuta subir-a-render.bat. Solo hay que hacerlo una vez: después run.bat sube las actualizaciones solo.
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (args, opts = {}) => spawnSync('git', args, { cwd: root, encoding: 'utf8', ...opts });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const step = t => console.log('\n=== ' + t + ' ===');

step('1/4 Repositorio de GitHub');
let remote = (git(['remote', 'get-url', 'origin']).stdout || '').trim();
if (!remote) {
  console.log('Crea un repositorio VACÍO y PRIVADO en GitHub (sin README):');
  console.log('  https://github.com/new  → nombre: pokemon-rush-world → Private → Create repository');
  spawnSync('cmd', ['/c', 'start', '', 'https://github.com/new?name=pokemon-rush-world&visibility=private'], { stdio: 'ignore' });
  remote = (await rl.question('\nPega aquí la dirección del repositorio (https://github.com/TU_USUARIO/pokemon-rush-world): ')).trim().replace(/\/$/, '');
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(remote.replace(/\.git$/, ''))) { console.error('Dirección no válida.'); process.exit(1); }
  if (!remote.endsWith('.git')) remote += '.git';
  git(['remote', 'add', 'origin', remote]);
}
console.log('Repositorio:', remote);

step('2/4 Subiendo el juego (si es la primera vez, se abrirá el navegador para entrar en GitHub)');
git(['add', '-A']);
if ((git(['status', '--porcelain']).stdout || '').trim()) git(['commit', '-q', '-m', 'Actualización antes de desplegar']);
const push = git(['push', '-u', 'origin', 'main'], { stdio: 'inherit' });
if (push.status !== 0) { console.error('\nNo se pudo subir a GitHub. Revisa que el repositorio exista y vuelve a intentarlo.'); process.exit(1); }

step('3/4 Clave secreta para el servidor de la nube');
const env = fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '';
const key = (env.match(/^CLOUD_KEY=(.+)$/m) || [])[1]?.trim();
if (key) { spawnSync('cmd', ['/c', 'clip'], { input: key }); console.log('CLOUD_KEY copiada al portapapeles: pégala cuando Render la pida.'); }
else console.log('No hay CLOUD_KEY en .env: ejecuta antes web\\desplegar.bat.');

step('4/4 Render');
const repoWeb = remote.replace(/\.git$/, '');
const url = 'https://render.com/deploy?repo=' + encodeURIComponent(repoWeb);
console.log('Se abre Render. Entra con tu cuenta de GitHub, autoriza el repositorio, pega CLOUD_KEY y pulsa "Deploy Blueprint".');
console.log(url);
spawnSync('cmd', ['/c', 'start', '', url], { stdio: 'ignore' });
const yes = (await rl.question('\n¿Quieres que run.bat abra el juego de la nube en vez de crear un servidor en este PC? (s/n): ')).trim().toLowerCase().startsWith('s');
if (yes) {
  let e = env;
  e = /^JUGAR_EN_NUBE=.*$/m.test(e) ? e.replace(/^JUGAR_EN_NUBE=.*$/m, 'JUGAR_EN_NUBE=true') : e.trimEnd() + '\nJUGAR_EN_NUBE=true\n';
  fs.writeFileSync(path.join(root, '.env'), e);
  console.log('Hecho. Para volver a jugar con servidor propio, pon JUGAR_EN_NUBE=false en .env.');
}
rl.close();
console.log('\nListo. En unos minutos el juego estará en https://pokemon-rush-world.onrender.com y en el enlace fijo .../jugar de tu web.');
