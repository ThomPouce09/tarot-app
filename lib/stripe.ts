// lib/stripe.ts
// Client Stripe côté serveur UNIQUEMENT (la clé secrète ne doit jamais
// apparaître côté client). On lit STRIPE_SECRET_KEY depuis l'environnement.
//
// IMPORTANT : instanciation PARESSEUSE. En dev / build sans clé (ex. Vercel
// avant configuration des vars d'env), on ne crashe PAS le build : getStripe()
// renvoie null et les routes retournent une 503 propre ("paiements désactivés").

import Stripe from 'stripe';
import { PLAN_PRICE_EUR } from './plans';

let _stripe: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (_stripe !== undefined) return _stripe; // cache (null inclus)
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[stripe] STRIPE_SECRET_KEY manquant — paiements désactivés.');
    _stripe = null;
    return null;
  }
  _stripe = new Stripe(key);
  return _stripe;
}

// Plans -> Prix Stripe (récupérés/créés côté serveur).
// On stocke les Price ID dans l'env pour ne pas les coder en dur ici.
export type PlanId = 'initie' | 'oracle';

export function priceIdForPlan(plan: PlanId): string | undefined {
  if (plan === 'initie') return process.env.STRIPE_PRICE_INITIE;
  if (plan === 'oracle') return process.env.STRIPE_PRICE_ORACLE;
  return undefined;
}

export const PLAN_AMOUNTS: Record<PlanId, { amount: number; currency: 'eur'; interval: 'month'; name: string }> = {
  initie: { amount: 490, currency: 'eur', interval: 'month', name: 'Initié' },
  oracle: { amount: 990, currency: 'eur', interval: 'month', name: 'Oracle' },
};
