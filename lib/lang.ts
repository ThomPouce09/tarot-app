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

// ─────────────────────────────────────────────────────────────────────────
// Messages d'authentification (routes /api/auth/*) — localisés côté serveur.
// Le client envoie `lang` dans le corps ; sans lui, repli sur le français.
// ─────────────────────────────────────────────────────────────────────────
const DATE_LOCALE: Record<LlmLang, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' };

export function localDate(iso: Date | string | number, lang: LlmLang): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[lang], { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function durationPhrase(n: number, lang: LlmLang): string {
  return {
    fr: `${n} jour${n > 1 ? 's' : ''}`,
    en: `${n} day${n > 1 ? 's' : ''}`,
    es: `${n} día${n > 1 ? 's' : ''}`,
    hi: `${n} दिन`,
  }[lang];
}

export const AUTH_MSG = {
  missing: {
    fr: 'Email et mot de passe requis',
    en: 'Email and password required',
    es: 'Email y contraseña obligatorios',
    hi: 'ईमेल और पासवर्ड आवश्यक हैं',
  },
  bad: {
    fr: 'Email ou mot de passe incorrect',
    en: 'Incorrect email or password',
    es: 'Email o contraseña incorrectos',
    hi: 'ईमेल या पासवर्ड गलत है',
  },
  emailTaken: {
    fr: 'Cet email est déjà inscrit. Connectez-vous ou utilisez un autre email.',
    en: 'This email is already registered. Sign in or use another email.',
    es: 'Este email ya está registrado. Inicie sesión o use otro email.',
    hi: 'यह ईमेल पहले से पंजीकृत है। प्रवेश करें या दूसरा ईमेल उपयोग करें।',
  },
  deletedLogin: {
    fr: 'Votre compte a été supprimé. Vous pourrez recréer un compte à partir du {date} (dans {n}).',
    en: 'Your account was deleted. You can create a new one from {date} (in {n}).',
    es: 'Su cuenta fue eliminada. Podrá crear una nueva a partir del {date} (en {n}).',
    hi: 'आपका खाता हटा दिया गया था। आप {date} से नया खाता बना सकेंगे ({n} में)।',
  },
  deletedSignup: {
    fr: 'Cet email a été utilisé par un compte supprimé. Vous pourrez le réutiliser à partir du {date} (dans {n}).',
    en: 'This email belonged to a deleted account. You can use it again from {date} (in {n}).',
    es: 'Este email perteneció a una cuenta eliminada. Podrá reutilizarlo a partir del {date} (en {n}).',
    hi: 'यह ईमेल एक हटाए गए खाते का था। आप इसे {date} से दोबारा उपयोग कर सकेंगे ({n} में)।',
  },
} as const;

export function authMsg(
  key: keyof typeof AUTH_MSG,
  lang: LlmLang,
  vars: { date?: string; n?: string } = {},
): string {
  let out: string = AUTH_MSG[key][lang] ?? AUTH_MSG[key].fr;
  if (vars.date) out = out.replace('{date}', vars.date);
  if (vars.n) out = out.replace('{n}', vars.n);
  return out;
}
