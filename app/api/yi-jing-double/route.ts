// app/api/yi-jing-double/route.ts
// « Le Double Hexagramme » (zhi gua) — tirage de la transformation.
//
// Le client lance les 49 tiges (roulé orthodoxe 6/7/8/9) puis POSTe les lignes.
// Le serveur RE-DÉRIVE les deux hexagrammes depuis les lignes (le client ne
// peut pas choisir ses numéros) et persiste la paire dans une Reading
// (type 'yi-jing-double'). La lecture de la paire est produite UNE fois par
// l'oracle et stockée (relance = relire le stocké, pas repayer l'IA).
//
// Actions (POST { email, action, ... }) :
//   cast     { lignes[6], question }   → pose le double (1 grand tirage déjà
//                                        consommé par /api/entitlement côté page)
//   read     { id }                    → lecture IA de la paire (FR+EN), idempotent
//   verdict  { id, pct }               → bilan de l'augure à échéance (pas de 25)
// GET ?email= → { double } : double actif (en cours / à sceller / à juger) ou null.
//
// Anti-farm = ÉCONOMIQUE : chaque pose débite 1 grand tirage (côté page, via
// /api/entitlement). Le joueur peut consulter autant de Doubles qu'il veut ; le
// scellement de l'augure est TOUJOURS optionnel (préférence produit).

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callOracle, extractJsonObject, LONG_REQUEST_TIMEOUT_MS } from '@/lib/llm';
import { canCreateEcho } from '@/lib/echo';
import { deriveDouble, type DoubleDerivation } from '@/lib/yi-double';

export const dynamic = 'force-dynamic';

const DAY_MS = 86400000;
const TYPE = 'yi-jing-double';
const sod = (t: number | string | Date) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

interface DoubleState {
  castAt: string;                 // ISO
  question: string | null;
  lignes: number[];               // 6..9, base→sommet
  mutants: number[];
  hexPresent: number;
  hexFutur: number;
  names: { pFr: string; pEn: string; fFr: string; fEn: string };
  read: { sections: { key: string; fr: string; en: string }[]; dueInDays: number } | null;
  sealedAt?: string;              // ISO quand l'augure a été scellé (echo créé)
  verdictPct?: number | null;
}

async function findUser(email: string) {
  return prisma.user.findUnique({
    where: { email: String(email || '').trim().toLowerCase() },
    select: { id: true },
  });
}

async function hexInfo(n: number) {
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT h.element, h.synthese, e.name_en, e.synthese_en
     FROM "hexagrams" h
     LEFT JOIN "hexagrams_en" e ON e.numero = h.numero
     WHERE h.numero = $1 LIMIT 1`, n,
  )) as Array<Record<string, any>>;
  const r = rows[0];
  if (!r) return null;
  return {
    nom: String(r.element || `#${n}`),
    synthese: String(r.synthese || ''),
    nomEn: String(r.name_en || r.element || `#${n}`),
    syntheseEn: String(r.synthese_en || r.synthese || ''),
  };
}

/** Vue publique du double actif (+ état de l'augure lié). */
function doubleView(reading: { id: string; createdAt: Date; interpretation: string | null }, echo: { id: string; textFr: string; textEn: string | null; dueAt: Date; verdict: string | null; verdictPct: number | null } | null) {
  let st: DoubleState;
  try { st = JSON.parse(reading.interpretation || '{}'); } catch { return null; }
  if (!st.castAt || !Array.isArray(st.lignes)) return null;
  return {
    id: reading.id,
    castAt: st.castAt,
    question: st.question ?? null,
    lignes: st.lignes,
    mutants: st.mutants,
    hexPresent: st.hexPresent,
    hexFutur: st.hexFutur,
    names: st.names,
    read: st.read ?? null,
    echo: echo ? {
      id: echo.id, textFr: echo.textFr, textEn: echo.textEn,
      dueAt: echo.dueAt.toISOString(), verdict: echo.verdict, verdictPct: echo.verdictPct,
    } : null,
  };
}

