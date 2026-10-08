// app/api/tarot-semaine/route.ts
// « Les Arcanes de la Semaine » — roue hebdomadaire (7 arcanes majeurs, un par
// jour planétaire). Le tirage coûte 1 grand tirage (consommés via
// /api/entitlement par la page avant POST action:'cast').
//
// Actions (POST { email, action, ... }) :
//   cast      { cards: number[7] }  → crée la lecture (type 'tarot-semaine'),
//                                      état = { castAt, cards, revealed:[] }
//   reveal    { day: 0..6 }         → ajoute un jour ouvert par le user
//   fil-rouge {}                    → l'oracle tisse les 7 cartes (FR+EN, JSON)
//                                      et persiste le texte dans la lecture
//   seal      {}                    → scelle l'augure = fil rouge, échéance
//                                      = jour 7 (castAt + 7 j) ; optionnel
//   verdict   { pct, bestCardIndex? } → notation fine de l'augure (pas de 25)
//                                      mapping legacy oui/partiel/non + %
// GET ?email= → roue active (état calculé : les jours PASSÉS sont auto-révélés)
//               + son augure, ou { wheel: null }.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callOracle } from '@/lib/llm';
import { resolveLang, outputDirective, langName, type LlmLang } from '@/lib/lang';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { canCreateEcho, echoDomainForType, echoIsRevealed } from '@/lib/echo';
// Résonance planétaire canonique (Golden Dawn) — arcane ↔ planète du jour.
// (un fichier de route Next n'exporte que ses handlers → constant en lib/.)
import { isResonant, EXPIRY_DAY } from '@/lib/tarot-semaine';

export const dynamic = 'force-dynamic';

const DAY_MS = 86400000;

type WheelState = {
  castAt: string;          // ISO du tirage
  cards: number[];         // 7 ids d'arcanes majeurs (0..21)
  revealed: number[];      // jours ouverts par le user (les passés s'ajoutent à la lecture)
  filRouge?: { fr: string; en: string };
  days?: { fr: string; en: string; es?: string; hi?: string }[];   // 7 « éclats » (un par position/card) — un seul appel IA
  // Roue ARCHIVÉE = les 7 jours de sa semaine sont écoulés (le user l'a scellée
  // ou non) : elle n'est plus la roue active et n'empêche plus d'en poser une
  // autre. La lecture reste dans l'historique (elle y est depuis sa création).
  archived?: boolean;
  archivedAt?: string;
};

async function findUser(email: string) {
  return prisma.user.findUnique({
    where: { email: String(email || '').trim().toLowerCase() },
    select: { id: true },
  });
}

// Minuit local : les jours de la roue basculent à minuit, pas à l'heure exacte du tirage.
const sod = (t: number | string | Date) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
function nowDayIndex(castAt: string): number {
  return Math.floor((sod(Date.now()) - sod(castAt)) / DAY_MS);
}
// Jour de semaine réel (0=dim…6=sam) de la carte n° `day` de la roue.
const castWeekday = (castAt: string) => new Date(castAt).getDay();

// Grâce de scellement : 5 jours après la fin de la semaine (jour 7) pour sceller
// l'augure (SEAL_GRACE_DAYS + EXPIRY_DAY vivent dans lib/tarot-semaine.ts — un
// fichier de route n'exporte que ses handlers). Passé ce délai sans sceau, la
// roue n'est plus affichée (archivée dans l'historique) et /tarot-semaine propose
// directement un nouveau tirage.

type ReadingRow = { id: string; interpretation: string | null; echo?: any };

/**
 * Archive une roue dont la semaine est ÉCOULÉE (marque `archived` dans l'état
 * persisté). Idempotent, no-op tant que la roue est en cours. Renvoie la
 * lecture — éventuellement réécrite. C'est ce qui libère la place de « roue
 * active » : l'augure scellée ou non, le user peut poser la semaine suivante.
 */
