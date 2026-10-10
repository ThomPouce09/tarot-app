import { prisma } from '@/lib/prisma';
import { collectiveHexNumber } from '@/lib/yi-daily';
import { DICT } from '@/lib/i18n/ui';
import { summarizeDraw, cleanCut } from '@/lib/letter-summary';
import { letterBaseUrl, letterUnsubUrl } from '@/lib/letter-links';

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
  id: string;
  type: string | null;
  question?: string | null;
  cards?: unknown;
  interpretation?: unknown;
  spread?: string | null;
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

// Tirage du jour : hexagramme collectif dérivé du jour de l'année (déterministe,
// même source que /api/yi-jing-du-jour), nom/synthèse dans la langue de la lettre
// (tables sœurs hexagrams_en / _es / _hi — `hexagrams` reste la source FR).
async function hexOfDay(
  lang: LetterLang,
): Promise<{ numero: number; name: string | null; glyph: string | null; desc: string | null }> {
  const numero = collectiveHexNumber();
  try {
    const h = await prisma.hexagram.findUnique({ where: { numero } });
    let name = h?.element ?? null;
    let desc = h?.synthese ?? null;
    if (lang === 'en') {
      const e = await prisma.hexagramEn.findUnique({ where: { numero } });
      name = e?.nameEn || name; desc = e?.syntheseEn || desc;
    } else if (lang === 'es') {
      const e = await prisma.hexagramEs.findUnique({ where: { numero } });
      name = e?.nameEs || name; desc = e?.syntheseEs || desc;
    } else if (lang === 'hi') {
      const e = await prisma.hexagramHi.findUnique({ where: { numero } });
      name = e?.nameHi || name; desc = e?.syntheseHi || desc;
    }
    return { numero, name, glyph: h?.caractere ?? null, desc };
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
  /** « Ce que l'oracle a vu » : résumé automatique du tirage marquant
   *  (spread + faces tirées + synthèse déjà rédigée par l'app, sans IA). */
  oracle: { spread: string | null; faces: string[]; synthesis: string | null } | null;
  /** URL de la page du tirage d'origine (lien « relire » dans la lettre). */
  momentUrl: string | null;
  daily: { numero: number; name: string | null; glyph: string | null; desc: string | null };
  /** Augures : { dus: échus à vérifier, pending: encore scellés } (ligne conditionnelle, étape 11). */
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
  const weekReadings = readings.filter((r) => new Date(r.createdAt) >= weekStart);
  const weekDays = new Set(weekReadings.map((r) => dayKey(new Date(r.createdAt)))).size;

  const dayMap = new Map<string, number>();
  readings.forEach((r) => {
    const k = dayKey(new Date(r.createdAt));
    dayMap.set(k, (dayMap.get(k) || 0) + 1);
  });
  const streak = computeStreak(dayMap);
  const best = bestStreak(dayMap);

  // Types dominants de la semaine
  const typeCount: Record<string, number> = { tarot: 0, yijing: 0, rune: 0, des: 0 };
  weekReadings.forEach((r) => typeCount[classifyType(r.type)]++);
  const dominant = Object.entries(typeCount)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => ({ key, label: tt(lang, DOMINANT_KEY[key]), count }));

  // Moment fort = tirage de la semaine le plus récent avec question, sinon le
  // plus récent de la semaine. Repli hors semaine (compte revenu après une
  // pause) : le dernier tirage tout court, pour que la section « ce que
  // l'oracle a vu » ne soit jamais vide sur une semaine sans activité.
  const withQ = weekReadings.find((r) => r.question && r.question.trim());
  const momentR: ReadingLike | null = withQ || weekReadings[0] || readings[0] || null;
  const inWeek = !!momentR && weekReadings.some((r) => r.id === momentR.id);
  let moment: LetterData['moment'] = null;
  if (momentR) {
    moment = {
      type: momentR.type || '',
      label: tt(lang, READING_KEY[classifyType(momentR.type)]),
      date: fmtDate(momentR.createdAt, lang),
      question: momentR.question || null,
      // Hors semaine (repli sur un tirage plus ancien) : on ne parle pas de
      // « cette semaine », le texte dédié est neutre.
      comment: !inWeek
        ? tt(lang, 'letter.momentOlder')
        : withQ
          ? tt(lang, 'letter.momentWithQ')
          : tt(lang, 'letter.momentNoQ'),
    };
  }

  const daily = await hexOfDay(lang);

  // Augures : échus à vérifier / encore scellés (ligne conditionnelle de la lettre).
  const [echoDus, echoPending] = await Promise.all([
    prisma.echo.count({ where: { userId: user.id, verdict: null, dueAt: { lte: new Date() } } }),
    prisma.echo.count({ where: { userId: user.id, verdict: null, dueAt: { gt: new Date() } } }),
  ]);

  // « Ce que l'oracle a vu » : on relit le tirage marquant de la semaine
  // (celui du « moment fort ») et on en extrait un résumé automatique —
  // cartes tirées + synthèse déjà rédigée par l'app. Aucune génération IA.
  const oracle = momentR
    ? (() => {
        const s = summarizeDraw(
          { type: momentR.type, cards: momentR.cards, interpretation: momentR.interpretation, spread: momentR.spread ?? null },
          lang,
        );
        const synthesis = s.synthesis ? cleanCut(s.synthesis, 240) : null;
        if (!s.spread && s.faces.length === 0 && !synthesis) return null;
        return { spread: s.spread, faces: s.faces, synthesis };
      })()
    : null;

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
    oracle,
    momentUrl: momentR ? readingUrl(momentR.type, momentR.id) : null,
    daily,
    echoes: { dus: echoDus, pending: echoPending },
  };
}

