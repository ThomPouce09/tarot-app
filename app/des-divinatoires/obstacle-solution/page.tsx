'use client';

// app/des-divinatoires/obstacle-solution/page.tsx
// Refondu sur le moule de /choix : thème+sous-thème OU question obligatoire,
// mode du 2ᵉ tirage verrouillé sur celui du 1ᵉʳ (pas de mélange), frappe
// « le ciel se déchire » (dans AstroDiceCup), scroll gelé pendant le lancer,
// vidéos d'attente préchargées + AnalysisWaitVideo (plus d'écran noir),
// augure « Envie de défier l'Oracle ? » en fin de parcours avec la palette
// astro, récapitulatif final Obstacle & Solution.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  DiceBackground,
  DiceTitle,
  DiceButton,
  OneLineQuestion,
  DiceTutorial,
  useDiceCupHeight,
  scrollToCupFit,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../_shared';
import { randomTargetFaces, type TargetFaces } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { saveReading, updateReading } from '@/lib/save-reading';
import { nextRaceSeq } from '@/lib/race-guard';
import AnalysisWaitCard from '@/components/analysis-wait-card';
import AnalysisWaitVideo from '@/components/analysis-wait-video';
import EchoBox from '@/components/echo-box';
import { useT, useLang } from '@/lib/i18n';
import { preloadAstroDice } from '@/components/astro-dice/preload';
import { pickAndPreloadWaitVideo } from '@/lib/preload-wait-videos';
import { playSound } from '@/lib/sounds';
import { api } from '@/lib/api-client';
import { DiceSteps, ClickableFaces } from '@/components/astro-dice/constellation';
import { DiceLaunchCard } from '@/app/des-divinatoires/launch-card';
import AuthGate from '@/components/auth-gate';

const AstroDiceCup = dynamic(
  () => import('@/components/astro-dice').then((m) => m.AstroDiceCup),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{ height: 440, background: '#0d1b2a', color: '#87CEEB' }}
      >
        <span style={{ fontFamily: 'var(--font-cinzel), serif' }}>
          Préparation des dés…
        </span>
      </div>
    ),
  },
);

type Step = 'intro' | 'obstacle_roll' | 'obstacle_done' | 'solution_roll' | 'solution_done';

function diceCards(f: TargetFaces) {
  return (['planet', 'sign', 'house'] as const).map((k) => ({
    kind: k,
    value: f[k],
    label: k === 'house' ? `Maison ${f[k]}` : String(f[k]),
  }));
}
function diceStaticText(f: TargetFaces) {
  return (['planet', 'sign', 'house'] as const)
    .map((k) => `${k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison'} ${f[k]} : ${meaningFor(k, f[k])}`)
    .join('\n');
}

