// lib/guide-data.ts — « Le Passeur » : contenu de l'aide au choix du tirage,
// PAR UNIVERS. Données 100 % déductives des TILES réelles des hubs — si une
// tuile change d'existence ou de signification, ce fichier doit suivre.
//
// Vouvoiement obligatoire (règle utilisateur : « pas de tutoiement de l'Oracle »).

export type UniverseKey = 'tarot' | 'yijing' | 'runes' | 'des';

export interface GuideTirage {
  /** Chemin du hub vers la page de tirage (deep-link direct). */
  href: string;
  /** Nom exact de la tuile (repris tel quel). */
  title: string;
  titleEn: string;
  /** Base ou avancé — source : lib/classification.ts (ne jamais deviner ici). */
  base: boolean;
  /** Le geste déclencheur, en une phrase (action + résultat visible). */
  gestureFr: string;
  gestureEn: string;
  /** Ce que le tirage répond — à qui il parle. */
  forFr: string;
  forEn: string;
}

export interface GuideUniverse {
  key: UniverseKey;
  /** Route du hub (bouton « Choisir moi-même » + garde de la modale). */
  hubPath: string;
  /** Signature visuelle du Passeur dans cet univers. */
  accent: string;      // or/bordeaux dominant du hub
  accentPale: string;  // texte secondaire pâle
  panelFrom: string;   // dégradé du panneau (2 arrêtés)
  panelTo: string;
  /** Nom de l'univers tel que le hub l'affiche. */
  nameFr: string;
  nameEn: string;
  tirages: GuideTirage[];
}

