import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { giftCooldownOk } from '@/lib/gift';

// Pas de cache : on veut un tirage aléatoire à chaque appel
export const dynamic = 'force-dynamic';

type CreatureRow = { id: string; slug: string; name: string; image: string; color: string | null };
type MessageRow = { category: string; textFr: string; textEn: string | null };

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') || 'landing';
  const lang = req.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'fr';
  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();

  try {
    // Un message « Cadeau » (category credits) n'est proposé que si l'utilisateur
    // peut réellement le réclamer (rare : max 1 fois / 5 jours, cf. lib/gift.ts).
    let giftOfferable = false;
    if (email) {
      const u = await prisma.usage.findFirst({
        where: { user: { email } },
        select: { giftLastAt: true },
      });
      giftOfferable = giftCooldownOk(u?.giftLastAt ?? null);
    }

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

    // Messages de la créature. En l'absence de cadeau réclamable, on évite de
    // promettre un « Cadeau » non actionnable → on pioche un message normal.
    const all = await prisma.$queryRawUnsafe<MessageRow[]>(
      `SELECT "category","textFr","textEn"
         FROM "CreatureMessage"
        WHERE "creatureId" = $1
        ORDER BY RANDOM()`,
      c.id,
    );
    if (!all.length) {
      return NextResponse.json({ creature: null, message: null });
    }
    const pool = giftOfferable ? all : all.filter((m) => m.category !== 'credits');
    const m = (pool.length ? pool : all)[0];
    const giftClaimable = giftOfferable && m.category === 'credits';

    const text = lang === 'en' ? (m?.textEn || m?.textFr || '') : (m?.textFr || '');

    return NextResponse.json({
      creature: { id: c.id, slug: c.slug, name: c.name, image: c.image, color: c.color },
      message: m ? { category: m.category, text, giftClaimable: giftClaimable || undefined } : null,
    });
  } catch (e) {
    console.error('[api/creature]', e);
    return NextResponse.json({ creature: null, message: null, error: 'db' }, { status: 500 });
  }
}
