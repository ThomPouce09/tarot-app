import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Préférences persistées (serveur) : lettre mystique hebdo + rappel quotidien.
// Le front lit/écrit aussi localStorage pour la réactivité instantanée ; ce
// endpoint fait foi côté serveur (cron lettre + rappel push).
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  return NextResponse.json({
    emailNews: user.emailNews,
    dailyReminder: user.dailyReminder,
    dailyReminderHour: user.dailyReminderHour,
    lastLetterSentAt: user.lastLetterSentAt ? user.lastLetterSentAt.toISOString() : null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body?.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (typeof body.emailNews === 'boolean') data.emailNews = body.emailNews;
    if (typeof body.dailyReminder === 'boolean') data.dailyReminder = body.dailyReminder;
    if (typeof body.dailyReminderHour === 'number' && body.dailyReminderHour >= 0 && body.dailyReminderHour <= 23) {
      data.dailyReminderHour = Math.floor(body.dailyReminderHour);
    }
    if (typeof body.fcmToken === 'string' && body.fcmToken.trim()) data.fcmToken = body.fcmToken.trim();
    if (body.fcmToken === null) data.fcmToken = null; // retirer le token (déconnexion)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
    }

    const updated = await prisma.user.update({ where: { email }, data });
    return NextResponse.json({
      success: true,
      emailNews: updated.emailNews,
      dailyReminder: updated.dailyReminder,
      dailyReminderHour: updated.dailyReminderHour,
    });
  } catch (error) {
    console.error('/api/prefs error:', error);
    return NextResponse.json({ error: 'Échec enregistrement' }, { status: 500 });
  }
}
