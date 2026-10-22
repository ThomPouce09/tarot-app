'use client';

// lib/play-billing.ts
// Pont Google Play Billing (via RevenueCat) pour l'APK.
//
// POURQUOI : sur Android/Play Store, les abonnements numériques (initie/arkane)
// DOIVENT être vendus via Google Play Billing (politique Play). Le site web
// garde Stripe (libre hors app). Ce module n'est actif que sous la WebView
// native (isNative()) ; le web reste sur le checkout Stripe existant.
//
// Flux d'un achat :
//   1. Purchases.configure({ apple|google: REVENUECAT_PUBLIC_API_KEY })
//      + logIn({ appUserID: email }) — l'appUserId = l'email complet du compte :
//      c'est la clé de rapprochement avec la table User côté serveur (le webhook
//      /api/webhooks/revenuecat résout l'utilisateur par cet email).
//   2. getProducts({ productIdentifiers: [sku] }) → objet product du store.
//   3. purchaseStoreProduct({ product }) → feuille de paie Google native.
//   4. RevenueCat vérifie le reçu auprès de Google puis NOTRE webhook écrit la
//      ligne Subscription(source='play'). La page recharge son état via
//      /api/subscription (polling déjà en place).
//   5. restorePurchases() pour le bouton « Restaurer un achat ».
//
// La gestion (annulation, reprise) se fait dans l'écran Google Play
// « Abonnements » de l'utilisateur (exigence Play) — pas via le portal Stripe.
//
// SKUs Play (à créer dans la Console Play + rattachés au dashboard RevenueCat) :
//   oracle_initie_mensuel | oracle_initie_annuel | oracle_arkane_mensuel | oracle_arkane_annuel

import { isNative } from './capacitor-utils';

// Injectée au build par la CI (NEXT_PUBLIC_ = bundle client, non secret :
// c'est la clé PUBLIC RevenueCat).
const RC_KEY = process.env.NEXT_PUBLIC_REVENUECAT_GOOGLE_PUBLIC_API_KEY || '';

export function playBillingAvailable(): boolean {
  return isNative() && !!RC_KEY;
}

// product id Play par (plan, billing) — convention partagée avec le webhook
// (planFromSku) ; ne pas changer l'un sans l'autre.
export function rcProductId(plan: 'initie' | 'arkane', billing: 'month' | 'year'): string {
  return `oracle_${plan}_${billing === 'year' ? 'annuel' : 'mensuel'}`;
}

let configured = false;
async function rc(): Promise<any | null> {
  if (!playBillingAvailable()) return null;
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    const P = (mod as any).Purchases || (mod as any).default?.Purchases;
    if (!P) return null;
    if (!configured) {
      await P.configure({
        // iOS non servi pour l'instant : 'apple' doit exister (schéma de
        // configuration) — même clé, inoffensive hors Android.
        apple: RC_KEY,
        google: RC_KEY,
      });
      configured = true;
    }
    return P;
  } catch {
    return null;
  }
}

/** Lie l'appareil à l'identité de compte (email = appUserId canonique). */
export async function rcIdentify(email: string): Promise<void> {
  const P = await rc();
  if (!P || !email) return;
  try {
    const cur = await P.getAppUserID();
    if (cur?.appUserID !== email) await P.logIn({ appUserID: email });
  } catch {
    try { await P.logIn({ appUserID: email }); } catch { /* offline */ }
  }
}

export interface RcPurchaseResult {
  ok: boolean;
  userCancelled?: boolean;
  error?: string;
}

function parseErr(e: any): RcPurchaseResult {
  const msg = String(e?.message || e || '');
  if (e?.userCancelled === true || e?.code === 1 || /cancel/i.test(msg)) {
    return { ok: false, userCancelled: true };
  }
  return { ok: false, error: msg.slice(0, 160) };
}

/** Achète l'abonnement Play (feuille de paie Google native). */
export async function rcPurchaseSubscription(
  email: string,
  plan: 'initie' | 'arkane',
  billing: 'month' | 'year'
): Promise<RcPurchaseResult> {
  const P = await rc();
  if (!P) return { ok: false, error: 'billing indisponible' };
  const pid = rcProductId(plan, billing);
  try {
    await rcIdentify(email);
    const { products } = await P.getProducts({ productIdentifiers: [pid] });
    const product = (products || []).find((x: any) => x?.identifier === pid) || (products || [])[0];
    if (!product) return { ok: false, error: 'produit Play introuvable (' + pid + ')' };
    const r = await P.purchaseStoreProduct({ product });
    return { ok: !!r?.customerInfo };
  } catch (e) {
    return parseErr(e);
  }
}

export async function rcRestorePurchases(email: string): Promise<RcPurchaseResult> {
  const P = await rc();
  if (!P) return { ok: false, error: 'billing indisponible' };
  try {
    await rcIdentify(email);
    await P.restorePurchases();
    return { ok: true };
  } catch (e) {
    return parseErr(e);
  }
}

/** One-shot Play (recharge cosmique) : in-app product non consommable. */
export async function rcPurchaseRecharge(email: string): Promise<RcPurchaseResult> {
  const P = await rc();
  if (!P) return { ok: false, error: 'billing indisponible' };
  const pid = 'oracle_recharge';
  try {
    await rcIdentify(email);
    const { products } = await P.getProducts({ productIdentifiers: [pid] });
    const product = (products || []).find((x: any) => x?.identifier === pid) || (products || [])[0];
    if (!product) return { ok: false, error: 'produit Play introuvable (' + pid + ')' };
    const r = await P.purchaseStoreProduct({ product });
    return { ok: !!r?.customerInfo };
  } catch (e) {
    return parseErr(e);
  }
}
