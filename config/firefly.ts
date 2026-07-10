// ===========================================================================
// Paramètres des créatures errantes (lucioles / petits personnages)
// Fichier DÉDIÉ et volontairement à part : modifiable sans toucher au reste.
// Toutes les durées sont en millisecondes (ms).
// ===========================================================================

export const FIREFLY_CONFIG = {
  // Pages où les créatures peuvent apparaître (doit correspondre à Creature.page en DB)
  pages: ['landing', 'tarot', 'runes', 'yi-jing'] as const,

  // Fondu d'apparition — varie aléatoirement dans la plage à chaque cycle
  fadeInMs: [1500, 3000] as [number, number],

  // Fondu de disparition — varie aléatoirement dans la plage
  fadeOutMs: [1500, 3000] as [number, number],

  // Temps où la créature reste visible et se déplace doucement (avant de disparaître)
  wanderMs: [15000, 40000] as [number, number],

  // Délai entre deux apparitions (une seule créature à la fois)
  spawnIntervalMs: [5000, 45000] as [number, number],

  // Délai avant la PREMIÈRE apparition — valeur de prod (laisser la page se
  // charger calmement avant la 1re luciole, aligné sur spawnIntervalMs)
  firstSpawnMs: 15000,

  // Taille du point lumineux (px) — petit et doré
  dotSize: 12,

  // Rayon du halo lumineux (px) — discret
  glowSpread: 10,

  // Période de recalcul de la cible de déplacement — fluidité "insecte"
  // court = trajectoire continue et douce (pas de saut)
  moveStepMs: 1500,
} as const;

export type FireflyConfig = typeof FIREFLY_CONFIG;
export type FireflyPage = (typeof FIREFLY_CONFIG.pages)[number];
