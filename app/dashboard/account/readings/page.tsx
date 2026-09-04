'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { useT } from '@/lib/i18n';
import { PLANET_NAMES, SIGN_NAMES } from '@/app/des-divinatoires/_shared';

const DES_CHOIX_KINDS = ['planet', 'sign', 'house'];

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
  rune:   { key: 'rune',   label: 'Runes',            icon: '/images/runes-icon.png',   color: '#D4B483', bg: 'rgba(138,109,59,0.12)',  border: 'rgba(138,109,59,0.35)',  glow: 'rgba(138,109,59,0.45)' },
  des:    { key: 'des',    label: 'Dés',               icon: '/images/des-zodiaque.png', color: '#7FB3D5', bg: 'rgba(46,134,193,0.12)', border: 'rgba(46,134,193,0.35)', glow: 'rgba(46,134,193,0.5)' },
};

function classifyType(t: string): keyof typeof TYPE_META {
  const s = (t || '').toLowerCase().replace(/[_-]/g, '');
  if (s.includes('yi') || s.includes('jing') || s.includes('yijing')) return 'yijing';
  if (s.includes('rune') || s.includes('futhark')) return 'rune';
  if (s.includes('des') || s.includes('zodiaque') || s.includes('astro') || s.includes('dice')) return 'des';
  return 'tarot'; // tarot, null, et tout le reste
}

