// lib/device.ts — Anti-abus multi-comptes, étage 1 (friction, pas identification).
// Le client (web : localStorage, APK : Capacitor Preferences) génère un UUID
// aléatoire unique par installation et l'envoie à l'inscription. Le serveur
// n'en stocke JAMAIS le jeton en clair ni l'IP : uniquement un HMAC-SHA256
// (clé serveur SESSION_KEY) → pseudonyme irréversible, proportionné RGPD.
// Usage : compter les comptes créés depuis la même installation ; au-delà du
// seuil, le nouveau compte démarre sans pack de bienvenue.

import { createHmac } from 'crypto';

function secret(): string {
  // SESSION_KEY existe déjà pour le signing de session ; on la réutilise comme
  // clé de domaine. Repli dev si absente (pas de hachage instable en prod).
  return process.env.SESSION_KEY || 'dev-only-device-secret';
}

/** HMAC du jeton d'appareil ; null si jeton absent/trop court (client sans JS
 *  ou vieille version de l'APK — on ne punit pas, on ignore simplement). */
export function hashDeviceToken(token: string | undefined | null): string | null {
  const t = (token || '').trim();
  if (t.length < 16) return null; // UUID minimum — rejet silencieux du bruit
  return createHmac('sha256', secret()).update(t).digest('hex');
}
