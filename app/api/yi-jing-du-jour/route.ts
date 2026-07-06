
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Date du jour au format DD/MM
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const todayStr = day + '/' + month;

    // Requête brute via Prisma sur la table hexagrams
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        numero: number;
        date_debut: string;
        date_fin: string;
        caractere: string;
        pinyin: string;
        element: string;
        strategie: string;
        attitude: string;
        conseil: string;
        synthese: string;
        lignes: string;
      }>
    >(
      `SELECT numero, date_debut, date_fin, caractere, pinyin,
              element, strategie, attitude, conseil, synthese, lignes
       FROM hexagrams
       WHERE TO_DATE(date_debut, 'DD/MM') <= TO_DATE($1, 'DD/MM')
         AND TO_DATE(date_fin,   'DD/MM') >= TO_DATE($1, 'DD/MM')
       LIMIT 1`,
      todayStr
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        found: false,
        today: todayStr,
        message: "Aucun hexagramme trouvé pour aujourd'hui"
      });
    }

    const h = rows[0];

    // Parser les lignes si stockées en JSON string
    let lignesArray: string[] = [];
    if (h.lignes) {
      try {
        lignesArray = JSON.parse(h.lignes);
      } catch {
        lignesArray = [h.lignes];
      }
    }

    return NextResponse.json({
      found: true,
      today: todayStr,
      hexagram: {
        numero: h.numero,
        caractere: h.caractere,
        pinyin: h.pinyin,
        dateDebut: h.date_debut,
        dateFin: h.date_fin,
        element: h.element ?? '',
        strategie: h.strategie ?? '',
        attitude: h.attitude ?? '',
        conseil: h.conseil ?? '',
        synthese: h.synthese ?? '',
        lignes: lignesArray,
      }
    });

  } catch (error) {
    console.error('Erreur API yi-jing-du-jour:', error);
    return NextResponse.json(
      {
        found: false,
        error: error instanceof Error ? error.message : 'Erreur interne'
      },
      { status: 500 }
    );
  }
}
