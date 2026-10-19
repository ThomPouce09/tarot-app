// app/api/guest-mode/route.ts — Bascule du mode Invité (prêt de tirage).
// GET  ?email= → { guestMode } (état courant ; session obligatoire)
// POST { email, on } → { guestMode } après bascule.
//
// La source de vérité est la BASE (User.guestMode) : le client ne peut pas
// falsifier l'anonymat (les gardes IA/historique/augure relisent ce flag
// serveur à chaque appel — lib/guest.ts).

import { NextRequest, NextResponse } from 'next/server';
import { requireSessionEmail } from '@/lib/session';
import { isGuestMode, setGuestMode } from '@/lib/guest';
import { getRights } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sess = requireSessionEmail(request, request.nextUrl.searchParams.get('email'));
  if ('error' in sess) return sess.error;
  const rights = await getRights(sess.email);
  return NextResponse.json({ guestMode: await isGuestMode(sess.email), canGuest: !!rights && rights.level !== 'apprenti' });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const sess = requireSessionEmail(request, typeof body.email === 'string' ? body.email : null);
  if ('error' in sess) return sess.error;
  // Mode Invité réservé aux abonnés Initié/Arkane réellement actifs.
  if (body.on) {
    const rights = await getRights(sess.email);
    if (!rights || rights.level === 'apprenti') {
      return NextResponse.json({ error: 'Mode Invité réservé aux abonnés.', code: 'subscriber-only' }, { status: 403 });
    }
  }
  try {
    const on = await setGuestMode(sess.email, !!body.on);
    return NextResponse.json({ guestMode: on });
  } catch {
    return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
  }
}
