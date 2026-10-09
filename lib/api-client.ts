/**
 * API client for Capacitor APK
 *
 * In the APK (static export), /api/* routes don't exist locally.
 * All API calls must be proxied to the remote backend.
 *
 * Usage: import { api } from '@/lib/api-client'
 *        api('/api/readings')  // automatically prefixes base URL
 *
 * Session : chaque requête porte l'en-tête X-Session (jeton émis au login,
 * stocké en localStorage) — la WebView Android bloque les cookies tiers,
 * seul cet en-tête authentifie l'APK auprès des routes IA/quota.
 * Une réponse 401 { reason: 'session' } purge le jeton et émet
 * 'arkane-signout' : VerifiedGate renvoie l'utilisateur vers la connexion.
 */

import { getApiBaseUrl } from './capacitor-utils';
import { getSessionToken, TOKEN_KEY } from './session-client';

function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const fullUrl = base ? `${base.replace(/\/+$/, '')}${url}` : url;
  const headers = new Headers(options?.headers);
  const token = getSessionToken();
  if (token) headers.set('X-Session', token);
  return fetch(fullUrl, {
    ...options,
    headers,
    // Forward credentials (cookies) when same-origin
    credentials: base ? 'include' : 'same-origin',
  }).then(async (res) => {
    if (res.status === 401) {
      try {
        const data = await res.clone().json();
        if (data && data.reason === 'session') {
          try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('arkane-signout'));
        }
      } catch { /* pas JSON : ignoré */ }
    }
    return res;
  });
}

export { apiFetch as api };
