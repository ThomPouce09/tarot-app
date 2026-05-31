export interface TarotCard {
  id: number;
  name: string;
  nameShort: string;
  arcana: 'major' | 'minor';
  suit: string | null;
  number: number;
  keywords: string[];
}

export const TAROT_CARDS: TarotCard[] = [
  // Major Arcana (0-21)
  { id: 0, name: 'Le Mat', nameShort: '0', arcana: 'major', suit: null, number: 0, keywords: ['liberté', 'aventure', 'folie'] },
  { id: 1, name: 'Le Bateleur', nameShort: 'I', arcana: 'major', suit: null, number: 1, keywords: ['création', 'habileté', 'volonté'] },
  { id: 2, name: 'La Papesse', nameShort: 'II', arcana: 'major', suit: null, number: 2, keywords: ['intuition', 'sagesse', 'mystère'] },
  { id: 3, name: "L'Impératrice", nameShort: 'III', arcana: 'major', suit: null, number: 3, keywords: ['fécondité', 'abondance', 'nature'] },
  { id: 4, name: "L'Empereur", nameShort: 'IV', arcana: 'major', suit: null, number: 4, keywords: ['autorité', 'structure', 'pouvoir'] },
  { id: 5, name: 'Le Pape', nameShort: 'V', arcana: 'major', suit: null, number: 5, keywords: ['enseignement', 'tradition', 'spiritualité'] },
  { id: 6, name: "L'Amoureux", nameShort: 'VI', arcana: 'major', suit: null, number: 6, keywords: ['amour', 'choix', 'union'] },
  { id: 7, name: 'Le Chariot', nameShort: 'VII', arcana: 'major', suit: null, number: 7, keywords: ['victoire', 'conquête', 'détermination'] },
  { id: 8, name: 'La Justice', nameShort: 'VIII', arcana: 'major', suit: null, number: 8, keywords: ['équilibre', 'vérité', 'loi'] },
  { id: 9, name: "L'Hermite", nameShort: 'IX', arcana: 'major', suit: null, number: 9, keywords: ['solitude', 'recherche', 'prudence'] },
  { id: 10, name: 'La Roue de Fortune', nameShort: 'X', arcana: 'major', suit: null, number: 10, keywords: ['destin', 'cycles', 'chance'] },
  { id: 11, name: 'La Force', nameShort: 'XI', arcana: 'major', suit: null, number: 11, keywords: ['courage', 'énergie', 'maîtrise'] },
  { id: 12, name: 'Le Pendu', nameShort: 'XII', arcana: 'major', suit: null, number: 12, keywords: ['sacrifice', 'lâcher-prise', 'suspension'] },
  { id: 13, name: 'La Mort', nameShort: 'XIII', arcana: 'major', suit: null, number: 13, keywords: ['transformation', 'fin', 'renouveau'] },
  { id: 14, name: 'La Tempérance', nameShort: 'XIV', arcana: 'major', suit: null, number: 14, keywords: ['harmonie', 'patience', 'guérison'] },
  { id: 15, name: 'Le Diable', nameShort: 'XV', arcana: 'major', suit: null, number: 15, keywords: ['tentation', 'passion', 'attachement'] },
  { id: 16, name: 'La Maison Dieu', nameShort: 'XVI', arcana: 'major', suit: null, number: 16, keywords: ['destruction', 'révélation', 'libération'] },
  { id: 17, name: "L'Étoile", nameShort: 'XVII', arcana: 'major', suit: null, number: 17, keywords: ['espoir', 'inspiration', 'sérénité'] },
  { id: 18, name: 'La Lune', nameShort: 'XVIII', arcana: 'major', suit: null, number: 18, keywords: ['illusion', 'rêves', 'inconscient'] },
  { id: 19, name: 'Le Soleil', nameShort: 'XIX', arcana: 'major', suit: null, number: 19, keywords: ['bonheur', 'succès', 'vitalité'] },
  { id: 20, name: 'Le Jugement', nameShort: 'XX', arcana: 'major', suit: null, number: 20, keywords: ['résurrection', 'appel', 'absolution'] },
  { id: 21, name: 'Le Monde', nameShort: 'XXI', arcana: 'major', suit: null, number: 21, keywords: ['accomplissement', 'plénitude', 'réalisation'] },
  // Minor Arcana - Bâtons (Wands)
  ...generateSuit('Bâtons', 'minor'),
  // Minor Arcana - Coupes (Cups)
  ...generateSuit('Coupes', 'minor'),
  // Minor Arcana - Épées (Swords)
  ...generateSuit('Épées', 'minor'),
  // Minor Arcana - Deniers (Pentacles)
  ...generateSuit('Deniers', 'minor'),
];

function generateSuit(suit: string, arcana: 'minor'): TarotCard[] {
  const baseId = suit === 'Bâtons' ? 22 : suit === 'Coupes' ? 36 : suit === 'Épées' ? 50 : 64;
  const courtNames = ['Valet', 'Cavalier', 'Reine', 'Roi'];
  const numberNames = ['As', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix'];
  const cards: TarotCard[] = [];

  for (let i = 0; i < 14; i++) {
    const isCourt = i >= 10;
    const name = isCourt
      ? `${courtNames[i - 10]} de ${suit}`
      : `${numberNames[i]} de ${suit}`;
    const nameShort = isCourt ? courtNames[i - 10]?.[0] ?? '' : `${i + 1}`;
    cards.push({
      id: baseId + i,
      name,
      nameShort,
      arcana,
      suit,
      number: i + 1,
      keywords: getSuitKeywords(suit, i),
    });
  }
  return cards;
}

function getSuitKeywords(suit: string, index: number): string[] {
  const suitThemes: Record<string, string[]> = {
    'Bâtons': ['action', 'créativité', 'ambition', 'énergie', 'passion', 'entreprise'],
    'Coupes': ['émotions', 'amour', 'relations', 'intuition', 'rêves', 'sentiments'],
    'Épées': ['intellect', 'vérité', 'conflit', 'justice', 'communication', 'esprit'],
    'Deniers': ['matériel', 'travail', 'santé', 'nature', 'prospérité', 'stabilité'],
  };
  const themes = suitThemes[suit] ?? ['mystère'];
  return [themes[index % themes?.length] ?? 'mystère', themes[(index + 1) % themes?.length] ?? 'mystère'];
}

// Color mapping for suits
export const SUIT_COLORS: Record<string, { primary: string; secondary: string; accent: string; symbol: string }> = {
  'Bâtons': { primary: '#8B4513', secondary: '#D2691E', accent: '#FF8C00', symbol: '🏹' },
  'Coupes': { primary: '#1E3A5F', secondary: '#4682B4', accent: '#87CEEB', symbol: '🏆' },
  'Épées': { primary: '#4A4A4A', secondary: '#708090', accent: '#C0C0C0', symbol: '⚔️' },
  'Deniers': { primary: '#8B6914', secondary: '#DAA520', accent: '#FFD700', symbol: '⭐' },
};

export const MAJOR_ARCANA_SYMBOLS: Record<number, string> = {
  0: '🃏', 1: '🎭', 2: '📖', 3: '👑', 4: '🏰', 5: '⛪', 6: '💕',
  7: '🏇', 8: '⚖️', 9: '🔦', 10: '🎡', 11: '🦁', 12: '🔮',
  13: '💀', 14: '🏺', 15: '😈', 16: '⚡', 17: '⭐', 18: '🌙',
  19: '☀️', 20: '📯', 21: '🌍',
};
