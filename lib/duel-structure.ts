// lib/duel-structure.ts — La STRUCTURE DU DUEL, calculée par le code (jamais
// par l'IA — règle « lore » validée par le user) pour le Tirage du choix v2.
// Un seul tirage (planète × signe × maison) est la lumière sous laquelle
// l'IA arbitre les deux options déposées par le consultant. Ce module fournit :
//  1) le terrain de la maison (où le choix se joue) ;
//  2) le tempo de l'élément (comment la force agit) ;
//  3) la « pesée » déterministe de chaque face vers A ou B — la PRMIÈRE
//     lecture du moteur symbolique, diffusée à l'écran pendant que l'IA
//     rédige ; le verdict IA confirme ou CORRIGE (l'arc-en-ciel de glyphs
//     traverse alors l'écran). Le moteur ne prétend pas trancher : il indique.

import type { TargetFaces } from '@/components/astro-dice';
import { PLANET_NAMES, SIGN_NAMES } from '@/components/astro-dice/names';

// Le DUEL arbitre : chaque face se rattache à UN SEUL plateau (3 faces,
// 2 plateaux → jamais d'égalité possible, la balance penche toujours).
export type Side = 'A' | 'B';

export interface Pesee {
  /** 'planet' | 'sign' | 'house' — la face qui pèse */
  face: 'planet' | 'sign' | 'house';
  glyph: string;
  name: string;
  pour: Side;
  /** demi-phrase d'intention (la face penche le plateau, pas le verdict) */
  motif: string;
}

export interface DuelStructure {
  terrain: string;            // où le choix se joue (maison)
  tempo: string;              // l'élément du signe : comment la force agit
  element: 'feu' | 'terre' | 'air' | 'eau';
  moteur: string;             // la planète : quelle force frappe
  pesees: Pesee[];            // 3 pesées déterministes (moteur symbolique)
  balance: Side;              // majorité de faces (2-1 ou 3-0) — l'IA arbitre en dernier
}

// Maison → terrain de la décision (12 domaines, langue FR — l'IA traduit le
// sens, l'UI affiche le terrain localisé via houseName côté client).
export const HOUSE_TERRAIN: Record<number, string> = {
  1: "toi — ton corps, ta face au monde, ton départ seul",
  2: "ton argent, tes ressources, ce qui te sécurise matériellement",
  3: "les mots, les proches du quotidien, un déplacement, une conversation",
  4: "le foyer, les racines, la mère ou le père, le toit sous lequel tu vis",
  5: "le cœur, la création, un enfant, le plaisir que tu t'autorises",
  6: "le travail de tous les jours, la santé, les habitudes, un service dû",
  7: "l'autre en face — le couple, l'associé, un engagement signé",
  8: "le commun : dettes, héritages, parts d'argent ou d'âme, une mort symbolique",
  9: "le large — loin, les études, les croyances, un sens à donner",
  10: "le métier, le titre, le regard social, ce que tu bâtis en public",
  11: "tes projets, tes amitiés choisies, un réseau, une promesse d'avenir",
  12: "le retrait, l'invisible, ce qui se prépare en secret ou se lâche",
};

// Signe → élément + tempo (comment la force de la décision agit).
export const SIGN_ELEMENT: Record<string, { el: 'feu' | 'terre' | 'air' | 'eau'; tempo: string }> = {
  '♈': { el: 'feu', tempo: 'frappe maintenant — un choix qui se fait d\'un geste' },
  '♉': { el: 'terre', tempo: 'pose lentement — un choix qui se sécurise par le concret' },
  '♊': { el: 'air', tempo: 'dialogue — un choix qui se décide en parlant, en informant' },
  '♋': { el: 'eau', tempo: 'sens d\'abord — un choix qui passe par le cœur et la mémoire' },
  '♌': { el: 'feu', tempo: 'assume — un choix qui se prend au nom de toi-même' },
  '♍': { el: 'terre', tempo: 'calcule — un choix qui se gagne par le détail juste' },
  '♎': { el: 'air', tempo: 'pèse avec l\'autre — un choix qui se négocie' },
  '♏': { el: 'eau', tempo: 'va au fond — un choix qui transforme ou ne vaut rien' },
  '♐': { el: 'feu', tempo: 'vis large — un choix d\'expansion, de cap' },
  '♑': { el: 'terre', tempo: 'bâtis — un choix qui se pèse sur dix ans' },
  '♒': { el: 'air', tempo: 'libère — un choix qui casse le cadre' },
  '♓': { el: 'eau', tempo: 'délaisse — un choix qui ne se prend pas, qui advient' },
};

