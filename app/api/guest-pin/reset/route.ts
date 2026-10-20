// app/api/guest-pin/reset/route.ts — Réinitialisation du code Invité par lien
// e-mail (« Code oublié ? » sur la modale de sortie du mode Invité).
// Le jeton est le confirmationToken (même mécanique que le mot de passe oublié) ;
// la personne qui a accès à la boîte mail est le propriétaire du compte → le lien
// pose le nouveau code ET coupe le mode Invité (sécurité).
// POST { token, pin }

import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { token, pin } = await request.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token requis' }, { status: 400 });
    }
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin.trim())) {
      return NextResponse.json({ error: 'pin-format' }, { status: 400 });
    }
    const user = await prisma.user.findFirst({ where: { confirmationToken: token } });
    if (!user) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 });
    }
    const hash = await (bcrypt as any).hash(pin.trim(), 12);
    await prisma.user.update({
      where: { id: user.id },
      // guestMode: false — réinitialiser le code coupe le mode Invité (reco A3).
      data: { guestPinHash: hash, guestPinTries: 0, guestPinLockedAt: null, guestMode: false, confirmationToken: null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Guest pin reset error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
