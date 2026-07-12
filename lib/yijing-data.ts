// Données de référence du Yi Jing (lecture seule, aucune modif DB).
// Les paires de trigrammes (supérieur / inférieur) sont extraites du seed
// (scripts/seed-hexagrams.js) — source de vérité pour l'affichage des
// trigrammes réels de chaque hexagramme.

export interface TrigramInfo {
  name: string;
  symbol: string;
  meaning: string;
}

// Les 8 trigrammes fondamentaux (Ba Gua)
export const TRIGRAM_INFO: Record<string, TrigramInfo> = {
  Ciel: { name: 'Ciel', symbol: '☰', meaning: 'Créativité, force, action souveraine' },
  Terre: { name: 'Terre', symbol: '☷', meaning: 'Réceptivité, accueil, fertilité' },
  Eau: { name: 'Eau', symbol: '☵', meaning: 'Danger profond, fluidité, abîme' },
  Montagne: { name: 'Montagne', symbol: '☶', meaning: 'Immobilité, calme, arrêt' },
  Tonnerre: { name: 'Tonnerre', symbol: '☳', meaning: 'Mouvement, éveil, action' },
  Vent: { name: 'Vent', symbol: '☴', meaning: 'Pénétration douce, souplesse' },
  Feu: { name: 'Feu', symbol: '☲', meaning: 'Clarté, lumière, dépendance' },
  Lac: { name: 'Lac', symbol: '☱', meaning: 'Joie, ouverture, satisfaction' },
};

// Paires de trigrammes par numéro d'hexagramme (1..64), depuis le seed.
export const HEXAGRAM_TRIGRAMS: Record<number, { superior: string; inferior: string }> = {
  1: { superior: 'Ciel', inferior: 'Ciel' },
  2: { superior: 'Terre', inferior: 'Terre' },
  3: { superior: 'Eau', inferior: 'Tonnerre' },
  4: { superior: 'Montagne', inferior: 'Eau' },
  5: { superior: 'Eau', inferior: 'Ciel' },
  6: { superior: 'Ciel', inferior: 'Eau' },
  7: { superior: 'Terre', inferior: 'Eau' },
  8: { superior: 'Eau', inferior: 'Terre' },
  9: { superior: 'Vent', inferior: 'Ciel' },
  10: { superior: 'Ciel', inferior: 'Lac' },
  11: { superior: 'Terre', inferior: 'Ciel' },
  12: { superior: 'Ciel', inferior: 'Terre' },
  13: { superior: 'Ciel', inferior: 'Feu' },
  14: { superior: 'Feu', inferior: 'Ciel' },
  15: { superior: 'Montagne', inferior: 'Terre' },
  16: { superior: 'Tonnerre', inferior: 'Terre' },
  17: { superior: 'Lac', inferior: 'Tonnerre' },
  18: { superior: 'Montagne', inferior: 'Vent' },
  19: { superior: 'Terre', inferior: 'Lac' },
  20: { superior: 'Vent', inferior: 'Terre' },
  21: { superior: 'Feu', inferior: 'Tonnerre' },
  22: { superior: 'Ciel', inferior: 'Montagne' },
  23: { superior: 'Montagne', inferior: 'Terre' },
  24: { superior: 'Terre', inferior: 'Tonnerre' },
  25: { superior: 'Ciel', inferior: 'Tonnerre' },
  26: { superior: 'Montagne', inferior: 'Ciel' },
  27: { superior: 'Montagne', inferior: 'Tonnerre' },
  28: { superior: 'Lac', inferior: 'Vent' },
  29: { superior: 'Eau', inferior: 'Eau' },
  30: { superior: 'Feu', inferior: 'Feu' },
  31: { superior: 'Lac', inferior: 'Montagne' },
  32: { superior: 'Tonnerre', inferior: 'Vent' },
  33: { superior: 'Ciel', inferior: 'Montagne' },
  34: { superior: 'Tonnerre', inferior: 'Ciel' },
  35: { superior: 'Feu', inferior: 'Terre' },
  36: { superior: 'Terre', inferior: 'Feu' },
  37: { superior: 'Vent', inferior: 'Feu' },
  38: { superior: 'Feu', inferior: 'Lac' },
  39: { superior: 'Eau', inferior: 'Montagne' },
  40: { superior: 'Tonnerre', inferior: 'Eau' },
  41: { superior: 'Montagne', inferior: 'Lac' },
  42: { superior: 'Vent', inferior: 'Tonnerre' },
  43: { superior: 'Lac', inferior: 'Ciel' },
  44: { superior: 'Ciel', inferior: 'Vent' },
  45: { superior: 'Lac', inferior: 'Terre' },
  46: { superior: 'Terre', inferior: 'Vent' },
  47: { superior: 'Lac', inferior: 'Eau' },
  48: { superior: 'Eau', inferior: 'Vent' },
  49: { superior: 'Lac', inferior: 'Feu' },
  50: { superior: 'Feu', inferior: 'Vent' },
  51: { superior: 'Tonnerre', inferior: 'Tonnerre' },
  52: { superior: 'Montagne', inferior: 'Montagne' },
  53: { superior: 'Vent', inferior: 'Montagne' },
  54: { superior: 'Tonnerre', inferior: 'Lac' },
  55: { superior: 'Tonnerre', inferior: 'Feu' },
  56: { superior: 'Feu', inferior: 'Montagne' },
  57: { superior: 'Vent', inferior: 'Vent' },
  58: { superior: 'Lac', inferior: 'Lac' },
  59: { superior: 'Vent', inferior: 'Eau' },
  60: { superior: 'Eau', inferior: 'Lac' },
  61: { superior: 'Vent', inferior: 'Lac' },
  62: { superior: 'Montagne', inferior: 'Lac' },
  63: { superior: 'Eau', inferior: 'Feu' },
  64: { superior: 'Feu', inferior: 'Eau' },
};

export function getHexagramTrigrams(numero: number): { superior: TrigramInfo | null; inferior: TrigramInfo | null } {
  const pair = HEXAGRAM_TRIGRAMS[numero];
  if (!pair) return { superior: null, inferior: null };
  return {
    superior: TRIGRAM_INFO[pair.superior] ?? null,
    inferior: TRIGRAM_INFO[pair.inferior] ?? null,
  };
}
