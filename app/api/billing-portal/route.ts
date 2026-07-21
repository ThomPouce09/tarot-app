// app/api/billing-portal/route.ts
// Ouvre le Stripe Billing Portal pour gérer l'abonnement (carte, annulation…).
// Côté serveur uniquement (STRIPE_SECRET_KEY).
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Paiements désactivés (clé Stripe manquante)' }, { status: 503 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub?.stripeCustomerId) {
      return NextResponse.json({ error: 'Aucun abonnement Stripe actif' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007';
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/account/abonnement`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('[billing-portal]', e?.message);
    return NextResponse.json({ error: 'Échec du portail de gestion' }, { status: 500 });
  }
}