async function autoArchiveIfDone<T extends ReadingRow>(reading: T): Promise<T> {
  let st: WheelState;
  try { st = JSON.parse(reading.interpretation || '{}'); } catch { return reading; }
  if (!st?.castAt || st.archived) return reading;
  if (nowDayIndex(st.castAt) < 7) return reading;   // semaine encore en cours
  const updated = await prisma.reading.update({
    where: { id: reading.id },
    data: { interpretation: JSON.stringify({ ...st, archived: true, archivedAt: new Date().toISOString() }) },
  });
  return { ...reading, interpretation: updated.interpretation };
}

/** Roue PÉRIMÉE = semaine finie depuis plus de la grâce (12 jours) SANS augure
 *  scellée : le fil rouge n'a jamais été scellé, on cesse de l'afficher — la
 *  page retombe sur « Poser la roue de la semaine » (la lecture reste archivée
 *  dans l'historique). Une roue scellée (echo) ne périmera jamais : son bilan
 *  reste dû. */
function isExpiredUnsealed(reading: ReadingRow): boolean {
  if (reading.echo) return false;
  let st: Partial<WheelState> = {};
  try { st = JSON.parse(reading.interpretation || '{}'); } catch { return false; }
  return !!st.castAt && nowDayIndex(st.castAt) >= EXPIRY_DAY;
}

