import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { pickReminderMessage, sealNotification, missYouNotification, INACTIVITY_DAYS } from '@/lib/reminder-messages';
import {
  inReminderBand, alreadySentToday, dueOnLocalDay, localDayKey, utcDayKey, DEFAULT_REMINDER_HOUR,
} from '@/lib/reminder-time';

export const dynamic = 'force-dynamic';

// ── Vercel Cron (plan Hobby : max 1 exécution/jour PAR job) ──────────────
// Le vercel.json déclare 24 jobs `30 H * * *` sur cette même route : chacun
// tourne une fois par jour, à H:30 UTC. À chaque exécution, on calcule pour
// chaque user si ce créneau correspond à ~18h30 dans son fuseau local
// (timezone IANA, DST gérée) → un rappel quotidien à l'heure locale de chacun,
// sans Vercel Pro. La date du jour UTC seede le message : tous les fuseaux
// reçoivent le même message le même jour (roulement aléatoire jour -> jour).
//
// L'heure de 18h30 est FIXE et identique pour tous : la page Préférences ne
// propose donc AUCUN réglage d'heure (ni de choix d'univers — le rappel doit
// faire découvrir les univers que le user ne pratique pas). Un seul
// interrupteur « rappel quotidien aléatoire » pilote tout.
//
// Deux notifications distinctes, un seul interrupteur :
//   1. le rappel du soir (18h30 locale) — roulement des 16 messages ;
//   2. le réengagement après INACTIVITY_DAYS jours sans tirage (« Vous nous
//      manquez »), envoyé aussi dans la fenêtre du soir pour respecter le
//      coucher de tout le monde.

