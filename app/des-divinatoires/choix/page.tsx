'use client';

// app/des-divinatoires/choix/page.tsx — Niveau 2.2 : Le Tirage du choix

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

type Step = 'A_intro' | 'A_roll' | 'A_done' | 'B_intro' | 'B_roll' | 'B_done';

export default function ChoixPage() {
  const [step, setStep] = useState<Step>('A_intro');
  const [faces, setFaces] = useState<TargetFaces>(() => randomTargetFaces());
  const [isRolling, setIsRolling] = useState(false);
  const [resultA, setResultA] = useState<TargetFaces | null>(null);
  const [resultB, setResultB] = useState<TargetFaces | null>(null);

  const rollA = useCallback(() => {
    const t = randomTargetFaces();
    setFaces(t);
    setStep('A_roll');
    requestAnimationFrame(() => setIsRolling(true));
  }, []);

  const rollB = useCallback(() => {
    const t = randomTargetFaces();
    setFaces(t);
    setStep('B_roll');
    requestAnimationFrame(() => setIsRolling(true));
  }, []);

  const handleRest = useCallback((f: TargetFaces) => {
    setIsRolling(false);
    setStep((s) => {
      if (s === 'A_roll') {
        setResultA(f);
        return 'A_done';
      }
      if (s === 'B_roll') {
        setResultB(f);
        return 'B_done';
      }
      return s;
    });
  }, []);

  const diceVisible = step !== 'A_intro';

  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title="Le tirage du choix"
        subtitle="Vous hésitez entre deux chemins ? Comparez l'énergie de chaque option."
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Consigne Option A */}
        {(step === 'A_intro') && (
          <OcreCard title="Option A">
            <p className="text-center">
              Formulez clairement votre <b>premier choix</b> dans votre esprit
              (ex : « changer d&apos;emploi »), puis lancez les dés.
            </p>
            <div className="mt-5 text-center">
              <DiceButton onClick={rollA}>Lancer pour l&apos;Option A</DiceButton>
            </div>
          </OcreCard>
        )}

        {/* Zone dés : montée dès le chargement de la page (préchargée INVISIBLE
            en A_intro) → WebGL + police prêts → lancer instantané au clic. */}
        <div
          style={{
            height: step === 'A_intro' ? 0 : 440,
            opacity: step === 'A_intro' ? 0 : 1,
            overflow: 'hidden',
            transition: 'opacity 350ms ease',
            pointerEvents: step === 'A_intro' ? 'none' : 'auto',
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

        {/* Résultat A */}
        <AnimatePresence>
          {resultA && step !== 'A_intro' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                Option A
              </p>
              <ResultLine faces={resultA} />
              <p
                className="mt-2 text-center text-xs italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.7 }}
              >
                📝 Notez la vibration (ex : Lune en Cancer en Maison 4 =
                introspection, confort, protection du foyer).
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Passage à l'Option B */}
        <AnimatePresence>
          {step === 'A_done' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <OcreCard title="Option B">
                <p className="text-center">
                  Formulez à présent votre <b>second choix</b> avec autant de
                  clarté (ex : « rester à mon poste »), puis relancez.
                </p>
                <div className="mt-5 text-center">
                  <DiceButton variant="ocre" onClick={rollB}>
                    Lancer pour l&apos;Option B
                  </DiceButton>
                </div>
              </OcreCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Résultat B */}
        <AnimatePresence>
          {resultB && step === 'B_done' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                Option B
              </p>
              <ResultLine faces={resultB} />
              <p
                className="mt-2 text-center text-xs italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.7 }}
              >
                📝 Notez la vibration (ex : Uranus en Verseau en Maison 10 =
                grand changement pro, liberté, rupture de routine).
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Synthèse finale */}
        <AnimatePresence>
          {step === 'B_done' && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <OcreCard title="Indicateur de choix">
                <p className="text-center italic leading-relaxed">
                  Comparez la fluidité des énergies. L&apos;option A apporte-t-elle
                  de la <b>stabilité</b> ou de la <b>stagnation</b> ? L&apos;option B
                  génère-t-elle du <b>renouveau</b> ou de l&apos;<b>instabilité</b> ?
                </p>
              </OcreCard>

              <div className="mt-6 text-center">
                <DiceButton
                  onClick={() => {
                    setResultA(null);
                    setResultB(null);
                    setStep('A_intro');
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
