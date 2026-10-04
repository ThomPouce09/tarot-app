import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveLang } from '@/lib/lang';

// Message du jour (1-365) pour la pause repas. Pas de cache : jour courant.
export const dynamic = 'force-dynamic';

type Row = { textFr: string; textEn: string; textEs: string | null; textHi: string | null };

export async function GET(req: NextRequest) {
  const lang = resolveLang(req.nextUrl.searchParams.get('lang'));

  try {
    // Jour de l'année (1-365), stable toute la journée. Les années bissextiles
    // (jour 366) se replient sur le jour 1 pour couvrir tout le cycle.
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const doy = Math.floor((now.getTime() - start.getTime()) / 86400000); // 0-365
    const day = (doy % 365) + 1;

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `SELECT "textFr","textEn","textEs","textHi" FROM "DailyMessage" WHERE "day" = $1 LIMIT 1`, day,
    );

    const pick = (r: Row): string =>
      lang === 'en' ? (r.textEn || r.textFr)
      : lang === 'es' ? (r.textEs || r.textFr)
      : lang === 'hi' ? (r.textHi || r.textFr)
      : r.textFr;

    let text = '';
    if (rows.length) {
      text = pick(rows[0]);
    } else {
      // Sécurité : aucun enregistrement pour ce jour → on en pioche un au hasard.
      const any = await prisma.$queryRawUnsafe<Row[]>(
        `SELECT "textFr","textEn","textEs","textHi" FROM "DailyMessage" ORDER BY RANDOM() LIMIT 1`,
      );
      if (any.length) {
        text = pick(any[0]);
      }
    }

    return NextResponse.json({ day, text });
  } catch (e) {
    console.error('[api/daily-message]', e);
    return NextResponse.json({ day: 0, text: '' }, { status: 500 });
  }
}
