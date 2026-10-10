'use client';

// app/dashboard/account/echoes/page.tsx
// Les Augures des Etoiles — registre de toutes les prémonctions scellées
// (tarot, Yi Jing, runes, dés). Réservé aux Arkanes (étape 10) ; les autres
// niveaux voient un vérouillage doux vers l'abonnement.
//
// Layout « salle du grimoire » :
//  - bandeau collant : rappel du cycle + recherche + onglets + filtres domaine ;
//  - vedette « À briser » : les augures échus en cartes magnifiées (or pulsant,
//    sceau qui se fendille au survol, son magique au bris) — visibles sans scroller ;
//  - le reste en lignes compactes groupées par mois (repliables) : 6× moins de scroll ;
//  - modale détail : texte intégral, verdict, relire le tirage associé, partager ;
// Gating : registre consultable par Initié et Arkane ; Apprenti = vitrine verrouillée.
//  - mode « Gérer » : sélection multiple + suppression en lot (DELETE /api/echo).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, useT, tr, type Lang } from '@/lib/i18n';
import { pickEchoText } from '@/lib/i18n/echo-text';
import SpaceTitle from '@/components/space-title';
import { useEntitlement } from '@/lib/use-entitlement';
import { RuneButton } from '@/app/runes/_shared';
import { playRandom } from '@/lib/sounds';
import { api } from '@/lib/api-client';
import type { EchoData } from '@/components/echo-box';
// Réutilisation des primitives de l'historique : la modale montre le tirage
// d'origine tel qu'il apparaît dans /readings (mêmes vignettes, mêmes libellés).
import { TYPE_META, metaOf, typeLabelOf } from '../readings/readings-data';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { ReadingThumb, ShareIcon } from '../readings/readings-parts';
import { DoubleHexView, YiJingView, WheelView, TarotView, RuneView, AstroView } from '../readings/readings-views';

// Surbrillance des mots-clés de la recherche dans les textes affichés
// (même style doré que Highlight dans /readings, mais par mot : la recherche
// matche chaque mot séparément, le surlignage doit suivre).
function MarkWords({ text, q }: { text: string; q: string }) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length || !text) return <>{text}</>;
  const lower = text.toLowerCase();
  const marks = new Set<number>();
  for (const w of words) {
    let idx = lower.indexOf(w);
    while (idx !== -1) {
      for (let k = idx; k < idx + w.length; k++) marks.add(k);
      idx = lower.indexOf(w, idx + w.length);
    }
  }
  const parts: (string | JSX.Element)[] = [];
  let run = '';
  let runStart = -1;
  const flush = (end: number) => {
    if (runStart === -1) return;
    parts.push(
      <mark key={runStart} className="rounded px-0.5 font-semibold" style={{
        background: 'rgba(255, 215, 0, 0.18)', color: '#FFE9A8',
        textShadow: '0 0 16px rgba(255, 215, 0, 1), 0 0 28px rgba(255, 215, 0, 0.6)',
        boxShadow: '0 0 10px rgba(255, 215, 0, 0.45)',
      }}>{text.slice(runStart, end)}</mark>
    );
    runStart = -1; run = '';
  };
  for (let i = 0; i < text.length; i++) {
    if (marks.has(i)) { if (runStart === -1) runStart = i; run += text[i]; }
    else { flush(i); parts.push(text[i]); }
  }
  flush(text.length);
  return <>{parts}</>;
}

function readEmail(): string {
  try {
    return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || '';
  } catch {
    return '';
  }
}

const DOMAIN_ICON: Record<string, string> = {
  tarot: '/images/tarot-icon.png',
  'yi-jing': '/images/yi-jing-icon.png',
  runes: '/images/runes-icon.png',
  des: '/images/des-zodiaque.png',
};
// Couleurs validées dans /readings (TYPE_META/FILTERS) : parité visuelle stricte.
const DOMAIN_COLOR: Record<string, string> = {
  tarot: '#FFD700',
  'yi-jing': '#F0463C',
  runes: '#3CB371',
  des: '#3D9BE9',
};
const DOMAINS = ['tarot', 'yi-jing', 'runes', 'des'] as const;

