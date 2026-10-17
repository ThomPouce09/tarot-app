// lib/country-names.ts — menu déroulant « Pays » (formulaire Oracle, facultatif).
// Liste ISO de lib/countries (indicatifs) sans l'indicatif : on veut le NOM du
// pays, rendu dans la langue demandée via Intl (données Unicode natives —
// zéro asset). getRuntimeLang n'étant accessible que côté client, la langue
// est TOUJOURS un paramètre explicite : ce module reste serveur-compatible.

import { DIAL_COUNTRIES } from '@/lib/countries';

export const DEFAULT_COUNTRY = 'FR';

/** Tous les codes ISO connus, France en tête puis alphabétique. */
export const COUNTRY_OPTIONS: string[] = DIAL_COUNTRIES.map((c) => c.iso);

const LOCALE: Record<string, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' };

/** Nom du pays dans la langue donnée (repli : code ISO lui-même). */
export function countryName(iso: string, lang: string = 'fr'): string {
  try {
    const dn = new Intl.DisplayNames([LOCALE[lang] || 'fr-FR', 'fr'], { type: 'region' });
    return dn.of(iso) || iso;
  } catch {
    return iso;
  }
}
