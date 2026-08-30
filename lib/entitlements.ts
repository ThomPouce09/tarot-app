// lib/entitlements.ts
// Moteur de droits : répond « cet utilisateur peut-il faire ce tirage ? » et
// consomme les quotas atomiquement. SERVER ONLY (utilise Prisma).
//
// Logique (cycle de vie d'un compte) :
//   - Niveau récurrent : arkane > initie > apprenti (défaut, gratuit).
//   - Pack de bienvenue (one-shot) : 1 base sur CHAQUE univers + 1 grand au choix.
//   - Recharge cosmique (one-shot, 2€) : un pool de 105 crédits MIXABLE.
//     base = 7 crédits ; avancé = 15 crédits (15x7 = 105 = 7x15) → ratio exact,
//     on pioche dans le pool jusqu'à épuisement, dans n'importe quelle combinaison.
//   - Streak 7 jours consécutifs : +1 grand offert à chaque palier de 7 jours.
//
// Un tirage de BASE est gratuit/illimité pour initie & arkane ; 1/jour pour
// apprenti (au-delà, il consomme 7 crédits de recharge). Un GRAND tirage est
// limité (mensuel) sauf arkane ; il consomme d'abord les droits one-shot,
// puis 15 crédits de recharge, puis le quota mensuel.

import { prisma } from './prisma';
import { classify, type Universe } from './classification';
import { PLAN_CAPACITY, RECHARGE_CREDITS, CREDITS_BASE, CREDITS_GRAND, type SubscriptionPlanId } from './plans';

// Recharge cosmique : pool de crédits exact (défini dans plans.ts, client-safe).
// Ré-exportés pour les appels serveur.
export { RECHARGE_CREDITS, CREDITS_BASE, CREDITS_GRAND };

export type EntitlementLevel = 'apprenti' | 'initie' | 'arkane';

export interface Rights {
  level: EntitlementLevel;
  baseUnlimited: boolean;
  grandMonthly: number | null; // null = illimité
  grandUsedMonth: number;
  baseUsedToday: number;
  welcomeBaseUsed: Universe[];
  welcomeGrandUsed: boolean;
  bonusGrand: number;
  rechargeCredits: number;
  streakDays: number;
}

export interface Decision {
  allowed: boolean;
  // Motif machine pour la couche UI (message déjà i18n-é côté client).
  reason: 'ok' | 'not-logged' | 'welcome-base-ok' | 'welcome-grand-ok' | 'limit-base-daily' | 'limit-grand' | 'limit-base-one-universe';
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
  if (existing.monthKey !== mk) { patch.monthKey = mk; patch.grandUsedMonth = 0; }
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

  const subActive = user.subscription?.status === 'active';
  const u = await loadUsage(user.id);
  // Niveau effectif : si l'abonnement n'est pas actif, on retombe sur apprenti.
  const plan = user.subscription?.plan ?? null;
  const effective: EntitlementLevel = subActive && plan ? planToLevel(plan) : 'apprenti';
  const cap = PLAN_CAPACITY[effective];

  return {
    level: effective,
    baseUnlimited: cap.baseUnlimited,
    grandMonthly: cap.grandMonthly,
    grandUsedMonth: u.grandUsedMonth,
    baseUsedToday: u.baseUsedToday,
    welcomeBaseUsed: (u.welcomeBaseUsed as Universe[]) ?? [],
    welcomeGrandUsed: u.welcomeGrandUsed,
    bonusGrand: u.bonusGrand,
    rechargeCredits: u.rechargeCredits,
    streakDays: u.streakDays,
  };
}

