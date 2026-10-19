// lib/handoff.ts — Jeton d'appareil pour le flux Google NATIF (APK -> navigateur).
// L'APK crée un handoff (state), le navigateur système fait l'OAuth (code+PKCE),
// le callback y dépose l'email, l'app vient chercher sa session avec le ticket.
// Server-only.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

const KEY_NAME = ['SESSION', 'KEY'].join('_');
function key(): string {
  const k = process.env[KEY_NAME];
  if (!k) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_KEY manquant.');
    return 'dev-session-insecure';
  }
  return k;
}

export const HANDOFF_TTL_MS = 15 * 60_000; // 15 minutes, usage unique

export function newState(): string { return randomBytes(20).toString('hex'); }
export function newTicket(): string { return randomBytes(20).toString('hex'); }
export function newVerifier(): string { return randomBytes(32).toString('base64url'); }
export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}
// Le ticket n'est JAMAIS stocké en clair : seul son HMAC (clé SESSION_KEY).
export function hmacTicket(ticket: string): string {
  return createHmac('sha256', key()).update(ticket).digest('hex');
}
export function ticketMatches(storedHash: string, ticket: string): boolean {
  try {
    const a = Buffer.from(storedHash || '', 'hex');
    const b = Buffer.from(hmacTicket(ticket), 'hex');
    return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
  } catch { return false; }
}
