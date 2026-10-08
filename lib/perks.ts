// lib/perks.ts
// Privilèges mensuels d'abonnement : « Conseil d'Odin » (runes — Fil des Nornes)
// et « Secret d'Artémis » (dés — Affinage).
// Règles (cap PLAN_CAPACITY.perkMonthly) :
//   - Apprenti : refusé (tier) ;
//   - Initié   : 1 par privilège par mois civil (compteurs Usage.odinUsedMonth /
//     artemisUsedMonth, remis à 0 au changement de mois par loadUsage) ;
//   - Arkane   : illimité (le compteur n'est même pas incrémenté).
// checkPerk = non destructif (affichage) ; consumePerk = vérifie + consomme
// (à appeler AVANT de lancer le bonus IA).

import { prisma } from './prisma';
import { getRights } from './entitlements';

export type PerkKind = 'odin' | 'artemis';

const FIELD: Record<PerkKind, 'odinUsedMonth' | 'artemisUsedMonth'> = {
  odin: 'odinUsedMonth',
  artemis: 'artemisUsedMonth',
};

export type PerkReason = 'ok' | 'not-logged' | 'no_user' | 'tier' | 'limit';

/** Map PerkReason -> motif client (GateReason) pour la modale de gating. */
export function perkReasonCode(r: PerkReason): 'not-logged' | 'perk-tier' | 'perk-limit' {
  if (r === 'tier') return 'perk-tier';
  if (r === 'limit') return 'perk-limit';
  return 'not-logged';
}

export interface PerkDecision {
  allowed: boolean;
  reason: PerkReason;
  message: string;
  /** restant dans le mois : null = illimité (Arkane). */
  remaining: number | null;
}

/** Vérifie le droit sans le consommer. */
export async function checkPerk(email: string, kind: PerkKind): Promise<PerkDecision> {
  if (!email || !email.trim()) {
    return { allowed: false, reason: 'not-logged', message: 'Connectez-vous pour utiliser ce privilège.', remaining: 0 };
  }
  const rights = await getRights(email);
  if (!rights) return { allowed: false, reason: 'no_user', message: 'Compte introuvable.', remaining: 0 };
  if (rights.level === 'arkane') return { allowed: true, reason: 'ok', message: '', remaining: null };
  if (rights.level !== 'initie') {
    return { allowed: false, reason: 'tier', message: 'Réservé aux abonnés Initié et Arkane.', remaining: 0 };
  }
  // Initié : 1 par mois et par privilège.
  const remaining = kind === 'odin' ? rights.odinRemaining : rights.artemisRemaining;
  if (remaining === null || remaining <= 0) {
    return { allowed: false, reason: 'limit', message: 'Privilège mensuel déjà utilisé ce mois-ci.', remaining: 0 };
  }
  return { allowed: true, reason: 'ok', message: '', remaining };
}

/** Vérifie puis consomme 1 usage. À appeler côté serveur avant l'IA du privilège. */
export async function consumePerk(email: string, kind: PerkKind): Promise<PerkDecision> {
  const decision = await checkPerk(email, kind);
  if (!decision.allowed) return decision;
  // Arkane : illimité, rien à incrémenter.
  if (decision.remaining === null) return decision;
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    select: { id: true },
  });
  if (!user) return { allowed: false, reason: 'no_user', message: 'Compte introuvable.', remaining: 0 };
  const field = FIELD[kind];
  await prisma.usage.upsert({
    where: { userId: user.id },
    create: { userId: user.id, [field]: 1 } as never,
    update: { [field]: { increment: 1 } } as never,
  });
  return { ...decision, remaining: Math.max(0, decision.remaining - 1) };
}