// Planète → moteur (quelle force frappe la décision).
export const PLANET_MOTEUR: Record<string, string> = {
  '☉': "ta volonté de lumière — ce que tu veux ASSUMER",
  '☽': "tes besoins vrais — ce qui te NOURRIT ou te vide",
  '☿': "le calcul et le mot — ce qui se DIT et se négocie",
  '♀': "le désir et le goüt — ce qui te PLAÎT, au sens profond",
  '♂': "l'impulsion et le courage — ce qu'il faut CONQUÉRIR",
  '♃': "l'expansion et la chance — ce qui GRANDIT si tu oses",
  '♄': "la structure et le prix — ce qui se PAIE en discipline",
  '♅': "la rupture et la liberté — ce qui LIBÈRE, brutalement",
  '♆': "le rêve et le voile — ce qui est VRAI sans être net",
  '♇': "la transformation — ce qui MEURT pour que l'autre vive",
  '☊': "l'appel du futur — ce vers quoi tu es en train d'aller",
  '☋': "la dette du passé — ce d'où tu viens et qui te retient",
};

/**
 * Pesée déterministe moteur : attribue chaque face à un plateau par des règles
 * STABLES et lisibles (pas de hasard — si le tirage est le même, la lecture
 * du moteur est la même). C'est l'indice visuel, pas le verdict : l'IA aura
 * le dernier mot (et le message d'attente le dit : « le ciel pèse »).
 */
