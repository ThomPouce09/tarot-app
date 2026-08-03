import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (user) {
      // Supprime explicitement les dépendances (readings, subscription) dans
      // une transaction : la FK Reading→User est en Restrict en base, un
      // prisma.user.delete seul échouerait si l'utilisateur a des tirages.
      await prisma.$transaction([
        prisma.reading.deleteMany({ where: { userId: user.id } }),
        prisma.subscription.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
