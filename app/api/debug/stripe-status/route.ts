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
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!email && !sessionId) return NextResponse.json({ error: 'email ou session_id requis' }, { status: 400 });

  const out: any = { email, sessionId };

  if (sessionId) {
    // Inspect d'une session de checkout : mode, prix attaché, récurrent ?
    const stripe = getStripe();
    if (stripe) {
      try {
        const s: any = await stripe.checkout.sessions.retrieve(sessionId);
        const li = s.line_items?.data?.[0]?.price;
        out.session = {
          id: s.id,
          mode: s.mode,
          status: s.status,
          payment_status: s.payment_status,
          subscription: s.subscription,
          customer: s.customer,
          metadata: s.metadata,
          price: li
            ? {
                id: li.id,
                amount: li.unit_amount,
                currency: li.currency,
                recurring: li.recurring, // null si one-shot
                type: li.type,
              }
            : null,
        };
      } catch (err: any) {
        out.sessionError = err?.message;
      }
    }
    return NextResponse.json(out);
  }

  const e = String(email).trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: e }, include: { subscription: true } });
  if (!user) return NextResponse.json({ error: 'user introuvable', email: e });

  const outA: any = {
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
  if (rights) outA.rights = { level: rights.level, baseUnlimited: rights.baseUnlimited, grandMonthly: rights.grandMonthly };

  const stripe = getStripe();
  if (stripe) {
    outA.stripe.hasKey = true;
    try {
      // customerId depuis la base (si presente), sinon recherche par email
      // (decisif quand db est null : on veut savoir si Stripe a cree un customer).
      let customerId: string | null = user.subscription?.stripeCustomerId ?? null;
      if (!customerId) {
        try {
          const found: any = await stripe.customers.search({ query: `email:'${e}'`, limit: 5 });
          customerId = found.data[0]?.id ?? null;
          outA.stripe.customersByEmail = found.data.map((c: any) => ({ id: c.id, email: c.email }));
        } catch {
          // fallback si API Search indisponible
          const found: any = await stripe.customers.list({ email: e });
          customerId = found.data.find((c: any) => c.email === e)?.id ?? null;
          outA.stripe.customersByEmail = found.data.map((c: any) => ({ id: c.id, email: c.email }));
        }
      }
      outA.stripe.customerId = customerId;

      if (customerId) {
        const subs = await stripe.subscriptions.list({ customer: customerId });
        outA.stripe.customerSubscriptions = subs.data.map((s: any) => ({
          id: s.id,
          status: s.status,
          cancel_at_period_end: s.cancel_at_period_end,
          current_period_end: s.current_period_end,
          plan_metadata: s.metadata,
        }));
      }
      if (user.subscription?.stripeSubscriptionId) {
        const one: any = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId);
        outA.stripe.retrieve = {
          id: one.id,
          status: one.status,
          plan: one.metadata?.plan,
          billing: one.metadata?.billing,
          current_period_end: one.current_period_end,
          cancel_at_period_end: one.cancel_at_period_end,
        };
      }

      // Journal des événements Stripe récents : prouve si checkout.session.completed
      // a été émis (et donc si le webhook a été déclenché).
      const evts: any = await stripe.events.list({ limit: 40 });
      outA.stripe.recentEvents = evts.data
        .filter((ev: any) => {
          const obj = ev.data?.object;
          return obj?.customer === customerId || obj?.metadata?.userId === user.id || ev.type?.includes('subscription');
        })
        .slice(0, 15)
        .map((ev: any) => ({
          id: ev.id,
          type: ev.type,
          created: new Date(ev.created * 1000).toISOString(),
          customer: ev.data?.object?.customer,
          sub: ev.data?.object?.subscription,
          metaPlan: ev.data?.object?.metadata?.plan,
        }));
    } catch (err: any) {
      outA.stripe.error = err?.message;
    }
  }

  return NextResponse.json(outA);
}
