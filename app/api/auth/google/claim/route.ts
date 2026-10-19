import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE } from '@/lib/session';
import { resolveLang, authMsg } from '@/lib/lang';
import { HANDOFF_TTL_MS } from '@/lib/handoff';
import { ticketMatches } from '@/lib/handoff';
import { publicUser } from '@/lib/google-account';

export const dynamic = 'force-dynamic';

// ── Retrait de session par l'APK (fin du passage navigateur) ─────────────
// POST { state, ticket } — le ticket est le secret d'appareil fourni au /start
// (jamais stocké en clair : seul son HMAC est en base). Vérifications :
// handoff existant, email déposé, TTL 15 min, ticket correspondant, usage
// unique (la ligne est détruite au retrait).
// Renvoie exactement le même payload que /api/auth/google (web) : mêmes
// contrats de session côté client (tarot_user + arkane_session_token + cookie).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const lang = resolveLang(body.lang);
    const state = String(body.state || '');
    const ticket = String(body.ticket || '');
    if (!/^[0-9a-f]{40}$/.test(state) || !/^[0-9a-f]{40}$/.test(ticket)) {
      return NextResponse.json({ error: authMsg('googleFailed', lang), code: 'HANDOFF_BAD' }, { status: 400 });
    }

    const handoff = await prisma.authHandoff.findUnique({ where: { id: state } });
    if (!handoff || !handoff.email || handoff.claimed
        || Date.now() - handoff.createdAt.getTime() > HANDOFF_TTL_MS
        || !ticketMatches(handoff.ticketHash, ticket)) {
      // silencieux : on ne dit pas pourquoi (anti-énumération)
      return NextResponse.json({ error: authMsg('googleFailed', lang), code: 'HANDOFF_INVALID' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: handoff.email } });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: authMsg('googleFailed', lang), code: 'HANDOFF_INVALID' }, { status: 401 });
    }

    // Usage unique : destruction immédiate du passage.
    await prisma.authHandoff.delete({ where: { id: state } }).catch(() => { /* déjà purgé ? */ });

    const resp = NextResponse.json({
      success: true,
      session: signSession(user.email),
      user: publicUser(user),
    });
    resp.cookies.set(SESSION_COOKIE, signSession(user.email), {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 30 * 24 * 3600,
    });
    return resp;
  } catch (error: any) {
    console.error('[google/claim] error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
