// Prepara/comprueba la base de datos (usado por run.bat).
import { ENV } from '../env';
import { DB } from './db';

try {
  const db = new DB(ENV.DB_FILE);
  const r = db.db.prepare('PRAGMA integrity_check').get() as any;
  const c = db.counts();
  db.close();
  if (r && r.integrity_check !== 'ok') {
    console.error('[db] La comprobación de integridad ha fallado:', r.integrity_check);
    process.exit(1);
  }
  console.log(`[db] Base de datos lista: ${ENV.DB_FILE} (${c.accounts} cuentas, ${c.saves} partidas)`);
} catch (e: any) {
  console.error('[db] ERROR al preparar la base de datos:', e?.message || e);
  process.exit(1);
}
