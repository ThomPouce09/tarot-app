// lib/checkout-open.ts — Ouverture du checkout Stripe SANS éjecter de l'app.
//
// Sur Android natif (WebView Capacitor), `window.location.href = url` ferme la
// WebView et ouvre le navigateur système → l'utilisateur sort de l'app pendant
// le paiement et le retour Stripe le ramène sur le site web (jamais dans l'app).
//
// On utilise @capacitor/browser pour ouvrir Stripe Checkout dans un Custom Tab
// (Android) PAR-DESSUS l'app. L'app reste vivante en arrière-plan et l'état est
// rechargé au retour (voir appStateChange dans la page abonnement).

import { isNative } from './capacitor-utils';

export async function openCheckout(url: string): Promise<void> {
  if (!url) return;
  // Mode natif (APK) → Custom Tab in-app, on reste dans l'app.
  if (isNative()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch {
      // le plugin a échoué (ex: non synchronisé) → fallback navigateur
    }
  }
  // Web / fallback → navigation classique.
  window.location.href = url;
}
