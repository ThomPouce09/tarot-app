import { prisma } from '@/lib/prisma';
import { collectiveHexNumber } from '@/lib/yi-daily';
import { DICT } from '@/lib/i18n/ui';

// ── Génération de la "Lettre mystique" hebdo (aperçu / envoi) ─────────────
// Calcule les stats réelles de la semaine à partir des readings d'un user,
// puis rend un email HTML au thème mystique de l'app.
// Langue : `User.language` (synchronisée depuis les Préférences) — repli fr.

export type LetterLang = 'fr' | 'en' | 'es' | 'hi';
const LANGS: LetterLang[] = ['fr', 'en', 'es', 'hi'];
export const normLetterLang = (v: unknown): LetterLang => {
  const l = String(v ?? '').slice(0, 2).toLowerCase() as LetterLang;
  return LANGS.includes(l) ? l : 'fr';
};

const DATE_LOCALE: Record<LetterLang, string> = { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' };

/** Libellé du dictionnaire UI dans la langue de la lettre (repli fr). */
function tt(lang: LetterLang, key: string, vars?: Record<string, string | number>): string {
  const entry = (DICT as Record<string, Partial<Record<LetterLang, string>>>)[key];
  let out = entry?.[lang] ?? entry?.fr ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
  return out;
}

interface ReadingLike {
  type: string | null;
  question?: string | null;
  cards?: unknown;
  createdAt: string | Date;
}

function classifyType(t: string | null): 'tarot' | 'yijing' | 'rune' | 'des' {
  const s = (t || '').toLowerCase().replace(/[_-]/g, '');
  if (s.includes('yi') || s.includes('jing') || s.includes('yijing')) return 'yijing';
  if (s.includes('rune') || s.includes('futhark')) return 'rune';
  if (s.includes('des') || s.includes('zodiaque') || s.includes('astro') || s.includes('dice')) return 'des';
  return 'tarot';
}

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function dayKey(d: Date): string { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function fmtDate(iso: string | Date, lang: LetterLang): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' });
}

function computeStreak(counts: Map<string, number>): number {
  let streak = 0;
  const cursor = startOfDay(new Date());
  for (let i = 0; i < 365 * 10; i++) {
    if (counts.has(dayKey(cursor))) streak++;
    else if (i === 0 && counts.has(dayKey(new Date(cursor.getTime() - 86400000)))) { /* tolère aujourd'hui vide */ }
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
function bestStreak(counts: Map<string, number>): number {
  const times = Array.from(counts.keys())
    .map((k) => { const p = k.split('-').map(Number); return new Date(p[0], p[1], p[2]).getTime(); })
    .sort((a, b) => a - b);
  let best = 0, cur = 0, prev: number | undefined;
  for (const t of times) { if (prev !== undefined && t - prev === 86400000) cur++; else cur = 1; if (cur > best) best = cur; prev = t; }
  return best;
}

// Tirage du jour : hexagramme collectif derive du jour de l'annee (deterministe,
// meme source que /api/yi-jing-du-jour), nom/synthese dans la langue de la lettre.
// APK : SQL brut, car le client Prisma de l'APK n'embarque pas les modeles soeurs.
async function hexOfDay(
  lang: LetterLang,
): Promise<{ numero: number; name: string | null; glyph: string | null; desc: string | null }> {
  const numero = collectiveHexNumber();
  const one = (rows: unknown) =>
    (Array.isArray(rows) ? rows[0] : undefined) as Record<string, any> | undefined;
  try {
    const fr = one(
      await prisma.$queryRawUnsafe(
        `SELECT numero, element as name, caractere as glyph, synthese FROM "hexagrams" WHERE numero = $1 LIMIT 1`,
        numero,
      ),
    );
    let name = fr?.name ?? null;
    let desc = fr?.synthese ?? null;
    if (lang !== 'fr') {
      const [table, cName, cDesc] =
        lang === 'en' ? ['hexagrams_en', 'name_en', 'synthese_en']
        : lang === 'es' ? ['hexagrams_es', 'name_es', 'synthese_es']
        : ['hexagrams_hi', 'name_hi', 'synthese_hi'];
      const row = one(
        await prisma.$queryRawUnsafe(
          `SELECT "${cName}" as name, "${cDesc}" as desc FROM "${table}" WHERE numero = $1 LIMIT 1`,
          numero,
        ),
      );
      name = row?.name || name;
      desc = row?.desc || desc;
    }
    return { numero, name, glyph: fr?.glyph ?? null, desc };
  } catch {
    return { numero, name: null, glyph: null, desc: null };
  }
}

export interface LetterData {
  firstName: string;
  email: string;
  /** Langue de la lettre (User.language, repli fr). */
  lang: LetterLang;
  weekTotal: number;
  weekDays: number;
  streak: number;
  bestStreak: number;
  dominant: { key: string; label: string; count: number }[];
  moment: { type: string; label: string; date: string; question: string | null; comment: string } | null;
  daily: { numero: number; name: string | null; glyph: string | null; desc: string | null };
  /** Échos : { dus: échus à vérifier, pending: encore scellés } (ligne conditionnelle, étape 11). */
  echoes: { dus: number; pending: number };
}

const DOMINANT_KEY: Record<string, string> = {
  tarot: 'letter.dominantTarot',
  yijing: 'letter.dominantYijing',
  rune: 'letter.dominantRunes',
  des: 'letter.dominantDes',
};
const READING_KEY: Record<string, string> = {
  tarot: 'letter.readingTarot',
  yijing: 'letter.readingYijing',
  rune: 'letter.readingRunes',
  des: 'letter.readingDes',
};

export async function buildLetterData(email: string): Promise<LetterData | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const lang = normLetterLang(user.language);

  const readings = await prisma.reading.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  const weekStart = startOfDay(new Date(Date.now() - 7 * 86400000));
  const weekReadings = readings.filter((r: any) => new Date(r.createdAt) >= weekStart);
  const weekDays = new Set(weekReadings.map((r: any) => dayKey(new Date(r.createdAt)))).size;

  const dayMap = new Map<string, number>();
  readings.forEach((r: any) => {
    const k = dayKey(new Date(r.createdAt));
    dayMap.set(k, (dayMap.get(k) || 0) + 1);
  });
  const streak = computeStreak(dayMap);
  const best = bestStreak(dayMap);

  // Types dominants de la semaine
  const typeCount: Record<string, number> = { tarot: 0, yijing: 0, rune: 0, des: 0 };
  weekReadings.forEach((r: any) => typeCount[classifyType(r.type)]++);
  const dominant = Object.entries(typeCount)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => ({ key, label: tt(lang, DOMINANT_KEY[key]), count }));

  // Moment fort = tirage de la semaine le plus récent avec question, sinon le plus récent
  const withQ = weekReadings.find((r: any) => r.question && r.question.trim());
  const momentR = withQ || weekReadings[0] || null;
  let moment: LetterData['moment'] = null;
  if (momentR) {
    moment = {
      type: momentR.type || '',
      label: tt(lang, READING_KEY[classifyType(momentR.type)]),
      date: fmtDate(momentR.createdAt, lang),
      question: momentR.question || null,
      comment: withQ ? tt(lang, 'letter.momentWithQ') : tt(lang, 'letter.momentNoQ'),
    };
  }

  const daily = await hexOfDay(lang);

  // Échos : échus à vérifier / encore scellés (ligne conditionnelle de la lettre).
  const [echoDus, echoPending] = await Promise.all([
    prisma.echo.count({ where: { userId: user.id, verdict: null, dueAt: { lte: new Date() } } }),
    prisma.echo.count({ where: { userId: user.id, verdict: null, dueAt: { gt: new Date() } } }),
  ]);

  return {
    firstName: user.firstName || tt(lang, 'letter.guestName'),
    email: user.email,
    lang,
    weekTotal: weekReadings.length,
    weekDays,
    streak,
    bestStreak: best,
    dominant,
    moment,
    daily,
    echoes: { dus: echoDus, pending: echoPending },
  };
}

export function renderLetter(d: LetterData): string {
  const L = d.lang;
  const t = (key: string, vars?: Record<string, string | number>) => tt(L, key, vars);
  const weekLabel = fmtDate(new Date(), L);
  const pct = d.bestStreak > 1 ? Math.round((d.streak / d.bestStreak) * 100) : (d.streak > 0 ? 100 : 0);
  const domSpan = d.dominant.map((x) => `${x.label} (${x.count})`).join(' · ')
    || t('letter.noDraws');
  const base = 'https://tarot-app-one-sage.vercel.app';

  const echoBlock = d.echoes.dus > 0
    ? `<div class="card" style="border-color:rgba(255,215,0,.35);"><div class="card-title"><span class="ic">🕐</span>${t('letter.echoDueTitle')}</div>
    <p class="p-muted">${t('letter.echoDueBody', { dus: d.echoes.dus })}${d.echoes.pending > 0 ? t('letter.echoMore', { n: d.echoes.pending }) : ''}${t('letter.echoDueCta')}</p>
    <p style="margin-top:10px;"><a href="${base}/dashboard/account/readings" style="color:var(--gold);font-family:'Cinzel',Georgia,serif;font-size:13px;text-decoration:none;">${t('letter.echoLink')}</a></p>
  </div>`
    : d.echoes.pending > 0
      ? `<p class="p-muted" style="text-align:center;margin-top:14px;font-style:italic;">🕐 ${t('letter.echoPending', { n: d.echoes.pending })}</p>`
      : '';

  return `<!DOCTYPE html>
<html lang="${L}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="dark">
<title>${t('letter.mailTitle')}</title>
<style>
  :root{--gold:#FFD700;--gold-soft:#DAA520;--amber:#F5B450;--ink:#0a0510;--bg:#140b1e;--panel:#1c1228;--panel2:#241730;--text:#e8dcc8;--muted:#9b8f7a;}
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Georgia,'Times New Roman',serif;background:var(--ink);color:var(--text);-webkit-font-smoothing:antialiased;}
  .wrap{max-width:640px;margin:0 auto;padding:24px 16px;}
  .hero{text-align:center;padding:36px 20px 28px;background:radial-gradient(ellipse at 50% 0%,#2a1a3e 0%,var(--bg) 70%);border-bottom:1px solid rgba(255,215,0,.2);border-radius:18px 18px 0 0;}
  .hero .crest{font-size:44px;margin-bottom:12px;filter:drop-shadow(0 0 18px rgba(255,215,0,.5));}
  .hero h1{font-family:'Cinzel',Georgia,serif;font-size:26px;color:var(--gold);letter-spacing:1px;text-shadow:0 0 20px rgba(255,215,0,.4);}
  .hero .sub{margin-top:10px;color:var(--muted);font-size:13px;font-style:italic;}
  .hero .date{margin-top:6px;font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:2px;color:var(--gold-soft);text-transform:uppercase;}
  .card{background:var(--panel);border:1px solid rgba(255,215,0,.12);border-radius:14px;padding:22px 20px;margin-top:20px;}
  .card-title{font-family:'Cinzel',Georgia,serif;font-size:15px;color:var(--gold);letter-spacing:.5px;display:flex;align-items:center;gap:8px;margin-bottom:14px;}
  .card-title .ic{font-size:18px;}
  .greet{font-size:16px;margin-bottom:4px;} .greet b{color:var(--gold);}
  .p-muted{color:var(--muted);font-size:13px;line-height:1.6;}
  .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:4px;}
  .stat{background:var(--panel2);border:1px solid rgba(255,215,0,.1);border-radius:10px;padding:14px 8px;text-align:center;}
  .stat .n{font-family:'Cinzel',Georgia,serif;font-size:26px;color:var(--amber);text-shadow:0 0 12px rgba(245,180,80,.4);}
  .stat .l{font-size:11px;color:var(--muted);margin-top:4px;letter-spacing:.5px;}
  .streak-box{display:flex;align-items:center;gap:14px;background:linear-gradient(90deg,rgba(255,140,40,.14),transparent);border:1px solid rgba(255,140,40,.25);border-radius:12px;padding:16px;margin-top:14px;}
  .streak-box .flame{font-size:38px;filter:drop-shadow(0 0 14px rgba(255,150,40,.6));}
  .streak-box .txt .big{font-family:'Cinzel',Georgia,serif;font-size:22px;color:var(--amber);}
  .streak-box .txt .small{font-size:12px;color:var(--muted);}
  .moment .q{font-size:14px;font-style:italic;color:var(--text);line-height:1.5;}
  .moment .r{font-size:12px;color:var(--amber);margin-top:6px;}
  .daily{text-align:center;margin-top:10px;}
  .daily .glyph{font-size:52px;color:var(--gold);text-shadow:0 0 24px rgba(255,215,0,.5);margin-bottom:8px;}
  .daily .name{font-family:'Cinzel',Georgia,serif;font-size:20px;color:var(--gold);}
  .daily .desc{font-size:13px;color:var(--muted);font-style:italic;margin-top:8px;line-height:1.6;}
  .cta-wrap{text-align:center;margin:24px 0 8px;}
  .cta{display:inline-block;background:linear-gradient(180deg,#FFD700,#DAA520);color:#2a1700;font-family:'Cinzel',Georgia,serif;font-weight:700;font-size:15px;letter-spacing:1px;padding:15px 34px;border-radius:50px;text-decoration:none;box-shadow:0 6px 20px rgba(255,215,0,.35);}
  .adv{text-align:center;font-size:11px;color:var(--muted);font-style:italic;margin-top:16px;}
  .foot{text-align:center;padding:22px 10px 30px;color:var(--muted);font-size:11px;line-height:1.7;}
  .foot .sep{margin:14px 0;} .foot a{color:var(--gold-soft);text-decoration:none;}
</style></head>
<body><div class="wrap">
  <div class="hero"><div class="crest">🔮</div><h1>${t('letter.title')}</h1><div class="sub">${t('letter.subtitle')}</div><div class="date">${weekLabel}</div></div>
  <div class="card" style="margin-top:18px;"><p class="greet">${t('letter.hello', { name: d.firstName })}</p><p class="p-muted">${t('letter.intro')}</p></div>

  <div class="card"><div class="card-title"><span class="ic">📊</span>${t('letter.statsTitle')}</div>
    <div class="stat-grid">
      <div class="stat"><div class="n">${d.weekTotal}</div><div class="l">${t('letter.draws')}</div></div>
      <div class="stat"><div class="n">${d.weekDays}</div><div class="l">${t('letter.activeDays')}</div></div>
      <div class="stat"><div class="n">${d.streak}</div><div class="l">${t('letter.streak')}</div></div>
    </div>
    <div class="streak-box"><div class="flame">🔥</div><div class="txt"><div class="big">${t('letter.streakBig', { n: d.streak })}</div><div class="small">${t('letter.streakSmall', { pct, best: d.bestStreak })}</div></div></div>
    <p class="p-muted" style="margin-top:12px;">${t('letter.dominant', { list: domSpan })}</p>
  </div>

  ${d.moment ? `<div class="card"><div class="card-title"><span class="ic">🔮</span>${t('letter.momentTitle')}</div><div class="moment">
    <div class="q">${d.moment.question ? `« ${d.moment.question} »` : d.moment.comment}</div>
    <div class="r">${d.moment.label} · ${d.moment.date}</div>
  </div></div>` : ''}

  ${echoBlock}

  <div class="card"><div class="card-title"><span class="ic">🎴</span>${t('letter.dailyTitle')}</div><div class="daily">
    <div class="glyph">${d.daily.glyph || '☯'}</div>
    <div class="name">${t('letter.hexagram', { n: String(d.daily.numero).padStart(2, '0') })}${d.daily.name ? ' — ' + d.daily.name : ''}</div>
    ${d.daily.desc ? `<div class="desc">« ${d.daily.desc.slice(0, 160)}… »</div>` : ''}
  </div></div>

  <div class="cta-wrap"><a class="cta" href="${base}/yi-jing-du-jour" style="color:#2a1700;">${t('letter.cta')}</a></div>
  <p class="adv">${t('letter.advice')}</p>

  <div class="foot"><div class="sep">─── ✦ ───</div><p>${t('letter.footWeekly')}</p><p><a href="${base}/dashboard/account/preferences">${t('letter.footPrefs')}</a></p><p style="margin-top:8px;">${t('letter.footTagline')}</p></div>
</div></body></html>`;
}
