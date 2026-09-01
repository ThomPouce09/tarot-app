import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Message du jour (1-365) pour la pause repas. Pas de cache : jour courant.
export const dynamic = 'force-dynamic';

type Row = { textFr: string; textEn: string };

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'fr';

  try {
    // Jour de l'année (1-365), stable toute la journée. Les années bissextiles
    // (jour 366) se replient sur le jour 1 pour couvrir tout le cycle.
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const doy = Math.floor((now.getTime() - start.getTime()) / 86400000); // 0-365
    const day = (doy % 365) + 1;

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "textFr","textEn" FROM "DailyMessage" WHERE "day" = $1 LIMIT 1`, day,
    );

    let text = '';
    if (rows.length) {
      text = lang === 'en' ? (rows[0].textEn || rows[0].textFr) : rows[0].textFr;
    } else {
      // Sécurité : aucun enregistrement pour ce jour → on en pioche un au hasard.
      const any = await prisma.$queryRawUnsafe<Row[]>(
        `SELECT "textFr","textEn" FROM "DailyMessage" ORDER BY RANDOM() LIMIT 1`,
      );
      if (any.length) {
        text = lang === 'en' ? (any[0].textEn || any[0].textFr) : any[0].textFr;
      }
    }

    return NextResponse.json({ day, text });
  } catch (e) {
    console.error('[api/daily-message]', e);
    return NextResponse.json({ day: 0, text: '' }, { status: 500 });
  }
}
