'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { IconTarot, IconYiJing } from '@/components/yi-icons';

export default function StatsPage() {
  const t = useT();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<{ total: number; tarot: number; yijing: number; byMonth: { month: string; count: number }[] }>({ total: 0, tarot: 0, yijing: 0, byMonth: [] });
  const [recent, setRecent] = useState<{ type: string; createdAt: string }[]>([]);

  if (typeof window !== 'undefined' && !ready) {
    const stored = localStorage.getItem('tarot_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    setReady(true);
  }

  useEffect(() => {
    if (!user?.email) return;
    fetch(`/api/readings?userId=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((data) => {
        const readings: any[] = data.readings || [];
        const tarot = readings.filter((r) => (r.type || '').toLowerCase().replace(/[-_]/g, '').includes('tarot')).length;
        const yijing = readings.length - tarot;
        const months: Record<string, number> = {};
        readings.forEach((r) => {
          const d = new Date(r.createdAt);
          const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
          months[key] = (months[key] || 0) + 1;
        });
        const byMonth = Object.entries(months).map(([month, count]) => ({ month, count })).slice(-6);
        setStats({ total: readings.length, tarot, yijing, byMonth });
        const sorted = [...readings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecent(sorted.slice(0, 5).map((r) => ({ type: r.type, createdAt: r.createdAt })));
      })
      .catch(() => {});
  }, [user]);

  const typeLabel = (t2: string) => {
    const s = (t2 || '').toLowerCase().replace(/[_-]/g, '');
    if (s.includes('yi') || s.includes('jing')) return t('stats.yijing');
    if (s.includes('rune') || s.includes('futhark')) return t('stats.runes');
    return t('stats.tarot');
  };
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (!user) return null;

  const maxMonth = Math.max(1, ...stats.byMonth.map((m) => m.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <img src="/images/nav-stats.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('stats.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t('stats.subtitle')}</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="/images/nav-historique.png" value={stats.total} label={t('stats.draws')} />
        <StatCard icon="/images/tarot-icon.png" value={stats.tarot} label={t('stats.tarot')} />
        <StatCard icon="/images/yi-jing-icon.png" value={stats.yijing} label={t('stats.yijing')} />
      </div>

      {/* Répartition Tarot / Yi Jing */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-4">{t('stats.repartition')}</h2>
        {stats.total === 0 ? (
          <p className="text-gray-500 text-sm">{t('stats.noDraws')}</p>
        ) : (
          <div className="space-y-3">
            <Bar iconComp={IconTarot} label={t('stats.barTarot')} value={stats.tarot} total={stats.total} color="from-amber-500 to-orange-700" />
            <Bar iconComp={IconYiJing} label={t('stats.barYijing')} value={stats.yijing} total={stats.total} color="from-purple-500 to-fuchsia-700" />
          </div>
        )}
      </div>

      {/* Activité récente */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-4">{t('stats.activityRecent')}</h2>
        {stats.byMonth.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('stats.noHistory')}</p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32 mb-5">
            {stats.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-amber-700/40 to-amber-400/70 rounded-t" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: '4px' }} />
                <span className="text-[10px] text-gray-500">{m.month}</span>
              </div>
            ))}
          </div>
        )}
        {recent.length > 0 && (
          <ul className="space-y-2">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b border-amber-800/15 pb-2 last:border-0 last:pb-0">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-gray-200">{typeLabel(r.type)}</span>
                </span>
                <span className="text-gray-500 text-xs">{fmtDate(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  const isImg = icon.startsWith('/');
  return (
    <div className="mystic-panel p-4 text-center">
      <div className="text-2xl mb-1 flex justify-center">
        {isImg ? (
          <img src={icon} alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.4))' }} />
        ) : (
          icon
        )}
      </div>
      <div className="mystic-title text-2xl">{value}</div>
      <div className="mystic-subtitle text-[10px] mt-1">{label}</div>
    </div>
  );
}

function Bar({ iconComp: IconComp, label, value, total, color }: { iconComp?: React.ComponentType<{ className?: string }>; label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 flex items-center gap-1.5">
          {IconComp && <IconComp className="h-4 w-4 text-amber-300" />}
          {label}
        </span>
        <span className="text-amber-300">{value} · {pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-800/60 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
