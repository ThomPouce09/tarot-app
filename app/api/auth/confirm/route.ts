import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token requis' });
  }

  const user = await prisma.user.findFirst({
    where: { confirmationToken: token },
  });

  if (!user) {
    return NextResponse.json({ valid: false, error: 'Token invalide' });
  }

  return NextResponse.json({ valid: true, message: 'Lien valide' });
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { confirmationToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 400 });
    }

    // Activation de compte (token seul) OU réinitialisation (token + nouveau mdp).
    const data: { confirmed: boolean; confirmationToken: null; password?: string } = {
      confirmed: true,
      confirmationToken: null,
    };
    if (password) {
      data.password = await (require('bcryptjs') as any).hash(password, 12);
    }

    await prisma.user.update({ where: { id: user.id }, data });

    return NextResponse.json({
      success: true,
      message: 'Compte activé',
      user: { id: user.id, email: user.email, confirmed: true },
    });
  } catch (error: any) {
    console.error('Confirm error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
