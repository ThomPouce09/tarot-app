'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';

type Group = 'tarot' | 'yijing' | 'rune' | 'des';

const GROUP_META: Record<Group, { icon: string; color: string; gradient: string }> = {
  tarot:  { icon: '/images/tarot-icon.png',     color: '#FFD700', gradient: 'from-amber-500 to-orange-700' },
  yijing: { icon: '/images/yi-jing-icon.png',   color: '#E0CFF0', gradient: 'from-purple-500 to-fuchsia-700' },
  rune:   { icon: '/images/runes-icon.png',     color: '#D4B483', gradient: 'from-amber-700 to-yellow-800' },
  des:    { icon: '/images/des-zodiaque.png',   color: '#7FB3D5', gradient: 'from-sky-500 to-blue-700' },
};

function classifyType(t: string): Group {
  const s = (t || '').toLowerCase().replace(/[_-]/g, '');
  if (s.includes('yi') || s.includes('jing') || s.includes('yijing')) return 'yijing';
  if (s.includes('rune') || s.includes('futhark')) return 'rune';
  if (s.includes('des') || s.includes('zodiaque') || s.includes('astro') || s.includes('dice')) return 'des';
  return 'tarot';
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
    fetch(`/api/readings?userId=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((data) => setReadings(data.readings || []))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const groups: Group[] = ['tarot', 'yijing', 'rune', 'des'];
  const counts: Record<Group, number> = { tarot: 0, yijing: 0, rune: 0, des: 0 };
  readings.forEach((r) => { counts[classifyType(r.type)]++; });
  const total = readings.length;

  // Activité mensuelle (tous types confondus)
  const months: Record<string, number> = {};
  readings.forEach((r) => {
    const d = new Date(r.createdAt);
    const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    months[key] = (months[key] || 0) + 1;
  });
  const byMonth = Object.entries(months).map(([month, count]) => ({ month, count })).slice(-6);
  const maxMonth = Math.max(1, ...byMonth.map((m) => m.count));

  // Derniers tirages
  const sorted = [...readings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recent = sorted.slice(0, 5);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <img src="/images/nav-stats.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('stats.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t('stats.subtitle')}</p>
      </header>

      {/* Cartes de stats : 4 types + total */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        <StatCard icon="/images/nav-historique.png" value={total} label={t('stats.draws')} />
        {groups.map((g) => (
          <StatCard key={g} icon={GROUP_META[g].icon} value={counts[g]} label={t('stats.' + (g === 'rune' ? 'runes' : g))} />
        ))}
      </div>

      {/* Répartition par type */}
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

      {/* Activité mensuelle */}
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
        {recent.length > 0 && (
          <ul className="space-y-2">
            {recent.map((r, i) => {
              const g = classifyType(r.type);
              const gm = GROUP_META[g];
              return (
                <li key={i} className="flex items-center justify-between text-sm border-b border-amber-800/15 pb-2 last:border-0 last:pb-0">
                  <span className="flex items-center gap-2">
                    <img src={gm.icon} alt="" className="w-4 h-4 object-contain" style={{ filter: `drop-shadow(0 0 4px ${gm.color}88)` }} />
                    <span className="text-gray-200">{t('stats.' + (g === 'rune' ? 'runes' : g))}</span>
                  </span>
                  <span className="text-gray-500 text-xs">{fmtDate(r.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
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