/** URL de la page du tirage d'origine, selon son univers (deep-link direct). */
function readingUrl(type: string | null, id: string): string | null {
  const base = letterBaseUrl();
  const t = (type || '').toLowerCase();
  if (t.includes('tarot')) return `${base}/dashboard/account/readings#${id}`;
  if (t.includes('rune')) return `${base}/runes`;
  if (t.includes('yi') || t.includes('jing')) return `${base}/yi-jing-simplifie`;
  if (t.includes('des') || t.includes('astro')) return `${base}/des-divinatoires`;
  return `${base}/dashboard/account/readings`;
}

export function renderLetter(d: LetterData): string {
  const L = d.lang;
  const t = (key: string, vars?: Record<string, string | number>) => tt(L, key, vars);
  const weekLabel = fmtDate(new Date(), L);
  // Pourcentage de série : 0 si aucune flamme en cours (et surtout, on ne
  // félicite pas un compte inactif — le texte du bloc est conditionnel).
  const pct = d.bestStreak > 1 ? Math.round((d.streak / d.bestStreak) * 100) : (d.streak > 0 ? 100 : 0);
  // Un seul texte de série, adapté aux 3 situations : flamme active, série
  // perdue (0), et compte sans historique.
  const streakSmall = d.streak > 0
    ? t('letter.streakSmall', { pct, best: d.bestStreak })
    : d.bestStreak > 0
      ? t('letter.streakLost', { best: d.bestStreak })
      : t('letter.streakNone');
  const domSpan = d.dominant.map((x) => `${x.label} (${x.count})`).join(' · ')
    || t('letter.noDraws');
  const base = letterBaseUrl();

  // Icônes : SVG convertis en PNG (les clients mail n'affichent pas le SVG
  // inline de façon fiable). Servies depuis le domaine des App Links.
  const iconEchoPending = `<img src="${base}/email/icon-echo@2x.png" width="14" height="14" alt="" style="vertical-align:-2px;border:0;"> `;

  const echoBlock = d.echoes.dus > 0
    ? `<tr><td class="pad" style="padding-top:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card" style="border:1px solid #6b5426;">
      <tr><td class="card-in">
        <div class="card-title"><img src="${base}/email/icon-echo@2x.png" width="18" height="18" alt="" style="vertical-align:-3px;border:0;display:inline-block;">${t('letter.echoDueTitle')}</div>
        <div class="p-muted">${t('letter.echoDueBody', { dus: d.echoes.dus })}${d.echoes.pending > 0 ? t('letter.echoMore', { n: d.echoes.pending }) : ''}${t('letter.echoDueCta')}</div>
        <div style="padding-top:10px;"><a class="inline-link" href="${base}/dashboard/account/echoes">${t('letter.echoLink')}</a></div>
      </td></tr>
    </table></td></tr>`
    : d.echoes.pending > 0
      ? `<tr><td align="center" class="p-muted" style="padding:14px 18px 0;font-style:italic;">${iconEchoPending}${t('letter.echoPending', { n: d.echoes.pending })}</td></tr>`
      : '';

  // ── Section « ce que l'oracle a vu » (résumé automatique, sans IA) ──
  const oracleBlock = d.oracle
    ? `<tr><td class="pad">
    <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="card-title"><img src="${base}/email/icon-oracle@2x.png" width="18" height="18" alt="" style="vertical-align:-3px;border:0;display:inline-block;">${t('letter.oracleTitle')}</td></tr>
      ${d.oracle.spread ? `<tr><td class="oracle-spread">${escapeHtml(d.oracle.spread)}</td></tr>` : ''}
      ${d.oracle.faces.length > 0 ? `<tr><td class="oracle-faces">${d.oracle.faces.map((f) => `<span class="face">${escapeHtml(f)}</span>`).join('')}</td></tr>` : ''}
      ${d.oracle.synthesis ? `<tr><td class="p-muted" style="padding-top:12px;">&laquo;&nbsp;${escapeHtml(d.oracle.synthesis)}&nbsp;&raquo;</td></tr>` : ''}
    </table>
  </td></tr>` : '';

  // Lien « relire ce tirage » sous le moment fort.
  const momentLink = d.momentUrl
    ? `<tr><td style="padding-top:10px;"><a class="inline-link" href="${d.momentUrl}">${t('letter.momentLink')}</a></td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="${L}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${t('letter.mailTitle')}</title>
<!--[if mso]><style>body,table,td{font-family:Georgia,serif !important;}</style><![endif]-->
<style>
  /* Mise en page TABLEAUX : Outlook (moteur Word) ignore flex/grid/radius. */
  body{margin:0;padding:0;background:#0a0510;}
  table{border-collapse:collapse;}
  .wrap{width:100%;max-width:600px;}
  .pad{padding:0 18px;}
  .hero-img{display:block;width:100%;max-width:600px;height:auto;border:0;}
  .card{background:#1c1228;border:1px solid #33224a;border-radius:14px;}
  .card-in{padding:20px;}
  .card-title{font-family:'Cinzel',Georgia,serif;font-size:15px;color:#F0C75E;letter-spacing:.5px;padding-bottom:12px;}
  .card-title .ic{font-size:17px;}
  .greet{font-size:16px;color:#e8dcc8;padding-bottom:6px;}
  .greet b{color:#F0C75E;}
  .p-muted{color:#b3a68c;font-size:13px;line-height:1.65;font-family:Georgia,serif;}
  .stat{background:#241730;border:1px solid #35234d;border-radius:10px;text-align:center;padding:12px 6px;}
  .stat .n{font-family:'Cinzel',Georgia,serif;font-size:25px;color:#F5B450;}
  .stat .l{font-size:11px;color:#9b8f7a;padding-top:4px;letter-spacing:.5px;}
  .streak{background:#241730;border:1px solid #5a3a1e;border-radius:12px;padding:14px;}
  .streak .flame{font-size:34px;}
  .streak .big{font-family:'Cinzel',Georgia,serif;font-size:21px;color:#F5B450;}
  .streak .small{font-size:12px;color:#9b8f7a;line-height:1.5;}
  .oracle-spread{font-family:'Cinzel',Georgia,serif;font-size:14px;color:#DAA520;padding-bottom:8px;}
  .face{display:inline-block;background:#241730;border:1px solid #4a3363;border-radius:20px;color:#e8dcc8;font-size:12px;padding:4px 10px;margin:0 4px 6px 0;}
  .q{font-size:14px;font-style:italic;color:#e8dcc8;line-height:1.55;font-family:Georgia,serif;}
  .r{font-size:12px;color:#F5B450;padding-top:6px;}
  .glyph{font-size:50px;color:#F0C75E;line-height:1.1;}
  .name{font-family:'Cinzel',Georgia,serif;font-size:19px;color:#F0C75E;padding-top:6px;}
  .desc{font-size:13px;color:#b3a68c;font-style:italic;padding-top:8px;line-height:1.6;font-family:Georgia,serif;}
  .cta{display:inline-block;background:#DAA520;background-image:linear-gradient(180deg,#FFE07A,#DAA520);color:#2a1700 !important;font-family:'Cinzel',Georgia,serif;font-weight:bold;font-size:15px;letter-spacing:1px;padding:15px 32px;border-radius:40px;text-decoration:none;}
  .inline-link{color:#DAA520;font-family:'Cinzel',Georgia,serif;font-size:13px;text-decoration:underline;}
  .adv{font-size:11px;color:#9b8f7a;font-style:italic;text-align:center;padding-top:14px;font-family:Georgia,serif;}
  .foot{font-size:11px;color:#9b8f7a;text-align:center;line-height:1.7;font-family:Georgia,serif;}
  .foot a{color:#DAA520;text-decoration:underline;}
  .sep{color:#8a6d2f;letter-spacing:4px;padding:12px 0;}
  .preheader{display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all;}
  /* Mobile : on empile la grille de stats (3 colonnes → 1) et on réduit les marges. */
  @media only screen and (max-width:480px){
    .stat-col{display:block !important;width:100% !important;padding:0 0 8px 0 !important;}
    .stat{padding:10px 6px;}
    .card-in{padding:16px;}
    .pad{padding:0 12px;}
    .hero-sub{font-size:12px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0a0510;">
<!-- Preheader : texte d'aperçu en boîte de réception (invisible dans le corps). -->
<div class="preheader">${escapeHtml(preheader(d))}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0510;">
<tr><td align="center" style="padding:20px 8px;">

  <table role="presentation" class="wrap" cellpadding="0" cellspacing="0" border="0" style="background:#140b1e;border:1px solid #2a1a3e;border-radius:16px;overflow:hidden;">

    <!-- Bandeau : image (la police Cinzel n'existe pas dans les clients mail). -->
    <tr><td align="center" style="padding:0;background:#0a0510;">
      <a href="${base}" style="text-decoration:none;"><img class="hero-img" src="${base}/email/letter-header.png" width="600" height="180" alt="${escapeHtml(t('letter.title'))} — ${escapeHtml(t('letter.subtitle'))}" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></a>
    </td></tr>

    <!-- Date de la semaine -->
    <tr><td align="center" style="padding:14px 10px 4px;font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:2px;color:#DAA520;text-transform:uppercase;">${weekLabel}</td></tr>

    <!-- Salutation -->
    <tr><td class="pad" style="padding-top:12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card">
      <tr><td class="card-in">
        <div class="greet">${t('letter.hello', { name: escapeHtml(d.firstName) })}</div>
        <div class="p-muted">${t('letter.intro')}</div>
      </td></tr>
    </table></td></tr>

    <!-- Statistiques -->
    <tr><td class="pad" style="padding-top:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card">
      <tr><td class="card-in">
        <div class="card-title"><img src="${base}/email/icon-stats@2x.png" width="18" height="18" alt="" style="vertical-align:-3px;border:0;display:inline-block;">${t('letter.statsTitle')}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stat-col" width="33%" style="padding-right:6px;"><div class="stat"><div class="n">${d.weekTotal}</div><div class="l">${t('letter.draws')}</div></div></td>
            <td class="stat-col" width="33%" style="padding:0 6px;"><div class="stat"><div class="n">${d.weekDays}</div><div class="l">${t('letter.activeDays')}</div></div></td>
            <td class="stat-col" width="33%" style="padding-left:6px;"><div class="stat"><div class="n">${d.streak}</div><div class="l">${t('letter.streak')}</div></div></td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top:12px;"><tr>
          <td class="streak">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="52" valign="middle" align="center"><img src="${base}/email/icon-flame@2x.png" width="36" height="36" alt="" style="border:0;display:block;margin:0 auto;"></td>
              <td valign="middle">
                <div class="big">${t('letter.streakBig', { n: d.streak })}</div>
                <div class="small">${streakSmall}</div>
              </td>
            </tr></table>
          </td>
        </tr></table>
        <div class="p-muted" style="padding-top:12px;">${t('letter.dominant', { list: escapeHtml(domSpan) })}</div>
      </td></tr>
    </table></td></tr>

    ${d.moment ? `<tr><td class="pad" style="padding-top:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card">
      <tr><td class="card-in">
        <div class="card-title"><img src="${base}/email/icon-oracle@2x.png" width="18" height="18" alt="" style="vertical-align:-3px;border:0;display:inline-block;">${t('letter.momentTitle')}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td class="q">${d.moment.question ? `&laquo;&nbsp;${escapeHtml(d.moment.question)}&nbsp;&raquo;` : escapeHtml(d.moment.comment)}</td></tr>
          <tr><td class="r">${escapeHtml(d.moment.label)} &middot; ${escapeHtml(d.moment.date)}</td></tr>
          ${momentLink}
        </table>
      </td></tr>
    </table></td></tr>` : ''}

    ${oracleBlock}

    ${echoBlock}

    <!-- Tirage du jour -->
    <tr><td class="pad" style="padding-top:16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card">
      <tr><td class="card-in" align="center">
        <div class="card-title" style="text-align:left;"><img src="${base}/email/icon-cards@2x.png" width="18" height="18" alt="" style="vertical-align:-3px;border:0;display:inline-block;">${t('letter.dailyTitle')}</div>
        <div class="glyph">${d.daily.glyph || '&#9775;'}</div>
        <div class="name">${t('letter.hexagram', { n: String(d.daily.numero).padStart(2, '0') })}${d.daily.name ? ' &mdash; ' + escapeHtml(d.daily.name) : ''}</div>
        ${d.daily.desc ? `<div class="desc">&laquo;&nbsp;${escapeHtml(cleanCut(d.daily.desc, 180))}&nbsp;&raquo;</div>` : ''}
      </td></tr>
    </table></td></tr>

    <!-- Appel à l'action -->
    <tr><td align="center" style="padding:26px 16px 6px;">
      <a class="cta" href="${base}/yi-jing-du-jour">${t('letter.cta')}</a>
      <div class="adv">${t('letter.advice')}</div>
    </td></tr>

    <!-- Pied de page -->
    <tr><td align="center" class="pad" style="padding:18px 16px 26px;">
      <div class="sep" style="padding:10px 0;"><img src="${base}/email/icon-stars@2x.png" width="46" height="46" alt="" style="border:0;"></div>
      <div class="foot">
        ${t('letter.footWeekly')}<br>
        <a href="${base}/dashboard/account/preferences">${t('letter.footPrefs')}</a> &nbsp;&middot;&nbsp;
        <a href="${unsubUrl(d.email)}">${t('letter.footUnsub')}</a><br>
        <span style="padding-top:8px;display:inline-block;">${t('letter.footTagline')}</span>
      </div>
    </td></tr>

  </table>

</td></tr>
</table>
</body></html>`;
}

/** Texte d'aperçu (preheader) : personnalisé, jamais vide. */
function preheader(d: LetterData): string {
  const L = d.lang;
  const t = (key: string, vars?: Record<string, string | number>) => tt(L, key, vars);
  if (d.weekTotal > 0) return t('letter.preheaderActive', { n: d.weekTotal, name: d.firstName });
  if (d.echoes.dus > 0) return t('letter.preheaderEcho', { n: d.echoes.dus });
  return t('letter.preheaderIdle', { name: d.firstName });
}

/** Désabonnement en un clic (RGPD) : route dédiée, sans connexion. */
function unsubUrl(email: string): string {
  const base = letterBaseUrl();
  return `${base}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`;
}

/** Échappement HTML : toute donnée issue de la base passe par ici. */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
