// app/api/debug/daily-draw/route.ts
// DIAGNOSTIC (dév seulement) : (ré)initialiser l'Hexagramme du Jour d'un compte
// pour rejouer le tirage (consentement → débit → IA) autant de fois que nécessaire
// sans attendre le lendemain.
//   GET ?email=&action=status → ligne du jour (conseil stocké, mutantes)
//   GET ?email=&action=wipe   → supprime la ligne du jour (le sceau se repose)
//                               + ?all=1 pour vider toute la collection du compte
//   GET ?email=&action=refund → rend la base consommée par ce tirage (débogage
//                               intensif : wipe+refund = replay gratuit)
// NODE_ENV !== development → 404 (jamais actif sur Vercel prod).
// Après un wipe : recharger /yi-jing-du-jour → le sceau réapparaît, un nouveau
// tap débite une base (le compteur du mois reste consommé ; utiliser refund
// pour l'annuler) et régénère le conseil IA. À retirer après le débogage si souhaité.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dayKey } from '@/lib/yi-daily';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const action = searchParams.get('action') || 'status';
  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });

  const today = dayKey();
  if (action === 'status') {
    const row = await prisma.dailyDrawView.findUnique({ where: { email_date: { email, date: today } } });
    return NextResponse.json({ email, date: today, drawn: !!row, mutating: row?.mutating ?? null, advice: row?.advice ?? null });
  }
  if (action === 'wipe') {
    const all = searchParams.get('all') === '1';
    const del = all
      ? await prisma.dailyDrawView.deleteMany({ where: { email } })
      : await prisma.dailyDrawView.deleteMany({ where: { email, date: today } });
    // Rembourse la base mensuelle consommée par le(s) tirage(s) supprimé(s)
    // (débogage : rejouer à volonté sans entamer le quota).
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    let refunded = 0;
    if (user && del.count > 0) {
      const usage = await prisma.usage.findUnique({ where: { userId: user.id } });
      if (usage && usage.baseUsedMonth > 0) {
        const back = Math.min(del.count, usage.baseUsedMonth);
        await prisma.usage.update({ where: { userId: user.id }, data: { baseUsedMonth: usage.baseUsedMonth - back } });
        refunded = back;
      }
    }
    return NextResponse.json({ ok: true, email, deleted: del.count, refunded, scope: all ? 'collection' : 'today' });
  }
  return NextResponse.json({ error: 'action inconnue' }, { status: 400 });
}