function fmtDate(iso: string, lang: string): string {
  const loc = ({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' } as Record<string, string>)[lang] ?? 'fr-FR';
  return new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShort(iso: string, lang: string): string {
  const loc = ({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' } as Record<string, string>)[lang] ?? 'fr-FR';
  return new Date(iso).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}
// Clé de mois (tri + groupement), dans la langue courante.
function monthKey(iso: string, lang: string): string {
  const loc = ({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' } as Record<string, string>)[lang] ?? 'fr-FR';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(iso: string, lang: string): string {
  const loc = ({ fr: 'fr-FR', en: 'en-GB', es: 'es-ES', hi: 'hi-IN' } as Record<string, string>)[lang] ?? 'fr-FR';
  return new Date(iso).toLocaleDateString(loc, { month: 'long', year: 'numeric' });
}
function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

type Tab = 'due' | 'sealed' | 'closed';

export default function AuguresPage() {
  const t = useT();
  const lang = useLang();
  const { sub, loaded, reload: reloadSub } = useEntitlement();
  const [echoes, setEchoes] = useState<EchoData[] | null>(null);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // ── UI state ──
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('due');
  const [domFilter, setDomFilter] = useState<Set<string>>(new Set());
  const [manage, setManage] = useState(false);
  // Appui long (500 ms) sur une ligne ou une carte = enclenche la sélection
  // multiple et pré-sélectionne l'augure touché. Le clic qui suit est avalé
  // (pressFired) pour ne pas ouvrir la modale.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressFired = useRef(false);
  const clearPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);
  const startPress = useCallback((id: string) => {
    pressFired.current = false;
    clearPress();
    pressTimer.current = setTimeout(() => {
      pressFired.current = true;
      setManage(true);
      setSelected((prev) => new Set(prev).add(id));
      try { if (navigator.vibrate) navigator.vibrate(30); } catch { /* non supporté */ }
    }, 500);
  }, [clearPress]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[] } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shareCopied, setShareCopied] = useState<string | null>(null);
  // Tirages du compte (pour afficher le tirage d'origine dans la modale augure).
  const [readingsList, setReadingsList] = useState<any[] | null>(null);
  const [readingExpanded, setReadingExpanded] = useState(false);

  const email = typeof window !== 'undefined' ? readEmail() : '';
  const level = sub?.level;
  // Registre consultable dès le rang d'Initié ; l'Arkane reste illimité (cap serveur).
  const canSee = level === 'initie' || level === 'arkane';

  useEffect(() => {
    if (!email || !canSee) return;
    api(`/api/echo?userId=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => setEchoes(d.echoes || []))
      .catch(() => setEchoes([]));
    // Tirages du compte : la modale d'un augure affiche son tirage d'origine
    // (mêmes vignettes que /readings). Un seul fetch, monté une fois.
    api(`/api/readings?userId=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => setReadingsList(Array.isArray(d?.readings) ? d.readings : []))
      .catch(() => setReadingsList([]));
  }, [email, canSee]);

  // Lien profond depuis /readings (« relire l'augure de ce tirage ») : ?open=<echoId>.
  // window.location plutôt que useSearchParams (pas de Suspense requis au build).
  useEffect(() => {
    const open = new URLSearchParams(window.location.search).get('open');
    if (open && echoes) {
      const hit = echoes.find((e) => e.id === open);
      if (hit) {
        setOpenId(hit.id);
        setTab(hit.verdict ? 'closed' : e2tab(hit));
      }
    }
  }, [echoes]);

  // Onglet d'atterrissage : s'il y a des sceaux à briser on les montre, sinon
  // on ouvre directement les augures encore scellés. Une seule fois (ne pas
  // écraser un choix manuel de l'utilisateur quand la liste se met à jour).
  const landingRef = useRef(false);
  useEffect(() => {
    if (!echoes || echoes.length === 0 || landingRef.current) return;
    landingRef.current = true;
    const anyDue = echoes.some((e) => !e.verdict && new Date(e.dueAt).getTime() <= Date.now());
    setTab(anyDue ? 'due' : 'sealed');
  }, [echoes]);

  const now = Date.now();
  const isDue = useCallback((e: EchoData) => !e.verdict && new Date(e.dueAt).getTime() <= now, [now]);
  const isSealed = useCallback((e: EchoData) => !e.verdict && new Date(e.dueAt).getTime() > now, [now]);

  const counts = useMemo(() => ({
    due: (echoes || []).filter(isDue).length,
    sealed: (echoes || []).filter(isSealed).length,
    closed: (echoes || []).filter((e) => !!e.verdict).length,
    all: (echoes || []).length,
  }), [echoes, isDue, isSealed]);

  // Recherche : texte (4 langues), domaine, dates lisibles, verdict.
  const matches = useCallback((e: EchoData): boolean => {
    const needle = q.trim().toLowerCase();
    if (needle) {
      // Haystack = texte de l'augure + mots-clés du tirage d'origine
      // (thème/intention, nom du tirage, cartes) pour une recherche globale.
      const parts: string[] = [
        e.textFr || '', e.textEn || '', e.textEs || '', e.textHi || '',
        t(`echo.domain.${e.domain}`), e.domain,
        fmtDate(e.dueAt, lang), fmtShort(e.dueAt, lang),
        e.verdict ? t(`echo.verdict.${e.verdict}`) : '',
      ];
      const rd = e.readingId && readingsList ? readingsList.find((x) => x.id === e.readingId) : null;
      if (rd) {
        if (rd.question) parts.push(String(rd.question));
        parts.push(typeLabelOf(rd as any, lang), String(rd.type || ''), String(rd.spread || ''));
        const cards: any[] = Array.isArray(rd.cards) ? rd.cards : [];
        cards.forEach((c) => {
          const nm = (typeof c === 'number' ? TAROT_CARDS.find((k) => k.id === c)?.name
            : (typeof c?.name === 'string' ? c.name : c?.name?.name)
            ?? (typeof c?.id === 'number' ? TAROT_CARDS.find((k) => k.id === c.id)?.name : undefined))
            || (typeof c?.symbol === 'string' ? c.symbol : '')
            || (typeof c?.value === 'string' ? c.value : '');
          if (nm) parts.push(String(nm));
        });
      }
      const hay = parts.join('\n').toLowerCase();
      if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    if (domFilter.size > 0 && !domFilter.has(e.domain)) return false;
    return true;
  }, [q, domFilter, lang, t, readingsList]);

  const visible = useMemo(() => {
    const base = (echoes || []).filter((e) => {
      if (tab === 'due') return isDue(e);
      if (tab === 'sealed') return isSealed(e);
      return !!e.verdict; // 'closed'
    });
    return base.filter(matches).sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
  }, [echoes, tab, matches, isDue, isSealed]);

  // Vedette = due ; les autres onglets en lignes groupées par mois.
  const dueList = useMemo(() => visible.filter(isDue), [visible, isDue]);
  const rowList = useMemo(() => visible.filter((e) => !isDue(e)), [visible, isDue]);
  const byMonth = useMemo(() => {
    const map = new Map<string, { label: string; key: string; items: EchoData[] }>();
    for (const e of rowList) {
      const k = monthKey(e.dueAt, lang);
      if (!map.has(k)) map.set(k, { key: k, label: monthLabel(e.dueAt, lang), items: [] });
      map.get(k)!.items.push(e);
    }
    return [...map.values()]; // déjà trié (rowList descend)
  }, [rowList, lang]);

  const verdict = useCallback(async (e: EchoData, v: 'oui' | 'partiel' | 'non') => {
    setSavingId(e.id);
    try {
      const res = await api('/api/echo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, echoId: e.id, verdict: v }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.echo) {
        setEchoes((prev) => (prev || []).map((x) => (x.id === e.id ? data.echo : x)));
        void reloadSub(); // augure clos : sa place est rendue (sceaux réouverts ailleurs)
      }
    } catch {
      /* réseau — le verdict pourra être repris plus tard */
    } finally {
      setSavingId(null);
    }
  }, [email, reloadSub]);

  // Briser le sceau : son magique + texte révélé dans la foulée.
  const breakSeal = useCallback((id: string) => {
    playRandom('magic-1', 'magic-4', 'magic-7', 'magic-10');
    setBrokenIds((s) => new Set(s).add(id));
  }, []);

  // Un augure scellé (sans verdict, pas encore brisé en session) ne doit JAMAIS
  // livrer son texte — ni dans les lignes, ni dans la modale, ni en partage.
  const isRevealed = useCallback((e: EchoData) => !!e.verdict || brokenIds.has(e.id), [brokenIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fallback */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }, []);

  const doShare = useCallback(async (e: EchoData) => {
    const text = `${tr("✦ Mon augure scellé par l'Oracle des Étoiles", "✦ My augury sealed by the Oracle of Stars", "✦ Mi augurio sellado por el Oráculo de las Estrellas", "✦ तारों के ओरैकल द्वारा मुहरबंद मेरा शगुन")} — ${fmtDate(e.dueAt, lang)}\n« ${pickEchoText(e, lang)} »`;
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try { await navigator.share({ title: t('brand.name'), text }); return; }
      catch (err: any) { if (err?.name === 'AbortError') return; }
    }
    if (await copyToClipboard(text)) {
      setShareCopied(e.id);
      setTimeout(() => setShareCopied(null), 2000);
    }
  }, [lang, t, copyToClipboard]);

  const doDelete = useCallback(async (ids: string[]) => {
    setDeleting(true);
    try {
      const res = await api('/api/echo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, echoIds: ids }),
      });
      if (res.ok) {
        // un augure NON BRISÉ supprimé libère sa place : le compteur du hook
        // suit immédiatement (l'Initié peut resceller autant qu'il a supprimé).
        void reloadSub();
        setEchoes((prev) => (prev || []).filter((x) => !ids.includes(x.id)));
        setSelected(new Set());
        setOpenId(null);
        setConfirmDelete(null);
      }
    } catch { /* le geste pourra être repris */ }
    finally { setDeleting(false); }
  }, [email, reloadSub]);

  const exitManage = () => { setManage(false); setSelected(new Set()); };
  const openEcho = (e: EchoData) => {
    if (manage) { toggleSelect(e.id); return; }
    setReadingExpanded(false);
    setOpenId(e.id);
  };

  const detail = openId ? (echoes || []).find((x) => x.id === openId) || null : null;

  // ── Verrou Apprenti : page visible, registre non consultable ──
  if (loaded && !canSee) {
    return (
      <div className="space-y-6">
        <SpaceTitle img="/images/nav-grimoire.png" title={t('echo.yourAugures')} subtitle={t('echo.auguresSub')} dense flush />
        <div className="mystic-panel p-8 text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full border border-amber-400/40 bg-gradient-to-b from-amber-500/20 to-black/40 flex items-center justify-center shadow-[0_0_28px_rgba(217,164,6,0.3)]">
            <span className="text-4xl" aria-hidden>🔒</span>
          </div>
          <p className="text-amber-100/90 text-[15px] leading-relaxed max-w-md mx-auto">{t('echo.auguresLocked')}</p>
          <div className="mt-6">
            <Link href="/dashboard/account/abonnement#initie">
              <RuneButton variant="save">{t('echo.auguresCta')}</RuneButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Onglets : chaque état garde sa couleur (or / bleu / vert), versions vives
  // et contrastées qui ressortent sur le violet du ciel.
  const TABS: { id: Tab; label: string; n: number; color: string }[] = [
    { id: 'due', label: t('echo.tabDue'), n: counts.due, color: '#FFE45C' },
    { id: 'sealed', label: t('echo.tabSealed'), n: counts.sealed, color: '#6FC3FF' },
    { id: 'closed', label: t('echo.tabClosed'), n: counts.closed, color: '#5FE08B' },
  ];

  return (
    <div className="space-y-2">
      {/* Keyframes locales (halo du sceau à briser + étincelles) */}
      <style>{`
        @keyframes echo-glow { 0%,100% { box-shadow: 0 0 18px rgba(218,165,32,.25), inset 0 0 26px rgba(218,165,32,.08); } 50% { box-shadow: 0 0 34px rgba(218,165,32,.5), inset 0 0 38px rgba(218,165,32,.16); } }
        @keyframes echo-seal-turn { 0%,100% { transform: rotate(-6deg) scale(1); } 50% { transform: rotate(6deg) scale(1.06); } }
        .echo-due-card { animation: echo-glow 2.8s ease-in-out infinite; }
        .echo-due-seal { animation: echo-seal-turn 3.4s ease-in-out infinite; }
      `}</style>

      <SpaceTitle img="/images/nav-grimoire.png" title={t('echo.yourAugures')} subtitle={t('echo.auguresSub')} dense flush />

      {/* ── Bandeau collant : recherche + onglets + domaines ──
          Rappel du cycle = sous-titre du bandeau de titre (SpaceTitle).
          Aucun fond : les contrôles se posent à même le ciel cosmique ;
          sélection multiple = appui long sur une ligne (pas de bouton). */}
      <div className="sticky top-0 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 pt-1 pb-1.5">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            inputMode="search"
            placeholder={t('echo.searchPlaceholder')}
            className="w-full rounded-full border px-9 py-2 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/60 focus:border-amber-300/90 transition-all placeholder:text-amber-100/65"
            style={{
              background: 'transparent',
              borderColor: 'rgba(255,215,0,0.8)',
              color: '#FFF6DE',
              textShadow: '0 1px 6px rgba(0,0,0,0.55)',
              boxShadow: '0 0 12px rgba(255,215,0,0.18)',
              fontFamily: 'var(--font-cormorant), serif',
            }}
          />
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-300 text-sm">✦</span>
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label={t('echo.searchClear')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-200/50 hover:text-amber-200 text-sm">✕</button>
          )}
        </div>

        {/* Onglets d'état — pastilles colorées très contrastées (fond teinté +
            bordure pleine + texte vif), l'onglet actif en halo. */}
        <div className="mt-1.5 flex gap-1.5">
          {TABS.map((x) => {
            const active = tab === x.id;
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                className="flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-1 rounded-full border transition-all"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  borderColor: x.color,
                  color: x.color,
                  fontWeight: 800,
                  background: active ? `${x.color}33` : `${x.color}18`,
                  boxShadow: active ? `0 0 12px ${x.color}88, inset 0 0 8px ${x.color}22` : `0 1px 3px rgba(0,0,0,0.5)`,
                }}
              >
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: x.color, boxShadow: `0 0 4px ${x.color}` }} />
                <span className="text-[10px] whitespace-nowrap truncate">{x.label}</span>
                {x.n > 0 && <span className="text-[10px] opacity-90 tabular-nums">{x.n}</span>}
              </button>
            );
          })}
        </div>

        {/* Filtres domaines — mêmes pastilles, couleur de l'univers, texte
            doré-ivoire lisible sur le fond teinté sombre. */}
        <div className="mt-1.5 flex gap-1.5">
          {DOMAINS.map((d) => {
            const on = domFilter.has(d);
            const c = DOMAIN_COLOR[d];
            return (
              <button key={d} type="button"
                onClick={() => setDomFilter((prev) => { const n = new Set(prev); if (n.has(d)) n.delete(d); else n.add(d); return n; })}
                className="flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-1 rounded-full border transition-all"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  borderColor: on ? c : `${c}99`,
                  color: on ? '#FFF6DE' : c,
                  fontWeight: 800,
                  background: on ? `${c}55` : `${c}1c`,
                  boxShadow: on ? `0 0 12px ${c}88` : '0 1px 3px rgba(0,0,0,0.5)',
                }}
              >
                <img src={DOMAIN_ICON[d]} alt="" className="w-3.5 h-3.5 shrink-0 object-contain" style={{ filter: `drop-shadow(0 0 3px ${c})`, opacity: on ? 1 : 0.9 }} />
                <span className="text-[10px] whitespace-nowrap truncate">{t(`echo.domain.${d}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenu ──
          Le « Chargement » ne s'affiche que si le compte a le droit de charger
          (Initié/Arkane). Tant que le niveau n'est pas résolu, rien d'inutile :
          le verrou Apprenti prendra le relais dès que loaded=true. */}
      {echoes === null || !loaded ? (
        canSee ? (
          <p className="text-center py-8 text-[15px] font-bold" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFE45C', textShadow: '0 0 12px rgba(255,215,0,0.45)' }}>
            {t('echo.loadingList')}
          </p>
        ) : null
      ) : counts.all === 0 ? (
        <div className="mystic-panel p-6 text-center">
          <p className="text-[15px] font-bold" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFE45C', textShadow: '0 0 12px rgba(255,215,0,0.45)' }}>{t('echo.auguresEmpty')}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center py-8 text-[15px] font-bold" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFE45C', textShadow: '0 0 12px rgba(255,215,0,0.45)' }}>
          {t('echo.noResults')}
        </p>
      ) : (
        <>
          {/* Vedette « À briser » — cartes magnifiées */}
          {dueList.length > 0 && (
            <div className="space-y-4">
              {dueList.map((e) => {
                const revealed = brokenIds.has(e.id);
                return (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => { if (pressFired.current) { pressFired.current = false; return; } openEcho(e); }}
                    onPointerDown={() => startPress(e.id)}
                    onPointerUp={clearPress}
                    onPointerLeave={clearPress}
                    onPointerCancel={clearPress}
                    onContextMenu={(ev) => { ev.preventDefault(); clearPress(); if (!manage) { pressFired.current = true; setManage(true); setSelected((prev) => new Set(prev).add(e.id)); } }}
                    className={`relative overflow-hidden rounded-2xl border p-5 text-center cursor-pointer transition-transform active:scale-[0.99] ${manage ? 'opacity-90' : 'echo-due-card'}`}
                    style={{
                      borderColor: 'rgba(218,165,32,0.55)',
                      background: 'linear-gradient(160deg, rgba(58,40,10,0.55) 0%, rgba(20,10,44,0.85) 55%, rgba(8,5,20,0.92) 100%)',
                      WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',
                    }}
                  >
                    {/* voile d'étoiles filiantes : cercle de sceau */}
                    <div aria-hidden className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-dashed border-amber-400/50 flex items-center justify-center echo-due-seal"
                      style={{ background: 'radial-gradient(circle at 50% 40%, rgba(218,165,32,0.25), rgba(20,10,44,0.6) 70%)' }}>
                      <img src={DOMAIN_ICON[e.domain] || DOMAIN_ICON.tarot} alt="" className="w-8 h-8 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(245,180,80,0.6))' }} />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.22em] mb-1" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DAA520' }}>
                      ✦ {t('echo.dueBadge')} ✦ · {t(`echo.domain.${e.domain}`)}
                    </p>

                    {!revealed ? (
                      <>
                        <p className="text-amber-100/90 text-[14px] mb-3">{t('echo.dueNow')}</p>
                        <span onClick={(ev) => ev.stopPropagation()}>
                          <RuneButton variant="gold" onClick={() => breakSeal(e.id)}>
                            {t('echo.break')}
                          </RuneButton>
                        </span>
                      </>
                    ) : (
                      <div className="pt-1">
                        <motion.p
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
                          className="text-amber-50 italic text-[16px] leading-relaxed mb-3"
                          style={{ fontFamily: 'var(--font-cinzel), serif', textShadow: '0 0 16px rgba(218,165,32,0.35)' }}>
                          « <MarkWords text={pickEchoText(e, lang)} q={q} /> »
                        </motion.p>
                        <p className="text-sm text-gray-300 mb-2">{t('echo.verdictAsk')}</p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          {(['oui', 'partiel', 'non'] as const).map((v) => (
                            <button key={v} type="button" disabled={savingId === e.id}
                              onClick={(ev) => { ev.stopPropagation(); verdict(e, v); }}
                              className="rounded-full px-5 py-2 text-sm font-bold border border-amber-400/50 text-amber-100 bg-black/40 hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                              style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                              {t(`echo.verdict.${v}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {manage && (
                      <span aria-hidden className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border text-[13px] ${selected.has(e.id) ? 'border-amber-400 bg-amber-500/80 text-black' : 'border-white/30 bg-black/50 text-transparent'}`}>✓</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Lignes compactes groupées par mois */}
          {byMonth.map((grp) => {
            const isCollapsed = collapsed.has(grp.key);
            return (
              <div key={grp.key} className="mystic-panel overflow-hidden p-0">
                <button type="button"
                  onClick={() => setCollapsed((prev) => { const n = new Set(prev); if (n.has(grp.key)) n.delete(grp.key); else n.add(grp.key); return n; })}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-white/[0.03] transition-colors">
                  <span className="mystic-subtitle text-[13px] flex-1 min-w-0 truncate">✶ {grp.label}</span>
                  <span className="text-[11px] text-gray-400 tabular-nums">{grp.items.length}</span>
                  <span aria-hidden className={`text-amber-200/70 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>›</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-amber-800/15">
        {grp.items.map((e) => {
          const state = e.verdict ? 'closed' : isSealed(e) ? 'sealed' : 'due';
          return (
            <div key={e.id}
              onClick={() => { if (pressFired.current) { pressFired.current = false; return; } openEcho(e); }}
              onPointerDown={() => startPress(e.id)}
              onPointerUp={clearPress}
              onPointerLeave={clearPress}
              onPointerCancel={clearPress}
              onContextMenu={(ev) => { ev.preventDefault(); clearPress(); if (!manage) { pressFired.current = true; setManage(true); setSelected((prev) => new Set(prev).add(e.id)); } }}
              role="button" tabIndex={0}
              onKeyDown={(ev) => { if (ev.key === 'Enter') openEcho(e); }}
              className={`flex cursor-pointer items-center gap-2 px-4 py-2 transition-colors ${manage ? 'bg-white/[0.02]' : 'hover:bg-white/[0.04]'}`}
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}>
                          {manage && (
                            <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${selected.has(e.id) ? 'border-amber-400 bg-amber-500/80 text-black' : 'border-white/30 bg-black/40 text-transparent'}`}>✓</span>
                          )}
                          <img src={DOMAIN_ICON[e.domain] || DOMAIN_ICON.tarot} alt="" className="w-5 h-5 shrink-0 object-contain opacity-80" />
                          <span className="min-w-0 flex-1 truncate text-[13px] italic" style={{ fontFamily: 'var(--font-cormorant), serif', color: state === 'closed' ? 'rgba(220,214,200,0.62)' : '#E8DECA' }}>
                            {isRevealed(e)
                              ? <>« <MarkWords text={pickEchoText(e, lang)} q={q} /> »</>
                              : <span className="not-italic opacity-75">🔒 {t('echo.masked')}</span>}
                            </span>
                          <span className="shrink-0 text-[10px] tabular-nums text-gray-400">{fmtShort(e.dueAt, lang)}</span>
                          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={state === 'closed'
                              ? { borderColor: 'rgba(60,179,113,0.55)', color: '#3CB371', background: 'rgba(60,179,113,0.08)' }
                              : state === 'sealed'
                                ? { borderColor: 'rgba(61,155,233,0.55)', color: '#3D9BE9', background: 'rgba(61,155,233,0.08)' }
                                : { borderColor: 'rgba(255,215,0,0.6)', color: '#FFD700', background: 'rgba(255,215,0,0.08)' }}>
                            {state === 'closed'
                              ? t('echo.verdictRecorded').replace('{v}', t(`echo.verdict.${e.verdict || 'non'}`)).replace(/^Verdict retenu : /, '').replace(/\.$/, '')
                              : state === 'sealed'
                                ? t('echo.daysLeft').replace('{n}', String(daysLeft(e.dueAt))).replace(/^Encore /, '').replace(/\.$/, '')
                                : t('echo.dueBadge')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── Barre d'action « sélection » flottante — centrée pleine largeur ── */}
      <AnimatePresence>
        {manage && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="fixed inset-x-0 bottom-16 md:bottom-6 z-40 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-red-400/40 bg-[#12081f]/95 px-4 py-2 shadow-[0_0_28px_rgba(248,113,113,0.2)] backdrop-blur">
              {selected.size > 0 && (
                <span className="text-[12px] text-red-100/90 whitespace-nowrap" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                  {t('echo.selectedN').replace('{n}', String(selected.size))}
                </span>
              )}
              <button type="button" disabled={selected.size === 0 || deleting} onClick={() => setConfirmDelete({ ids: [...selected] })}
                className="rounded-full bg-red-700/90 px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-40 whitespace-nowrap"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                {deleting ? '…' : t('echo.deleteSelected')}
              </button>
              <span aria-hidden className="h-5 w-px bg-red-200/25" />
              <button type="button" onClick={exitManage} aria-label={t('echo.exitManage')}
                className="text-red-100/80 hover:text-red-50 text-lg leading-none px-1">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modale détail : le tirage d'origine mis en scène, puis l'augure ── */}
      <AnimatePresence>
        {detail && !manage && (() => {
          const rd = detail.readingId && readingsList ? readingsList.find((x) => x.id === detail.readingId) : null;
          const rdGroup = rd ? metaOf(rd).group : null;
          const rdCards: any[] = rd && Array.isArray(rd.cards) ? rd.cards : [];
          return (
          <motion.div key="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
            onClick={() => setOpenId(null)}>
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(ev) => ev.stopPropagation()}
              className="mt-2 mb-auto w-full max-w-lg overflow-hidden rounded-2xl border border-amber-400/40"
              style={{ background: 'linear-gradient(165deg, rgba(30,16,58,0.98) 0%, rgba(10,6,24,0.99) 60%)', boxShadow: '0 0 40px rgba(218,165,32,0.18)' }}>
              {/* En-tête : titre du tirage (le lien direct), partage discret, fermeture */}
              <div className="flex items-center gap-2 border-b border-amber-800/30 px-4 py-3">
                {rd && rdGroup ? (
                  <>
                    <img src={TYPE_META[rdGroup].icon} alt="" className="w-6 h-6 shrink-0 object-contain" style={{ filter: `drop-shadow(0 0 5px ${TYPE_META[rdGroup].glow})` }} />
                    <span className="min-w-0 flex-1 text-[13px] font-bold truncate" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: TYPE_META[rdGroup].color, textShadow: `0 0 12px ${TYPE_META[rdGroup].glow}` }}>
                      <MarkWords text={typeLabelOf(rd as any, lang)} q={q} />
                      <span className="ml-2 text-[10px] font-normal text-gray-400">{fmtDate(rd.createdAt, lang)}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <img src={DOMAIN_ICON[detail.domain] || DOMAIN_ICON.tarot} alt="" className="w-6 h-6 shrink-0 object-contain" />
                    <span className="min-w-0 flex-1 text-[12px] uppercase tracking-widest text-amber-200/85" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                      {t(`echo.domain.${detail.domain}`)} · {fmtDate(detail.dueAt, lang)}
                    </span>
                  </>
                )}
                <button type="button" onClick={() => doShare(detail)} aria-label={t('history.share')} title={t('history.share')}
                  hidden={!isRevealed(detail)}
                  className="shrink-0 p-1.5 rounded-md text-amber-200/55 hover:text-amber-100 transition-colors">
                  {shareCopied === detail.id
                    ? <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: '#4ade80' }}>{t('history.shareCopied')}</span>
                    : <ShareIcon size={15} />}
                </button>
                <button type="button" onClick={() => setOpenId(null)} aria-label={t('echo.close')}
                  className="shrink-0 text-gray-400 hover:text-amber-100 text-lg leading-none px-1">✕</button>
              </div>

              <div className="max-h-[72vh] overflow-y-auto px-4 py-4 space-y-4">
                {/* Le tirage d'origine : cartes + question/thème mis en avant,
                    et lecture complète dépliable (mêmes vues que /readings). */}
                {rd && rdCards.length > 0 && (() => {
                  const q: string = rd.question || '';
                  const sep = q.indexOf(' — ');
                  const theme = sep > -1 ? q.slice(0, sep) : q;
                  const intention = sep > -1 ? q.slice(sep + 3) : '';
                  let interp: any = null;
                  try { interp = JSON.parse(rd.interpretation || 'null'); } catch { interp = null; }
                  const yiQing = interp && (interp.meditation || interp.conseil || interp.attitude) ? interp : null;
                  const tm = rdGroup ? TYPE_META[rdGroup] : null;
                  return (
                  <div className="rounded-xl border border-amber-800/30 bg-black/25 px-3 py-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-amber-200/60" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                      {t('echo.drawTitle')}
                    </p>
                    {theme && (
                      <div className="rounded-lg border px-3 py-2 mb-2.5" style={{ borderColor: tm ? `${tm.color}66` : 'rgba(218,165,32,0.4)', background: tm ? `${tm.color}14` : 'rgba(218,165,32,0.08)' }}>
                        <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: tm ? tm.color : '#DAA520', fontFamily: 'var(--font-cinzel), serif' }}>
                          {t('echo.themeLabel')}
                        </p>
                        <p className="text-[14px] font-bold leading-snug" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFF6DE' }}>
                          <MarkWords text={theme} q={q} />
                        </p>
                        {intention && (
                          <>
                            <p className="mt-1.5 text-[9px] uppercase tracking-[0.18em]" style={{ color: 'rgba(218,165,32,0.75)', fontFamily: 'var(--font-cinzel), serif' }}>
                              {t('echo.intentionLabel')}
                            </p>
                            <p className="text-[13px] italic leading-snug" style={{ fontFamily: 'var(--font-cormorant), serif', color: 'rgba(255,233,176,0.85)' }}>
                              « <MarkWords text={intention} q={q} /> »
                            </p>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {rdCards.map((c, i) => <ReadingThumb key={i} group={rdGroup || 'tarot'} card={c} idx={i} big />)}
                    </div>
                    {interp && (
                      <button type="button" onClick={() => setReadingExpanded((v) => !v)}
                        className="mt-2.5 w-full rounded-full border px-3 py-1 text-[11px] font-bold transition-colors"
                        style={{ borderColor: 'rgba(218,165,32,0.45)', color: '#E8C76B', background: 'rgba(218,165,32,0.08)', fontFamily: 'var(--font-cinzel), serif' }}>
                        {readingExpanded ? `⌃ ${t('echo.collapseReading')}` : `⌄ ${t('echo.expandReading')}`}
                      </button>
                    )}
                    {readingExpanded && interp && (
                      <div className="mt-3 border-t border-amber-800/25 pt-3 text-[13px]">
                        {rd.type === 'yi-jing-double' ? (
                          <DoubleHexView r={rd} />
                        ) : rdGroup === 'yijing' ? (
                          <YiJingView r={rd} interp={yiQing} />
                        ) : rdGroup === 'rune' ? (
                          <RuneView r={rd} />
                        ) : rdGroup === 'des' ? (
                          <AstroView r={rd} />
                        ) : rd.type === 'tarot-semaine' ? (
                          <WheelView r={rd} />
                        ) : (
                          <TarotView r={rd} interpretation={rd.interpretation || ''} />
                        )}
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* L'augure */}
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-amber-200/60" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                    ✦ {t('echo.augureSingular')} · {fmtDate(detail.dueAt, lang)}
                  </p>
                  {isRevealed(detail) ? (
                    <p className="text-amber-50 italic text-[16px] leading-relaxed" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                      « <MarkWords text={pickEchoText(detail, lang)} q={q} /> »
                    </p>
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-400/40 px-4 py-5 text-center"
                      style={{ background: 'radial-gradient(circle at 50% 30%, rgba(218,165,32,0.10), rgba(10,6,24,0.35))' }}>
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-amber-400/60">
                        <span className="text-2xl" aria-hidden>🔒</span>
                      </div>
                      <p className="text-amber-100/85 text-[14px] italic" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                        {t('echo.maskedModal').replace('{date}', fmtDate(detail.dueAt, lang))}
                      </p>
                    </div>
                  )}
                </div>

                {detail.verdict && (
                  <p className="text-[13px]" style={{ color: '#b8963e' }}>
                    {t('echo.verdictRecorded').replace('{v}', t(`echo.verdict.${detail.verdict}`))}
                  </p>
                )}
                {!detail.verdict && daysLeft(detail.dueAt) > 0 && (
                  <p className="text-[13px]" style={{ color: '#4db8c4' }}>
                    {t('echo.sealedLine').replace('{date}', fmtDate(detail.dueAt, lang))} · {t('echo.daysLeft').replace('{n}', String(daysLeft(detail.dueAt)))}
                  </p>
                )}
                {!detail.verdict && daysLeft(detail.dueAt) === 0 && (
                  <div className="text-center pt-1">
                    <p className="text-amber-100/90 text-[14px] mb-2">{t('echo.dueNow')}</p>
                    <RuneButton variant="gold" onClick={() => breakSeal(detail.id)}>{t('echo.break')}</RuneButton>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Confirmation de suppression ── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
            onClick={() => !deleting && setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={(ev) => ev.stopPropagation()}
              className="mystic-panel w-full max-w-sm p-6 text-center">
              <p className="text-amber-100 text-[15px] leading-relaxed mb-5" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                {t('echo.deleteConfirm').replace('{n}', String(confirmDelete.ids.length))}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button type="button" disabled={deleting} onClick={() => setConfirmDelete(null)}
                  className="mystic-btn-ghost px-4 py-1.5 text-sm">{t('echo.cancel')}</button>
                <button type="button" disabled={deleting} onClick={() => doDelete(confirmDelete.ids)}
                  className="rounded-full bg-red-700/90 px-5 py-1.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                  {deleting ? '…' : t('echo.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Onglet par défaut d'un augure pour la navigation profonde (?open=).
function e2tab(e: EchoData): Tab {
  if (e.verdict) return 'closed';
  return new Date(e.dueAt).getTime() <= Date.now() ? 'due' : 'sealed';
}
