import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendConfirmationEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

// Renvoi de l'email d'activation (si le 1er n'est jamais arrivé).
// Identifie par email, régénère le token, et renvoie l'email.
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }
    if (user.confirmed) {
      return NextResponse.json({ error: 'Cet email est déjà confirmé' }, { status: 400 });
    }

    // Nouveau token (invalide l'ancien lien s'il existe encore).
    const token = randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { confirmationToken: token },
    });

    await sendConfirmationEmail({ email: user.email, firstName: user.firstName, token });

    return NextResponse.json({ success: true, message: 'Email de confirmation renvoyé.' });
  } catch (error: any) {
    console.error('[resend-confirmation] error:', error);
    return NextResponse.json(
      { error: 'Échec de l\'envoi de l\'email : ' + (error?.message || 'inconnu') },
      { status: 500 },
    );
  }
}