export const GUIDE_UNIVERSES: Record<UniverseKey, GuideUniverse> = {
  // ── TAROT — hub /tarot (charte : bois chaud #5A3A1E / bordeaux #4A1931 / or #DAA520)
  tarot: {
    key: 'tarot',
    hubPath: '/tarot',
    accent: '#DAA520',
    accentPale: '#E2B8AC',
    panelFrom: '#5A3A1E',
    panelTo: '#4A1931',
    nameFr: 'Tarot',
    nameEn: 'Tarot',
    tirages: [
      {
        href: '/tarot-3-cartes-simplifie',
        title: '3 Cartes Simplifié', titleEn: '3 Cards Simplified', base: true,
        gestureFr: 'Vous choisissez une intention parmi des thèmes, puis trois cartes se posent face à vous.',
        gestureEn: 'You choose an intention among guided themes, then three cards settle before you.',
        forFr: 'Idéal pour débuter : une réponse claire, sans avoir à formuler votre question.',
        forEn: 'Ideal to begin with: a clear answer, without having to phrase your question.',
      },
      {
        href: '/tarot-3-cartes',
        title: '3 Cartes · Précis', titleEn: '3 Cards · Precise', base: false,
        gestureFr: 'Vous écrivez votre question, puis trois cartes répondent : le passé qui nourrit, le présent qui agit, l\u2019avenir qui s\u2019ouvre.',
        gestureEn: 'You write your question, then three cards answer: the past that feeds it, the present that acts, the future opening.',
        forFr: 'Pour une question précise qui vous tient à cœur et mérite un vrai fil de lecture.',
        forEn: 'For one precise question you care about, worthy of a real thread of reading.',
      },
      {
        href: '/tarot-semaine',
        title: 'Arcanes de la Semaine', titleEn: 'Arcana of the Week', base: false,
        gestureFr: 'Sept arcanes se déploient, un par jour : chaque matin lit sa lame du jour.',
        gestureEn: 'Seven arcana unfold, one per day: each morning reads its own card.',
        forFr: 'Pour traverser une semaine avec une boussole posée dès le départ.',
        forEn: 'To walk through a week with a compass set from the start.',
      },
      {
        href: '/tarot-5-c-manuelle',
        title: '5 Cartes Manuelles', titleEn: '5 Manual Cards', base: false,
        gestureFr: 'Vous tirez vous-même cinq cartes du jeu et les placez sur le tapis, dans l\u2019ordre qui vous parle.',
        gestureEn: 'You draw five cards yourself and place them on the cloth, in the order that speaks to you.',
        forFr: 'Pour une consultation complète, où votre geste fait partie de la réponse.',
        forEn: 'For a full consultation, where your own gesture belongs to the answer.',
      },
    ],
  },

  // ── YI JING — hub /yi-jing (rouge de Chine & or)
  yijing: {
    key: 'yijing',
    hubPath: '/yi-jing',
    accent: '#F3C969',
    accentPale: '#E0CFF0',
    panelFrom: '#6c1613',
    panelTo: '#241014',
    nameFr: 'Le Yi Jing',
    nameEn: 'The I Ching',
    tirages: [
      {
        href: '/yi-jing-simplifie',
        title: 'Yi Jing simplifié', titleEn: 'Simplified I Ching', base: true,
        gestureFr: 'Vous choisissez un domaine et une intention, puis les baguettes d\u2019achillée tombent d\u2019elles-mêmes.',
        gestureEn: 'You choose a domain and an intention, then the yarrow stalks fall on their own.',
        forFr: 'Idéal pour débuter : la sagesse du Yi Jing sans avoir à formuler une question.',
        forEn: 'Ideal to begin with: the wisdom of the I Ching without phrasing a question.',
      },
      {
        href: '/yi-jing-simple',
        title: 'Yi Jing précis', titleEn: 'Precise I Ching', base: false,
        gestureFr: 'Vous écrivez votre question, six traits se forment trait par trait, avec leurs lignes en mutation.',
        gestureEn: 'You write your question, six lines form one after another, with their changing lines.',
        forFr: 'Pour une question vivante : l\u2019hexagramme répond, et dit ce qui est en train de tourner.',
        forEn: 'For a living question: the hexagram answers, and names what is turning.',
      },
      {
        href: '/yi-jing-du-jour',
        title: 'Hexagramme du Jour', titleEn: 'Hexagram of the Day', base: true,
        gestureFr: 'Un seul hexagramme se révèle chaque jour, tiré pour votre compte — à lire le matin.',
        gestureEn: 'One hexagram is drawn for your account each day — to be read in the morning.',
        forFr: 'Pour poser l\u2019influence du moment, en deux minutes, sans question à formuler.',
        forEn: 'To take the temperature of the day, in two minutes, with no question needed.',
      },
      {
        href: '/yi-jing-double',
        title: 'Le Double Hexagramme', titleEn: 'The Double Hexagram', base: false,
        gestureFr: 'Deux hexagrammes se posent côte à côte : l\u2019instant présent, puis sa mutation.',
        gestureEn: 'Two hexagrams settle side by side: the present moment, then its transformation.',
        forFr: 'Pour voir d\u2019où vous partez et vers quoi la situation glisse.',
        forEn: 'To see where you stand and which way the situation is sliding.',
      },
    ],
  },

  // ── RUNES — hub /runes (forêt & or pâle)
  runes: {
    key: 'runes',
    hubPath: '/runes',
    accent: '#e9d9ac',
    accentPale: '#9fc4ad',
    panelFrom: '#1f5234',
    panelTo: '#0c2417',
    nameFr: 'Les Runes',
    nameEn: 'The Runes',
    tirages: [
      {
        href: '/runes/nornes2',
        title: 'Le fil des Nornes (simplifié)', titleEn: 'The Thread of the Norns (Simplified)', base: true,
        gestureFr: 'À l\u2019aveugle : vous secouez le pochon, trois runes sortent, le fil se déroule.',
        gestureEn: 'Blind: you shake the pouch, three runes come out, the thread unwinds.',
        forFr: 'Idéal pour débuter : une réponse qui vient sans que vous ayez à choisir quoi que ce soit.',
        forEn: 'Ideal to begin with: an answer that comes before you have chosen anything.',
      },
      {
        href: '/runes/nornes',
        title: 'Le Fil des Nornes — Précis', titleEn: 'The Thread of the Norns — Precise', base: false,
        gestureFr: 'Vous choisissez une question libre ou un thème, puis trois runes se révèlent — et le conseil d\u2019Odin conclut.',
        gestureEn: 'You choose a free question or a theme, three runes reveal themselves — and Odin\u2019s counsel closes.',
        forFr: 'Pour une situation précise que vous voulez nommer et éclairer.',
        forEn: 'For a precise situation you want to name and light up.',
      },
      {
        href: '/runes/mjolnir',
        title: 'Le Marteau de Mjölnir', titleEn: 'Mjölnir\u2019s Hammer', base: false,
        gestureFr: 'Cinq runes se placent en T : du manche à la crête du marteau.',
        gestureEn: 'Five runes settle in a T: from the haft to the crest of the hammer.',
        forFr: 'Pour préparer une action : un vrai plan de bataille, forge par le forgeron.',
        forEn: 'To prepare for action: a real battle plan, forged by the smith.',
      },
      {
        href: '/runes/yggdrasil',
        title: 'Les Racines d\u2019Yggdrasil', titleEn: 'The Roots of Yggdrasil', base: false,
        gestureFr: 'Cinq runes montent des racines jusqu\u2019à la couronne de l\u2019Arbre-Monde.',
        gestureEn: 'Five runes rise from the roots to the crown of the World-Tree.',
        forFr: 'Pour un bilan de période : ce qui vous porte, ce qui vous pèse, où va la sève.',
        forEn: 'For a season\u2019s reckoning: what carries you, what weighs on you, where the sap is heading.',
      },
    ],
  },

  // ── DÉS — hub /des-divinatoires (nuit & or adouci)
  des: {
    key: 'des',
    hubPath: '/des-divinatoires',
    accent: '#E8C66A',
    accentPale: '#DCE6F5',
    panelFrom: '#0a1230',
    panelTo: '#050a1c',
    nameFr: 'Les Dés du Zodiaque',
    nameEn: 'The Zodiac Dice',
    tirages: [
      {
        href: '/des-divinatoires-simplifie',
        title: 'Dés Simplifié', titleEn: 'Dice Simplified', base: true,
        gestureFr: 'Vous choisissez un élément et une intention, puis trois dés tombent dans le gobelet.',
        gestureEn: 'You choose an element and an intention, then three dice fall in the cup.',
        forFr: 'Idéal pour débuter : une direction claire en un lancer.',
        forEn: 'Ideal to begin with: one clear direction in a single throw.',
      },
      {
        href: '/des-divinatoires/affinage',
        title: 'Tirage par Affinage', titleEn: 'Refinement Reading', base: false,
        gestureFr: 'Un premier lancer pose la base, un second précise la nuance que vous visez.',
        gestureEn: 'A first throw sets the ground, a second refines the nuance you aim at.',
        forFr: 'Pour ajuster une posture ou éclaircir un détail sans relancer tout le tirage.',
        forEn: 'To adjust your stance or sharpen one detail without re-throwing the whole reading.',
      },
      {
        href: '/des-divinatoires/choix',
        title: 'Le tirage du choix', titleEn: 'The Choice Reading', base: false,
        gestureFr: 'Deux lancés, deux chemins : chaque option a son énergie et sa couleur.',
        gestureEn: 'Two throws, two paths: each option gets its own energy and colour.',
        forFr: 'Pour trancher entre deux options précises — A ou B, sans se raconter d\u2019histoires.',
        forEn: 'To decide between two concrete options — A or B, without telling yourself stories.',
      },
      {
        href: '/des-divinatoires/obstacle-solution',
        title: 'Obstacle & Solution', titleEn: 'Obstacle & Solution', base: false,
        gestureFr: 'Deux lancés : le premier nomme le blocage, le second éclaire la sortie.',
        gestureEn: 'Two throws: the first names the block, the second lights the way out.',
        forFr: 'Pour comprendre ce qui coince vraiment — et savoir par quel bout le prendre.',
        forEn: 'To understand what truly blocks you — and which end to take it by.',
      },
    ],
  },
};

/** Préférence « Le Passeur » : auto (1re visite par univers) / bouton / off. */
export type PasseurMode = 'auto' | 'bouton' | 'off';
