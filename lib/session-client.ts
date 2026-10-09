'use client';

// ── Session côté client (jeton X-Session, jamais de cookie en APK) ──────
// Le jeton est reçu au login/confirm (champ `session`), stocké en localStorage
// (comme tarot_user), et attaché par l'helper api() à chaque requête.
// Un 401 { reason: 'session' } sur une route IA émet 'arkane-signout' : les
// écouteurs existants (VerifiedGate etc.) ramènent vers la connexion.

export const TOKEN_KEY = 'arkane_session_token';

export function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function setSessionToken(t: string | null | undefined) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, String(t));
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* stockage privé */ }
}

export function clearSessionToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

/** En-tête d'authentification à merger dans tout fetch /api/*. */
export function sessionHeaders(extra?: Record<string, string>): Record<string, string> {
  const t = getSessionToken();
  const base: Record<string, string> = { ...(extra || {}) };
  if (t) base['X-Session'] = t;
  return base;
}

/** Identifiant de flux : un même tirage (2-3 appels IA) = UNE consommation. */
export function newFlowId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch { /* fallback */ }
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * fetch /api/* avec session. Signatures : mêmes que fetch(); si la réponse est
 * 401 { reason: 'session' } → purge du jeton + événement arkane-signout.
 * Utiliser cet helper À LA PLACE de fetch pour toute route protée (IA, quota).
 */
export async function sessionFetch(input: string, init?: RequestInit & { headers?: Record<string, string> }): Promise<Response> {
  const headers = sessionHeaders(init?.headers as Record<string, string> | undefined);
  const res = await fetch(input, { ...init, headers, credentials: 'include' });
  if (res.status === 401) {
    try {
      const clone = res.clone();
      const data = await clone.json();
      if (data && data.reason === 'session') {
        clearSessionToken();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('arkane-signout'));
      }
    } catch { /* pas JSON : ignoré */ }
  }
  return res;
}
