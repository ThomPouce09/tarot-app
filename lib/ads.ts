// lib/ads.ts — Économie des tirages gagnés par publicité récompensée (point 7).
// Règles (validées avec le propriétaire, 26/10) :
//   • 2 pubs vues  = 1 ticket de tirage de BASE     (cap : 2 tickets / mois)
//   • 3 pubs vues  = 1 ticket de tirage AVANCÉ       (cap : 2 tickets / mois)
// Les tickets gagnés ne « périminent » pas ; la progression (pubs déjà vues
// vers le prochain ticket) survive au changement de mois, seuls les compteurs
// de gains mensuels se réinitialisent (via loadUsage, mois calendaire).
// Priorité de consommation (moteur) : dus/gift → TICKETS PUBS → crédits payés
// → quota : on dépense le gratuit avant le payé, comme bonusGrand/giftTickets.
//
// ⚠️ Le crédit passe TOUJOURS par /api/ads (serveur) : le client ne déclare
// qu'un txId émis par le serveur (start) et le même txId au retour (reward).
// La table ad_rewards (txId unique) rend le crédit idempotent : deux envois du
// même tx ne créditent qu'une fois. Sans SDK pub branché (web / APK sans
// plugin AdMob), les endpoints répondent mais aucune offre n'est présentée.

import { prisma } from './prisma';

export const AD_BASE_ADS_PER_TICKET = 2;
export const AD_GRAND_ADS_PER_TICKET = 3;
export const AD_BASE_MONTHLY_CAP = 2;   // tickets de base max gagnés par mois
export const AD_GRAND_MONTHLY_CAP = 2;  // tickets avancés max gagnés par mois

export type AdKind = 'base' | 'grand';

export interface AdOffer {
  kind: AdKind;
  /** Une offre est présentable : seuil atteignable ce mois-ci. */
  available: boolean;
  /** Publicités restantes à regarder pour le prochain ticket de ce type. */
  adsNeeded: number;
  /** Tickets de ce type encore gagnables ce mois (0 si cap atteint). */
  leftThisMonth: number;
  /** Tickets de ce type déjà en pool, prêts à être consommés. */
  ticketsReady: number;
}

export function computeAdOffers(u: {
  adProgBase?: number; adProgGrand?: number;
  adTicketsBase?: number; adTicketsGrand?: number;
  adEarnedBaseMonth?: number; adEarnedGrandMonth?: number;
}): { base: AdOffer; grand: AdOffer } {
  const progBase = u.adProgBase ?? 0;
  const progGrand = u.adProgGrand ?? 0;
  const ticketsBase = u.adTicketsBase ?? 0;
  const ticketsGrand = u.adTicketsGrand ?? 0;
  const earnedBase = u.adEarnedBaseMonth ?? 0;
  const earnedGrand = u.adEarnedGrandMonth ?? 0;
  const leftBase = Math.max(0, AD_BASE_MONTHLY_CAP - earnedBase);
  const leftGrand = Math.max(0, AD_GRAND_MONTHLY_CAP - earnedGrand);
  return {
    base: {
      kind: 'base',
      // L'offre reste présentable tant qu'il reste du quota mensuel (ou qu'on
      // n'a pas encore atteint le cap d'earned) ; les pubs déjà vues comptent.
      available: leftBase > 0,
      adsNeeded: leftBase > 0 ? AD_BASE_ADS_PER_TICKET - progBase : 0,
      leftThisMonth: leftBase,
      ticketsReady: ticketsBase,
    },
    grand: {
      kind: 'grand',
      available: leftGrand > 0,
      adsNeeded: leftGrand > 0 ? AD_GRAND_ADS_PER_TICKET - progGrand : 0,
      leftThisMonth: leftGrand,
      ticketsReady: ticketsGrand,
    },
  };
}

export type CreditResult =
  | { ok: true; duplicate: false; ticketEarned: boolean; adsNeededNext: number; ticketsReady: number }
  | { ok: true; duplicate: true }
  | { ok: false; error: 'capped' | 'no-user' };

// Crédite UNE publicité vue pour `kind`. txId (émis par start) garantit
// l'idempotence. Révise : palier atteint → ticket + compteur mensuel.
export async function creditAdReward(userId: string, kind: AdKind, txId: string): Promise<CreditResult> {
  const per = kind === 'base' ? AD_BASE_ADS_PER_TICKET : AD_GRAND_ADS_PER_TICKET;
  const cap = kind === 'base' ? AD_BASE_MONTHLY_CAP : AD_GRAND_MONTHLY_CAP;

  // Empreinte anti-rejeu : la ligne ad_rewards est posée AVANT toute écriture
  // (P2002 = déjà vu → no-op). En transaction : either the tx is logged and
  // the counters move, or nothing happens.
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.adReward.create({ data: { txId: `${userId}:${txId}`, userId, kind, source: 'client' } });

      const usage = await tx.usage.findUnique({ where: { userId } });
      if (!usage) return { ok: false, error: 'no-user' as const };

      const progCol = kind === 'base' ? 'adProgBase' : 'adProgGrand';
      const tickCol = kind === 'base' ? 'adTicketsBase' : 'adTicketsGrand';
      const earnCol = kind === 'base' ? 'adEarnedBaseMonth' : 'adEarnedGrandMonth';
      const prog = (usage as unknown as Record<string, number>)[progCol] ?? 0;
      const tickets = (usage as unknown as Record<string, number>)[tickCol] ?? 0;
      const earned = (usage as unknown as Record<string, number>)[earnCol] ?? 0;
      if (earned >= cap) return { ok: false, error: 'capped' as const };

      const nextProg = prog + 1;
      const hitPalier = nextProg >= per;
      const patch: Record<string, number> = {};
      patch[progCol] = hitPalier ? 0 : nextProg;
      patch[tickCol] = hitPalier ? tickets + 1 : tickets;
      if (hitPalier) patch[earnCol] = earned + 1;
      await tx.usage.update({ where: { userId }, data: patch });

      return {
        ok: true,
        duplicate: false,
        ticketEarned: hitPalier,
        adsNeededNext: hitPalier ? per : per - nextProg,
        ticketsReady: patch[tickCol],
      };
    });
  } catch (e) {
    // P2002 sur la clé primaire ad_rewards : récompense déjà créditée.
    if (e && typeof e === 'object' && (e as { code?: string }).code === 'P2002') {
      return { ok: true, duplicate: true };
    }
    throw e;
  }
}