// Rendu markdown simplifié (**bold**, ## titres) — comme /choix.
function inlineMd(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: DICE_THEME.ocreLight }}>{part.slice(2, -2)}</strong>;
    }
    return italicParts(part);
  });
}
function italicParts(s: string): React.ReactNode {
  const parts = s.split(/(\*[^*]+\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} style={{ fontStyle: 'italic', opacity: 0.85 }}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
function md(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={key++} className="text-sm font-bold uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: '0 0 8px rgba(201,167,91,0.2)', letterSpacing: '0.08em' }}>{inlineMd(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h4 key={key++} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}>{inlineMd(trimmed.slice(2))}</h4>);
    } else {
      elements.push(<p key={key++} className="mb-1 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.7 }}>{inlineMd(trimmed || '\u00A0')}</p>);
    }
  }
  return elements;
}

// ── Analyse courte (LLM, fallback DB) + approfondie — moule /choix ──
function DiceAnalysis({
  faces,
  question,
  spread,
  onInterpretationReady,
  onDeepAnalysisReady,
}: {
  faces: TargetFaces;
  question?: string | null;
  spread?: string;
  onInterpretationReady?: (interp: string | null) => void;
  onDeepAnalysisReady?: (analysis: string | null) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const deepRef = useRef<HTMLDivElement | null>(null);
  const shortInterpRef = useRef<string | null>(null);

  useEffect(() => {
    if (deepAnalysis && deepRef.current) {
      setTimeout(() => deepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [deepAnalysis]);

  const runDeep = useCallback(async () => {
    setDeepLoading(true);
    setDeepAnalysis(null);
    try {
      const planet = PLANET_NAMES[faces.planet as string];
      const sign = SIGN_NAMES[faces.sign as string];
      const house = `Maison ${faces.house}`;
      if (!planet || !sign) { setDeepAnalysis('Indisponible.'); return; }
      const res = await api('/api/astro-interpretation-obstacle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planet, sign, house, question, kind: spread, mode: 'deep', lang }),
      });
      const data = await res.json();
      if (data.analysis) {
        setDeepAnalysis(data.analysis);
        onDeepAnalysisReady?.(data.analysis);
      } else {
        setDeepAnalysis('Indisponible.');
      }
    } catch { setDeepAnalysis('Indisponible.'); }
    finally { setDeepLoading(false); }
  }, [faces, question, spread, lang, onDeepAnalysisReady]);

  // Interprétation courte : LLM d'abord, DB en fallback. Guard anti-course :
  // seule la dernière exécution peut écrire l'état.
  const shortLastSeqRef = useRef(0);
  useEffect(() => {
    if (!faces.planet || !faces.sign || !faces.house) return;
    const planet = PLANET_NAMES[faces.planet as string];
    const sign = SIGN_NAMES[faces.sign as string];
    const house = `Maison ${faces.house}`;
    if (!planet || !sign) return;

    const seq = nextRaceSeq();
    shortLastSeqRef.current = seq;
    setDbLoading(true);
    setDbInterpretation(null);

    (async () => {
      try {
        const res = await api('/api/astro-interpretation-obstacle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house, question, kind: spread, mode: 'short', lang }),
        });
        const data = await res.json();
        if (seq !== shortLastSeqRef.current) return;
        if (data.interpretation) {
          setDbInterpretation(data.interpretation);
          shortInterpRef.current = data.interpretation;
          onInterpretationReady?.(data.interpretation);
          setDbLoading(false);
          return;
        }
      } catch { /* fallback DB */ }

      try {
        const res = await api('/api/astro-interpretation-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house }),
        });
        const data = await res.json();
        if (seq !== shortLastSeqRef.current) return;
        if (data.found && data.interpretation) {
          setDbInterpretation(data.interpretation);
          shortInterpRef.current = data.interpretation;
          onInterpretationReady?.(data.interpretation);
          setDbLoading(false);
          return;
        }
      } catch { /* silencieux */ }
      if (seq === shortLastSeqRef.current) setDbLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces, question, spread, lang]);

  return (
    <div className="mt-4 space-y-3">
      {/* Keyframes partagées (points de chargement de l'attente) */}
      <style>{`
        @keyframes oracle-dot {
          0%, 20% { opacity: 0; }
          40% { opacity: 1; }
          100% { opacity: 1; }
        }
        .oracle-loader-dot { display: inline-block; animation: oracle-dot 1.4s infinite; }
        .oracle-loader-dot:nth-child(2) { animation-delay: 0.2s; }
        .oracle-loader-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      {/* ── Analyse courte : vidéo d'attente (composant partagé, fallback
          onError) puis résumé doré — comme /choix. ── */}
      {dbLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mt-2 overflow-hidden rounded-2xl"
          style={{
            border: `1.5px solid ${DICE_THEME.gold}44`,
            boxShadow: `inset 0 0 30px ${DICE_THEME.gold}10, 0 0 30px ${DICE_THEME.gold}0c`,
          }}
        >
          <AnalysisWaitVideo
            prefix="analyse-des-zodiaque"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{ background: 'linear-gradient(to top, rgba(4,6,15,0.85) 0%, rgba(4,6,15,0.35) 55%, transparent 100%)', height: '55%' }}
          />
          <p
            className="absolute inset-x-0 bottom-0 pb-2 text-center text-xs font-bold uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 12px ${DICE_THEME.gold}44` }}
          >
            {t('des.choix.analysisPending')}
          </p>
          <div className="h-52 sm:h-64" />
        </motion.div>
      )}
      {dbInterpretation && (
        <div
          className="mt-2 rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
            border: `1.5px solid ${DICE_THEME.gold}66`,
            boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
          }}
        >
          <p
            className="mb-3 text-center text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 8px ${DICE_THEME.gold}33`, letterSpacing: '0.1em' }}
          >
            ✦ {t('des.choix.shortTitle')} ✦
          </p>
          <div
            className="text-center text-base leading-relaxed"
            style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.75 }}
          >
            {md(dbInterpretation)}
          </div>
        </div>
      )}

      {/* ── Analyse APPROFONDIE (prompt long) ── */}
      {!deepAnalysis && !deepLoading && (
        <div className="mt-4 text-center">
          <DiceButton variant="gold" onClick={runDeep}>
            {t('des.choix.deepLongBtn')}
          </DiceButton>
        </div>
      )}
      {deepLoading && (
        <AnalysisWaitCard
          accent={DICE_THEME.gold}
          title={
            <>
              La sagesse se dévoile
              <span className="oracle-loader-dot">.</span>
              <span className="oracle-loader-dot">.</span>
              <span className="oracle-loader-dot">.</span>
            </>
          }
          subtitle={t('des.choix.deepLoading')}
          videoPrefix="analyse-des-zodiaque"
        />
      )}
      {deepAnalysis && deepAnalysis !== 'Indisponible.' && (
        <motion.div
          ref={deepRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, ${DICE_THEME.gold}18 0%, ${DICE_THEME.brick} 100%)`,
            border: `1.5px solid ${DICE_THEME.gold}55`,
            boxShadow: `inset 0 0 24px ${DICE_THEME.gold}10`,
          }}
        >
          <p
            className="mb-3 text-center text-sm font-bold uppercase tracking-[0.12em]"
            style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 12px ${DICE_THEME.gold}44` }}
          >
            ✦ {t('des.choix.deepTitle')} ✦
          </p>
          <div
            className="text-base leading-relaxed"
            style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.75 }}
          >
            {md(deepAnalysis)}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Cartes du récapitulatif final ──
