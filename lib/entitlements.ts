// lib/entitlements.ts
// Moteur de droits : répond « cet utilisateur peut-il faire ce tirage ? » et
// consomme les quotas atomiquement. SERVER ONLY (utilise Prisma).
//
// Logique (cycle de vie d'un compte) :
//   - Niveau récurrent : arkane > initie > apprenti (défaut, gratuit).
//   - Pack Apprenti (one-shot, offert) : 1 tirage de base sur UN univers au
//     choix + 1 tirage avancé sur UN univers au choix. Rien d'autre : plus de
//     base quotidienne, plus de bonus streak.
//   - Recharge cosmique (one-shot, 2€) : un pool de 105 crédits MIXABLE.
//     base = 7 crédits ; avancé = 15 crédits (15x7 = 105 = 7x15) → ratio exact,
//     on pioche dans le pool jusqu'à épuisement, dans n'importe quelle combinaison.
//   - Streak : compteur de jours consécutifs (vitrine/stats/lettre uniquement,
//     ne récompense plus).
//
// Un tirage de BASE est plafonné par mois pour les abonnés (Initié 90, Arkane
// 120) ; pour les non-abonnés, seul le Pack Apprenti en donne un (puis tickets
// cadeaux et crédits de recharge). Un GRAND tirage est limité (mensuel :
// Initié 10, Arkane 120) ; il consomme d'abord les droits one-shot (pack,
// tickets, bonus hérités), puis 15 crédits de recharge, puis le quota mensuel.

import { prisma } from './prisma';
import { classify, type Universe } from './classification';
import { PLAN_CAPACITY, RECHARGE_CREDITS, CREDITS_BASE, CREDITS_GRAND, type SubscriptionPlanId } from './plans';
import { giftStillValid, giftExpiresAt } from './gift';

// Recharge cosmique : pool de crédits exact (défini dans plans.ts, client-safe).
// Ré-exportés pour les appels serveur.
export { RECHARGE_CREDITS, CREDITS_BASE, CREDITS_GRAND };

export type EntitlementLevel = 'apprenti' | 'initie' | 'arkane';

export interface Rights {
  level: EntitlementLevel;
  baseUnlimited: boolean;
  baseMonthly: number | null; // plafond mensuel de bases (Initié 90, Arkane 120)
  baseUsedMonth: number;
  grandMonthly: number | null; // null = illimité
  grandUsedMonth: number;
  baseUsedToday: number;
  welcomeBaseUsed: Universe[];
  welcomeGrandUsed: boolean;
  bonusGrand: number;
  rechargeCredits: number;
  giftTickets: number; // tickets « cadeau des créatures » — filière base
  giftGrandTickets: number; // tickets « cadeau des créatures » — filière avancée
  giftExpiresAt: Date | null; // expiration des tickets (réclamation + 5 jours)
  streakDays: number;
  // Privilèges mensuels d'abonnement (Conseil d'Odin / Secret d'Artémis) :
  // nombre RESTANT dans le mois ; null = illimité (Arkane).
  odinRemaining: number | null;
  artemisRemaining: number | null;
}

export interface Decision {
  allowed: boolean;
  // Motif machine pour la couche UI (message déjà i18n-é côté client).
  reason: 'ok' | 'not-logged' | 'welcome-base-ok' | 'welcome-grand-ok' | 'limit-base-daily' | 'limit-base-monthly' | 'limit-grand' | 'limit-base-one-universe' | 'limit-base-pack' | 'session';
  message: string;
}

// ── Helpers date ────────────────────────────────────────────────
function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function monthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

// ── Niveau récurrent d'un user (ou 'apprenti' par défaut) ───────
export function planToLevel(plan: string | null | undefined): EntitlementLevel {
  if (plan === 'arkane') return 'arkane';
  if (plan === 'initie') return 'initie';
  return 'apprenti';
}

// ── Abonnement RÉELLEMENT actif : status 'active' ET période non expirée.
// Le status seul ne suffit pas : si la date de fin (currentPeriodEnd) est passée
// (webhook Stripe manqué, sync différée), l'accès doit être coupé immédiatement.
export function subIsActive(sub?: { status?: string | null; currentPeriodEnd?: Date | null } | null): boolean {
  if (!sub || sub.status !== 'active') return false;
  return !!sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > Date.now();
}

