// app/api/subscription/route.ts
// Retourne l'abonnement + les droits (quotas) d'un utilisateur (par email).
// Appelé par la page abonnement et par le gating client.
// Sans abonnement actif → niveau 'apprenti' (gratuit).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { getRights } from '@/lib/entitlements';
import { planToLevel } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const sub = user.subscription;

    // Synchronisation optionnelle : statut Stripe à jour (status + fin de période,
    // pour que la vérification d'expiration locale soit exacte).
    const stripe = getStripe();
    if (stripe && sub?.stripeSubscriptionId && sub.stripeCustomerId && sub.status !== 'canceled') {
      try {
        const remote = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        // current_period_end peut manquer sur le type SDK → cast (pattern webhook).
        const endSec = (remote as any).current_period_end as number | null | undefined;
        const remoteEnd = endSec ? new Date(endSec * 1000) : sub.currentPeriodEnd;
        if (remote.status !== sub.status || remoteEnd.getTime() !== sub.currentPeriodEnd.getTime()) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: remote.status, currentPeriodEnd: remoteEnd },
          });
          sub.status = remote.status;
          sub.currentPeriodEnd = remoteEnd;
        }
      } catch {
        // Stripe inaccessible — statut en base
      }
    }

    const rights = await getRights(emailNorm);
    const level = rights?.level ?? 'apprenti';

    return NextResponse.json({
      plan: sub?.plan ?? 'apprenti',
      level,
      status: sub?.status ?? null,
      billing: sub?.billing ?? 'month',
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      usage: rights
        ? {
            baseUsedToday: rights.baseUsedToday,
            grandUsedMonth: rights.grandUsedMonth,
            grandMonthly: rights.grandMonthly,
            baseUnlimited: rights.baseUnlimited,
            welcomeBaseUsed: rights.welcomeBaseUsed,
            welcomeGrandUsed: rights.welcomeGrandUsed,
            bonusGrand: rights.bonusGrand,
            rechargeCredits: rights.rechargeCredits,
            streakDays: rights.streakDays,
          }
        : null,
    });
  } catch (e: any) {
    console.error('[api/subscription]', e?.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
