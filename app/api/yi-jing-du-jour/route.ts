import { NextRequest, NextResponse } from 'next/server';
import { buildProfileBlock } from '@/lib/profile';
import { prisma } from '@/lib/prisma';
import { enforceGate } from '@/lib/gate-server';
import { requireSessionEmail } from '@/lib/session';
import { calcAge } from '@/lib/dates';
import { callOracle, extractJsonObject } from '@/lib/llm';
import { resolveLang, outputDirective, type LlmLang } from '@/lib/lang';
import {
  dayKey,
  dailyHexNumber,
  dailyMutatingLines,
  hexForOffset,
  hexagramLines,
  transformedHexagram,
} from '@/lib/yi-daily';

export const dynamic = 'force-dynamic';

type HexRow = {
  numero: number;
  caractere: string;
  pinyin: string;
  element: string | null;   // NOTE : contient le NOM de l'hexagramme (Ciel, Terre…)
  strategie: string | null;
  attitude: string | null;
  conseil: string | null;
  synthese: string | null;
};

type HexSiblings = {
  nameEn?: string | null; syntheseEn?: string | null;
  nameEs?: string | null; syntheseEs?: string | null;
  nameHi?: string | null; syntheseHi?: string | null;
};

function shape(h: HexRow, en?: HexSiblings | null) {
  return {
    numero: h.numero,
    caractere: h.caractere,
    pinyin: h.pinyin,
    name: h.element ?? '',        // nom FR (le champ `element` porte le nom)
    strategie: h.strategie ?? '',
    attitude: h.attitude ?? '',
    conseil: h.conseil ?? '',
    synthese: h.synthese ?? '',
    lignes: hexagramLines(h.numero),
    nameEn: en?.nameEn ?? null,
    syntheseEn: en?.syntheseEn ?? null,
    nameEs: en?.nameEs ?? null,
    syntheseEs: en?.syntheseEs ?? null,
    nameHi: en?.nameHi ?? null,
    syntheseHi: en?.syntheseHi ?? null,
  };
}

async function loadHexas(numList: number[]) {
  const [hexas, ens, ess, his] = await Promise.all([
    prisma.hexagram.findMany({ where: { numero: { in: numList } } }),
    prisma.hexagramEn.findMany({ where: { numero: { in: numList } } }),
    prisma.hexagramEs.findMany({ where: { numero: { in: numList } } }),
    prisma.hexagramHi.findMany({ where: { numero: { in: numList } } }),
  ]);
  const byNum = new Map<number, HexRow>(hexas.map((h) => [h.numero, h as HexRow]));
  const byNumEn = new Map<number, HexSiblings>();
  const merge = (numero: number, patch: HexSiblings) =>
    byNumEn.set(numero, { ...(byNumEn.get(numero) || {}), ...patch });
  ens.forEach((e) => merge(e.numero, { nameEn: e.nameEn, syntheseEn: e.syntheseEn }));
  ess.forEach((e) => merge(e.numero, { nameEs: e.nameEs, syntheseEs: e.syntheseEs }));
  his.forEach((e) => merge(e.numero, { nameHi: e.nameHi, syntheseHi: e.syntheseHi }));
  return { byNum, byNumEn };
}

/** TEMPORAIRE (tests animation) — si true, le verrou du tirage quotidien
 *  saute : le sceau se rejoue a volonte. Remettre false AVANT commit. */
const TEST_UNLOCK_DAILY = false;
function dayUnlock() { return TEST_UNLOCK_DAILY; }

/** Énergie de la période (calendrier fixe commun à tous) : hexagramme dont la
 *  plage dateDebut→dateFin est la plus récemment débutée avant le jour donné.
 *  Le « report » du dernier début couvre aussi les rares trous du calendrier. */
