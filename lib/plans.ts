// lib/plans.ts
// Source unique de vérité des forfaits — safe côté client (aucun import Stripe).
// Niveaux : bienvenue (one-shot offert) | apprenti (défaut gratuit) |
// recharge (one-shot payant) | initie (abonnement) | arkane (abonnement + skins).

export type PlanId = 'bienvenue' | 'apprenti' | 'recharge' | 'initie' | 'arkane';

// Forfaits récurrents (Stripe) — mensuel & annuel. one-shot = bienvenue / recharge.
export type SubscriptionPlanId = 'initie' | 'arkane';

export const SUBSCRIPTION_PLANS: SubscriptionPlanId[] = ['initie', 'arkane'];

// Montants canoniques en euros. Le serveur les convertit en centimes.
export const PLAN_PRICE_EUR: Record<SubscriptionPlanId, number> = {
  initie: 4.9,
  arkane: 7.9,
};

// Montants ANNUELLS (2 mois offerts : 4.9*10=49 → 50 ; 7.9*10=79 → 75).
export const PLAN_PRICE_YEAR_EUR: Record<SubscriptionPlanId, number> = {
  initie: 50,
  arkane: 75,
};

// Promotions one-shot.
export const ONE_SHOT: { rechargePriceEur: number } = { rechargePriceEur: 2 };

// Recharge cosmique : pool de crédits exact (2€ = 105 crédits : base = 7, avancé = 15).
// 15x7 = 105 = 7x15 → on pioche au ratio jusqu'à épuisement (mixable). Client-safe.
export const RECHARGE_CREDITS = 105;
export const CREDITS_BASE = 7;
export const CREDITS_GRAND = 15;

export const PLAN_NAME_KEY: Record<PlanId, string> = {
  bienvenue: 'sub.bienvenueName',
  apprenti: 'sub.apprentiName',
  recharge: 'sub.rechargeName',
  initie: 'sub.initieName',
  arkane: 'sub.arkaneName',
};

export const PLAN_FEATURES_KEY: Record<PlanId, string> = {
  bienvenue: 'sub.bienvenueFeatures',
  apprenti: 'sub.apprentiFeatures',
  recharge: 'sub.rechargeFeatures',
  initie: 'sub.initieFeatures',
  arkane: 'sub.arkaneFeatures',
};

export const PLAN_ICON: Record<PlanId, string> = {
  bienvenue: '🎁',
  apprenti: '🌙',
  recharge: '✨',
  initie: '✦',
  arkane: '🔮',
};

// Renvoie le niveau d'abonnement récurrent d'un utilisateur.
// 'apprenti' = défaut (gratuit) ; les one-shot (bienvenue/recharge) s'ajoutent
// aux droits mais ne changent pas le "niveau" affiché.
export type ActiveLevel = PlanId;

// Capacités par niveau récurrent (hors one-shot, gérés dans entitlements).
export const PLAN_CAPACITY: Record<SubscriptionPlanId | 'apprenti', { baseUnlimited: boolean; grandMonthly: number | null }> = {
  apprenti: { baseUnlimited: false, grandMonthly: 0 },
  initie: { baseUnlimited: true, grandMonthly: 10 },
  arkane: { baseUnlimited: true, grandMonthly: null }, // null = illimité
};

// Skins réservés à Arkane (accès visuel). Côté client pour la galerie de skins.
export const ARKANE_SKINS: string[] = ['arkane-ember', 'arkane-void', 'arkane-aurora'];
export const ARKANE_SKIN_NAME_KEY: Record<string, string> = {
  'arkane-ember': 'sub.skin.ember',
  'arkane-void': 'sub.skin.void',
  'arkane-aurora': 'sub.skin.aurora',
};
