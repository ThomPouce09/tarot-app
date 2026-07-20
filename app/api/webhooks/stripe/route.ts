// app/api/webhooks/stripe/route.ts
// Webhook Stripe : source de vérité pour l'état de l'abonnement.
// Vérifie la signature (STRIPE_WEBHOOK_SECRET) puis traite les événements :
//   checkout.session.completed        -> crée/màj Subscription (plan actif)
//   customer.subscription.updated     -> màj statut / période / cancel
//   customer.subscription.deleted     -> marque canceled
//
// En local, exposer via : stripe listen --forward-to localhost:3002/api/webhooks/stripe

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: 'Paiements désactivés (clé Stripe manquante)' }, { status: 503 });
  }

  const sig = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'Signature / secret manquant' }, { status: 400 });
  }

  const body = await request.text();
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    console.error('[webhook] signature invalide', e?.message);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (!userId || !plan || !subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = (sub.items.data[0]?.price?.id) as string;
        const periodEnd = new Date((sub as any).current_period_end * 1000);
        const status = sub.status;

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status,
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status,
            currentPeriodEnd: periodEnd,
          },
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const subscriptionId = sub.id as string;
        const existing = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
        if (!existing) break;
        const periodEnd = new Date((sub as any).current_period_end * 1000);
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: sub.status,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: !!(sub as any).cancel_at_period_end,
            plan: sub.metadata?.plan || existing.plan,
          },
        });
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error('[webhook] traitement', e?.message);
    return NextResponse.json({ error: 'Erreur traitement' }, { status: 500 });
  }
}
