import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcAge } from '@/lib/dates';
import { normalizePhone, isValidPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, phone, dateOfBirth, gender, comment } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Téléphone : obligatoire, validé et UNIQUE comme à l'inscription
    // (l'exclu : son propre compte). Normalisé avant stockage/comparaison.
    const phoneNorm = normalizePhone(phone);
    if (!phoneNorm) {
      return NextResponse.json({ error: 'Le numéro de téléphone est obligatoire.' }, { status: 400 });
    }
    if (!isValidPhone(phoneNorm)) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide (7 à 15 chiffres).' }, { status: 400 });
    }
    const clash = await prisma.user.findFirst({
      where: { phone: phoneNorm, NOT: { id: user.id } },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json({ error: 'Ce numéro de téléphone est déjà utilisé par un compte.' }, { status: 409 });
    }

    await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        gender,
        comment,
        firstName,
        lastName,
        phone: phoneNorm,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        age: dateOfBirth ? calcAge(dateOfBirth) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
