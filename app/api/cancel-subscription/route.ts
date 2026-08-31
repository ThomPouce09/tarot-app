// app/api/cancel-subscription/route.ts
// Résilie (cancel_at_period_end = true) ou reprend (false) un abonnement Stripe.
// Côté serveur uniquement (STRIPE_SECRET_KEY).
// Le front envoie { email, cancel: boolean }.
//
// Résiliation = en fin de période (pattern Stripe standard) : tant que
// current_period_end n'est pas dépassé, l'utilisateur garde ses droits via
// `getRights()` (seul le flag cancelAtPeriodEnd + status 'canceled' changent).
// Reprendre = annule l'annulation (retire le flag, status -> 'active').

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Paiements désactivés (clé Stripe manquante)' }, { status: 503 });
    }

    const { email, cancel } = await request.json();
    if (!email || typeof cancel !== 'boolean') {
      return NextResponse.json({ error: 'Email et cancel (booléen) requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub?.stripeSubscriptionId || !sub?.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun abonnement Stripe actif' }, { status: 404 });
    }
    if (sub.status === 'canceled' && cancel) {
      return NextResponse.json({ error: 'Abonnement déjà résilié' }, { status: 400 });
    }
    if (sub.status === 'active' && !cancel) {
      return NextResponse.json({ error: 'Abonnement déjà actif (rien à reprendre)' }, { status: 400 });
    }

    // Répercute sur Stripe : update le flag cancel_at_period_end.
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: cancel,
    });

    // `current_period_end` peut manquer (SDK/expansion) → jamais new Date(undefined).
    const endSec = (updated as any).current_period_end;
    const periodEnd = endSec ? new Date(endSec * 1000) : sub.currentPeriodEnd;
    // On conserve le plan réel venant de Stripe (metadata) ; sinon celui en base.
    const plan = updated.metadata?.plan || sub.plan;
    const billing = updated.metadata?.billing || sub.billing;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: updated.status,
        cancelAtPeriodEnd: !!(updated as any).cancel_at_period_end,
        currentPeriodEnd: periodEnd,
        plan,
        billing,
      },
    });

    return NextResponse.json({
      ok: true,
      status: updated.status,
      cancelAtPeriodEnd: !!(updated as any).cancel_at_period_end,
      plan,
      currentPeriodEnd: periodEnd.toISOString(),
    });
  } catch (e: any) {
    console.error('[cancel-subscription]', e?.message);
    return NextResponse.json({ error: 'Échec de la résiliation' }, { status: 500 });
  }
}
