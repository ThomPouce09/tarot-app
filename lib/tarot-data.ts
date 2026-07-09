import { majorNameEn, minorNameEn } from './tarot-data-en';

export interface TarotCard {
  id: number;
  name: string;
  nameEn: string;
  nameShort: string;
  arcana: 'major' | 'minor';
  suit: string | null;
  number: number;
  keywords: string[];
}

export const TAROT_CARDS: TarotCard[] = [
  // Major Arcana (0-21)
  m(0, 'Le Mat', '0', ['liberté', 'aventure', 'folie']),
  m(1, 'Le Bateleur', 'I', ['création', 'habileté', 'volonté']),
  m(2, 'La Papesse', 'II', ['intuition', 'sagesse', 'mystère']),
  m(3, "L'Impératrice", 'III', ['fécondité', 'abondance', 'nature']),
  m(4, "L'Empereur", 'IV', ['autorité', 'structure', 'pouvoir']),
  m(5, 'Le Pape', 'V', ['enseignement', 'tradition', 'spiritualité']),
  m(6, "L'Amoureux", 'VI', ['amour', 'choix', 'union']),
  m(7, 'Le Chariot', 'VII', ['victoire', 'conquête', 'détermination']),
  m(8, 'La Justice', 'VIII', ['équilibre', 'vérité', 'loi']),
  m(9, "L'Hermite", 'IX', ['solitude', 'recherche', 'prudence']),
  m(10, 'La Roue de Fortune', 'X', ['destin', 'cycles', 'chance']),
  m(11, 'La Force', 'XI', ['courage', 'énergie', 'maîtrise']),
  m(12, 'Le Pendu', 'XII', ['sacrifice', 'lâcher-prise', 'suspension']),
  m(13, 'La Mort', 'XIII', ['transformation', 'fin', 'renouveau']),
  m(14, 'La Tempérance', 'XIV', ['harmonie', 'patience', 'guérison']),
  m(15, 'Le Diable', 'XV', ['tentation', 'passion', 'attachement']),
  m(16, 'La Maison Dieu', 'XVI', ['destruction', 'révélation', 'libération']),
  m(17, "L'Étoile", 'XVII', ['espoir', 'inspiration', 'sérénité']),
  m(18, 'La Lune', 'XVIII', ['illusion', 'rêves', 'inconscient']),
  m(19, 'Le Soleil', 'XIX', ['bonheur', 'succès', 'vitalité']),
  m(20, 'Le Jugement', 'XX', ['résurrection', 'appel', 'absolution']),
  m(21, 'Le Monde', 'XXI', ['accomplissement', 'plénitude', 'réalisation']),
  // Minor Arcana - Bâtons (Wands)
  ...generateSuit('Bâtons', 'minor'),
  // Minor Arcana - Coupes (Cups)
  ...generateSuit('Coupes', 'minor'),
  // Minor Arcana - Épées (Swords)
  ...generateSuit('Épées', 'minor'),
  // Minor Arcana - Deniers (Pentacles)
  ...generateSuit('Deniers', 'minor'),
];

// Helper pour Major Arcana : remplit nameEn via le dictionnaire EN
function m(id: number, name: string, nameShort: string, keywords: string[]): TarotCard {
  return {
    id,
    name,
    nameEn: majorNameEn(id) ?? name,
    nameShort,
    arcana: 'major',
    suit: null,
    number: id,
    keywords,
  };
}

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
      nameEn: minorNameEn(suit, i),
      nameShort,
      arcana: 'minor' as const,
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
