// Helper i18n pour les noms de cartes Tarot.
import { TarotCard } from '../tarot-data';
import { Lang } from './index';

export function cardDisplayName(card: TarotCard, lang: Lang): string {
  return lang === 'en' ? (card.nameEn || card.name) : card.name;
}
