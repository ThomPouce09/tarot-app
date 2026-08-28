'use client';

import React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useT } from '@/lib/i18n';
import Link from 'next/link';
import { api } from '@/lib/api-client';

type Group = 'tarot' | 'yijing' | 'rune' | 'des';

const GROUP_META: Record<Group, { icon: string; color: string; gradient: string }> = {
  tarot:  { icon: '/images/tarot-icon.png',     color: '#FFD700', gradient: 'from-amber-500 to-orange-700' },
  yijing: { icon: '/images/yi-jing-icon.png',   color: '#E0CFF0', gradient: 'from-purple-500 to-fuchsia-700' },
  rune:   { icon: '/images/runes-icon.png',     color: '#9FC4AD', gradient: 'from-green-700 to-emerald-800' },
  des:    { icon: '/images/des-zodiaque.png',   color: '#7FB3D5', gradient: 'from-sky-500 to-blue-700' },
};

function classifyType(t: string): Group {
  const s = (t || '').toLowerCase().replace(/[_-]/g, '');
  if (s.includes('yi') || s.includes('jing') || s.includes('yijing')) return 'yijing';
  if (s.includes('rune') || s.includes('futhark')) return 'rune';
  if (s.includes('des') || s.includes('zodiaque') || s.includes('astro') || s.includes('dice')) return 'des';
  return 'tarot';
}

// ── Libellés fins par type de tirage (pour l'aperçu des cartes/minis) ──
function subLabel(type: string): string {
  const map: Record<string, string> = {
    'tarot-3-cartes': 'Tarot 3 cartes',
    'tarot-5-cartes': 'Tarot 5 cartes',
    'tarot-5-c-manuelle': 'Tarot 5 cartes',
    'tarot-10-cartes': 'Tarot 10 cartes',
    'tirage-ouvert': 'Tirage Ouvert',
    'tirage-amoureux': 'Tirage Amoureux',
    'tarot': 'Tarot',
    'yi-jing-simple': 'Yi Jing',
    'yi-jing-question': 'Yi Jing',
    'yi-qing': 'Yi Qing',
    'yi-jing-du-jour': 'Yi Jing du jour',
    'yi-jing': 'Yi Jing',
    'runes-nornes': 'Fil des Nornes',
    'runes-mjolnir': 'Mjölnir',
    'runes-yggdrasil': 'Yggdrasil',
    'runes': 'Runes',
    'des-choix': 'Choix',
    'des-obstacle-solution': 'Obstacle',
    'des-affinage': 'Affinage',
  };
  return map[type] || (type || 'Tirage');
}

// Aperçu compact de ce qui a été tiré (miniatures / symboles)
function DrawSummary({ type, cards }: { type: string; cards: any[] }) {
  const g = classifyType(type);
  const arr = Array.isArray(cards) ? cards : [];

  if (g === 'tarot') {
    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        {arr.slice(0, 4).map((c: any, i: number) => {
          const cardId = typeof c === 'object' && c !== null ? (c.id ?? c.cardId ?? c.value) : c;
          const nome = typeof c === 'object' && c !== null ? (c.name?.name || c.name || '') : '';
          return (
            <span key={i} className="relative inline-block h-12 w-8 shrink-0 rounded-md overflow-hidden border border-amber-500/30 bg-gray-900/60"
              title={nome || `Carte ${cardId}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/cards/arcana/${cardId}.jpg`} alt={nome}
                className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget as HTMLImageElement).previousElementSibling?.remove?.(); }} />
              {!nome && cardId && <span className="absolute inset-0 flex items-center justify-center text-[9px] text-amber-300/80">{nome || (typeof cardId === 'number' ? cardId : '')}</span>}
            </span>
          );
        })}
        {arr.length > 4 && <span className="text-[10px] text-gray-400 shrink-0">+{arr.length - 4}</span>}
        {arr.length === 0 && <span className="text-[10px] text-gray-500">{subLabel(type)}</span>}
      </div>
    );
  }

  if (g === 'yijing') {
    const first = arr[0] || {};
    const glyph = typeof first === 'object' && first !== null ? (first.glyph || first.ideogram || first.symbol || '') : '';
    const nome = typeof first === 'object' && first !== null ? (first.name || first.frenchName || '') : '';
    return (
      <span className="inline-flex items-center gap-2 text-amber-200/90 text-xs">
        <span className="text-xl leading-none" style={{ fontFamily: "'Hoshiko Satsuki', serif" }}>{glyph}</span>
        <span className="truncate max-w-[140px]">{nome || subLabel(type)}</span>
      </span>
    );
  }

  if (g === 'rune') {
    return (
      <span className="inline-flex items-center gap-1.5">
        {arr.slice(0, 3).map((c: any, i: number) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-amber-900/30 border border-amber-700/30 px-1.5 py-0.5 text-amber-200/90 text-xs">
            <span className="text-sm leading-none" style={{ color: '#D4B483' }}>{c?.symbol || 'ᚱ'}</span>
            <span className="truncate max-w-[70px]">{c?.name || ''}</span>
            {c?.reversed && <span className="text-[9px] text-gray-500">inv.</span>}
          </span>
        ))}
      </span>
    );
  }

  // dés
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {arr.slice(0, 3).map((c: any, i: number) => (
        <span key={i} className="rounded-md bg-sky-900/30 border border-sky-700/30 px-1.5 py-0.5 text-sky-200/90 text-xs">
          {c?.label || (c?.value ?? '')}
        </span>
      ))}
    </span>
  );
}

