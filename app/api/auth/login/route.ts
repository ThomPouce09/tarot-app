import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { daysSince, DELETION_GRACE_DAYS } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    // Compte supprimé (tombeau) : garde anti-reconnexion de 40 jours.
    if (user.deletedAt) {
      const elapsed = daysSince(user.deletedAt);
      if (elapsed < DELETION_GRACE_DAYS) {
        const remaining = DELETION_GRACE_DAYS - elapsed;
        const untilLabel = new Date(
          user.deletedAt.getTime() + DELETION_GRACE_DAYS * 86400000
        ).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return NextResponse.json(
          {
            error: `Votre compte a été supprimé. Vous pourrez recréer un compte à partir du ${untilLabel} (dans ${remaining} jour${remaining > 1 ? 's' : ''}).`,
            code: 'ACCOUNT_DELETED',
            remainingDays: remaining,
          },
          { status: 403 }
        );
      }
      // Les 40 jours passés : purge le tombeau, le compte est définitivement supprimé.
      await prisma.$transaction([
        prisma.reading.deleteMany({ where: { userId: user.id } }),
        prisma.subscription.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const isValid = await (bcrypt as any).compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        phone: user.phone,
        comment: user.comment,
        confirmed: user.confirmed,
        createdAt: user.createdAt,
        token: user.confirmationToken || 'authenticated',
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 });
  }
}
