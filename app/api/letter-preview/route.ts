import { NextRequest, NextResponse } from 'next/server';
import { buildLetterData, renderLetter } from '@/lib/letter';

export const dynamic = 'force-dynamic';

// Aperçu de la "Lettre mystique" hebdo pour un utilisateur, avec ses vraies
// données (readings + streak + tirage du jour). Sert un HTML à prévisualiser.
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email requis' }, { status: 400 });
  }

  const data = await buildLetterData(String(email).trim().toLowerCase());
  if (!data) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  const html = renderLetter(data);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
