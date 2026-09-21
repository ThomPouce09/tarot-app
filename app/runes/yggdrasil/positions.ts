// app/runes/yggdrasil/positions.ts — La symbolique des 5 positions (FR/EN).
// Source unique : modale d'accueil, pierres sur l'arbre, lectures, prompt IA.

export type YggPos = {
  key: string;
  fr: { zone: string; name: string; brief: string; deep: string };
  en: { zone: string; name: string; brief: string; deep: string };
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
    at: { x: 50, y: 11 },
    grow: 4,
  },
];
