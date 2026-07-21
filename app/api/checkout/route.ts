// app/api/checkout/route.ts
// Crée une Stripe Checkout Session en mode "subscription" et renvoie l'URL
// de redirection. Côté serveur uniquement (STRIPE_SECRET_KEY).
//
// Le front envoie { plan: 'initie'|'oracle', email } (email = user courant).
// On crée/récupère le Customer Stripe et le Price (id déterministe pour
// l'idempotence en mode test).

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, priceIdForPlan, PLAN_AMOUNTS, type PlanId } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function ensurePrice(stripe: Stripe, plan: PlanId): Promise<string> {
  const existing = priceIdForPlan(plan);
  if (existing) return existing;

  // Création à la volée (sans id déterministe : Stripe refuse 'id' sur Price).
  const def = PLAN_AMOUNTS[plan];
  const product = await stripe.products.create({
    name: `Tarot — ${def.name}`,
    metadata: { plan },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: def.amount,
    currency: def.currency,
    recurring: { interval: def.interval },
    metadata: { plan },
  });
  return price.id;
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Paiements désactivés (clé Stripe manquante)' }, { status: 503 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
    const { plan, email } = await request.json();
    if (plan !== 'initie' && plan !== 'oracle') {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const priceId = await ensurePrice(stripe, plan as PlanId);

    // Customer Stripe (réutilisé si déjà créé).
    let customerId: string | undefined;
    const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (existingSub) customerId = existingSub.stripeCustomerId;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Aucune restriction : Stripe propose CB + PayPal selon la config dashboard.
      metadata: { userId: user.id, plan },
      success_url: `${baseUrl}/dashboard/account/abonnement?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${baseUrl}/dashboard/account/abonnement?status=cancel`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('[checkout]', e?.message);
    return NextResponse.json({ error: "Échec de l'initialisation du paiement" }, { status: 500 });
  }
}