// ── Charge (avec reset quotidien/mensuel paresseux) ─────────────
async function loadUsage(userId: string) {
  const tk = todayKey();
  const mk = monthKey();
  const existing = await prisma.usage.findUnique({ where: { userId } });
  if (!existing) {
    return prisma.usage.create({ data: { userId, dateKey: tk, monthKey: mk } });
  }
  const patch: Record<string, unknown> = {};
  if (existing.dateKey !== tk) { patch.dateKey = tk; patch.baseUsedToday = 0; patch.grandUsedToday = 0; }
  // Reset mensuel : bases + grands + privilèges abonnement (Conseil d'Odin, Secret d'Artémis).
  if (existing.monthKey !== mk) {
    patch.monthKey = mk;
    patch.baseUsedMonth = 0;
    patch.grandUsedMonth = 0;
    patch.odinUsedMonth = 0;
    patch.artemisUsedMonth = 0;
  }
  // Cadeau des créatures : un tirage offert NON utilisé expire 5 jours après
  // sa réclamation → purge automatique des DEUX filières (le panneau
  // « Consommation restante » et les droits ne montrent alors plus les tickets).
  const anyTicket = (existing.giftTickets ?? 0) + ((existing as { giftGrandTickets?: number }).giftGrandTickets ?? 0);
  if (anyTicket > 0 && !giftStillValid(existing.giftLastAt ?? null, anyTicket)) {
    patch.giftTickets = 0;
    (patch as Record<string, unknown>).giftGrandTickets = 0;
  }
  if (Object.keys(patch).length) {
    return prisma.usage.update({ where: { userId }, data: patch });
  }
  return existing;
}

// ── Retourne les droits courants (non destructif) ───────────────
export async function getRights(email: string): Promise<Rights | null> {
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { subscription: true },
  });
  if (!user) return null;

  const subActive = subIsActive(user.subscription);
  const u = await loadUsage(user.id);
  // Niveau effectif : si l'abonnement n'est pas actif, on retombe sur apprenti.
  const plan = user.subscription?.plan ?? null;
  const effective: EntitlementLevel = subActive && plan ? planToLevel(plan) : 'apprenti';
  const cap = PLAN_CAPACITY[effective];

  return {
    level: effective,
    baseUnlimited: cap.baseUnlimited,
    baseMonthly: cap.baseMonthly ?? null,
    baseUsedMonth: (u as { baseUsedMonth?: number }).baseUsedMonth ?? 0,
    grandMonthly: cap.grandMonthly,
    grandUsedMonth: u.grandUsedMonth,
    baseUsedToday: u.baseUsedToday,
    welcomeBaseUsed: (u.welcomeBaseUsed as Universe[]) ?? [],
    welcomeGrandUsed: u.welcomeGrandUsed,
    bonusGrand: u.bonusGrand,
    rechargeCredits: u.rechargeCredits,
    giftTickets: u.giftTickets,
    giftGrandTickets: (u as { giftGrandTickets?: number }).giftGrandTickets ?? 0,
    giftExpiresAt: giftExpiresAt(u.giftLastAt ?? null, u.giftTickets + ((u as { giftGrandTickets?: number }).giftGrandTickets ?? 0)),
    streakDays: u.streakDays,
    odinRemaining: cap.perkMonthly === null ? null : Math.max(0, cap.perkMonthly - ((u as { odinUsedMonth?: number }).odinUsedMonth ?? 0)),
    artemisRemaining: cap.perkMonthly === null ? null : Math.max(0, cap.perkMonthly - ((u as { artemisUsedMonth?: number }).artemisUsedMonth ?? 0)),
  };
}

