// Carga mínima de .env (sin dependencias).
import fs from 'node:fs';
import path from 'node:path';
import { BAL } from '../shared/balance';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DB_FILE: path.resolve(ROOT, process.env.DB_FILE || 'data/pokemon-rush.db'),
  SERVER_NAME: process.env.SERVER_NAME || 'Servidor Pokémon Rush World',
  MAX_PLAYERS: parseInt(process.env.MAX_PLAYERS || '50', 10),
  SHINY_RATE: Math.max(1, parseInt(process.env.SHINY_RATE || '', 10) || BAL.SHINY_RATE),
  ALLOW_GUESTS: (process.env.ALLOW_GUESTS || 'true') !== 'false',
  // Solo para pruebas locales: habilita comandos /dev en el chat. NUNCA activar en un servidor público.
  DEV_CHEATS: process.env.DEV_CHEATS === 'true',
  // Nube (Cloudflare Worker de la carpeta web/): copias de seguridad, ranking y estado del servidor.
  CLOUD_URL: process.env.CLOUD_URL || '',
  CLOUD_KEY: process.env.CLOUD_KEY || '',
  CLOUD_SERVER_ID: process.env.CLOUD_SERVER_ID || 'principal',
  CLOUD_AUTH: (process.env.CLOUD_AUTH || 'true') !== 'false', // sube el hash de la contraseña para poder restaurar cuentas
  PUBLIC_URL: process.env.PUBLIC_URL || '',
  // en un hosting en la nube ya hay dirección pública: no hace falta túnel
  TUNNEL: (process.env.TUNNEL || (process.env.RENDER || process.env.FLY_APP_NAME || process.env.KOYEB_PUBLIC_DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN ? 'false' : 'true')) !== 'false',           // abre una dirección pública con Cloudflare Quick Tunnel
  GOOGLE_LOGIN: (process.env.GOOGLE_LOGIN || 'true') !== 'false',                   // dirección pública del juego (botón "Jugar" de la web)
  VERSION: (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version; } catch { return ''; } })(),
};