/** État public de la roue (avec jours passés auto-révélés + résonances). */
function wheelView(reading: { id: string; createdAt: Date; cards: string; interpretation: string | null }, echo: any) {
  let st: WheelState;
  try { st = JSON.parse(reading.interpretation || '{}'); } catch { return null; }
  if (!st.cards || st.cards.length !== 7) return null;
  const nowDay = Math.min(nowDayIndex(st.castAt), 7);
  const revealedSet = new Set<number>([...st.revealed, ...Array.from({ length: Math.min(nowDay, 7) }, (_, i) => i)]);
  return {
    readingId: reading.id,
    castAt: st.castAt,
    nowDay,                      // 0..7 (7 = semaine bouclée)
    archived: !!st.archived,     // semaine écoulée → roue archivée dans l'historique
    // Une nouvelle roue est proposée dès que la semaine est bouclée (augure
    // scellée ou non) — c'est ce que la page utilise pour afficher son CTA.
    canCastNext: nowDay >= 7 || !!st.archived,
    dueAt: new Date(new Date(st.castAt).getTime() + 7 * DAY_MS).toISOString(),
    cards: st.cards.map((id: number, day: number) => {
      const open = revealedSet.has(day);
      const card = open ? TAROT_CARDS[id] : null;
      const weekday = (castWeekday(st.castAt) + day) % 7;   // jour réel (0=dim…6=sam)
      // Anti-spoiler serveur : un jour non révélé ne livre NI son id NI son nom
      // NI ses mots-clés NI sa résonance — le JSON public ne peut pas trahir l'avenir.
      return {
        id: open ? id : -1, day, weekday,
        name: open ? (card?.name ?? `Arcane ${id}`) : '???',
        nameEn: open ? (card?.nameEn ?? `Arcana ${id}`) : '???',
        keywords: open ? (card?.keywords ?? []) : [],
        revealed: open,
        resonant: open && isResonant(weekday, id),
        insight: open ? (st.days?.[day] ?? null) : null,
      };
    }),
    // Le fil rouge résume les 7 : réservé à la fin de semaine (ou à l'augure scellé).
    filRouge: nowDay >= 7 || echo ? (st.filRouge || null) : null,
    woven: Array.isArray(st.days) && st.days.length === 7,
    echo: echo ? (() => { const rev = echoIsRevealed(echo.dueAt, echo.verdict); return {
      id: echo.id, textFr: rev ? echo.textFr : '', textEn: rev ? echo.textEn : null, textEs: rev ? (echo.textEs ?? null) : null, textHi: rev ? (echo.textHi ?? null) : null,
      dueAt: echo.dueAt.toISOString(), verdict: echo.verdict,
      verdictPct: echo.verdictPct, bestCardIndex: echo.bestCardIndex,
    }; })() : null,
  };
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') || '';
  const user = await findUser(email);
  if (!user) return NextResponse.json({ wheel: null });
  const readings = await prisma.reading.findMany({
    where: { userId: user.id, type: 'tarot-semaine' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { echo: true },
  });
  if (readings.length === 0) return NextResponse.json({ wheel: null });
  // Auto-archivage : TOUTES les roues dont la semaine est écoulée sont marquées
  // (`archived`) — l'augure scellée ou non — et restent consultables dans
  // l'historique. Écriture idempotente : une roue déjà marquée n'est jamais
  // réécrite. Puis on rend la première roue AFFICHABLE en partant de la plus
  // récente : une roue non scellée dont la semaine est finie depuis plus de la
  // grâce (5 j) est périmée → masquée, la page retombe sur le CTA de nouvelle
  // roue. Une roue scellée (echo) ne périmera jamais : son bilan reste dû.
  let current: (typeof readings)[number] | null = null;
  for (const r of readings) {
    const done = await autoArchiveIfDone(r);
    if (isExpiredUnsealed(done)) continue;
    current = done;
    break;
  }
  if (!current) return NextResponse.json({ wheel: null });
  return NextResponse.json({ wheel: wheelView(current, current.echo) });
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const email = String(body.email || '').trim();
  const user = await findUser(email);
  if (!user) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 });

  const latest = await prisma.reading.findFirst({
    where: { userId: user.id, type: 'tarot-semaine' },
    orderBy: { createdAt: 'desc' },
    include: { echo: true },
  });

  switch (String(body.action || '')) {
    // ── Poser la roue ────────────────────────────────────────────────
    case 'cast': {
      // Une seule roue ACTIVE à la fois — mais « active » s'arrête à la fin des
      // 7 jours : une fois la semaine écoulée, la roue précédente est archivée
      // (augure scellée ou non) et une nouvelle peut être posée.
      if (latest) {
        let prev: Partial<WheelState> = {};
        try { prev = JSON.parse(latest.interpretation || '{}'); } catch { prev = {}; }
        const prevCastAt = prev?.castAt;
        if (prevCastAt && nowDayIndex(prevCastAt) < 7) {
          return NextResponse.json({ error: 'Une roue est déjà en cours.', reason: 'active' }, { status: 409 });
        }
        await autoArchiveIfDone(latest);
      }
      const cards = Array.isArray(body.cards) ? (body.cards as unknown[]).map(Number) : [];
      const valid = cards.length === 7 && cards.every((n) => Number.isInteger(n) && n >= 0 && n <= 21)
        && new Set(cards).size === 7;
      if (!valid) return NextResponse.json({ error: '7 arcanes uniques requis (0-21).' }, { status: 400 });
      const st: WheelState = { castAt: new Date().toISOString(), cards, revealed: [] };
      const reading = await prisma.reading.create({
        data: {
          userId: user.id, type: 'tarot-semaine',
          spread: 'Roue des 7 jours',
          question: null,
          cards: JSON.stringify(cards.map((id) => ({ id, name: TAROT_CARDS[id]?.name }))),
          interpretation: JSON.stringify(st),
        },
      });
      return NextResponse.json({ readingId: reading.id, wheel: wheelView(reading, null) });
    }

    // ── Ouvrir le jour courant ───────────────────────────────────────
    case 'reveal': {
      if (!latest) return NextResponse.json({ error: 'Aucune roue.' }, { status: 404 });
      const st: WheelState = JSON.parse(latest.interpretation || '{}');
      const day = Number(body.day);
      if (day === nowDayIndex(st.castAt) && !st.revealed.includes(day)) st.revealed.push(day);
      await prisma.reading.update({ where: { id: latest.id }, data: { interpretation: JSON.stringify(st) } });
      return NextResponse.json({ wheel: wheelView({ ...latest, interpretation: JSON.stringify(st) }, latest.echo) });
    }

    // ── Tissage : UN seul appel IA produit les 7 éclats quotidiens + le fil rouge.
    // Lancé juste après le cast (le jour courant a son éclairage), idempotent. ──
    case 'weave':
    case 'fil-rouge': {
      if (!latest) return NextResponse.json({ error: 'Aucune roue.' }, { status: 404 });
      const st: WheelState = JSON.parse(latest.interpretation || '{}');
      if (st.filRouge && Array.isArray(st.days) && st.days.length === 7) {
        return NextResponse.json({ filRouge: st.filRouge, wheel: wheelView(latest, latest.echo) });
      }
      const lines = st.cards.map((id, d) => {
        const wd = (castWeekday(st.castAt) + d) % 7; // jour réel de la carte
        return `${['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][wd]} : ${TAROT_CARDS[id]?.name} (${(TAROT_CARDS[id]?.keywords || []).slice(0, 2).join(', ')})`;
      }).join('\n');
      // Richesse de l'éclairage selon le rang : 1 phrase (Apprenti) ou 2-3 (Initié/Arkane).
      const { getRights } = await import('@/lib/entitlements');
      const rights = await getRights(email).catch(() => null);
      const depth = rights && rights.level !== 'apprenti' ? '2 à 3 phrases' : '1 phrase seule';
      const outLang: LlmLang = resolveLang(body.lang);
      const prompt = `Tu es un taromancien bienveillant et concret. Voici la roue des 7 arcanes majeurs d'une semaine (jour réel : arcane) :\n${lines}\n\n
1) Pour CHAQUE jour, dans l'ordre (7 entrées), un « éclairage » de ${depth} : l'attitude, la température ou le conseil que cette carte donne CE jour-là — concret, incarné, jamais vague ni prédictif (« ce jour se prête à… », « tiens-toi à… »).
2) Puis le « fil rouge » de la semaine : 3-4 phrases (ton général, jour le plus porteur, jour le plus prudent, une attitude).
Traduis chaque texte en anglais naturel (même sens, pas littéral)${outLang === 'fr' ? '' : `. Traduis aussi chaque texte en ${langName(outLang)} dans la clé '${outLang}'`}

Réponds STRICTEMENT en JSON (rien d'autre) : {"days":[{"fr":"...","en":"..."},{"fr":"...","en":"..."},{"fr":"...","en":"..."},{"fr":"...","en":"..."},{"fr":"...","en":"..."},{"fr":"...","en":"..."},{"fr":"...","en":"..."}],"filRouge":{"fr":"...","en":"..."}}`;
      let days: { fr: string; en: string }[] | null = null;
      let fil: { fr: string; en: string } | null = null;
      for (let attempt = 0; attempt < 2 && !(days && fil); attempt++) {
        const raw = await callOracle(
          attempt === 0 ? prompt : `${prompt}\n\nRAPPEL ABSOLU : {"days":[7 objets {"fr","en"}],"filRouge":{"fr","en"}} — rien d'autre.`,
          { maxTokens: 2200, timeoutMs: 60_000 }
        ) || '';
        try {
          const m = raw.match(/\{[\s\S]*\}/);
          const j = m ? JSON.parse(m[0]) : null;
          const ds = Array.isArray(j?.days) ? j.days : null;
          if (ds && ds.length === 7 && ds.every((x: { fr?: string }) => String(x?.fr || '').trim().length > 15)) {
            days = ds.map((x: { fr: string; en?: string; es?: string; hi?: string }) => ({ fr: String(x.fr).trim(), en: String(x.en || x.fr).trim(), ...(x.es ? { es: String(x.es).trim() } : {}), ...(x.hi ? { hi: String(x.hi).trim() } : {}) }));
          }
          if (j?.filRouge && String(j.filRouge.fr || '').trim().length > 20) {
            fil = { fr: String(j.filRouge.fr).trim(), en: String(j.filRouge.en || j.filRouge.fr).trim(), ...(j.filRouge.es ? { es: String(j.filRouge.es).trim() } : {}), ...(j.filRouge.hi ? { hi: String(j.filRouge.hi).trim() } : {}) };
          }
        } catch { /* relance */ }
      }
      if (!days && !fil) return NextResponse.json({ error: "L'oracle s'est tu — réessayez.", reason: 'llm' }, { status: 502 });
      if (days) st.days = days;
      if (fil) st.filRouge = fil;
      await prisma.reading.update({ where: { id: latest.id }, data: { interpretation: JSON.stringify(st) } });
      return NextResponse.json({ filRouge: fil, wheel: wheelView({ ...latest, interpretation: JSON.stringify(st) }, latest.echo) });
    }

    // ── Sceller l'augure (le fil rouge, échéance = fin de semaine) ───
    case 'seal': {
      if (!latest) return NextResponse.json({ error: 'Aucune roue.' }, { status: 404 });
      // Sceller une roue périmée (au-delà de la grâce, jamais scellée) n'a plus
      // de sens : elle a été masquée, un nouveau cycle a commencé.
      if (isExpiredUnsealed(latest)) {
        return NextResponse.json({ error: 'La semaine de cette roue est close sans augure scellé.', reason: 'expired' }, { status: 409 });
      }
      const st: WheelState = JSON.parse(latest.interpretation || '{}');
      if (!st.filRouge) return NextResponse.json({ error: 'Tissez le fil rouge d’abord.' }, { status: 400 });
      if (latest.echo) return NextResponse.json({ echoId: latest.echo.id });
      // Règle maison : un seul augure actif (vérification avant nouveau sceau).
      const gate = await canCreateEcho(email);
      if (!gate.allowed) {
        return NextResponse.json({ error: gate.message, reason: 'echo-cap' }, { status: 409 });
      }
      const echo = await prisma.echo.create({
        data: {
          userId: user.id, readingId: latest.id,
          textFr: st.filRouge.fr, textEn: st.filRouge.en,
          domain: echoDomainForType('tarot-semaine') || 'tarot',
          dueAt: new Date(new Date(st.castAt).getTime() + 7 * DAY_MS),
        },
      });
      return NextResponse.json({ echoId: echo.id });
    }

    // ── Bilan : notation fine du fil rouge (pas de 25 %) ─────────────
    case 'verdict': {
      const echoId = String(body.echoId || '');
      const pct = Number(body.pct);
      if (!echoId || ![0, 25, 50, 75, 100].includes(pct)) {
        return NextResponse.json({ error: 'pct invalide (0/25/50/75/100).' }, { status: 400 });
      }
      const echo = await prisma.echo.findFirst({ where: { id: echoId, userId: user.id } });
      if (!echo) return NextResponse.json({ error: 'Augure introuvable.' }, { status: 404 });
      if (echo.verdict) return NextResponse.json({ echoId: echo.id, already: true });
      const legacy = pct >= 100 ? 'oui' : pct <= 0 ? 'non' : 'partiel';
      const best = Number.isInteger(body.bestCardIndex) && body.bestCardIndex >= 0 && body.bestCardIndex <= 6
        ? Number(body.bestCardIndex) : null;
      await prisma.echo.update({
        where: { id: echo.id },
        data: { verdict: legacy, verdictPct: pct, bestCardIndex: best, verdictAt: new Date() },
      });
      return NextResponse.json({ echoId: echo.id, verdict: legacy, verdictPct: pct, bestCardIndex: best });
    }

    default:
      return NextResponse.json({ error: 'action inconnue' }, { status: 400 });
  }
}
