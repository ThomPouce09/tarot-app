'use client';

// components/follow-up-panel.tsx — Enchaînement de questions sur une page
// d'interprétation (parité avec la voyance classique « choix » qui permet
// d'affiner après le 1er tirage).
//
// Mécanique : le MÊME tirage (cartes/achillées) est relu par l'oracle avec une
// nouvelle question, nourrie par le fil des échanges précédents (questions +
// réponses déjà livrées) → l'IA approfondit sans se répéter, en rappelant
// explicitement les éléments clés du fil (exigence prompt serveur).
// Chaque enchaînement est une consultation COMPLÈTE : réponse longue et
// argumentée comme un tirage avancé (toutes les sections), débitée par le
// quota guard habituel (nouveau flowId → pas de dédup avec le tirage initial).
//
// attente : scène animée 16:9 originale (CSS/SVG — tarot : anneaux des
// arcanes + carte qui respire ; Yi Jing : disque des 64 hexagrammes).
// Emplacement réservé aux vidéos fournies : voir VIDEO_URLS plus bas —
// dès que les fichiers sont livrés, ils remplacent la scène sans autre code.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT, useLang, pick4, tr } from '@/lib/i18n';
import { waitMessages } from '@/lib/wait-messages';
import { api } from '@/lib/api-client';
import { TAROT_NIGHT } from '@/app/tarot-3-cartes-simplifie/theme-selector';
import { YI_LACQUER } from '@/app/yi-jing-simplifie/theme-selector';

export interface FollowUpUsage {
  baseUsedMonth?: number | null;
  baseMonthly?: number | null;
  grandUsedMonth?: number | null;
  grandMonthly?: number | null;
  baseUnlimited?: boolean;
  rechargeCredits?: number;
}

interface ThreadTurn {
  question: string;
  /** Réponse structurée complète (mêmes clés que /api/interpret). */
  data: Record<string, any>;
  /** Texte intégral (sections + résumé) — sert de contexte au fil. */
  answer: string;
}

interface Props {
  /** type d'interprétation (tarot-3-cartes | yi-jing-simplifie | …) */
  type: string;
  isTarot: boolean;
  /** ids des cartes tirées (tarot) — repris tels quels */
  cartes: number[];
  /** numéro de baguette (Yi Jing) */
  baguette: number | null;
  userId: string;
  /** question initiale posée au tirage (peut être null) */
  initialQuestion: string;
  /** synthèse du tirage initial → amorce du fil */
  initialSummary: string;
  /** droits courants (usage de /api/subscription) pour l'annonce du coût */
  usage?: FollowUpUsage | null;
  /** 'base' | 'grand' — filière de débit du type courant */
  tier: 'base' | 'grand';
  /** id du reading enregistre du tirage initial — l'enchainement vient
      s'y ranger (une seule fiche d'historique, toutes les etapes). */
  parentReadingId?: string | null;
  /** callback quota refusé (402) → ouvre la modale d'abonnement du parent */
  onGate: (reason: string) => void;
}

/** Clés de sections par univers — les mêmes que la page d'interprétation. */
function sectionDefs(isTarot: boolean, t: (k: string) => string) {
  return isTarot
    ? [
        { k: 'passe', label: t('history.pos.past') },
        { k: 'present', label: t('history.pos.present') },
        { k: 'avenir', label: t('history.pos.future') },
      ]
    : [
        { k: 'situation', label: t('interpret.situation') },
        { k: 'defis', label: t('interpret.defis') },
        { k: 'soutien', label: t('interpret.soutien') },
        { k: 'issue', label: t('interpret.issue') },
        { k: 'conseil', label: t('interpret.conseil') },
      ];
}

/** Texte intégral d'une réponse (pour le contexte du fil serveur). */
function fullAnswer(d: Record<string, any>, isTarot: boolean): string {
  const keys = isTarot
    ? ['passe', 'present', 'avenir', 'resume']
    : ['situation', 'defis', 'soutien', 'issue', 'conseil', 'resume'];
  return keys.map((k) => String(d?.[k] ?? '').trim()).filter(Boolean).join('\n\n');
}

/** Chaîne le fil des échanges pour le prompt serveur (réponses COMPLÈTES,
 *  tronquées côté serveur) — l'IA peut ainsi citer ses propres formules. */
function buildThread(turns: ThreadTurn[], initialQ: string, initialS: string): string {
  const seed = initialQ || initialS
    ? [{ question: initialQ || '(intention du tirage)', data: { resume: initialS }, answer: initialS } as ThreadTurn]
    : [];
  return [...seed, ...turns]
    .map((x, i) => `${i + 1}) Question : « ${x.question} »\n   Réponse livrée : ${x.answer}`)
    .join('\n\n');
}

