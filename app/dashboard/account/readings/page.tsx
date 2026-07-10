'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { useT } from '@/lib/i18n';

interface Reading {
  id: string;
  userId?: string;
  type: string;
  question?: string | null;
  spread: string;
  cards: any[];
  interpretation?: string | null;
  createdAt: string;
}

// --- Mapping type de tirage -> icône/style (réutilise les tuiles de la landing) ---
const TYPE_META: Record<string, { key: string; label: string; icon: string; color: string; bg: string; border: string; glow: string }> = {
  tarot:  { key: 'tarot',  label: 'Tarot',            icon: '/images/tarot-icon.png',   color: '#FFD700', bg: 'rgba(218,165,32,0.12)',  border: 'rgba(218,165,32,0.35)',  glow: 'rgba(255,215,0,0.45)' },
  yijing: { key: 'yijing', label: 'Yi Jing',          icon: '/images/yi-jing-icon.png', color: '#E0CFF0', bg: 'rgba(180,140,220,0.12)', border: 'rgba(180,140,220,0.35)', glow: 'rgba(180,140,220,0.5)' },
  rune:   { key: 'rune',   label: 'Runes Scandinaves', icon: '/images/runes-icon.png',   color: '#D4B483', bg: 'rgba(138,109,59,0.12)',  border: 'rgba(138,109,59,0.35)',  glow: 'rgba(138,109,59,0.45)' },
};

function classifyType(t: string): keyof typeof TYPE_META {
  const s = (t || '').toLowerCase().replace(/[_-]/g, '');
  if (s.includes('yi') || s.includes('jing') || s.includes('yijing')) return 'yijing';
  if (s.includes('rune') || s.includes('futhark')) return 'rune';
  return 'tarot'; // tarot, null, et tout le reste
}

// --- Mapping fin (par type stocke) -> libellé précis + groupe ---
const SUBTYPE_META: Record<string, { group: 'tarot' | 'yijing' | 'rune'; label: string }> = {
  'tarot-3-cartes':      { group: 'tarot',  label: 'Tarot 3 cartes' },
  'tarot-5-cartes':      { group: 'tarot',  label: 'Tarot 5 cartes' },
  'tarot-5-c-manuelle':  { group: 'tarot',  label: 'Tarot 5 cartes (✋)' },
  'tarot-10-cartes':     { group: 'tarot',  label: 'Tarot 10 cartes' },
  'tirage-ouvert':       { group: 'tarot',  label: 'Tirage Ouvert' },
  'tirage-amoureux':     { group: 'tarot',  label: 'Tirage Amoureux' },
  'yi-jing-simple':      { group: 'yijing', label: 'Yi Jing simple' },
  'yi-jing-question':    { group: 'yijing', label: 'Yi Jing (question)' },
  'yi-qing':             { group: 'yijing', label: 'Yi Qing' },
  'yi-jing-du-jour':     { group: 'yijing', label: 'Yi Jing du jour' },
  'runes':               { group: 'rune',   label: 'Runes Scandinaves' },
  'tarot':               { group: 'tarot',  label: 'Tarot' },
  'yi-jing':             { group: 'yijing', label: 'Yi Jing' },
  'yijing':              { group: 'yijing', label: 'Yi Jing' },
};
function metaOf(r: Reading) {
  const sub = SUBTYPE_META[r.type] || { group: 'tarot' as const, label: TYPE_META.tarot.label };
  const gm = TYPE_META[sub.group];
  return { ...gm, group: sub.group, label: sub.label };
}

