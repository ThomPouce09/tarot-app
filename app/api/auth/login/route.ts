import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { daysSince, DELETION_GRACE_DAYS } from '@/lib/dates';
import { resolveLang, authMsg, localDate, durationPhrase } from '@/lib/lang';
import { signSession, SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password, lang: rawLang } = await request.json();
    const lang = resolveLang(rawLang);

    if (!email || !password) {
      return NextResponse.json({ error: authMsg('missing', lang) }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: authMsg('bad', lang) }, { status: 401 });
    }

    // Compte supprimé (tombeau) : garde anti-reconnexion de 40 jours.
    if (user.deletedAt) {
      const elapsed = daysSince(user.deletedAt);
      if (elapsed < DELETION_GRACE_DAYS) {
        const remaining = DELETION_GRACE_DAYS - elapsed;
        const untilLabel = localDate(user.deletedAt.getTime() + DELETION_GRACE_DAYS * 86400000, lang);
        return NextResponse.json(
          {
            error: authMsg('deletedLogin', lang, { date: untilLabel, n: durationPhrase(remaining, lang) }),
            code: 'ACCOUNT_DELETED',
            remainingDays: remaining,
          },
          { status: 403 }
        );
      }
      // Les 40 jours passés : purge le tombeau, le compte est définitivement supprimé.
      await prisma.$transaction([
        prisma.reading.deleteMany({ where: { userId: user.id } }),
        prisma.subscription.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
      return NextResponse.json({ error: authMsg('bad', lang) }, { status: 401 });
    }

    const isValid = await (bcrypt as any).compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: authMsg('bad', lang) }, { status: 401 });
    }

    const resp = NextResponse.json({
      success: true,
      session: signSession(user.email),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        age: user.age,
        dateOfBirth: user.dateOfBirth,
        phone: user.phone,
        comment: user.comment,
        confirmed: user.confirmed,
        createdAt: user.createdAt,
        token: user.confirmationToken || 'authenticated',
      },
    });
    // Cookie same-origin pour le web (repli) ; l'APK utilise le jeton JSON
    // (X-Session) — la WebView bloque les cookies tiers cross-site.
    resp.cookies.set(SESSION_COOKIE, signSession(user.email), {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 30 * 24 * 3600,
    });
    return resp;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 });
  }
}