const DAY = 24 * 60 * 60 * 1000;
const ECHO_GRACE_DAYS = 7; // fenêtre de rattrapage si l'envoi a échoué le jour J

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

  // now simulable (test local uniquement, garde CRON_SECRET en amont) :
  // header 'x-reminder-simulate-now: 2026-10-15T16:30:00Z'
  const sim = request.headers.get('x-reminder-simulate-now');
  const now = sim && !Number.isNaN(Date.parse(sim)) ? new Date(sim) : new Date();
  const dayKey = utcDayKey(now);

  // Filtre de test : ?user=email limite le scan à un seul compte.
  const testEmail = (request.nextUrl.searchParams.get('user') || '').trim().toLowerCase();

  // Tous les devices enregistrés : le rappel « oracle » exige dailyReminder,
  // les augures se notifyent dès qu'un token vit (comportement historique).
  const users = await prisma.user.findMany({
    where: { fcmToken: { not: null }, ...(testEmail ? { email: testEmail } : {}) },
    select: {
      email: true, firstName: true, fcmToken: true, timezone: true, language: true,
      dailyReminder: true, missYou: true, dailyReminderHour: true, lastReminderSentAt: true,
    },
  });

  let sent = 0, failed = 0, echoed = 0, eves = 0;
  const results: Record<string, string[]> = {};
  const push = (email: string, tag: string) => (results[email] = (results[email] || []).concat(tag));
  // Dédup PAR APPAREIL : un même token FCM peut être porté par plusieurs
  // comptes (2 comptes sur 1 téléphone). Le rappel du soir ne part qu'UNE fois
  // par token et par jour — sinon l'appareil reçoit deux notifications.
  const dailySentTokens = new Set<string>();
  const dayStamp = new Date();

  for (const u of users) {
    const tz = u.timezone || 'Europe/Paris';
    // Heure FIXE 18h30 locale pour tout le monde : ce n'est plus un réglage
    // utilisateur (la page Préférences n'expose plus d'heure).
    const hour = DEFAULT_REMINDER_HOUR;
    // Message du jour dans la langue du user (seed date => même # pour tous).
    const msg = pickReminderMessage(dayKey, u.language);

    // Fenêtre locale : ce créneau UTC correspond-il à ~l'heure locale choisie ?
    if (!inReminderBand(now, tz, hour)) continue;
    if (alreadySentToday(u.lastReminderSentAt, tz, now)) continue; // anti-doublon si band recoupée

    const token = u.fcmToken!;
    const killToken = async (err: any) => {
      if (String(err?.code || '').includes('registration-token-not-registered')) {
        await prisma.user.update({ where: { email: u.email }, data: { fcmToken: null } });
      }
    };

    // ── UN SEUL push par soir et par user ──────────────────────────────
    // Deux TEXTOINDEPS candidates (interrupteurs découplés en Préférences) :
    //  • le rappel du soir (roulement des 16 messages) — exige dailyReminder ;
    //  • le réengagement (« Vous nous manquez ») — exige missYou, envoyé quand
    //    le user n'a plus tiré depuis INACTIVITY_DAYS jours.
    // Le réengagement est PRIORITAIRE quand les deux sont actifs ; si le user
    // est actif, c'est le rappel du soir. JAMAIS les deux le même soir :
    // lastReminderSentAt sert d'horodatage commun et bloque le second envoi.
    if (u.dailyReminder || u.missYou) {
      const lastReading = await prisma.reading.findFirst({
        where: { user: { email: u.email } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      const idleDays = lastReading
        ? Math.floor((now.getTime() - lastReading.createdAt.getTime()) / DAY)
        : Infinity; // jamais tiré : considéré inactif
      const isIdle = idleDays >= INACTIVITY_DAYS;

      // Réengagement uniquement si l'interrupteur dédié est actif ; sinon on
      // retombe sur le rappel du soir (s'il est actif) — même inactif.
      const useMissYou = isIdle && u.missYou;
      const chosen = useMissYou
        ? (() => {
            const m = missYouNotification(localDayKey(tz, now), u.language);
            return { title: m.title, body: m.body, url: '/', kind: 'missyou' as const };
          })()
        : { title: msg.title, body: msg.body, url: msg.url, kind: 'daily' as const };
      // Le soir : dailyReminder éteint mais inactif sans missYou → rien à envoyer.
      const sendIt = useMissYou || u.dailyReminder;
      if (sendIt) {

      if (dailySentTokens.has(token)) {
        // Ce téléphone a déjà reçu SON rappel ce soir (autre compte) : on
        // n'envoie pas un second push, mais on horodate ce compte pour qu'il
        // soit aussi bloqué sur les créneaux suivants du bandeau.
        await prisma.user.update({ where: { email: u.email }, data: { lastReminderSentAt: dayStamp } });
        push(u.email, 'daily-dedup');
      } else {
        try {
          await messaging.send({
            token,
            notification: { title: chosen.title, body: chosen.body },
            data: { url: chosen.url, kind: chosen.kind },
            android: { priority: 'high' as const },
          });
          dailySentTokens.add(token);
          await prisma.user.update({ where: { email: u.email }, data: { lastReminderSentAt: dayStamp } });
          sent++; push(u.email, chosen.kind);
        } catch (e: any) {
          failed++; push(u.email, `${chosen.kind}-fail`); await killToken(e);
        }
      }
      }
    }

    // 2) Augures de l'utilisateur : « le sceau se brise » (jour J) et la veille.
    //    Une seule requête : toutes les augures scellées à échoir sous peu,
    //    filtrées en mémoire (un user n'en a que quelques-unes).
    //    Fenêtre glissante <= 7 j de rattrapage si l'envoi du jour J a échoué.
    const todayKey = localDayKey(tz, now);
    const tomorrowKey = localDayKey(tz, new Date(now.getTime() + DAY));
    const pending = await prisma.echo.findMany({
      where: {
        verdict: null,
        dueAt: { gte: new Date(now.getTime() - ECHO_GRACE_DAYS * DAY), lte: new Date(now.getTime() + 2 * DAY) },
        user: { email: u.email },
      },
      orderBy: { dueAt: 'asc' },
      select: { id: true, domain: true, dueAt: true, notified: true, eveNotified: true },
    });
    const due = pending.find((e) => !e.notified && e.dueAt <= now && dueOnLocalDay(e.dueAt, tz, todayKey)) || null;
    const tomorrow = pending.find((e) => !e.eveNotified && e.dueAt > now && dueOnLocalDay(e.dueAt, tz, tomorrowKey)) || null;

    if (due) {
      const seal = sealNotification('due', u.language, u.firstName);
      try {
        await messaging.send({
          token,
          notification: { title: seal.title, body: seal.body },
          data: { url: '/dashboard/account/echoes', kind: 'echo_due' },
          android: { priority: 'high' as const },
        });
        await prisma.echo.update({ where: { id: due.id }, data: { notified: true } });
        echoed++; push(u.email, 'echo');
      } catch (e: any) { failed++; push(u.email, 'echo-fail'); await killToken(e); }
    }

    // 3) Augure de demain — la veille, dans la même fenêtre locale.
    if (tomorrow) {
      const seal = sealNotification('eve', u.language, u.firstName);
      try {
        await messaging.send({
          token,
          notification: { title: seal.title, body: seal.body },
          data: { url: '/dashboard/account/echoes', kind: 'echo_eve' },
          android: { priority: 'high' as const },
        });
        await prisma.echo.update({ where: { id: tomorrow.id }, data: { eveNotified: true } });
        eves++; push(u.email, 'eve');
      } catch (e: any) { failed++; push(u.email, 'eve-fail'); await killToken(e); }
    }
  }

  return NextResponse.json({
    utcHour: now.getUTCHours(), dayKey,
    message: `jour #${(pickReminderMessage(dayKey)).index + 1}/16 (langue par user)`,
    scanned: users.length, sent, failed, echoed, eves, results,
  });
}
