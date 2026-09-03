import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Statuts d'abonnement qui empêchent la suppression (à désabonner d'abord).
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Blocage : si l'utilisateur a encore un abonnement actif, il doit
    // se désabonner avant de pouvoir supprimer son compte.
    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ACTIVE_SUBSCRIPTION_STATUSES } },
    });

    if (activeSubscription) {
      return NextResponse.json(
        {
          error:
            'Vous avez un abonnement actif. Veuillez vous désabonner avant de supprimer votre compte.',
          code: 'ACTIVE_SUBSCRIPTION',
        },
        { status: 409 }
      );
    }

    // Suppression : purge les données (tirages + abonnement) et conserve le
    // compte en « tombeau » (deletedAt) pour la garde anti-reconnexion de 40 jours.
    await prisma.$transaction([
      prisma.reading.deleteMany({ where: { userId: user.id } }),
      prisma.subscription.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
