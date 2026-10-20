import { NextRequest, NextResponse } from 'next/server';
import { normalizeEmail } from '@/lib/normalize-email';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Endpoint temporaire pour supprimer un utilisateur par email (dev uniquement)
export async function DELETE(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json();
    const email = normalizeEmail(rawEmail);
    
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    await prisma.user.deleteMany({
      where: { email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
