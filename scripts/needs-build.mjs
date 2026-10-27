// Sale con código 1 si el cliente necesita recompilarse (dist ausente o fuentes más nuevas).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const out = path.join(root, 'dist', 'index.html');
if (!fs.existsSync(out)) process.exit(1);
const built = fs.statSync(out).mtimeMs;
function newest(dir) {
  let m = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) m = Math.max(m, newest(p));
    else m = Math.max(m, fs.statSync(p).mtimeMs);
  }
  return m;
}
const src = Math.max(newest(path.join(root, 'client')), newest(path.join(root, 'shared')), fs.statSync(path.join(root, 'package.json')).mtimeMs);
process.exit(src > built ? 1 : 0);