// --- Mapping fin (par type stocke) -> libellé précis + groupe ---
const SUBTYPE_META: Record<string, { group: 'tarot' | 'yijing' | 'rune' | 'des'; label: string }> = {
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
  'runes-nornes':        { group: 'rune',   label: 'Le Fil des Nornes' },
  'runes-mjolnir':       { group: 'rune',   label: 'Le Marteau de Mjölnir' },
  'runes-yggdrasil':     { group: 'rune',   label: "Les Racines d'Yggdrasil" },
  'runes':               { group: 'rune',   label: 'Runes' },
  'des-choix':           { group: 'des',    label: 'Le Tirage du Choix' },
  'des-obstacle-solution': { group: 'des',  label: 'Obstacle & Solution' },
  'des-affinage':        { group: 'des',    label: 'Tirage par Affinage' },
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
  { key: 'des',   labelKey: 'history.filter.des',    icon: '/images/des-zodiaque.png', color: '#7FB3D5' },
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

  // ── Partage ──
  const [shareCopied, setShareCopied] = useState<string | null>(null);

  const generateShareText = useCallback((r: Reading): string => {
    const m = metaOf(r);
    const lines: string[] = [];
    const app = '✨ Tarot Divinatoire';

    // En-tête
    lines.push(`📜 ${m.label}`);
    lines.push('');

    // Heure
    const dateStr = new Date(r.createdAt).toLocaleString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    lines.push(`🕐 ${dateStr}`);
    lines.push('');

    // Question
    if (r.question) {
      lines.push(`❓ ${r.question}`);
      lines.push('');
    }

    // Cartes / dés selon le type
    const cards: any[] = Array.isArray(r.cards) ? r.cards : [];

    if (m.group === 'tarot' && cards.length > 0) {
      const isTarot3 = cards.length === 3;
      const pos = isTarot3
        ? ['Passé', 'Présent', 'Futur']
        : ['Situation', 'Défis', 'Soutien', 'Issue', 'Conseil'];
      cards.forEach((c, i) => {
        const name = c.name?.name || c.name || `Carte ${i + 1}`;
        const rev = c.reversed ? ' (renversée)' : '';
        const p = pos[i] || '';
        lines.push(`${p} : ${name}${rev}`);
        // interprétation si disponible
        if (r.interpretation) {
          try {
            const parsed = JSON.parse(r.interpretation);
            // Nouveau format IA : passe/present/avenir ; ancien : carte1/2/3
            const keys = isTarot3 ? ['passe', 'present', 'avenir'] : ['situation', 'defis', 'soutien', 'issue', 'conseil'];
            const fallbackKeys = isTarot3 ? ['carte1', 'carte2', 'carte3'] : keys;
            const k = keys[i] && parsed?.[keys[i]] ? keys[i] : fallbackKeys[i];
            if (parsed?.[k]) lines.push(`   → ${parsed[k].slice(0, 200)}`);
          } catch {}
        }
      });
    } else if (m.group === 'yijing' && cards.length > 0) {
      lines.push(`Hexagramme : ${cards[0]?.name || ''}`);
    } else if (m.group === 'rune') {
      cards.forEach((c, i) => {
        const rev = c.reversed ? ' (renversée)' : '';
        lines.push(`${c.symbol || 'ᚱ'} ${c.position || `Rune ${i + 1}`}${rev} — ${c.name || ''}`);
      });
      // Interprétation structurée
      if (r.interpretation) {
        try {
          const parsed = JSON.parse(r.interpretation);
          // Format nornes complet (versionné) : la synthèse vit sous `fil`.
          const syn = parsed?.synthese || parsed?.fil?.synthese || parsed?.tissage?.synthese;
          if (syn) lines.push(`\n📜 ${String(syn).slice(0, 300)}`);
        } catch {}
      }
    } else if (m.group === 'des') {
      // Format structuré (choix, obstacle-solution)
      if (r.interpretation) {
        try {
          const parsed = JSON.parse(r.interpretation);
          if (parsed?.version === 'des-choix' || parsed?.version === 'des-obstacle-solution') {
            const isObs = parsed.version === 'des-obstacle-solution';
            const labelA = isObs ? '═══ Obstacle ═══' : '═══ Choix 1 ═══';
            const labelB = isObs ? '═══ Solution ═══' : '═══ Choix 2 ═══';
            if (parsed.facesA) {
              lines.push(labelA);
              const pn = PLANET_NAMES[parsed.facesA.planet as string] || parsed.facesA.planet;
              const sn = SIGN_NAMES[parsed.facesA.sign as string] || parsed.facesA.sign;
              lines.push(`${parsed.facesA.planet} ${pn} · ${parsed.facesA.sign} ${sn} · Maison ${parsed.facesA.house}`);
              if (parsed.shortA) lines.push(`→ ${parsed.shortA.slice(0, 300)}`);
              if (parsed.deepA) lines.push(`🔮 Analyse: ${parsed.deepA.replace(/^##.*$/gm,'').slice(0, 200)}...`);
            }
            if (parsed.facesB) {
              lines.push('');
              lines.push(labelB);
              const pn = PLANET_NAMES[parsed.facesB.planet as string] || parsed.facesB.planet;
              const sn = SIGN_NAMES[parsed.facesB.sign as string] || parsed.facesB.sign;
              lines.push(`${parsed.facesB.planet} ${pn} · ${parsed.facesB.sign} ${sn} · Maison ${parsed.facesB.house}`);
              if (parsed.shortB) lines.push(`→ ${parsed.shortB.slice(0, 300)}`);
              if (parsed.deepB) lines.push(`🔮 Analyse: ${parsed.deepB.replace(/^##.*$/gm,'').slice(0, 200)}...`);
            }
          } else {
            // Format simple
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'string' && k !== 'found' && k !== 'static') {
                lines.push(`${k}: ${v.slice(0, 200)}`);
              }
            });
          }
        } catch {
          // Fallback : texte brut
          const t = r.interpretation || '';
          lines.push(t.slice(0, 500));
        }
      }
    }

    // Fallback pour l'interprétation si rien n'a été extrait
    if (lines.length <= 5 && r.interpretation) {
      const t = r.interpretation.replace(/<[^>]*>/g, '').slice(0, 300);
      if (t) lines.push(t);
    }

    // Footer
    lines.push('');
    lines.push(`🔮 ${app}`);

    return lines.join('\n');
  }, []);

  const doShare = useCallback(async (r: Reading) => {
    const text = generateShareText(r);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Tarot Divinatoire', text });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareCopied(r.id);
        setTimeout(() => setShareCopied(null), 2000);
      } catch { /* clipboard denied */ }
    }
  }, [generateShareText]);

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
              const counts: Record<string, number> = { tarot: 0, yijing: 0, rune: 0, des: 0 };
              group.readings.forEach((r) => { counts[metaOf(r).group]++; });

              return (
                <div key={group.dateKey}>
                  {/* En-tête date + suppression par date */}
                  <div className="flex items-center justify-between bg-gray-900/60 border border-amber-800/30 rounded-lg px-3 py-2.5 mb-2 hover:bg-gray-800/50 transition-colors">
                    <button onClick={() => toggleDate(group.dateKey)} className="flex items-center gap-2 text-left flex-1">
                      <span className={`text-amber-400 text-xs transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                      <span className="text-amber-200 font-semibold text-xs" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{group.dateLabel}</span>
                      <span className="flex items-center gap-1.5 text-xs ml-1">
                        {counts.tarot > 0 && <TypeBadge k="tarot" n={counts.tarot} />}
                        {counts.yijing > 0 && <TypeBadge k="yijing" n={counts.yijing} />}
                        {counts.rune > 0 && <TypeBadge k="rune" n={counts.rune} />}
                        {counts.des > 0 && <TypeBadge k="des" n={counts.des} />}
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
                                    {m.icon.startsWith('/') ? (
                                      <img src={m.icon} alt="" className="w-7 h-7 object-contain" style={{ filter: `drop-shadow(0 0 5px ${m.glow})` }} />
                                    ) : (
                                      <span className="text-xl" style={{ filter: `drop-shadow(0 0 6px ${m.glow})` }}>{m.icon}</span>
                                    )}
                                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: m.bg, border: `1px solid ${m.border}` }}>{m.label}</span>
                                    {r.spread && <span className="text-xs text-gray-400 italic ml-2">— {r.spread}</span>}
                                  </span>
                                  <span className="text-gray-400 text-xs">{formatTime(r.createdAt)}</span>
                                </div>
                              </button>
                              <button onClick={() => askDeleteOne(r)}
                                className="mr-2 p-1.5 rounded-md text-red-400/60 hover:text-red-300 hover:bg-red-900/30 transition-all shrink-0"
                                aria-label={t('history.deleteOne')} title={t('history.deleteOne')}>
                                🗑
                              </button>
                              <button onClick={() => doShare(r)}
                                className="mr-2 p-1.5 rounded-md text-blue-400/60 hover:text-blue-300 hover:bg-blue-900/30 transition-all shrink-0 relative"
                                aria-label={t('history.share')} title={t('history.share')}>
                                {shareCopied === r.id ? (
                                  <span className="text-xs font-bold" style={{ color: '#4ade80' }}>{t('history.shareCopied')}</span>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                                    <polyline points="16 6 12 2 8 6"/>
                                    <line x1="12" y1="2" x2="12" y2="15"/>
                                  </svg>
                                )}
                              </button>
                            </div>

                            {openReading === r.id && (
                              <div className="px-4 pb-4 border-t border-amber-800/20 max-h-[60vh] overflow-y-auto">
                                {m.group === 'yijing' ? (
                                  <YiJingView r={r} interp={yiQing} query={search} />
                                ) : m.group === 'rune' ? (
                                  <RuneView r={r} query={search} />
                                ) : m.group === 'des' ? (
                                  <AstroView r={r} query={search} />
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

// ── Rendu markdown simple (## headings, **bold**, *italic*) ──
function renderMd(text: string, query = ''): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={key++} className="text-[10px] font-bold uppercase tracking-wider mt-2 mb-0.5" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#b8944d' }}>{inlineMd(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h4 key={key++} className="text-[10px] font-bold mt-1.5 mb-0.5" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#c49460' }}>{inlineMd(trimmed.slice(2))}</h4>);
    } else if (trimmed) {
      elements.push(<p key={key++} className="mb-0.5 leading-relaxed text-xs" style={{ color: '#ccc' }}>{inlineMd(trimmed)}</p>);
    }
  }
  return elements.length > 0 ? <div className="space-y-1">{elements}</div> : null;
}

// Rendu markdown inline (**bold**, *italic*) - version simple (pas de Highlight)
function inlineMd(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#87CEEB' }}>{part.slice(2, -2)}</strong>;
    }
    const italicParts = part.split(/(\*[^*]+\*)/);
    return italicParts.map((sub, j) => {
      if (sub.startsWith('*') && sub.endsWith('*')) {
        return <em key={`${i}-${j}`} style={{ fontStyle: 'italic', opacity: 0.85 }}>{sub.slice(1, -1)}</em>;
      }
      return sub;
    });
  });
}

// --- Sous-composants ---
function TypeBadge({ k, n }: { k: keyof typeof TYPE_META; n: number }) {
  const m = TYPE_META[k];
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      <img src={m.icon} alt="" className="w-3.5 h-3.5 object-contain" style={{ filter: `drop-shadow(0 0 3px ${m.glow})` }} />
      {n}
    </span>
  );
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
        <Link href="/runes" className="inline-block px-4 py-2 rounded-lg text-amber-200 text-sm hover:opacity-80 transition-all"
          style={{ background: 'rgba(138,109,59,0.2)', border: '1px solid rgba(138,109,59,0.4)', fontFamily: 'var(--font-cinzel), serif' }}>{t('history.doRunes')}</Link>
        <Link href="/des-divinatoires" className="inline-block px-4 py-2 rounded-lg text-blue-300 text-sm hover:opacity-80 transition-all"
          style={{ background: 'rgba(46,134,193,0.2)', border: '1px solid rgba(46,134,193,0.4)', fontFamily: 'var(--font-cinzel), serif' }}>{t('history.doDes')}</Link>
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
      {/* Synthèse globale du tirage (nouveau format IA : resume / ancien : resume) */}
      {(interpData as any).resume && (
        <div className="bg-purple-950/15 border border-purple-800/30 rounded-lg p-3">
          <p className="text-purple-300/80 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.synthesis')}</p>
          <p className="text-gray-100 text-sm leading-relaxed italic"><Highlight text={(interpData as any).resume as string} query={query} /></p>
        </div>
      )}
    </div>
  );
}

// --- Vue détaillée : Runes Scandinaves ---
function RuneView({ r, query = '' }: { r: Reading; query?: string }) {
  const t = useT();
  const cards: any[] = Array.isArray(r.cards) ? r.cards : [];
  // Carte dépliée (accordéon) : une seule ouverte à la fois ; re-tap ferme.
  // Clé = `${groupe}-${index}` pour distinguer les runes des deux blocs.
  const [openCard, setOpenCard] = useState<string | null>(null);
  // Changement de lecture affichée → replier la carte ouverte.
  useEffect(() => setOpenCard(null), [r.id]);

  // Tente une interprétation structurée (JSON de l'API IA)
  let structured: { sections?: any[]; synthese?: string; conseil_action?: string } | null = null;
  let rawInterpretation = '';
  if (r.interpretation) {
    try {
      const parsed = JSON.parse(r.interpretation);
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed.sections || parsed.synthese || parsed.version === 'nornes-full' || parsed.fil || parsed.tissage)
      ) {
        structured = parsed;
      } else {
        rawInterpretation = r.interpretation;
      }
    } catch {
      rawInterpretation = r.interpretation;
    }
  }

  // Normalisation des positions (tirets/dash et apostrophes variantes ignorés).
  const normPos = (s?: string) =>
    (s || '').toLowerCase().replace(/[\u2014\u2013-]/g, '-').replace(/[\u2019']/g, "'").trim();
  const isConseilPos = (s?: string) => normPos(s).includes('conseil');

  // Les tirages nornes COMPLETS (3 Nornes + rune « Conseil d'Odin » du tissage)
  // s'affichent en DEUX blocs distincts :
  //   1. Le Fil des Nornes — 3 runes (analyse IA au tap) + Synthèse + 1er Conseil d'Odin
  //   2. Tisser une nouvelle voie — rune du Conseil (analyse IA au tap) + 2e Conseil d'Odin
  type RunGroup = {
    cards: any[];
    sections: any[];
    synthese?: string;
    conseil_action?: string;
  };
  const parsedAll = structured as (RunGroup & { version?: string; fil?: RunGroup; tissage?: RunGroup }) | null;
  const hasTissage =
    cards.some((c) => isConseilPos(c.position)) ||
    (structured?.sections || []).some((s) => isConseilPos(s.position));

  const groups: RunGroup[] = [];
  if (structured && parsedAll && parsedAll.version === 'nornes-full' && parsedAll.fil && parsedAll.tissage) {
    // Format versionné (nouveaux tirages complets) : blocs déjà séparés.
    groups.push(
      { ...parsedAll.fil, cards: cards.filter((c) => !isConseilPos(c.position)) },
      { ...parsedAll.tissage, cards: cards.filter((c) => isConseilPos(c.position)) },
    );
  } else if (hasTissage) {
    // Tirages complets enregistrés avant le format versionné : on sépare cartes
    // et sections par position (le conseil_action unique est celui du tissage).
    groups.push(
      {
        cards: cards.filter((c) => !isConseilPos(c.position)),
        sections: (structured?.sections || []).filter((s) => !isConseilPos(s.position)),
        synthese: structured?.synthese || '',
      },
      {
        cards: cards.filter((c) => isConseilPos(c.position)),
        sections: (structured?.sections || []).filter((s) => isConseilPos(s.position)),
        conseil_action: structured?.conseil_action || '',
      },
    );
  } else if (structured && ((structured.sections && structured.sections.length > 0) || structured.synthese)) {
    // Tirage simple (3 runes) ou autre : un seul bloc, comme avant.
    groups.push({
      cards,
      sections: structured.sections || [],
      synthese: structured.synthese || '',
      conseil_action: structured.conseil_action || '',
    });
  }
  // Sections d'un groupe sans carte correspondante (sécurité : contenu jamais perdu).
  const orphanSectionsOf = (g: RunGroup) =>
    g.sections.filter(
      (s) =>
        !g.cards.some((c) => {
          const np = normPos(c.position);
          return np !== '' && np === normPos(s.position);
        }),
    );
  // Analyse IA d'une carte = section appariée par position dans son groupe.
  const analysisOf = (g: RunGroup, cardPos?: string) => {
    const np = normPos(cardPos);
    if (!np) return null;
    return g.sections.find((s) => normPos(s.position) === np) || null;
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Petit guide runique */}
      <details className="group text-xs rounded-lg border p-2.5" style={{ borderColor: 'rgba(138,109,59,0.25)', background: 'rgba(40,30,15,0.40)' }}>
        <summary className="cursor-pointer text-xs font-semibold flex items-center gap-2" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
          <span>ᚠ</span> Qu'est-ce que les runes ?
          <span className="ml-auto group-open:rotate-180 transition-transform text-[10px] opacity-60">▼</span>
        </summary>
        <div className="mt-2 text-xs leading-relaxed space-y-1.5" style={{ color: '#c4b998' }}>
          <p>Les runes sont un ancien alphabet divinatoire d'origine nordique et germanique, le <em>Futhark</em>. Chaque rune n'est pas qu'une lettre : elle porte un nom, un sens symbolique et une énergie.</p>
          <p>Dans le <strong>Fil des Nornes</strong>, trois runes sont tirées : <strong>Urd</strong> (Passé), <strong>Verdandi</strong> (Présent), <strong>Skuld</strong> (Avenir). Une 4ᵉ rune peut être ajoutée comme <strong>Conseil d'Odin</strong> pour indiquer une action.</p>
          <p>Une rune <strong>renversée</strong> (retournée) exprime son ombre ou son blocage. L'Oracle IA interprète l'ensemble comme un récit.</p>
        </div>
      </details>

      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">"<Highlight text={r.question || ''} query={query} />"</p>
        </div>
      )}
      {groups.length === 0 && cards.length === 0 ? (
        <p className="text-gray-400 text-xs italic">Tirage sans détail enregistré.</p>
      ) : groups.length > 0 ? (
        groups.map((g, gi) => {
          const isTissage = isConseilPos(g.cards[0]?.position) || (g.sections || []).some((s) => isConseilPos(s.position));
          const orphanSections = orphanSectionsOf(g);
          return (
            <div key={gi} className="space-y-2">
              {/* Titre de bloc (seulement quand il y a fil + tissage) */}
              {groups.length > 1 && (
                <div className="flex items-center gap-3 pt-1.5">
                  <span className="h-px flex-1" style={{ background: 'rgba(212,180,131,0.30)' }} />
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
                    {isTissage ? t('runes.nornes.advice') : t('runes.nornes.title')}
                  </span>
                  <span className="h-px flex-1" style={{ background: 'rgba(212,180,131,0.30)' }} />
                </div>
              )}

              {/* Cartes du groupe — tap : analyse IA de la rune */}
              {g.cards.map((c, i) => {
                const sec = analysisOf(g, c.position);
                const key = `${gi}-${i}`;
                const open = openCard === key;
                const expandable = !!sec;
                return (
                  <div
                    key={key}
                    role={expandable ? 'button' : undefined}
                    tabIndex={expandable ? 0 : undefined}
                    aria-expanded={expandable ? open : undefined}
                    onClick={() => { if (expandable) setOpenCard(open ? null : key); }}
                    onKeyDown={
                      expandable
                        ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenCard(open ? null : key); } }
                        : undefined
                    }
                    className={`border rounded-lg p-3 transition-colors ${expandable ? 'cursor-pointer select-none active:bg-black/10' : ''}`}
                    style={{ borderColor: 'rgba(138,109,59,0.35)', background: 'rgba(138,109,59,0.10)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none shrink-0" style={{ color: '#e9d9ac' }}>{c.symbol || 'ᛟ'}</span>
                      <span className="font-semibold text-sm flex-1" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
                        {c.position || `Rune ${i + 1}`}
                      </span>
                      {c.reversed && <em className="text-amber-400 text-xs shrink-0">— renversée</em>}
                      {expandable && (
                        <span
                          className={`text-[10px] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                          style={{ color: '#D4B483', opacity: 0.6 }}
                        >
                          ▼
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-gray-100 font-serif italic text-sm"><Highlight text={c.name || ''} query={query} /></p>
                    {/* Analyse IA de la rune — révélée uniquement au tap */}
                    {open && sec && (
                      <div className="mt-2.5 border-t pt-2.5 space-y-1.5" style={{ borderColor: 'rgba(138,109,59,0.25)' }}>
                        {sec.sens && (
                          <p className="text-xs italic" style={{ color: '#c4b998' }}>
                            <Highlight text={sec.sens || ''} query={query} />
                          </p>
                        )}
                        {sec.lecture && (
                          <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={sec.lecture || ''} query={query} /></p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Synthèse — uniquement dans le bloc du Fil */}
              {!isTissage && g.synthese && (
                <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
                  <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
                    <span>📜</span>{t('readings.synthese')}
                  </h4>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={g.synthese} query={query} /></p>
                </div>
              )}

              {/* Conseil d'Odin (1er : fil — 2e : tissage) */}
              {g.conseil_action && (
                <div className="rounded-lg p-3" style={{ border: '1px solid rgba(212,180,131,0.45)', background: 'rgba(138,109,59,0.14)' }}>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: '#e9c77b', fontFamily: 'var(--font-cinzel), serif' }}>
                    <span className="text-xs">✦</span>{t('runes.conseilOdin')}
                  </h4>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={g.conseil_action} query={query} /></p>
                </div>
              )}

              {/* Sections du groupe sans carte associée (sécurité : contenu jamais perdu) */}
              {orphanSections.map((s, i) => (
                <div key={`o${i}`} className="border rounded-lg p-3" style={{ borderColor: 'rgba(138,109,59,0.35)', background: 'rgba(52,42,28,0.50)' }}>
                  <h4 className="font-semibold text-xs mb-1.5 flex items-center gap-2" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
                    <span className="text-base">{s.rune}</span>
                    <span>{s.position} — <em className="text-amber-400 not-italic">{s.sens}</em></span>
                  </h4>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={s.lecture} query={query} /></p>
                </div>
              ))}
            </div>
          );
        })
      ) : (
        /* Anciens tirages sans interprétation structurée : cartes seules */
        cards.map((c, i) => (
          <div key={i} className="border rounded-lg p-3" style={{ borderColor: 'rgba(138,109,59,0.35)', background: 'rgba(138,109,59,0.10)' }}>
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: '#D4B483', fontFamily: 'var(--font-cinzel), serif' }}>
              <span className="text-2xl leading-none" style={{ color: '#e9d9ac' }}>{c.symbol || 'ᛟ'}</span>
              <span>{c.position || `Rune ${i + 1}`}</span>
              {c.reversed && <em className="text-amber-400 text-xs">— renversée</em>}
            </h4>
            <p className="text-gray-100 font-serif italic text-sm"><Highlight text={c.name || ''} query={query} /></p>
          </div>
        ))
      )}

      {/* Fallback : interprétation texte brut (anciens tirages) */}
      {!structured && rawInterpretation && (
        <div className="bg-gray-800/40 rounded-lg p-3">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={rawInterpretation} query={query} /></p>
        </div>
      )}
    </div>
  );
}

