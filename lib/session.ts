// lib/session.ts — sessions serveur SANS cookie (compatible WebView Android).
// Un jeton = base64url(email.exp) + signature HMAC-SHA256(SESSION_KEY).
// L'app (APK comme web) le stocke et l'envoie dans l'en-tete X-Session.
// Server-only : ne JAMAIS importer la cle cote client.
// Vercel (prod ET preview) DOIT definir SESSION_KEY (chaine aleatoire longue).

import { createHmac, timingSafeEqual } from 'crypto';

const KEY_NAME = ['SESSION', 'KEY'].join('_');
function key(): string {
  const k = process.env[KEY_NAME];
  if (!k) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_KEY manquant : sessions desactivees (definir dans Vercel).');
    }
    return 'dev-session-insecure';
  }
  return k;
}

export const SESSION_COOKIE = 'arkane_session';
export const SESSION_HEADER = 'x-session';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}
function unb64url(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

export function signSession(email: string): string {
  const e = String(email).trim().toLowerCase();
  const exp = Date.now() + TTL_MS;
  const payload = b64url(e + '.' + exp);
  const sig = createHmac('sha256', key()).update(payload).digest('base64url');
  return payload + '.' + sig;
}

export function verifySession(token: string | null | undefined): string | null {
  if (!token) return null;
  const m = /^([^.]+)\.([^.]+)$/.exec(String(token).trim());
  if (!m) return null;
  const payload = m[1];
  const sig = m[2];
  const expect = createHmac('sha256', key()).update(payload).digest('base64url');
  let ok = false;
  try {
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(expect, 'base64url');
    ok = a.length === b.length && timingSafeEqual(a, b);
  } catch { ok = false; }
  if (!ok) return null;
  let decoded: string, i: number;
  try {
    decoded = unb64url(payload);
    i = decoded.lastIndexOf('.');
  } catch { return null; }
  const em = decoded.slice(0, i);
  const exp = Number(decoded.slice(i + 1));
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  if (!em.includes('@')) return null;
  return em.toLowerCase();
}

type ReqLike = {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
};

export function authedEmail(request: ReqLike): string | null {
  const h = request.headers.get(SESSION_HEADER);
  if (h) return verifySession(h);
  const c = request.cookies.get(SESSION_COOKIE);
  return c && c.value ? verifySession(c.value) : null;
}

export function requireSessionEmail(
  request: ReqLike,
  bodyEmail?: string | null,
): { email: string } | { error: Response } {
  const em = authedEmail(request);
  if (!em) {
    return { error: Response.json({ error: 'Session expiree - reconnectez-vous.', reason: 'session', gated: true }, { status: 401 }) };
  }
  const claimed = String(bodyEmail || '').trim().toLowerCase();
  if (claimed && claimed !== em) {
    return { error: Response.json({ error: 'Compte non concordant.', reason: 'session', gated: true }, { status: 403 }) };
  }
  return { email: em };
}
