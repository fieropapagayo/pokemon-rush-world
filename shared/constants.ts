// Constantes compartidas entre cliente y servidor.

export const TILE = 16;               // píxeles por tile
export const CHUNK = 32;              // tiles por chunk (lado)
export const OVER_W = 400;            // mundo exterior (tiles)
export const OVER_H = 400;
export const WORLD_W = 560;           // incluye la franja de mazmorras (x >= 400)
export const WORLD_H = 400;
export const WORLD_SEED = 20261026;

export const TICK_HZ = 20;
export const SNAP_EVERY = 2;          // snapshot cada 2 ticks (10 Hz)
export const PLAYER_SPEED = 5.4;      // tiles por segundo
export const VIEW_RADIUS = 30;        // radio de interés (tiles)
export const MAX_TEAM = 6;
export const MAX_PARTY = 4;
export const DAY_LENGTH_MS = 20 * 60 * 1000; // ciclo completo día/noche
export const PROTOCOL_VERSION = 1;

// Tipos de terreno
export const T = {
  VOID: 0,
  GRASS: 1,
  TALL: 2,
  FLOWERS: 3,
  PATH: 4,
  SAND: 5,
  WATER: 6,
  FOREST: 7,
  ROCK: 8,
  CLIFF: 9,
  SNOW: 10,
  LAVA: 11,
  ASH: 12,
  MUD: 13,
  SWAMP: 14,
  CAVE: 15,
  CAVEWALL: 16,
  TOWN: 17,
  HAUNT: 18,
  BRIDGE: 19,
  DRYGRASS: 20,
  CRYSTAL: 21,
  TOWERFLOOR: 22,
  TOWERWALL: 23,
  HILL: 24,        // colina / meseta con hierba (bloquea, se dibuja con relieve)
  WOODFLOOR: 25,   // suelo de madera de interiores
  TILEFLOOR: 26,   // baldosas de Centro Pokémon / Tienda / Laboratorio
  INWALL: 27,      // pared de interior
} as const;
export const TERRAIN_COUNT = 28;

// 0 = transitable, 1 = bloqueado, 2 = agua (solo nadadores/voladores)
export const SOLID_OF: number[] = (() => {
  const a = new Array(TERRAIN_COUNT).fill(0);
  a[T.VOID] = 1;
  a[T.WATER] = 2;
  a[T.SWAMP] = 2;
  a[T.CLIFF] = 1;
  a[T.LAVA] = 1;
  a[T.CAVEWALL] = 1;
  a[T.TOWERWALL] = 1;
  a[T.HILL] = 1;
  a[T.INWALL] = 1;
  return a;
})();

// Color de cada terreno para minimapa / mapa mundial
export const TERRAIN_MAP_COLOR: string[] = (() => {
  const c = new Array(TERRAIN_COUNT).fill('#000');
  c[T.GRASS] = '#6fbf4a'; c[T.TALL] = '#4e9a35'; c[T.FLOWERS] = '#86c95a';
  c[T.PATH] = '#d8b878'; c[T.SAND] = '#ecd99a'; c[T.WATER] = '#3c7fd8';
  c[T.FOREST] = '#2f7a34'; c[T.ROCK] = '#a08a6a'; c[T.CLIFF] = '#6f5a44';
  c[T.SNOW] = '#eef4fa'; c[T.LAVA] = '#ff5a1e'; c[T.ASH] = '#6b5a5a';
  c[T.MUD] = '#6d6a3e'; c[T.SWAMP] = '#3f5e44'; c[T.CAVE] = '#5b4d48';
  c[T.CAVEWALL] = '#2a221f'; c[T.TOWN] = '#c9c2b4'; c[T.HAUNT] = '#7a6a86';
  c[T.BRIDGE] = '#a0703c'; c[T.DRYGRASS] = '#b9b55a'; c[T.CRYSTAL] = '#6a7ab8';
  c[T.TOWERFLOOR] = '#5e4a6e'; c[T.TOWERWALL] = '#2b1f36';
  c[T.HILL] = '#5f9a48'; c[T.WOODFLOOR] = '#b98a58'; c[T.TILEFLOOR] = '#e4e0d4'; c[T.INWALL] = '#6a5a4a';
  return c;
})();

export const STATUS = { NONE: 0, BURN: 1, POISON: 2, PARALYZE: 3, SLEEP: 4, FREEZE: 5 } as const;
export const STATUS_NAMES = ['', 'Quemado', 'Envenenado', 'Paralizado', 'Dormido', 'Congelado'];

export function clamp(v: number, a: number, b: number) { return v < a ? a : v > b ? b : v; }
export function dist(ax: number, ay: number, bx: number, by: number) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
