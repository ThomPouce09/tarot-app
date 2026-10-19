import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyGoogleIdToken, GoogleTokenError } from '@/lib/google';
import { HANDOFF_TTL_MS } from '@/lib/handoff';

export const dynamic = 'force-dynamic';

// Page HTML minimale du callback (navigateur système, hors WebView) :
// aucune donnée d'app rendue — juste le renvoi vers l'APK via le deep link.
function shell(title: string, body: string, deep?: string, closeTab?: boolean): NextResponse {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — L'Oracle des Étoiles</title>
${deep ? `<script>setTimeout(function(){window.location.assign(${JSON.stringify(deep)});${closeTab ? "if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser){window.Capacitor.Plugins.Browser.close().catch(function(){});}else{window.close();}" : ""}},250);</script>` : ''}
<style>body{background:#0d1b2a;color:#e8d5a3;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}a{color:#e8d5a3}div{text-align:center;max-width:26em;padding:1.5rem}</style>
</head><body><div>${body}</div></body></html>`;
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ── Callback Google du passage NATIF (code OAuth -> email -> handoff) ────
// GET /api/auth/google/callback?code=…&state=…
// 1) échange le code contre l'ID token (PKCE : verifier stocké au handoff)
// 2) vérifie + résout l'identité (création/connexion du compte)
// 3) marque le handoff : l'APK viendra chercher sa session avec son ticket
// 4) renvoie le navigateur vers l'app (deep link tarotdivination://)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const state = String(sp.get('state') || '');
  const code = String(sp.get('code') || '');

  if (!/^[0-9a-f]{40}$/.test(state) || !code) {
    return shell('Connexion', '<p>Lien de connexion invalide ou expiré.</p>');
  }

  try {
    const handoff = await prisma.authHandoff.findUnique({ where: { id: state } });
    if (!handoff || handoff.email || handoff.claimed
        || Date.now() - handoff.createdAt.getTime() > HANDOFF_TTL_MS) {
      return shell('Connexion', '<p>Passage expiré. Relance la connexion Google depuis l’application.</p>');
    }

    // ── Échange code -> tokens (client web + secret, PKCE) ──
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      console.error('[google/callback] GOOGLE_CLIENT_ID/SECRET manquants');
      return shell('Connexion', '<p>Configuration incomplète. Réessaie plus tard.</p>');
    }
    let tokens: any;
    try {
      const r = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${request.nextUrl.origin}/api/auth/google/callback`,
          grant_type: 'authorization_code',
          code_verifier: handoff.verifier,
        }),
      });
      tokens = await r.json();
      if (!r.ok || !tokens.id_token) throw new Error('token exchange: ' + JSON.stringify(tokens).slice(0, 160));
    } catch (err: any) {
      console.error('[google/callback] exchange error:', err?.message);
      return shell('Connexion', '<p>La confirmation Google a échoué. Relance depuis l’application.</p>');
    }

    // ── Vérification + compte ──
    let g;
    try {
      g = await verifyGoogleIdToken(String(tokens.id_token));
    } catch (err) {
      if (err instanceof GoogleTokenError) {
        return shell('Connexion', '<p>Jeton Google invalide. Relance depuis l’application.</p>');
      }
      throw err;
    }
    const { resolveGoogleAccount } = await import('@/lib/google-account');
    const result = await resolveGoogleAccount(g, handoff.deviceTokenHash);
    if (result.kind === 'deleted') {
      return shell('Connexion', '<p>Ce compte est temporairement indisponible (suppression récente).</p>');
    }

    // ── Dépôt de l'email + renvoi vers l'app ──
    await prisma.authHandoff.update({ where: { id: state }, data: { email: g.email } });
    // Retour 100 % automatique : le deep-link en schéma custom (tarotdivination:)
    // exige une gestuelle utilisateur — Chrome le bloque en redirection JS.
    // Sur notre domaine, le lien https est un APP LINK vérifié (autoVerify +
    // assetlinks.json) : le navigateur l'ouvre directement dans l'app, et le
    // JS ci-dessous ferme l'onglet (Custom Tab) pour ne pas le laisser derrière.
    const done = `${request.nextUrl.origin}/auth/google/done?state=${encodeURIComponent(state)}`;
    return shell(
      'Connexion Google',
      '<p>Compte confirmé.<br/>Retour vers l’application…</p>'
      + `<p><a href="${done}">Ouvrir L’Oracle des Étoiles</a></p>`,
      done,
      true,
    );
  } catch (error: any) {
    console.error('[google/callback] error:', error);
    return shell('Connexion', '<p>Erreur serveur. Réessaie plus tard.</p>', undefined);
  }
}
