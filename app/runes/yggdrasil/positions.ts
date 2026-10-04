// app/runes/yggdrasil/positions.ts — La symbolique des 5 positions (FR/EN).
// Source unique : modale d'accueil, pierres sur l'arbre, lectures, prompt IA.

export type YggPos = {
  key: string;
  fr: { zone: string; name: string; brief: string; deep: string };
  en: { zone: string; name: string; brief: string; deep: string };
  es: { zone: string; name: string; brief: string; deep: string };
  hi: { zone: string; name: string; brief: string; deep: string };
  /** ancrage de la pierre sur le SVG de l'arbre (% du conteneur, repère
   *  partagé avec le dessin recadré à 72 % et le layout 'tree' de RuneStonesSet) */
  at: { x: number; y: number };
  /** ordre d'allumage (bas → haut : on ancre avant de s'élever) */
  grow: number;
};

export const YGG_POS: YggPos[] = [
  {
    key: 'urdhr',
    fr: {
      zone: 'RACINE',
      name: 'Urðr — la Source',
      brief: 'Ce qui te nourrit sans que tu le voies.',
      deep: 'La racine qui boit au puits d’Urdr, le puits du destin : les fondations secrètes, l’héritage, ce qui t’a façonné en silence et te soutient encore.',
    },
    en: {
      zone: 'ROOT',
      name: 'Urðr — the Source',
      brief: 'What feeds you unseen.',
      deep: 'The root drinking at the well of fate: hidden foundations, inheritance, what shaped you silently and still holds you up.',
    },
    es: {
    zone: "RAÍZ",
    name: "Urðr — la Fuente",
    brief: "Lo que te nutre sin que lo veas.",
    deep: "La raíz que bebe en el pozo de Urdr, el pozo del destino: los cimientos secretos, la herencia, lo que te moldeó en silencio y aún te sostiene.",
  },
    hi: {
    zone: "जड़",
    name: "उर्द्र — स्रोत",
    brief: "जो बिना दिखे तुम्हें पोषण देता है।",
    deep: "वह जड़ जो उर्द्र के कूप से पानी पीती है, भाग्य का कूप: गुप्त नींव, विरासत, जिसने चुपचाप तुम्हें गढ़ा और आज भी तुम्हें टिकाए है।",
  },
    at: { x: 28, y: 65 },
    grow: 0,
  },
  {
    key: 'nidhogg',
    fr: {
      zone: 'RACINE',
      name: 'Níðhöggr — le Dragon',
      brief: 'Ce qui te ronge pendant que tu dors.',
      deep: 'Le serpent qui ronge la racine du monde : l’usure secrète, la peur ou l’habitude qui grignote tes fondations. Seule position où l’inversion est bienvenue — nommée, elle cesse de ramper dans l’ombre.',
    },
    en: {
      zone: 'ROOT',
      name: 'Níðhöggr — the Dragon',
      brief: 'What gnaws at you while you sleep.',
      deep: 'The serpent gnawing the world-root: hidden erosion, the fear or habit eating your foundations. The one position where a reversed rune is welcome — named, it stops crawling in the dark.',
    },
    es: {
        zone: "RAÍZ",
        name: "Níðhöggr — el Dragón",
        brief: "Lo que te roe mientras duermes.",
        deep: "La serpiente que roe la raíz del mundo: el desgaste secreto, el miedo o la costumbre que roe tus cimientos. La única posición donde la inversión es bienvenida — nombrada, deja de arrastrarse en la sombra.",
      },
    hi: {
        zone: "जड़",
        name: "निधॉगग्र — नाग",
        brief: "जो तुम्हें नींद में कुतरता है।",
        deep: "वह नाग जो संसार की जड़ कुतरता है: गुप्त ज़रा, भय या आदत जो तुम्हारी नींव को चाटती है। केवल इसी स्थान पर उलटाव स्वागतयोग्य है — नाम पाने पर वह अँधेरे में रेंगना छोड़ देता है।",
      },
    at: { x: 73, y: 65 },
    grow: 1,
  },
  {
    key: 'trunk',
    fr: {
      zone: 'TRONC',
      name: 'L’Arbre — la Force du jour',
      brief: 'Ce qui te tient debout aujourd’hui.',
      deep: 'Le tronc qui traverse les neuf mondes : ta solidité présente, l’énergie disponible maintenant, ce qui porte l’édifice sans plier.',
    },
    en: {
      zone: 'TRUNK',
      name: 'The Tree — today’s strength',
      brief: 'What keeps you standing now.',
      deep: 'The trunk crossing the nine worlds: your present solidity, the energy available today, what bears the weight without bending.',
    },
    es: {
        zone: "TRONCO",
        name: "El Árbol — la Fuerza del día",
        brief: "Lo que te mantiene en pie hoy.",
        deep: "El tronco que atraviesa los nueve mundos: tu solidez actual, la energía disponible ahora, lo que sostiene el edificio sin doblarse.",
      },
    hi: {
        zone: "तना",
        name: "वृक्ष — दिन का बल",
        brief: "जो आज तुम्हें सीधा रखता है।",
        deep: "वह तना जो नौ लोकों को भेदता है: तुम्हारी वर्तमान दृढ़ता, अभी उपलब्ध ऊर्जा, जो संरचना को बिना झुके उठाए रखती है।",
      },
    at: { x: 50, y: 42 },
    grow: 2,
  },
  {
    key: 'branches',
    fr: {
      zone: 'BRANCHES',
      name: 'Les Branches — les Voies vivantes',
      brief: 'Ce qui peut encore grandir cette saison.',
      deep: 'Les branches qui touchent les cieux : les directions vivantes, les opportunités qui se déploient, les choix réels qui s’offrent à toi maintenant.',
    },
    en: {
      zone: 'BRANCHES',
      name: 'The Branches — living paths',
      brief: 'What can still grow this season.',
      deep: 'Branches brushing the skies: living directions, opportunities unfolding, the real choices open to you now.',
    },
    es: {
        zone: "RAMAS",
        name: "Las Ramas — los caminos vivos",
        brief: "Lo que aún puede crecer esta temporada.",
        deep: "Las ramas que tocan los cielos: las direcciones vivas, las oportunidades que se despliegan, las opciones reales que se te abren ahora.",
      },
    hi: {
        zone: "शाखाएँ",
        name: "शाखाएँ — जीवित पथ",
        brief: "जो इस मौसम और बढ़ सकता है।",
        deep: "वे शाखाएँ जो आकाश को छूती हैं: जीवित दिशाएँ, खुलते अवसर, वे वास्तविक चयन जो अभी तुम्हारे सामने खुले हैं।",
      },
    at: { x: 76, y: 22 },
    grow: 3,
  },
  {
    key: 'eagle',
    fr: {
      zone: 'COURONNE',
      name: 'L’Aigle — la Vision d’en haut',
      brief: 'Le message que seul le sommet voit.',
      deep: 'L’aigle sage perché au faîte : la perspective que tu ne peux pas voir d’en bas — la vérité du dossier, le sens à retenir, le conseil des dieux.',
    },
    en: {
      zone: 'CROWN',
      name: 'The Eagle — the view from above',
      brief: 'The message only the crown can see.',
      deep: 'The wise eagle perched at the top: the perspective you cannot see from below — the truth of the matter, the meaning to keep, the counsel of the gods.',
    },
    es: {
        zone: "CORONA",
        name: "El Águila — la visión desde lo alto",
        brief: "El mensaje que solo la cima ve.",
        deep: "El águila sabia posada en lo más alto: la perspectiva que no puedes ver desde abajo — la verdad del asunto, el sentido que debes retener, el consejo de los dioses.",
      },
    hi: {
        zone: "शिखर",
        name: "ईगल — ऊँचाई की दृष्टि",
        brief: "वह संदेश जो केवल शिखर देखता है।",
        deep: "ज्ञानी ईगल चोटी पर विराजमान: वह दृष्टिकोण जो तुम नीचे से नहीं देख सकते — विषय की सच्चाई, पकड़ने योग्य अर्थ, देवताओं की सलाह।",
      },
    at: { x: 50, y: 11 },
    grow: 4,
  },
];
