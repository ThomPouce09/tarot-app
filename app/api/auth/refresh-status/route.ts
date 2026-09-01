import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Statut d'activation (confirmed) depuis la DB, pour un email donné.
// Sert à afficher un badge d'activation FIABLE (sans se fier au localStorage).
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      select: { confirmed: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }
    return NextResponse.json({ confirmed: user.confirmed });
  } catch (error: any) {
    console.error('[refresh-status] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