export function computeDuel(faces: TargetFaces, a: string, b: string): DuelStructure {
  const house = Math.max(1, Math.min(12, Number(faces.house) || 1));
  const terrain = HOUSE_TERRAIN[house];
  const se = SIGN_ELEMENT[String(faces.sign)] ?? { el: 'air', tempo: SIGN_ELEMENT['♊'].tempo };
  const moteur = PLANET_MOTEUR[String(faces.planet)] ?? "une force que le tirage nommera";

  // Heuristique de rattachement lexical (FR/EH/HI simples, sans surapprentissage) :
  // chaque face a un « champ sémantique » ; si une option en contient les mots,
  // la face penche vers elle. Les deux → 'both'. Aucun → face neutre vers B
  // (la face est ensuite arbitrée par l'IA).
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const aN = norm(a), bN = norm(b);
  const touches = (txt: string, words: string[]) => words.some((w) => txt.includes(w));

  const lexiqueSigne: Record<string, string[]> = {
    '♈': ['combat', 'risque', 'audace', 'parti', 'franch', 'seul', 'declic', 'lancer', 'attaque'],
    '♉': ['securite', 'argent', 'stabilite', 'calme', 'patience', 'confort', 'solide', 'possession', 'rester'],
    '♊': ['parole', 'echange', 'reseau', 'curiosite', 'info', 'debat', 'dialogue', 'lettre', 'double'],
    '♋': ['foyer', 'maman', 'parent', 'souvenir', 'coeur', 'proche', 'enfance', 'famille', 'abri'],
    '♌': ['fierte', 'scene', 'reconnaissance', 'creativite', 'enfant', 'plaisir', 'rayonner', 'titre'],
    '♍': ['ordre', 'sante', 'detail', 'travail', 'routine', 'efficace', 'propre', 'analyse', 'service'],
    '♎': ['couple', 'accord', 'autre', 'negocier', 'harmonie', 'contrat', 'partenaire', 'juste'],
    '♏': ['crise', 'passion', 'transforme', 'fond', 'trahir', 'pouvoir', 'deuil', 'radical'],
    '♐': ['voyage', 'large', 'etude', 'loin', 'liberte', 'aventure', 'sens', 'expansion', 'partir'],
    '♑': ['carriere', 'ambition', 'long', 'structure', 'devoir', 'reconnaissance', 'batir', 'austerite'],
    '♒': ['liberte', 'singulier', 'collectif', 'amitie', 'nouaute', 'projet', 'briser', 'original'],
    '♓': ['reve', 'lacher', 'spirituel', 'discret', 'sacrifice', 'art', 'compassion', 'renoncer'],
  };
  const lexiquePlanete: Record<string, string[]> = {
    '☉': ['moi', 'assumer', 'ferte', 'vrai', 'epanoui', 'rayonner', 'volonte'],
    '☽': ['besoin', 'nourrir', 'securite', 'reconfort', 'douceur', 'repos', 'fatigue'],
    '☿': ['parler', 'crire', 'decider', 'calculer', 'changer', 'debat', 'mot'],
    '♀': ['plaisir', 'desir', 'amour', 'beau', 'cout', 'goüt', 'go ut', 'harmonie'],
    '♂': ['lutter', 'audace', 'risque', 'conquerir', 'trancher', 'energie', 'combat'],
    '♃': ['grandir', 'chance', 'opulence', 'voyage', 'abondance', 'projet', 'essor'],
    '♄': ['payer', 'discipline', 'carriere', 'dur', 'long', 'austerite', 'devoir'],
    '♅': ['liberte', 'casser', 'sauter', 'inattendu', 'rupture', 'separ', 'nouveau'],
    '♆': ['reve', 'flou', 'inspir', 'renoncer', 'art', 'illusion', 'discret'],
    '♇': ['mourir', 'transform', 'radical', 'crise', 'renaissance', 'fond', 'secret'],
    '☊': ['avenir', 'appeler', 'destin', 'aller', 'nouvelle', 'mouvement'],
    '☋': ['pass', 'souvenir', 'dette', 'habitude', 'ancien', 'rester'],
  };
  const lexMaison: Record<number, string[]> = {
    1: ['moi seul', 'mon image', 'seul', 'identite'],
    2: ['salaire', 'argent', 'budget', 'ressource', 'econom'],
    3: ['parler', 'dire', 'fratrie', 'proche', 'trajet', 'deplacement'],
    4: ['maison', 'demenager', 'famille', 'parent', 'foyer', 'ville'],
    5: ['enfant', 'amour', 'creation', 'plaisir', 'coeur'],
    6: ['travail', 'emploi', 'poste', 'sante', 'habitude', 'quotidien'],
    7: ['couple', 'associe', 'contrat', 'mariage', 'partenaire', 'autre'],
    8: ['credit', 'impot', 'heritage', 'dettes', 'commun'],
    9: ['voyage', 'etranger', 'etude', 'diplome', 'loin', 'croyance'],
    10: ['carriere', 'promotion', 'titre', 'chef', 'entreprise', 'reconnaissance'],
    11: ['amis', 'reseau', 'projet', 'association', 'futur'],
    12: ['retir', 'hpital', 'solitude', 'spirituel', 'secret', 'lacher'],
  };

  // score = NOMBRE de mots-clés rencontrés (pas juste « oui/non ») : une face
  // neutre au premier degré se rattache au plateau qui en appelle le plus.
  const score = (txt: string, words: string[]) => words.reduce((n, w) => n + (txt.includes(w) ? 1 : 0), 0);
  const penche = (words: string[]): Side => {
    const sA = score(aN, words), sB = score(bN, words);
    if (sA !== sB) return sA > sB ? 'A' : 'B';
    // égalité parfaite (souvent 0-0) : règle stable déduite du tirage lui-même
    // (aucun hasard, aucun « les deux ») — somme des codes des faces + maison.
    const seed = String(faces.planet).charCodeAt(0) + String(faces.sign).charCodeAt(0) + house;
    return seed % 2 === 0 ? 'A' : 'B';
  };

  const pencheN = penche(lexiquePlanete[String(faces.planet)] ?? []);
  const pencheS = penche(lexiqueSigne[String(faces.sign)] ?? []);
  const pencheH = penche(lexMaison[house] ?? []);

  const planetName = PLANET_NAMES[String(faces.planet)] ?? String(faces.planet);
  const signName = SIGN_NAMES[String(faces.sign)] ?? String(faces.sign);

  const motif = (pour: Side, quoi: string): string =>
    `${quoi} penche ${pour === 'A' ? 'vers le premier chemin' : 'vers le second'}`;

  const pesees: Pesee[] = [
    { face: 'planet', glyph: String(faces.planet), name: planetName, pour: pencheN, motif: motif(pencheN, `la force ${planetName.toLowerCase()}`) },
    { face: 'sign', glyph: String(faces.sign), name: signName, pour: pencheS, motif: motif(pencheS, `le ton ${signName.toLowerCase()}`) },
    { face: 'house', glyph: String(house), name: `Maison ${house}`, pour: pencheH, motif: motif(pencheH, `le terrain (maison ${house})`) },
  ];

  // 3 faces strictes → majorité toujours nette (2-1 ou 3-0).
  const wA = pesees.filter((p) => p.pour === 'A').length;
  const balance: Side = wA >= 2 ? 'A' : 'B';

  return { terrain, tempo: se.tempo, element: se.el, moteur, pesees, balance };
}

// ── Bloc « faits du moteur » injecté dans le prompt de l'IA. Calculés par le
// code ; l'IA doit les TISSER, pas les réciter, et peut CONTREDIRE la pesée
// (le verdict lui appartient — c'est elle qui connaît les deux options). ──
export function duelFactsBlock(d: DuelStructure, a: string, b: string): string {
  const pesees = d.pesees.map((p) => `• ${p.name} → plateau ${p.pour} (${p.motif})`).join('\n');
  return [
    `FAITS DU MOTEUR (calculés sur le tirage, pas devinés — à tisser, jamais à réciter) :`,
    `• MOTEUR : ${d.moteur}`,
    `• MÉTHODE/TEMPO : ${d.tempo}`,
    `• TERRAIN : ${d.terrain}`,
    `• Pesée symbolique de première lecture (indice du moteur, à CONFIRMER ou INFIRMER — c'est toi l'arbitre, chaque face doit finir sur UN plateau) :`,
    pesees,
    `• Majorité du moteur : plateau ${d.balance}`,
    `Option A du consultant : « ${a} »`,
    `Option B du consultant : « ${b} »`,
  ].join('\n');
}