/** dueAtMs calculé au read : castAt + (3..21j) → echo.dueAt au scellement (page). */
async function latestDouble(userId: string) {
  return prisma.reading.findFirst({
    where: { userId, type: TYPE },
    orderBy: { createdAt: 'desc' },
    include: { echo: true },
  });
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') || '';
  const user = await findUser(email);
  if (!user) return NextResponse.json({ double: null });
  const last = await latestDouble(user.id);
  if (!last) return NextResponse.json({ double: null });
  let st: DoubleState;
  try { st = JSON.parse(last.interpretation || '{}'); } catch { return NextResponse.json({ double: null }); }
  // Un double est « actif » tant que son augure n'a pas de verdict (il attend
  // son scellement ou son bilan). Passé le verdict, il sort du chemin de jeu.
  if (last.echo?.verdict) return NextResponse.json({ double: null });
  return NextResponse.json({ double: doubleView(last, last.echo ?? null) });
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const email = String(body.email || '').trim();
  const user = await findUser(email);
  if (!user) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });

  switch (String(body.action || '')) {
    // ── Poser le Double ────────────────────────────────────────────────
    case 'cast': {
      const d: DoubleDerivation | null = deriveDouble(body.lignes);
      if (!d || d.hexPresent === null || d.hexFutur === null) {
        return NextResponse.json({ error: 'lignes invalides (6 valeurs parmi 6,7,8,9).' }, { status: 400 });
      }
      const a = await hexInfo(d.hexPresent);
      const b = await hexInfo(d.hexFutur);
      if (!a || !b) return NextResponse.json({ error: 'hexagramme inconnu en base.' }, { status: 500 });
      const st: DoubleState = {
        castAt: new Date().toISOString(),
        question: body.question ? String(body.question).slice(0, 400) : null,
        lignes: d.lignes,
        mutants: d.mutants,
        hexPresent: d.hexPresent,
        hexFutur: d.hexFutur,
        names: { pFr: a.nom, pEn: a.nomEn, fFr: b.nom, fEn: b.nomEn },
        read: null,
      };
      const reading = await prisma.reading.create({
        data: {
          userId: user.id, type: TYPE,
          spread: 'Le Double Hexagramme (zhi gua)',
          question: st.question,
          cards: JSON.stringify([
            { numero: d.hexPresent, glyph: d.glyphPresent, tag: 'present' },
            ...(d.mutants.length ? [{ numero: d.hexFutur, glyph: d.glyphFutur, tag: 'future' }] : []),
          ]),
          interpretation: JSON.stringify(st),
        },
      });
      return NextResponse.json({ id: reading.id, double: { ...st, id: reading.id, echo: null } });
    }

    // ── Lecture IA de la paire (idempotente) ───────────────────────────
    case 'read': {
      const id = String(body.id || '');
      const reading = await prisma.reading.findFirst({ where: { id, userId: user.id, type: TYPE } });
      if (!reading) return NextResponse.json({ error: 'Double introuvable.' }, { status: 404 });
      let st: DoubleState;
      try { st = JSON.parse(reading.interpretation || '{}'); } catch {
        return NextResponse.json({ error: 'Double illisible.' }, { status: 500 });
      }
      if (st.read) return NextResponse.json({ read: st.read });
      const a = await hexInfo(st.hexPresent);
      const b = await hexInfo(st.hexFutur);
      if (!a || !b) return NextResponse.json({ error: 'hexagramme inconnu.' }, { status: 500 });
      const lang = body.lang === 'en' ? 'en' : 'fr';
      const mutTxt = st.mutants.length
        ? `Lignes mutantes (positions 1-6, base vers sommet) : ${st.mutants.map((i) => i + 1).join(', ')}.`
        : `AUCUNE ligne mutante : la situation est stable — rien ne tourne. Lis la force tranquille de l'hexagramme unique et pourquoi le consultant doit tenir. Dans ce cas 'direction' explique la stabilité comme une puissance, pas une impasse, et 'echeance' plus courte (3-10 jours d'observation).`;
      const prompt = `Tu es un maître du Yi Jing, voix profonde et concrète. Question du consultant : « ${st.question || 'Chemins et avenir'} ». Le tirage zhi gua a donné l'hexagramme ${st.hexPresent} « ${a.nom} » (${a.synthese.slice(0, 260)}) qui se transforme en hexagramme ${st.hexFutur} « ${b.nom} » (${b.synthese.slice(0, 260)}). ${mutTxt}
Écris 4 sections courtes (2 à 3 phrases chacune, ton solennel mais incarné, jamais vague) :
- situation : ce que la situation EST maintenant (hexagramme présent)
- bascule : la/les ligne(s) mutante(s) comme point d'inflexion exact de la question posée
- direction : vers quoi cela tourne (hexagramme futur) et ce que cela exige
- conseil : un acte concret à poser, formulé sans promettre de date
- echeance : UN entier 5..21 = nombre de jours après lequel le retournement peut s'observer (ni 0, ni texte).
Puis traduis chaque section en anglais naturel (pas littéral) dans "en".
Réponds STRICTEMENT en JSON, rien d'autre :
{"sections":[{"key":"situation","fr":"…","en":"…"},{"key":"bascule","fr":"…","en":"…"},{"key":"direction","fr":"…","en":"…"},{"key":"conseil","fr":"…","en":"…"}],"dueInDays":12}`;
      let read: DoubleState['read'] = null;
      for (let attempt = 0; attempt < 2 && !read; attempt++) {
        const raw = (await callOracle(
          attempt === 0 ? prompt : `${prompt}\n\nRAPPEL ABSOLU : {"sections":[4 objets {key,fr,en}],"dueInDays":entier}. Rien d'autre.`,
          { maxTokens: 2000, timeoutMs: LONG_REQUEST_TIMEOUT_MS },
        )) || '';
        try {
          const j = extractJsonObject(raw);
          const secs = Array.isArray(j?.sections) ? j.sections : null;
          const keys = ['situation', 'bascule', 'direction', 'conseil'];
          // Les modèles gratuits peuvent renvoyer les clés dans le désordre :
          // on valide par appartenance, puis on remet l'ordre canonique.
          if (secs && secs.length === 4 && keys.every((k) => secs.some((s: any) => s?.key === k && String(s.fr || '').trim().length > 12))) {
            const byKey = new Map<string, any>(secs.map((s: any) => [String(s.key), s]));
            const due = Math.min(21, Math.max(5, Math.round(Number(j.dueInDays) || 12)));
            read = {
              sections: keys.map((k) => ({ key: k, fr: String(byKey.get(k).fr).trim(), en: String(byKey.get(k).en || byKey.get(k).fr).trim() })),
              dueInDays: due,
            };
          }
        } catch { /* relance */ }
      }
      if (!read) return NextResponse.json({ error: "L'oracle s'est tu — réessayez.", reason: 'llm' }, { status: 502 });
      st.read = read;
      await prisma.reading.update({ where: { id: reading.id }, data: { interpretation: JSON.stringify(st) } });
      return NextResponse.json({ read });
    }

    // ── Sceller l'augure = la promesse du retournement, échéance annoncée ──
    // Echo créé ICI (pas de second appel IA) : texte = section « direction »,
    // dueAt = castAt + dueInDays. Mêmes règles maison que lib/echo (canCreateEcho).
    case 'sealed': {
      const id = String(body.id || '');
      const reading = await prisma.reading.findFirst({ where: { id, userId: user.id, type: TYPE }, include: { echo: true } });
      if (!reading) return NextResponse.json({ error: 'Double introuvable.' }, { status: 404 });
      if (reading.echo) return NextResponse.json({ echoId: reading.echo.id });
      const st: DoubleState = JSON.parse(reading.interpretation || '{}');
      if (!st.read) return NextResponse.json({ error: 'Fais d’abord parler l’oracle.', reason: 'unread' }, { status: 400 });
      const gate = await canCreateEcho(email);
      if (!gate.allowed) {
        return NextResponse.json({ error: gate.message, reason: 'echo-cap' }, { status: 409 });
      }
      const direction = st.read.sections.find((s) => s.key === 'direction') || st.read.sections[0];
      const dueAt = new Date(new Date(st.castAt).getTime() + st.read.dueInDays * DAY_MS);
      const echo = await prisma.echo.create({
        data: {
          userId: user.id, readingId: reading.id,
          textFr: direction.fr, textEn: direction.en || null,
          domain: 'yi-jing', dueAt,
        },
      });
      st.sealedAt = new Date().toISOString();
      await prisma.reading.update({ where: { id: reading.id }, data: { interpretation: JSON.stringify(st) } });
      return NextResponse.json({ echoId: echo.id, dueAt: dueAt.toISOString(), dueInDays: st.read.dueInDays });
    }

    // ── Bilan de l'augure ──────────────────────────────────────────────
    case 'verdict': {
      const id = String(body.id || '');
      const pct = Number(body.pct);
      if (!Number.isInteger(pct) || pct < 0 || pct > 100 || pct % 25 !== 0) {
        return NextResponse.json({ error: 'pct invalide (0/25/50/75/100).' }, { status: 400 });
      }
      const reading = await prisma.reading.findFirst({ where: { id, userId: user.id, type: TYPE }, include: { echo: true } });
      if (!reading) return NextResponse.json({ error: 'Double introuvable.' }, { status: 404 });
      if (!reading.echo) return NextResponse.json({ error: 'Aucun augure scellé.' }, { status: 400 });
      if (reading.echo.verdict) return NextResponse.json({ ok: true, already: true });
      const legacy = pct >= 100 ? 'oui' : pct <= 0 ? 'non' : 'partiel';
      await prisma.echo.update({
        where: { id: reading.echo.id },
        data: { verdict: legacy, verdictPct: pct, verdictAt: new Date() },
      });
      const st: DoubleState = JSON.parse(reading.interpretation || '{}');
      st.verdictPct = pct;
      await prisma.reading.update({ where: { id: reading.id }, data: { interpretation: JSON.stringify(st) } });
      return NextResponse.json({ ok: true, verdict: legacy, verdictPct: pct });
    }

    default:
      return NextResponse.json({ error: 'action inconnue' }, { status: 400 });
  }
}
