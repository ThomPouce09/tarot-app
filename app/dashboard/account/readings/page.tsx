'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { useT, useLang, pick4, tr } from '@/lib/i18n';
import { localizePosition } from '@/lib/i18n/positions';
import { PLANET_NAMES, SIGN_NAMES } from '@/app/des-divinatoires/_shared';
import SpaceTitle from '@/components/space-title';

// Donnees + helpers durables (etape 1 du decoupage).
import { TYPE_META, metaOf, loc, typeLabelOf, FILTERS, type Reading } from './readings-data';

// Primitives visuelles (etape 2 du decoupage).
import { ChevronIcon, TrashIcon, ShareIcon, EchoDot, ReadingThumbs } from './readings-parts';

// Vues de rendu par univers (etape 3 du decoupage).
import { EmptyState, DoubleHexView, YiJingView, WheelView, TarotView, RuneView, AstroView } from './readings-views';

export default function ReadingsPage() {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
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
      const dateKey = d.toLocaleDateString(loc(lang), { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(r);
    });
    // dateKey trié du plus récent au plus ancien (basé sur createdAt réel)
    const groups = Array.from(map.entries()).map(([dateKey, reads]) => ({ dateKey, dateLabel: dateKey, readings: reads }));
    groups.sort((a, b) => new Date(b.readings[0].createdAt).getTime() - new Date(a.readings[0].createdAt).getTime());
    return groups;
  }, [filtered, lang]);

  // Ouvrir la première date au chargement
  useEffect(() => {
    if (groupedByDate.length > 0 && !hasInitialized) {
      setOpenDates(new Set([groupedByDate[0].dateKey]));
      setHasInitialized(true);
    }
  }, [groupedByDate, hasInitialized]);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(loc(lang), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    } catch { return ''; }
  };
  const dateToYMD = (iso: string) => new Date(iso).toISOString().slice(0, 10);

  // ── Partage ──
  const [shareCopied, setShareCopied] = useState<string | null>(null);

  const generateShareText = useCallback((r: Reading): string => {
    const m = metaOf(r);
    const lines: string[] = [];
    const app = t('brand.name');

    // Interprétation JSON (null si texte brut)
    let interp: any = null;
    if (r.interpretation) {
      try { interp = JSON.parse(r.interpretation); } catch { interp = null; }
    }
    // Rendu lisible d'une valeur d'interprétation (objet → "clé : valeur")
    const flat = (v: any): string => {
      if (typeof v === 'string') return v.trim();
      if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k} : ${flat(x)}`).join('\n');
      return v == null ? '' : String(v);
    };

    // En-tête
    lines.push(`📜 ${m.label}`);
    lines.push('');

    // Date
    const dateStr = new Date(r.createdAt).toLocaleString(loc(lang), {
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

    const cards: any[] = Array.isArray(r.cards) ? r.cards : [];
    // Nom de carte tarot : objet {name}, objet {name:{name}}, ou ID numérique brut.
    const cardName = (c: any, i: number) =>
      (typeof c === 'number' ? TAROT_CARDS.find((k) => k.id === c)?.name
        : (typeof c?.name === 'string' ? c.name : c?.name?.name)
        ?? (typeof c?.id === 'number' ? TAROT_CARDS.find((k) => k.id === c.id)?.name : undefined))
      || `Carte ${i + 1}`;

    if (m.group === 'tarot') {
      const pos = cards.length === 3
        ? [t('history.pos.past'), t('history.pos.present'), t('history.pos.future')]
        : [t('history.block.situation'), t('history.block.defis'), t('history.block.soutien'), t('history.block.issue'), t('history.block.conseil')];
      const keys = cards.length === 3
        ? ['passe', 'present', 'avenir']
        : ['situation', 'defis', 'soutien', 'issue', 'conseil'];
      cards.forEach((c, i) => {
        lines.push(`${pos[i] || `${t('history.card')} ${i + 1}`} : ${cardName(c, i)}${c.reversed ? ` ${t('history.reversed')}` : ''}`);
        const txt = interp?.[keys[i]] || interp?.[`carte${i + 1}`];
        if (txt) lines.push(`→ ${flat(txt)}`);
        lines.push('');
      });
      if (interp?.resume) { lines.push(`🌟 ${pick4('Résumé', 'Summary', 'Resumen', 'सारांश')(lang)} : ${flat(interp.resume)}`); lines.push(''); }
    } else if (m.group === 'rune') {
      // Sections IA appariées par position (formats nornes2 et nornes versionné)
      const sections: any[] = interp?.sections || interp?.fil?.sections || [];
      const norm = (s: any) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
      cards.forEach((c, i) => {
        lines.push(`${c.symbol || 'ᚱ'} ${localizePosition(c.position) || `Rune ${i + 1}`}${c.reversed ? tr('(renversée)', '(reversed)', '(invertida)', '(उल्टी)') : ''} — ${c.name || ''}`);
        const sec = sections.find((s) => norm(s.position) === norm(c.position));
        if (sec?.lecture) lines.push(`→ ${flat(sec.lecture)}`);
        lines.push('');
      });
      // Blocs synthèse / conseil (fil + tissage pour le format versionné)
      const blocks = interp?.version ? [interp.fil, interp.tissage] : [interp];
      blocks.forEach((b) => {
        if (!b) return;
        if (b.synthese) { lines.push(`📜 ${flat(b.synthese)}`); lines.push(''); }
        if (b.conseil_action) { lines.push(`⚡ ${flat(b.conseil_action)}`); lines.push(''); }
      });
    } else if (m.group === 'yijing') {
      // Clés de structure (situation…conseil ou meditation/conseil/attitude) + résumé
      const LABELS: Record<string, string> = {
        situation: t('history.block.situation'), defis: t('history.block.defis'), soutien: t('history.block.soutien'), issue: t('history.block.issue'),
        conseil: t('history.block.conseil'), resume: t('history.synthesis'), meditation: t('history.block.meditation'), attitude: t('history.block.attitude'),
      };
      const seen = new Set<string>();
      Object.entries(interp || {}).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) {
          lines.push(`${LABELS[k] || k} : ${v.trim()}`);
          lines.push('');
          seen.add(k);
        }
      });
      if (seen.size === 0 && r.interpretation) {
        lines.push(r.interpretation.replace(/<[^>]*>/g, '').trim());
        lines.push('');
      }
    } else if (m.group === 'des') {
      if (interp?.facesA || interp?.facesB) {
        // Format choix / obstacle-solution
        const isObs = interp.version === 'des-obstacle-solution';
        (['A', 'B'] as const).forEach((sfx, i) => {
          const f = interp[`faces${sfx}`];
          if (!f) return;
          lines.push(`═══ ${isObs ? (i === 0 ? t('history.block.obstacle') : t('history.block.solution')) : `${pick4('Choix', 'Choice', 'Elección', 'चयन')(lang)} ${i + 1}`} ═══`);
          const pn = PLANET_NAMES[f.planet as string] || f.planet;
          const sn = SIGN_NAMES[f.sign as string] || f.sign;
          lines.push(`${f.planet} ${pn} · ${f.sign} ${sn} · ${t('history.house')} ${f.house}`);
          if (interp[`short${sfx}`]) lines.push(`→ ${flat(interp[`short${sfx}`])}`);
          if (interp[`deep${sfx}`]) lines.push(flat(interp[`deep${sfx}`]).replace(/^##.*$/gm, '').trim());
          lines.push('');
        });
      } else if (interp?.cards || interp?.oracleFlash) {
        // Format affinement : dés lancés + lecture
        if (Array.isArray(interp.cards) && interp.cards.length) {
          lines.push(`🎲 ${interp.cards.map((d: any) => d.label || d.value).join(' · ')}`);
          lines.push('');
        }
        ['static', 'dbInterpretation', 'oracleFlash', 'analysisGlobal'].forEach((k) => {
          const t = flat(interp[k]);
          if (t) { lines.push(t); lines.push(''); }
        });
      } else if (r.interpretation) {
        lines.push(r.interpretation.replace(/<[^>]*>/g, '').trim());
        lines.push('');
      }
    }

    // Echo
    if (r.echo) {
      lines.push(`🕯️ ${pick4('Augure', 'Augury', 'Augurio', 'शकुन')(lang)} — ${new Date(r.echo.dueAt).toLocaleDateString(loc(lang), { day: '2-digit', month: 'long', year: 'numeric' })} :`);
      lines.push(r.echo.verdict ? r.echo.verdict.trim() : t('history.sealed'));
      lines.push('');
    }

    // Footer
    lines.push(`🔮 ${app}`);

    return lines.join('\n');
  }, [lang, t]);

  // Copie dans le presse-papiers avec fallback legacy (contexte non sécurisé / clipboard refusé)
  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* essayer le fallback */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }, []);

  const doShare = useCallback(async (r: Reading) => {
    const text = generateShareText(r);
    // Partage natif (mobile) : s'il échoue (desktop sans cible, permission refusée),
    // on retombe sur la copie presse-papiers au lieu de ne rien faire.
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title: t('brand.name'), text });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // l'utilisateur a annulé volontairement
        // sinon : fallback copie ci-dessous
      }
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setShareCopied(r.id);
      setTimeout(() => setShareCopied(null), 2000);
    }
  }, [generateShareText, copyToClipboard, t]);

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
    setConfirm({ mode: 'one', id: r.id, label: `${typeLabelOf(r, lang)} ${pick4('du', 'of', 'del', '—')(lang)} ${formatTime(r.createdAt)}` });
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
      else body.date = dateToYMD(readings.find((r) => new Date(r.createdAt).toLocaleDateString(loc(lang), { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }) === confirm.dateKey)!.createdAt);

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
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <p className="text-amber-300 animate-pulse text-lg" style={{ fontFamily: 'var(--font-cinzel), serif' }}>{t('history.loading')}</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Croix retour accueil retirée : le rond avatar du layout mène à Mon espace */}

      <div className="max-w-2xl mx-auto pb-24">
        {/* Bandeau du titre : un seul dégradé continu qui remonte sous la têtière et fond dans le ciel cosmique */}
        <SpaceTitle img="/images/nav-historique.png" title={t('history.title')} subtitle={t('history.subtitle')} />

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
              className="w-full pl-10 pr-4 py-2.5 rounded-full border focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60 transition-all placeholder:text-amber-200/40"
              style={{
                background: 'rgba(38,20,70,0.55)',
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

        {/* Filtres par type (icônes landing) — compacts */}
        {readings.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: active ? '#1a0e0a' : f.color,
                    background: active ? f.color : 'rgba(38,20,70,0.5)',
                    borderColor: f.color,
                    boxShadow: active ? `0 0 10px ${f.color}` : 'none',
                    opacity: active ? 1 : 0.8,
                  }}
                >
                  <img src={f.icon} alt="" className="w-3.5 h-3.5 object-contain" style={{ filter: `drop-shadow(0 0 3px ${f.color})` }} />
                  <span className="text-[10px] font-semibold">{t(f.labelKey)}</span>
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
                  {/* En-tête date rituel : filet doré + libellé Cinzel + compteurs points */}
                  <div className="flex items-center gap-2 mb-1.5 group/head">
                    <button onClick={() => toggleDate(group.dateKey)} className="flex items-center gap-2 flex-1 min-w-0 text-left" aria-expanded={isOpen}>
                      <ChevronIcon size={13} className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} style={{ color: 'rgba(218,165,32,0.7)' }} />
                      <span className="h-px flex-1 min-w-4" style={{ background: 'linear-gradient(90deg, transparent, rgba(218,165,32,0.45))' }} />
                      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] px-1" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#F8E3A0', textShadow: '0 0 12px rgba(248,227,160,0.45)' }}>
                        {group.dateLabel}
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        {(['tarot', 'yijing', 'rune', 'des'] as const).map((k) => counts[k] > 0 && (
                          <span key={k} className="flex items-center gap-0.5 text-[10px]" style={{ color: TYPE_META[k].color, opacity: 0.9 }}>
                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: TYPE_META[k].color, boxShadow: `0 0 5px ${TYPE_META[k].glow}` }} />
                            {counts[k]}
                          </span>
                        ))}
                      </span>
                      <span className="h-px flex-1 min-w-4" style={{ background: 'linear-gradient(90deg, rgba(218,165,32,0.45), transparent)' }} />
                    </button>
                    <button onClick={() => askDeleteDate(group)}
                      className="shrink-0 p-1.5 rounded-md transition-all opacity-70 hover:opacity-100"
                      style={{ color: '#ff5252' }}
                      aria-label={t('history.deleteDate')} title={t('history.deleteDate')}>
                      <TrashIcon size={14} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="space-y-1.5 pl-1">
                      {group.readings.map((r) => {
                        const m = metaOf(r);
                        const yiQing = parseYiQing(r.interpretation || '');
                        // Le spread n'est affiché que s'il apporte une info (évite le doublon avec le libellé).
                        const spreadInfo = r.spread && !m.label.toLowerCase().includes(r.spread.toLowerCase().replace(/[-—–]/g, ' ').trim()) && !r.spread.toLowerCase().includes(m.label.toLowerCase()) ? r.spread : '';
                        const hasThumbs = Array.isArray(r.cards) && r.cards.length > 0;
                        return (
                          <div key={r.id} className="rounded-xl overflow-hidden transition-shadow" style={{ background: 'linear-gradient(180deg, rgba(58,34,102,0.72) 0%, rgba(34,19,64,0.78) 100%)', backdropFilter: 'blur(8px)', border: `1px solid ${m.border}`, boxShadow: openReading === r.id ? `0 0 22px ${m.glow}, 0 4px 14px rgba(0,0,0,0.35)` : '0 2px 10px rgba(0,0,0,0.28)' }}>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleReading(r.id)} className="flex-1 min-w-0 flex items-center gap-2.5 p-2.5 text-left hover:bg-white/[0.03] transition-colors">
                                {/* Aperçu visuel du tirage (ou icône de type si pas de cartes) */}
                                {hasThumbs ? (
                                  <ReadingThumbs r={r} />
                                ) : (
                                  <img src={m.icon} alt="" className="w-7 h-7 shrink-0 object-contain" style={{ filter: `drop-shadow(0 0 5px ${m.glow})` }} />
                                )}
                                {/* Hiérarchie 2 niveaux : libellé doré fort, méta discrète */}
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-semibold truncate" style={{ color: m.color, fontFamily: 'var(--font-cinzel), serif' }}>{typeLabelOf(r, lang)}</span>
                                    {r.echo && <EchoDot echo={r.echo} t={t} />}
                                  </span>
                                  {spreadInfo && (
                                    <span className="block text-[10px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{spreadInfo}</span>
                                  )}
                                </span>
                                <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatTime(r.createdAt)}</span>
                              </button>
                              {/* Actions discrètes : partage puis suppression */}
                              <button onClick={() => doShare(r)}
                                className="shrink-0 p-1.5 rounded-md transition-all opacity-40 hover:opacity-100 relative"
                                style={{ color: '#4db8c4' }}
                                aria-label={t('history.share')} title={t('history.share')}>
                                {shareCopied === r.id ? (
                                  <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: '#4ade80' }}>{t('history.shareCopied')}</span>
                                ) : (
                                  <ShareIcon size={14} />
                                )}
                              </button>
                              <button onClick={() => askDeleteOne(r)}
                                className="shrink-0 mr-1.5 p-1.5 rounded-md transition-all opacity-70 hover:opacity-100"
                                style={{ color: '#ff5252' }}
                                aria-label={t('history.deleteOne')} title={t('history.deleteOne')}>
                                <TrashIcon size={14} />
                              </button>
                            </div>

                            {openReading === r.id && (
                              <div className="px-4 pb-4 border-t border-amber-800/20 max-h-[60vh] overflow-y-auto">
                                {r.type === 'yi-jing-double' ? (
                                  <DoubleHexView r={r} />
                                ) : m.group === 'yijing' ? (
                                  <YiJingView r={r} interp={yiQing} query={search} />
                                ) : m.group === 'rune' ? (
                                  <RuneView r={r} query={search} />
                                ) : m.group === 'des' ? (
                                  <AstroView r={r} query={search} />
                                ) : r.type === 'tarot-semaine' ? (
                                  <WheelView r={r} />
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
          <div className="relative z-10 w-full max-w-sm p-6 rounded-2xl" style={{ background: 'rgba(46,26,82,0.96)', border: '1px solid rgba(218,165,32,0.3)', boxShadow: '0 0 40px rgba(218,165,32,0.2)' }}>
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

