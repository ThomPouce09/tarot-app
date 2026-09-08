import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRights } from '@/lib/entitlements';
import { calcAge } from '@/lib/dates';
import { callOracle, extractJsonObject } from '@/lib/llm';
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
  element: string | null;
  strategie: string | null;
  attitude: string | null;
  conseil: string | null;
  synthese: string | null;
};

function shape(h: HexRow, en?: { nameEn: string | null; syntheseEn: string | null } | null) {
  return {
    numero: h.numero,
    caractere: h.caractere,
    pinyin: h.pinyin,
    element: h.element ?? '',
    strategie: h.strategie ?? '',
    attitude: h.attitude ?? '',
    conseil: h.conseil ?? '',
    synthese: h.synthese ?? '',
    lignes: hexagramLines(h.numero),
    nameEn: en?.nameEn ?? null,
    syntheseEn: en?.syntheseEn ?? null,
  };
}

/** GET : hexagramme du jour + contexte. personal=1 → lecture réservée aux
 *  Initiés/Arkane : même hexagramme collectif du jour, conseil adapté par l'IA
 *  à l'âge du consultant (date de naissance). */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get('email') || '').trim().toLowerCase() || null;
    const personal = searchParams.get('personal') === '1';
    const dateStr = searchParams.get('date') || dayKey();

    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? new Date(`${dateStr}T12:00:00`) : new Date();
    const today = dayKey(date);

    // ── Mode personnel : gating Initié/Arkane + profil (date exacte, sexe) ──
    let age: number | null = null;
    let dob: string | null = null;
    let gender: string | null = null;
    if (personal) {
      if (!email) {
        return NextResponse.json({ found: false, error: 'Connexion requise', code: 'not-logged' }, { status: 401 });
      }
      const rights = await getRights(email);
      if (!rights || rights.level === 'apprenti') {
        return NextResponse.json({ found: false, error: 'Réservé aux Initiés et Arkanes', code: 'upgrade-required' }, { status: 402 });
      }
      const u = await prisma.user.findUnique({ where: { email }, select: { dateOfBirth: true, gender: true } });
      age = u?.dateOfBirth ? calcAge(u.dateOfBirth.toISOString()) : null;
      dob = u?.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null;
      const g = (u?.gender || '').toLowerCase();
      gender = g === 'female' ? 'femme' : g === 'male' ? 'homme' : null;
    }

    // Le tirage reste CELUI DU JOUR (collectif), y compris en mode personnel :
    // l'IA n'adapte que le conseil à l'âge du consultant.
    const seed = personal ? null : email;
    const numero = dailyHexNumber(date, seed);
    const mutating = dailyMutatingLines(date, seed);
    const transformedNum = transformedHexagram(numero, mutating);

    const nums = new Set<number>([numero]);
    if (transformedNum) nums.add(transformedNum);
    const yesterdayNum = hexForOffset(-1, date, seed);
    const tomorrowNum = hexForOffset(1, date, seed);
    nums.add(yesterdayNum);
    nums.add(tomorrowNum);

    const [hexas, ens] = await Promise.all([
      prisma.hexagram.findMany({ where: { numero: { in: Array.from(nums) } } }),
      prisma.hexagramEn.findMany({ where: { numero: { in: Array.from(nums) } } }),
    ]);
    const byNum = new Map<number, HexRow>(hexas.map((h) => [h.numero, h as HexRow]));
    const byNumEn = new Map<number, { nameEn: string | null; syntheseEn: string | null }>(
      ens.map((e) => [e.numero, { nameEn: e.nameEn, syntheseEn: e.syntheseEn }]),
    );

    const main = byNum.get(numero);
    if (!main) {
      return NextResponse.json({ found: false, error: 'hexagramme absent' }, { status: 500 });
    }

    // ── Conseil personnel (Initié/Arkane) : l'IA compare la tendance du jour
    // à la phase de vie du consultant (date exacte de naissance + sexe,
    // JAMAIS cités mot à mot) pour un conseil sur mesure propre à cette
    // journée. Sans date de naissance → tirage du jour standard + avis de
    // finesse (personalAge = null côté UI).
    let personalAdvice: string | null = null;
    if (personal && age !== null && dob) {
      const isEn = (req.headers.get('accept-language') || '').toLowerCase().startsWith('en');
      const profileFr = `Né le ${dob.split('-').reverse().join('/')} (${age} ans)${gender ? `, ${gender}` : ''}`;
      const profileEn = `Born on ${dob} (${age} years old)${gender ? `, ${gender === 'femme' ? 'female' : 'male'}` : ''}`;
      const prompt = isEn
        ? `Today's collective I Ching draw: hexagram #${main.numero} "${main.element}" (${main.pinyin}). Advice: "${main.conseil}". Strategy: "${main.strategie}". Attitude: "${main.attitude}".
Consultant's confidential profile: ${profileEn}.
Compare today's trend (this hexagram's energy) with the consultant's exact life stage and sex to write guidance tailored to THIS day. NEVER quote or mention the birth date, the age or the sex explicitly — let them only resonate through the tone, the stakes and the examples. Reply ONLY in JSON with keys "advice" (2-3 sentences) and "tone" (one short sentence).`
        : `Hexagramme collectif tiré aujourd'hui : n°${main.numero} « ${main.element} » (${main.pinyin}). Conseil : « ${main.conseil} ». Stratégie : « ${main.strategie} ». Attitude : « ${main.attitude} ».
Profil confidentiel du consultant : ${profileFr}.
Compare la tendance du jour (l'énergie de cet hexagramme) avec la phase de vie exacte et le sexe du consultant pour rédiger un conseil sur mesure propre à cette journée. Ne cite JAMAIS mot à mot la date de naissance, l'âge ou le sexe — laisse-les seulement résonner dans le ton, les enjeux et les exemples. Réponds UNIQUEMENT en JSON avec les clés "advice" (2-3 phrases) et "tone" (une phrase courte).`;
      try {
        const content = await callOracle(prompt, { maxTokens: 1500, temperature: 0.8 });
        if (content) {
          const parsed = extractJsonObject(content);
          const advice = typeof parsed?.advice === 'string' ? parsed.advice.trim() : '';
          const tone = typeof parsed?.tone === 'string' ? parsed.tone.trim() : '';
          if (advice) personalAdvice = tone ? `${advice} — ${tone}` : advice;
        }
      } catch {
        // IA indisponible → l'UI retombe sur le conseil du jour standard
      }
    }

    // Collection + streak (uniquement pour un compte identifié, sur la vue du jour)
    let collection: { viewed: number; streak: number; total: number } | null = null;
    let viewedToday = false;
    if (email) {
      const views = await prisma.dailyDrawView.findMany({
        where: { email },
        orderBy: { date: 'desc' },
        take: 400,
        select: { date: true, numero: true },
      });
      const dates = new Set(views.map((v) => v.date));
      viewedToday = dates.has(today);
      const uniqHex = new Set(views.map((v) => v.numero));
      // streak : jours consécutifs en terminant aujourd'hui ou hier
      let streak = 0;
      const cursor = new Date(date);
      if (!dates.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
      while (dates.has(dayKey(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      collection = { viewed: uniqHex.size, streak, total: 64 };
    }

    return NextResponse.json({
      found: true,
      date: today,
      personal,
      personalAge: personal ? age : null,
      personalAdvice,
      hexagram: shape(main, byNumEn.get(numero) || null),
      mutating,
      transformed: transformedNum && byNum.get(transformedNum)
        ? shape(byNum.get(transformedNum)!, byNumEn.get(transformedNum) || null)
        : null,
      yesterday: byNum.get(yesterdayNum)
        ? { numero: yesterdayNum, caractere: byNum.get(yesterdayNum)!.caractere, pinyin: byNum.get(yesterdayNum)!.pinyin }
        : null,
      tomorrow: byNum.get(tomorrowNum)
        ? { numero: tomorrowNum, caractere: byNum.get(tomorrowNum)!.caractere, pinyin: byNum.get(tomorrowNum)!.pinyin }
        : null,
      collection,
      viewedToday,
    });
  } catch (error) {
    console.error('Erreur API yi-jing-du-jour:', error);
    return NextResponse.json(
      { found: false, error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 },
    );
  }
}

/** POST : enregistrer la consultation du jour (collection + streak). */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();
    const numero = Number(body?.numero);
    const date = String(body?.date || '') || dayKey();
    if (!email || !Number.isInteger(numero) || numero < 1 || numero > 64) {
      return NextResponse.json({ ok: false, error: 'paramètres invalides' }, { status: 400 });
    }
    await prisma.dailyDrawView.upsert({
      where: { email_date: { email, date } },
      update: { numero },
      create: { email, date, numero },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erreur POST yi-jing-du-jour:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
