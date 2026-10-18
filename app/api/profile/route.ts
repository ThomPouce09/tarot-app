// app/api/profile/route.ts — Profil oracle (Mon espace > Profil oracle).
// GET  : profil courant (session OU email — parité WebView/APK, même économie
//        que /api/prefs). POST : enregistrement des pastilles (validation
//        stricte serveur : bornes fermées, ville nettoyée, heure HH:MM).
// Le profil est 100 % optionnel ; chaque champ se remplace ou s'efface.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { sanitizeProfile, profileHasData } from '@/lib/profile';

export const dynamic = 'force-dynamic';

function emailFrom(req: NextRequest, body?: Record<string, unknown> | null): string {
  const e = (
    verifySession(req.headers.get('x-session')) ||
    req.nextUrl.searchParams.get('email') ||
    (typeof body?.email === 'string' ? body.email : '')
  ).trim().toLowerCase();
  return e;
}

export async function GET(request: NextRequest) {
  const email = emailFrom(request);
  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });
  const u = await prisma.user.findUnique({
    where: { email },
    select: { domains: true, lifeStage: true, tone: true, familiarity: true, birthTown: true, birthHour: true, birthCountry: true, comment: true },
  });
  if (!u) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  return NextResponse.json({
    domains: u.domains, lifeStage: u.lifeStage, tone: u.tone,
    familiarity: u.familiarity, birthTown: u.birthTown, birthHour: u.birthHour, birthCountry: u.birthCountry,
    comment: u.comment,
    hasData: profileHasData(u),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = emailFrom(request, body as Record<string, unknown> | null);
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });

    const p = sanitizeProfile(body);
    if (!p) return NextResponse.json({ error: 'corps invalide' }, { status: 400 });

    // null explicite = effacer le champ (souveraineté de l'utilisateur).
    const b = (body || {}) as Record<string, unknown>;
    const data = {
      domains: p.domains,
      lifeStage: b.lifeStage === null ? null : p.lifeStage,
      tone: b.tone === null ? null : p.tone,
      familiarity: b.familiarity === null ? null : p.familiarity,
      birthTown: b.birthTown === null ? null : p.birthTown,
      birthCountry: b.birthCountry === null ? null : p.birthCountry,
      birthHour: b.birthHour === null ? null : p.birthHour,
      comment: b.comment === null ? null : p.comment,
    };
    // Ville non reconnue (chiffres/adresse) alors qu'une saisie était faite →
    // refus explicite plutôt que d'avaler la frappe silencieusement.
    if (typeof b.birthTown === 'string' && b.birthTown.trim() && !data.birthTown) {
      return NextResponse.json({ error: 'Nom de ville non reconnu (lettres uniquement).' }, { status: 400 });
    }
    if (typeof b.birthHour === 'string' && b.birthHour && !data.birthHour) {
      return NextResponse.json({ error: 'Heure invalide (format HH:MM).' }, { status: 400 });
    }

    const updated = await prisma.user.update({ where: { email }, data });
    // Profil complété → le rappel créature n'a plus lieu d'être (il se tait
    // définitivement via la règle profileHasData → 'suppress').
    return NextResponse.json({ success: true, hasData: profileHasData(updated) });
  } catch (error) {
    console.error('/api/profile error:', error);
    return NextResponse.json({ error: 'Échec enregistrement' }, { status: 500 });
  }
}
