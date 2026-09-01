// lib/stripe.ts
// Client Stripe côté serveur UNIQUEMENT (la clé secrète ne doit jamais
// apparaître côté client). On lit STRIPE_SECRET_KEY depuis l'environnement.
//
// IMPORTANT : instanciation PARESSEUSE. En dev / build sans clé (ex. Vercel
// avant configuration des vars d'env), on ne crashe PAS le build : getStripe()
// renvoie null et les routes retournent une 503 propre ("paiements désactivés").

import Stripe from 'stripe';
import { PLAN_PRICE_EUR, PLAN_PRICE_YEAR_EUR, type SubscriptionPlanId } from './plans';

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

// Plans récurrents -> Prix Stripe (récupérés/créés côté serveur).
// On stocke les Price ID dans l'env pour ne pas les coder en dur ici.
export type PlanId = SubscriptionPlanId; // 'initie' | 'arkane'

export function priceIdForPlan(plan: PlanId, billing: 'month' | 'year' = 'month'): string | undefined {
  if (billing === 'year') {
    return plan === 'initie' ? process.env.STRIPE_PRICE_INITIE_YEAR : process.env.STRIPE_PRICE_ARKANE_YEAR;
  }
  const base = plan === 'initie'
    ? process.env.STRIPE_PRICE_INITIE
    : plan === 'arkane'
      ? process.env.STRIPE_PRICE_ARKANE
      : undefined;
  return base;
}

export const PLAN_AMOUNTS: Record<PlanId, { amount: number; currency: 'eur'; interval: 'month' | 'year'; name: string }> = {
  initie: { amount: 490, currency: 'eur', interval: 'month', name: 'Initié' },
  arkane: { amount: 790, currency: 'eur', interval: 'month', name: 'Arkane' },
};

// One-shot : recharge cosmique (2€). Bienvenue = offert (sans Stripe).
export const ONE_SHOT_AMOUNTS = { recharge: 200 }; // 2€ en centimes
export const ONE_SHOT_NAMES: Record<OneShotPlan, string> = {
  recharge: 'Recharge cosmique — 105 crédits',
  bienvenue: 'Pack de bienvenue',
};
export type OneShotPlan = 'recharge' | 'bienvenue';
