// lib/echo.ts
// Mécanique des « Échos » : l'oracle scelle une prémonction datée à la fin
// d'une lecture (4 univers : tarot, Yi Jing, runes, dés). L'utilisateur la
// rouvre à l'échéance (14-45 j) et rend son verdict : oui / partiel / non.
// Gating : Initié = 1 écho actif maximum, Arkane = illimité + Grimoire.

import { prisma } from './prisma';
import { callOracle, extractJsonObject } from './llm';
import { getRights } from './entitlements';

export type EchoDomain = 'tarot' | 'yi-jing' | 'runes' | 'des';
export const ECHO_DOMAINS: EchoDomain[] = ['tarot', 'yi-jing', 'runes', 'des'];

export const ECHO_MIN_DAYS = 14;
export const ECHO_MAX_DAYS = 45;

/** Domaine d'un écho à partir du type de tirage sauvegardé. */
export function echoDomainForType(type: string): EchoDomain | null {
  const t = (type || '').toLowerCase();
  if (t.startsWith('tarot')) return 'tarot';
  if (t.includes('yi-jing') || t.includes('yi-qing') || t.includes('ijing') || t.includes('yiqing')) return 'yi-jing';
  if (t.includes('rune')) return 'runes';
  if (t.includes('des-') || t.startsWith('des') || t.includes('astro') || t.includes('dice')) return 'des';
  return null;
}

const DOMAIN_LORE: Record<EchoDomain, { fr: string; en: string }> = {
  tarot: { fr: 'un tirage de Tarot', en: 'a Tarot reading' },
  'yi-jing': { fr: 'un hexagramme du Yi Jing', en: 'an I Ching hexagram' },
  runes: { fr: 'un tirage de Runes scandinaves', en: 'a Norse rune casting' },
  des: { fr: 'une lecture des Dés du Zodiaque', en: 'an Astrological Dice reading' },
};

export function buildEchoPrompt(
  domain: EchoDomain,
  question: string | null,
  summary: string,
): string {
  const lore = DOMAIN_LORE[domain]?.fr || 'une lecture divinatoire';
  return `Tu es la voix profonde d'un oracle qui scelle un ÉCHO : une prémonction datée, née de ${lore}.

Contexte de la lecture :
Question du consultant : « ${question || 'Chemins et avenir'} »
Synthèse de la lecture : « ${summary.slice(0, 900)} »

Écris UN seul écho : une prémonction précise, concrète et VÉRIFIABLE dans le temps
(événement, rencontre, nouvelle, retournement — pas une généralité vague ni un conseil).
Ton : solennel, bienveillant, poétique mais factuel. Une seule phrase fluide de 140 à 260
caractères en français, sans promettre de date précise dans le texte.
Écris le MÊME écho en anglais (textEn), fidèle et naturel.
Choisis dueInDays : un entier entre ${ECHO_MIN_DAYS} et ${ECHO_MAX_DAYS} — le moment où
l'écho pourra être vérifié (plus l'horizon de la lecture est long, plus dueInDays est grand).

Réponds UNIQUEMENT avec cet objet JSON valide, sans texte avant ni après :
{
  "textFr": "…",
  "textEn": "…",
  "dueInDays": 28
}`;
}

export interface ParsedEcho {
  textFr: string;
  textEn: string;
  dueInDays: number;
}

/** Validation stricte du JSON de l'IA ; null si invalide (déclenche la relance). */
export function parseEchoJson(json: Record<string, any> | null | undefined): ParsedEcho | null {
  const textFr = String(json?.textFr || '').trim();
  const textEn = String(json?.textEn || '').trim();
  const d = Number(json?.dueInDays);
  if (textFr.length < 40 || textFr.length > 600) return null;
  if (!Number.isFinite(d)) return null;
  const dueInDays = Math.min(ECHO_MAX_DAYS, Math.max(ECHO_MIN_DAYS, Math.round(d)));
  return {
    textFr,
    textEn: textEn.length >= 20 ? textEn : '', // l'EN est un parallèle ; vide = fallback FR côté UI
    dueInDays,
  };
}

