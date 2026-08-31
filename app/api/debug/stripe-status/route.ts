// app/api/debug/stripe-status/route.ts
// DIAGNOSTIC (temporaire) : retourne l'état RÉEL d'une souscription pour un email.
// Compare la vision BASE (prisma) et la vision STRIPE (API) pour identifier où
// la chaîne casse (paiement -> abonnement creé ? -> écrit en base ? -> level ?).
// SANS secret exposé : on ne renvoie que des états, jamais les clés.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { getRights } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });
  const e = String(email).trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: e }, include: { subscription: true } });
  if (!user) return NextResponse.json({ error: 'user introuvable', email: e });

  const out: any = {
    email: e,
    userId: user.id,
    db: user.subscription
      ? {
          plan: user.subscription.plan,
          billing: user.subscription.billing,
          status: user.subscription.status,
          stripeSubscriptionId: user.subscription.stripeSubscriptionId,
          stripeCustomerId: user.subscription.stripeCustomerId,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
        }
      : null,
    rights: { level: null },
    stripe: { hasKey: false },
  };

  const rights = await getRights(e);
  if (rights) out.rights = { level: rights.level, baseUnlimited: rights.baseUnlimited, grandMonthly: rights.grandMonthly };

  const stripe = getStripe();
  if (stripe) {
    out.stripe.hasKey = true;
    try {
      if (user.subscription?.stripeCustomerId) {
        const subs = await stripe.subscriptions.list({ customer: user.subscription.stripeCustomerId });
        out.stripe.customerSubscriptions = subs.data.map((s: any) => ({
          id: s.id,
          status: s.status,
          cancel_at_period_end: s.cancel_at_period_end,
          current_period_end: s.current_period_end,
          plan_metadata: s.metadata,
        }));
      }
      if (user.subscription?.stripeSubscriptionId) {
        const one: any = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId);
        out.stripe.retrieve = {
          id: one.id,
          status: one.status,
          plan: one.metadata?.plan,
          billing: one.metadata?.billing,
          current_period_end: one.current_period_end,
          cancel_at_period_end: one.cancel_at_period_end,
        };
      }
    } catch (err: any) {
      out.stripe.error = err?.message;
    }
  }

  return NextResponse.json(out);
}
