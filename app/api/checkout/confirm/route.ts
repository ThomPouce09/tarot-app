// app/api/checkout/confirm/route.ts
// Vérifie une session Stripe après retour du checkout (sans attendre le webhook).
// Gère abonnements récurrents ET one-shot (bienvenue / recharge).

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { RECHARGE_CREDITS } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

async function handleOneShot(userId: string, plan: string, sessionId: string) {
  if (plan === 'bienvenue') {
    await prisma.purchase.create({ data: { userId, kind: 'bienvenue', amountEur: 0, stripeSessionId: sessionId } });
    return;
  }
  if (plan === 'recharge') {
    await prisma.purchase.create({ data: { userId, kind: 'recharge', amountEur: 2, stripeSessionId: sessionId } });
    const u = await prisma.usage.findUnique({ where: { userId } });
    await prisma.usage.upsert({ where: { userId }, create: { userId, rechargeCredits: RECHARGE_CREDITS }, update: { rechargeCredits: (u?.rechargeCredits ?? 0) + RECHARGE_CREDITS } });
    return;
  }
}

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

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const subscriptionId = session.subscription as string | null;

    if (!userId || !plan) {
      return NextResponse.json({ error: 'Données session incomplètes', plan: 'apprenti' }, { status: 400 });
    }

    // ── One-shot ──
    if (!subscriptionId) {
      await handleOneShot(userId, plan, session.id as string);
      return NextResponse.json({ plan: 'apprenti', oneShot: plan, success: true });
    }

    // ── Abonnement récurrent ──
    const billing = session.metadata?.billing || 'month';
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (!sub) {
      return NextResponse.json({ error: 'Abonnement introuvable', plan: 'apprenti' }, { status: 404 });
    }
    const priceId = sub.items.data[0]?.price?.id as string;
    const periodEnd = new Date((sub as any).current_period_end * 1000);

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        plan,
        billing,
        status: sub.status,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        plan,
        billing,
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