export interface EchoGating {
  allowed: boolean;
  reason?: 'no_user' | 'tier' | 'cap';
  message?: string;
}

/** Initié : 1 écho actif max (non clos). Arkane : illimité. Autres niveaux : refusé. */
export async function canCreateEcho(email: string): Promise<EchoGating> {
  const rights = await getRights(email);
  if (!rights) return { allowed: false, reason: 'no_user', message: 'Compte introuvable.' };
  if (rights.level !== 'initie' && rights.level !== 'arkane') {
    return { allowed: false, reason: 'tier', message: 'Les Échos sont réservés aux Initiés et aux Arkanes.' };
  }
  if (rights.level === 'initie') {
    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select: { id: true },
    });
    if (!user) return { allowed: false, reason: 'no_user', message: 'Compte introuvable.' };
    const active = await prisma.echo.count({ where: { userId: user.id, verdict: null } });
    if (active >= 1) {
      return {
        allowed: false,
        reason: 'cap',
        message: 'Un seul écho actif pour les Initiés — vérifiez-le avant d\'en sceller un nouveau.',
      };
    }
  }
  return { allowed: true };
}

export interface SerializedEcho {
  id: string;
  readingId: string | null;
  textFr: string;
  textEn: string | null;
  domain: string;
  dueAt: string; // ISO
  verdict: string | null;
  verdictAt: string | null;
  createdAt: string;
}

export function serializeEcho(e: {
  id: string; readingId: string | null; textFr: string; textEn: string | null;
  domain: string; dueAt: Date; verdict: string | null; verdictAt: Date | null; createdAt: Date;
}): SerializedEcho {
  return {
    id: e.id,
    readingId: e.readingId,
    textFr: e.textFr,
    textEn: e.textEn,
    domain: e.domain,
    dueAt: e.dueAt.toISOString(),
    verdict: e.verdict,
    verdictAt: e.verdictAt ? e.verdictAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
  };
}

/**
 * Scelle un écho pour un utilisateur : gating → prompt IA → validation →
 * relance UNIQUE → création en base. Retourne l'écho ou l'erreur (jamais jeté).
 */
export async function generateAndSaveEcho(opts: {
  email: string;
  readingId?: string | null;
  domain: EchoDomain;
  question?: string | null;
  summary: string;
}): Promise<{ echo?: SerializedEcho; error?: EchoGating | { reason: 'llm'; message: string } }> {
  const gate = await canCreateEcho(opts.email);
  if (!gate.allowed) return { error: gate };

  const user = await prisma.user.findUnique({
    where: { email: String(opts.email).trim().toLowerCase() },
    select: { id: true },
  });
  if (!user) return { error: { allowed: false, reason: 'no_user', message: 'Compte introuvable.' } };

  const prompt = buildEchoPrompt(opts.domain, opts.question ?? null, opts.summary);
  let parsed = parseEchoJson(extractJsonObject((await callOracle(prompt)) || ''));
  if (!parsed) {
    // Les modèles de secours omettent parfois une clé → une seule relance explicite.
    const retry = (await callOracle(
      prompt + '\n\nRAPPEL ABSOLU : renvoie UN objet JSON complet avec les trois clés "textFr", "textEn" et "dueInDays". Rien d\'autre.',
    )) || '';
    parsed = parseEchoJson(extractJsonObject(retry));
  }
  if (!parsed) return { error: { reason: 'llm', message: "L'oracle est silencieux — réessayez plus tard." } };

  const dueAt = new Date(Date.now() + parsed.dueInDays * 86400000);
  const row = await prisma.echo.create({
    data: {
      userId: user.id,
      readingId: opts.readingId ?? null,
      textFr: parsed.textFr,
      textEn: parsed.textEn || null,
      domain: opts.domain,
      dueAt,
    },
  });
  return { echo: serializeEcho(row) };
}
