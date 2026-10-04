// lib/i18n/positions.ts — Localisation des libellés de position qui circulent en
// données (FR) : sections IA {position}, tirages nornes, croix tarot, etc.
// Les données restent FR en base (stabilité historique + prompt IA français) ;
// on traduit à l'affichage via les tables générées (tarot-data-i18n) + tables
// runes (positions.ts avec blocs imbriqués es/hi).
import type { Lang } from './index';
import { getRuntimeLang } from './index';
import { NORNES_POSITIONS, POSITION_LABELS_CROSS, POSITION_LABELS_3 } from '../tarot-data-i18n';
import { MJG_POS } from '@/app/runes/mjolnir/positions';
import { YGG_POS } from '@/app/runes/yggdrasil/positions';

const FR_TO_I18N: Array<[string, Record<string, string>]> = [];
function build() {
  if (FR_TO_I18N.length) return;
  // Nornes + croix tarot + positions 3 cartes (Passé/Présent/Avenir)
  NORNES_POSITIONS.fr.forEach((f, i) => {
    FR_TO_I18N.push([f, { en: NORNES_POSITIONS.en[i], es: NORNES_POSITIONS.es[i], hi: NORNES_POSITIONS.hi[i] }]);
  });
  POSITION_LABELS_CROSS.fr.forEach((f, i) => {
    FR_TO_I18N.push([f, { en: POSITION_LABELS_CROSS.en[i], es: POSITION_LABELS_CROSS.es[i], hi: POSITION_LABELS_CROSS.hi[i] }]);
  });
  POSITION_LABELS_3.fr.forEach((f, i) => {
    FR_TO_I18N.push([f, { en: POSITION_LABELS_3.en[i], es: POSITION_LABELS_3.es[i], hi: POSITION_LABELS_3.hi[i] }]);
  });
  // Runes : positions MJG/YGG (blocs imbriqués fr/en/es/hi)
  for (const p of [...MJG_POS, ...YGG_POS]) {
    FR_TO_I18N.push([p.fr.name, { en: p.en.name, es: p.es?.name ?? p.fr.name, hi: p.hi?.name ?? p.fr.name }]);
  }
}

/** Position affichée dans la langue courante (fallback : chaîne d'origine). */
export function localizePosition(pos: string, lang?: Lang): string {
  lang = lang ?? getRuntimeLang();
  if (lang === 'fr' || !pos) return pos;
  build();
  for (const [fr, v] of FR_TO_I18N) {
    if (pos === fr) return v[lang] ?? pos;
    // tolérance : apostrophe typographique vs droite, préfixes 'Rune N —'
    if (pos.replace(/[\u2019']/g, "'") === fr.replace(/[\u2019']/g, "'")) return v[lang] ?? pos;
  }
  return pos;
}