// ── Décide si un tirage est autorisé (non destructif) ───────────
export async function canDo(email: string, type: string, question: string | null): Promise<Decision> {
  const user = await prisma.user.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { subscription: true },
  });
  if (!user) return { allowed: false, reason: 'not-logged', message: 'Connectez-vous pour faire un tirage.' };

  const cls = classify(type);
  if (!cls) return { allowed: false, reason: 'limit-grand', message: 'Type de tirage reconnu.' };

  const rights = await getRights(email);
  if (!rights) return { allowed: false, reason: 'not-logged', message: 'Compte introuvable.' };

  const subActive = user.subscription?.status === 'active';

  // ── TIRAGE DE BASE ──
  if (cls.isBase) {
    // Arkane / Initié (abo actif) : base illimitée.
    if (rights.baseUnlimited) {
      return { allowed: true, reason: 'ok', message: '' };
    }
    // Pack bienvenue : 1 base par univers (une fois), indépendant du 1/jour.
    if (!rights.welcomeBaseUsed.includes(cls.universe)) {
      return { allowed: true, reason: 'welcome-base-ok', message: '' };
    }
    // Apprenti : 1 base/jour gratuit. Au-delà → 7 crédits de recharge.
    if (rights.baseUsedToday >= 1) {
      if (rights.rechargeCredits >= CREDITS_BASE) {
        return { allowed: true, reason: 'ok', message: '' };
      }
      return { allowed: false, reason: 'limit-base-daily', message: 'Base quotidienne atteinte. Rechargez ou revenez demain.' };
    }
    return { allowed: true, reason: 'ok', message: '' };
  }

  // ── GRAND TIRAGE ──
  // Arkane : illimité.
  if (rights.level === 'arkane' && subActive) {
    return { allowed: true, reason: 'ok', message: '' };
  }
  // 1er grand du pack bienvenue (au choix).
  if (!rights.welcomeGrandUsed) {
    return { allowed: true, reason: 'welcome-grand-ok', message: '' };
  }
  // Bonus streak cumulable.
  if (rights.bonusGrand > 0) {
    return { allowed: true, reason: 'ok', message: '' };
  }
  // Recharge cosmique : 15 crédits.
  if (rights.rechargeCredits >= CREDITS_GRAND) {
    return { allowed: true, reason: 'ok', message: '' };
  }
  // Quota mensuel Initié.
  if (rights.grandMonthly !== null && rights.grandUsedMonth < rights.grandMonthly) {
    return { allowed: true, reason: 'ok', message: '' };
  }
  return { allowed: false, reason: 'limit-grand', message: 'Aucun grand tirage disponible. Abonnez-vous pour en débloquer.' };
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

  const subActive = user.subscription?.status === 'active';
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
    const unlimited = rightsIsBaseUnlimited(user.subscription?.plan, subActive);
    if (!unlimited) {
      // Base bienvenue : 1 par univers (offert, ne consomme pas la base du jour).
      if (!(u.welcomeBaseUsed as string[]).includes(cls.universe)) {
        patch.welcomeBaseUsed = [...(u.welcomeBaseUsed as string[]), cls.universe];
      } else if (u.baseUsedToday < 1) {
        // Apprenti : 1 base/jour gratuit.
        patch.baseUsedToday = u.baseUsedToday + 1;
      } else {
        // Au-delà du gratuit/jour → consomme 7 crédits de recharge.
        patch.rechargeCredits = u.rechargeCredits - CREDITS_BASE;
      }
    }
    // (initie/arkane actif : base illimitée, aucun compteur)
  } else {
    // Grand : épuise d'abord les droits one-shot, puis les crédits, puis le quota mensuel.
    if (!u.welcomeGrandUsed) {
      patch.welcomeGrandUsed = true;
    } else if (u.bonusGrand > 0) {
      patch.bonusGrand = u.bonusGrand - 1;
    } else if (u.rechargeCredits >= CREDITS_GRAND) {
      patch.rechargeCredits = u.rechargeCredits - CREDITS_GRAND;
    } else {
      patch.grandUsedMonth = u.grandUsedMonth + 1;
    }
    patch.grandUsedToday = u.grandUsedToday + 1;
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
  // Chaque palier de 7 jours → +1 grand offert.
  if (s % 7 === 0) patch.bonusGrand = bonusGrand + 1;
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
