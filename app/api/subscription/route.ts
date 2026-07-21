// app/api/subscription/route.ts
// Retourne l'abonnement Stripe d'un utilisateur (par email).
// Appelé par la page abonnement pour charger le statut réel.
// Si aucun abonnement trouvé, retourne { plan: 'gratuit' }.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const sub = user.subscription;
    if (!sub) {
      return NextResponse.json({ plan: 'gratuit', status: null });
    }

    // Synchronisation optionnelle : interroger Stripe pour le statut à jour
    const stripe = getStripe();
    if (stripe && sub.stripeSubscriptionId && sub.stripeCustomerId && sub.status !== 'canceled') {
      try {
        const remote = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        const remoteStatus = remote.status;
        if (remoteStatus !== sub.status) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: remoteStatus },
          });
          sub.status = remoteStatus;
        }
      } catch {
        // Stripe inaccessible — on retourne ce qu'on a en base
      }
    }

    return NextResponse.json({
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    });
  } catch (e: any) {
    console.error('[api/subscription]', e?.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