// ── Décide si un tirage est autorisé (non destructif) ───────────
export async function canDo(email: string, type: string, question: string | null): Promise<Decision> {
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { subscription: true },
  });
  if (!user) return { allowed: false, reason: 'not-logged', message: 'Connectez-vous pour faire un tirage.' };

  // Le tirage COLLECTIF du jour est offert à tous (ne consomme aucun quota ; la
  // page ne fait que le consulter). Seule la lecture PERSONNELLE est réservée,
  // gated côté API (402) — d'où l'autorisation inconditionnelle ici.
  if (type === 'yi-jing-du-jour') return { allowed: true, reason: 'ok', message: '' };

  const cls = classify(type);
  if (!cls) return { allowed: false, reason: 'limit-grand', message: 'Type de tirage reconnu.' };

  const rights = await getRights(email);
  if (!rights) return { allowed: false, reason: 'not-logged', message: 'Compte introuvable.' };

  const subActive = subIsActive(user.subscription);

  // ── TIRAGE DE BASE ──
  if (cls.isBase) {
    // Abonnés actifs (Initié/Arkane) : QUOTA MENSUEL de bases (90 / 120) —
    // l'ancien « illimité » n'existe plus. Tickets cadeaux et crédits de
    // recharge prennent le relais au-delà du plafond.
    if (subActive && (rights.level === 'initie' || rights.level === 'arkane')) {
      const cap = rights.baseMonthly;
      if (cap === null || rights.baseUsedMonth < cap) {
        return { allowed: true, reason: 'ok', message: '' };
      }
      if (rights.giftTickets > 0) return { allowed: true, reason: 'ok', message: '' };
      if (rights.rechargeCredits >= CREDITS_BASE) return { allowed: true, reason: 'ok', message: '' };
      return {
        allowed: false,
        reason: 'limit-base-monthly',
        message: `Plafond mensuel de ${cap} tirages de base atteint. Rechargez ou revenez le mois prochain.`,
      };
    }
    // ── Pack Apprenti (remplace le forfait gratuit) ──
    // 1 tirage de base sur UN univers au choix (une fois, à vie de compte).
    // Plus de base quotidienne : au-delà du pack, ticket cadeau puis crédits.
    if (rights.welcomeBaseUsed.length === 0) {
      return { allowed: true, reason: 'welcome-base-ok', message: '' };
    }
    if (rights.giftTickets > 0) {
      return { allowed: true, reason: 'ok', message: '' };
    }
    if (rights.rechargeCredits >= CREDITS_BASE) {
      return { allowed: true, reason: 'ok', message: '' };
    }
    return { allowed: false, reason: 'limit-base-pack', message: 'Pack Apprenti épuisé. Abonnez-vous ou rechargez vos crédits.' };
  }

  // ── GRAND TIRAGE ──
  // Initié 10 / Arkane 120 par mois : le calcul ci-dessous ajoute le quota
  // mensuel (grandMonthly !== null) aux ressources one-shot (welcome, tickets,
  // streak, crédits). L'ancien « Arkane illimité » (grandMonthly null) est
  // remplacé par un plafond ; s'il redevient null, le return direct suit.
  if (rights.level === 'arkane' && subActive && rights.grandMonthly === null) {
    return { allowed: true, reason: 'ok', message: '' };
  }
  // Coût en grands : 1 partout (la roue hebdo ne coûte plus qu'un seul grand
  // depuis sa refonte). Les ressources se cumulent dans l'ordre de priorité
  // habituel (welcome → tickets cadeau avancés → bonus streak → crédits → quota).
  const cost = grandCostOf(type);
  let avail = 0;
  if (!rights.welcomeGrandUsed) avail += 1;
  avail += rights.giftGrandTickets + rights.bonusGrand;
  avail += Math.floor(rights.rechargeCredits / CREDITS_GRAND);
  if (rights.grandMonthly !== null) avail += Math.max(0, rights.grandMonthly - rights.grandUsedMonth);
  if (avail >= cost) {
    return { allowed: true, reason: rights.welcomeGrandUsed ? 'ok' : 'welcome-grand-ok', message: '' };
  }
  return {
    allowed: false,
    reason: 'limit-grand',
    message: 'Aucun grand tirage disponible. Abonnez-vous pour en débloquer.',
  };
}

/** Nombre de grands tirages consommés par ce type (la roue hebdo est revenue à 1). */
export function grandCostOf(_type: string): number {
  return 1;
}

