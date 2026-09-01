'use client';

// app/des-divinatoires/obstacle-solution/page.tsx
// Inspiré de /choix — tirage en 2 lancers fusionnés dans un seul enregistrement historique

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import { AskQuestion } from '@/components/ask-question';
import {
  DiceBackground,
  DiceTitle,
  DiceButton,
  OcreCard,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../_shared';
import { randomTargetFaces, type TargetFaces, type DieKind } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { saveReading, updateReading } from '@/lib/save-reading';
import { nextRaceSeq } from '@/lib/race-guard';
import AnalysisWaitCard from '@/components/analysis-wait-card';
import { useT, useLang } from '@/lib/i18n';
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

type Step =
  | 'intro'
  | 'obstacle_roll'
  | 'obstacle_done'
  | 'solution_roll'
  | 'solution_done';

const ACTIVE_DICE: DieKind[] = ['planet', 'sign', 'house'];

function diceCards(f: TargetFaces) {
  return ACTIVE_DICE.map((k) => ({
    kind: k,
    value: f[k],
    label: k === 'planet' ? String(f[k]) : k === 'sign' ? String(f[k]) : `Maison ${f[k]}`,
  }));
}
function diceStaticText(f: TargetFaces) {
  return ACTIVE_DICE.map((k) =>
    `${k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison'} ${f[k]} : ${meaningFor(k, f[k])}`
  ).join('\n');
}

// Rendu markdown simplifié (**bold**, ## titres)
function inlineMd(s: string): React.ReactNode {
  // **bold** first, then *italic*
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#87CEEB' }}>{part.slice(2, -2)}</strong>;
    }
    // Handle *italic* inside non-bold segments
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
      elements.push(<h3 key={key++} className="text-sm font-bold uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#c9a75b', textShadow: '0 0 8px rgba(201,167,91,0.2)', letterSpacing: '0.08em' }}>{inlineMd(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h4 key={key++} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#D4A574' }}>{inlineMd(trimmed.slice(2))}</h4>);
    } else {
      elements.push(<p key={key++} className="mb-1 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.7 }}>{inlineMd(trimmed || '\u00A0')}</p>);
    }
  }
  return elements;
}

const OBSTACLE_LEGEND = [
  { die: 'Planète' as const, text: 'L’énergie que vous utilisez mal ou qui vous submerge.' },
  { die: 'Signe' as const, text: 'L’attitude inadaptée (trop passive, trop agressive, etc.).' },
  { die: 'Maison' as const, text: 'Le domaine d’où provient la perturbation.' },
];

const SOLUTION_LEGEND = [
  { die: 'Planète' as const, text: 'La force intérieure à réveiller et à utiliser.' },
  { die: 'Signe' as const, text: 'La posture juste ou le comportement idéal à incarner.' },
  { die: 'Maison' as const, text: 'Le levier d’action concret sur lequel vous appuyer.' },
];

