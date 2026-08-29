import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export const dynamic = 'force-dynamic';

const HOUR = 60 * 60 * 1000;

// Initialise le SDK admin Firebase si la config est présente (Vercel envs).
function getMessagingSafe() {
  const creds = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
  if (!creds.projectId || !creds.clientEmail || !creds.privateKey) return null;
  try {
    const app = getApps().length ? getApp() : initializeApp({ credential: cert(creds as any) });
    return getMessaging(app);
  } catch (e) {
    console.error('[cron/reminder] Firebase init error:', e);
    return null;
  }
}

// Vercel Cron → notification quotidienne de rappel de tirage.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const messaging = getMessagingSafe();
  if (!messaging) {
    return NextResponse.json({ error: 'Firebase non configuré (FIREBASE_* manquants)' }, { status: 503 });
  }

  const users = await prisma.user.findMany({
    where: {
      dailyReminder: true,
      fcmToken: { not: null },
    },
    select: { email: true, firstName: true, fcmToken: true },
  });

  const now = new Date();
  let sent = 0, failed = 0;
  const results: Record<string, 'sent' | 'fail'> = {};

  for (const u of users) {
    const message = {
      token: u.fcmToken!,
      notification: {
        title: '✨ L\'Oracle vous attend',
        body: `${u.firstName || 'Cher·ère consultante'}, un tirage du jour vous révèlera sa lumière.`,
      },
      data: { url: '/yi-jing-du-jour' },
      android: { priority: 'high' as const },
    };

    try {
      await messaging.send(message);
      sent++;
      results[u.email] = 'sent';
    } catch (e: any) {
      // Token invalide (app désinstallée) → on le nettoie.
      if (e?.code === 'messaging/registration-token-not-registered') {
        await prisma.user.update({ where: { email: u.email }, data: { fcmToken: null } });
      }
      failed++;
      results[u.email] = 'fail';
    }
  }

  return NextResponse.json({ hour: now.getHours(), sent, failed, results });
}
