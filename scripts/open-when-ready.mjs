// Espera a que el servidor responda en /health y abre el navegador por defecto.
import http from 'node:http';
import { exec } from 'node:child_process';

const port = process.argv[2] || '3000';
const url = `http://localhost:${port}`;
const t0 = Date.now();

function check() {
  const req = http.get(url + '/health', res => {
    res.resume();
    if (res.statusCode === 200) {
      const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      exec(cmd);
      process.exit(0);
    } else retry();
  });
  req.on('error', retry);
  req.setTimeout(1500, () => { req.destroy(); });
}
function retry() {
  if (Date.now() - t0 > 90000) { console.log('[run] El servidor no respondió a tiempo; abre ' + url + ' manualmente.'); process.exit(0); }
  setTimeout(check, 700);
}
check();
