import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Middleware unique : CORS APK, porte web, anti-abus ──────────────────
// 1. CORS pour l'APK Capacitor : la WebView a pour origine `https://localhost`
//    et appelle le backend Vercel en cross-origin. Sans ces headers, le fetch
//    échoue silencieusement. L'en-tête d'authentification X-Session doit être
//    autorisé (jeton HMAC émis au login — pas de cookie, la WebView Android
//    bloque les cookies tiers cross-site).
// 2. PORTE WEB (production uniquement) : l'app n'est PAS un site. Les pages
//    ne sont servies qu'à la WebView (origine localhost) ou au navigateur de
//    test (dev/preview). Exceptions obligatoires : /privacy (exigence Google
//    Play — politique accessible publiquement) et /auth/confirm (liens des
//    e-mails d'activation/réinitialisation ouverts dans un navigateur).
// 3. RATE-LIMIT par IP sur /api/* : filet court contre les scripts (les
//    quotas par compte sont vérifiés dans les routes ; ici on plafonne le
//    débit brut par IP, avec exemptions cron/auth).
const ALLOWED_ORIGINS = new Set(['https://localhost', 'http://localhost']);
const SESSION_HEADER = 'x-session';

const IS_PROD = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';

// Pages publiques même derrière la porte web (Play Store + e-mails + Stripe).
// /dashboard/account/abonnement : URL de retour du checkout ET du portail
// billing — ouverte dans le navigateur externe (Capacitor Browser) après
// paiement ; sans exception, le retour Stripe serait bloqué (403).
const PUBLIC_PATHS = (p: string) =>
  p === '/privacy' || p.startsWith('/privacy') ||
  p === '/auth/confirm' || p.startsWith('/auth/confirm') ||
  p === '/pay-return' ||
  p.startsWith('/dashboard/account/abonnement') ||
  p.startsWith('/api/');

// Assets nécessaires au rendu de ces pages publiques.
const ASSET_PATHS = (p: string) =>
  p.startsWith('/_next/') || p.startsWith('/fonts') || p.startsWith('/fonts-google-local') ||
  p === '/favicon.ico' || p === '/manifest.webmanifest' || p.startsWith('/icons/') ||
  p.startsWith('/images/') || p.startsWith('/sounds/') || p.endsWith('.css') || p.endsWith('.js') ||
  p.endsWith('.woff2') || p.endsWith('.svg') || p.endsWith('.png') || p.endsWith('.jpg');

// Ressources destinées à des TIERS, hors application (ne jamais y mettre de
// page ni de route API) :
//   /.well-known/assetlinks.json → vérification App Links par Android. Sans
//     ce fichier, les liens https n'ouvrent PAS l'APK installée. Public par
//     conception (empreinte de certificat, aucun secret).
//   /email/* → images des emails (bandeau, icônes). Les clients mail les
//     chargent sans Origin/Referer, souvent via un proxy d'images : la porte
//     web les renvoyait en 403 et les images n'apparaissaient jamais.
const THIRD_PARTY_ASSETS = (p: string) =>
  p === '/.well-known/assetlinks.json' || p.startsWith('/email/');

// ── Rate-limit mémoire (par instance ; suffisant contre les scans/scripts) ──
// 90 req / 10 s par IP sur les routes coûteuses ; les crons et l'auth
// (qui ont leurs propres garde-fous) sont exemptés du burst bas.
const BUCKETS = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10_000;
const BURST = 90;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = BUCKETS.get(ip);
  if (!b || b.resetAt <= now) {
    BUCKETS.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    if (BUCKETS.size > 5000) { // purge Bornes : éviter la fuite mémoire
      for (const [k, v] of BUCKETS) if (v.resetAt <= now) BUCKETS.delete(k);
    }
    return false;
  }
  b.count++;
  return b.count > BURST;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith('/api/');
  const isAllowed = ALLOWED_ORIGINS.has(origin);

  // 1 — CORS APK (web same-origin : le navigateur n'envoie pas d'Origin).
  if (isApi && isAllowed) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': `Content-Type, Authorization, X-Requested-With, ${SESSION_HEADER}`,
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    return response;
  }

  // 3 — Anti-abus API : burst IP (toutes origines, y compris web sans jeton).
  if (IS_PROD && isApi) {
    const exempt = path.startsWith('/api/cron/') || path.startsWith('/api/stripe/');
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    if (!exempt && rateLimited(ip)) {
      return NextResponse.json(
        { error: 'Trop de requêtes — attendez quelques secondes.', reason: 'rate-limited' },
        { status: 429, headers: { 'Retry-After': '10' } },
      );
    }
    // Les routes /api ne passent JAMAIS la porte web (le serveur Vercel en a
    // besoin pour l'APK) ; un requesteur sans session reçoit 401 plus loin.
    return NextResponse.next();
  }

  // 2 — Porte web : en production, les pages ne sont servies qu'à la WebView
  //     ou aux URL publiques ; le navigateur du grand public reste dehors.
  //     (En dev et en preview Vercel : aucune restriction — tester l'app
  //     dans un navigateur local reste possible.)
  if (IS_PROD && !isAllowed && !PUBLIC_PATHS(path) && !ASSET_PATHS(path) && !THIRD_PARTY_ASSETS(path)) {
    return new NextResponse(
      '<!doctype html><html lang="fr"><meta charset="utf-8">' +
      '<title>Application Arkane</title>' +
      '<body style="background:#0d0a14;color:#e8dcc8;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">' +
      '<div style="max-width:420px;padding:2rem;text-align:center">' +
      '<h2 style="color:#DAA520">Arkane</h2>' +
      '<p>Cette expérience est réservée à l\u2019application Android.</p>' +
      '<p style="opacity:.7;font-size:.9rem">Installez Arkane sur votre appareil pour consulter les oracles.</p>' +
      '</div></body></html>',
      { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Pages + API, à l'exclusion des assets statiques lourds (gains CPU).
    '/((?!_next/image|favicon.ico).*)',
  ],
};
