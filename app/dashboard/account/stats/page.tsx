'use client';

import { useEffect, useState } from 'react';

export default function StatsPage() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [stats, setStats] = useState<{ total: number; tarot: number; yijing: number; byMonth: { month: string; count: number }[] }>({ total: 0, tarot: 0, yijing: 0, byMonth: [] });

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
      })
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const maxMonth = Math.max(1, ...stats.byMonth.map((m) => m.count));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl">📊 Statistiques</h1>
        <p className="text-gray-500 text-sm mt-1">Votre parcours divinatoire.</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="📜" value={stats.total} label="Tirages" />
        <StatCard icon="🎴" value={stats.tarot} label="Tarot" />
        <StatCard icon="☯️" value={stats.yijing} label="Yi Jing" />
      </div>

      {/* Répartition Tarot / Yi Jing */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-4">Répartition</h2>
        {stats.total === 0 ? (
          <p className="text-gray-500 text-sm">Aucun tirage pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            <Bar label="🎴 Tarot" value={stats.tarot} total={stats.total} color="from-amber-500 to-orange-700" />
            <Bar label="☯️ Yi Jing" value={stats.yijing} total={stats.total} color="from-purple-500 to-fuchsia-700" />
          </div>
        )}
      </div>

      {/* Activité mensuelle */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-4">Activité récente</h2>
        {stats.byMonth.length === 0 ? (
          <p className="text-gray-500 text-sm">Pas encore d'historique.</p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-amber-700/40 to-amber-400/70 rounded-t" style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: '4px' }} />
                <span className="text-[10px] text-gray-500">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="mystic-panel p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="mystic-title text-2xl">{value}</div>
      <div className="mystic-subtitle text-[10px] mt-1">{label}</div>
    </div>
  );
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-amber-300">{value} · {pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-800/60 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