// ── Utilitaires de calcul d'activité ────────────────────────────
interface DayCount { date: Date; count: number; }

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Série (streak) actuelle : jours consécutifs avec activité, en terminant
// aujourd'hui. Si aujourd'hui n'a pas encore d'activité, on accepte de
// démarrer la série à hier (la série n'est pas "rompue" tant que la journée
// n'est pas finie).
function computeStreak(counts: Map<string, number>): number {
  let streak = 0;
  const cursor = startOfDay(new Date());
  for (let i = 0; i < 365 * 10; i++) {
    const k = dayKey(cursor);
    if (counts.has(k)) {
      streak++;
    } else {
      // Seule tolérance : aujourd'hui inactif → on regarde hier.
      if (i === 0 && counts.has(dayKey(new Date(cursor.getTime() - 86400000)))) {
        // rien : on continue à la prochaine itération après décrément
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function bestStreak(counts: Map<string, number>): number {
  // dayKey = "YYYY-M-D" (le mois est déjà via new Date() soit 0-indexé ici).
  const times = [...counts.keys()]
    .map((k) => { const p = k.split('-').map(Number); return new Date(p[0], p[1], p[2]).getTime(); })
    .sort((a, b) => a - b);
  let best = 0, cur = 0;
  let prev: number | undefined;
  for (const t of times) {
    if (prev !== undefined && t - prev === 86400000) cur++;
    else cur = 1;
    if (cur > best) best = cur;
    prev = t;
  }
  return best;
}

// Heatmap : dernières N semaines (colonnes), 7 lignes (dim→sam)
const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function Heatmap({ counts, lang }: { counts: Map<string, number>; lang: string }) {
  const weeks = 12;
  const today = startOfDay(new Date());
  // Premier jour de la semaine (dimanche) il y a weeks-1 semaines
  const start = startOfDay(new Date(today));
  start.setDate(start.getDate() - (today.getDay()));
  start.setDate(start.getDate() - (weeks - 1) * 7);

  const cells: { date: Date; count: number }[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < weeks * 7; i++) {
    cells.push({ date: new Date(cursor), count: counts.get(dayKey(cursor)) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const maxCount = Math.max(1, ...cells.map((c) => c.count));

  const colorFor = (count: number): string => {
    if (count === 0) return 'rgba(255,255,255,0.05)';
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 'rgba(218,165,32,0.35)';
    if (ratio <= 0.5) return 'rgba(218,165,32,0.6)';
    if (ratio <= 0.75) return 'rgba(255,200,80,0.85)';
    return '#FFD700';
  };

  const monthLabels: { idx: number; label: string }[] = [];
  let lastMonth = -1;
  cells.forEach((c, idx) => {
    if (c.date.getDate() === 1 || idx === 0) {
      if (c.date.getMonth() !== lastMonth) {
        monthLabels.push({ idx, label: c.date.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { month: 'short' }) });
        lastMonth = c.date.getMonth();
      }
    }
  });

  return (
    <div className="space-y-2">
      <div className="flex gap-1 text-[9px] text-gray-500">
        {monthLabels.map((m) => (
          <span key={m.idx} className="flex-shrink-0" style={{ width: `${(7 / (weeks * 7)) * 100}%`, marginLeft: (m.idx % (weeks * 7)) === 0 ? 0 : undefined }}>{m.label}</span>
        ))}
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: 7 }).map((_, row) => (
          <div key={row} className="flex flex-col gap-[3px]">
            {Array.from({ length: weeks }).map((_, col) => {
              const cell = cells[col * 7 + row];
              if (!cell) return <div key={col} className="h-3.5 w-3.5 rounded-[3px]" style={{ background: 'transparent' }} />;
              return (
                <div key={col} title={`${cell.date.toLocaleDateString('fr-FR')} : ${cell.count} tirage(s)`}
                  className="h-3.5 w-3.5 rounded-[3px]" style={{ background: colorFor(cell.count) }} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
        <span>{/* legend */}</span>
        <span>{/* sp */}</span>
      </div>
    </div>
  );
}

// Rythme hebdomadaire (nombre de tirages par jour de la semaine)
function WeeklyRhythm({ counts, lang }: { counts: Map<string, number>; lang: string }) {
  const byWeekday = Array.from({ length: 7 }).map((_, i) => i); // 0=dim
  const totalPerDay = byWeekday.map((wd) => {
    let total = 0;
    counts.forEach((c, k) => {
      const parts = k.split('-').map(Number);
      const d = new Date(parts[0], parts[1], parts[2]);
      if (d.getDay() === wd) total += c;
    });
    return total;
  });
  const maxDay = Math.max(1, ...totalPerDay);
  const order = byWeekday; // [Dim, Lun, Mar, Mer, Jeu, Ven, Sam]
  const labels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return (
    <div className="space-y-2.5">
      {order.map((wd) => {
        const v = totalPerDay[wd];
        const isMax = v === maxDay && v > 0;
        return (
          <div key={wd} className="flex items-center gap-2">
            <span className="w-8 text-[11px] text-gray-400">{labels[wd]}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-800/60 overflow-hidden">
              <div className="h-full rounded-full" style={{
                width: `${(v / maxDay) * 100}%`,
                background: isMax ? 'linear-gradient(90deg,#FFD700,#F5B450)' : 'linear-gradient(90deg,rgba(218,165,32,0.5),rgba(218,165,32,0.3))',
                boxShadow: isMax ? '0 0 8px rgba(255,215,0,0.5)' : 'none',
              }} />
            </div>
            <span className="w-7 text-right text-[11px] text-amber-300/90">{v}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const t = useT();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [readings, setReadings] = useState<any[]>([]);

  if (typeof window !== 'undefined' && !ready) {
    const stored = localStorage.getItem('tarot_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    setReady(true);
  }

  useEffect(() => {
    if (!user?.email) return;
    api(`/api/readings?userId=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((data) => setReadings(data.readings || []))
      .catch(() => {});
  }, [user]);

  const lang = (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) ? 'en' : 'fr';

  const derived = useMemo(() => {
    const groups: Group[] = ['tarot', 'yijing', 'rune', 'des'];
    const counts: Record<Group, number> = { tarot: 0, yijing: 0, rune: 0, des: 0 };
    const dayMap = new Map<string, number>();
    let questions = 0;
    readings.forEach((r) => {
      counts[classifyType(r.type)]++;
      const d = new Date(r.createdAt);
      const k = dayKey(d);
      dayMap.set(k, (dayMap.get(k) || 0) + 1);
      if (r.question && r.question.trim()) questions++;
    });
    const total = readings.length;
    const streak = computeStreak(dayMap);
    const best = bestStreak(dayMap);
    const activeDays = dayMap.size;
    const byMonth: { month: string; count: number }[] = [];
    const monthMap: Record<string, number> = {};
    readings.forEach((r) => {
      const d = new Date(r.createdAt);
      const key = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { month: 'short', year: '2-digit' });
      monthMap[key] = (monthMap[key] || 0) + 1;
    });
    Object.entries(monthMap).map(([month, count]) => byMonth.push({ month, count })).slice(-6);
    const maxMonth = Math.max(1, ...byMonth.map((m) => m.count));
    const sorted = [...readings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recent = sorted.slice(0, 6);
    return { groups, counts, total, streak, best, activeDays, questions, dayMap, byMonth, maxMonth, recent };
  }, [readings, lang]);

  if (!user) return null;

  const { groups, counts, total, streak, best, activeDays, questions, dayMap, byMonth, maxMonth, recent } = derived;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + new Date(iso).toLocaleTimeString(lang === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
            <img src="/images/nav-stats.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
            {t('stats.title')}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t('stats.subtitle')}</p>
        </div>
      </header>

      {/* ── Bloc "série" (streak) : mise en avant de l'activité ── */}
      <div className="mystic-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mystic-subtitle text-sm">{t('stats.streak')}</h2>
          <span className="text-[10px] text-gray-500">{t('stats.bestStreak')} : {streak} j</span>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-center shrink-0">
            <span className="text-5xl leading-none" style={{ filter: 'drop-shadow(0 0 14px rgba(255,150,40,0.6))' }}>🔥</span>
            <span className="mystic-title text-3xl sm:text-4xl text-amber-300 mt-2" style={{ textShadow: '0 0 16px rgba(255,215,0,0.45)' }}>{streak}</span>
            <span className="text-[11px] text-gray-400">{t('stats.streakDays')}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 flex-1 min-w-0">
            <MiniStat label={t('stats.activeDays')} value={activeDays} />
            <MiniStat label={t('stats.questions')} value={questions} />
            <MiniStat label={t('stats.draws')} value={total} />
            <MiniStat label={t('stats.bestStreak')} value={best + ' j'} />
          </div>
        </div>
      </div>

      {/* ── Cartes de stats : 4 types + total ── */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        <StatCard icon="/images/nav-historique.png" value={total} label={t('stats.draws')} />
        {groups.map((g) => (
          <StatCard key={g} icon={GROUP_META[g].icon} value={counts[g]} label={t('stats.' + (g === 'rune' ? 'runes' : g))} />
        ))}
      </div>

      {/* ── Heatmap calendrier d'activité ── */}
      <div className="mystic-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mystic-subtitle text-sm">{t('stats.heatmap')}</h2>
          <div className="flex items-center gap-1 text-[9px] text-gray-500">
            <span>{t('stats.less')}</span>
            {[0, 0.35, 0.6, 1].map((c, i, arr) => (
              <span key={i} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c === 0 ? 'rgba(255,255,255,0.05)' : `rgba(255,200,80,${c})` }} />
            ))}
            <span>{t('stats.more')}</span>
          </div>
        </div>
        <Heatmap counts={dayMap} lang={lang} />
      </div>

      {/* ── Rythme hebdomadaire ── */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-4">{t('stats.weeklyRhythm')}</h2>
        {total === 0 ? (
          <p className="text-gray-500 text-sm">{t('stats.noDraws')}</p>
        ) : (
          <WeeklyRhythm counts={dayMap} lang={lang} />
        )}
      </div>

      {/* ── Répartition par type ── */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-4">{t('stats.repartition')}</h2>
        {total === 0 ? (
          <p className="text-gray-500 text-sm">{t('stats.noDraws')}</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <Bar key={g} icon={GROUP_META[g].icon} label={t('stats.bar' + (g === 'rune' ? 'Runes' : g.charAt(0).toUpperCase() + g.slice(1)))} value={counts[g]} total={total} gradient={GROUP_META[g].gradient} />
            ))}
          </div>
        )}
      </div>

      {/* ── Activité mensuelle ── */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-4">{t('stats.activityRecent')}</h2>
        {byMonth.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('stats.noHistory')}</p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32 mb-5">
            {byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-blue-700/40 to-sky-400/70 rounded-t" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: '4px' }} />
                <span className="text-[10px] text-gray-500">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Derniers tirages enrichis (question + aperçu) ── */}
      <div className="mystic-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mystic-subtitle text-sm">{t('stats.recentDraws')}</h2>
          <Link href="/dashboard/account/readings" className="text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors">{t('stats.viewAll')} →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('stats.noDraws')}</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r, i) => {
              const g = classifyType(r.type);
              const gm = GROUP_META[g];
              return (
                <li key={i} className="flex items-center gap-3 border-b border-amber-800/15 pb-2 last:border-0 last:pb-0">
                  <img src={gm.icon} alt="" className="w-8 h-8 object-contain shrink-0" style={{ filter: `drop-shadow(0 0 4px ${gm.color}88)` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 text-sm truncate">{subLabel(r.type)}</span>
                    </div>
                    {r.question ? (
                      <p className="text-gray-500 text-xs truncate italic mt-0.5">« {r.question} »</p>
                    ) : (
                      <p className="text-gray-600 text-xs mt-0.5">{t('stats.noQuestion')}</p>
                    )}
                    <div className="mt-1"><DrawSummary type={r.type} cards={r.cards} /></div>
                  </div>
                  <span className="text-gray-500 text-[10px] shrink-0 text-right">{fmtDate(r.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0">
      <div className="mystic-title text-lg sm:text-xl text-amber-200">{value}</div>
      <div className="text-[10px] text-gray-400 truncate">{label}</div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="mystic-panel p-3 sm:p-4 text-center">
      <div className="text-lg sm:text-2xl mb-1 flex justify-center">
        <img src={icon} alt="" className="h-7 w-7 sm:h-9 sm:w-9 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.4))' }} />
      </div>
      <div className="mystic-title text-lg sm:text-2xl">{value}</div>
      <div className="mystic-subtitle text-[9px] sm:text-[10px] mt-1">{label}</div>
    </div>
  );
}

function Bar({ icon, label, value, total, gradient }: { icon: string; label: string; value: number; total: number; gradient: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 flex items-center gap-1.5">
          <img src={icon} alt="" className="h-4 w-4 object-contain" />
          {label}
        </span>
        <span className="text-amber-300">{value} · {pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-800/60 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${gradient}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
