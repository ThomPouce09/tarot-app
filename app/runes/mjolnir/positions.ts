// app/runes/mjolnir/positions.ts — La symbolique des 5 positions (FR/EN).
// Source unique : modale d'accueil, zones du marteau, rappels cliquables,
// prompt IA. Termes validés par le user.
// `at` = % DU CONTENEUR, calés PILE sur les emplacements du layout 'hammer'
// de RuneStonesSet ([50,76],[50,48],[30,28],[70,28],[50,18]) → la pierre se
// pose au centre exact de sa zone chauffée (MjolnirArt dessine en % aussi).

export type MjolPos = {
  key: string;
  fr: { zone: string; name: string; brief: string; deep: string };
  en: { zone: string; name: string; brief: string; deep: string };
  at: { x: number; y: number };
  /** ordre d'assemblage (bas → haut : on arme le marteau avant de frapper) */
  grow: number;
};

export const MJG_POS: MjolPos[] = [
  {
    key: 'ancre',
    fr: {
      zone: 'MANCHE',
      name: 'Base du manche — L’Ancrage',
      brief: 'Sur quoi tu t’appuies pour tenir.',
      deep: 'Le bas du manche : ce qui sécurise ta prise dans cette épreuve — un soutien, une habitude, une certitude. Sans ancrage, le coup se perd.',
    },
    en: {
      zone: 'HANDLE',
      name: 'Handle base — The Anchor',
      brief: 'What you stand on to hold.',
      deep: 'The bottom of the haft: what secures your grip in this ordeal — support, habit, certainty. Without an anchor, the blow is wasted.',
    },
    at: { x: 50, y: 65 },
    grow: 0,
  },
  {
    key: 'obstacle',
    fr: {
      zone: 'MANCHE',
      name: 'Haut du manche — L’Obstacle',
      brief: 'Ce qui bloque vraiment.',
      deep: 'Le haut du manche, là où la main lâche si la prise est mauvaise : la nature exacte du blocage, nommée sans complaisance.',
    },
    en: {
      zone: 'HANDLE',
      name: 'Handle top — The Obstacle',
      brief: 'What truly blocks you.',
      deep: 'The top of the haft, where the grip fails: the exact nature of the block, named without flattery.',
    },
    at: { x: 50, y: 41 },
    grow: 1,
  },
  {
    key: 'menace',
    fr: {
      zone: 'TÊTE',
      name: 'Tête gauche — La Menace',
      brief: 'Ce qu’il faut lâcher ou casser.',
      deep: 'Le flanc tourné vers l’ennemi : ce que le coup doit détruire — une habitude, un lien, une peur. Seule position où une rune renversée est de bon augure : ce qui devait mourir est déjà mourant.',
    },
    en: {
      zone: 'HEAD',
      name: 'Left head — The Threat',
      brief: 'What must be dropped or broken.',
      deep: 'The edge facing the enemy: what the blow must destroy — a habit, a bond, a fear. The one position where a reversed rune is auspicious: what was meant to die is already dying.',
    },
    at: { x: 30, y: 24 },
    grow: 2,
  },
  {
    key: 'arme',
    fr: {
      zone: 'TÊTE',
      name: 'Tête droite — L’Arme',
      brief: 'Avec quoi tu frappes.',
      deep: 'Le flanc ami : la force, le talent ou l’allié que tu n’utilises pas encore assez — ce qui rend le coup possible.',
    },
    en: {
      zone: 'HEAD',
      name: 'Right head — The Weapon',
      brief: 'What you strike with.',
      deep: 'The friendly edge: the strength, talent or ally you under-use — what makes the blow possible.',
    },
    at: { x: 70, y: 24 },
    grow: 3,
  },
  {
    key: 'frappe',
    fr: {
      zone: 'COURONNE',
      name: 'Centre de la tête — La Frappe',
      brief: 'Le coup à porter.',
      deep: 'La crête au cœur du marteau : l’action décisive, datée et concrète. Elle ne se lit jamais seule — elle est le verbe des quatre autres positions.',
    },
    en: {
      zone: 'CROWN',
      name: 'Head center — The Strike',
      brief: 'The blow to deliver.',
      deep: 'The crest at the hammer’s core: the decisive action, dated and concrete. Never read alone — it is the verb of the other four.',
    },
    at: { x: 50, y: 15 },
    grow: 4,
  },
];

/* Étiquettes cliquables, calées dans les marges libres (jamais sous une
   pierre). Ordre = MJG_POS (ancre, obstacle, menace, arme, frappe). */
export const MJG_LABEL_AT: Array<{ left?: string; right?: string; top: string }> = [
  { right: '2%', top: '63%' },   // ancre : marge droite, bas du manche
  { left: '2%', top: '39%' },    // obstacle : marge gauche, milieu du manche
  { left: '2%', top: '34%' },    // menace : sous le talon gauche de la tête
  { right: '2%', top: '34%' },   // arme : sous le talon droit de la tête
  { right: '0%', top: '3.5%' },   // frappe : tout dans l'angle haut-droit
];

/* Bandeau d'accompagnement : la légende de la zone au moment de sa pose. */
export const MJG_POSE_LINE = {
  fr: [
    '1ʳᵉ rune — l’Ancrage : ce qui te tient debout',
    '2ᵉ rune — l’Obstacle : ce qui bloque vraiment',
    '3ᵉ rune — la Menace : ce qu’il faut lâcher',
    '4ᵉ rune — l’Arme : avec quoi tu frappes',
    '5ᵉ rune — la Frappe : le coup à porter',
  ],
  en: [
    '1st rune — the Anchor: what keeps you standing',
    '2nd rune — the Obstacle: what truly blocks you',
    '3rd rune — the Threat: what must be dropped',
    '4th rune — the Weapon: what you strike with',
    '5th rune — the Strike: the blow to deliver',
  ],
} as const;
