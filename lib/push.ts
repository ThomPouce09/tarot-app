'use client';

// ── Notifications push (Capacitor / FCM) ────────────────────────────────
// Gère la demande de permission + l'enregistrement du token FCM dans /api/prefs.
// S'exécute UNIQUEMENT en natif (APK Capacitor) ; sur web, no-op silencieux.
// Depuis 2026-10 : capture aussi le fuseau horaire de l'appareil (IANA) —
// indispensable pour déclencher le rappel à ~18h30 LOCAUX par user (cron Hobby),
// et route le tap sur une notification vers la page promise (deep link).
// Expose sur window :
//   __requestPushPermission() -> demande permission + enregistre le token
//   __clearPushPermission()   -> retire le token (déconnexion / reset)

import { Capacitor } from '@capacitor/core';
import { api } from '@/lib/api-client';

let registered = false;
// Canal local créé une seule fois pour le repli « app au premier plan ».
let foregroundReady = false;


function getEmail(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return ''; }
}

// Sauvegarde le token FCM côté serveur (colonne User.fcmToken).
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

// ── Fuseau horaire local (pour le déclenchement heure locale du rappel) ──
async function syncTimezone() {
  const email = getEmail();
  if (!email) return;
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* vieux WebView */ }
  if (!tz) return;
  // Évite un POST à chaque lancement : on ne renvoie que si ça a changé.
  try {
    if (localStorage.getItem('tarot_tz_synced') === `${email}|${tz}`) return;
  } catch {}
  try {
    const r = await api('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, timezone: tz }),
    });
    if (r.ok) localStorage.setItem('tarot_tz_synced', `${email}|${tz}`);
  } catch { /* réseau — retentera au prochain lancement */ }
}

// Tap sur une notification : route vers la page promise (data.url).
// Stockée dans localStorage pour le cas COLD START (l'app se lance, le
// listener est posé trop tard pour l'événement natif) — <PushRouter> la
// consomme au montage. Ensuite on navigue en direct pour un warm start.
function handleTap(url: string | undefined) {
  if (!url || !url.startsWith('/')) return;
  try { localStorage.setItem('tarot_pending_route', url); } catch {}
  window.dispatchEvent(new CustomEvent('push-navigate', { detail: url }));
}

// Enregistre l'app auprès de FCM et stocke le token.
// Repli premier plan : sur Android, un push reçu pendant que l'app est OUVERTE
// n'affiche aucune notification système (comportement FCM natif). On la rejoue
// en notification locale pour que le rappel soit visible dans tous les cas.
async function enableForegroundFallback() {
  if (foregroundReady || !Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.createChannel({
      id: 'oracle-reminders',
      name: 'Rappels Oracle des Étoiles',
      description: 'Rappels quotidiens et messages de l’Oracle',
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => { /* canal déjà présent → OK */ });
    foregroundReady = true;
    await PushNotifications.addListener('pushNotificationReceived', (n: any) => {
      const id = Math.floor(Math.random() * 0x7fffffff);
      LocalNotifications.schedule({
        notifications: [
          {
            id,
            channelId: 'oracle-reminders',
            title: n?.title || 'L\'Oracle des \u00c9toiles',
            body: n?.body || '',
            extra: n?.data || {},
          },
        ],
      }).catch(() => {});
    });
  } catch (e) {
    console.warn('[push] repli premier plan indisponible', e);
  }
}

async function register(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.addListener('registration', (t) => saveToken(t.value));
    await PushNotifications.addListener('registrationError', () => {});
    // Tap : ouvre la destination de la notif (deep link SPA via <PushRouter>).
    await PushNotifications.addListener('pushNotificationActionPerformed', (n: any) => {
      handleTap(n?.data?.url || n?.notification?.data?.url);
      PushNotifications.removeAllDeliveredNotifications().catch(() => {});
    });
    await enableForegroundFallback();
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
  if (registered || typeof window === 'undefined') return;
  registered = true;
  (window as any).__requestPushPermission = requestPermission;
  (window as any).__clearPushPermission = clearPermission;
  // Fuseau local synchronisé dès qu'un compte est connecté (web comme natif —
  // utile si l'utilisateur revient sur l'APK après un passage web).
  if (getEmail()) syncTimezone();
  // Couvre les connexions SURVENUES après ce montage (le modal de login pose
  // 'tarot_user' sans re-charger la page) : un wrapper unique sur setItem
  // capte tous les points d'entrée login/signup/confirm sans les modifier.
  try {
    const ls = window.localStorage;
    const orig = ls.setItem.bind(ls);
    if (!(ls as any).__tzHook) {
      (ls as any).__tzHook = true;
      (ls as any).setItem = (k: string, v: string) => {
        orig(k, v);
        if (k === 'tarot_user') syncTimezone();
      };
    }
  } catch {}
  // Ré-enregistre automatiquement si on a déjà un compte et une app native.
  if (Capacitor.isNativePlatform() && getEmail()) {
    // Re-réussit simplement à récupérer le token existant si permission déjà donnée.
    import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('registration', (t) => saveToken(t.value));
      PushNotifications.addListener('pushNotificationActionPerformed', (n: any) => {
        handleTap(n?.data?.url || n?.notification?.data?.url);
        PushNotifications.removeAllDeliveredNotifications().catch(() => {});
      });
      enableForegroundFallback();
      PushNotifications.checkPermissions().then((st) => {
        if (st.receive !== 'denied') PushNotifications.register().catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  }
}
