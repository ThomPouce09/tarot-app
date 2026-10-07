import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { giftCooldownOk, type GiftKind } from '@/lib/gift';

// Pas de cache : on veut un tirage aléatoire à chaque appel
export const dynamic = 'force-dynamic';

type CreatureRow = { id: string; slug: string; name: string; image: string; color: string | null };
type MessageRow = { category: string; textFr: string; textEn: string | null; textEs: string | null; textHi: string | null };

/** Famille « cadeau » : le message annonce un tirage offert. `credits` = les
 *  messages historiques (tirages de base) ; `credits_base` / `credits_grand` =
 *  les deux filières explicites (billets distincts). */
const isGiftCategory = (c: string) =>
  c === 'credits' || c === 'credits_base' || c === 'credits_grand';
/** Type de tirage annoncé par le message cadeau (défaut : base). */
const giftKindOf = (c: string): GiftKind => (c === 'credits_grand' ? 'grand' : 'base');

/** Texte du message dans la langue demandée (fallback fr). */
const pickText = (m: MessageRow, lang: 'en' | 'es' | 'hi' | 'fr'): string =>
  (lang === 'en' ? m.textEn : lang === 'es' ? m.textEs : lang === 'hi' ? m.textHi : m.textFr) || m.textFr || '';

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') || 'landing';
  const langRaw = req.nextUrl.searchParams.get('lang');
  const lang = langRaw === 'en' || langRaw === 'es' || langRaw === 'hi' ? langRaw : 'fr';
  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();

  try {
    // Un message « Cadeau » n'est proposé que si l'utilisateur peut réellement
    // le réclamer : cooldown aléatoire 3-4 jours écoulé (giftNextOkAt), tout
    // type confondu (cf. lib/gift.ts).
    let giftOfferable = false;
    if (email) {
      const u = await prisma.usage.findFirst({
        where: { user: { email } },
        select: { giftLastAt: true, giftNextOkAt: true },
      });
      giftOfferable = giftCooldownOk(u?.giftLastAt ?? null, u?.giftNextOkAt ?? null);
    }

    // Créature de la page courante. Les messages sont portés par la page :
    // une même créature peut en couvrir plusieurs via ses rangées dédiées.
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

    // Messages de la page courante pour cette créature. En l'absence de cadeau
    // réclamable, on évite de promettre un « Cadeau » non actionnable → on
    // pioche un message normal.
    const all = await prisma.$queryRawUnsafe<MessageRow[]>(
      `SELECT m."category", m."textFr", m."textEn", m."textEs", m."textHi"
         FROM "CreatureMessage" m
        WHERE m."creatureId" = $1 AND m."page" = $2
        ORDER BY RANDOM()`,
      c.id, page,
    );
    if (!all.length) {
      return NextResponse.json({ creature: null, message: null });
    }
    const pool = giftOfferable ? all : all.filter((m) => !isGiftCategory(m.category));
    const m = (pool.length ? pool : all)[0];
    const giftClaimable = giftOfferable && isGiftCategory(m.category);

    const text = pickText(m, lang);

    return NextResponse.json({
      creature: { id: c.id, slug: c.slug, name: c.name, image: c.image, color: c.color },
      message: m
        ? {
            category: m.category,
            text,
            giftClaimable: giftClaimable || undefined,
            // Type de tirage offert → billet crédité + son de gain :
            // cadeau (base) / you-win (grand).
            giftKind: giftClaimable ? giftKindOf(m.category) : undefined,
          }
        : null,
    });
  } catch (e) {
    console.error('[api/creature]', e);
    return NextResponse.json({ creature: null, message: null, error: 'db' }, { status: 500 });
  }
}
