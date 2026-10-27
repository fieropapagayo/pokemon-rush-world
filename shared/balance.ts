// Parámetros de economía y probabilidades en un solo lugar.
// Ajustados con scripts/balance-sim.ts (simulación de progresión de un jugador).

export const BAL = {
  // --- experiencia ---
  MON_XP_K: 1,              // EXP total para el nivel L = K * L^3 * (1 + max(0, L-FROM)/DIV)
  MON_XP_LATE_FROM: 30,
  MON_XP_LATE_DIV: 25,
  TRAINER_XP_K: 40,         // EXP de entrenador para el nivel L = K * (L-1)^E
  TRAINER_XP_EXP: 2.4,
  KILL_XP_A: 8,             // EXP por derrota = baseExp * L / (A + B*L)  (x factor de diferencia de nivel)
  KILL_XP_B: 1.5,           //   → generoso al principio, exigente en niveles altos
  XP_KILLER: 1,             // fracción para el Pokémon que da el golpe final
  XP_TEAM: 0.6,             // fracción para el resto del equipo activo
  XP_FAINTED: 0.3,          // fracción para miembros debilitados
  XP_TRAINER: 0.45,         // fracción para el entrenador
  // --- dinero y botín ---
  MONEY_BASE: 4,
  MONEY_PER_LVL: 1.6,
  ESS_CHANCE: 0.38,
  // --- aparición ---
  SHINY_RATE: 4096,         // denominador base; encounters.ts aplica rareza y especie
  SHINY_INCENSE: 3,         // multiplicador del Incienso Raro (total limitado a x8)
  SHINY_CHARM: 2,           // multiplicador del Amuleto Iris
  DENSITY_BONUS: 3,
  // --- dificultad (2.4) ---
  AMBIENT_DENSITY: 0.35,     // fracción de salvajes "paseando" respecto a la densidad de la zona (el resto llega por encuentros)
  WILD_DMG: 1.22,           // daño de salvajes contra tu equipo
  WILD_TRAINER_DMG: 0.95,   // daño de salvajes contra el entrenador (antes 0.7)
  AGGRO_ATK: 1.12,          // los salvajes agresivos pegan un poco más fuerte
  DEATH_MONEY_LOSS: 0.08,   // dinero perdido al debilitarse el entrenador
  TRAINER_REGEN: 0.025,     // regeneración del entrenador fuera de combate (PS/s)
  DROP_CHEST: 0.035,        // probabilidad base de que un salvaje derrotado suelte un cofre
  // --- 2.8: combates más largos y captura más difícil ---
  WILD_HP: 2.0,             // vida de los salvajes (los combates duran más)
  ALLY_HP: 1.6,             // vida de tu equipo
  CATCH_MULT: 0.45,         // dificultad general de captura
  REVIVE_MS: 60000,         // un Pokémon debilitado tarda 60 s en volver por sí solo (antes 8 s)
  REVIVE_HP: 0.15,          // y vuelve con poca vida
};

export type Bal = typeof BAL;

/** EXP base que da un Pokémon derrotado (antes de multiplicadores). */
export function killXp(baseExp: number, lvl: number) { return baseExp * lvl / (BAL.KILL_XP_A + BAL.KILL_XP_B * lvl); }

/** Factor de EXP por diferencia de nivel (estilo Gen 5): luchar contra rivales más fuertes da más EXP. */
export function levelXpFactor(wildLvl: number, monLvl: number) {
  const f = Math.pow((2 * wildLvl + 10) / (wildLvl + monLvl + 10), 2.5);
  return Math.max(0.1, Math.min(2.5, f));
}
