import { NextRequest, NextResponse } from 'next/server';
import { buildLetterData, renderLetter } from '@/lib/letter';
import { mailer, MAIL_FROM } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

// Envoi réel d'une "Lettre mystique" hebdo à un utilisateur.
// Réutilise le transporteur partagé (lib/mailer, config identique à forgot-password).
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email requis' }, { status: 400 });
    }

    const target = email.trim().toLowerCase();
    const data = await buildLetterData(target);
    if (!data) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const html = renderLetter(data);
    const subject = `Votre lettre mystique — ${data.firstName}`;

    await mailer.sendMail({
      from: MAIL_FROM,
      to: target,
      subject,
      html,
    });

    return NextResponse.json({ success: true, to: target, subject });
  } catch (error) {
    console.error('letter-send error:', error);
    return NextResponse.json({ error: "Échec de l'envoi" }, { status: 500 });
  }
}
