// lib/google-account.ts — Résolution de compte Google partagée (web GSI + natif
// PKCE). Un seul chemin d'inscription/connexion, mêmes règles anti-abus que
// l'inscription email (tombeau 40 j, 3e compte appareil = pack bienvenue sec).

import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { daysSince, DELETION_GRACE_DAYS } from '@/lib/dates';
import type { GoogleIdentity } from './google';

export function publicUser(u: any) {
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

export type GoogleAccountResult =
  | { kind: 'deleted'; remainingDays: number; deletedAt: Date }
  | { kind: 'connected'; user: any }
  | { kind: 'created'; user: any; welcomeSuppressed: boolean };

export async function resolveGoogleAccount(
  g: GoogleIdentity,
  devHash: string | null,
): Promise<GoogleAccountResult> {
  const existing = await prisma.user.findUnique({ where: { email: g.email } });

  if (existing) {
    if (existing.deletedAt) {
      const elapsed = daysSince(existing.deletedAt);
      if (elapsed < DELETION_GRACE_DAYS) {
        return { kind: 'deleted', remainingDays: DELETION_GRACE_DAYS - elapsed, deletedAt: existing.deletedAt };
      }
      // Tombeau expiré : purge puis création (parité signup email).
      await prisma.$transaction([
        prisma.reading.deleteMany({ where: { userId: existing.id } }),
        prisma.subscription.deleteMany({ where: { userId: existing.id } }),
        prisma.usage.deleteMany({ where: { userId: existing.id } }),
        prisma.user.delete({ where: { id: existing.id } }),
      ]);
    } else {
      // Liaison douce : email Google prouvé → active un compte jamais confirmé.
      if (!existing.confirmed) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { confirmed: true, confirmationToken: null },
        });
        existing.confirmed = true;
        existing.confirmationToken = null;
      }
      return { kind: 'connected', user: existing };
    }
  }

  // ── Création ──
  const first = g.firstName || (g.email.split('@')[0] || '').slice(0, 40) || null;
  const last = g.lastName || null;

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

  // Mot de passe aléatoire scellé : NOT NULL respecté, connexion par mot de
  // passe rendue impossible pour un compte Google.
  const hashed = await (bcrypt as any).hash('google:' + randomBytes(24).toString('hex'), 12);

  const user = await prisma.user.create({
    data: {
      email: g.email,
      password: hashed,
      firstName: first,
      lastName: last,
      gender: null,
      dateOfBirth: null,
      age: null,
      confirmed: true, // email prouvé par Google
      deviceTokenHash: devHash || null,
      ...(welcomeSuppressed ? {
        usage: { create: { welcomeBaseUsed: ['tarot', 'yijing', 'des', 'runes'], welcomeGrandUsed: true } },
      } : {}),
    },
  });
  return { kind: 'created', user, welcomeSuppressed };
}
