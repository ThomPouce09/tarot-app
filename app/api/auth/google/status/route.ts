import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { HANDOFF_TTL_MS } from '@/lib/handoff';

export const dynamic = 'force-dynamic';

// ── Statut d'un passage navigateur (appelé par l'app au retour du navigateur)
// GET /api/auth/google/status?state=…
// Renvoie { ready: true } dès que le callback a déposé l'email. Aucun secret
// ici : le retrait réel exige le ticket (POST /claim).
export async function GET(request: NextRequest) {
  const state = String(request.nextUrl.searchParams.get('state') || '');
  if (!/^[0-9a-f]{40}$/.test(state)) {
    return Response.json({ ready: false }, { status: 400 });
  }
  const h = await prisma.authHandoff.findUnique({
    where: { id: state },
    select: { email: true, claimed: true, createdAt: true },
  });
  if (!h || h.claimed || Date.now() - h.createdAt.getTime() > HANDOFF_TTL_MS) {
    return Response.json({ ready: false, expired: true });
  }
  return Response.json({ ready: Boolean(h.email) });
}
