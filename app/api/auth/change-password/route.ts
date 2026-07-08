import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email et nouveau mot de passe requis' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 6 caractères' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Si un mot de passe est déjà défini, vérifier l'ancien (sauf flux "mot de passe oublié")
    if (user.password && currentPassword) {
      const valid = await (bcrypt as any).compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
      }
    }

    const hashed = await (bcrypt as any).hash(newPassword, 12);
    await prisma.user.update({
      where: { email: email.toLowerCase().trim() },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 });
  }
}