// --- Vue détaillée : Dés du Zodiaque ---
function AstroView({ r, query = '' }: { r: Reading; query?: string }) {
  const t = useT();
  const cards: any[] = Array.isArray(r.cards) ? r.cards : [];
  const kindLabel: Record<string, string> = {
    planet: t('des.kind.planet'),
    sign: t('des.kind.sign'),
    house: t('des.kind.house'),
  };

  // Tente une interprétation structurée (JSON de l'API astro-dice-interpretation)
  // Format 1 (global) : { planet, sign, house, synthese }
  // Format 2 (sections) : { sections: [{ kind, title, text }], synthese }
  // Format 3 (affinage accumulé) : { static, dbInterpretation, oracleFlash, analysisGlobal, analysisRefine, refine }
  let structured: { sections?: { kind: string; title: string; text: string }[]; synthese?: string } | null = null;
  let rawInterpretation = '';
  // Données accumulées (affinage)
  let interpData: Record<string, any> | null = null;

  if (r.interpretation) {
    try {
      const parsed = JSON.parse(r.interpretation);
      if (parsed && typeof parsed === 'object') {
        // Format des-choix / des-obstacle-solution : version structurée avec 2 jeux de faces
        if ((parsed.version === 'des-choix' || parsed.version === 'des-obstacle-solution') && parsed.facesA && parsed.facesB) {
          // sera géré via cette variable en sortie
          interpData = parsed;
        } else if (parsed.static || parsed.dbInterpretation || parsed.oracleFlash || parsed.analysisGlobal || parsed.refine) {
          interpData = parsed;
          // structured = sections de l'analyse globale (compatibilité AstroView)
          if (parsed.analysisGlobal?.sections) {
            structured = { sections: parsed.analysisGlobal.sections, synthese: parsed.analysisGlobal.synthese };
          }
        } else if (parsed.sections || parsed.synthese) {
          // Format sections
          structured = parsed;
        } else if (parsed.planet || parsed.sign || parsed.house) {
          // Format clés-valeurs (global) → convertir en sections
          const sections: { kind: string; title: string; text: string }[] = [];
          if (parsed.planet) sections.push({ kind: 'planet', title: kindLabel['planet'] || 'Planète', text: parsed.planet });
          if (parsed.sign)   sections.push({ kind: 'sign',   title: kindLabel['sign'] || 'Signe',     text: parsed.sign });
          if (parsed.house)  sections.push({ kind: 'house',  title: kindLabel['house'] || 'Maison',   text: parsed.house });
          structured = { sections, synthese: parsed.synthese || '' };
        } else {
          rawInterpretation = r.interpretation;
        }
      } else {
        rawInterpretation = r.interpretation;
      }
    } catch {
      rawInterpretation = r.interpretation;
    }
  }

  // Helper pour rendre des sections d'analyse
  const renderSections = (sections: { key?: string; label?: string; text?: string }[], synthese?: string, title?: string) => (
    <div className="space-y-2 mt-3">
      {title && (
        <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{title}</h4>
      )}
      {sections.map((s, i) => (
        <div key={i} className="border rounded-lg p-3" style={{ borderColor: 'rgba(46,134,193,0.35)', background: 'rgba(15,45,65,0.40)' }}>
          {s.label && (
            <h4 className="font-semibold text-xs mb-1" style={{ color: '#7FB3D5', fontFamily: 'var(--font-cinzel), serif' }}>{s.label}</h4>
          )}
          <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={s.text || ''} query={query} /></p>
        </div>
      ))}
      {synthese && (
        <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
          <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
            <span>📜</span>Synthèse
          </h4>
          <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={synthese} query={query} /></p>
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 space-y-3">
      {r.question && (
        <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3 text-center">
          <p className="text-amber-500/70 text-[10px] uppercase tracking-wide mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.yourQuestion')}</p>
          <p className="text-amber-200 italic text-sm">"<Highlight text={r.question || ''} query={query} />"</p>
        </div>
      )}

      {/* Cartes (dés) — masquées pour des-choix (affichées inline ci-dessous) */}
      {interpData?.version === 'des-choix' || interpData?.version === 'des-obstacle-solution' ? null : cards.length === 0 ? (
        <p className="text-gray-400 text-xs italic">Tirage sans détail enregistré.</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 3)}, minmax(0, 1fr))` }}>
          {cards.map((c, i) => (
            <div key={i} className="flex flex-col items-center rounded-xl p-3 text-center" style={{ background: 'rgba(46,134,193,0.10)', border: '1px solid rgba(46,134,193,0.35)' }}>
              <div className="text-3xl leading-none" style={{ color: '#7FB3D5' }}>{c.value}</div>
              <div className="mt-1.5 text-[10px] uppercase tracking-widest" style={{ color: '#cfe3f5', opacity: 0.7 }}>{kindLabel[c.kind] || c.kind}</div>
              <p className="mt-1.5 text-sm font-semibold leading-snug" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#cfe3f5' }}>{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Format des-choix / des-obstacle-solution : 2 sections avec tuiles inline ── */}
      {(interpData?.version === 'des-choix' || interpData?.version === 'des-obstacle-solution') && (() => {
        const isObstacle = interpData.version === 'des-obstacle-solution';
        const labelA = isObstacle ? '═══ Obstacle ═══' : '═══ Premier Choix ═══';
        const labelB = isObstacle ? '═══ Solution ═══' : '═══ Second Choix ═══';
        const colorA = isObstacle ? '#D4A574' : '#7FB3D5';
        const colorB = isObstacle ? '#87CEEB' : '#7FB3D5';
        const facesA = interpData.facesA as Record<string, any>;
        const facesB = interpData.facesB as Record<string, any>;
        const cardA = DES_CHOIX_KINDS.map(k => ({ kind: k, value: facesA[k], label: k === 'planet' ? PLANET_NAMES[facesA[k] as string] : k === 'sign' ? SIGN_NAMES[facesA[k] as string] : `Maison ${facesA[k]}` }));
        const cardB = DES_CHOIX_KINDS.map(k => ({ kind: k, value: facesB[k], label: k === 'planet' ? PLANET_NAMES[facesB[k] as string] : k === 'sign' ? SIGN_NAMES[facesB[k] as string] : `Maison ${facesB[k]}` }));
        const renderDiceGrid = (items: any[]) => (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))` }}>
            {items.map((c, i) => (
              <div key={i} className="flex flex-col items-center rounded-xl p-3 text-center" style={{ background: 'rgba(46,134,193,0.10)', border: '1px solid rgba(46,134,193,0.35)' }}>
                <div className="text-3xl leading-none" style={{ color: '#7FB3D5' }}>{c.value}</div>
                <div className="mt-1.5 text-[10px] uppercase tracking-widest" style={{ color: '#cfe3f5', opacity: 0.7 }}>{kindLabel[c.kind] || c.kind}</div>
                <p className="mt-1.5 text-sm font-semibold leading-snug" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#cfe3f5' }}>{c.label}</p>
              </div>
            ))}
          </div>
        );
        return (
          <>
            {/* Bloc A */}
            <div className="rounded-2xl p-4" style={{ background: isObstacle ? 'rgba(139,0,0,0.06)' : 'rgba(46,134,193,0.06)', border: isObstacle ? '1px solid rgba(139,0,0,0.3)' : '1px solid rgba(46,134,193,0.25)' }}>
              <h4 className="text-center text-base font-bold mb-3" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: colorA }}>
                {labelA}
              </h4>
              {renderDiceGrid(cardA)}
              {interpData.shortA && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cinzel), serif' }}>【Interprétation combinée】</h5>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={interpData.shortA} query={query} /></p>
                </div>
              )}
              {interpData.deepA && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#c4a0e0', fontFamily: 'var(--font-cinzel), serif' }}>【Analyse approfondie Oracle】</h5>
                  {renderMd(interpData.deepA)}
                </div>
              )}
            </div>

            {/* Bloc B */}
            <div className="rounded-2xl p-4" style={{ background: isObstacle ? 'rgba(46,134,193,0.12)' : 'rgba(46,134,193,0.06)', border: isObstacle ? '1px solid rgba(46,134,193,0.35)' : '1px solid rgba(46,134,193,0.25)' }}>
              <h4 className="text-center text-base font-bold mb-3" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: colorB }}>
                {labelB}
              </h4>
              {renderDiceGrid(cardB)}
              {interpData.shortB && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cinzel), serif' }}>【Interprétation combinée】</h5>
                  <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={interpData.shortB} query={query} /></p>
                </div>
              )}
              {interpData.deepB && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold mb-1" style={{ color: '#c4a0e0', fontFamily: 'var(--font-cinzel), serif' }}>【Analyse approfondie Oracle】</h5>
                  {renderMd(interpData.deepB)}
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* ── Format accumulé (affinage) ── */}
      {interpData && (
        <>
          {/* Interprétation statique */}
          {interpData.static && (
            <div className="bg-gray-800/40 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>Signification</h4>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={interpData.static} query={query} /></p>
            </div>
          )}

          {/* Oracle flash */}
          {interpData.oracleFlash && (
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
              <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>🔮</span>Oracle du tirage
              </h4>
              <p className="text-gray-200 text-sm italic leading-relaxed">« <Highlight text={interpData.oracleFlash} query={query} /> »</p>
            </div>
          )}

          {/* Interprétation combinée (DB) */}
          {interpData.dbInterpretation && (
            <div className="bg-amber-950/15 border border-amber-700/30 rounded-lg p-3">
              <h4 className="text-amber-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>📖</span>Interprétation combinée
              </h4>
              <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={interpData.dbInterpretation} query={query} /></p>
            </div>
          )}

          {/* Comparaison affinage */}
          {interpData.refine && (
            <div className="bg-blue-950/20 border border-blue-800/30 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>🔎</span>
                Affinage {interpData.refine.option === 'action' ? 'du Signe' : 'de la Maison'}
              </h4>
              {interpData.refine.originalFaces && (
                <p className="text-gray-400 text-xs italic mb-2">
                  Valeur initiale : {interpData.refine.option === 'action'
                    ? `${interpData.refine.originalFaces.sign} → ${cards.find((c: any) => c.kind === 'sign')?.value || '?'}`
                    : `Maison ${interpData.refine.originalFaces.house} → ${cards.find((c: any) => c.kind === 'house')?.value || '?'}`}
                </p>
              )}
            </div>
          )}

          {/* Analyse LLM globale */}
          {interpData.analysisGlobal && renderSections(
            interpData.analysisGlobal.sections || [],
            interpData.analysisGlobal.synthese || '',
            'Analyse complète'
          )}

          {/* Analyse LLM d'affinage */}
          {interpData.analysisRefine && renderSections(
            interpData.analysisRefine.sections || [],
            interpData.analysisRefine.synthese || '',
            'Analyse affinée'
          )}

          {/* Analyse LLM en texte brut (non structurée) */}
          {interpData.analysisGlobal?.texte && !interpData.analysisGlobal?.sections && (
            <div className="bg-gray-800/40 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>Analyse complète</h4>
              <p className="text-gray-300 text-sm leading-relaxed"><Highlight text={interpData.analysisGlobal.texte} query={query} /></p>
            </div>
          )}
          {interpData.analysisRefine?.texte && !interpData.analysisRefine?.sections && (
            <div className="bg-gray-800/40 rounded-lg p-3">
              <h4 className="text-blue-300 font-semibold text-xs mb-1" style={{ fontFamily: 'var(--font-cinzel), serif' }}>Analyse affinée</h4>
              <p className="text-gray-300 text-sm leading-relaxed"><Highlight text={interpData.analysisRefine.texte} query={query} /></p>
            </div>
          )}
        </>
      )}

      {/* Ancien format structuré (sans accumulateur) */}
      {!interpData && structured && (
        <div className="space-y-2 mt-3">
          {structured.synthese && (
            <div className="bg-purple-950/20 border border-purple-800/30 rounded-lg p-3">
              <h4 className="text-purple-300 font-semibold text-sm mb-1 flex items-center gap-2">
                <span>📜</span>{t('readings.synthese')}
              </h4>
              <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={structured.synthese} query={query} /></p>
            </div>
          )}
          {structured.sections?.map((s, i) => (
            <div key={i} className="border rounded-lg p-3" style={{ borderColor: 'rgba(46,134,193,0.35)', background: 'rgba(15,45,65,0.40)' }}>
              <h4 className="font-semibold text-xs mb-1" style={{ color: '#7FB3D5', fontFamily: 'var(--font-cinzel), serif' }}>{s.title || s.kind}</h4>
              <p className="text-gray-200 text-sm leading-relaxed"><Highlight text={s.text} query={query} /></p>
            </div>
          ))}
        </div>
      )}

      {/* Fallback : interprétation texte brut (anciens tirages) */}
      {!interpData && !structured && rawInterpretation && (
        <div className="bg-gray-800/40 rounded-lg p-3">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"><Highlight text={rawInterpretation} query={query} /></p>
        </div>
      )}
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
    // Nouveau format IA (passe/present/avenir/resume) → normalisé vers les
    // clés de position canoniques (situation/defis/issue) utilisées par TarotView.
    if (p && typeof p === 'object' && (p.passe !== undefined || p.present !== undefined || p.avenir !== undefined)) {
      return {
        kind: 'tarot3' as const,
        data: {
          situation: p.passe,
          defis: p.present,
          issue: p.avenir,
          resume: p.resume,
          ...p,
        },
      };
    }
  } catch {}
  return null;
}
function parseTarot5Inline(raw: string) {
  if (!raw) return null;
  try { const p = JSON.parse(raw); if (p.situation || p.defis || p.soutien || p.issue || p.conseil) return p; } catch {}
  return null;
}