// ── Composant DiceAnalysis interne ──
function DiceAnalysis({
  faces,
  activeKinds,
  question,
  spread,
  readingId,
  onInterpretationReady,
  onInterpretationLoading,
  onDeepAnalysisReady,
}: {
  faces: TargetFaces;
  activeKinds: DieKind[];
  question?: string | null;
  spread?: string;
  readingId?: string | null;
  onInterpretationReady?: (interp: string | null) => void;
  onInterpretationLoading?: (loading: boolean) => void;
  onDeepAnalysisReady?: (analysis: string | null) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const deepRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (deepAnalysis && deepRef.current) {
      setTimeout(() => deepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [deepAnalysis]);

  // Analyse approfondie
  // Guard anti-course : seule la dernière exécution peut écrire l'état
  // (double clic, StrictMode dev, relance) — une réponse tardive ne doit
  // jamais écraser une réponse plus récente.
  const deepLastSeqRef = useRef(0);
  const runDeep = useCallback(async () => {
    const seq = nextRaceSeq();
    deepLastSeqRef.current = seq;
    setDeepLoading(true);
    setDeepAnalysis(null);
    try {
      const planet = PLANET_NAMES[faces.planet as string];
      const sign = SIGN_NAMES[faces.sign as string];
      const house = `Maison ${faces.house}`;
      if (!planet || !sign) { if (seq === deepLastSeqRef.current) setDeepAnalysis('Indisponible.'); return; }
      const res = await fetch('/api/astro-interpretation-obstacle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planet, sign, house, question, kind: spread, mode: 'deep', lang }),
      });
      const data = await res.json();
      if (seq !== deepLastSeqRef.current) return; // réponse obsolète → ignorer
      if (data.analysis) {
        setDeepAnalysis(data.analysis);
        onDeepAnalysisReady?.(data.analysis);
      } else {
        setDeepAnalysis('Indisponible.');
      }
    } catch { if (seq === deepLastSeqRef.current) setDeepAnalysis('Indisponible.'); }
    finally { if (seq === deepLastSeqRef.current) setDeepLoading(false); }
  }, [faces, question, spread, lang]);

  // Interprétation courte : LLM d'abord, DB en fallback
  // Guard anti-course : seul le dernier lancement peut écrire l'état.
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
    onInterpretationLoading?.(true);

    (async () => {
      // 1) LLM court
      try {
        const res = await fetch('/api/astro-interpretation-obstacle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house, question, kind: spread, mode: 'short', lang }),
        });
        const data = await res.json();
        if (seq !== shortLastSeqRef.current) return; // réponse obsolète → ignorer
        if (data.interpretation) {
          setDbInterpretation(data.interpretation);
          onInterpretationReady?.(data.interpretation);
          setDbLoading(false);
          onInterpretationLoading?.(false);
          return;
        }
      } catch { /* fallback DB */ }

      // 2) Fallback DB
      try {
        const res = await fetch('/api/astro-interpretation-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house }),
        });
        const data = await res.json();
        if (seq !== shortLastSeqRef.current) return; // réponse obsolète → ignorer
        if (data.found && data.interpretation) {
          setDbInterpretation(data.interpretation);
          onInterpretationReady?.(data.interpretation);
          onInterpretationLoading?.(false);
          setDbLoading(false);
          return;
        }
      } catch { /* silencieux */ }
      if (seq === shortLastSeqRef.current) {
        setDbLoading(false);
        onInterpretationLoading?.(false);
      }
    })();
  }, [faces, question, spread, lang]);

  return (
    <div className="mt-4 space-y-3">
      {/* Keyframes partagées (attente courte + approfondie) — toujours rendues */}
      <style>{`
        @keyframes oracle-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes oracle-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes oracle-dot {
          0%, 20% { opacity: 0; }
          40% { opacity: 1; }
          100% { opacity: 1; }
        }
        .oracle-loader-dot { display: inline-block; animation: oracle-dot 1.4s infinite; }
        .oracle-loader-dot:nth-child(2) { animation-delay: 0.2s; }
        .oracle-loader-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      {/* Analyse approfondie */}
      <div ref={deepRef}>
        {!deepLoading && !deepAnalysis && (
          <div className="text-center">
            <DiceButton variant="gold" onClick={runDeep}>
              🔮 Analyse approfondie Oracle
            </DiceButton>
          </div>
        )}
        {deepLoading && !deepAnalysis && (
          <AnalysisWaitCard
            accent="#c4a0e0"
            title={
              <>
                Consultation de l'Oracle
                <span className="oracle-loader-dot">.</span>
                <span className="oracle-loader-dot">.</span>
                <span className="oracle-loader-dot">.</span>
              </>
            }
            videoPrefix="analyse-des-zodiaque"
          />
        )}
        {deepAnalysis && deepAnalysis !== 'Indisponible.' && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(147,112,219,0.08), rgba(46,134,193,0.12))',
              border: '1px solid rgba(147,112,219,0.3)',
            }}
          >
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider"
               style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#c4a0e0' }}>
              Analyse approfondie Oracle
            </p>
            <div className="text-sm leading-relaxed"
                 style={{ color: '#e0d0f0' }}>
              {md(deepAnalysis)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page principale ──
function ObstacleSolutionPage() {
  const [step, setStep] = useState<Step>('intro');
  const t = useT();

  // Résultats des dés
  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 }) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  // Etat Obstacle / Solution
  const [obstacle, setObstacle] = useState<TargetFaces | null>(null);
  const [solution, setSolution] = useState<TargetFaces | null>(null);
  const obstacleRef = useRef<TargetFaces | null>(null);
  const [question, setQuestion] = useState<string | null>(null);

  // Interprétations LLM courtes
  const [shortObstacle, setShortObstacle] = useState<string | null>(null);
  const [shortSolution, setShortSolution] = useState<string | null>(null);
  const [obstacleLoading, setObstacleLoading] = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [openedCard, setOpenedCard] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [qText, setQText] = useState('');

  // Analyses approfondies
  const [deepObstacle, setDeepObstacle] = useState<string | null>(null);
  const [deepSolution, setDeepSolution] = useState<string | null>(null);

  // Sauvegarde centralisée
  const readingIdRef = useRef<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const savedObstacleRef = useRef(false);
  const savedSolutionRef = useRef(false);

  // Refs de scroll
  const cupAreaRef = useRef<HTMLDivElement | null>(null);
  const cupRef = useRef<HTMLDivElement | null>(null);
  const obstacleRefEl = useRef<HTMLDivElement | null>(null);
  const solutionRefEl = useRef<HTMLDivElement | null>(null);
  const tutorialRef = useRef<HTMLDivElement | null>(null);

  const MENU_OFFSET = 90;

  const scrollToCup = useCallback(() => {
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        if (cupRef.current) {
          const top = cupRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, top - MENU_OFFSET), behavior: 'smooth' });
        } else if (cupAreaRef.current) {
          cupAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    });
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
    setReady(false);
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
            question,
          }).then((id) => { if (id) { setReadingId(id); readingIdRef.current = id; } });
        }
        return 'obstacle_done';
      }
      if (s === 'solution_roll') {
        setSolution(f);
        if (!savedSolutionRef.current) {
          savedSolutionRef.current = true;
          // deferred to useEffect below (waits for readingId)
        }
        return 'solution_done';
      }
      return s;
    });
  }, [question]);

  // Scroll vers le résultat après obstacle_done
  useEffect(() => {
    if (step === 'obstacle_done' && obstacleRefEl.current) {
      setTimeout(() => obstacleRefEl.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [step]);

  // Scroll vers la zone solution après solution_done
  useEffect(() => {
    if (step === 'solution_done' && solutionRefEl.current) {
      setTimeout(() => solutionRefEl.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [step]);

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

  // ── Sauvegarde centralisée : interprétations courtes ──
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

  // ── Sauvegarde centralisée : analyses approfondies ──
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

  const restart = useCallback(() => {
    setObstacle(null);
    setSolution(null);
    setQuestion(null);
    setReady(false);
    setResetSignal((n) => n + 1);
    setStep('intro');
    setShortObstacle(null);
    setShortSolution(null);
    setObstacleLoading(false);
    setSolutionLoading(false);
    setOpenedCard(null);
    setShowTutorial(false);
    setDeepObstacle(null);
    setDeepSolution(null);
    savedObstacleRef.current = false;
    savedSolutionRef.current = false;
    combinedSavedRef.current = false;
    readingIdRef.current = null;
    setReadingId(null);
    obstacleRef.current = null;
  }, []);

  const cupVisible = step !== 'intro';

  return (
    <DiceBackground starry starryVariant="silver">
      <YiSlideNav />
      <DiceTitle
        title={t('des.obstacle.title')}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* ── Intro : Obstacle ── */}
        {step === 'intro' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 rounded-2xl border p-5 text-center"
            style={{ borderColor: 'rgba(218,165,32,0.35)' }}
          >
            <h2 className="text-xl font-bold mb-2"
                style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520' }}>
              Obstacle
            </h2>
            <p className="text-sm mb-4 max-w-md mx-auto"
               style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', opacity: 0.85, lineHeight: 1.6 }}>
              {t('des.obstacle.subtitle')}
            </p>
            <input
              type="text"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Garder en mémoire votre question"
              className="w-full max-w-sm rounded-lg px-4 py-2 text-sm mx-auto mb-4"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(218,165,32,0.4)',
                color: '#f0e6d3',
                fontFamily: 'var(--font-cormorant), serif',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setQuestion(qText.trim() || null);
                  rollObstacle();
                }
              }}
            />
            <button
              onClick={() => { setQuestion(qText.trim() || null); rollObstacle(); }}
              className="rounded-full px-6 py-3 text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: '#005f6a',
                color: '#fff',
                fontFamily: 'var(--font-cinzel), serif',
                boxShadow: '0 0 12px rgba(0,95,106,0.5)',
              }}
            >
              Enregistrer et lancer les dés zodiacaux
            </button>
            <p className="text-sm mt-5 mb-2" style={{ color: '#F0E6D3', opacity: 0.6, fontFamily: 'var(--font-cinzel), serif', fontWeight: 700 }}>
              — OU —
            </p>
            <p className="text-sm mb-4 max-w-xs mx-auto" style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', opacity: 0.8, fontStyle: 'italic', lineHeight: 1.5 }}>
              Concentrez-vous sur l'obstacle qui vous préoccupe et lancez directement les dés
            </p>
            <button
              onClick={() => { setQuestion(null); rollObstacle(); }}
              className="rounded-full px-8 py-3.5 text-base font-bold transition-all hover:opacity-80"
              style={{
                background: '#005f6a',
                color: '#fff',
                fontFamily: 'var(--font-cinzel-deco), serif',
                boxShadow: '0 0 24px rgba(0,95,106,0.45)',
                border: '1px solid rgba(0,95,106,0.6)',
              }}
            >
              Lancer les dés zodiacaux
            </button>
          </motion.div>
        )}



        {/* Gobelet */}
        <div
          ref={cupRef}
          style={{
            height: cupVisible ? 460 : 0,
            opacity: cupVisible && ready ? 1 : 0,
            overflow: 'hidden',
            transition: 'opacity 450ms ease',
            pointerEvents: cupVisible ? 'auto' : 'none',
          }}
        >
          <AstroDiceCup
            key={resetSignal}
            targetFaces={faces}
            skin={{ body: '#000000', edges: '#DAA520', glyph: '#e8c87a', mat: '#0a0a14', accent: '#DAA520', shadow: '#000000' }}
            height={460}
            activeKinds={ACTIVE_DICE}
            onRest={handleRest}
            onReady={() => setReady(true)}
            resetSignal={resetSignal}
            launchSignal={0}
            onShake={() => setShowTutorial(false)}
            lockScroll={step === 'obstacle_roll' || step === 'solution_roll'}
          />
        </div>

        {/* Tutoriel en dessous du gobelet */}
        <div
          ref={tutorialRef}
          className="flex flex-col items-center transition-opacity duration-300"
          style={{
            marginTop: 24,
            opacity: showTutorial ? 1 : 0,
            pointerEvents: showTutorial ? 'auto' : 'none',
          }}
        >
          <style>{`
            @keyframes swipe-shake-obstacle {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-16px); }
              75% { transform: translateX(16px); }
            }
            .swipe-icon-obstacle {
              animation: swipe-shake-obstacle 0.6s ease-in-out infinite;
              font-size: 28px;
              line-height: 1;
              color: #87CEEB;
              opacity: 0.5;
              user-select: none;
              -webkit-user-select: none;
            }
          `}</style>
          <svg className="swipe-icon-obstacle" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#87CEEB" d="M9.5 1C8.67 1 8 1.67 8 2.5v7.38l-1.7-.85c-.3-.15-.65-.2-1-.15a1.5 1.5 0 0 0-1.3 1.3c-.15.65.05 1.3.5 1.75l4.35 4.35c.3.3.7.45 1.15.45H18c1.1 0 2-.9 2-2V9.5c0-.65-.45-1.2-1.05-1.4l-5.1-1.85c-.15-.05-.3-.05-.45-.05-.15 0-.3.05-.45.1l-.95.4V2.5C12 1.67 11.33 1 10.5 1h-1Z" opacity="0.6"/>
                <path fill="#87CEEB" d="m17.5 14.5-2.12-1.06c-.2-.1-.44-.14-.67-.11l-1.83.35.88-3.53a1.25 1.25 0 0 0-.88-1.5c-.65-.18-1.3.2-1.48.85l-1.4 5.6-2.1-1.05.3 1.5 3.5 1.75c.3.15.65.2 1 .15H16c.65 0 1.2-.45 1.4-1.05l.35-1.05c.08-.25.05-.52-.08-.75l-.17-.15Z" opacity="0.4"/>
              </svg>
          <p
            className="text-center leading-tight"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.5rem',
              maxWidth: 120,
              lineHeight: 1.2,
            }}
          >
            Secouez le gobelet pour mélanger les dés, puis poussez vers le haut pour les jeter
          </p>
        </div>

        {/* ── Résultat Obstacle ── */}
        <AnimatePresence>
          {obstacle && (step === 'obstacle_done' || step === 'solution_roll' || step === 'solution_done') && (
            <motion.div
              ref={obstacleRefEl}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(139,0,0,0.08), rgba(46,134,193,0.08))',
                border: '1px solid rgba(139,0,0,0.3)',
              }}
            >
              <h3 className="text-center text-base font-bold mb-3"
                  style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#D4A574' }}>
                ⚔═══ Obstacle ═══
              </h3>
              <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {(['planet','sign','house'] as const).map(k => {
                  const labels: Record<string,string> = { planet: 'Planète', sign: 'Signe', house: 'Maison' };
                  const val = obstacle[k];
                  return (
                    <div key={k} className="flex flex-col items-center rounded-xl p-3 text-center"
                         style={{ background: '#1a1a1a', border: '1px solid #DAA520' }}>
                      <div className="text-3xl leading-none" style={{ color: '#e8c87a' }}>{val}</div>
                      <div className="mt-1.5 text-[10px] uppercase tracking-widest" style={{ color: '#DAA520', opacity: 0.7 }}>{labels[k]}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <OcreCard title={t('des.obstacle.readObstacle')}>
                  <ul className="mx-auto max-w-xl space-y-3">
                    {(['planet','sign','house'] as const).map((k, idx) => {
                      const drawn = obstacle;
                      const val = k === 'house' ? String(drawn.house) : (k === 'planet' ? (PLANET_NAMES[drawn.planet as string] || drawn.planet) : (SIGN_NAMES[drawn.sign as string] || drawn.sign));
                      const gly = k === 'house' ? String(drawn.house) : (drawn[k] as string);
                      const showInfo = idx === openedCard;
                      const label = k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison';
                      const legendText = OBSTACLE_LEGEND[k === 'planet' ? 0 : k === 'sign' ? 1 : 2].text;
                      return (
                        <li key={k}>
                          <div className="flex items-center gap-3 rounded-xl p-3 text-center"
                               style={{ background: '#1a1a1a', border: '1px solid #DAA520' }}>
                            <div className="flex flex-col items-center min-w-[48px]">
                              <div className="text-2xl leading-none" style={{ color: '#e8c87a' }}>{gly}</div>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-xs font-semibold" style={{ color: '#DAA520' }}>{label}</div>
                              <div className="text-xs" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cormorant), serif', lineHeight: 1.4 }}>{val}</div>
                              <div className="text-[11px] italic" style={{ color: '#c9a75b', fontFamily: 'var(--font-cormorant), serif', lineHeight: 1.3, marginTop: 2 }}>{meaningFor(k, drawn[k])}</div>
                            </div>
                            <button onClick={() => setOpenedCard(showInfo ? null : idx)}
                                    className="shrink-0 rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold transition-opacity hover:opacity-100"
                                    style={{ background: '#DAA52033', color: '#DAA520', border: '1px solid #DAA52066', opacity: showInfo ? 1 : 0.6 }}>
                              {showInfo ? '✕' : 'ℹ'}
                            </button>
                          </div>
                          {showInfo && (
                            <div className="mt-1.5 mx-3 text-xs leading-relaxed" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cinzel), serif', opacity: 0.8, fontStyle: 'italic', lineHeight: 1.5 }}>
                              {legendText}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {obstacleLoading && (
                    <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid rgba(218,165,32,0.2)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#F0E6D3', fontSize: 13 }}>
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Interprétation en cours…
                      </span>
                    </div>
                  )}
                  {shortObstacle && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(218,165,32,0.2)' }}>
                      <p className="text-center text-xs font-bold uppercase tracking-wider mb-2"
                         style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#F0E6D3' }}>
                        【Résumé du tirage】
                      </p>
                      <div className="text-sm leading-relaxed text-center"
                           style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.75 }}>
                        {md(shortObstacle || '')}
                      </div>
                    </div>
                  )}
                </OcreCard>
              </div>
              <DiceAnalysis
                faces={obstacle}
                activeKinds={ACTIVE_DICE}
                question={question}
                spread="Obstacle"
                readingId={readingId}
                onInterpretationReady={setShortObstacle}
                onInterpretationLoading={setObstacleLoading}
                onDeepAnalysisReady={setDeepObstacle}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Étape 2 : Solution ── */}
        <AnimatePresence>
          {(step === 'obstacle_done' || step === 'solution_roll' || step === 'solution_done') && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10"
            >
              <h2 className="mb-4 text-center text-xl font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: '#D4A574',
                    textShadow: '0 0 12px rgba(212,165,116,0.25)',
                  }}>
                {t('des.obstacle.step2')}
              </h2>

              {step === 'obstacle_done' && (
                <div className="pb-2 text-center">
                  <DiceButton variant="blueLight" onClick={rollSolution}>
                    Lancer les dés zodiacaux
                  </DiceButton>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Résultat Solution ── */}
        <AnimatePresence>
          {solution && step === 'solution_done' && (
            <motion.div
              ref={solutionRefEl}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(46,134,193,0.12), rgba(0,86,179,0.08))',
                border: '1px solid rgba(46,134,193,0.35)',
              }}
            >
              <h3 className="text-center text-base font-bold mb-3"
                  style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#87CEEB' }}>
                🛡═══ Solution ═══
              </h3>
              <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {(['planet','sign','house'] as const).map(k => {
                  const labels: Record<string,string> = { planet: 'Planète', sign: 'Signe', house: 'Maison' };
                  const val = solution[k];
                  return (
                    <div key={k} className="flex flex-col items-center rounded-xl p-3 text-center"
                         style={{ background: '#1a1a1a', border: '1px solid #DAA520' }}>
                      <div className="text-3xl leading-none" style={{ color: '#e8c87a' }}>{val}</div>
                      <div className="mt-1.5 text-[10px] uppercase tracking-widest" style={{ color: '#DAA520', opacity: 0.7 }}>{labels[k]}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <OcreCard title={t('des.obstacle.readSolution')}>
                  <ul className="mx-auto max-w-xl space-y-3">
                    {(['planet','sign','house'] as const).map((k, idx) => {
                      const drawn = solution!;
                      const val = k === 'house' ? String(drawn.house) : (k === 'planet' ? (PLANET_NAMES[drawn.planet as string] || drawn.planet) : (SIGN_NAMES[drawn.sign as string] || drawn.sign));
                      const gly = k === 'house' ? String(drawn.house) : (drawn[k] as string);
                      const showInfo = idx === openedCard;
                      const label = k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison';
                      const legendText = SOLUTION_LEGEND[k === 'planet' ? 0 : k === 'sign' ? 1 : 2].text;
                      return (
                        <li key={k}>
                          <div className="flex items-center gap-3 rounded-xl p-3 text-center"
                               style={{ background: '#1a1a1a', border: '1px solid #87CEEB' }}>
                            <div className="flex flex-col items-center min-w-[48px]">
                              <div className="text-2xl leading-none" style={{ color: '#87CEEB' }}>{gly}</div>
                            </div>
                            <div className="flex-1 text-left">
                              <div className="text-xs font-semibold" style={{ color: '#87CEEB' }}>{label}</div>
                              <div className="text-xs" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cormorant), serif', lineHeight: 1.4 }}>{val}</div>
                              <div className="text-[11px] italic" style={{ color: '#87CEEB', fontFamily: 'var(--font-cormorant), serif', lineHeight: 1.3, marginTop: 2 }}>{meaningFor(k, drawn[k])}</div>
                            </div>
                            <button onClick={() => setOpenedCard(showInfo ? null : idx)}
                                    className="shrink-0 rounded-full w-5 h-5 flex items-center justify-center text-[11px] font-bold transition-opacity hover:opacity-100"
                                    style={{ background: '#87CEEB33', color: '#87CEEB', border: '1px solid #87CEEB66', opacity: showInfo ? 1 : 0.6 }}>
                              {showInfo ? '✕' : 'ℹ'}
                            </button>
                          </div>
                          {showInfo && (
                            <div className="mt-1.5 mx-3 text-xs leading-relaxed" style={{ color: '#F0E6D3', fontFamily: 'var(--font-cinzel), serif', opacity: 0.8, fontStyle: 'italic', lineHeight: 1.5 }}>
                              {legendText}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {solutionLoading && (
                    <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid rgba(46,134,193,0.2)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#F0E6D3', fontSize: 13 }}>
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Interprétation en cours…
                      </span>
                    </div>
                  )}
                  {shortSolution && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(46,134,193,0.2)' }}>
                      <p className="text-center text-xs font-bold uppercase tracking-wider mb-2"
                         style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#F0E6D3' }}>
                        【Résumé du tirage】
                      </p>
                      <div className="text-sm leading-relaxed text-center"
                           style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.75 }}>
                        {md(shortSolution || '')}
                      </div>
                    </div>
                  )}
                </OcreCard>
              </div>
              <DiceAnalysis
                faces={solution}
                activeKinds={ACTIVE_DICE}
                question={question}
                spread="Solution"
                readingId={readingId}
                onInterpretationReady={setShortSolution}
                onInterpretationLoading={setSolutionLoading}
                onDeepAnalysisReady={setDeepSolution}
              />


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
