import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildLetterData, renderLetter } from '@/lib/letter';
import { mailer, MAIL_FROM } from '@/lib/mailer';
import { tzOffsetMinutes } from '@/lib/reminder-time';

export const dynamic = 'force-dynamic';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ── Envoi de la « Lettre mystique » hebdo ────────────────────────────────
// Objectif : DIMANCHE ~12h HEURE LOCALE de chaque destinataire (fin de
// semaine), sans Vercel Pro. On déclare donc plusieurs jobs cron le dimanche
// (voir vercel.json) ; à chaque exécution on ne sert que les users dont le
// fuseau est actuellement dans la bande de midi local.
//
// La page Préférences n'affiche AUCUNE heure : l'utilisateur sait seulement
// « le dimanche ». Anti-doublon : au plus 1 lettre / semaine / user.
const BAND_TOLERANCE_MIN = 90; // ±1h30 : marge large sur la dérive des crons Hobby

function inNoonBand(nowUTC: Date, tz: string): boolean {
  const off = tzOffsetMinutes(tz, nowUTC);
  const wall = new Date(nowUTC.getTime() + off * 60000); // horloge locale du user
  wall.setUTCHours(12, 0, 0, 0);                          // midi local visé
  const target = new Date(wall.getTime() - off * 60000);  // retour en UTC réel
  const DAY = 24 * 60 * 60 * 1000;
  let best = Infinity;
  for (const k of [-1, 0, 1]) {
    const d = Math.abs(nowUTC.getTime() - (target.getTime() + k * DAY)) / 60000;
    if (d < best) best = d;
  }
  return best <= BAND_TOLERANCE_MIN;
}

// Sécurisé par le header Authorization: Bearer ${CRON_SECRET} (fourni par Vercel).
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // now simulable (tests locaux uniquement, le CRON_SECRET reste exigé avant).
  const sim = request.headers.get('x-letter-simulate-now');
  const now = sim && !Number.isNaN(Date.parse(sim)) ? new Date(sim) : new Date();

  // Filtre de test : ?user=email limite le scan à un seul compte.
  const testEmail = (request.nextUrl.searchParams.get('user') || '').trim().toLowerCase();

  const subscribers = await prisma.user.findMany({
    where: { emailNews: true, ...(testEmail ? { email: testEmail } : {}) },
    select: { email: true, firstName: true, lastLetterSentAt: true, timezone: true },
  });

  const results: Record<string, 'sent' | 'skip' | 'fail' | 'off-band'> = {};
  let sent = 0, offBand = 0;

  for (const u of subscribers) {
    // Anti-doublon : au max 1 lettre / semaine.
    if (u.lastLetterSentAt && now.getTime() - new Date(u.lastLetterSentAt).getTime() < WEEK_MS) {
      results[u.email] = 'skip';
      continue;
    }
    // Bande de midi local : les autres exécutions du dimanche passent leur tour.
    const tz = u.timezone || 'Europe/Paris';
    if (!inNoonBand(now, tz)) {
      results[u.email] = 'off-band';
      offBand++;
      continue;
    }
    try {
      const data = await buildLetterData(u.email);
      if (!data) { results[u.email] = 'fail'; continue; }
      await mailer.sendMail({
        from: MAIL_FROM,
        to: u.email,
        subject: `Votre lettre mystique — ${u.firstName || 'cher·ère consultante'}`,
        html: renderLetter(data),
      });
      await prisma.user.update({
        where: { email: u.email },
        data: { lastLetterSentAt: new Date() },
      });
      results[u.email] = 'sent';
      sent++;
    } catch (err) {
      console.error('[cron/letters] fail', u.email, err);
      results[u.email] = 'fail';
    }
  }

  return NextResponse.json({ sent, offBand, scanned: subscribers.length, results });
}
