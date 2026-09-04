/**
 * API client for Capacitor APK
 * 
 * In the APK (static export), /api/* routes don't exist locally.
 * All API calls must be proxied to the remote backend.
 * 
 * Usage: import { api } from '@/lib/api-client'
 *        api('/api/readings')  // automatically prefixes base URL
 */

import { getApiBaseUrl } from './capacitor-utils';

function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const base = getApiBaseUrl();
  const fullUrl = base ? `${base.replace(/\/+$/, '')}${url}` : url;
  return fetch(fullUrl, {
    ...options,
    // Forward credentials (cookies) when same-origin
    credentials: base ? 'include' : 'same-origin',
  });
}

export { apiFetch as api };