function RecapCard({
  label,
  faces,
  question,
  shortInterpretation,
}: {
  label: string;
  faces: TargetFaces;
  question?: string | null;
  shortInterpretation?: string | null;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 100%)`,
        border: `1.5px solid ${DICE_THEME.gold}44`,
      }}
    >
      <p
        className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
      >
        {label}
      </p>
      {question && (
        <OneLineQuestion
          className="mb-3 text-sm italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
          text={question}
        />
      )}
      <div className="mb-1"><ClickableFaces faces={faces} /></div>
      {shortInterpretation && (
        <div
          className="mt-3 text-sm leading-relaxed"
          style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.7 }}
        >
          {md(shortInterpretation)}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Les Voies — en-tête : l'étoile-obstacle et son fil doré qui se divise
// vers quatre étoiles-destinations (SVG animé, filant le long des branches).
// ──────────────────────────────────────────────
function VoiesHeader({ faces, loading, error, lang, onRetry }: {
  faces: TargetFaces;
  loading: boolean;
  error: boolean;
  lang: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center">
      <svg viewBox="0 0 300 92" className="mx-auto h-20 w-full max-w-md" aria-hidden>
        <GlowDefsStrike id="voie-thread" />
        {/* nœud obstacle = les 3 faces posées */}
        <motion.circle cx="30" cy="46" r="7" fill="none" stroke={DICE_THEME.gold} strokeWidth="1.6"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ transformOrigin: '30px 46px' }} />
        <motion.text x="30" y="47" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={DICE_THEME.ocreLight}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.08em' }}>
          {String(faces.planet)}{String(faces.sign)}·{faces.house}
        </motion.text>
        {/* fil principal jusqu'à la bifurcation */}
        <motion.line x1="40" y1="46" x2="118" y2="46" stroke="url(#voie-thread)" strokeWidth="1.4"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }} />
        {/* 4 branches vers les étoiles-destinations */}
        {[[280, 12], [280, 35], [280, 57], [280, 80]].map(([ex, ey], i) => (
          <motion.path key={i} d={`M118,46 C170,46 200,${ey} ${ex - 8},${ey}`} fill="none"
            stroke="url(#voie-thread)" strokeWidth="1.15" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: loading || error ? 0.9 : [0.25, 0.9] }}
            transition={{ duration: 0.8, delay: 1.15 + i * 0.28 }} />
        ))}
        {[[280, 12], [280, 35], [280, 57], [280, 80]].map(([ex, ey], i) => (
          <motion.circle key={i} cx={ex} cy={ey} r="3.4" fill={DICE_THEME.gold}
            initial={{ opacity: 0, scale: 0 }}
            animate={loading ? { opacity: [0.5, 1, 0.5], scale: [0.8, 1.15, 0.8] } : { opacity: 1, scale: 1 }}
            transition={loading
              ? { duration: 1.6, delay: i * 0.24, repeat: Infinity }
              : { duration: 0.4, delay: 1.9 + i * 0.28 }} />
        ))}
      </svg>
      <h3 className="text-lg font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight, textShadow: '0 0 14px rgba(232,198,106,0.4)' }}>
        {lang === 'en' ? 'The Four Paths' : 'Les Quatre Voies'}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-xs italic leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DCE6F599' }}>
        {lang === 'en'
          ? 'The oracle reads your obstacle and opens four attitudes to cross it. Choose yours — the Solution will answer within it.'
          : 'L’oracle a lu ton obstacle et ouvre quatre attitudes pour le traverser. Choisis la tienne — la Solution répondra en elle.'}
      </p>
      {error && (
        <div className="mt-2">
          <DiceButton variant="smallGold" onClick={onRetry}>
            {lang === 'en' ? 'Ask the oracle again' : 'Réinterroger l’oracle'}
          </DiceButton>
        </div>
      )}
    </div>
  );
}

// Petite lueur d'or (defs partagées par les voies) — même veine que cons-fade.
function GlowDefsStrike({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f4d98b" />
        <stop offset="55%" stopColor={DICE_THEME.gold} />
        <stop offset="100%" stopColor="#b98f3e" />
      </linearGradient>
    </defs>
  );
}

// ──────────────────────────────────────────────
// Les Voies — chargement : les astres consultent (déjà-vus des dots oracle).
// ──────────────────────────────────────────────
function VoiesCharged({ lang }: { lang: string }) {
  return (
    <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest"
      style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: '0 0 12px rgba(212,175,55,0.35)' }}>
      {lang === 'en' ? 'The stars are tracing your paths' : 'Les astres tracent tes voies'}
      <span className="oracle-loader-dot">.</span>
      <span className="oracle-loader-dot">.</span>
      <span className="oracle-loader-dot">.</span>
    </p>
  );
}

// ──────────────────────────────────────────────
// Les Voies — carte : constellation personnelle (3 piliers reliés au nom),
// pulsation dorée au survol/tap, empreinte de l'élément en filigrane.
// ──────────────────────────────────────────────
const VOIE_TINT: Record<string, string> = {
  fire: '#f28a5c', water: '#6fb6d9', air: '#cfe3f5', earth: '#c9a86a',
};

function VoieCard({ voie, i, onPick, chosen, dimmed, reason }: { voie: { id: string; glyph: string; name: string; motto: string }; i: number; onPick: () => void; chosen?: boolean; dimmed?: boolean; reason?: string | null }) {
  const tint = VOIE_TINT[voie.id] ?? DICE_THEME.gold;
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={dimmed}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: dimmed ? 0.25 : 1, y: 0, scale: chosen ? 1.03 : 1 }}
      transition={{ delay: 0.2 + i * 0.16, duration: 0.5 }}
      className="group relative overflow-hidden rounded-2xl p-4 text-left transition-shadow"
      style={{
        background: chosen
          ? 'linear-gradient(160deg, rgba(42,58,107,0.95) 0%, rgba(10,20,48,0.95) 100%)'
          : 'linear-gradient(160deg, rgba(20,36,90,0.85) 0%, rgba(7,13,34,0.92) 100%)',
        border: chosen ? `1.5px solid ${DICE_THEME.gold}` : `1px solid ${DICE_THEME.gold}44`,
        boxShadow: chosen ? `0 0 26px ${DICE_THEME.gold}55, inset 0 1px 0 rgba(232,198,106,0.4)` : 'inset 0 1px 0 rgba(232,198,106,0.14)',
      }}
    >
      {/* filigrane de l'élément */}
      <span aria-hidden className="pointer-events-none absolute -right-2 -top-3 text-[74px] leading-none opacity-[0.07] transition-opacity group-hover:opacity-[0.16]"
        style={{ color: tint, fontFamily: 'serif' }}>
        {voie.glyph}
      </span>
      {/* constellation de la voie : 3 piliers (corps/esprit/acte) reliés au sceau */}
      <svg viewBox="0 0 64 40" className="mb-2 h-10 w-16" aria-hidden>
        <motion.path d="M8,30 C18,26 22,14 32,10 M32,10 C42,14 46,22 56,8" fill="none"
          stroke={DICE_THEME.gold} strokeWidth="0.8" strokeLinecap="round" opacity="0.65"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.5 + i * 0.16 }} />
        {[[8, 30], [32, 10], [56, 8]].map(([cx, cy], k) => (
          <motion.circle key={k} cx={cx} cy={cy} r="2.2" fill={tint}
            initial={{ opacity: 0 }} animate={{ opacity: [0.55, 1] }} transition={{ duration: 0.6, delay: 0.7 + k * 0.2 + i * 0.16 }} />
        ))}
      </svg>
      <p className="text-sm font-bold tracking-wide"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight }}>
        {voie.name}
      </p>
      <p className="mt-1 text-xs leading-relaxed italic"
        style={{ fontFamily: 'var(--font-cormorant), serif', color: '#DCE6F5CC', lineHeight: 1.5 }}>
        {voie.motto}
      </p>
      {chosen && reason && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-1.5 text-[11px] leading-snug"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight, textShadow: '0 0 10px rgba(232,198,106,0.35)' }}>
          ✦ {reason} ✦
        </motion.p>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-[0.28em] opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold }}>
        ✦ {voie.glyph} marcher cette voie ✦
      </p>
    </motion.button>
  );
}

// ──────────────────────────────────────────────
// 5ᵉ carte — « Que les dés choisissent ma voie » : le sceau du destin,
// plus sombre, cerclé d'un anneau de runes tournant lentement, brume
// violette au survol. Le clic laisse l'oracle départager les voies.
// ──────────────────────────────────────────────
function VoieDestinyCard({ loading, disabled, lang, onPick }: {
  loading: boolean; disabled: boolean; lang: string; onPick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={loading || disabled}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.6 }}
      className="group relative overflow-hidden rounded-2xl p-4 text-left disabled:opacity-70"
      style={{
        background: 'radial-gradient(ellipse at 80% -10%, rgba(88,48,120,0.55) 0%, rgba(20,10,44,0.9) 45%, rgba(4,6,15,0.95) 100%)',
        border: '1px dashed rgba(200,170,255,0.4)',
        boxShadow: 'inset 0 0 28px rgba(120,80,180,0.18)',
      }}
    >
      {/* anneau de runes qui tourne lentement */}
      <motion.span aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 flex h-24 w-24 items-center justify-center rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        style={{
          border: '1px dashed rgba(200,170,255,0.35)',
          color: 'rgba(216,190,255,0.5)', fontSize: 11, letterSpacing: '0.35em', fontFamily: 'serif',
        }}>
        ☾✧♆✧☽✧⚹✧
      </motion.span>
      {/* voile brumeux qui se lève au survol */}
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at 70% 20%, rgba(168,120,255,0.16), transparent 60%)' }} />
      <p className="text-[26px] leading-none" style={{ filter: 'drop-shadow(0 0 10px rgba(168,120,255,0.6))' }}>❔</p>
      <p className="mt-2 text-sm font-bold tracking-wide"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#D8BEFF', textShadow: '0 0 12px rgba(168,120,255,0.4)' }}>
        {lang === 'en' ? 'Let the dice choose my path' : 'Que les dés choisissent ma voie'}
      </p>
      <p className="mt-1 text-xs leading-relaxed italic"
        style={{ fontFamily: 'var(--font-cormorant), serif', color: '#CBB8E8CC', lineHeight: 1.5 }}>
        {lang === 'en'
          ? 'Surrender the choice: the oracle weighs the four paths and designates the wisest.'
          : 'Remets le choix : l’oracle pèse les quatre voies et désigne la plus avisée.'}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.28em]"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: loading ? '#D8BEFF' : 'rgba(216,190,255,0.65)' }}>
        {loading
          ? <>◌ l’oracle {lang === 'en' ? 'is weighing your paths' : 'pèse tes voies'}<span className="oracle-loader-dot">.</span><span className="oracle-loader-dot">.</span></>
          : <>✦ {lang === 'en' ? 'abandon yourself to fate' : 'remets-toi au destin'} ✦</>}
      </p>
    </motion.button>
  );
}

// ── Page principale ──
function ObstacleSolutionPage() {
  // Chunk WebGL + vidéo d'attente téléchargés dès l'arrivée sur la page.
  useEffect(() => { preloadAstroDice(); pickAndPreloadWaitVideo('analyse-des-zodiaque'); }, []);
  const [step, setStep] = useState<Step>('intro');
  const t = useT();
  const lang = useLang();

  // Résultats des dés
  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 }) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const [obstacle, setObstacle] = useState<TargetFaces | null>(null);
  const [solution, setSolution] = useState<TargetFaces | null>(null);
  const obstacleRef = useRef<TargetFaces | null>(null);

  // Les Voies (moule obstacle→solution) : l'oracle trace 4 attitudes de
  // sortie à partir du tirage d'Obstacle ; le tirage de Solution se joue SUR
  // la voie choisie (plus de thème/question en B : c'est LE choix).
  const [question, setQuestion] = useState<string | null>(null);
  const [questionB, setQuestionB] = useState<string | null>(null);
  const questionRef = useRef<string | null>(null);
  const questionBRef = useRef<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState('');
  type Voie = { id: string; glyph: string; name: string; motto: string };
  const [voies, setVoies] = useState<Voie[] | null>(null);
  const [voiesLoading, setVoiesLoading] = useState(false);
  const [voiesError, setVoiesError] = useState(false);
  const voieRef = useRef<Voie | null>(null);
  const voiesFetchedRef = useRef(false);

  // Interprétations LLM courtes
  const [shortObstacle, setShortObstacle] = useState<string | null>(null);
  const [shortSolution, setShortSolution] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Analyses approfondies
  const [deepObstacle, setDeepObstacle] = useState<string | null>(null);
  const [deepSolution, setDeepSolution] = useState<string | null>(null);

  // Sauvegarde centralisée
  const readingIdRef = useRef<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const savedObstacleRef = useRef(false);

  // Refs de scroll
  const cupAreaRef = useRef<HTMLDivElement | null>(null);
  const cupRef = useRef<HTMLDivElement | null>(null);
  // Bloc d'analyse de la Solution — cible du focus après le 2ᵉ tirage.
  const solutionRef = useRef<HTMLDivElement | null>(null);
  const tutorialRef = useRef<HTMLDivElement | null>(null);
  // Hauteur d'arène OPTIMISÉE par écran (bandeau + tuto MESURÉS) : le tutoriel
  // ne déborde jamais du bas de l'écran, même sans scroll possible.
  const cupH = useDiceCupHeight(tutorialRef, step === 'obstacle_roll' || step === 'solution_roll', cupAreaRef);

  const scrollToCup = useCallback(() => {
    // Gobelet CENTRÉ dans l'écran pendant le lancer (comme /choix) +
    // correction mesurée : le bas du tuteur ne dépasse jamais l'écran.
    scrollToCupFit(cupRef.current ?? cupAreaRef.current, tutorialRef.current);
  }, []);

  useEffect(() => {
    if (step === 'obstacle_roll' || step === 'solution_roll') {
      const t = setTimeout(scrollToCup, 600);
      return () => clearTimeout(t);
    }
  }, [step, scrollToCup]);

  const rollObstacle = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('obstacle_roll');
    setShowTutorial(true);
  }, []);

  const rollSolution = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('solution_roll');
    setResetSignal((n) => n + 1);
    setShowTutorial(true);
  }, []);

  const handleRest = useCallback((f: TargetFaces) => {
    setStep((s) => {
      if (s === 'obstacle_roll') {
        setObstacle(f);
        obstacleRef.current = f;
        if (!savedObstacleRef.current) {
          savedObstacleRef.current = true;
          saveReading({
            type: 'des-obstacle-solution',
            spread: 'Obstacle',
            cards: diceCards(f),
            interpretation: diceStaticText(f),
            question: questionRef.current,
          }).then((id) => { if (id) { setReadingId(id); readingIdRef.current = id; } });
        }
        return 'obstacle_done';
      }
      if (s === 'solution_roll') {
        setSolution(f);
        return 'solution_done';
      }
      return s;
    });
  }, []);

  // ── Sauvegarde différée : faces combinées (attend readingId) ──
  const combinedSavedRef = useRef(false);
  useEffect(() => {
    if (readingId && obstacle && solution && !combinedSavedRef.current) {
      const combinedCards = [...diceCards(obstacle), ...diceCards(solution)];
      updateReading(readingId, {
        cards: combinedCards,
        interpretation: JSON.stringify({
          version: 'des-obstacle-solution',
          facesA: obstacle,
          facesB: solution,
        }),
      });
      combinedSavedRef.current = true;
    }
  }, [readingId, obstacle, solution]);

  // ── Sauvegarde centralisée : interprétations courtes + approfondies ──
  useEffect(() => {
    if (step === 'solution_done' && shortObstacle && shortSolution && readingId) {
      updateReading(readingId, { interpretation: JSON.stringify({
        version: 'des-obstacle-solution',
        facesA: obstacle,
        facesB: solution,
        shortA: shortObstacle,
        shortB: shortSolution,
        deepA: deepObstacle,
        deepB: deepSolution,
      }) });
    }
  }, [step, shortObstacle, shortSolution, readingId, obstacle, solution, deepObstacle, deepSolution]);

  useEffect(() => {
    if (!readingId) return;
    if (deepObstacle && deepSolution) {
      const payload = {
        version: 'des-obstacle-solution',
        facesA: obstacle,
        facesB: solution,
        shortA: shortObstacle,
        shortB: shortSolution,
        deepA: deepObstacle,
        deepB: deepSolution,
      };
      updateReading(readingId, { interpretation: JSON.stringify(payload) });
    }
  }, [deepObstacle, deepSolution, shortObstacle, shortSolution, readingId, obstacle, solution]);

  // ── Les Voies : dès que l'Obstacle est posé, l'oracle trace 4 attitudes ──
  useEffect(() => {
    if (step !== 'obstacle_done' || !obstacle) return;
    if (voiesFetchedRef.current) return;
    voiesFetchedRef.current = true;
    setVoiesLoading(true);
    setVoiesError(false);
    (async () => {
      try {
        const res = await api('/api/astro-voies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planet: PLANET_NAMES[obstacle.planet as string] ?? obstacle.planet,
            sign: SIGN_NAMES[obstacle.sign as string] ?? obstacle.sign,
            house: obstacle.house,
            question: questionRef.current,
            lang,
          }),
        });
        const data = await res.json();
        if (Array.isArray(data.voies) && data.voies.length === 4) {
          setVoies(data.voies);
          playSound('scroll1', 0.55);
        } else {
          setVoiesError(true);
        }
      } catch {
        setVoiesError(true);
      } finally {
        setVoiesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, obstacle, lang]);

  const chooseVoie = useCallback((v: Voie, reason?: string | null) => {
    voieRef.current = v;
    // La Solution se lit DANS la voie choisie : son énoncé devient la
    // question du second lancer (l'IA relie obstacle, voie et faces).
    const qq = reason ? `${v.name} — ${v.motto} (l'oracle impose : ${reason})` : `${v.name} — ${v.motto}`;
    setQuestionB(qq);
    questionBRef.current = qq;
    rollSolution();
    setTimeout(scrollToCup, 700);
  }, [rollSolution, scrollToCup]);

  // ── 5ᵉ carte mystérieuse : « Que les dés choisissent ma voie ». ──
  // L'oracle départage les 4 voies ouvertes et désigne la plus avisée ;
  // la voie élue s'illumine, les autres s'effacent, puis le lancer suit.
  const [destiny, setDestiny] = useState<{ id: string; reason: string | null } | null>(null);
  const [destinyLoading, setDestinyLoading] = useState(false);
  const askDice = useCallback(async () => {
    if (!obstacle || !voies || destinyLoading || destiny) return;
    setDestinyLoading(true);
    playSound('spell3', 0.6);
    try {
      const res = await api('/api/astro-voies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planet: PLANET_NAMES[obstacle.planet as string] ?? obstacle.planet,
          sign: SIGN_NAMES[obstacle.sign as string] ?? obstacle.sign,
          house: obstacle.house,
          question: questionRef.current,
          lang,
          voies,
        }),
      });
      const data = await res.json();
      const chosen = voies.find((v) => v.id === data.chosenId);
      if (chosen) {
        setDestiny({ id: chosen.id, reason: data.reason || null });
        // Laisse la voie élue s'illuminer ~1,8 s avant de lancer les dés.
        window.setTimeout(() => chooseVoie(chosen, data.reason || null), 1800);
      }
    } catch { /* silencieux : la carte reste disponible */ }
    finally { setDestinyLoading(false); }
  }, [obstacle, voies, destinyLoading, destiny, lang, chooseVoie]);

  // Focus : après le 2ᵉ tirage, on vient se poser pile sur l'analyse de la
  // Solution (la frappe « ciel déchiré » est déjà finie à ce moment-là).
  useEffect(() => {
    if (step === 'solution_done' && solutionRef.current) {
      const t = setTimeout(() => solutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <DiceBackground starry starryVariant="silver">
      <YiSlideNav />
      <DiceTitle title={t('des.obstacle.title')} />

      {/* Fil d'étapes (une ligne, auto-fit) : Confier › Obstacle › Solution */}
      <DiceSteps
        steps={lang === 'en' ? ['Entrust', 'Obstacle', 'Solution'] : ['Confier', 'Obstacle', 'Solution']}
        current={step === 'intro' ? 0 : step === 'obstacle_roll' || step === 'obstacle_done' ? 1 : 2}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Question sauvegardée affichée en permanence après enregistrement
            (une seule ligne — tap pour la modale qui l'affiche en entier) */}
        {question && (
          <OneLineQuestion
            className="mx-auto mb-4 max-w-xl text-sm italic leading-relaxed"
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              color: DICE_THEME.ocreLight,
              textShadow: '0 0 10px rgba(232,198,106,0.25)',
            }}
            text={question}
          />
        )}

        {/* ════════════ INTRO — Obstacle : thème OU question (obligatoire) ════════════ */}
        {step === 'intro' && (
          <div className="mt-6">
            <DiceLaunchCard
              title={t('des.obstacle.readObstacle')}
              placeholder={t('des.obstacle.askFirst')}
              instruct={t('des.obstacle.instructFirst')}
              draft={questionDraft}
              setDraft={setQuestionDraft}
              onLaunch={(qq) => {
                setQuestion(qq);
                questionRef.current = qq;
                rollObstacle();
                setTimeout(scrollToCup, 700);
              }}
            />
          </div>
        )}

        {/* ════════════ GOBELET + TUTORIEL ════════════ */}
        {(step === 'obstacle_roll' || step === 'solution_roll') && (
          <div ref={cupAreaRef}>
            <div
              ref={cupRef}
              style={{
                height: cupH,
                opacity: ready ? 1 : 0,
                transition: 'opacity 450ms ease',
              }}
            >
              <AstroDiceCup
                key={resetSignal}
                targetFaces={faces}
                skin="moon"
                height={cupH}
                lockScroll
                onRest={handleRest}
                onReady={() => setReady(true)}
                resetSignal={resetSignal}
                launchSignal={0}
                onShake={() => setShowTutorial(false)}
                strikeSound={{ key: 'animation-zodiac-obstacle', ms: 4040 }}
              />
            </div>
            {/* Tutoriel — rendu partagé (référence /choix) */}
            <DiceTutorial show={showTutorial} boxRef={tutorialRef} text={t('des.choix.tutorial')} />
          </div>
        )}

        {/* ════════════ RÉSULTAT OBSTACLE (pilule cliquable + analyse) ════════════ */}
        <AnimatePresence>
          {obstacle && step !== 'obstacle_roll' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                {t('des.obstacle.readObstacle')}
              </p>
              <div className="mb-1"><ClickableFaces faces={obstacle} /></div>
              <DiceAnalysis
                faces={obstacle}
                question={questionRef.current}
                spread="Obstacle"
                onInterpretationReady={setShortObstacle}
                onDeepAnalysisReady={setDeepObstacle}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ LES VOIES — l'oracle trace la sortie de l'Obstacle ════════════ */}
        <AnimatePresence>
          {step === 'obstacle_done' && obstacle && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="mt-8"
            >
              <div
                className="mx-auto max-w-2xl rounded-3xl p-5 sm:p-7"
                style={{
                  background: 'linear-gradient(165deg, rgba(20,36,90,0.94) 0%, rgba(10,20,48,0.96) 55%, rgba(4,6,15,0.97) 100%)',
                  border: '1.5px solid rgba(212,175,55,0.45)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.65), inset 0 0 46px rgba(212,175,55,0.07)',
                }}
              >
                {/* Fil d'or : de l'obstacle (3 faces) aux voies */}
                <VoiesHeader
                  faces={obstacle}
                  loading={voiesLoading}
                  error={voiesError}
                  lang={lang}
                  onRetry={() => {
                    voiesFetchedRef.current = false;
                    setVoiesError(false);
                  }}
                />

                {voiesLoading && <VoiesCharged lang={lang} />}

                {voiesError && !voiesLoading && (
                  <div className="py-8 text-center">
                    <p className="mb-4 text-sm italic" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#8FA3C8' }}>
                      {lang === 'en' ? 'The stars are momentarily silent…' : 'Les astres se sont tus un instant…'}
                    </p>
                    <DiceButton variant="smallGold" onClick={() => { voiesFetchedRef.current = false; setVoiesError(false); }}>
                      {lang === 'en' ? 'Ask the oracle again' : 'Réinterroger l’oracle'}
                    </DiceButton>
                  </div>
                )}

                {voies && !voiesLoading && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {voies.map((v, i) => <VoieCard key={v.id} voie={v} i={i} chosen={destiny?.id === v.id} reason={destiny?.id === v.id ? destiny.reason : null} dimmed={!!destiny && destiny.id !== v.id} onPick={() => !destiny && chooseVoie(v)} />)}
                    {/* 5ᵉ carte : le choix mystérieux — l'oracle tranche. */}
                    <VoieDestinyCard loading={destinyLoading} disabled={!!destiny} lang={lang} onPick={askDice} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ RÉSULTAT SOLUTION ════════════ */}
        <AnimatePresence>
          {solution && step === 'solution_done' && (
            <motion.div
              ref={solutionRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                {t('des.obstacle.readSolution')}
              </p>
              {questionB && questionB !== question && (
                <OneLineQuestion
                  className="mb-2 text-sm italic"
                  style={{ fontFamily: 'var(--font-cormorant), serif', color: DICE_THEME.glyph }}
                  text={questionB}
                />
              )}
              <div className="mb-1"><ClickableFaces faces={solution} /></div>
              <DiceAnalysis
                faces={solution}
                question={questionBRef.current || questionRef.current}
                spread="Solution"
                onInterpretationReady={setShortSolution}
                onDeepAnalysisReady={setDeepSolution}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ RÉCAPITULATIF FINAL + AUGURE (fin de parcours) ════════════ */}
        <AnimatePresence>
          {step === 'solution_done' && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 mb-10"
            >
              <div
                className="mx-auto max-w-2xl"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.gold}18 0%, ${DICE_THEME.brickDeep} 100%)`,
                  border: `1.5px solid ${DICE_THEME.gold}33`,
                  borderRadius: 20,
                  boxShadow: `inset 0 0 30px ${DICE_THEME.gold}0c`,
                  padding: 24,
                }}
              >
                <h3
                  className="mb-6 text-center text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: DICE_THEME.gold,
                    textShadow: `0 0 20px ${DICE_THEME.gold}44`,
                  }}
                >
                  {t('des.obstacle.recap')}
                </h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  {obstacle && (
                    <RecapCard
                      label={t('des.obstacle.readObstacle')}
                      faces={obstacle}
                      question={questionRef.current}
                      shortInterpretation={shortObstacle}
                    />
                  )}
                  {solution && (
                    <RecapCard
                      label={t('des.obstacle.readSolution')}
                      faces={solution}
                      question={questionBRef.current}
                      shortInterpretation={shortSolution}
                    />
                  )}
                </div>

                {/* ✶ L'Augure — SEULEMENT ici, en fin de parcours : le sceau
                    n'apparaît qu'après les DEUX tirages analysés, et son
                    prompt reçoit l'obstacle ET la solution. */}
                {readingId && (shortObstacle || deepObstacle) && (shortSolution || deepSolution) && (
                  <div className="mt-2">
                    <EchoBox
                      domain="des"
                      readingId={readingId}
                      question={questionRef.current}
                      summary={[
                        `Obstacle — « ${questionRef.current || '—'} » : ${(shortObstacle || '').slice(0, 260)}${deepObstacle ? ` [analyse : ${deepObstacle.slice(0, 240)}…]` : ''}`,
                        `Solution — « ${questionBRef.current || '—'} » : ${(shortSolution || '').slice(0, 260)}${deepSolution ? ` [analyse : ${deepSolution.slice(0, 240)}…]` : ''}`,
                      ].join(' || ')}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DiceBackground>
  );
}

export default function GatedPage() {
  return <AuthGate><ObstacleSolutionPage /></AuthGate>;
}
