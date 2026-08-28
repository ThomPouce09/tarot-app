import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildLetterData, renderLetter } from '@/lib/letter';
import { mailer, MAIL_FROM } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Vercel Cron → envoyer la "Lettre mystique" hebdo aux users abonnés.
// Sécurisé par le header Authorization: Bearer $CRON_SECRET (fourni par Vercel).
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const subscribers = await prisma.user.findMany({
    where: { emailNews: true },
    select: { email: true, firstName: true, lastLetterSentAt: true },
  });

  const now = Date.now();
  const results: Record<string, 'sent' | 'skip' | 'fail'> = {};
  let sent = 0;

  for (const u of subscribers) {
    // Anti-doublon : au max 1 lettre / semaine.
    if (u.lastLetterSentAt && now - new Date(u.lastLetterSentAt).getTime() < WEEK_MS) {
      results[u.email] = 'skip';
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

  return NextResponse.json({ sent, skipped: subscribers.length - sent - Object.values(results).filter((r) => r === 'fail').length, results });
}
