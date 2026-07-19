// components/astro-dice/glyphs.ts
// Données & types des trois dés du zodiaque (dodécaèdres à 12 faces).
//
// ⚠️ Les glyphes planétaires (☉☽☿…) et zodiacaux (♈♉♊…) appartiennent au bloc
// Unicode "Miscellaneous Symbols". Toutes les polices ne les embarquent pas :
// si tu vois des carrés "tofu" sur les faces, passe une police .woff/.ttf
// contenant ces glyphes via la prop `font` de <AstroDiceSet/>.

/** Les 12 glyphes planétaires (dé des Planètes). */
export const PLANETS = [
  '☉', // Soleil
  '☽', // Lune
  '☿', // Mercure
  '♀', // Vénus
  '♂', // Mars
  '♃', // Jupiter
  '♄', // Saturne
  '♅', // Uranus
  '♆', // Neptune
  '♇', // Pluton
  '☊', // Nœud Nord
  '☋', // Nœud Sud
] as const;

/** Les 12 glyphes du zodiaque (dé des Signes). */
export const SIGNS = [
  '♈', // Bélier
  '♉', // Taureau
  '♊', // Gémeaux
  '♋', // Cancer
  '♌', // Lion
  '♍', // Vierge
  '♎', // Balance
  '♏', // Scorpion
  '♐', // Sagittaire
  '♑', // Capricorne
  '♒', // Verseau
  '♓', // Poissons
] as const;

/** Les 12 maisons astrologiques (dé des Maisons). */
export const HOUSES = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
] as const;

export type PlanetGlyph = (typeof PLANETS)[number];
export type SignGlyph = (typeof SIGNS)[number];
export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Identifiant des trois dés. */
export type DieKind = 'planet' | 'sign' | 'house';

/** Faces cibles sur lesquelles les dés doivent impérativement s'immobiliser. */
export interface TargetFaces {
  planet: PlanetGlyph;
  sign: SignGlyph;
  house: HouseNumber;
}

/** Table de correspondance kind → labels des 12 faces. */
export const DIE_FACES: Record<DieKind, readonly string[]> = {
  planet: PLANETS,
  sign: SIGNS,
  house: HOUSES,
};

/** Palette alignée sur l'app Dés (bleu nuit / or fin). */
export const DICE_PALETTE = {
  brick: '#0a1430', // corps des dés — bleu nuit
  brickDark: '#050a1c', // arêtes / ombres
  glyph: '#DCE6F5', // symboles gravés — givré bleuté clair
  mat: '#14245a', // tapis de lancer — indigo
  matDark: '#0a1430',
  gold: '#D4AF37', // halo / lumière d'accent — or fin
  bg: '#050a1c', // fond app
} as const;

/* -------------------------------------------------------------------------- */
/*  Skins — variantes d'apparence des dés (corps, arêtes, glyphes, tapis)      */
/* -------------------------------------------------------------------------- */

/** Couleurs d'un skin appliqué aux 3 dés + au tapis de l'arène. */
export interface DiceSkin {
  /** Couleur du corps des dés. */
  body: string;
  /** Couleur des arêtes / contours. */
  edges: string;
  /** Couleur des glyphes gravés. */
  glyph: string;
  /** Couleur du tapis (sol de l'arène). */
  mat: string;
  /** Couleur du liseré / accents dorés. */
  accent: string;
  /** Couleur des ombres portées (ContactShadows). */
  shadow: string;
  /** Si true, un champ d'étoiles est peint sur le tapis (vue de dessus). */
  stars?: boolean;
}

/**
 * Skins disponibles. Le skin `classic` reproduit la palette d'origine
 * (rouge brique / ocre / doré). `onyx` et `ivory` illustrent d'autres ambiances
 * — ajoute tes propres skins ici (ou passe un objet `skin` custom).
 */
export const DICE_SKINS: Record<string, DiceSkin> = {
  classic: {
    body: DICE_PALETTE.brick,
    edges: DICE_PALETTE.brickDark,
    glyph: DICE_PALETTE.glyph,
    mat: DICE_PALETTE.mat,
    accent: DICE_PALETTE.gold,
    shadow: '#02040c',
  },
  onyx: {
    body: '#2b2430',
    edges: '#0d0a12',
    glyph: '#e8c87a',
    mat: '#3a3340',
    accent: '#c79a3a',
    shadow: '#08060c',
  },
  ivory: {
    body: '#e9ddc6',
    edges: '#b39b73',
    glyph: '#7a3b2e',
    mat: '#d8c8a6',
    accent: '#9B3A2E',
    shadow: '#6b5a3a',
  },
  emerald: {
    body: '#1f5e4a',
    edges: '#0e3327',
    glyph: '#f1e9c6',
    mat: '#2c7d63',
    accent: '#d4b24a',
    shadow: '#06231a',
  },
  moon: {
    // Dés "argent couleur lune" à arêtes dorées, sur tapis bleu nuit étoilé.
    body: '#cdd3e0', // argent froid, légèrement bleuté (lune)
    edges: '#DAA520', // arêtes dorées
    glyph: '#3a2f4a', // glyphes sombres lisibles sur l'argent
    mat: '#0e1430', // bleu nuit du bac
    accent: '#DAA520', // liseré doré
    shadow: '#04060f',
    stars: true,
  },
};

/** Type utilitaire : clé d'un skin prédéfini OU skin custom partiel. */
export type DiceSkinInput = string | Partial<DiceSkin>;

/** Résout une entrée `skin` (clé, objet custom, ou undefined) en DiceSkin. */
export function resolveSkin(input?: DiceSkinInput): DiceSkin {
  if (!input) return DICE_SKINS.classic;
  if (typeof input === 'string') {
    return DICE_SKINS[input] ?? DICE_SKINS.classic;
  }
  return { ...DICE_SKINS.classic, ...input };
}

/**
 * Tire un résultat aléatoire pour les trois dés.
 * Utile pour un lancer non déterminé côté client.
 */
export function randomTargetFaces(): TargetFaces {
  const rand = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];
  return {
    planet: rand(PLANETS),
    sign: rand(SIGNS),
    house: (Number(rand(HOUSES)) as HouseNumber),
  };
}
