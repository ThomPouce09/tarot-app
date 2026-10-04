// app/api/debug/semaine-fixture/route.ts
// DIAGNOSTIC (dév seulement) : préparer des roues « Arcanes de la Semaine »
// dans des états de calendrier précis pour tester le cycle complet sans
// attendre de vraies semaines.
//   GET ?email=&action=status            → toutes les roues + classification
//   GET ?email=&action=seed&daysAgo=8    → roue posée il y a N jours (7 jours
//                                          écoulés, fil rouge tissé, non scellée)
//   GET ...&sealed=1                     → + augure scellé (echo)
//   GET ?email=&action=wipe              → supprime les roues du compte
// NODE_ENV !== development → 404 (jamais actif sur Vercel prod).
// Scénarios de test (grâce = 5 j après le jour 7 → périmée à 12 j) :
//   daysAgo=0  → roue en cours (jour 1)         → animation + cartes
//   daysAgo=7  → semaine bouclée, dans la grâce → fil rouge + « Le sceller » + CTA roue suivante
//   daysAgo=11 → dernier jour de grâce          → idem
//   daysAgo=12 → périmée non scellée            → masquée, CTA « Poser la roue » direct
//   daysAgo=30&sealed=1 → scellée jamais périmée → bilan dû reste affiché

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TAROT_CARDS } from '@/lib/tarot-data';

export const dynamic = 'force-dynamic';

const DAY_MS = 86400000;
const sod = (t: number | string | Date) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

async function findUser(email: string) {
  return prisma.user.findUnique({
    where: { email: String(email || '').trim().toLowerCase() },
    select: { id: true },
  });
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const q = request.nextUrl.searchParams;
  const email = String(q.get('email') || '').trim().toLowerCase();
  const action = String(q.get('action') || 'status');
  const user = await findUser(email);
  if (!user) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });

  if (action === 'wipe') {
    const del = await prisma.reading.deleteMany({ where: { userId: user.id, type: 'tarot-semaine' } });
    return NextResponse.json({ ok: true, deleted: del.count });
  }

  if (action === 'seed') {
    const daysAgo = Math.max(0, Math.min(400, Number(q.get('daysAgo') || 0)));
    const sealed = q.get('sealed') === '1';
    const castAt = new Date(Date.now() - daysAgo * DAY_MS);
    // 7 arcanes distincts, toujours les mêmes pour repérer ses tests.
    const cards = [0, 3, 7, 11, 15, 19, 21];
    const days = cards.map((_, i) => ({ fr: `Éclat de test ${i + 1}`, en: `Test light ${i + 1}` }));
    const st = {
      castAt: castAt.toISOString(),
      cards,
      revealed: [],
      days,
      filRouge: { fr: 'Fil rouge de test — tisse patience et audace cette semaine.', en: 'Test thread — weave patience and daring this week.' , es: "Hilo rojo de prueba — teje paciencia y atrevimiento esta semana.", hi: "परीक्षा का लाल धागा — इस सप्ताह धैर्य और साहस को बुनो।"},
    };
    const reading = await prisma.reading.create({
      data: {
        userId: user.id, type: 'tarot-semaine', createdAt: castAt,
        spread: 'Roue des 7 jours (fixture)',
        cards: JSON.stringify(cards.map((id) => ({ id, name: TAROT_CARDS[id]?.name }))),
        interpretation: JSON.stringify(st),
      },
    });
    if (sealed) {
      await prisma.echo.create({
        data: {
          userId: user.id, readingId: reading.id,
          textFr: st.filRouge.fr, textEn: st.filRouge.en,
          domain: 'tarot',
          dueAt: new Date(castAt.getTime() + 7 * DAY_MS),
        },
      });
    }
    return NextResponse.json({ ok: true, readingId: reading.id, daysAgo, sealed });
  }

  // status : classification de chaque roue, comme le GET principal.
  const readings = await prisma.reading.findMany({
    where: { userId: user.id, type: 'tarot-semaine' },
    orderBy: { createdAt: 'desc' },
    include: { echo: true },
  });
  const rows = readings.map((r) => {
    let st: any = {};
    try { st = JSON.parse(r.interpretation || '{}'); } catch {}
    const idx = st.castAt ? Math.floor((sod(Date.now()) - sod(st.castAt)) / DAY_MS) : -1;
    return {
      id: r.id.slice(-6), castAt: st.castAt?.slice(0, 10) ?? '?', dayIndex: idx,
      archived: !!st.archived, echo: !!r.echo,
      state: r.echo ? (r.echo.verdict ? 'bilan consigné' : 'scellée — bilan dû')
        : idx < 7 ? 'roue en cours'
        : idx < 12 ? 'finie — dans la grâce (sceau possible)'
        : 'PÉRIMÉE (masquée)',
    };
  });
  return NextResponse.json({ email, wheels: rows });
}
