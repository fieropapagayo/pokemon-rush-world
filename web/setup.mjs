// Despliegue guiado en Cloudflare (gratis): crea la base D1, aplica el esquema, genera la clave secreta,
// publica el Worker y escribe CLOUD_URL / CLOUD_KEY en el .env del servidor de juego.
// Uso: node setup.mjs   (desplegar.bat lo ejecuta por ti)
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
process.env.XDG_CONFIG_HOME = path.join(here, '.wrangler-home'); // sesión de Cloudflare propia de este proyecto
const toml = path.join(here, 'wrangler.toml');
const envFile = path.join(here, '..', '.env');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = (args, opts = {}) => {
  const r = spawnSync(npx, ['wrangler', ...args], { cwd: here, encoding: 'utf8', shell: process.platform === 'win32', ...opts });
  return { ok: r.status === 0, out: (r.stdout || '') + (r.stderr || '') };
};
const step = t => console.log('\n=== ' + t + ' ===');

step('1/6 Comprobando la sesión de Cloudflare');
// Alternativa al inicio de sesión por navegador: un token de API guardado en web/cloudflare-token.txt
const tokenFile = path.join(here, 'cloudflare-token.txt');
if (fs.existsSync(tokenFile)) {
  const tok = fs.readFileSync(tokenFile, 'utf8').trim().split(/\s+/)[0];
  if (tok) { process.env.CLOUDFLARE_API_TOKEN = tok; console.log('Usando el token de API de web/cloudflare-token.txt.'); }
  const acc = fs.readFileSync(tokenFile, 'utf8').trim().split(/\s+/)[1];
  if (acc && /^[0-9a-f]{32}$/.test(acc)) process.env.CLOUDFLARE_ACCOUNT_ID = acc;
}
let who = run(['whoami']);
if (!/associated with the email|You are logged in/i.test(who.out)) {
  console.log('No has iniciado sesión. Se abrirá el navegador para que entres en tu cuenta de Cloudflare.');
  console.log('IMPORTANTE: usa SOLO la pestaña nueva que se abra (cierra antes las de intentos anteriores) y pulsa "Allow".');
  console.log('Si sale "CSRF" o "request_forbidden", mira web/README.md, apartado "Si falla el inicio de sesión".\n');
  const r = spawnSync(npx, ['wrangler', 'login'], { cwd: here, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('\nNo se pudo iniciar sesión en Cloudflare. Mira web/README.md, apartado "Si falla el inicio de sesión".'); process.exit(1); }
  who = run(['whoami']);
}
const email = (who.out.match(/associated with the email ([^\s.]+@[^\s]+?)\.?\s/) || [])[1] || '';
const account = (who.out.match(/│\s*([^│]+?)\s*│\s*([0-9a-f]{32})\s*│/) || []);
console.log(`Cuenta: ${email || account[1] || '(token de API)'}${account[2] ? ' · ' + account[2] : ''}`);
if (process.stdin.isTTY) {
  const rl = (await import('node:readline/promises')).createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question('¿Es la cuenta donde quieres publicar la web? (s/n): ')).trim().toLowerCase();
  rl.close();
  if (!ans.startsWith('s')) {
    run(['logout']);
    console.log('Sesión cerrada en este proyecto. Vuelve a ejecutar desplegar.bat y entra con la cuenta correcta.');
    process.exit(1);
  }
}

step('2/6 Base de datos D1 "prw"');
let id = '';
const list = run(['d1', 'list', '--json']);
try { id = (JSON.parse(list.out.slice(list.out.indexOf('['))) .find(d => d.name === 'prw') || {}).uuid || ''; } catch { /* lista vacía */ }
if (!id) {
  const c = run(['d1', 'create', 'prw']);
  const m = c.out.match(/database_id\s*=\s*"([0-9a-f-]{36})"/i) || c.out.match(/"database_id":\s*"([0-9a-f-]{36})"/i);
  if (!m) { console.error(c.out); console.error('No se pudo crear la base de datos.'); process.exit(1); }
  id = m[1];
}
console.log('database_id =', id);
fs.writeFileSync(toml, fs.readFileSync(toml, 'utf8').replace(/database_id = "[^"]*"/, `database_id = "${id}"`));

step('3/6 Tablas');
const sch = run(['d1', 'execute', 'prw', '--remote', '--file=schema.sql', '-y']);
if (!sch.ok) { console.error(sch.out); process.exit(1); }
console.log('Esquema aplicado.');

step('4/6 Clave secreta del servidor');
let env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const set = (k, v) => { env = new RegExp(`^${k}=.*$`, 'm').test(env) ? env.replace(new RegExp(`^${k}=.*$`, 'm'), `${k}=${v}`) : env.trimEnd() + `\n${k}=${v}\n`; };
let key = (env.match(/^CLOUD_KEY=(.+)$/m) || [])[1]?.trim();
if (!key) key = crypto.randomBytes(24).toString('base64url');
const sec = spawnSync(npx, ['wrangler', 'secret', 'put', 'SYNC_KEY'], { cwd: here, input: key + '\n', encoding: 'utf8', shell: process.platform === 'win32' });
if (sec.status !== 0) {
  // La primera vez el Worker aún no existe: se publica y se vuelve a intentar.
  run(['deploy']);
  const again = spawnSync(npx, ['wrangler', 'secret', 'put', 'SYNC_KEY'], { cwd: here, input: key + '\n', encoding: 'utf8', shell: process.platform === 'win32' });
  if (again.status !== 0) { console.error((again.stdout || '') + (again.stderr || '')); process.exit(1); }
}
set('CLOUD_KEY', key); fs.writeFileSync(envFile, env); // se guarda ya, por si falla un paso posterior
console.log('SYNC_KEY guardada cifrada en Cloudflare y en .env.');

step('5/6 Publicando el Worker');
const dep = run(['deploy']);
if (!dep.ok) {
  if (/workers\.dev subdomain/i.test(dep.out)) {
    const acc = (dep.out.match(/dash\.cloudflare\.com\/([0-9a-f]{32})\/workers\/onboarding/) || [])[1];
    console.error('\nTu cuenta aún no tiene subdominio workers.dev (la dirección pública de la web).');
    console.error('Elige uno gratis aquí y vuelve a ejecutar desplegar.bat:');
    console.error('  https://dash.cloudflare.com/' + (acc ? acc + '/' : '') + 'workers/onboarding');
  } else console.error(dep.out);
  process.exit(1);
}
const url = (dep.out.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0] || '';
console.log(url ? 'Publicado en ' + url : dep.out);

step('6/6 Configurando el servidor de juego (.env)');
if (url) set('CLOUD_URL', url);
set('CLOUD_KEY', key);
fs.writeFileSync(envFile, env);
console.log(`Listo. Reinicia el servidor de juego (run.bat) y abre ${url || 'tu Worker'} para ver el ranking.`);
