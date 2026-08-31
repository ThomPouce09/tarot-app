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
import { RECHARGE_CREDITS } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

// Crédite un achat one-shot (bienvenue + recharge cosmique).
async function handleOneShot(session: any, userId: string | undefined, plan: string | undefined) {
  if (!userId) return;
  if (plan === 'bienvenue') {
    // Rien à créditer : le pack bienvenue est un état (compteurs Usage), servi
    // automatiquement aux nouveaux comptes. On l'enregistre pour la traçabilité.
    await prisma.purchase.create({ data: { userId, kind: 'bienvenue', amountEur: 0, stripeSessionId: session.id as string } });
    return;
  }
  if (plan === 'recharge') {
    // Recharge cosmique : +105 crédits (mixables : base = 7, avancé = 15).
    await prisma.purchase.create({ data: { userId, kind: 'recharge', amountEur: 2, stripeSessionId: session.id as string } });
    const u = await prisma.usage.findUnique({ where: { userId } });
    await prisma.usage.upsert({
      where: { userId },
      create: { userId, rechargeCredits: RECHARGE_CREDITS },
      update: { rechargeCredits: (u?.rechargeCredits ?? 0) + RECHARGE_CREDITS },
    });
    return;
  }
}

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
        const billing = session.metadata?.billing || 'month';
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;

        // One-shot (bienvenue / recharge) : pas de subscription → crédite le solde.
        // Un forfait (initie/arkane) n'est JAMAIS un one-shot : on ne `break` pas,
        // on retrouve l'abonnement chez le customer si session.subscription manque.
        const isPlan = plan === 'initie' || plan === 'arkane';
        if (!subscriptionId && !isPlan) {
          await handleOneShot(session, userId, plan);
          break;
        }
        if (!userId || !plan) break;

        // Robustesse : session.subscription peut ne pas être propagé sur l'event
        // (surtout pour un abonnement en mode test) → on le retrouve chez le customer.
        let subId = subscriptionId;
        if (!subId && isPlan) {
          const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
          subId = subs.data[0]?.id ?? null;
          if (!subId) break;
        }
        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = (sub.items.data[0]?.price?.id) as string;
        const periodEnd = new Date((sub as any).current_period_end * 1000);
        const status = sub.status;

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            stripePriceId: priceId,
            plan,
            billing,
            status,
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subId,
            stripePriceId: priceId,
            plan,
            billing,
            status,
            currentPeriodEnd: periodEnd,
          },
        });
        break;
      }

      // Création d'un abonnement (source fiable du subscriptionId), au cas où
      // checkout.session.completed n'aurait pas encore propagé `session.subscription`.
      case 'customer.subscription.created': {
        const sub = event.data.object;
        const subscriptionId = sub.id as string;
        const customerId = sub.customer as string;
        const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
        if (existing) break;
        // Retrouve le user via une subscription existante portant ce customer,
        // sinon via la session de checkout (metadata.userId) si dispo.
        let userId: string | undefined;
        const byCustomer = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
        if (byCustomer) userId = byCustomer.userId;
        if (!userId) {
          const session = await stripe.checkout.sessions.list({ customer: customerId, limit: 1 }).catch(() => null);
          userId = (session?.data[0]?.metadata?.userId) as string | undefined;
        }
        if (!userId) break;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) break;
        const periodEnd = new Date((sub as any).current_period_end * 1000);
        const plan = sub.metadata?.plan || 'initie';
        const billing = sub.metadata?.billing || 'month';
        await prisma.subscription.create({
          data: {
            userId: user.id,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: (sub.items.data[0]?.price?.id) as string,
            plan,
            billing,
            status: sub.status,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: !!(sub as any).cancel_at_period_end,
          },
        });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const subscriptionId = sub.id as string;
        const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscriptionId } });
        if (!existing) break;
        const periodEnd = new Date((sub as any).current_period_end * 1000);
        await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            status: sub.status,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: !!(sub as any).cancel_at_period_end,
            plan: sub.metadata?.plan || existing.plan,
            billing: sub.metadata?.billing || existing.billing,
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
