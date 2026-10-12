// app/api/profile-prompt/route.ts — Le renard du Profil (irruption landing).
// GET  : la décision d'irruption, lecture SEULE (show + contenu du message).
// POST { email, action } : 'seen' (popup affiché) = l'horloge de 3 jours repart ;
// 'refused' (« Pas maintenant » / clic dehors) = horloge + compteur de refus
// (2ᵉ refus = silence définitif). Logique dans lib/profile.markProfilePrompt.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { markProfilePrompt, decideProfilePrompt, foxPayload } from '@/lib/profile';

export const dynamic = 'force-dynamic';

// GET : le renard doit-il faire son irruption sur la landing ? (lecture seule —
// rien n'est consommé ici ; le popup affiché postera lui-même « seen »).
export async function GET(request: NextRequest) {
  const email = (
    verifySession(request.headers.get('x-session')) ||
    request.nextUrl.searchParams.get('email') || ''
  ).trim().toLowerCase();
  const langRaw = request.nextUrl.searchParams.get('lang');
  const lang = (langRaw === 'en' || langRaw === 'es' || langRaw === 'hi' ? langRaw : 'fr') as 'fr' | 'en' | 'es' | 'hi';
  if (!email) return NextResponse.json({ show: false });
  const decision = await decideProfilePrompt(email);
  if (decision !== 'show') return NextResponse.json({ show: false, decision });
  return NextResponse.json({ show: true, decision, ...foxPayload(lang) });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = (
    verifySession(request.headers.get('x-session')) ||
    (typeof body.email === 'string' ? body.email : '')
  ).trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });

  const action = String(body.action || '');
  if (action === 'seen') { await markProfilePrompt(email, false); return NextResponse.json({ ok: true }); }
  if (action === 'refused') {
    await markProfilePrompt(email, true);
    return NextResponse.json({ ok: true });
  }

  // GET-like helper (tests/debug) : état courant du rappel.
  const u = await prisma.user.findUnique({ where: { email }, select: { profilePromptSeen: true, profilePromptAt: true, profilePromptRefusals: true } });
  if (!u) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  return NextResponse.json({ seen: u.profilePromptSeen, at: u.profilePromptAt, refusals: u.profilePromptRefusals });
}
