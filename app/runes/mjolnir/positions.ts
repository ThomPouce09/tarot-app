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
  es: { zone: string; name: string; brief: string; deep: string };
  hi: { zone: string; name: string; brief: string; deep: string };
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
    es: {
    zone: "MANGO",
    name: "Base del mango — El Anclaje",
    brief: "En lo que te apoyas para sostenerte.",
    deep: "La base del mango: lo que asegura tu agarre en esta prueba — un apoyo, una costumbre, una certeza. Sin anclaje, el golpe se pierde.",
  },
    hi: {
    zone: "हत्था",
    name: "हत्थे का आधार — स्थिरता",
    brief: "वह आधार जिस पर तुम टिके हो।",
    deep: "हत्थे का निचला सिरा: जो इस परीक्षा में तुम्हारी पकड़ को डोलता है — एक सहारा, एक आदत, एक निश्चय। बिना स्थिरता के प्रहार व्यर्थ जाता है।",
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
    es: {
        zone: "MANGO",
        name: "Parte alta del mango — El Obstáculo",
        brief: "Lo que te bloquea de verdad.",
        deep: "La parte alta del mango, donde la mano suelta si el agarre es malo: la naturaleza exacta del bloqueo, nombrada sin condescendencia.",
      },
    hi: {
        zone: "हत्था",
        name: "हत्थे का ऊपरी सिरा — बाधा",
        brief: "जो सच में तुम्हें रोकता है।",
        deep: "हत्थे का ऊपरी सिरा, जहाँ पकड़ कमज़ोर हो तो हाथ छूट जाता है: रुकावट का सही स्वरूप, बिना किसी लिहाज़ के नाम दिया गया।",
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
    es: {
        zone: "CABEZA",
        name: "Cabeza izquierda — La Amenaza",
        brief: "Lo que hay que soltar o romper.",
        deep: "El flanco vuelto hacia el enemigo: lo que el golpe debe destruir — una costumbre, un vínculo, un miedo. La única posición donde una runa invertida es de buen augurio: lo que debía morir ya está muriendo.",
      },
    hi: {
        zone: "शिरोभाग",
        name: "बायाँ शिरोभाग — ख़तरा",
        brief: "जो छोड़ना या तोड़ना ज़रूरी है।",
        deep: "शत्रु की ओर मुड़ा पार्श्व: जिसे प्रहार को नष्ट करना है — एक आदत, एक बंधन, एक भय। केवल इसी स्थान पर उलटी रुण शुभ है: जो मरना था, वह पहले से मर रहा है।",
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
    es: {
        zone: "CABEZA",
        name: "Cabeza derecha — El Arma",
        brief: "Con qué golpeas.",
        deep: "El flanco amigo: la fuerza, el talento o el aliado que aún no usas lo bastante — lo que hace posible el golpe.",
      },
    hi: {
        zone: "शिरोभाग",
        name: "दाहिना शिरोभाग — हथियार",
        brief: "जिससे तुम प्रहार करते हो।",
        deep: "मित्र पार्श्व: वह बल, प्रतिभा या मित्र जिसे तुम अभी पर्याप्त नहीं काम लाते — जो प्रहार को संभव बनाता है।",
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
    es: {
        zone: "CORONA",
        name: "Centro de la cabeza — El Golpe",
        brief: "El golpe que debes dar.",
        deep: "La cresta en el corazón del martillo: la acción decisiva, datada y concreta. Nunca se lee sola — es el verbo de las otras cuatro posiciones.",
      },
    hi: {
        zone: "शिखर",
        name: "शिरोभाग का केंद्र — प्रहार",
        brief: "वह प्रहार जो करना है।",
        deep: "हथौड़े के हृदय में शिखर-रेखा: निर्णायक कृति, समयबद्ध और ठोस। इसे कभी अकेले नहीं पढ़ा जाता — यह अन्य चार स्थानों की क्रिया है।",
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
  es: [
    '1.ª runa — el Anclaje: lo que te sostiene',
    '2.ª runa — el Obstáculo: lo que de verdad bloquea',
    '3.ª runa — la Amenaza: lo que hay que soltar',
    '4.ª runa — el Arma: con qué golpeas',
    '5.ª runa — el Golpe: el impacto a asestar',
  ],
  hi: [
    'पहला रून — स्थिरता: जो तुम्हें खड़ा रखता है',
    'दूसरा रून — बाधा: जो सचमुच रोकता है',
    'तीसरा रून — ख़तरा: जिसे छोड़ना है',
    'चौथा रून — हथियार: जिससे तुम प्रहार करते हो',
    'पाँचवाँ रून — प्रहार: जो वार करना है',
  ],
} as const;
