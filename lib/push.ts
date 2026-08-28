'use client';

// ── Notifications push (Capacitor / FCM) — version APK ────────────────
// Gère la demande de permission + l'enregistrement du token FCM.
// ⚠️ En APK (WebView), on utilise le wrapper `api()` (lib/api-client), PAS
// un `fetch('/api/...')` relatif qui casserait contre l'origine https://localhost.
// S'exécute uniquement en natif (Capacitor) ; sur web, no-op silencieux.

import { Capacitor } from '@capacitor/core';
import { api } from '@/lib/api-client';

let registered = false;

function getEmail(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return ''; }
}

// Sauvegarde le token FCM côté backend (champ User.fcmToken, via /api/prefs).
async function saveToken(token: string | null) {
  const email = getEmail();
  if (!email) return;
  try {
    await api('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fcmToken: token }),
    });
  } catch { /* réseau — on retentera à la prochaine demande */ }
}

// Enregistre l'app auprès de FCM et stocke le token.
async function register(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.addListener('registration', (t) => saveToken(t.value));
    await PushNotifications.addListener('registrationError', () => {});
    await PushNotifications.register();
    return true;
  } catch (e) {
    console.warn('[push] enregistrement FCM impossible (projet Firebase non configuré ?)', e);
    return false;
  }
}

// Demande la permission puis enregistre le token. Appelé depuis /preferences
// quand l'utilisateur active le rappel quotidien.
async function requestPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const status = await PushNotifications.requestPermissions();
    if (status.receive === 'denied') return false;
    return await register();
  } catch {
    return false;
  }
}

// Enlève le token (appelé au reset / désactivation).
async function clearPermission() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
  } catch {}
  await saveToken(null);
}

// Installer les hooks globaux + auto-register au démarrage (si app déjà autorisée).
export function initPush() {
  if (registered) return;
  registered = true;
  if (typeof window === 'undefined') return;
  (window as any).__requestPushPermission = requestPermission;
  (window as any).__clearPushPermission = clearPermission;
  // Ré-enregistre automatiquement si on a déjà un compte et une app native.
  if (Capacitor.isNativePlatform() && getEmail()) {
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('registration', (t) => saveToken(t.value));
      PushNotifications.checkPermissions().then((st) => {
        if (st.receive !== 'denied') PushNotifications.register().catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  }
}
