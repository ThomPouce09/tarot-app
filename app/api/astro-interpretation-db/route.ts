// app/api/astro-interpretation-db/route.ts
//
// Interroge la table AstroInterpretation pour une combinaison
// planète × signe × maison donnée.
//
// Exemple : POST { planet: 'Mars', sign: 'Bélier', house: 'Maison 1' }
// → { interpretation: "Votre action est fulgurante, directe..." }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { planet, sign, house } = body || {};
  if (!planet || !sign || !house) {
    return NextResponse.json(
      { error: 'Champs requis : planet, sign, house' },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.astroInterpretation.findUnique({
      where: { planet_sign_house: { planet, sign, house } },
    });

    if (!row) {
      return NextResponse.json(
        { interpretation: null, found: false },
        { status: 200 },
      );
    }

    return NextResponse.json({
      interpretation: row.interpretation,
      planet: row.planet,
      sign: row.sign,
      house: row.house,
      found: true,
    });
  } catch (err) {
    console.error('[astro-interpretation-db]', err);
    return NextResponse.json(
      { error: 'Erreur base de données', found: false },
      { status: 500 },
    );
  }
}
