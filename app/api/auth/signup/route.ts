import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendConfirmationEmail } from '@/lib/mailer';
import { calcAge, daysSince, DELETION_GRACE_DAYS } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, gender, dateOfBirth, phone, comment } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      // Compte tombé (supprimé) : garde anti-recéation de 40 jours.
      if (existing.deletedAt) {
        const elapsed = daysSince(existing.deletedAt);
        if (elapsed < DELETION_GRACE_DAYS) {
          const remaining = DELETION_GRACE_DAYS - elapsed;
          const untilLabel = new Date(
            existing.deletedAt.getTime() + DELETION_GRACE_DAYS * 86400000
          ).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          return NextResponse.json(
            {
              error: `Cet email a été utilisé par un compte supprimé. Vous pourrez le réutiliser à partir du ${untilLabel} (dans ${remaining} jour${remaining > 1 ? 's' : ''}).`,
              code: 'ACCOUNT_DELETED',
            },
            { status: 403 }
          );
        }
        // 40 jours passés : purge le tombeau, la recréation est autorisée.
        await prisma.$transaction([
          prisma.reading.deleteMany({ where: { userId: existing.id } }),
          prisma.subscription.deleteMany({ where: { userId: existing.id } }),
          prisma.user.delete({ where: { id: existing.id } }),
        ]);
      } else {
        return NextResponse.json({ error: 'Cet email est déjà inscrit. Connectez-vous ou utilisez un autre email.' }, { status: 400 });
      }
    }

    const hashedPassword = await (bcrypt as any).hash(password, 12);
    const confirmationToken = randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        age: dateOfBirth ? calcAge(dateOfBirth) : null,
        phone,
        comment,
        confirmationToken,
      },
    });

    // Envoi de l'email d'activation (helper partagé lib/mailer.sendConfirmationEmail).
    try {
      await sendConfirmationEmail({ email: user.email, firstName: user.firstName, token: confirmationToken });
    } catch (emailError: any) {
      console.error('[signup] email activation error:', emailError);
      return NextResponse.json(
        { error: 'Compte créé, mais échec de l\'envoi de l\'email d\'activation : ' + (emailError?.message || 'inconnu') },
        { status: 500 },
      );
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
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 });
  }
}
