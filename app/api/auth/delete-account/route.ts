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
      await prisma.user.delete({
        where: { email: email.toLowerCase().trim() }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
