// lib/gift.ts — Cadeau des créatures : tirage offert rare.
// Un ticket cadeau = 1 tirage gratuit de n'importe quel type (base ou grand),
// consommé par l'entitlement AVANT les bonus/crédits de recharge.
// Rareté : une offre de cadeau n'est réclamable qu'une fois tous les 5 jours
// (l'API créature ne propose le message-cadeau que si le cooldown est passé).

import { prisma } from './prisma';

/** Intervalle minimum entre deux cadeaux réclamés : 5 jours. */
export const GIFT_COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * Validité d'un ticket cadeau : 5 jours après sa réclamation.
 * Un tirage offert non utilisé expire au bout de 5 jours (même fenêtre que le
 * cooldown de réclamation : l'offre et le prochain cadeau se succèdent).
 */
export const GIFT_VALIDITY_MS = GIFT_COOLDOWN_MS;

/** Date d'expiration des tickets courants (null si aucun ticket valable). */
export function giftExpiresAt(lastAt: Date | null, tickets: number): Date | null {
  if (!lastAt || tickets <= 0) return null;
  return new Date(lastAt.getTime() + GIFT_VALIDITY_MS);
}

/** Les tickets courants sont-ils encore valables ? (sinon → expirés, à purger) */
export function giftStillValid(lastAt: Date | null, tickets: number, now = new Date()): boolean {
  if (!lastAt || tickets <= 0) return false;
  return now.getTime() < lastAt.getTime() + GIFT_VALIDITY_MS;
}

/** Un cadeau peut-il être proposé/réclamé pour ce compte ? (giftLastAt passé ?) */
export function giftCooldownOk(lastAt: Date | null, now = new Date()): boolean {
  if (!lastAt) return true;
  return now.getTime() - lastAt.getTime() >= GIFT_COOLDOWN_MS;
}

/** Jours restants avant de pouvoir réclamer à nouveau (arrondi supérieur). */
export function giftCooldownDaysLeft(lastAt: Date, now = new Date()): number {
  const rest = GIFT_COOLDOWN_MS - (now.getTime() - lastAt.getTime());
  return Math.max(1, Math.ceil(rest / (24 * 60 * 60 * 1000)));
}

export type ClaimResult =
  | { ok: true; giftTickets: number }
  | { ok: false; reason: 'not-logged' | 'cooldown'; daysLeft?: number };

/**
 * Réclame le cadeau : crédite 1 ticket de tirage + horodate le dernier cadeau.
 * Refuse si le compte n'existe pas ou si le cooldown de 5 jours n'est pas écoulé.
 */
export async function claimGift(email: string): Promise<ClaimResult> {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return { ok: false, reason: 'not-logged' };
  const user = await prisma.user.findUnique({ where: { email: e } });
  if (!user) return { ok: false, reason: 'not-logged' };

  const u = await prisma.usage.findUnique({ where: { userId: user.id } });
  const lastAt = u?.giftLastAt ?? null;
  if (!giftCooldownOk(lastAt)) {
    return { ok: false, reason: 'cooldown', daysLeft: giftCooldownDaysLeft(lastAt as Date) };
  }

  // Tickets EFFECTIFS : un ancien ticket non utilisé depuis plus de 5 jours est
  // expiré (il ne s'empile pas avec le nouveau cadeau).
  const validTickets =
    u && giftStillValid(u.giftLastAt, u.giftTickets) ? u.giftTickets : 0;

  await prisma.usage.upsert({
    where: { userId: user.id },
    create: { userId: user.id, giftTickets: 1, giftLastAt: new Date() },
    update: {
      giftTickets: validTickets + 1,
      giftLastAt: new Date(),
    },
  });
  return { ok: true, giftTickets: validTickets + 1 };
}
