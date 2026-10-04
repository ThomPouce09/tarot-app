// lib/lang.ts — gestion unifiée des langues pour les routes d'analyse IA.
// L'app parle 4 langues : fr, en, es, hi (Lang côté client = lib/i18n).
// Les prompts sont rédigés en français ; on greffe une directive d'IMPÉRATIF DE
// SORTIE qui impose la langue cible au LLM. Aucune autre partie du prompt n'est
// touchée — les instructions restent en français (la langue d'entrée du prompt
// n'affecte pas la langue de sortie imposée).

export type LlmLang = 'fr' | 'en' | 'es' | 'hi';

export function resolveLang(raw: unknown): LlmLang {
  const v = String(raw ?? '').toLowerCase().slice(0, 2);
  return v === 'en' || v === 'es' || v === 'hi' ? v : 'fr';
}

// Nom de la cible dans la directive (toujours en français, comme le prompt).
const TARGET: Record<LlmLang, string> = {
  fr: '',
  en: 'en anglais (English)',
  es: 'en espagnol (español, castillan naturel)',
  hi: 'en hindi (हिन्दी, écriture devanagari, tournures indiennes naturelles)',
};

/**
 * Directive d'IMPÉRATIF DE SORTIE à coller À LA FIN de tout prompt callOracle
 * (juste après le JSON d'exemple, jamais au milieu — cf. règle « embrasser le
 * format JSON »). Vide pour le français : le prompt est déjà français.
 */
export function outputDirective(lang: LlmLang): string {
  if (lang === 'fr') return '';
  return `\nIMPÉRATIF DE LANGUE : rédige TOUTE la réponse ${TARGET[lang]} — chaque valeur des champs JSON, chaque phrase, chaque titre. Le format JSON et les noms de clés restent EXACTEMENT ceux demandés ci-dessus ; seuls les TEXTES changent de langue. Ne traduis pas les noms propres (Tarot, Yi Jing, Mjölnir, Yggdrasil) ni les symboles.`;
}

// Nom de la langue INSÉRÉ dans un prompt français : « réponds tout en espagnol »…
export function langName(l: LlmLang): string {
  return { fr: 'français', en: 'anglais', es: 'espagnol', hi: 'hindi (हिन्दी, devanagari)' }[l];
}

// Textes offline (fallback sans IA) et libellés de structure selon la langue.
// Les tableaux offline vivent dans les routes ; ici seuls les mots partagés.
export const L10N: Record<string, Record<LlmLang, string>> = {
  thinking: {
    fr: 'Les arcanes réfléchissent…',
    en: 'The arcana are reflecting…',
    es: 'Los arcanos reflexionan…',
    hi: 'अरकान चिंतन कर रहे हैं…',
  },
  offlineError: {
    fr: 'L’oracle est silencieux — tentative hors-ligne.',
    en: 'The oracle is silent — offline attempt.',
    es: 'El oráculo calla — intento sin conexión.',
    hi: 'ओरैकल मौन है — ऑफ़लाइन प्रयास।',
  },
  card: { fr: 'Carte', en: 'Card', es: 'Carta', hi: 'पत्ता' },
};

export function l10n(key: string, lang: LlmLang): string {
  return L10N[key]?.[lang] ?? L10N[key]?.fr ?? key;
}
