// Traductions EN des cartes Tarot — séparé de tarot-data.ts pour rester évolutif.
// Major Arcana : id -> nom EN. Minor Arcana : construit via generateSuitEn().

export const MAJOR_ARCANA_EN: Record<number, string> = {
  0: 'The Fool',
  1: 'The Magician',
  2: 'The High Priestess',
  3: 'The Empress',
  4: 'The Emperor',
  5: 'The Hierophant',
  6: 'The Lovers',
  7: 'The Chariot',
  8: 'Justice',
  9: 'The Hermit',
  10: 'Wheel of Fortune',
  11: 'Strength',
  12: 'The Hanged Man',
  13: 'Death',
  14: 'Temperance',
  15: 'The Devil',
  16: 'The Tower',
  17: 'The Star',
  18: 'The Moon',
  19: 'The Sun',
  20: 'Judgement',
  21: 'The World',
};

// Suits FR -> EN
const SUIT_EN: Record<string, string> = {
  Bâtons: 'Wands',
  Coupes: 'Cups',
  Épées: 'Swords',
  Deniers: 'Pentacles',
};

const COURT_EN = ['Page', 'Knight', 'Queen', 'King'];
const NUMBER_EN = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

export function majorNameEn(id: number): string | undefined {
  return MAJOR_ARCANA_EN[id];
}

export function minorNameEn(suit: string, index: number): string {
  const suitEn = SUIT_EN[suit] ?? suit;
  const isCourt = index >= 10;
  return isCourt
    ? `${COURT_EN[index - 10]} of ${suitEn}`
    : `${NUMBER_EN[index]} of ${suitEn}`;
}
