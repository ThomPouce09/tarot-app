'use client';

// app/des-divinatoires/obstacle-solution/page.tsx — Niveau 2.3 : Obstacle & Solution
// Intègre le gobelet (AstroDiceCup) au geste, comme sur /choix et /affinage,
// en gardant les specs : 2 lancers (Obstacle → Solution) chacun avec sa
// légende de lecture (ReadingLegend) personnalisée.

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
  ResultLine,
  ReadingLegend,
  DiceAnalysis,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../_shared';
import { randomTargetFaces, type TargetFaces, type DieKind } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { saveReading } from '@/lib/save-reading';
import { useT } from '@/lib/i18n';

const AstroDiceCup = dynamic(
  () => import('@/components/astro-dice').then((m) => m.AstroDiceCup),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{ height: 440, background: '#1a0e0a', color: DICE_THEME.ocreLight }}
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

// Les 3 dés sont toujours lancés (Planète / Signe / Maison).
const ACTIVE_DICE: DieKind[] = ['planet', 'sign', 'house'];

// Helpers de sérialisation pour l'historique (dés du zodiaque).
function diceCards(f: TargetFaces) {
  return ACTIVE_DICE.map((k) => ({
    kind: k,
    value: f[k],
    label: k === 'planet' ? String(f[k]) : k === 'sign' ? String(f[k]) : `Maison ${f[k]}`,
  }));
}
function diceStaticText(f: TargetFaces) {
  return ACTIVE_DICE.map((k) => `${k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison'} ${f[k]} : ${meaningFor(k, f[k])}`).join('\n');
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

export default function ObstacleSolutionPage() {
  const [step, setStep] = useState<Step>('intro');
  const t = useT();
  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 }) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [obstacle, setObstacle] = useState<TargetFaces | null>(null);
  const [solution, setSolution] = useState<TargetFaces | null>(null);
  const [question, setQuestion] = useState<string | null>(null);

  // Interprétation DB (curated, combo planète×signe×maison).
  const [obstacleDbInterpretation, setObstacleDbInterpretation] = useState<string | null>(null);
  const [obstacleDbLoading, setObstacleDbLoading] = useState(false);
  const [solutionDbInterpretation, setSolutionDbInterpretation] = useState<string | null>(null);
  const [solutionDbLoading, setSolutionDbLoading] = useState(false);

  // Cibles de scroll.
  const cupRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null); // bloc Obstacle
  const solutionRef = useRef<HTMLDivElement | null>(null); // bloc Solution
  // Épaisseur du menu fixe en haut → laisser de la marge au scroll.
  const MENU_OFFSET = 90;

  const scrollToCup = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (cupRef.current) {
          const top = cupRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, top - MENU_OFFSET), behavior: 'smooth' });
        }
      }, 60);
    });
  }, []);

  const scrollToEl = useCallback((el: HTMLDivElement | null) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, top - MENU_OFFSET), behavior: 'smooth' });
        }
      }, 60);
    });
  }, []);

  const rollObstacle = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('obstacle_roll');
    scrollToCup();
  }, [scrollToCup]);

  const rollSolution = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('solution_roll');
    setResetSignal((n) => n + 1); // remount propre du gobelet pour le 2e lancer
    scrollToCup();
  }, [scrollToCup]);

  const handleRest = useCallback(
    (f: TargetFaces) => {
      setStep((s) => {
        if (s === 'obstacle_roll') {
          setObstacle(f);
          scrollToEl(resultRef.current);
          // Sauvegarde historique — Obstacle
          saveReading({
            type: 'des-obstacle-solution',
            spread: 'Obstacle',
            cards: diceCards(f),
            interpretation: diceStaticText(f),
            question,
          });
          return 'obstacle_done';
        }
        if (s === 'solution_roll') {
          setSolution(f);
          scrollToEl(solutionRef.current);
          // Sauvegarde historique — Solution
          saveReading({
            type: 'des-obstacle-solution',
            spread: 'Solution',
            cards: diceCards(f),
            interpretation: diceStaticText(f),
            question,
          });
          return 'solution_done';
        }
        return s;
      });
      setQuestion(null);
    },
    [scrollToEl, question],
  );

  const diceVisible = step !== 'intro';

  // ── Fetch DB interpretation après chaque tirage Obstacle ──
  useEffect(() => {
    if (!obstacle) return;
    const planetGlyph = obstacle.planet;
    const signGlyph = obstacle.sign;
    const houseNum = obstacle.house;
    if (!planetGlyph || !signGlyph || !houseNum) return;

    const planet = PLANET_NAMES[planetGlyph as string];
    const sign = SIGN_NAMES[signGlyph as string];
    const house = `Maison ${houseNum}`;
    if (!planet || !sign) return;

    setObstacleDbLoading(true);
    setObstacleDbInterpretation(null);

    fetch('/api/astro-interpretation-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planet, sign, house }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.found && data.interpretation) {
          setObstacleDbInterpretation(data.interpretation);
        }
      })
      .catch(() => {
        // silencieux — la DB est un bonus, pas un blocage
      })
      .finally(() => setObstacleDbLoading(false));
  }, [obstacle]);

  // ── Fetch DB interpretation après chaque tirage Solution ──
  useEffect(() => {
    if (!solution) return;
    const planetGlyph = solution.planet;
    const signGlyph = solution.sign;
    const houseNum = solution.house;
    if (!planetGlyph || !signGlyph || !houseNum) return;

    const planet = PLANET_NAMES[planetGlyph as string];
    const sign = SIGN_NAMES[signGlyph as string];
    const house = `Maison ${houseNum}`;
    if (!planet || !sign) return;

    setSolutionDbLoading(true);
    setSolutionDbInterpretation(null);

    fetch('/api/astro-interpretation-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planet, sign, house }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.found && data.interpretation) {
          setSolutionDbInterpretation(data.interpretation);
        }
      })
      .catch(() => {
        // silencieux — la DB est un bonus, pas un blocage
      })
      .finally(() => setSolutionDbLoading(false));
  }, [solution]);

  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title={t('des.obstacle.title')}
        subtitle={t('des.obstacle.subtitle')}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Question avant le tirage */}
        {step === 'intro' && (
          <AskQuestion onConfirm={setQuestion} accentColor={DICE_THEME.gold} />
        )}
        {/* Étape 1 */}
        <h2
          className="mb-4 text-center text-xl font-bold"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: DICE_THEME.ocreLight,
            textShadow: `0 0 12px ${DICE_THEME.gold}44`,
          }}
        >
          {t('des.obstacle.step1')}
        </h2>

        {step === 'intro' && (
          <div className="pb-6 text-center">
            <DiceButton onClick={rollObstacle}>{t('des.obstacle.cta')}</DiceButton>
          </div>
        )}

        {/* Zone gobelet (partagée par les deux étapes) : monté dès le chargement
            (préchargé INVISIBLE en intro, révélé à onReady) → le lancer se fait
            AU GESTE (secousse / appui) — pas de bouton de lancer automatique. */}
        <div
          ref={cupRef}
          style={{
            height: diceVisible ? 460 : 0,
            opacity: diceVisible && ready ? 1 : 0,
            overflow: 'hidden',
            transition: 'opacity 450ms ease',
            pointerEvents: diceVisible ? 'auto' : 'none',
          }}
        >
          <AstroDiceCup
            key={resetSignal}
            targetFaces={faces}
            skin="moon"
            height={460}
            activeKinds={ACTIVE_DICE}
            onRest={handleRest}
            onReady={() => setReady(true)}
            resetSignal={resetSignal}
            launchSignal={0}
          />
        </div>

        {(step === 'obstacle_roll' || step === 'solution_roll') && (
          <p
            className="mt-3 text-center text-xs italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.7 }}
          >
            ✋ Secouez le gobelet puis poussez vers le haut (ou appuyez) pour lancer les dés.
          </p>
        )}

        {/* Résultat + légende de l'obstacle */}
        <AnimatePresence>
          {obstacle &&
            (step === 'obstacle_done' ||
              step === 'solution_roll' ||
              step === 'solution_done') && (
              <motion.div
                ref={resultRef}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <ResultLine faces={obstacle} />
                <div className="mt-4">
                  <OcreCard title={t('des.obstacle.readObstacle')}>
                    <ReadingLegend items={OBSTACLE_LEGEND} />
                  </OcreCard>
                </div>
                <DiceAnalysis faces={obstacle} activeKinds={ACTIVE_DICE} mode="obstacle-solution" kind="obstacle" question={question} dbInterpretation={obstacleDbInterpretation} />

                {/* ── Carte DB — interprétation combinée Obstacle ── */}
                {obstacleDbLoading && (
                  <div
                    className="mt-4 text-center text-xs italic"
                    style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.6 }}
                  >
                    Recherche de l'interprétation…
                  </div>
                )}
                {obstacleDbInterpretation && !obstacleDbLoading && (
                  <div
                    className="mt-5 rounded-2xl p-4"
                    style={{
                      background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
                      border: `1.5px solid ${DICE_THEME.gold}66`,
                      boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
                    }}
                  >
                    <p
                      className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                    >
                      Interprétation combinée
                    </p>
                    <p
                      className="text-center text-sm leading-relaxed"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
                    >
                      {obstacleDbInterpretation}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
        </AnimatePresence>

        {/* Étape 2 : apparaît après le 1er lancer */}
        <AnimatePresence>
          {(step === 'obstacle_done' ||
            step === 'solution_roll' ||
            step === 'solution_done') && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10"
            >
              <h2
                className="mb-4 text-center text-xl font-bold"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: DICE_THEME.ocreLight,
                  textShadow: `0 0 12px ${DICE_THEME.gold}44`,
                }}
              >
                {t('des.obstacle.step2')}
              </h2>

              {step === 'obstacle_done' && (
                <div className="pb-2 text-center">
                  <DiceButton variant="ocre" onClick={rollSolution}>
                    {t('des.obstacle.ctaSolution')}
                  </DiceButton>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Résultat + légende de la solution */}
        <AnimatePresence>
          {solution && step === 'solution_done' && (
            <motion.div
              ref={solutionRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <ResultLine faces={solution} />
              <div className="mt-4">
                <OcreCard title={t('des.obstacle.readSolution')}>
                  <ReadingLegend items={SOLUTION_LEGEND} />
                </OcreCard>
              </div>
              <DiceAnalysis faces={solution} activeKinds={ACTIVE_DICE} mode="obstacle-solution" kind="solution" question={question} dbInterpretation={solutionDbInterpretation} />

              {/* ── Carte DB — interprétation combinée Solution ── */}
              {solutionDbLoading && (
                <div
                  className="mt-4 text-center text-xs italic"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.6 }}
                >
                  Recherche de l'interprétation…
                </div>
              )}
              {solutionDbInterpretation && !solutionDbLoading && (
                <div
                  className="mt-5 rounded-2xl p-4"
                  style={{
                    background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
                    border: `1.5px solid ${DICE_THEME.gold}66`,
                    boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
                  }}
                >
                  <p
                    className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                    style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                  >
                    Interprétation combinée
                  </p>
                  <p
                    className="text-center text-sm leading-relaxed"
                    style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
                  >
                    {solutionDbInterpretation}
                  </p>
                </div>
              )}

              <div className="mt-8 text-center">
                <DiceButton
                  onClick={() => {
                    setObstacle(null);
                    setSolution(null);
                    setQuestion(null);
                    setStep('intro');
                  }}
                >
                  {t('des.obstacle.retry')}
                </DiceButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </DiceBackground>
  );
}
