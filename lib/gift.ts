// lib/gift.ts — Cadeau des créatures : tirages offerts rares, deux filières.
//  - ticket « base »   : couvre 1 tirage de base   (giftTickets)
//  - ticket « avancé » : couvre 1 grand tirage     (giftGrandTickets)
// Un ticket consommé par le tirage exact de sa filière (la roue hebdo ne coûte
// plus que 1 grand → un ticket avancé la couvre). Les tickets sont génériques :
// utilisables dans tous les univers.
// Rareté : après chaque réclamation, un nouveau cadeau (base OU avancé) ne peut
// être réclamé qu'au terme d'un cooldown aléatoire de 3 à 4 jours, tiré à la
// réclamation et stocké (giftNextOkAt) — tout type confondu.
// Validité : un ticket non utilisé expire 5 jours après la réclamation.

import { prisma } from './prisma';

/** Validité d'un ticket : 5 jours après sa réclamation. */
export const GIFT_VALIDITY_MS = 5 * 24 * 60 * 60 * 1000;

/** Fenêtre du cooldown entre deux réclamations : de 3 à 4 jours (aléatoire). */
export const GIFT_COOLDOWN_MIN_MS = 3 * 24 * 60 * 60 * 1000;
export const GIFT_COOLDOWN_MAX_MS = 4 * 24 * 60 * 60 * 1000;

/** Tire la prochaine date autorisée (3 à 4 jours après maintenant). */
export function rollGiftNextOkAt(now = new Date()): Date {
  const span = GIFT_COOLDOWN_MAX_MS - GIFT_COOLDOWN_MIN_MS;
  return new Date(now.getTime() + GIFT_COOLDOWN_MIN_MS + Math.random() * span);
}

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

/** Un cadeau peut-il être proposé/réclamé pour ce compte ? (cooldown écoulé ?) */
export function giftCooldownOk(lastAt: Date | null, nextOkAt: Date | null, now = new Date()): boolean {
  if (nextOkAt) return now.getTime() >= nextOkAt.getTime();
  // Comptes antérieurs à la colonne giftNextOkAt : on retombe sur l'ancienne
  // règle (5 jours après la dernière réclamation) plutôt que tout ouvrir.
  if (!lastAt) return true;
  return now.getTime() - lastAt.getTime() >= GIFT_VALIDITY_MS;
}

/** Jours restants avant de pouvoir réclamer à nouveau (arrondi supérieur). */
export function giftCooldownDaysLeft(nextOkAt: Date, now = new Date()): number {
  const rest = nextOkAt.getTime() - now.getTime();
  return Math.max(1, Math.ceil(rest / (24 * 60 * 60 * 1000)));
}

export type GiftKind = 'base' | 'grand';

export type ClaimResult =
  | { ok: true; kind: GiftKind; tickets: number }
  | { ok: false; reason: 'not-logged' | 'cooldown' | 'bad-kind'; daysLeft?: number };

/**
 * Réclame le cadeau d'une créature : crédite 1 ticket de la filière annoncée
 * (base ou avancé) + tire la prochaine date autorisée (3-4 jours).
 * Refuse si le compte n'existe pas ou si le cooldown n'est pas écoulé.
 */
export async function claimGift(email: string, kind: GiftKind = 'base'): Promise<ClaimResult> {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return { ok: false, reason: 'not-logged' };
  if (kind !== 'base' && kind !== 'grand') return { ok: false, reason: 'bad-kind' };
  const user = await prisma.user.findUnique({ where: { email: e } });
  if (!user) return { ok: false, reason: 'not-logged' };

  const u = await prisma.usage.findUnique({ where: { userId: user.id } });
  const lastAt = u?.giftLastAt ?? null;
  const nextOkAt = (u as { giftNextOkAt?: Date | null } | null)?.giftNextOkAt ?? null;
  if (!giftCooldownOk(lastAt, nextOkAt)) {
    return { ok: false, reason: 'cooldown', daysLeft: giftCooldownDaysLeft(nextOkAt ?? new Date()) };
  }

  // Tickets EFFECTIFS : d'éventuels tickets non utilisés depuis plus de 5 jours
  // sont expirés (ils ne s'empilent pas avec le nouveau cadeau).
  const validBase = u && giftStillValid(lastAt, u.giftTickets) ? u.giftTickets : 0;
  const validGrand = u && giftStillValid(lastAt, (u as { giftGrandTickets?: number }).giftGrandTickets ?? 0)
    ? (u as { giftGrandTickets?: number }).giftGrandTickets ?? 0 : 0;

  const isGrand = kind === 'grand';
  const nextTickets = isGrand ? validGrand + 1 : validBase + 1;

  await prisma.usage.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      giftTickets: isGrand ? 0 : 1,
      giftGrandTickets: isGrand ? 1 : 0,
      giftLastAt: new Date(),
      giftNextOkAt: rollGiftNextOkAt(),
    },
    update: {
      giftTickets: isGrand ? validBase : nextTickets,
      giftGrandTickets: isGrand ? nextTickets : validGrand,
      giftLastAt: new Date(),
      giftNextOkAt: rollGiftNextOkAt(),
    },
  });
  return { ok: true, kind, tickets: nextTickets };
}
