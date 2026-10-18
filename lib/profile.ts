// lib/profile.ts — Profil oracle (entièrement optionnel).
// Source de vérité des pastilles + validation serveur + injection dans les
// prompts IA (« le consultant en quelques mots »).
//
// Règles voulues par le produit :
//  - pastilles bornées uniquement (aucune saisie libre, sauf la ville) ;
//  - ZÉRO donnée sensible (santé/religion/politique) et ZÉRO nom de tiers ;
//  - un profil vide ne bloque jamais un tirage — le bloc profil est alors
//    simplement absent du prompt ;
//  - l'utilisateur garde la souveraineté : tout champ est effaçable.

import { prisma } from './prisma';
import { isGuestMode } from './guest';

// ── Univers (clé de familiarité) ─────────────────────────────────────────────
export const PROFILE_DOMAINS = ['amour', 'famille', 'travail', 'etudes', 'argent', 'projets', 'serenite'] as const;
export const PROFILE_LIFE_STAGES = ['etudes', 'active', 'reconversion', 'parenthese', 'retraite', 'installation', 'separation', 'nouveau-depart'] as const;
export const PROFILE_TONES = ['direct', 'poetique', 'concret', 'introspection'] as const;
export const PROFILE_FAMILIARITY = ['debutant', 'habitue', 'praticien'] as const;

export type ProfileDomain = (typeof PROFILE_DOMAINS)[number];
export type ProfileLifeStage = (typeof PROFILE_LIFE_STAGES)[number];
export type ProfileTone = (typeof PROFILE_TONES)[number];
export type ProfileFamiliarity = (typeof PROFILE_FAMILIARITY)[number];

// Libellés FR injectés dans les prompts (les prompts IA sont rédigés en FR,
// la directive de langue de sortie s'applique ensuite — outputDirective).
const DOM_FR: Record<ProfileDomain, string> = {
  amour: 'l’amour', famille: 'la famille', travail: 'le travail', etudes: 'les études',
  argent: 'l’argent', projets: 'les projets', serenite: 'la sérénité',
};
const STAGE_FR: Record<ProfileLifeStage, string> = {
  etudes: 'en études', active: 'en vie active', reconversion: 'en reconversion professionnelle',
  parenthese: 'dans une parenthèse de vie (congé, pause)', retraite: 'à la retraite',
  installation: 'en installation (nouveau foyer, nouvelle vie)', separation: 'dans une séparation',
  'nouveau-depart': 'dans un nouveau départ',
};
const TONE_FR: Record<ProfileTone, string> = {
  direct: 'franc et direct', poetique: 'poétique et symbolique',
  concret: 'avec des conseils concrets à appliquer', introspection: 'introspectif et psychologique',
};
const FAM_FR: Record<ProfileFamiliarity, string> = {
  debutant: 'grand débutant dans ces pratiques — mots simples, éviter le jargon',
  habitue: 'habitué — vocabulaire courant des pratiques accepté',
  praticien: 'praticien — employer les termes exacts des traditions',
};

// ── Validation serveur (strictes — jamais de texte libre hors ville) ────────
const isOneOf = <T extends string>(v: unknown, set: readonly T[]): v is T =>
  typeof v === 'string' && (set as readonly string[]).includes(v);

