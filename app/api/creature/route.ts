import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Pas de cache : on veut un tirage aléatoire à chaque appel
export const dynamic = 'force-dynamic';

type CreatureRow = { id: string; slug: string; name: string; image: string; color: string | null };
type MessageRow = { category: string; textFr: string; textEn: string | null };

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') || 'landing';
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'fr';

  try {
    const creatures = await prisma.$queryRawUnsafe<CreatureRow[]>(
      `SELECT "id","slug","name","image","color"
         FROM "Creature"
        WHERE "page" = $1 AND "active" = true
        ORDER BY RANDOM()
        LIMIT 1`,
      page,
    );

    if (!creatures.length) {
      return NextResponse.json({ creature: null, message: null });
    }

    const c = creatures[0];
    const msgs = await prisma.$queryRawUnsafe<MessageRow[]>(
      `SELECT "category","textFr","textEn"
         FROM "CreatureMessage"
        WHERE "creatureId" = $1
        ORDER BY RANDOM()
        LIMIT 1`,
      c.id,
    );

    const m = msgs[0];
    const text = lang === 'en' ? (m?.textEn || m?.textFr || '') : (m?.textFr || '');

    return NextResponse.json({
      creature: { id: c.id, slug: c.slug, name: c.name, image: c.image, color: c.color },
      message: m ? { category: m.category, text } : null,
    });
  } catch (e) {
    console.error('[api/creature]', e);
    return NextResponse.json({ creature: null, message: null, error: 'db' }, { status: 500 });
  }
}
