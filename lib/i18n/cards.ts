// Helper i18n pour les noms de cartes Tarot.
import { TarotCard } from '../tarot-data';
import { Lang } from './index';
import { tarotNameI18n } from '../tarot-data-i18n';

export function cardDisplayName(card: Pick<TarotCard, 'id' | 'name'> & Partial<Pick<TarotCard, 'nameEn'>>, lang: Lang): string {
  if (lang === 'fr') return card.name;
  if (lang === 'en') return card.nameEn || card.name;
  // es/hi : tables générées (lib/tarot-data-i18n.ts) indexées par id de carte.
  return tarotNameI18n(card.id, card.name, lang, card.nameEn);
}