export function cleanDomains(v: unknown): ProfileDomain[] {
  if (!Array.isArray(v)) return [];
  const out: ProfileDomain[] = [];
  for (const x of v) if (isOneOf(x, PROFILE_DOMAINS) && !out.includes(x)) out.push(x);
  return out;
}
export function cleanCity(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/\s+/g, ' ').slice(0, 60);
  // Lettres (accents compris), tirets, apostrophes, points — pas de chiffres :
  // on refuse tout ce qui ressemblerait à une adresse précise ou un autre usage.
  if (!s || !/^[A-Za-zÀ-ÖØ-öø-ÿŒœ-]+(?:[ .'-][A-Za-zÀ-ÖØ-öø-ÿŒœ-]+)*$/.test(s)) return null;
  return s;
}
export function cleanHour(v: unknown): string | null {
  if (v === '' || v === null) return null;
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return null;
  return v;
}

export type ProfilePayload = {
  domains: string[]; lifeStage: string | null; tone: string | null;
  familiarity: string | null; birthTown: string | null; birthHour: string | null; birthCountry?: string | null;
  comment?: string | null;
};
export type ProfileShape = {
  domains: ProfileDomain[]; lifeStage: ProfileLifeStage | null; tone: ProfileTone | null;
  familiarity: ProfileFamiliarity | null; birthTown: string | null; birthHour: string | null; birthCountry: string | null;
  comment: string | null;
};

// Le mot que l'utilisateur choisit librement pour dire qui il est : texte
// nettoyé (espaces, longueur bornée à 200 — assez pour une phrase, trop court
// pour détourner le prompt).
export function cleanComment(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim().slice(0, 200);
  return s || null;
}

/** Normalise un corps (ou null) ; renvoie null si rien d'exploitable. */
export function sanitizeProfile(body: unknown): ProfileShape | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const lifeStage = isOneOf(b.lifeStage, PROFILE_LIFE_STAGES) ? b.lifeStage : null;
  const tone = isOneOf(b.tone, PROFILE_TONES) ? b.tone : null;
  const familiarity = isOneOf(b.familiarity, PROFILE_FAMILIARITY) ? b.familiarity : null;
  const birthTown = cleanCity(b.birthTown);
  // Pays de naissance : code ISO 3166-1 uniquement (facultatif).
  const birthCountry =
    typeof b.birthCountry === 'string' && /^[A-Za-z]{2}$/.test(b.birthCountry) ? b.birthCountry.toUpperCase() : null;
  const birthHour = b.birthHour === null ? null : cleanHour(b.birthHour);
  const comment = b.comment === null ? null : cleanComment(b.comment);
  return {
    domains: cleanDomains(b.domains),
    lifeStage, tone, familiarity, birthTown, birthHour, birthCountry, comment,
  };
}

/** Le profil contient-il au moins une réponse utile ? (sinon = vide) */
export function profileHasData(p: {
  domains: readonly string[]; lifeStage: string | null; tone: string | null;
  familiarity: string | null; birthTown: string | null; birthHour: string | null; birthCountry?: string | null;
  comment?: string | null;
} | null | undefined): boolean {
  if (!p) return false;
  return p.domains.length > 0 || !!p.lifeStage || !!p.tone || !!p.familiarity || !!p.birthTown || !!p.birthHour || !!p.birthCountry || !!p.comment;
}

// Signe solaire depuis la date de naissance (bornes classiques, approximation
// acceptable pour l'usage symbolique ; l'ascendant complet se joue côté tiré —
// ici l'IA reçoit le signe + l'heure/lieu pour affiner le ton).
export function sunSign(dob: Date | null): string | null {
  if (!dob) return null;
  const t: [number, number, number, string][] = [
    // [mois, jour_début, jour_fin, signe]
    [1, 1, 19, 'Capricorne'], [1, 20, 31, 'Verseau'], [2, 1, 18, 'Verseau'], [2, 19, 29, 'Poissons'],
    [3, 1, 20, 'Poissons'], [3, 21, 31, 'Bélier'], [4, 1, 19, 'Bélier'], [4, 20, 30, 'Taureau'],
    [5, 1, 20, 'Taureau'], [5, 21, 31, 'Gémeaux'], [6, 1, 20, 'Gémeaux'], [6, 21, 30, 'Cancer'],
    [7, 1, 22, 'Cancer'], [7, 23, 31, 'Lion'], [8, 1, 22, 'Lion'], [8, 23, 31, 'Vierge'],
    [9, 1, 22, 'Vierge'], [9, 23, 30, 'Balance'], [10, 1, 22, 'Balance'], [10, 23, 31, 'Scorpion'],
    [11, 1, 21, 'Scorpion'], [11, 22, 30, 'Sagittaire'], [12, 1, 21, 'Sagittaire'], [12, 22, 31, 'Capricorne'],
  ];
  const mo = dob.getUTCMonth() + 1, d = dob.getUTCDate();
  return t.find(([m, a, b]) => m === mo && d >= a && d <= b)?.[3] ?? null;
}

/**
 * Bloc « le consultant en quelques mots » pour les prompts IA.
 * Renvoie '' (jamais null/undefined — composition +'' sans risque) si le
 * compte est introuvable ou le profil vide : l'interprétation reprend alors
 * exactement son comportement actuel, sans contrainte nouvelle.
 *
 * Les routes appellent ça côté serveur, après leur propre vérification de
 * session — le profil ne transmet jamais au navigateur plus que l'API /profile.
 */
/** Signe-t-on un bloc profil pour un compte « vide » : les pastilles seules
 * comptent. La date de naissance vit déjà dans l'identité du compte et
 * certaines routes (yi-jing-du-jour) la citent déjà — ne pas la réinjecter
 * ici sans demande explicite de l'utilisateur (charte : pastilles volontaires). */
export async function buildProfileBlock(email: string | null | undefined): Promise<string> {
  const e = (email || '').trim().toLowerCase();
  if (!e) return '';
  // MODE INVITÉ : le tirage est prêté à un tiers — AUCUNE donnée personnelle
  // du compte hôte ne part à l'IA (prompt structurellement identique). Point de
  // passage obligé : TOUTES les injections de profil du projet viennent ici.
  if (await isGuestMode(e)) return '';
  let u;
  try {
    u = await prisma.user.findUnique({
      where: { email: e },
      select: {
        dateOfBirth: true,
        domains: true, lifeStage: true, tone: true, familiarity: true,
        birthTown: true, birthHour: true, birthCountry: true, comment: true,
      },
    });
  } catch {
    return ''; // base indisponible : on interprète sans profil, jamais bloqué
  }
  if (!u || !profileHasData(u)) return '';

  const lines: string[] = [];

  // Identité symbolique : uniquement si l'utilisateur a REMPLI le bloc
  // naissance du formulaire (consentement explicite) — la date de naissance du
  // compte n'est jamais injectée seule. On obtient signe (+ ascendant possible).
  if (u.birthTown || u.birthHour || u.birthCountry) {
    const bits: string[] = [];
    if (u.dateOfBirth) bits.push(`né le ${u.dateOfBirth.toISOString().slice(0, 10)}`);
    if (u.birthTown) bits.push(`à ${u.birthTown}`);
    if (u.birthCountry) bits.push(`pays : ${u.birthCountry}`);
    if (u.birthHour) bits.push(`à ${u.birthHour}`);
    const sign = sunSign(u.dateOfBirth);
    if (sign) bits.push(`signe solaire : ${sign}`);
    lines.push(bits.join(', ') + '.');
    lines.push('Tu peux t’appuyer sur ces éléments de thème natal (ascendant, maisons) quand le tirage les éclaire, sans jamais les inventer ni les poser comme des certitudes.');
  }

  if (u.domains.length) {
    lines.push('Ce qui compte pour lui/elle en ce moment : ' + u.domains.map((d) => DOM_FR[d as ProfileDomain] || d).filter(Boolean).join(', ') + '.');
  }
  if (u.lifeStage && STAGE_FR[u.lifeStage as ProfileLifeStage]) {
    lines.push('Son étape de vie : il/elle est ' + STAGE_FR[u.lifeStage as ProfileLifeStage] + '.');
  }
  if (u.tone && TONE_FR[u.tone as ProfileTone]) {
    lines.push('Le ton qu’il/elle attend : de préférence ' + TONE_FR[u.tone as ProfileTone] + '.');
  }
  if (u.familiarity && FAM_FR[u.familiarity as ProfileFamiliarity]) {
    lines.push('Son rapport aux tirages de voyance : ' + FAM_FR[u.familiarity as ProfileFamiliarity] + '.');
  }
  // Mot libre choisi par le consultant (« Que voulez-vous partager sur vous ? ») :
  // verbatim, sans interprétation — c'est sa propre définition de soi.
  if (u.comment) {
    lines.push('Sa propre description, en ses mots : « ' + u.comment + ' »');
  }

  if (!lines.length) return '';
  return '\nLE CONSULTANT EN QUELQUES MOTS (profil optionnel, retenu par lui/elle pour affiner ta lecture — reste naturel, ne lis pas cette liste, tiens-en compte)\n' + lines.join('\n') + '\n';
}

// ── Rappel « créature » (le renard, landing) ─────────────────────────────────
// Le renard s'affiche DE LUI-MÊME sur la landing (aucun clic sur une orbe).
// Déclencheur : ≥ 3 tirages enregistrés ET Profil oracle resté vide.
// Rythme voulu : au premier chargement qui remplit la condition, puis nouvelle
// irruption au bout de 3 JOURS OU PLUS tant que le profil n'est pas rempli.
// « Pas maintenant » (ou clic dehors) = compte comme un refus ; 2 refus =
// on ne redemande plus jamais. Profil complété = plus jamais non plus.

export const PROFILE_PROMPT_MIN_READINGS = 3;
export const PROFILE_PROMPT_SNOOZE_DAYS = 3; // « au bout de 3 jours OU PLUS »

export type ProfilePromptDecision = 'show' | 'suppress' | 'snooze' | 'none';

export async function decideProfilePrompt(email: string | null | undefined): Promise<ProfilePromptDecision> {
  const e = (email || '').trim().toLowerCase();
  if (!e) return 'none';
  try {
    const u = await prisma.user.findUnique({
      where: { email: e },
      select: {
        domains: true, lifeStage: true, tone: true, familiarity: true, birthTown: true, birthHour: true,
        profilePromptSeen: true, profilePromptAt: true, profilePromptRefusals: true,
        readings: { select: { id: true } },
      },
    });
    if (!u) return 'none';
    const readCount = u.readings.length;
    if (readCount < PROFILE_PROMPT_MIN_READINGS) return 'none';
    if (profileHasData(u)) return 'suppress'; // profil complété → plus jamais
    if (u.profilePromptRefusals >= 2) return 'suppress';
    if (!u.profilePromptSeen) return 'show';
    if (!u.profilePromptAt) return 'show';
    const ageDays = (Date.now() - u.profilePromptAt.getTime()) / 86400000;
    return ageDays >= PROFILE_PROMPT_SNOOZE_DAYS ? 'show' : 'none';
  } catch {
    return 'none';
  }
}

// ── Le renard du Profil : contenu partagé (nom + message par langue) ────────
export const FOX_NAMES: Record<'fr' | 'en' | 'es' | 'hi', string> = {
  fr: 'Le renard', en: 'The fox', es: 'El zorro', hi: 'लोमड़ी',
};
export const FOX_TEXTS: Record<'fr' | 'en' | 'es' | 'hi', string> = {
  fr: 'On se connaît un peu, maintenant. Mais l’Oracle aimerait mieux vous connaître. Rien de contraignant : trois ou quatre touches dans votre Profil à compléter, et ses réponses vous ressembleront davantage !',
  en: 'We know each other a little by now. But the Oracle would like to know you better. Nothing binding: three or four taps to complete your profile, and its answers will feel more like you!',
  es: 'Ya nos conocemos un poco. Pero al Oráculo le gustaría conocerte mejor. Nada vinculante: tres o cuatro toques para completar tu perfil, ¡y sus respuestas se parecerán más a ti!',
  hi: 'हम थोड़े जान-पहचानते हैं अब। पर देववाणी आपसे और परिचय चाहेगी। कुछ अनिवार्य नहीं: तीन-चार स्पर्श से अपना प्रोफ़ाइल पूरा कीजिए, और उसके उत्तर आपसे और मिलते-जुलते होंगे!',
};
export function foxPayload(lang: 'fr' | 'en' | 'es' | 'hi') {
  return {
    creature: {
      id: 'fox-profile-reminder', slug: 'renard-rappel-profil',
      name: FOX_NAMES[lang], image: '/images/creatures/renard-rappel-profil.png',
      color: '#E08A3C',
    },
    message: { text: FOX_TEXTS[lang], category: 'profile_prompt' },
  };
}

/**
 * Comptabilise une irruption du renard.
 *  - vue simple (`refused=false`, popup affiché) : l'horloge de 3 jours repart ;
 *  - refus (`refused=true`, « Pas maintenant » ou clic dehors) : horloge +1 et
 *    compteur de refus +1 — à 2 refus, silence définitif.
 * Profil complété entre-temps → `decideProfilePrompt` renvoie 'suppress'.
 */
export async function markProfilePrompt(email: string, refused: boolean): Promise<void> {
  const e = (email || '').trim().toLowerCase();
  if (!e) return;
  try {
    const u = await prisma.user.findUnique({ where: { email: e }, select: { profilePromptRefusals: true } });
    if (!u) return;
    // Vue simple ou refus : l'horloge des 3 jours repart ; seul le refus
    // incrémente le compteur (2 = définitif).
    await prisma.user.update({
      where: { email: e },
      data: { profilePromptSeen: true, profilePromptAt: new Date(), profilePromptRefusals: u.profilePromptRefusals + (refused ? 1 : 0) },
    });
  } catch { /* silencieux : le rappel n'est jamais critique */ }
}

/** Insère le bloc profil juste après la 1re ligne (la « persona ») du prompt :
 *  la consigne de format (ex. « Réponds STRICTEMENT en JSON ») reste en tête
 *  finale, là où les modèles la respectent le mieux. No-op si le bloc est vide. */
export function injectProfile(prompt: string, block: string): string {
  if (!block) return prompt;
  const i = prompt.indexOf('\n');
  return i === -1 ? prompt + block : prompt.slice(0, i + 1) + block + prompt.slice(i + 1);
}
