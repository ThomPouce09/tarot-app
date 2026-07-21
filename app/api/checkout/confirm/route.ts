// app/api/checkout/confirm/route.ts
// Vérifie une session Stripe après retour du checkout.
// Sans attendre le webhook (qui peut ne pas être configuré).
// Appelé par la page abonnement avec ?session_id=xxx

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id requis' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe désactivé' }, { status: 503 });
    }

    // Récupère la session Stripe complète
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    if (!userId || !plan || !subscriptionId) {
      return NextResponse.json({ error: 'Données session incomplètes', plan: 'gratuit' }, { status: 400 });
    }

    // Récupère les détails abonnement Stripe
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (!sub) {
      return NextResponse.json({ error: 'Abonnement introuvable', plan: 'gratuit' }, { status: 404 });
    }
    const priceId = sub.items.data[0]?.price?.id as string;
    const periodEnd = new Date((sub as any).current_period_end * 1000);

    // Upsert en base locale
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        plan,
        status: sub.status,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        plan,
        status: sub.status,
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json({
      plan,
      status: sub.status,
      currentPeriodEnd: periodEnd.toISOString(),
    });
  } catch (e: any) {
    console.error('[checkout/confirm]', e?.message);
    return NextResponse.json({ error: 'Erreur vérification paiement' }, { status: 500 });
  }
}
