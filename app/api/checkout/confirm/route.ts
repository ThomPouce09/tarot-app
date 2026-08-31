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

    // L'email est renvoyé à la page (elle n'a pas forcément localStorage sur ce
    // domaine) pour recharger l'état sans dépendre du tarot_user du navigateur.
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const email = user?.email ?? null;

    // ── One-shot (bienvenue / recharge) ──
    // Un forfait (initie/arkane) n'est JAMAIS un one-shot : on ne retourne pas.
    const isPlan = plan === 'initie' || plan === 'arkane';
    if (!subscriptionId && !isPlan) {
      await handleOneShot(userId, plan, session.id as string);
      return NextResponse.json({ plan: 'apprenti', oneShot: plan, success: true, email });
    }

    // ── Abonnement récurrent ──
    const billing = session.metadata?.billing || 'month';
    const customerId = session.customer as string;
    let subId = subscriptionId;
    // Le session_id peut renvoyer sans `session.subscription` propagé → on le
    // retrouve chez le customer (même contournement que le webhook).
    if (!subId && isPlan) {
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
      subId = subs.data[0]?.id ?? null;
    }
    const sub = subId ? await stripe.subscriptions.retrieve(subId) : null;
    if (!sub) {
      return NextResponse.json({ error: 'Abonnement introuvable', plan: 'apprenti' }, { status: 404 });
    }
    const priceId = sub.items.data[0]?.price?.id as string;
    const periodEnd = new Date((sub as any).current_period_end * 1000);

    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        plan,
        billing,
        status: sub.status,
        currentPeriodEnd: periodEnd,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
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
      email,
    });
  } catch (e: any) {
    console.error('[checkout/confirm]', e?.message);
    // TEMP debug : exposer le message réel pour diagnostiquer le 500.
    return NextResponse.json({ error: 'Erreur vérification paiement', detail: e?.message }, { status: 500 });
  }
}
