// lib/plans.ts
// Source unique de vérité des forfaits — safe côté client (aucun import Stripe).
// Partagé par la page d'abonnement (affichage) et lib/stripe.ts (montants).

export type PlanId = 'gratuit' | 'initie' | 'oracle';

// Montants canoniques en euros. Le serveur les convertit en centimes.
export const PLAN_PRICE_EUR: Record<Exclude<PlanId, 'gratuit'>, number> = {
  initie: 4.9,
  oracle: 9.9,
};

export const PLAN_NAME_KEY: Record<PlanId, string> = {
  gratuit: 'sub.freeName',
  initie: 'sub.initieName',
  oracle: 'sub.oracleName',
};

export const PLAN_FEATURES_KEY: Record<PlanId, string> = {
  gratuit: 'sub.freeFeatures',
  initie: 'sub.initieFeatures',
  oracle: 'sub.oracleFeatures',
};

export const PLAN_ICON: Record<PlanId, string> = {
  gratuit: '🌙',
  initie: '✦',
  oracle: '🔮',
};
