// Despliegue automático de la web en Cloudflare: run.bat lo llama al arrancar.
// Si cambió algo de la carpeta web/ desde la última publicación, aplica el esquema (idempotente) y publica el Worker.
// Nunca bloquea el juego: ante cualquier problema avisa y sigue.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
process.env.XDG_CONFIG_HOME = path.join(here, '.wrangler-home'); // sesión de Cloudflare propia de este proyecto
const stamp = path.join(here, '.wrangler-home', 'last-deploy.txt');
const tokenFile = path.join(here, 'cloudflare-token.txt');
if (fs.existsSync(tokenFile)) {
  const [tok, acc] = fs.readFileSync(tokenFile, 'utf8').trim().split(/\s+/);
  if (tok) process.env.CLOUDFLARE_API_TOKEN = tok;
  if (acc && /^[0-9a-f]{32}$/.test(acc)) process.env.CLOUDFLARE_ACCOUNT_ID = acc;
}
const toml = fs.readFileSync(path.join(here, 'wrangler.toml'), 'utf8');

if (!fs.existsSync(path.join(here, 'node_modules', 'wrangler'))) { console.log('  [web] wrangler no instalado: ejecuta web\\desplegar.bat una vez.'); process.exit(0); }
if (/database_id = "0{8}-/.test(toml)) { console.log('  [web] aún no desplegada: ejecuta web\\desplegar.bat una vez.'); process.exit(0); }

const files = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } };
walk(path.join(here, 'src')); walk(path.join(here, 'public'));
files.push(path.join(here, 'schema.sql'), path.join(here, 'wrangler.toml'));
const h = crypto.createHash('sha256');
for (const f of files.sort()) h.update(f.slice(here.length) + '\0' + fs.readFileSync(f));
const hash = h.digest('hex');
if (fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8').trim() === hash) { console.log('  [web] la web de Cloudflare está al día.'); process.exit(0); }

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const run = args => spawnSync(npx, ['wrangler', ...args], { cwd: here, encoding: 'utf8', shell: process.platform === 'win32', timeout: 180000 });
console.log('  [web] hay cambios en web/: publicando en Cloudflare...');
const sch = run(['d1', 'execute', 'prw', '--remote', '--file=schema.sql', '-y']);
if (sch.status !== 0) { console.log('  [web] no se pudo actualizar la base de datos (¿sin Internet o sesión caducada? ejecuta web\\desplegar.bat).'); process.exit(0); }
const dep = run(['deploy']);
if (dep.status !== 0) { console.log('  [web] no se pudo publicar:', ((dep.stdout || '') + (dep.stderr || '')).split('\n').slice(-4).join(' ')); process.exit(0); }
fs.mkdirSync(path.dirname(stamp), { recursive: true });
fs.writeFileSync(stamp, hash);
const url = ((dep.stdout || '').match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i) || [])[0];
console.log('  [web] publicada' + (url ? ' en ' + url : '') + '.');
