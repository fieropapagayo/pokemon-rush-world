// Persistencia con SQLite nativo de Node (node:sqlite, Node >= 22.13).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export interface AccountRow { id: number; username: string; pass_hash: string | null; salt: string | null; guest: number; created_at: number; google_sub?: string | null; }

export class DB {
  db: DatabaseSync;

  constructor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        pass_hash TEXT,
        salt TEXT,
        guest INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_login INTEGER
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS saves (
        account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        prev_data TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    `);
    this.db.prepare('INSERT OR IGNORE INTO meta(key, value) VALUES (?, ?)').run('schema', '1');
    // v2: cuentas vinculadas a Google
    const cols = (this.db.prepare('PRAGMA table_info(accounts)').all() as any[]).map(c => c.name);
    if (!cols.includes('google_sub')) this.db.exec('ALTER TABLE accounts ADD COLUMN google_sub TEXT');
    this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS accounts_google ON accounts(google_sub) WHERE google_sub IS NOT NULL');
  }

  static hashPassword(pass: string, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(pass, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
    return { hash, salt };
  }
  static verifyPassword(pass: string, salt: string, hash: string) {
    const h = crypto.scryptSync(pass, salt, 64, { N: 16384, r: 8, p: 1 });
    const ref = Buffer.from(hash, 'hex');
    return ref.length === h.length && crypto.timingSafeEqual(ref, h);
  }
  static tokenHash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }

  findGoogle(sub: string): AccountRow | undefined {
    return this.db.prepare('SELECT * FROM accounts WHERE google_sub = ?').get(sub) as any;
  }
  linkGoogle(id: number, sub: string) { this.db.prepare('UPDATE accounts SET google_sub = ?, guest = 0 WHERE id = ?').run(sub, id); }
  findAccount(username: string): AccountRow | undefined {
    return this.db.prepare('SELECT * FROM accounts WHERE username = ?').get(username) as any;
  }
  getAccount(id: number): AccountRow | undefined {
    return this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
  }
  createAccount(username: string, pass: string | null, guest: boolean): number {
    let hash: string | null = null, salt: string | null = null;
    if (pass) { const r = DB.hashPassword(pass); hash = r.hash; salt = r.salt; }
    const res = this.db.prepare('INSERT INTO accounts(username, pass_hash, salt, guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(username, hash, salt, guest ? 1 : 0, Date.now());
    return Number(res.lastInsertRowid);
  }
  /** Crea una cuenta con un hash ya calculado (restauración desde la nube). */
  createAccountRaw(username: string, hash: string | null, salt: string | null, guest: boolean): number {
    const res = this.db.prepare('INSERT INTO accounts(username, pass_hash, salt, guest, created_at) VALUES (?, ?, ?, ?, ?)').run(username, hash, salt, guest ? 1 : 0, Date.now());
    return Number(res.lastInsertRowid);
  }
  touchLogin(id: number) { this.db.prepare('UPDATE accounts SET last_login = ? WHERE id = ?').run(Date.now(), id); }

  createSession(accountId: number): string {
    const token = crypto.randomBytes(32).toString('base64url');
    this.db.prepare('INSERT INTO sessions(token_hash, account_id, created_at) VALUES (?, ?, ?)').run(DB.tokenHash(token), accountId, Date.now());
    return token;
  }
  /** Hashes de las sesiones de una cuenta (para recuperar invitados en otro servidor; nunca sale el token). */
  sessionHashesOf(accountId: number): string[] {
    return (this.db.prepare('SELECT token_hash FROM sessions WHERE account_id = ? ORDER BY created_at DESC LIMIT 5').all(accountId) as any[]).map(r => r.token_hash);
  }
  addSessionHash(hash: string, accountId: number) {
    this.db.prepare('INSERT OR IGNORE INTO sessions(token_hash, account_id, created_at) VALUES (?, ?, ?)').run(hash, accountId, Date.now());
  }
  findSession(token: string): number | null {
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
    const r = this.db.prepare('SELECT account_id FROM sessions WHERE token_hash = ?').get(DB.tokenHash(token)) as any;
    return r ? r.account_id : null;
  }

  loadSave(accountId: number): any | null {
    const r = this.db.prepare('SELECT data, prev_data FROM saves WHERE account_id = ?').get(accountId) as any;
    if (!r) return null;
    try { return JSON.parse(r.data); } catch {
      // Guardado dañado: recuperar la copia anterior
      console.warn(`[db] guardado dañado para la cuenta ${accountId}, usando copia de seguridad`);
      try { return r.prev_data ? JSON.parse(r.prev_data) : null; } catch { return null; }
    }
  }

  writeSave(accountId: number, data: any) {
    const json = JSON.stringify(data);
    JSON.parse(json); // valida antes de escribir
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const cur = this.db.prepare('SELECT data FROM saves WHERE account_id = ?').get(accountId) as any;
      if (cur) this.db.prepare('UPDATE saves SET prev_data = data, data = ?, version = version + 1, updated_at = ? WHERE account_id = ?').run(json, Date.now(), accountId);
      else this.db.prepare('INSERT INTO saves(account_id, version, data, updated_at) VALUES (?, 1, ?, ?)').run(accountId, json, Date.now());
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  counts() {
    const a = this.db.prepare('SELECT COUNT(*) AS n FROM accounts').get() as any;
    const s = this.db.prepare('SELECT COUNT(*) AS n FROM saves').get() as any;
    return { accounts: a.n, saves: s.n };
  }

  close() { try { this.db.close(); } catch { /* ya cerrada */ } }
}
