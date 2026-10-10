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

let registered = false;

function getEmail(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return ''; }
}

// Sauvegarde le token FCM côté serveur (colonne User.fcmToken).
async function saveToken(token: string | null) {
  const email = getEmail();
  if (!email) return;
  try {
    await fetch('/api/prefs', {
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
    const r = await fetch('/api/prefs', {
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

// ── App Links (liens profonds : lettre hebdo, e-mails, partages) ────────
// Android livre l'URL d'un lien https vérifié (autoVerify + assetlinks.json,
// ou tarotdivination://) à MainActivity ; Capacitor relaie ça en événement
// 'appUrlOpen' du plugin App natif (embarqué — pas besoin du package JS).
// Routage :
//   - pages internes (/runes, /tarot, /dashboard/…) → deep link interne,
//     exactement comme un tap de notification (PushRouter consomme).
//   - /api/* (unsubscribe GET HTML), /auth/confirm (activation),
//     /dashboard/account/abonnement (retour Stripe) → navigateur SYSTÈME :
//     ces routes vivent sur le backend, la WebView statique ne doit pas les
//     charger (porte web 403 et session incohérente sinon).
const EXTERNAL_LINK_PREFIXES = ['/api/', '/auth/confirm', '/dashboard/account/abonnement', '/pay-return'];

function routeAppUrl(raw: string) {
  if (!raw) return;
  let path = '';
  try {
    if (raw.startsWith('tarotdivination:')) {
      const u = new URL(raw);
      const inner = u.searchParams.get('url');
      if (inner) path = inner.startsWith('/') ? inner : `/${inner}`;
      else path = (u.host ? `/${u.host}` : '') + u.pathname;
    } else {
      const u = new URL(raw);
      path = u.pathname + u.search;
    }
  } catch { return; }
  path = path.replace(/\/+$/, '') || '/';
  if (!path.startsWith('/')) return;
  // Deep link tarotdivination:// = TOUJOURS interne (retour de Stripe, liens
  // courts) : on ne doit jamais le renvoyer au navigateur, sinon boucle.
  const fromDeep = raw.startsWith('tarotdivination');
  if (!fromDeep && EXTERNAL_LINK_PREFIXES.some((p) => path.startsWith(p))) {
    import('@capacitor/browser')
      .then(({ Browser }) => Browser.open({ url: raw }))
      .catch(() => { try { window.open(raw, '_system'); } catch { /* pas de navigateur dispo */ } });
    return;
  }
  handleTap(path);
}

function registerAppLinkListener() {
  try {
    const cap = (window as any).Capacitor;
    const App = cap?.Plugins?.App;
    if (!App) return;
    App.addListener?.('appUrlOpen', (res: { url?: string }) => routeAppUrl(res?.url || ''))?.catch?.(() => {});
    // COLD START : l'événement peut être émis avant notre montage → le plugin
    // expose l'URL d'intent. handleTap est idempotent (pending + « déjà ici »).
    App.getLaunchUrl?.().then((r: { url?: string } | null) => { if (r?.url) routeAppUrl(r.url); }).catch(() => {});
  } catch { /* bridge non prêt — le listener push covera les taps */ }
}

// Enregistre l'app auprès de FCM et stocke le token.
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
  // App Links : le listener des liens profonds s'enregistre sur natif QUEL
  // que soit l'état de connexion (un lien de la lettre doit ouvrir l'app même
  // sans compte ; VerifiedGate prendra alors la main vers la connexion).
  if (Capacitor.isNativePlatform()) registerAppLinkListener();
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
      PushNotifications.checkPermissions().then((st) => {
        if (st.receive !== 'denied') PushNotifications.register().catch(() => {});
      }).catch(() => {});
    }).catch(() => {});
  }
}
