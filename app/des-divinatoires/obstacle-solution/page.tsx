'use client';

// app/des-divinatoires/obstacle-solution/page.tsx — Niveau 2.3 : Obstacle & Solution

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  DiceBackground,
  DiceTitle,
  DiceButton,
  OcreCard,
  ResultLine,
  ReadingLegend,
  BackToHub,
  DICE_THEME,
} from '../_shared';
import { randomTargetFaces, type TargetFaces } from '@/components/astro-dice';

const AstroDiceSet = dynamic(
  () => import('@/components/astro-dice').then((m) => m.AstroDiceSet),
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

const OBSTACLE_LEGEND = [
  { die: 'Planète' as const, text: 'L\u2019énergie que vous utilisez mal ou qui vous submerge.' },
  { die: 'Signe' as const, text: 'L\u2019attitude inadaptée (trop passive, trop agressive, etc.).' },
  { die: 'Maison' as const, text: 'Le domaine d\u2019où provient la perturbation.' },
];

const SOLUTION_LEGEND = [
  { die: 'Planète' as const, text: 'La force intérieure à réveiller et à utiliser.' },
  { die: 'Signe' as const, text: 'La posture juste ou le comportement idéal à incarner.' },
  { die: 'Maison' as const, text: 'Le levier d\u2019action concret sur lequel vous appuyer.' },
];

export default function ObstacleSolutionPage() {
  const [step, setStep] = useState<Step>('intro');
  const [faces, setFaces] = useState<TargetFaces>(() => randomTargetFaces());
  const [isRolling, setIsRolling] = useState(false);
  const [obstacle, setObstacle] = useState<TargetFaces | null>(null);
  const [solution, setSolution] = useState<TargetFaces | null>(null);

  const rollObstacle = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('obstacle_roll');
    requestAnimationFrame(() => setIsRolling(true));
  }, []);

  const rollSolution = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('solution_roll');
    requestAnimationFrame(() => setIsRolling(true));
  }, []);

  const handleRest = useCallback((f: TargetFaces) => {
    setIsRolling(false);
    setStep((s) => {
      if (s === 'obstacle_roll') {
        setObstacle(f);
        return 'obstacle_done';
      }
      if (s === 'solution_roll') {
        setSolution(f);
        return 'solution_done';
      }
      return s;
    });
  }, []);

  const diceVisible = step !== 'intro';

  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title="Obstacle & Solution"
        subtitle="Comprenez l'origine d'un blocage, puis obtenez un conseil précis pour le surmonter — en deux lancers."
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Étape 1 */}
        <h2
          className="mb-4 text-center text-xl font-bold"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: DICE_THEME.ocreLight,
            textShadow: `0 0 12px ${DICE_THEME.gold}44`,
          }}
        >
          Étape 1 : Qu&apos;est-ce qui me bloque actuellement ?
        </h2>

        {step === 'intro' && (
          <div className="pb-6 text-center">
            <DiceButton onClick={rollObstacle}>Lancer — L&apos;Obstacle</DiceButton>
          </div>
        )}

        {/* Zone dés (partagée par les deux étapes) : montée dès le chargement de
            la page (préchargée INVISIBLE en intro) → WebGL + police prêts →
            lancer instantané au clic. */}
        <div
          style={{
            height: step === 'intro' ? 0 : 440,
            opacity: step === 'intro' ? 0 : 1,
            overflow: 'hidden',
            transition: 'opacity 350ms ease',
            pointerEvents: step === 'intro' ? 'none' : 'auto',
          }}
        >
          <AstroDiceSet
            isRolling={isRolling}
            targetFaces={faces}
            onRest={handleRest}
            height={440}
            skin="moon"
            background="transparent"
          />
        </div>

        {/* Résultat + légende de l'obstacle */}
        <AnimatePresence>
          {obstacle &&
            (step === 'obstacle_done' ||
              step === 'solution_roll' ||
              step === 'solution_done') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5"
              >
                <ResultLine faces={obstacle} />
                <div className="mt-4">
                  <OcreCard title="Lecture de l'Obstacle">
                    <ReadingLegend items={OBSTACLE_LEGEND} />
                  </OcreCard>
                </div>
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
                Étape 2 : Comment puis-je débloquer cela ?
              </h2>

              {step === 'obstacle_done' && (
                <div className="pb-2 text-center">
                  <DiceButton variant="ocre" onClick={rollSolution}>
                    Lancer — La Solution
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <ResultLine faces={solution} />
              <div className="mt-4">
                <OcreCard title="Lecture de la Solution">
                  <ReadingLegend items={SOLUTION_LEGEND} />
                </OcreCard>
              </div>

              <div className="mt-8 text-center">
                <DiceButton
                  onClick={() => {
                    setObstacle(null);
                    setSolution(null);
                    setStep('intro');
                  }}
                >
                  Recommencer
                </DiceButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BackToHub />
    </DiceBackground>
  );
}