type PeriodHex = { numero: number; caractere: string; pinyin: string; name: string; from: string; to: string; conseil: string };
function mdKey(s: string): number { const [d, m] = String(s).split('/').map(Number); return (m || 0) * 100 + (d || 0); }
async function periodHexFor(date: Date): Promise<PeriodHex | null> {
  const rows = await prisma.hexagram.findMany({
    select: { numero: true, caractere: true, pinyin: true, element: true, dateDebut: true, dateFin: true, conseil: true },
  });
  const today = (date.getMonth() + 1) * 100 + date.getDate();
  let best: PeriodHex | null = null;
  let bestK = -1;
  for (const r of rows) {
    const k = mdKey(r.dateDebut);
    if (k <= today && k > bestK) { bestK = k; best = { numero: r.numero, caractere: r.caractere, pinyin: r.pinyin, name: r.element, from: r.dateDebut, to: r.dateFin, conseil: r.conseil }; }
  }
  return best;
}

/** Contexte dessiné pour un compte et un jour (déterministe, stable 24 h). */
function drawFor(email: string, date: Date, periodNumero?: number | null) {
  const numero = periodNumero ?? dailyHexNumber(date, email);
  const mutating = dailyMutatingLines(date, email);
  return { numero, mutating, transformedNum: transformedHexagram(numero, mutating) };
}

/** GET : état du jour SANS débit ni IA.
 *  - `tired=true` → l'abonné a déjà tiré aujourd'hui : résultat complet renvoyé
 *    (conseil en base, relu tel quel), `alreadyDrawn: true`.
 *  - sinon → `alreadyDrawn: false` + préparation (hexagramme NON révélé tant
 *    que le user n'a pas consenti : on renvoie seulement ce qui sert au cadre —
 *    compteur collection, date, hier/demain cachés).
 *  Le résultat n'est révélé/compté qu'au POST (consentement). */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const claimed = (searchParams.get('email') || '').trim().toLowerCase() || null;
    const sess = requireSessionEmail(req, claimed);
    if ('error' in sess) return sess.error;
    const email = sess.email;

    const dateStr = searchParams.get('date') || dayKey();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(`${dateStr}T12:00:00`) : new Date();
    const today = dayKey(date);

    const row = await prisma.dailyDrawView.findUnique({
      where: { email_date: { email, date: today } },
    });
    // V2 uniquement : une ligne « déjà tirée » ne compte que si le champ
    // `mutating` est posé (trace du nouveau flux). Les lignes héritées de la
    // v1 (simple vue, sans conseil stocké) ne court-circuitent PAS le
    // consentement : le user peut (et doit) tirer « pour de vrai » aujourd'hui.
    const v2Draw = row && row.mutating !== null && !dayUnlock();

    // Collection + streak (lecture seule, aucun débit).
    const views = await prisma.dailyDrawView.findMany({
      where: { email },
      orderBy: { date: 'desc' },
      take: 400,
      select: { date: true, numero: true },
    });
    const dates = new Set(views.map((v) => v.date));
    const uniqHex = new Set(views.map((v) => v.numero));
    let streak = 0;
    const cursor = new Date(date);
    if (!dates.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dates.has(dayKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    const collection = { viewed: uniqHex.size, streak, total: 64 };

    if (!v2Draw) {
      // Jamais tiré aujourd'hui → rien n'est révélé (pas de spoiler gratuit).
      const dobKnown = !!(await prisma.user.findUnique({
        where: { email }, select: { dateOfBirth: true },
      }))?.dateOfBirth;
      return NextResponse.json({
        found: true,
        date: today,
        alreadyDrawn: false,
        collection,
        hasAdvice: false,
        dobKnown,
      });
    }

    // Déjà tiré → résultat complet, relu en base (aucun appel IA).
    const period = await periodHexFor(date).catch(() => null);
    const { numero, mutating, transformedNum } = drawFor(email, date, period?.numero ?? null);
    const nums = new Set<number>([numero]);
    if (transformedNum) nums.add(transformedNum);
    const dTomorrow = new Date(date); dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomorrowNum = (await periodHexFor(dTomorrow).catch(() => null))?.numero ?? hexForOffset(1, date, email);
    nums.add(tomorrowNum);
    const { byNum, byNumEn } = await loadHexas(Array.from(nums));
    const main = byNum.get(numero);
    if (!main) {
      return NextResponse.json({ found: false, error: 'hexagramme absent' }, { status: 500 });
    }
    const savedMutating = (() => {
      try { const a = JSON.parse(String(row.mutating || '[]')); return Array.isArray(a) ? a : mutating; }
      catch { return mutating; }
    })();

    return NextResponse.json({
      found: true,
      date: today,
      alreadyDrawn: true,
      collection,
      hasAdvice: !!row.advice,
      adviceMissing: !row.advice,
      hexagram: shape(main, byNumEn.get(numero) || null),
      mutating: savedMutating,
      transformed: transformedNum && byNum.get(transformedNum)
        ? shape(byNum.get(transformedNum)!, byNumEn.get(transformedNum) || null)
        : null,
      tomorrow: byNum.get(tomorrowNum)
        ? { numero: tomorrowNum, caractere: byNum.get(tomorrowNum)!.caractere, pinyin: byNum.get(tomorrowNum)!.pinyin }
        : null,
      personalAdvice: row.advice ?? null,
      period,
    });
  } catch (error) {
    console.error('Erreur API yi-jing-du-jour GET:', error);
    return NextResponse.json(
      { found: false, error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 },
    );
  }
}

