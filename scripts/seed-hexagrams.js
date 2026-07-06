// Script d'import des 64 hexagrammes du Yi Jing dans Neon DB
// Usage: node scripts/seed-hexagrams.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const hexagrams = [
  { number: 1, glyph: '\u4DC0', ideogram: '\u4E7E', pinyin: 'qián', frenchName: 'Le Créateur', trigramSuperior: 'Ciel ☰', trigramInferior: 'Ciel ☰', semanticEssence: 'Énergie pure, initiation, action souveraine, force créatrice absolue.' },
  { number: 2, glyph: '\u4DC1', ideogram: '\u5764', pinyin: 'kūn', frenchName: 'Le Réceptif', trigramSuperior: 'Terre ☷', trigramInferior: 'Terre ☷', semanticEssence: 'Disponibilité, accueil, écoute, soutien passif mais fertile.' },
  { number: 3, glyph: '\u4DC2', ideogram: '\u5C6F', pinyin: 'zhūn', frenchName: 'La Difficulté Initiale', trigramSuperior: 'Eau ☵', trigramInferior: 'Tonnerre ☳', semanticEssence: 'Germination, croissance entravée, chaos constructif, besoin d\'aide.' },
  { number: 4, glyph: '\u4DC3', ideogram: '\u8499', pinyin: 'méng', frenchName: 'La Folie Juvénile', trigramSuperior: 'Montagne ☶', trigramInferior: 'Eau ☵', semanticEssence: 'Inexpérience, apprentissage nécessaire, clarté cachée par l\'ombre.' },
  { number: 5, glyph: '\u4DC4', ideogram: '\u9700', pinyin: 'xū', frenchName: 'L\'Attente (La Nutrition)', trigramSuperior: 'Eau ☵', trigramInferior: 'Ciel ☰', semanticEssence: 'Patience stratégique, se nourrir en attendant le moment propice.' },
  { number: 6, glyph: '\u4DC5', ideogram: '\u8A1F', pinyin: 'sòng', frenchName: 'Le Conflit', trigramSuperior: 'Ciel ☰', trigramInferior: 'Eau ☵', semanticEssence: 'Opposition frontale, blocage juridique ou relationnel, prudence.' },
  { number: 7, glyph: '\u4DC6', ideogram: '\u5E2B', pinyin: 'shī', frenchName: 'L\'Armée', trigramSuperior: 'Terre ☷', trigramInferior: 'Eau ☵', semanticEssence: 'Discipline, mobilisation collective, direction ferme, stratégie.' },
  { number: 8, glyph: '\u4DC7', ideogram: '\u6BD4', pinyin: 'bǐ', frenchName: 'L\'Union (La Solidarité)', trigramSuperior: 'Eau ☵', trigramInferior: 'Terre ☷', semanticEssence: 'Alliance, cohésion, ralliement naturel autour d\'un centre.' },
  { number: 9, glyph: '\u4DC8', ideogram: '\u5C0F\u755C', pinyin: 'xiǎo chù', frenchName: 'Le Pouvoir d\'Apprivoisement du Petit', trigramSuperior: 'Vent ☴', trigramInferior: 'Ciel ☰', semanticEssence: 'Accumulation discrète, influence subtile, retenue provisoire.' },
  { number: 10, glyph: '\u4DC9', ideogram: '\u5C65', pinyin: 'lǚ', frenchName: 'La Marche (Le Comportement)', trigramSuperior: 'Ciel ☰', trigramInferior: 'Lac ☱', semanticEssence: 'Avancer avec précaution (marcher sur la queue du tigre), politesse.' },
  { number: 11, glyph: '\u4DCA', ideogram: '\u6CF0', pinyin: 'tài', frenchName: 'La Paix (L\'Harmonie)', trigramSuperior: 'Terre ☷', trigramInferior: 'Ciel ☰', semanticEssence: 'Équilibre parfait, expansion, flux d\'énergie descendant et ascendant.' },
  { number: 12, glyph: '\u4DCB', ideogram: '\u5426', pinyin: 'pǐ', frenchName: 'La Stagnation (Le Blocage)', trigramSuperior: 'Ciel ☰', trigramInferior: 'Terre ☷', semanticEssence: 'Inertie, fermeture, déconnexion entre le haut et le bas.' },
  { number: 13, glyph: '\u4DCC', ideogram: '\u540C\u4EBA', pinyin: 'tóng rén', frenchName: 'La Communauté avec les Hommes', trigramSuperior: 'Ciel ☰', trigramInferior: 'Feu ☲', semanticEssence: 'Fraternité, universalité, buts communs partagés au grand jour.' },
  { number: 14, glyph: '\u4DCD', ideogram: '\u5927\u6709', pinyin: 'dà yǒu', frenchName: 'Le Grand Avoir', trigramSuperior: 'Feu ☲', trigramInferior: 'Ciel ☰', semanticEssence: 'Prospérité, clarté bienveillante, maîtrise des ressources.' },
  { number: 15, glyph: '\u4DCE', ideogram: '\u8B19', pinyin: 'qiān', frenchName: 'L\'Humilité', trigramSuperior: 'Montagne ☶', trigramInferior: 'Terre ☷', semanticEssence: 'Modestie protectrice, équilibrage naturel des excès.' },
  { number: 16, glyph: '\u4DCF', ideogram: '\u8C6B', pinyin: 'yù', frenchName: 'L\'Enthousiasme', trigramSuperior: 'Tonnerre ☳', trigramInferior: 'Terre ☷', semanticEssence: 'Énergie motrice, inspiration, préparation de l\'action par la joie.' },
  { number: 17, glyph: '\u4DD0', ideogram: '\u96A8', pinyin: 'suí', frenchName: 'La Suite', trigramSuperior: 'Lac ☱', trigramInferior: 'Tonnerre ☳', semanticEssence: 'S\'adapter au mouvement de l\'époque, suivre sans résistance.' },
  { number: 18, glyph: '\u4DD1', ideogram: '\u87B0', pinyin: 'gǔ', frenchName: 'Le Travail sur ce qui est Corrompu', trigramSuperior: 'Montagne ☶', trigramInferior: 'Vent ☴', semanticEssence: 'Restructuration, assainissement, réparation des erreurs passées.' },
  { number: 19, glyph: '\u4DD2', ideogram: '\u81E8', pinyin: 'lín', frenchName: 'L\'Approche', trigramSuperior: 'Terre ☷', trigramInferior: 'Lac ☱', semanticEssence: 'Croissance imminente, autorité bienveillante, vigilance requise.' },
  { number: 20, glyph: '\u4DD3', ideogram: '\u89C0', pinyin: 'guān', frenchName: 'La Contemplation', trigramSuperior: 'Vent ☴', trigramInferior: 'Terre ☷', semanticEssence: 'Observation panoramique, recul, exemplarité, vision d\'ensemble.' },
  { number: 21, glyph: '\u4DD4', ideogram: '\u566E\u54AC', pinyin: 'shì kè', frenchName: 'Mordre au travers', trigramSuperior: 'Feu ☲', trigramInferior: 'Tonnerre ☳', semanticEssence: 'Justice, trancher l\'obstacle, application rigoureuse de la loi.' },
  { number: 22, glyph: '\u4DD5', ideogram: '\u8CC2', pinyin: 'bì', frenchName: 'La Grâce (L\'Élégance)', trigramSuperior: 'Ciel ☰', trigramInferior: 'Montagne ☶', semanticEssence: 'Beauté formelle, esthétique, apparence à ne pas confondre avec le fond.' },
  { number: 23, glyph: '\u4DD6', ideogram: '\u5265', pinyin: 'bō', frenchName: 'L\'Éclatement (La Ruine)', trigramSuperior: 'Montagne ☶', trigramInferior: 'Terre ☷', semanticEssence: 'Effondrement de l\'ancien, détérioration nécessaire, dépouillement.' },
  { number: 24, glyph: '\u4DD7', ideogram: '\u5FA9', pinyin: 'fù', frenchName: 'Le Retour (Le Tournant)', trigramSuperior: 'Terre ☷', trigramInferior: 'Tonnerre ☳', semanticEssence: 'Renaissance, nouveau cycle, retour de la lumière (Yang), régénération.' },
  { number: 25, glyph: '\u4DD8', ideogram: '\u7121\u5984', pinyin: 'wú wàng', frenchName: 'L\'Innocence (L\'Inattendu)', trigramSuperior: 'Ciel ☰', trigramInferior: 'Tonnerre ☳', semanticEssence: 'Spontanéité, agir sans calcul, droiture naturelle face à l\'imprévu.' },
  { number: 26, glyph: '\u4DD9', ideogram: '\u5927\u755C', pinyin: 'dà chù', frenchName: 'Le Pouvoir d\'Apprivoisement du Grand', trigramSuperior: 'Montagne ☶', trigramInferior: 'Ciel ☰', semanticEssence: 'Sagesse accumulée, maîtrise des forces majeures, fermeté.' },
  { number: 27, glyph: '\u4DDA', ideogram: '\u9813', pinyin: 'yí', frenchName: 'Les Commissures des Lèvres (La Nutrition)', trigramSuperior: 'Montagne ☶', trigramInferior: 'Tonnerre ☳', semanticEssence: 'Nutrition matérielle et spirituelle, ce que l\'on ingère et exprime.' },
  { number: 28, glyph: '\u4DDB', ideogram: '\u5927\u904E', pinyin: 'dà guò', frenchName: 'La Prépondérance du Grand', trigramSuperior: 'Lac ☱', trigramInferior: 'Vent ☴', semanticEssence: 'Surcharge, tension extrême, structure proche de la rupture.' },
  { number: 29, glyph: '\u4DDC', ideogram: '\u574E', pinyin: 'kǎn', frenchName: 'L\'Insondable (L\'Eau)', trigramSuperior: 'Eau ☵', trigramInferior: 'Eau ☵', semanticEssence: 'Danger répété, courage face à l\'abîme, fluidité émotionnelle.' },
  { number: 30, glyph: '\u4DDD', ideogram: '\u96E2', pinyin: 'lí', frenchName: 'Ce qui s\'attache (Le Feu)', trigramSuperior: 'Feu ☲', trigramInferior: 'Feu ☲', semanticEssence: 'Lucidité, clarté d\'esprit, dépendance nécessaire à une source lumineuse.' },
  { number: 31, glyph: '\u4DDE', ideogram: '\u54B8', pinyin: 'xián', frenchName: 'L\'Influence (L\'Attraction)', trigramSuperior: 'Lac ☱', trigramInferior: 'Montagne ☶', semanticEssence: 'Réceptivité mutuelle, résonance, impulsion spontanée des cœurs.' },
  { number: 32, glyph: '\u4DDF', ideogram: '\u6046', pinyin: 'héng', frenchName: 'La Durée', trigramSuperior: 'Tonnerre ☳', trigramInferior: 'Vent ☴', semanticEssence: 'Persévérance, stabilité dynamique, continuité à travers le changement.' },
  { number: 33, glyph: '\u4DE0', ideogram: '\u906E', pinyin: 'dùn', frenchName: 'La Retraite', trigramSuperior: 'Ciel ☰', trigramInferior: 'Montagne ☶', semanticEssence: 'Retrait stratégique, économiser ses forces, céder face à la pression.' },
  { number: 34, glyph: '\u4DE1', ideogram: '\u5927\u58EE', pinyin: 'dà zhuàng', frenchName: 'La Puissance du Grand', trigramSuperior: 'Tonnerre ☳', trigramInferior: 'Ciel ☰', semanticEssence: 'Force majeure, élan puissant, attention à ne pas en abuser aveuglément.' },
  { number: 35, glyph: '\u4DE2', ideogram: '\u6649', pinyin: 'jìn', frenchName: 'Le Progrès', trigramSuperior: 'Feu ☲', trigramInferior: 'Terre ☷', semanticEssence: 'Ascension lumineuse, reconnaissance, expansion facilitée.' },
  { number: 36, glyph: '\u4DE3', ideogram: '\u660E\u5937', pinyin: 'míng yí', frenchName: 'L\'Obscurcissement de la Lumière', trigramSuperior: 'Terre ☷', trigramInferior: 'Feu ☲', semanticEssence: 'Dissimuler sa clarté en temps de crise, résilience interne.' },
  { number: 37, glyph: '\u4DE4', ideogram: '\u5BB6\u4EBA', pinyin: 'jiā rén', frenchName: 'La Famille (Le Clan)', trigramSuperior: 'Vent ☴', trigramInferior: 'Feu ☲', semanticEssence: 'Rôles clairs, structure interne, fondations domestiques solides.' },
  { number: 38, glyph: '\u4DE5', ideogram: '\u777E', pinyin: 'kuí', frenchName: 'L\'Opposition', trigramSuperior: 'Feu ☲', trigramInferior: 'Lac ☱', semanticEssence: 'Divergence des points de vue, altérité, trouver l\'unité dans la diversité.' },
  { number: 39, glyph: '\u4DE6', ideogram: '\u8E06', pinyin: 'jiǎn', frenchName: 'L\'Obstacle', trigramSuperior: 'Eau ☵', trigramInferior: 'Montagne ☶', semanticEssence: 'Difficultés majeures, faire demi-tour ou chercher des alliés.' },
  { number: 40, glyph: '\u4DE7', ideogram: '\u89E3', pinyin: 'xiè', frenchName: 'La Libération', trigramSuperior: 'Tonnerre ☳', trigramInferior: 'Eau ☵', semanticEssence: 'Relâchement des tensions, pardon, retour au calme après la tempête.' },
  { number: 41, glyph: '\u4DE8', ideogram: '\u640D', pinyin: 'sǔn', frenchName: 'La Diminution', trigramSuperior: 'Montagne ☶', trigramInferior: 'Lac ☱', semanticEssence: 'Simplification, réduction du superflu, investissement sur le fond.' },
  { number: 42, glyph: '\u4DE9', ideogram: '\u76CA', pinyin: 'yì', frenchName: 'L\'Augmentation', trigramSuperior: 'Vent ☴', trigramInferior: 'Tonnerre ☳', semanticEssence: 'Expansion, enrichissement mutuel, temps d\'agir et de progresser.' },
  { number: 43, glyph: '\u4DEA', ideogram: '\u592C', pinyin: 'guài', frenchName: 'La Percée (La Résolution)', trigramSuperior: 'Lac ☱', trigramInferior: 'Ciel ☰', semanticEssence: 'Trancher avec détermination, dissiper la dernière ombre de manière ouverte.' },
  { number: 44, glyph: '\u4DEB', ideogram: '\u5B7D', pinyin: 'gòu', frenchName: 'Venir à la Rencontre', trigramSuperior: 'Ciel ☰', trigramInferior: 'Vent ☴', semanticEssence: 'Infiltration d\'une force subtile ou disruptive, alliance inattendue.' },
  { number: 45, glyph: '\u4DEC', ideogram: '\u8403', pinyin: 'cuì', frenchName: 'Le Rassemblement', trigramSuperior: 'Lac ☱', trigramInferior: 'Terre ☷', semanticEssence: 'Convergence des énergies, communauté, nécessité d\'un centre fort.' },
  { number: 46, glyph: '\u4DED', ideogram: '\u5347', pinyin: 'shēng', frenchName: 'La Poussée vers le Haut', trigramSuperior: 'Terre ☷', trigramInferior: 'Vent ☴', semanticEssence: 'Ascension graduelle, effort continu, croissance sans heurts.' },
  { number: 47, glyph: '\u4DEE', ideogram: '\u56F0', pinyin: 'kùn', frenchName: 'L\'Accablement (L\'Épuisement)', trigramSuperior: 'Lac ☱', trigramInferior: 'Eau ☵', semanticEssence: 'Restriction, mise à l\'épreuve des convictions, force intérieure requise.' },
  { number: 48, glyph: '\u4DEF', ideogram: '\u4E95', pinyin: 'jǐng', frenchName: 'Le Puits', trigramSuperior: 'Eau ☵', trigramInferior: 'Vent ☴', semanticEssence: 'Source immuable de sagesse humaine, renouvellement des profondeurs.' },
  { number: 49, glyph: '\u4DF0', ideogram: '\u9769', pinyin: 'gé', frenchName: 'La Révolution (La Mue)', trigramSuperior: 'Lac ☱', trigramInferior: 'Feu ☲', semanticEssence: 'Changement radical de cycle, rupture temporelle nécessaire.' },
  { number: 50, glyph: '\u4DF1', ideogram: '\u9F0E', pinyin: 'dǐng', frenchName: 'Le Chaudron', trigramSuperior: 'Feu ☲', trigramInferior: 'Vent ☴', semanticEssence: 'Transformation spirituelle, alchimie relationnelle, raffinement.' },
  { number: 51, glyph: '\u4DF2', ideogram: '\u9707', pinyin: 'zhèn', frenchName: 'L\'Éveilleur (Le Tonnerre)', trigramSuperior: 'Tonnerre ☳', trigramInferior: 'Tonnerre ☳', semanticEssence: 'Choc salutaire, prise de conscience brutale, sursaut d\'activité.' },
  { number: 52, glyph: '\u4DF3', ideogram: '\u826E', pinyin: 'gèn', frenchName: 'L\'Immobilisation (La Montagne)', trigramSuperior: 'Montagne ☶', trigramInferior: 'Montagne ☶', semanticEssence: 'Calme mental, méditation, s\'arrêter quand il le faut.' },
  { number: 53, glyph: '\u4DF4', ideogram: '\u6F38', pinyin: 'jiàn', frenchName: 'Le Développement Graduel', trigramSuperior: 'Vent ☴', trigramInferior: 'Montagne ☶', semanticEssence: 'Progression pas à pas, intégration organique lente et durable.' },
  { number: 54, glyph: '\u4DF5', ideogram: '\u6B78\u59B9', pinyin: 'guī mèi', frenchName: 'L\'Épousée', trigramSuperior: 'Tonnerre ☳', trigramInferior: 'Lac ☱', semanticEssence: 'Position subordonnée, désalignement des priorités, prudence.' },
  { number: 55, glyph: '\u4DF6', ideogram: '\u8C50', pinyin: 'fēng', frenchName: 'L\'Abondance', trigramSuperior: 'Tonnerre ☳', trigramInferior: 'Feu ☲', semanticEssence: 'Apogée, plénitude lumineuse, gérer le pic avant le déclin naturel.' },
  { number: 56, glyph: '\u4DF7', ideogram: '\u65C5', pinyin: 'lǚ', frenchName: 'Le Voyageur', trigramSuperior: 'Feu ☲', trigramInferior: 'Montagne ☶', semanticEssence: 'Condition transitoire, précarité géographique, détachement.' },
  { number: 57, glyph: '\u4DF8', ideogram: '\u5DFD', pinyin: 'xùn', frenchName: 'Le Doux (Le Vent)', trigramSuperior: 'Vent ☴', trigramInferior: 'Vent ☴', semanticEssence: 'Pénétration subtile des idées, souplesse d\'action, persévérance.' },
  { number: 58, glyph: '\u4DF9', ideogram: '\u514C', pinyin: 'duì', frenchName: 'Le Serein (Le Lac)', trigramSuperior: 'Lac ☱', trigramInferior: 'Lac ☱', semanticEssence: 'Joie partagée, expression harmonieuse, ouverture relationnelle.' },
  { number: 59, glyph: '\u4DFA', ideogram: '\u6F44', pinyin: 'huàn', frenchName: 'La Dissolution (La Dispersion)', trigramSuperior: 'Vent ☴', trigramInferior: 'Eau ☵', semanticEssence: 'Dissiper les blocages égoïstes, fluidifier les structures rigides.' },
  { number: 60, glyph: '\u4DFB', ideogram: '\u7BC0', pinyin: 'jié', frenchName: 'La Limitation', trigramSuperior: 'Eau ☵', trigramInferior: 'Lac ☱', semanticEssence: 'Cadre nécessaire, économie des moyens, autodiscipline équilibrée.' },
  { number: 61, glyph: '\u4DFC', ideogram: '\u4E2D\u5B5A', pinyin: 'zhōng fú', frenchName: 'La Vérité Intérieure', trigramSuperior: 'Vent ☴', trigramInferior: 'Lac ☱', semanticEssence: 'Sincérité absolue, résonance spirituelle, impact invisible puissant.' },
  { number: 62, glyph: '\u4DFD', ideogram: '\u5C0F\u904E', pinyin: 'xiǎo guò', frenchName: 'La Prépondérance du Petit', trigramSuperior: 'Montagne ☶', trigramInferior: 'Lac ☱', semanticEssence: 'Attention aux détails, rester humble, ne pas viser trop haut pour l\'instant.' },
  { number: 63, glyph: '\u4DFE', ideogram: '\u65E2\u6FDF', pinyin: 'jì jì', frenchName: 'Après l\'Accomplissement', trigramSuperior: 'Eau ☵', trigramInferior: 'Feu ☲', semanticEssence: 'Ordre parfait installé, risque d\'inertie ou de relâchement futur.' },
  { number: 64, glyph: '\u4DFF', ideogram: '\u672A\u6FDF', pinyin: 'wèi jì', frenchName: 'Avant l\'Accomplissement', trigramSuperior: 'Feu ☲', trigramInferior: 'Eau ☵', semanticEssence: 'Transition inachevée, chaos porteur d\'avenir, vigilance au dernier pas.' },
];

async function main() {
  console.log('🗑️  Nettoyage des anciens hexagrammes...');
  await prisma.hexagram.deleteMany();

  console.log(`📥 Insertion des ${hexagrams.length} hexagrammes...`);
  for (const h of hexagrams) {
    await prisma.hexagram.create({ data: h });
  }

  const count = await prisma.hexagram.count();
  console.log(`✅ ${count} hexagrammes insérés avec succès dans Neon DB !`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
