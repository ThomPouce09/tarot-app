// app/api/checkout/route.ts
// Crée une Stripe Checkout Session et renvoie l'URL de redirection.
// Côté serveur uniquement (STRIPE_SECRET_KEY).
//
// Types de session :
//   - Abonnement récurrent (initie / arkane), mensuel ou annuel : mode 'subscription'.
//   - One-shot (bienvenue offert / recharge cosmique) : mode 'payment'.
//
// Le front envoie { plan, billing?, email }.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, priceIdForPlan, PLAN_AMOUNTS, ONE_SHOT_AMOUNTS, ONE_SHOT_NAMES, type PlanId, type OneShotPlan } from '@/lib/stripe';
import { PLAN_PRICE_YEAR_EUR } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Recharge cosmique = un ACHAT UNIQUE (pas de récurrence) à 2€.
// Le choix base (15) vs grand (7) se fait au moment de la souscription.

async function ensurePrice(stripe: Stripe, plan: PlanId, billing: 'month' | 'year'): Promise<string> {
  const existing = priceIdForPlan(plan, billing);
  if (existing) return existing;

  const def = PLAN_AMOUNTS[plan];
  const annual = billing === 'year';
  const interval = annual ? 'year' : 'month';
  // Montant annuel = prix ANNONCÉ (PLAN_PRICE_YEAR_EUR), pas "10 × mensuel" :
  // Initié 50€ / Arkane 75€ (2 mois offerts). En centimes.
  const unit = annual ? Math.round(PLAN_PRICE_YEAR_EUR[plan] * 100) : PLAN_AMOUNTS[plan].amount;
  const product = await stripe.products.create({ name: `Tarot — ${def.name} (${annual ? 'an' : 'mois'})`, metadata: { plan, billing } });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: unit,
    currency: 'eur',
    recurring: { interval },
    metadata: { plan, billing },
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
    const { plan, billing = 'month', email } = await request.json();
    const oneShot = plan === 'bienvenue' || plan === 'recharge';
    if (!oneShot && plan !== 'initie' && plan !== 'arkane') {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });
    }
    if ((billing !== 'month' && billing !== 'year') && !oneShot) {
      return NextResponse.json({ error: 'Facturation invalide' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // ── One-shot : mode 'payment' ──
    if (oneShot) {
      const amountEur = plan === 'bienvenue' ? 0 : ONE_SHOT_AMOUNTS.recharge;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        line_items: plan === 'bienvenue'
          ? [] // offert : aucune ligne (cas rare — bienvenue est auto-granté)
          : [{ price_data: { currency: 'eur', product_data: { name: ONE_SHOT_NAMES[plan as OneShotPlan] }, unit_amount: amountEur }, quantity: 1 }],
        payment_method_types: ['card', 'paypal'],
        metadata: { userId: user.id, plan },
        success_url: `${baseUrl}/dashboard/account/abonnement?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: `${baseUrl}/dashboard/account/abonnement?status=cancel`,
      });
      return NextResponse.json({ url: session.url });
    }

    // ── Abonnement récurrent : mode 'subscription' ──
    const priceId = await ensurePrice(stripe, plan as PlanId, billing as 'month' | 'year');

    let customerId: string | undefined;
    const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (existingSub) customerId = existingSub.stripeCustomerId;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_types: ['card', 'paypal'],
      metadata: { userId: user.id, plan, billing },
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
