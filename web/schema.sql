-- Base de datos D1 de Pokémon Rush World (Cloudflare, plan gratuito).
-- Crear/actualizar con:  npx wrangler d1 execute prw --remote --file=schema.sql

-- Perfil público de cada entrenador (lo que se ve en la web de estadísticas)
CREATE TABLE IF NOT EXISTS players (
  name        TEXT PRIMARY KEY COLLATE NOCASE,
  server      TEXT NOT NULL DEFAULT '',
  guest       INTEGER NOT NULL DEFAULT 1,
  level       INTEGER NOT NULL DEFAULT 1,
  dex_caught  INTEGER NOT NULL DEFAULT 0,
  dex_seen    INTEGER NOT NULL DEFAULT 0,
  shinies     INTEGER NOT NULL DEFAULT 0,
  legends     INTEGER NOT NULL DEFAULT 0,
  catches     INTEGER NOT NULL DEFAULT 0,
  kills       INTEGER NOT NULL DEFAULT 0,
  bosses      INTEGER NOT NULL DEFAULT 0,
  medals      INTEGER NOT NULL DEFAULT 0,
  elo         INTEGER NOT NULL DEFAULT 1000,
  pvp_w       INTEGER NOT NULL DEFAULT 0,
  pvp_l       INTEGER NOT NULL DEFAULT 0,
  money       INTEGER NOT NULL DEFAULT 0,
  playtime    INTEGER NOT NULL DEFAULT 0,
  team        TEXT NOT NULL DEFAULT '[]',   -- [{sp, lvl, shiny}]
  look        TEXT NOT NULL DEFAULT '{}',
  created     INTEGER NOT NULL DEFAULT 0,
  updated     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS players_level ON players(level DESC);
CREATE INDEX IF NOT EXISTS players_dex ON players(dex_caught DESC);
CREATE INDEX IF NOT EXISTS players_shiny ON players(shinies DESC);
CREATE INDEX IF NOT EXISTS players_elo ON players(elo DESC);

-- Copia de seguridad privada de la partida completa (solo accesible con la clave del servidor)
CREATE TABLE IF NOT EXISTS saves (
  name       TEXT PRIMARY KEY COLLATE NOCASE,
  data       TEXT NOT NULL,
  pass_hash  TEXT,
  salt       TEXT,
  guest      INTEGER NOT NULL DEFAULT 1,
  version    INTEGER NOT NULL DEFAULT 1,
  updated    INTEGER NOT NULL
);

-- Servidores de juego que informan de que siguen vivos
CREATE TABLE IF NOT EXISTS servers (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  url       TEXT NOT NULL DEFAULT '',
  online    INTEGER NOT NULL DEFAULT 0,
  max       INTEGER NOT NULL DEFAULT 0,
  version   TEXT NOT NULL DEFAULT '',
  tick_ms   REAL NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL
);

-- Eventos destacados (shinies, legendarios, duelos) para el muro de la web
CREATE TABLE IF NOT EXISTS feed (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  kind    TEXT NOT NULL,
  text    TEXT NOT NULL,
  at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS feed_at ON feed(at DESC);

-- Histórico diario (lo rellena el cron del Worker)
CREATE TABLE IF NOT EXISTS daily (
  day      TEXT PRIMARY KEY,
  players  INTEGER NOT NULL,
  catches  INTEGER NOT NULL,
  shinies  INTEGER NOT NULL,
  peak     INTEGER NOT NULL DEFAULT 0
);

-- Cuentas de Google vinculadas a un entrenador (para recuperar la cuenta en otro servidor)
CREATE TABLE IF NOT EXISTS google_links (
  sub     TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  updated INTEGER NOT NULL
);

-- Sesiones de navegador (hash SHA-256 del token, nunca el token) para recuperar partidas de invitado
CREATE TABLE IF NOT EXISTS session_links (
  hash    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  updated INTEGER NOT NULL
);

-- Límites de peticiones por IP (inicios de sesión e intentos con clave)
CREATE TABLE IF NOT EXISTS rate (
  k     TEXT PRIMARY KEY,
  n     INTEGER NOT NULL,
  since INTEGER NOT NULL
);
