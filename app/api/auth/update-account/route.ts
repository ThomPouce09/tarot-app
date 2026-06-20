import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, phone, age } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: {
        firstName,
        lastName,
        phone,
        age,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
