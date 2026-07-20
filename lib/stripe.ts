// lib/stripe.ts
// Client Stripe côté serveur UNIQUEMENT (la clé secrète ne doit jamais
// apparaître côté client). On lit STRIPE_SECRET_KEY depuis l'environnement.

import Stripe from 'stripe';
import { PLAN_PRICE_EUR } from './plans';

if (!process.env.STRIPE_SECRET_KEY) {
  // En dev sans clé, on ne plante pas le build : le client est créé paresseusement.
  console.warn('[stripe] STRIPE_SECRET_KEY manquant — paiements désactivés.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
});

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
