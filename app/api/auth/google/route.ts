import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { daysSince, DELETION_GRACE_DAYS } from '@/lib/dates';
import { resolveLang, authMsg, localDate, durationPhrase } from '@/lib/lang';
import { signSession, SESSION_COOKIE } from '@/lib/session';
import { hashDeviceToken } from '@/lib/device';
import { verifyGoogleIdToken, GoogleTokenError, googleNames } from '@/lib/google';

export const dynamic = 'force-dynamic';

function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    gender: u.gender,
    age: u.age,
    dateOfBirth: u.dateOfBirth,
    comment: u.comment,
    confirmed: u.confirmed,
    createdAt: u.createdAt,
    token: u.confirmationToken || 'authenticated',
  };
}

// ── Connexion/inscription via Google ────────────────────────────────────
// POST { credential, deviceToken?, lang? } — `credential` = ID token Google
// (bouton GSI). Vérification SERVEUR (signature + audience + email vérifié),
// JAMAIS d'access/refresh token stocké.
//
// Règles :
//   • Email Google déjà connu (inscrit par mot de passe)  → CONNEXION directe.
//     L'email Google étant prouvé chez Google, pas de mot de passe exigé.
//   • Compte en tombeau (deletedAt) → refus 403 avec la même garde de 40 jours
//     que l'inscription classique.
//   • Email inconnu → CRÉATION : compte confirmé d'office, prénom/nom repris
//     du jeton, date de naissance volontairement absente (l'activation Oracle
//     la demandera — contrôle 16+ comme les autres comptes). Mot de passe =
//     random scellé (champ NOT NULL, connexion par mot de passe rendue
//     impossible pour un compte Google).
//   • Jeton d'appareil : 3e compte créé sur le même appareil dans l'année →
//     pas de pack de bienvenue (parité exacte avec l'inscription email).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const lang = resolveLang(body.lang);
    const credential = String(body.credential || '');
    if (!credential) {
      return NextResponse.json(
        { error: authMsg('googleFailed', lang), code: 'GOOGLE_TOKEN' },
        { status: 400 },
      );
    }

    // ── Vérification du jeton Google (serveur) ──
    let g;
    try {
      g = await verifyGoogleIdToken(credential);
    } catch (err: any) {
      if (err instanceof GoogleTokenError) {
        return NextResponse.json(
          { error: authMsg('googleFailed', lang), code: 'GOOGLE_TOKEN' },
          { status: 401 },
        );
      }
      // Erreur interne (config manquante, réseau Google) : message neutre.
      console.error('[google-auth] verify error:', err?.message);
      return NextResponse.json(
        { error: authMsg('googleFailed', lang), code: 'GOOGLE_TOKEN' },
        { status: 500 },
      );
    }

    // ── Anti-abus : jeton d'appareil (HMAC), comme l'inscription email ──
    const devHash = hashDeviceToken(String(body.deviceToken || ''));

    const existing = await prisma.user.findUnique({ where: { email: g.email } });

    if (existing) {
      if (existing.deletedAt) {
        const elapsed = daysSince(existing.deletedAt);
        if (elapsed < DELETION_GRACE_DAYS) {
          const remaining = DELETION_GRACE_DAYS - elapsed;
          const untilLabel = localDate(existing.deletedAt.getTime() + DELETION_GRACE_DAYS * 86400000, lang);
          return NextResponse.json(
            {
              error: authMsg('deletedLogin', lang, { date: untilLabel, n: durationPhrase(remaining, lang) }),
              code: 'ACCOUNT_DELETED',
              remainingDays: remaining,
            },
            { status: 403 },
          );
        }
        // Tombeau expiré : purge puis création d'un compte neuf (parité signup).
        await prisma.$transaction([
          prisma.reading.deleteMany({ where: { userId: existing.id } }),
          prisma.subscription.deleteMany({ where: { userId: existing.id } }),
          prisma.usage.deleteMany({ where: { userId: existing.id } }),
          prisma.user.delete({ where: { id: existing.id } }),
        ]);
      } else {
        // CONNEXION. Si le compte email n'avait jamais été activé, Google
        // prouve l'adresse → on confirme (sinon le user resterait bloqué).
        if (!existing.confirmed) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { confirmed: true, confirmationToken: null },
          });
          existing.confirmed = true;
          existing.confirmationToken = null;
        }
        const resp = NextResponse.json({
          success: true,
          isNew: false,
          session: signSession(existing.email),
          user: publicUser(existing),
        });
        resp.cookies.set(SESSION_COOKIE, signSession(existing.email), {
          httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 30 * 24 * 3600,
        });
        return resp;
      }
    }

    // ── CRÉATION d'un compte Google ──
    const { firstName, lastName } = googleNames(g);
    const WELCOME_DEVICE_LIMIT = 2;
    const WELCOME_DEVICE_WINDOW_DAYS = 365;
    let welcomeSuppressed = false;
    if (devHash) {
      const since = new Date(Date.now() - WELCOME_DEVICE_WINDOW_DAYS * 86400000);
      const sameDevice = await prisma.user.count({
        where: { deviceTokenHash: devHash, createdAt: { gte: since } },
      });
      welcomeSuppressed = sameDevice >= WELCOME_DEVICE_LIMIT;
    }

    // Mot de passe aléatoire scellé : le champ reste NOT NULL et la connexion
    // par mot de passe devient mathématiquement impossible pour ce compte.
    const hashed = await (bcrypt as any).hash('google:' + randomBytes(24).toString('hex'), 12);

    const user = await prisma.user.create({
      data: {
        email: g.email,
        password: hashed,
        firstName: firstName || null,
        lastName: lastName || null,
        gender: null,
        dateOfBirth: null,
        age: null,
        confirmed: true,
        deviceTokenHash: devHash || null,
        ...(welcomeSuppressed ? {
          usage: { create: { welcomeBaseUsed: ['tarot', 'yijing', 'des', 'runes'], welcomeGrandUsed: true } },
        } : {}),
      },
    });

    const resp = NextResponse.json({
      success: true,
      isNew: true,
      welcomeSuppressed,
      session: signSession(user.email),
      user: publicUser(user),
    });
    resp.cookies.set(SESSION_COOKIE, signSession(user.email), {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 30 * 24 * 3600,
    });
    return resp;
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
