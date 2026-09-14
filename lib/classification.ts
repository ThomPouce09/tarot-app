// lib/classification.ts
// Source unique de vérité : classification des tirages par univers
// et "base" vs "avancé". Vitale pour le moteur d'entitlements.
//
// Univers : tarot | yijing | des | runes
// Base (1 par univers) : tirage générique sans question.
// Avancé (grand) : tirage qui accepte une question / interprétation riche.

export type Universe = 'tarot' | 'yijing' | 'des' | 'runes';

export interface TirageClass {
  universe: Universe;
  isBase: boolean;
}

// ── Base (1 par univers, validé par l'utilisateur) ──────────────
// Le reste d'un univers est "avancé".
const BASE_TYPES: Record<Universe, string> = {
  tarot: 'tarot-3-cartes-simplifie', // « 3 Cartes Simplifié » (intention thème/sous-thème)
  // tarot-3-cartes = tirage « précis » (question libre) → avancé/grand.
  yijing: 'yi-jing-simplifie', // « Yi Jing » — tirage des baguettes d'achillée (base)
  // affinage = question libre (avancé), simplifié = intention guidée (base),
  // comme tarot/yi-jing.
  des: 'des-simplifie',
  runes: 'runes-nornes2', // « Le fil des Nornes (simplifié) » (à l'aveugle)
};

const UNIVERSE_TYPES: Record<Universe, string[]> = {
  tarot: ['tarot-3-cartes', 'tarot-3-cartes-simplifie', 'tarot-5-cartes', 'tarot-5-c-manuelle'],
  yijing: ['yi-jing-simplifie', 'yi-jing-du-jour', 'yi-jing-simple', 'yi-jing-question', 'yi-qing'],
  des: ['des-simplifie', 'des-affinage', 'des-choix', 'des-obstacle-solution'],
  runes: ['runes-mjolnir', 'runes-nornes', 'runes-nornes2', 'runes-yggdrasil'],
};

export const UNIVERSES: Universe[] = ['tarot', 'yijing', 'des', 'runes'];

// Tous les types de tirages connus (base + avancés), pour la vérification batch côté hub.
export const ALL_TIRAGE_TYPES: string[] = UNIVERSES.flatMap((u) => UNIVERSE_TYPES[u]);

/** Univers d'un type de tirage, ou null si inconnu. */
export function universeOf(type: string): Universe | null {
  for (const u of UNIVERSES) if (UNIVERSE_TYPES[u].includes(type)) return u;
  return null;
}

/** Vrai si le type est un tirage de base (1 par univers). */
export function isBaseType(type: string): boolean {
  return BASE_TYPES[universeOf(type) as Universe] === type;
}

/** Classification complète d'un type, ou null si non reconnu. */
export function classify(type: string): TirageClass | null {
  const universe = universeOf(type);
  if (!universe) return null;
  return { universe, isBase: isBaseType(type) };
}

/** Le tirage de base d'un univers donné. */
export function baseTypeOf(universe: Universe): string {
  return BASE_TYPES[universe];
}

/** Liste des types avancés d'un univers. */
export function advancedTypesOf(universe: Universe): string[] {
  return UNIVERSE_TYPES[universe].filter((t) => t !== BASE_TYPES[universe]);
}
