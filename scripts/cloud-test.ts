// Prueba de la nube: crea una cuenta en un servidor, comprueba que su partida llega al Worker
// y que otro servidor con la base de datos vacía la recupera al iniciar sesión.
// Uso: npx tsx scripts/cloud-test.ts <puerto-servidor-A> <puerto-servidor-B> <url-worker>
import WebSocket from 'ws';

const [A, B, W] = [process.argv[2] || '3020', process.argv[3] || '3021', process.argv[4] || 'http://127.0.0.1:8787'];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (n: string, c: boolean, i = '') => { if (!c) fails++; console.log(`${c ? '  OK ' : 'FALLO'}  ${n}${i ? ' — ' + i : ''}`); };

function session(port: string) {
  const ws = new WebSocket(`ws://localhost:${port}/ws`);
  const msgs: any[] = [];
  ws.on('message', d => msgs.push(JSON.parse(d.toString())));
  const wait = (t: string, ms = 8000) => new Promise<any>((res, rej) => {
    const t0 = Date.now();
    const iv = setInterval(() => { const m = msgs.find(x => x.t === t); if (m) { clearInterval(iv); res(m); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout ' + t)); } }, 20);
  });
  return { ws, wait, open: new Promise(r => ws.on('open', r)), send: (m: any) => ws.send(JSON.stringify(m)) };
}

async function main() {
  const name = 'Nube' + Math.random().toString(36).slice(2, 7), pass = 'secreta123';
  const a = session(A); await a.open;
  a.send({ t: 'auth', mode: 'register', name, pass });
  await a.wait('welcome');
  a.send({ t: 'starter', sp: 'squirtle', look: { hat: 2 } });
  await a.wait('starter_ok');
  ok('Cuenta creada en el servidor A', true, name);
  a.ws.close();
  await sleep(10500);
  const prof = await fetch(`${W}/api/player/${name}`).then(r => r.ok ? r.json() : null).catch(() => null);
  ok('La partida aparece en la web de la nube', !!prof && prof.team?.[0]?.sp === 'squirtle', prof ? `nivel ${prof.level}, equipo ${prof.team.map((m: any) => m.sp).join(',')}` : 'sin perfil');
  const b = session(B); await b.open;
  b.send({ t: 'auth', mode: 'login', name, pass });
  const w = await b.wait('welcome', 12000).catch(() => null);
  ok('Otro servidor sin la cuenta la recupera desde la nube', !!w && !w.needStarter && w.mons?.[0]?.sp === 'squirtle', w ? `Pokémon: ${w.mons.map((m: any) => m.sp).join(',')}` : 'sin acceso');
  b.ws.close();
  const bad = session(B); await bad.open;
  bad.send({ t: 'auth', mode: 'login', name, pass: 'incorrecta' });
  const err = await bad.wait('auth_err', 8000).catch(() => null);
  ok('La contraseña sigue protegiendo la cuenta restaurada', !!err, err?.msg);
  bad.ws.close();
  process.exit(fails ? 1 : 0);
}
main();
