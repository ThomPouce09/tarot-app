// app/api/subscription/route.ts
// Renvoie l'abonnement réel de l'utilisateur (plan + statut) pour la page
// d'abonnement. Source de vérité = table Subscription (remplie par le webhook).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ plan: 'gratuit', status: null });

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
  });
  if (!user) return NextResponse.json({ plan: 'gratuit', status: null });

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!sub) return NextResponse.json({ plan: 'gratuit', status: null });

  return NextResponse.json({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  });
}
