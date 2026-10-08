// lib/stripe-period.ts
// Fin de période d'un abonnement Stripe, TOUS formats d'API confondus.
// Depuis l'API « dahlia » (Stripe SDK v22 / apiVersion 2026-xx), le champ
// `current_period_end` a disparu du niveau Subscription pour migrer vers
// `items.data[].current_period_end` (et `current_period.ends_at`). Les codes
// qui lisaient sub.current_period_end tombaient sur le fallback new Date()
// → la base enregistrait « expiré à l'instant de l'achat » et le bandeau
// « Votre abonnement a expiré le … » s'affichait juste après le paiement.
// Règle : si aucune borne fiable n'est trouvée → null (NE JAMAIS écrire now()).

/** Millisecondes epoch de fin de période, ou null si indéterminable. */
export function stripePeriodEndMs(sub: any): number | null {
  const top = sub?.current_period_end ?? sub?.current_period?.ends_at;
  if (typeof top === 'number' && top > 0) return top * 1000;
  const items: any[] = Array.isArray(sub?.items?.data) ? sub.items.data : [];
  const ends = items
    .map((i) => i?.current_period_end)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  if (ends.length) return Math.max(...ends) * 1000;
  return null;
}

/** Idem en Date. */
export function stripePeriodEndDate(sub: any): Date | null {
  const ms = stripePeriodEndMs(sub);
  return ms ? new Date(ms) : null;
}
