import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashDeviceToken } from '@/lib/device';
import { resolveLang } from '@/lib/lang';
import { newState, newTicket, newVerifier, pkceChallenge, hmacTicket, HANDOFF_TTL_MS } from '@/lib/handoff';

export const dynamic = 'force-dynamic';

// ── Début d'un passage navigateur (APK -> Google) ───────────────────────
// POST { deviceToken?, lang? } depuis l'APK. Crée le handoff (state, PKCE)
// et renvoie l'URL Google complète que la WebView ouvre dans le navigateur
// système. Le ticket (secret d'appareil) n'est JAMAIS stocké : l'APK le garde
// en mémoire et le représentera au /claim.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const lang = resolveLang(body.lang);

    // Purge opportuniste des passages périmés (> 1 h) — pas de cron dédié.
    await prisma.authHandoff.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 3600_000) } },
    }).catch(() => { /* non bloquant */ });

    const state = newState();
    const ticket = newTicket();
    const verifier = newVerifier();

    await prisma.authHandoff.create({
      data: {
        id: state,
        ticketHash: hmacTicket(ticket),
        verifier,
        deviceTokenHash: hashDeviceToken(String(body.deviceToken || '')) || null,
        lang,
      },
    });

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      return NextResponse.json({ error: 'Configuration Google incomplète.' }, { status: 500 });
    }
    // Origine de la requête : identique au callback (qui recalcule la même
    // chose depuis sa propre URL). Dev tunnel / localhost / prod → toujours cohérent
    // avec l'URI enregistrée dans la Console Google.
    const origin = request.nextUrl.origin;
    const redirect = `${origin}/api/auth/google/callback`;
    const url = 'https://accounts.google.com/o/oauth2/v2/auth'
      + '?client_id=' + encodeURIComponent(clientId)
      + '&redirect_uri=' + encodeURIComponent(redirect)
      + '&response_type=code'
      + '&scope=' + encodeURIComponent('openid email profile')
      + '&state=' + encodeURIComponent(state)
      + '&code_challenge=' + encodeURIComponent(pkceChallenge(verifier))
      + '&code_challenge_method=S256'
      + '&prompt=' + encodeURIComponent('select_account');

    return NextResponse.json({ url, state, ticket, expiresAt: Date.now() + HANDOFF_TTL_MS });
  } catch (error: any) {
    console.error('[google/start] error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
