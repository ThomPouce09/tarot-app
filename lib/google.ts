// lib/google.ts — Vérification serveur des jetons d'identité Google (OAuth).
// Le client (bouton GSI, web OU natif) obtient un ID token signé par Google ;
// on le vérifie ICI (signature + aud = nos client_id + email vérifié) et on ne
// stocke JAMAIS l'access/refresh token. Secret Google côté serveur uniquement.
//
// Env requis :
//   GOOGLE_CLIENT_ID   — client_id WEB du projet (Console → Identifiants).
//   GOOGLE_CLIENT_IDS  — (optionnel, plus tard) client_id Android natif,
//                        séparés par virgule, pour accepter le bouton natif.

import { OAuth2Client } from 'google-auth-library';

const oauth = new OAuth2Client();

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  picture: string;
  sub: string;
}

export class GoogleTokenError extends Error {}

function allowedAudiences(): string[] {
  const one = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const extra = (process.env.GOOGLE_CLIENT_IDS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return [...new Set([one, ...extra].filter(Boolean))];
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const auds = allowedAudiences();
  if (!auds.length) {
    throw new GoogleTokenError('GOOGLE_CLIENT_ID non configuré côté serveur.');
  }
  let payload: {
    aud?: string; email?: string; email_verified?: boolean;
    given_name?: string; family_name?: string; picture?: string; sub?: string;
  };
  try {
    const ticket = await oauth.verifyIdToken({ idToken, audience: auds });
    payload = ticket.getPayload() as typeof payload;
  } catch (err: any) {
    // google-auth-library vérifie la signature (clés publiques Google) ET
    // l'audience ; tout ce qui échoue ici est un jeton invalide/expiré.
    throw new GoogleTokenError('Jeton Google invalide ou expiré.');
  }
  if (!payload || !payload.email) throw new GoogleTokenError('Email absent du jeton Google.');
  if (payload.email_verified !== true) throw new GoogleTokenError('Email Google non vérifié.');
  return {
    email: String(payload.email).trim().toLowerCase(),
    emailVerified: true,
    firstName: String(payload.given_name || '').trim(),
    lastName: String(payload.family_name || '').trim(),
    picture: String(payload.picture || ''),
    sub: String(payload.sub || ''),
  };
}

// Prénom/nom de repli depuis l'email si Google n'a pas fourni les champs
// (compte Workspace sans nom public) — prefix + initiales propres.
export function googleNames(g: GoogleIdentity): { firstName: string | null; lastName: string | null } {
  const prefix = g.email.split('@')[0] || '';
  const fallbackFirst = g.firstName || (prefix ? prefix[0].toUpperCase() + prefix.slice(1) : '');
  return {
    firstName: fallbackFirst || null,
    lastName: g.lastName || null,
  };
}
