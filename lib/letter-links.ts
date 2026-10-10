// ── Liens de la lettre mystique ─────────────────────────────────────────
// TOUS les liens pointent vers le domaine de l'API (celui des App Links
// Android) : sur mobile, un lien https de ce domaine ouvre l'APK installée
// au lieu du navigateur (cf. AndroidManifest, intent-filter autoVerify).
//
// Ne JAMAIS coder une URL en dur dans les gabarits : on passe toujours par
// letterBaseUrl() pour que le changement de domaine n'ait qu'un seul point.
const FALLBACK_BASE = 'https://tarot-app-one-sage.vercel.app';

/** Base absolue des liens d'email (domaine de l'API, celui des App Links). */
export function letterBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
  // Une URL locale (dev) ne doit pas partir dans un email : on garde le
  // domaine public pour les liens destinés aux destinataires.
  if (env && !/localhost|127\.0\.0\.1|192\.168\.|10\./.test(env)) {
    return env.replace(/\/+$/, '');
  }
  return FALLBACK_BASE;
}

/** URL de désabonnement en un clic (RGPD). */
export function letterUnsubUrl(email: string): string {
  return `${letterBaseUrl()}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
}