/** POST : consentement explicite → tirage du jour.
 *  - déjà tiré aujourd'hui → renvoie le résultat stocké (aucun débit, aucune IA) ;
 *  - sinon → débit 1 tirage de base (via le quota-guard standard, dedup inclus),
 *    génération du conseil IA (4-5 phrases) dans la langue du compte, sauvegarde
 *    en base + Mes tirages. Corps : { email, flowId? }. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const claimed = String(body?.email || '').trim().toLowerCase() || null;
    const sess = requireSessionEmail(req, claimed);
    if ('error' in sess) return sess.error;
    const email = sess.email;

    const today = dayKey();
    const existing = await prisma.dailyDrawView.findUnique({
      where: { email_date: { email, date: today } },
    });
    if (existing && existing.mutating !== null) {
      if (dayUnlock()) {
        // TEMPORAIRE (tests) : rejoue le sceau SANS débit, SANS IA, sans
        // écriture — renvoie le résultat stocké comme une fraîche révélation.
        const dNow = new Date();
        const replayPeriod = await periodHexFor(dNow).catch(() => null);
        const numero = replayPeriod?.numero ?? existing.numero;
        const savedMutating = (() => {
          try { const a = JSON.parse(String(existing.mutating || '[]')); return Array.isArray(a) ? a : []; }
          catch { return []; }
        })();
        const transformedNum = transformedHexagram(numero, savedMutating);
        const tomorrowNum = hexForOffset(1, dNow, email);
        const nums = new Set<number>([numero, tomorrowNum]);
        if (transformedNum) nums.add(transformedNum);
        const { byNum, byNumEn } = await loadHexas(Array.from(nums));
        const main = byNum.get(numero);
        if (!main) return NextResponse.json({ found: false, error: 'hexagramme absent' }, { status: 500 });
        const transformed = transformedNum ? byNum.get(transformedNum) : null;
        return NextResponse.json({
          ok: true,
          alreadyDrawn: false,
          date: today,
          hexagram: shape(main, byNumEn.get(numero) || null),
          mutating: savedMutating,
          transformed: transformed && transformedNum
            ? shape(transformed, byNumEn.get(transformedNum) || null)
            : null,
          tomorrow: byNum.get(tomorrowNum)
            ? { numero: tomorrowNum, caractere: byNum.get(tomorrowNum)!.caractere, pinyin: byNum.get(tomorrowNum)!.pinyin }
            : null,
          personalAdvice: existing.advice ?? null,
          hasAdvice: !!existing.advice,
          period: replayPeriod,
        });
      }
      // Tirage V2 déjà fait aujourd'hui → relire sans repayer (la page
      // rafraîchit via GET). Une ligne v1 (simple vue) ne bloque pas : le
      // user consent au vrai tirage par un POST de débit.
      return NextResponse.json({ ok: true, alreadyDrawn: true });
    }

    // Verrou de quota : type base 'yi-jing-du-jour' → débit mensuel abonné /
    // pack / tickets / crédits, avec réponse 402 précise si plafond atteint.
    const gate = await enforceGate(req, body ?? {}, 'yi-jing-du-jour', null);
    if (gate) return gate;

    const date = new Date();
    const period = await periodHexFor(date).catch(() => null);
    const { numero, mutating, transformedNum } = drawFor(email, date, period?.numero ?? null);
    const nums = new Set<number>([numero]);
    if (transformedNum) nums.add(transformedNum);
    const dTomorrow = new Date(date); dTomorrow.setDate(dTomorrow.getDate() + 1);
    const tomorrowNum = (await periodHexFor(dTomorrow).catch(() => null))?.numero ?? hexForOffset(1, date, email);
    nums.add(tomorrowNum);
    const { byNum, byNumEn } = await loadHexas(Array.from(nums));
    const main = byNum.get(numero);
    if (!main) {
      return NextResponse.json({ found: false, error: 'hexagramme absent' }, { status: 500 });
    }

    // ── Conseil IA : tendres indices personnels, jamais de citation brute ──
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, firstName: true, lastName: true,
        dateOfBirth: true, gender: true,
      },
    });
    const lang: LlmLang = resolveLang(body?.lang);
    const age = user?.dateOfBirth ? calcAge(user.dateOfBirth.toISOString()) : null;
    const dob = user?.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null;
    const g = (user?.gender || '').toLowerCase();
    const gender = g === 'female' ? 'femme' : g === 'male' ? 'homme' : null;
    const transformed = transformedNum ? byNum.get(transformedNum) : null;
    const transformedName = transformed
      ? (lang === 'en' ? byNumEn.get(transformedNum!)?.nameEn
        : lang === 'es' ? byNumEn.get(transformedNum!)?.nameEs
        : lang === 'hi' ? byNumEn.get(transformedNum!)?.nameHi : null) || transformed.element
      : null;
    const linesHint = mutating.length
      ? mutating.map((l) => `${l}`).join(', ')
      : 'aucune (journée stable)';

    const name = user?.firstName || '';
    const hints = [
      name ? `prénom : ${name}${user?.lastName ? ` ${user.lastName}` : ''}` : null,
      dob ? `phase de vie : ${age} ans` : null,
      gender ? `polarité ressentie : ${gender}` : null,
    ].filter(Boolean).join(' ; ');
    // Profil oracle (pastilles volontaires) — complète les indices fins.
    const yjProfile = await buildProfileBlock(email);

    const periodBits: Record<string, string> = period
      ? { '{PERIODE_FROM}': period.from, '{PERIODE_TO}': period.to }
      : {};
    const weavePeriod = (s: string) => period
      ? s.replace(/\{PERIODE_[A-Z]+\}/g, (m) => periodBits[m] || '')
      : s.replace(/(?:Ce tirage inscrit[^\n]*?personnelle — appuie-toi sur elles\.\s*|This draw situates[^\n]*?variation — lean on them\.\s*)/g, '');
    const base = lang === 'en'
      ? `Today's personal I Ching draw for this consultant: hexagram #${main.numero} "${main.element}" (${main.pinyin}). Core advice: "${main.conseil}". Strategy: "${main.strategie}". Attitude: "${main.attitude}".${transformed ? ` Moving lines: ${linesHint} — the day matures into hexagram #${transformed!.numero} "${transformedName}".` : ` Moving lines: ${linesHint}.`}
Consultant's subtle, non-literal cues (TENDENCIES only): ${hints || 'none'}.${yjProfile}
This draw situates the day within the period's energy ({PERIODE_FROM} to {PERIODE_TO}); your moving lines are its strictly personal variation — lean on them. Write guidance of exactly 5 to 6 sentences for THIS day. Soak it in the hexagram's base energy and the day's draw, and BUILD ON the consultant's personal cues: let them shape the stakes, the examples and the advice itself — yet never quote the birth date, age, gender or name as facts. Warm, precise, oracle voice. Reply ONLY in JSON with key "advice" (a single string of 5-6 sentences).`
      : `Tirage personnel du jour pour ce consultant : hexagramme n°${main.numero} « ${main.element} » (${main.pinyin}). Conseil socle : « ${main.conseil} ». Stratégie : « ${main.strategie} ». Attitude : « ${main.attitude} ».${transformed ? ` Lignes mutantes : ${linesHint} — la journée mûrit vers l'hexagramme n°${transformed!.numero} « ${transformedName} ».` : ` Lignes mutantes : ${linesHint} (journée stable).`}
Indices fins et non littéraux du consultant (de SIMPLES tendances) : ${hints || 'aucun'}.${yjProfile}
Ce tirage inscrit la journée dans l'énergie de la période (du {PERIODE_FROM} au {PERIODE_TO}) ; tes lignes mutantes en sont la variation strictement personnelle — appuie-toi sur elles. Rédige un conseil de 5 à 6 phrases exactement pour CETTE journée. Impregne-le de l'énergie de base de l'hexagramme et du tirage du jour, et APPUIE-TOI sur les indices personnels du consultant : qu'ils façonnent réellement les enjeux, les exemples et le conseil lui-même — sans jamais citer la date de naissance, l'âge, le sexe ou le nom comme des certitudes. Voix d'oracle, chaleureuse et précise. Réponds UNIQUEMENT en JSON avec la clé "advice" (une seule chaîne de 5-6 phrases).${outputDirective(lang)}`;
    const woven = weavePeriod(base);

    let advice: string | null = null;
    try {
      const content = await callOracle(woven, { maxTokens: 1100, temperature: 0.8 });
      if (content) {
        const parsed = extractJsonObject(content);
        const raw = typeof parsed?.advice === 'string' ? parsed.advice.trim() : '';
        if (raw) advice = raw;
      }
    } catch {
      // IA indisponible → le conseil socle de la table prend le relais (page).
    }

    // Persistance : résultat du jour (relisible sans re-débit) + Mes tirages.
    await prisma.dailyDrawView.upsert({
      where: { email_date: { email, date: today } },
      create: { email, date: today, numero, mutating: JSON.stringify(mutating), advice },
      update: { numero, mutating: JSON.stringify(mutating), advice },
    });
    if (user) {
      await prisma.reading.create({
        data: {
          userId: user.id,
          type: 'yi-jing-du-jour',
          question: null,
          cards: JSON.stringify({ numero, mutating, transformed: transformedNum }),
          interpretation: advice ? JSON.stringify({ advice }) : null,
        },
      }).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      alreadyDrawn: false,
      date: today,
      hexagram: shape(main, byNumEn.get(numero) || null),
      mutating,
      transformed: transformed && transformedNum
        ? shape(transformed, byNumEn.get(transformedNum) || null)
        : null,
      tomorrow: byNum.get(tomorrowNum)
        ? { numero: tomorrowNum, caractere: byNum.get(tomorrowNum)!.caractere, pinyin: byNum.get(tomorrowNum)!.pinyin }
        : null,
      personalAdvice: advice,
      hasAdvice: !!advice,
      period,
    });
  } catch (error) {
    console.error('Erreur API yi-jing-du-jour POST:', error);
    return NextResponse.json(
      { found: false, error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 },
    );
  }
}