// ── Vidéos d'attente 16:9 (fournies par le user) ──────────────────────
// Ajouter les URLs ici (p. ex. '/images/follow-wait-tarot1.mp4') : elles
// remplacent automatiquement la scène CSS/SVG ci-dessous, en boucle muette,
// dans la même fenêtre 16:9. Vide = scène CSS.
const VIDEO_URLS: { tarot: string[]; yijing: string[] } = { tarot: [], yijing: [] };

/** Scène d'attente 16:9 — originale, dans le thème de l'univers. */
function FollowWaitScene({ isTarot, lang }: { isTarot: boolean; lang: string }) {
  const gold = isTarot ? TAROT_NIGHT.gold : YI_LACQUER.gold;
  const msgs = waitMessages(isTarot ? 'tarot' : 'yijing', lang as any);
  const [mi, setMi] = useState(() => Math.floor(Math.random() * msgs.length));
  useEffect(() => {
    const id = window.setInterval(() => setMi((x) => (x + 1) % msgs.length), 2800);
    return () => window.clearInterval(id);
  }, [msgs.length]);

  const videos = isTarot ? VIDEO_URLS.tarot : VIDEO_URLS.yijing;

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl border"
      style={{
        borderColor: `${gold}44`,
        background: isTarot
          ? 'linear-gradient(160deg, #2a1408 0%, #180b05 70%)'
          : 'linear-gradient(160deg, #140a0e 0%, #0d0609 70%)',
        boxShadow: `0 0 26px ${gold}22, inset 0 0 40px rgba(0,0,0,0.55)`,
      }}
      role="status"
      aria-label={tr("L'oracle approfondit…", "The oracle delves deeper…", "El oráculo profundiza…", "ओरैकल गहराई से देख रहा है…")}
    >
      <style>{`
        @keyframes fuw-spin { to { transform: rotate(360deg); } }
        @keyframes fuw-spin-r { to { transform: rotate(-360deg); } }
        @keyframes fuw-breathe { 0%,100% { transform: scale(1); opacity:.85; } 50% { transform: scale(1.06); opacity:1; } }
        @keyframes fuw-flicker { 0%,100% { opacity:.15; } 50% { opacity:.85; } }
        @keyframes fuw-line { 0%,100% { transform: scaleX(.55); opacity:.35; } 50% { transform: scaleX(1); opacity:1; } }
      `}</style>

      {videos.length > 0 ? (
        <video
          key={videos[mi % videos.length]}
          src={videos[mi % videos.length]}
          autoPlay muted loop playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.9 }}
        />
      ) : isTarot ? (
        /* Tarot : anneau des arcanes + lame centrale qui respire */
        <div className="absolute inset-0">
          <svg viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2" fill="none" stroke={gold} style={{ opacity: 0.28, animation: 'fuw-spin 46s linear infinite' }}>
            <circle cx="100" cy="100" r="86" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="72" strokeWidth="0.4" strokeDasharray="2 6" />
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <g key={i} transform={`translate(${100 + 79 * Math.cos(a)} ${100 + 79 * Math.sin(a)}) rotate(${(a * 180) / Math.PI + 90})`}>
                <rect x="-3.5" y="-6" width="7" height="12" rx="1.6" strokeWidth="0.8" />
                <path d={`M0 -3.2 L${1.5} 0 L0 3.2 L${-1.5} 0 Z`} strokeWidth="0.6" style={{ animation: `fuw-flicker ${2.4 + (i % 5) * 0.7}s ease-in-out ${(i % 7) * 0.3}s infinite` }} />
              </g>;
            })}
          </svg>
          <svg viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 h-[92%] w-[92%] -translate-x-1/2 -translate-y-1/2" fill="none" stroke={gold} style={{ opacity: 0.16, animation: 'fuw-spin-r 70s linear infinite' }}>
            <circle cx="100" cy="100" r="58" strokeWidth="0.5" strokeDasharray="1 5" />
          </svg>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animation: 'fuw-breathe 3.2s ease-in-out infinite' }}>
            <svg width="56" height="92" viewBox="0 0 56 92" fill="none" stroke={gold} strokeWidth="1.4">
              <rect x="1.5" y="1.5" width="53" height="89" rx="6" fill="rgba(218,165,32,0.05)" />
              <rect x="6" y="6" width="44" height="80" rx="4" strokeWidth="0.6" opacity="0.6" />
              <path d="M28 26 L34 40 L28 54 L22 40 Z" style={{ animation: 'fuw-flicker 2.8s ease-in-out infinite' }} />
              <circle cx="28" cy="40" r="2" fill={gold} stroke="none" />
            </svg>
          </div>
        </div>
      ) : (
        /* Yi Jing : disque des 64 hexagrammes + hexagramme qui se tisse */
        <div className="absolute inset-0">
          <svg viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2" fill="none" stroke={gold} style={{ opacity: 0.22, animation: 'fuw-spin 60s linear infinite' }}>
            <circle cx="100" cy="100" r="88" strokeWidth="0.6" />
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const cx = 100 + 74 * Math.cos(a), cy = 100 + 74 * Math.sin(a);
              return (
                <g key={i} transform={`translate(${cx} ${cy})`} style={{ animation: `fuw-flicker ${2.6 + (i % 3) * 0.8}s ease-in-out ${(i % 5) * 0.4}s infinite` }}>
                  {Array.from({ length: 6 }).map((_, r) => {
                    const y = -9 + r * 3.4;
                    const broken = (i >> r) & 1;
                    return broken
                      ? <g key={r}><line x1="-6" y1={y} x2="-1.5" y2={y} strokeWidth="0.9" /><line x1="1.5" y1={y} x2="6" y2={y} strokeWidth="0.9" /></g>
                      : <line key={r} x1="-6" y1={y} x2="6" y2={y} strokeWidth="0.9" />;
                  })}
                </g>
              );
            })}
          </svg>
          <svg viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 h-[96%] w-[96%] -translate-x-1/2 -translate-y-1/2" fill="none" stroke={gold} style={{ opacity: 0.14, animation: 'fuw-spin-r 80s linear infinite' }}>
            <circle cx="100" cy="100" r="52" strokeWidth="0.5" strokeDasharray="1 6" />
          </svg>
          {/* Hexagramme central qui tisse ses traits */}
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[7px]">
            {Array.from({ length: 6 }).map((_, r) => {
              const broken = r % 2 === 1;
              return (
                <div key={r} className="flex h-[7px] w-[86px] gap-2" style={{ transformOrigin: 'left center', animation: `fuw-line 2.4s ease-in-out ${r * 0.28}s infinite` }}>
                  {broken ? (<><div className="h-full w-[36px] rounded-sm" style={{ background: gold, opacity: 0.85 }} /><div className="h-full w-[36px] rounded-sm self-end ml-auto" style={{ background: gold, opacity: 0.85 }} /></>)
                    : <div className="h-full w-full rounded-sm" style={{ background: gold, opacity: 0.85 }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voile bas + message rotatif du corpus */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-3 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={mi}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45 }}
            className="text-[12px] italic sm:text-[13px]"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: `${gold}e6`, textShadow: '0 1px 8px rgba(0,0,0,0.85)' }}
          >
            {msgs[mi % msgs.length]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

const FUW_MIN_MS = 3500;

export default function FollowUpPanel({
  type, isTarot, cartes, baguette, userId,
  initialQuestion, initialSummary, usage: usageProp, tier, parentReadingId, onGate,
}: Props) {
  const t = useT();
  const lang = useLang();
  const theme = isTarot ? TAROT_NIGHT : YI_LACQUER;
  const gold = isTarot ? TAROT_NIGHT.gold : YI_LACQUER.gold;

  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<FollowUpUsage | null>(usageProp ?? null);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<ThreadTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const startedRef = useRef(0);
  // ── Focus aux etapes (exigence user) ──
  //  ouverture de l'encart : l'ensemble du panneau entre a l'ecran ;
  //  clic sur le bouton : l'attente 16:9 se centre ;
  //  arrivee du resultat : la question posee + sa reponse se placent en haut
  //  (sous le menu flottant — d'ou scroll-margin-top).
  const panelRef = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const lastTurnRef = useRef<HTMLLIElement | null>(null);
  const wasBusyRef = useRef(false);
  const prevLenRef = useRef(0);

  // Droits courants : usage de /api/subscription (le parent ne le connait
  // pas toujours — ici, auto-charge silencieux au montage).
  const email = userId.trim();
  useEffect(() => {
    if (usageProp || !email) return;
    let alive = true;
    api(`/api/subscription?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => { if (alive && d && d.usage) setUsage(d.usage as FollowUpUsage); })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (busy && !wasBusyRef.current) {
      const id = window.setTimeout(() => sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
      wasBusyRef.current = true; prevLenRef.current = turns.length;
      return () => window.clearTimeout(id);
    }
    if (!busy && wasBusyRef.current) {
      wasBusyRef.current = false;
      if (turns.length > prevLenRef.current) {
        // AnimatePresence laisse la scene s'evaner : attendre le retrait.
        const id = window.setTimeout(() => lastTurnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 380);
        prevLenRef.current = turns.length;
        return () => window.clearTimeout(id);
      }
    }
    prevLenRef.current = turns.length;
  }, [busy, turns.length]);

  const wordCount = question.trim().split(/\s+/).filter(Boolean).length;
  const canAsk = wordCount >= 2 && !busy;

  // Restant annonce : filière base mensuelle ou avancée ; 'illimité' si
  // baseUnlimited (arkane). null = usage inconnu → annonce neutre.
  const remaining: number | null | 'unlimited' = (() => {
    if (!usage) return null;
    if (tier === 'base') {
      if (usage.baseUnlimited) return 'unlimited';
      if (usage.baseMonthly == null) return 'unlimited';
      return Math.max(0, usage.baseMonthly - (usage.baseUsedMonth ?? 0));
    }
    if (usage.grandMonthly == null) return 'unlimited';
    return Math.max(0, usage.grandMonthly - (usage.grandUsedMonth ?? 0));
  })();

  const costNote =
    remaining === 'unlimited'
      ? pick4('Compris dans votre abonnement — sans surcoût.', 'Included in your subscription — no extra cost.', 'Incluido en su suscripción — sin coste adicional.', 'आपकी सदस्यता में शामिल — अतिरिक्त लागत नहीं।')(lang)
      : remaining === null
        ? pick4('Cette question compte comme une consultation complète.', 'This question counts as a full reading.', 'Esta pregunta cuenta como una consulta completa.', 'यह प्रश्न एक पूर्ण परामर्श माना जाएगा।')(lang)
        : pick4(
            `Chaque question compte comme une consultation complète — il vous reste ${remaining} ${tier === 'base' ? 'tirage(s) de base' : 'consultation(s) avancée(ies)'} ce mois-ci.`,
            `Each question counts as a full reading — ${remaining} ${tier === 'base' ? 'base draw(s)' : 'advanced reading(s)'} left this month.`,
            `Cada pregunta cuenta como una consulta completa — le quedan ${remaining} ${tier === 'base' ? 'tiradas básicas' : 'consultas avanzadas'} este mes.`,
            `प्रत्येक प्रश्न एक पूर्ण परामर्श है — इस माह ${remaining} ${tier === 'base' ? 'मूल वाचन' : 'उन्नत परामर्श'} शेष हैं।`,
          )(lang);

  const ask = useCallback(async () => {
    const q = question.trim();
    if (wordCount < 2 || busy) return;
    setBusy(true);
    setErr(null);
    startedRef.current = Date.now();
    const body: any = {
      type,
      question: q,
      userId: userId || undefined,
      lang,
      followUp: true,
      prevContext: buildThread(turns, initialQuestion, initialSummary),
      ...(parentReadingId ? { parentReadingId } : {}),
      flowId: (crypto.randomUUID?.() ?? `fu-${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, ''),
    };
    if (isTarot) body.cartes = cartes; else if (baguette != null) body.baguette = baguette;
    try {
      const res = await api('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        onGate(data.reason || 'limit-grand');
        return;
      }
      if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || 'session');
        return;
      }
      const data = await res.json();
      const answer = fullAnswer(data, isTarot);
      if (data.error || !answer) throw new Error(data.error || 'réponse vide');
      // Rituel : la scène tient au moins FUW_MIN_MS (comme le WaitOverlay du
      // tirage initial) — la révélation ne clignote pas.
      const elapsed = Date.now() - startedRef.current;
      if (elapsed < FUW_MIN_MS) await new Promise((r) => setTimeout(r, FUW_MIN_MS - elapsed));
      setTurns((prev) => [...prev, { question: q, data, answer }]);
      setQuestion('');
    } catch (e: any) {
      setErr(e?.message || 'erreur');
    } finally {
      setBusy(false);
    }
  }, [question, busy, wordCount, type, userId, lang, isTarot, cartes, baguette, turns, initialQuestion, initialSummary, parentReadingId, onGate]);

  const secs = sectionDefs(isTarot, t);

  // Sans identité (invité), la consultation filée n'a pas de suivi de droits :
  // le panneau reste discret.
  if (!email) return null;

  return (
    <section
      ref={panelRef}
      className="rounded-2xl border backdrop-blur-sm"
      style={{
        borderColor: `${gold}44`,
        scrollMarginTop: '88px',
        // panelMid est hex dans les deux palettes (tileIdleA Yi Jing = rgba →
        // incompatible avec la concaténation 'cc') — dégradé bois/laque assorti.
        background: `linear-gradient(160deg, ${(theme as any).panelMid ?? '#241505'}cc 0%, rgba(0,0,0,0.55) 100%)`,
      }}
    >
      <style>{`.fu-gold-field:focus{outline:none;border-color:${gold}99 !important;box-shadow:0 0 0 2px ${gold}3d, 0 0 14px ${gold}26;}`}</style>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 320);
        }}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={gold} strokeWidth="1.6" strokeLinecap="round" className="shrink-0">
          <path d="M9 14c-2.5 0-4.5-2-4.5-4.5S6.5 5 9 5h4c2.5 0 4.5 2 4.5 4.5 0 1.3-.55 2.5-1.5 3.3" />
          <path d="M15 10c2.5 0 4.5 2 4.5 4.5S17.5 19 15 19h-4c-2.5 0-4.5-2-4.5-4.5" opacity="0.65" />
          <path d="M20 15l1.5 1.5L20 18" opacity="0.8" />
        </svg>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold" style={{ color: gold, fontFamily: 'var(--font-cinzel), serif' }}>
            {t('follow.title')}
          </span>
          <span className="block text-[12px] leading-snug text-gray-400">{t('follow.hint')}</span>
        </span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Fil des echanges precedents (#2…) — reponses completes,
                  meme presentation que la lecture initiale. */}
              {turns.length > 0 && (
                <ol className="space-y-3">
                  {turns.map((x, i) => (
                    <li key={i} ref={i === turns.length - 1 ? lastTurnRef : null} className="rounded-xl border px-4 py-3" style={{ borderColor: `${gold}22`, background: 'rgba(255,255,255,0.03)', scrollMarginTop: '88px' }}>
                      <p className="text-[11px] tracking-[0.18em] uppercase mb-1" style={{ color: `${gold}99`, fontFamily: 'var(--font-cinzel), serif' }}>
                        {t('follow.turn')} {i + 2}
                      </p>
                      <p className="mb-2 text-[13px] italic" style={{ color: gold }}>« {x.question} »</p>
                      <div className="space-y-2.5">
                        {secs.map((s) => {
                          const v = String(x.data?.[s.k] ?? '').trim();
                          if (!v) return null;
                          return (
                            <div key={s.k}>
                              <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: `${gold}cc` }}>{s.label}</p>
                              <p className="text-[13.5px] leading-relaxed text-gray-200">{v}</p>
                            </div>
                          );
                        })}
                        {String(x.data?.resume ?? '').trim() && (
                          <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: `${gold}40`, background: `${gold}0d` }}>
                            <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: gold }}>✦ {tr('Résumé', 'Summary', 'Resumen', 'सारांश')}</p>
                            <p className="text-[13.5px] italic leading-relaxed text-gray-100">{String(x.data.resume).trim()}</p>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {/* attente : scene 16:9 thematique (ou video fournie par le user) */}
              <AnimatePresence>
                {busy && (
                  <motion.div ref={sceneRef} key="wait" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ scrollMarginTop: '88px' }}>
                    <FollowWaitScene isTarot={isTarot} lang={lang} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Saisie (masquee pendant l'attente — la scene prend la place) */}
              {!busy && (
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={t('follow.placeholder')}
                  className="fu-gold-field w-full resize-none rounded-xl border bg-black/40 px-4 py-3 text-[14px] text-gray-100 placeholder-gray-500"
                  style={{ borderColor: `${gold}33`, fontFamily: 'var(--font-cormorant), serif', caretColor: gold }}
                />
              )}

              {/* CTA + annonce du cout */}
              {!busy && (
                <div className="flex flex-col gap-2">
                  {err && <p className="text-[12.5px] text-red-300">{err}</p>}
                  <p className="flex items-start gap-2 text-[12px] leading-snug" style={{ color: `${gold}cc` }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16.5v.5" />
                    </svg>
                    {costNote}
                  </p>
                  <button
                    type="button"
                    onClick={ask}
                    disabled={!canAsk}
                    className={"w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed " + (isTarot ? "tarot-btn" : "yi-btn")}
                  >
                    {t('follow.ask')}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
