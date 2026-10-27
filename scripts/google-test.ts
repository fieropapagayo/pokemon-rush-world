// Prueba del acceso con Google: fabrica pases firmados como los de la web (con la misma CLOUD_KEY del servidor)
// y comprueba alta con nombre, vuelta a entrar, pases falsos y caducados.
// Uso: CLOUD_KEY=... npx tsx scripts/google-test.ts [puerto]
import WebSocket from 'ws';
import crypto from 'node:crypto';

const PORT = process.argv[2] || '3020', KEY = process.env.CLOUD_KEY || '';
let fails = 0;
const ok = (n: string, c: boolean, i = '') => { if (!c) fails++; console.log(`${c ? '  OK ' : 'FALLO'}  ${n}${i ? ' — ' + i : ''}`); };
const ticket = (claims: any, key = KEY) => {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 60000, ...claims })).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', key).update(body).digest('base64url');
};
function auth(msg: any): Promise<any> {
  return new Promise(res => {
    const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
    ws.on('open', () => ws.send(JSON.stringify({ t: 'auth', ...msg })));
    ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.t === 'welcome' || m.t === 'auth_err') { ws.close(); res(m); } });
    setTimeout(() => { ws.close(); res(null); }, 8000);
  });
}

async function main() {
  const sub = 'g' + Math.random().toString(36).slice(2), name = 'Goo' + Math.random().toString(36).slice(2, 7);
  const first = await auth({ mode: 'google', ticket: ticket({ sub, given: 'Ash Ketchum' }) });
  ok('Primera vez pide nombre de entrenador', first?.t === 'auth_err' && first.code === 'need_name', `sugerido: ${first?.suggest}`);
  const created = await auth({ mode: 'google', ticket: ticket({ sub, given: 'Ash' }), name });
  ok('Crea la cuenta con el nombre elegido', created?.t === 'welcome' && created.core?.name === name);
  const again = await auth({ mode: 'google', ticket: ticket({ sub }) });
  ok('Al volver entra directo en la misma cuenta', again?.t === 'welcome' && again.core?.name === name);
  const forged = await auth({ mode: 'google', ticket: ticket({ sub }, 'clave-falsa-de-un-atacante-0000') });
  ok('Rechaza pases firmados con otra clave', forged?.t === 'auth_err' && !forged.code, forged?.msg);
  const expired = await auth({ mode: 'google', ticket: ticket({ sub, exp: Date.now() - 1000 }) });
  ok('Rechaza pases caducados', expired?.t === 'auth_err', expired?.msg);
  const pw = await auth({ mode: 'login', name, pass: 'cualquiera' });
  ok('Una cuenta de Google no entra con contraseña', pw?.t === 'auth_err');
  process.exit(fails ? 1 : 0);
}
main();
