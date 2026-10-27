// Publica TODO de una vez: compila, comprueba, sube a GitHub (Render se redespliega solo) y actualiza la web de Cloudflare.
// Uso: publicar.bat  (o: node scripts/publish.mjs "mensaje opcional")
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', ...opts });
const git = args => run('git', args);
const step = t => console.log('\n=== ' + t + ' ===');
const fail = t => { console.error('\n[ERROR] ' + t); process.exit(1); };

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const msg = process.argv.slice(2).join(' ').trim() || `Pokémon Rush World ${version}`;

if (git(['remote', 'get-url', 'origin']).status !== 0) fail('El proyecto no está conectado a GitHub. Ejecuta primero subir-a-render.bat.');

step('1/4 Comprobando el código');
if (run('npx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], { stdio: 'inherit' }).status !== 0) fail('Hay errores de TypeScript: corrígelos antes de publicar (no se ha subido nada).');

step('2/4 Compilando el cliente');
if (run('npm', ['run', 'build'], { stdio: 'inherit' }).status !== 0) fail('Falló la compilación (no se ha subido nada).');

step('3/4 Subiendo a GitHub (Render publicará la nueva versión solo)');
git(['add', '-A']);
const staged = (git(['diff', '--cached', '--name-only']).stdout || '').split('\n').filter(Boolean);
const secret = staged.filter(f => /(^|\/)\.env$|\.db($|-)|wrangler-home|\.dev\.vars|cloudflare-token/.test(f));
if (secret.length) { git(['reset', '-q']); fail('Se iban a subir archivos secretos: ' + secret.join(', ') + '. Revisa .gitignore.'); }
if (staged.length) {
  const c = git(['commit', '-q', '-m', msg]);
  if (c.status !== 0) fail('No se pudo crear el commit:\n' + c.stderr);
  console.log(`  ${staged.length} archivos en el commit "${msg}"`);
} else console.log('  No hay cambios nuevos que guardar.');
const push = run('git', ['push', '-u', 'origin', 'main'], { stdio: 'inherit' });
if (push.status !== 0) fail('No se pudo subir a GitHub (¿sin Internet o sesión caducada?). Vuelve a ejecutar publicar.bat.');

step('4/4 Web de Cloudflare');
if (fs.existsSync(path.join(root, 'web', 'autodeploy.mjs'))) run('node', ['web/autodeploy.mjs'], { stdio: 'inherit' });

console.log(`\nListo: versión ${version} publicada.`);
console.log('  Render la despliega en 3-6 minutos: https://pokemon-rush-world.onrender.com');
console.log('  Enlace para jugar: https://pokemon-rush-world.pokemonrush.workers.dev/jugar');