// Souligne les occurrences du mot-clé recherché (insensible à la casse)
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const parts: (string | JSX.Element)[] = [];
  let i = 0;
  let idx = lower.indexOf(ql);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="rounded px-0.5 font-semibold" style={{
        background: 'rgba(255, 215, 0, 0.18)',
        color: '#FFE9A8',
        textShadow: '0 0 16px rgba(255, 215, 0, 1), 0 0 28px rgba(255, 215, 0, 0.6)',
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.45)',
      }}>{text.slice(idx, idx + q.length)}</mark>
    );
    i = idx + q.length;
    idx = lower.indexOf(ql, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

const FILTERS = [
  { key: 'all',   labelKey: 'history.filter.all',    icon: '/images/tarot-icon.png', color: '#FFD700' },
  { key: 'tarot', labelKey: 'history.filter.tarot',  icon: '/images/tarot-icon.png', color: '#FFD700' },
  { key: 'yijing', labelKey: 'history.filter.yijing', icon: '/images/yi-jing-icon.png', color: '#E0CFF0' },
  { key: 'rune',  labelKey: 'history.filter.rune',   icon: '/images/runes-icon.png', color: '#D4B483' },
] as const;

const tarot3Positions = [
  { key: 'situation', position: 'past', icon: '🕰️', nameKey: 'history.pos.past', titleColor: 'text-blue-300', cardColor: 'bg-blue-950/20 border-blue-800/30' },
  { key: 'defis', position: 'present', icon: '⚔️', nameKey: 'history.pos.present', titleColor: 'text-amber-300', cardColor: 'bg-amber-950/20 border-amber-800/30' },
  { key: 'issue', position: 'future', icon: '💫', nameKey: 'history.pos.future', titleColor: 'text-green-300', cardColor: 'bg-green-950/20 border-green-800/30' },
];
const tarot5Positions = [
  { key: 'situation', icon: '⬆️', nameKey: 'history.pos.summit', titleColor: 'text-yellow-300', cardColor: 'bg-yellow-950/20 border-yellow-700/40' },
  { key: 'defis', icon: '👈', nameKey: 'history.pos.orient', titleColor: 'text-red-300', cardColor: 'bg-red-950/20 border-red-800/40' },
  { key: 'soutien', icon: '🎯', nameKey: 'history.pos.synthesis', titleColor: 'text-purple-300', cardColor: 'bg-purple-950/20 border-purple-800/40' },
  { key: 'issue', icon: '👉', nameKey: 'history.pos.occident', titleColor: 'text-orange-300', cardColor: 'bg-orange-950/20 border-orange-800/40' },
  { key: 'conseil', icon: '⬇️', nameKey: 'history.pos.base', titleColor: 'text-cyan-300', cardColor: 'bg-cyan-950/20 border-cyan-800/40' },
];

export default function ReadingsPage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [openReading, setOpenReading] = useState<string | null>(null);
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);

  // État suppression + confirmation
  const [confirm, setConfirm] = useState<{ mode: 'one' | 'date'; id?: string; dateKey?: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadReadings = useCallback(async () => {
    const stored = localStorage.getItem('tarot_user');
    if (!stored) { router.push('/auth/login'); return; }
    const u = JSON.parse(stored);
    setUser(u);
    try {
      const res = await fetch(`/api/readings?userId=${encodeURIComponent(u.email)}`);
      const data = await res.json();
      const r: Reading[] = Array.isArray(data?.readings) ? data.readings : [];
      r.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReadings(r);
      setFetchError(null);
    } catch (err) {
      console.error('Fetch readings error:', err);
      setFetchError(t('history.loadError'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadReadings(); }, [loadReadings]);

  // Filtrer par type + recherche mot-clé
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return readings.filter((r) => {
      if (filter !== 'all' && metaOf(r).group !== filter) return false;
      if (!q) return true;
      const haystack = [
        r.question || '',
        r.interpretation || '',
        metaOf(r).label,
        (r.cards || []).map((c: any) => (c.name?.name || c.name || '')).join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [readings, filter, search]);

  // Grouper par date (desc)
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Reading[]>();
    filtered.forEach((r) => {
      const d = new Date(r.createdAt);
      const dateKey = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(r);
    });
    // dateKey trié du plus récent au plus ancien (basé sur createdAt réel)
    const groups = Array.from(map.entries()).map(([dateKey, reads]) => ({ dateKey, dateLabel: dateKey, readings: reads }));
    groups.sort((a, b) => new Date(b.readings[0].createdAt).getTime() - new Date(a.readings[0].createdAt).getTime());
    return groups;
  }, [filtered]);

  // Ouvrir la première date au chargement
  useEffect(() => {
    if (groupedByDate.length > 0 && !hasInitialized) {
      setOpenDates(new Set([groupedByDate[0].dateKey]));
      setHasInitialized(true);
    }
  }, [groupedByDate, hasInitialized]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    } catch { return ''; }
  };
  const dateToYMD = (iso: string) => new Date(iso).toISOString().slice(0, 10);

  // --- Parsers d'interprétation ---
  const parseTarot3 = (raw: string) => {
    if (!raw) return null;
    try { const p = JSON.parse(raw); if (p.carte1 || p.carte2 || p.carte3) return { kind: 'tarot3' as const, data: p }; } catch {}
    return { kind: 'tarot3' as const, data: { carte1: raw } };
  };
  const parseTarot5 = (raw: string) => {
    if (!raw) return null;
    try { const p = JSON.parse(raw); if (p.situation || p.defis || p.soutien || p.issue || p.conseil) return p; } catch {}
    return null;
  };
  const parseYiQing = (raw: string) => {
    if (!raw) return null;
    try { const p = JSON.parse(raw); if (p.meditation || p.conseil || p.attitude) return p; } catch {}
    return null;
  };

  const toggleReading = (id: string) => setOpenReading(openReading === id ? null : id);
  const toggleDate = (dateKey: string) => setOpenDates((prev) => {
    const next = new Set(prev);
    if (next.has(dateKey)) next.delete(dateKey); else next.add(dateKey);
    return next;
  });

  // --- Suppression ---
  const askDeleteOne = (r: Reading) => {
    const m = metaOf(r);
    setConfirm({ mode: 'one', id: r.id, label: `${m.label} du ${formatTime(r.createdAt)}` });
  };
  const askDeleteDate = (g: { dateKey: string; dateLabel: string }) => {
    setConfirm({ mode: 'date', dateKey: g.dateKey, label: g.dateLabel });
  };

  const doDelete = async () => {
    if (!confirm || !user) return;
    setDeleting(true);
    try {
      const body: any = { userId: user.email };
      if (confirm.mode === 'one') body.id = confirm.id;
      else body.date = dateToYMD(readings.find((r) => new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }) === confirm.dateKey)!.createdAt);

      const res = await fetch('/api/readings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur suppression');
      await loadReadings();
      setConfirm(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      setFetchError(err.message || 'Échec de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center p-4">
        <p className="text-amber-300 animate-pulse text-lg" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.loading')}</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Croix retour accueil retirée : le rond avatar du layout mène à Mon espace */}

      <div className="max-w-2xl mx-auto pt-2 pb-24">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-1 flex items-center justify-center gap-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520', textShadow: '0 0 18px rgba(218,165,32,0.5)' }}>
          <img src="/images/nav-historique.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('history.title')}
        </h1>
        <p className="text-center text-xs mb-5" style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(255,215,0,0.6)' }}>
          {t('history.subtitle')}
        </p>

        {fetchError && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
            <p className="text-red-300 text-sm">{fetchError}</p>
          </div>
        )}

        {/* Recherche par mot-clé */}
        {readings.length > 0 && (
          <div className="relative mb-5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/70" style={{ filter: 'drop-shadow(0 0 4px rgba(218,165,32,0.4))' }}>🔍</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('history.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60 transition-all placeholder:text-amber-200/40"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(218,165,32,0.3)',
                color: '#FFE9B0',
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: '1.05rem',
              }}
            />
            {search.trim() && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/60 hover:text-amber-300 text-sm" aria-label={t('history.clear')}>✕</button>
            )}
          </div>
        )}

        {/* Filtres par type (icônes landing) */}
        {readings.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: active ? '#1a0e0a' : f.color,
                    background: active ? f.color : 'rgba(0,0,0,0.4)',
                    borderColor: f.color,
                    boxShadow: active ? `0 0 16px ${f.color}` : 'none',
                    opacity: active ? 1 : 0.8,
                  }}
                >
                  <img src={f.icon} alt="" className="w-5 h-5 object-contain" style={{ filter: `drop-shadow(0 0 4px ${f.color})` }} />
                  <span className="text-xs font-semibold">{t(f.labelKey)}</span>
                </button>
              );
            })}
          </div>
        )}

        {readings.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="bg-gray-900/60 border border-amber-800/30 rounded-lg p-8 text-center">
            <p className="text-amber-200/70 text-sm">{t('history.noType')}</p>
          </div>
        ) : (
          <div className="space-y-5 pb-2">
            {groupedByDate.map((group) => {
              const isOpen = openDates.has(group.dateKey);
              const counts: Record<string, number> = { tarot: 0, yijing: 0, rune: 0 };
              group.readings.forEach((r) => { counts[metaOf(r).group]++; });

              return (
                <div key={group.dateKey}>
                  {/* En-tête date + suppression par date */}
                  <div className="flex items-center justify-between bg-gray-900/60 border border-amber-800/30 rounded-lg px-3 py-2.5 mb-2 hover:bg-gray-800/50 transition-colors">
                    <button onClick={() => toggleDate(group.dateKey)} className="flex items-center gap-2 text-left flex-1">
                      <span className={`text-amber-400 text-xs transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                      <span className="text-amber-200 font-semibold text-sm" style={{ fontFamily: 'var(--font-cinzel), serif' }}>📅 {group.dateLabel}</span>
                      <span className="flex items-center gap-1.5 text-xs ml-1">
                        {counts.tarot > 0 && <TypeBadge k="tarot" n={counts.tarot} />}
                        {counts.yijing > 0 && <TypeBadge k="yijing" n={counts.yijing} />}
                        {counts.rune > 0 && <TypeBadge k="rune" n={counts.rune} />}
                      </span>
                    </button>
                    <button onClick={() => askDeleteDate(group)}
                      className="ml-2 p-1.5 rounded-md text-red-400/70 hover:text-red-300 hover:bg-red-900/30 transition-all"
                      aria-label={t('history.deleteDate')} title={t('history.deleteDate')}>
                      🗑
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-2 pl-2">
                      {group.readings.map((r) => {
                        const m = metaOf(r);
                        const yiQing = parseYiQing(r.interpretation || '');
                        return (
                          <div key={r.id} className="bg-gray-900/80 border rounded-lg overflow-hidden shadow-lg" style={{ borderColor: m.border }}>
                            <div className="flex items-center">
                              <button onClick={() => toggleReading(r.id)} className="w-full p-3 text-left hover:bg-gray-800/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium flex items-center gap-2" style={{ color: m.color, fontFamily: 'var(--font-cinzel), serif' }}>
                                    <img src={m.icon} alt="" className="w-7 h-7 object-contain" style={{ filter: `drop-shadow(0 0 5px ${m.glow})` }} />
                                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: m.bg, border: `1px solid ${m.border}` }}>{m.label}</span>
                                  </span>
                                  <span className="text-gray-400 text-xs">🕐 {formatTime(r.createdAt)}</span>
                                </div>
                              </button>
                              <button onClick={() => askDeleteOne(r)}
                                className="mr-2 p-1.5 rounded-md text-red-400/60 hover:text-red-300 hover:bg-red-900/30 transition-all shrink-0"
                                aria-label={t('history.deleteOne')} title={t('history.deleteOne')}>
                                🗑
                              </button>
                            </div>

                            {openReading === r.id && (
                              <div className="px-4 pb-4 border-t border-amber-800/20 max-h-[60vh] overflow-y-auto">
                                {m.group === 'yijing' ? (
                                  <YiJingView r={r} interp={yiQing} query={search} />
                                ) : (
                                  <TarotView r={r} interpretation={r.interpretation || ''} query={search} />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale de confirmation */}
      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setConfirm(null)} />
          <div className="relative z-10 w-full max-w-sm p-6 rounded-2xl" style={{ background: 'rgba(26,14,10,0.96)', border: '1px solid rgba(218,165,32,0.3)', boxShadow: '0 0 40px rgba(218,165,32,0.2)' }}>
            <h3 className="text-xl font-bold text-center mb-3" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#FFD700', textShadow: '0 0 15px rgba(255,215,0,0.5)' }}>
              {confirm.mode === 'one' ? t('history.deleteOne') : t('history.deleteDate')}
            </h3>
            <p className="text-center text-sm mb-6" style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(255,215,0,0.75)' }}>
              {confirm.label}
            </p>
            <div className="flex gap-3">
              <button onClick={() => !deleting && setConfirm(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ fontFamily: 'var(--font-cinzel), serif', background: 'rgba(255,255,255,0.08)', color: '#ddd', border: '1px solid rgba(255,255,255,0.2)' }}
                disabled={deleting}>
                {t('history.cancel')}
              </button>
              <button onClick={doDelete}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-80"
                style={{ fontFamily: 'var(--font-cinzel), serif', background: 'linear-gradient(135deg, #7a1f1f 0%, #c0392b 100%)', color: '#fff', border: '1px solid rgba(192,57,43,0.5)', boxShadow: '0 0 16px rgba(192,57,43,0.4)' }}
                disabled={deleting}>
                {deleting ? t('history.deleting') : t('history.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Sous-composants ---
function TypeBadge({ k, n }: { k: keyof typeof TYPE_META; n: number }) {
  const m = TYPE_META[k];
  return <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>{m.label} {n}</span>;
}

function EmptyState() {
  const t = useT();
  return (
    <div className="bg-gray-900/60 border border-amber-800/30 rounded-lg p-10 text-center">
      <div className="text-5xl mb-4" style={{ filter: 'drop-shadow(0 0 14px rgba(218,165,32,0.5))' }}>🔮</div>
      <p className="text-amber-200/80 text-base mb-1 font-semibold" style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>{t('history.emptyTitle')}</p>
      <p className="text-gray-500 text-xs mb-6" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.emptyText')}</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link href="/tarot" className="inline-block px-4 py-2 rounded-lg text-amber-300 text-sm hover:opacity-80 transition-all"
          style={{ background: 'rgba(218,165,32,0.2)', border: '1px solid rgba(218,165,32,0.4)', fontFamily: 'var(--font-cinzel), serif' }}>{t('history.doTarot')}</Link>
        <Link href="/yi-jing" className="inline-block px-4 py-2 rounded-lg text-purple-300 text-sm hover:opacity-80 transition-all"
          style={{ background: 'rgba(180,140,220,0.2)', border: '1px solid rgba(180,140,220,0.4)', fontFamily: 'var(--font-cinzel), serif' }}>{t('history.doYijing')}</Link>
      </div>
    </div>
  );
}

function YiJingView({ r, interp, query = '' }: { r: Reading; interp: any; query?: string }) {
  const t = useT();
  const isSimpleFormat = r.type === 'yi-jing-simple' || (interp && interp.situation);
  return (
    <div className="mt-4 space-y-4">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">"<Highlight text={r.question || ''} query={query} />"</p>
        </div>
      )}
      {r.cards && Array.isArray(r.cards) && r.cards.length > 0 && (
        <div className="text-center">
          <h3 className="text-xl font-serif text-purple-300 mb-1">{r.cards[0]?.name || t('history.hexagram')}</h3>
          {r.cards[0]?.id && <p className="text-purple-400/60 text-xs">{t('history.hexagramNo')}{r.cards[0].id}</p>}
        </div>
      )}

      {isSimpleFormat ? (
        <>
          {interp?.situation && <Block color="purple" icon="📍" title={t('history.block.situation')} text={interp.situation} query={query} />}
          {interp?.defis && <Block color="amber" icon="⚔️" title={t('history.block.defis')} text={interp.defis} query={query} />}
          {interp?.soutien && <Block color="green" icon="🌟" title={t('history.block.soutien')} text={interp.soutien} query={query} />}
          {interp?.issue && <Block color="amber" icon="🔮" title={t('history.block.issue')} text={interp.issue} query={query} />}
          {interp?.conseil && <Block color="green" icon="💡" title={t('history.block.conseil')} text={interp.conseil} query={query} />}
        </>
      ) : (
        <>
          {interp?.meditation && <Block color="purple" icon="🧘" title={t('history.block.meditation')} text={interp.meditation} query={query} />}
          {interp?.conseil && <Block color="amber" icon="💡" title={t('history.block.conseil')} text={interp.conseil} query={query} />}
          {interp?.attitude && <Block color="green" icon="🌿" title={t('history.block.attitude')} text={interp.attitude} query={query} />}
        </>
      )}

      {!interp && r.interpretation && (
        <div className="bg-gray-800/40 rounded-lg p-3">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={r.interpretation || ''} query={query} /></p>
        </div>
      )}
    </div>
  );
}

function TarotView({ r, interpretation, query = '' }: { r: Reading; interpretation: string; query?: string }) {
  const t = useT();
  const isTarot3 = r.cards.length === 3;
  const positions = isTarot3 ? tarot3Positions : tarot5Positions;
  const interpData = isTarot3
    ? (parseTarot3Inline(interpretation)?.data || {})
    : (parseTarot5Inline(interpretation) || {});

  if (!r.cards || !Array.isArray(r.cards) || r.cards.length === 0) {
    return <p className="text-gray-400 text-xs italic mt-3">"<Highlight text={r.question || ''} query={query} />"</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">"<Highlight text={r.question || ''} query={query} />"</p>
        </div>
      )}
      {r.cards.map((c: any, idx: number) => {
        if (isTarot3 && idx >= 3) return null;
        if (idx >= positions.length) return null;
        const pos = positions[idx];
        const cardData = TAROT_CARDS.find((t) => t.id === c.id);
        const cardName = cardData?.name || c.name?.name || c.name || `Carte ${idx + 1}`;
        const text = (interpData as any)[pos.key] as string | undefined;
        if (!text) return null;
        return (
          <div key={idx} className={`${pos.cardColor} border rounded-lg p-3 shadow-sm`}>
            <h4 className={`${pos.titleColor} font-semibold text-sm mb-2 flex items-center gap-2`}>
              <span className="text-base">{pos.icon}</span><span>{t(pos.nameKey)}</span>
              <span className="text-gray-500">—</span>
              <span className="text-gray-100 font-serif italic"><Highlight text={cardName} query={query} /></span>
              {c.reversed && <em className="text-amber-400 text-xs">{t('history.reversed')}</em>}
            </h4>
            <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={text} query={query} /></p>
          </div>
        );
      })}
    </div>
  );
}

function Block({ color, icon, title, text, query = '' }: { color: 'purple' | 'amber' | 'green'; icon: string; title: string; text: string; query?: string }) {
  const bg = color === 'purple' ? 'bg-purple-950/20 border-purple-800/30' : color === 'amber' ? 'bg-amber-950/20 border-amber-800/30' : 'bg-green-950/20 border-green-800/30';
  const tc = color === 'purple' ? 'text-purple-300' : color === 'amber' ? 'text-amber-300' : 'text-green-300';
  return (
    <div className={`${bg} border rounded-lg p-3`}>
      <h4 className={`${tc} font-semibold text-sm mb-2 flex items-center gap-2`}><span>{icon}</span>{title}</h4>
      <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={text} query={query} /></p>
    </div>
  );
}

// Parsers internes pour TarotView
function parseTarot3Inline(raw: string) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object' && (p.situation || p.defis || p.issue || p.carte1 || p.carte2 || p.carte3)) {
      return { kind: 'tarot3' as const, data: p };
    }
  } catch {}
  return null;
}
function parseTarot5Inline(raw: string) {
  if (!raw) return null;
  try { const p = JSON.parse(raw); if (p.situation || p.defis || p.soutien || p.issue || p.conseil) return p; } catch {}
  return null;
}