// ── Consomme un tirage (met à jour le streak + décrémente) ──────
export async function consume(email: string, type: string, question: string | null): Promise<Decision> {
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { subscription: true },
  });
  if (!user) return { allowed: false, reason: 'not-logged', message: 'Connectez-vous pour faire un tirage.' };

  const cls = classify(type);
  if (!cls) return { allowed: false, reason: 'limit-grand', message: 'Type de tirage reconnu.' };

  const decision = await canDo(email, type, question);
  if (!decision.allowed) return decision;

  const subActive = subIsActive(user.subscription);
  const u = await loadUsage(user.id);
  const tk = todayKey();
  const mk = monthKey();

  const patch: Record<string, unknown> = {
    dateKey: tk,
    monthKey: mk,
  };

  // Met à jour le streak AVANT consommation (le fait de tirer un jour compte).
  const streakPatch = computeStreakPatch(u.lastStreakDate, u.streakDays, u.bonusGrand);
  Object.assign(patch, streakPatch);

  if (cls.isBase) {
    // Le compteur mensuel de bases suit TOUT tirage base consommé (reset au
    // changement de monthKey via loadUsage) — seul un abonné s'en voit plafonné.
    patch.baseUsedMonth = u.baseUsedMonth + 1;
    const level = planToLevel(user.subscription?.plan);
    const isSubBase = subActive && (level === 'initie' || level === 'arkane');
    if (isSubBase) {
      // Initié/Arkane : puise dans le quota mensuel (90/120), puis tickets,
      // puis crédits de recharge.
      const cap = PLAN_CAPACITY[level].baseMonthly;
      if (cap !== null && u.baseUsedMonth >= cap) {
        if (u.giftTickets > 0) {
          patch.giftTickets = u.giftTickets - 1;
        } else {
          patch.rechargeCredits = u.rechargeCredits - CREDITS_BASE;
        }
      }
    } else if ((u.welcomeBaseUsed as string[]).length === 0) {
      // Pack Apprenti : la base offerte se consomme sur l'univers choisi.
      patch.welcomeBaseUsed = [...(u.welcomeBaseUsed as string[]), cls.universe];
    } else if (u.giftTickets > 0) {
      // Cadeau des créatures : un ticket couvre ce tirage avant les crédits.
      patch.giftTickets = u.giftTickets - 1;
    } else {
      // Plus de base gratuite : 7 crédits de recharge.
      patch.rechargeCredits = u.rechargeCredits - CREDITS_BASE;
    }
  } else {
    // Grand : épuise d'abord les droits one-shot, puis les TICKETS CADEAU
    // AVANCÉS (filière grand — les tickets base ne débloquent pas un grand),
    // puis les bonus streak, les crédits, le quota mensuel — coût = 1.
    let left = grandCostOf(type);
    if (left >= 1 && !u.welcomeGrandUsed) {
      patch.welcomeGrandUsed = true;
      left -= 1;
    }
    const grandTickets = (u as { giftGrandTickets?: number }).giftGrandTickets ?? 0;
    const spendGift = Math.min(left, grandTickets);
    if (spendGift > 0) { (patch as Record<string, unknown>).giftGrandTickets = grandTickets - spendGift; left -= spendGift; }
    const spendBonus = Math.min(left, u.bonusGrand);
    if (spendBonus > 0) { patch.bonusGrand = u.bonusGrand - spendBonus; left -= spendBonus; }
    const maxCreditPays = Math.floor(u.rechargeCredits / CREDITS_GRAND);
    const spendCredits = Math.min(left, maxCreditPays);
    if (spendCredits > 0) { patch.rechargeCredits = u.rechargeCredits - spendCredits * CREDITS_GRAND; left -= spendCredits; }
    if (left > 0) patch.grandUsedMonth = u.grandUsedMonth + left;
    patch.grandUsedToday = u.grandUsedToday + grandCostOf(type);
  }

  await prisma.usage.update({ where: { userId: user.id }, data: patch });
  return { allowed: true, reason: 'ok', message: '' };
}

function rightsIsBaseUnlimited(plan: string | undefined, subActive: boolean): boolean {
  const level = planToLevel(plan);
  return subActive && (level === 'arkane' || level === 'initie');
}

// ── Streak : incrémente si jour courant, reset si trou, +1 grand / 7 jours ──
function computeStreakPatch(lastDate: string | null, streak: number, bonusGrand: number) {
  const tk = todayKey();
  const patch: Record<string, unknown> = { lastStreakDate: tk };
  if (lastDate === tk) {
    // Déjà compté aujourd'hui → rien.
    patch.streakDays = streak;
    return patch;
  }
  let s = streak;
  if (lastDate === yesterdayKey()) {
    s = streak + 1;
  } else {
    s = 1; // nouvelle série
  }
  patch.streakDays = s;
  // Le streak ne récompense plus (bonus supprimé) : compteur vitrine seulement.
  return patch;
}

// ── Achat d'une recharge (crédite le pool de 105 crédits) ───────
export async function addRecharge(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!user) return false;
  const u = await loadUsage(user.id);
  await prisma.usage.update({ where: { userId: user.id }, data: { rechargeCredits: u.rechargeCredits + RECHARGE_CREDITS } });
  return true;
}
