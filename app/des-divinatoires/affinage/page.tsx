'use client';

// app/des-divinatoires/affinage/page.tsx — Niveau 2.1 : L'Affinage d'un tirage

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
import {
  randomTargetFaces,
  type TargetFaces,
  type HouseNumber,
  DICE_SKINS,
} from '@/components/astro-dice';

// <AstroDiceSet/> = WebGL → jamais rendu côté serveur.
const AstroDiceSet = dynamic(
  () => import('@/components/astro-dice').then((m) => m.AstroDiceSet),
  { ssr: false, loading: () => <DiceLoader /> },
);

function DiceLoader() {
  return (
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{ height: 440, background: '#1a0e0a', color: DICE_THEME.ocreLight }}
    >
      <span style={{ fontFamily: 'var(--font-cinzel), serif' }}>
        Préparation des dés…
      </span>
    </div>
  );
}

type Phase = 'initial' | 'firstRoll' | 'firstDone' | 'refineRoll' | 'refineDone';
type Option = 'action' | 'domaine';

export default function AffinagePage() {
  const [phase, setPhase] = useState<Phase>('initial');
  const [faces, setFaces] = useState<TargetFaces>(() => randomTargetFaces());
  const [isRolling, setIsRolling] = useState(false);
  const [option, setOption] = useState<Option | null>(null);
  const [skin, setSkin] = useState<string>('moon');

  // Premier lancer complet des 3 dés.
  const rollFirst = useCallback(() => {
    setOption(null);
    setFaces(randomTargetFaces());
    setPhase('firstRoll');
    requestAnimationFrame(() => setIsRolling(true));
  }, []);

  // Relance sélective : on ne change QUE la face du dé concerné,
  // les autres faces (donc les autres dés) restent identiques → figés visuellement.
  const refine = useCallback(
    (opt: Option) => {
      setOption(opt);
      setFaces((prev) => {
        const next = { ...prev };
        if (opt === 'action') {
          // Option A : on relance UNIQUEMENT le dé des Signes.
          next.sign = randomTargetFaces().sign;
        } else {
          // Option B : on relance UNIQUEMENT le dé des Maisons.
          next.house = randomTargetFaces().house as HouseNumber;
        }
        return next;
      });
      setPhase('refineRoll');
      requestAnimationFrame(() => setIsRolling(true));
    },
    [],
  );

  const handleRest = useCallback(() => {
    setIsRolling(false);
    setPhase((p) =>
      p === 'firstRoll' ? 'firstDone' : p === 'refineRoll' ? 'refineDone' : p,
    );
  }, []);

  const showResult = phase === 'firstDone' || phase === 'refineDone';

  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title="Affinage d'un tirage"
        subtitle="Un premier lancer donne une réponse claire ? Affinez une nuance en ne relançant qu'un seul dé."
      />

      {/* Sélecteur de skin (aspect des dés + arène) */}
      <div className="mx-auto mb-4 max-w-2xl px-4">
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          style={{ fontFamily: 'var(--font-cinzel), serif' }}
        >
          <span
            className="mr-1 text-xs uppercase tracking-widest"
            style={{ color: DICE_THEME.ocreLight }}
          >
            Apparence
          </span>
          {Object.keys(DICE_SKINS).map((k) => (
              <button
                key={k}
                onClick={() => setSkin(k)}
                className="rounded-full px-3 py-1 text-xs capitalize transition-colors"
                style={{
                  border: `1px solid ${skin === k ? DICE_THEME.gold : DICE_THEME.brickDark}`,
                  background: skin === k ? DICE_THEME.brick : 'transparent',
                  color: DICE_THEME.glyph,
                  cursor: 'pointer',
                }}
              >
                {k}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {phase === 'initial' && (
          <div className="py-10 text-center">
            <DiceButton onClick={rollFirst}>Lancer les trois dés</DiceButton>
          </div>
        )}

        {/* Composant monté dès le chargement de la page (préchargé INVISIBLE) :
            le contexte WebGL + la police sont prêts → au clic, l'animation
            démarre instantanément, sans latence de chargement. */}
        <div
          style={{
            height: phase === 'initial' ? 0 : 440,
            opacity: phase === 'initial' ? 0 : 1,
            overflow: 'hidden',
            transition: 'opacity 350ms ease',
            pointerEvents: phase === 'initial' ? 'none' : 'auto',
          }}
        >
          <AstroDiceSet
            isRolling={isRolling}
            targetFaces={faces}
            onRest={handleRest}
            height={440}
            skin={skin}
            background="transparent"
          />
        </div>

        {/* Résultat courant */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <ResultLine faces={faces} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Après le 1er tirage : proposer les deux options d'affinage */}
        <AnimatePresence>
          {phase === 'firstDone' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <p
                className="mb-4 text-center text-sm"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: DICE_THEME.glyph,
                  opacity: 0.85,
                }}
              >
                Choisissez la nuance à préciser :
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <DiceButton onClick={() => refine('action')}>
                  🔁 Option A — Le zoom d&apos;action
                </DiceButton>
                <DiceButton variant="ocre" onClick={() => refine('domaine')}>
                  🔁 Option B — Le zoom de domaine
                </DiceButton>
              </div>
              <p
                className="mt-3 text-center text-xs"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: DICE_THEME.glyph,
                  opacity: 0.6,
                }}
              >
                A : relance le dé des Signes · B : relance le dé des Maisons
                (les autres dés restent en place).
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Après l'affinage : question interprétative */}
        <AnimatePresence>
          {phase === 'refineDone' && option && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <OcreCard
                title={
                  option === 'action'
                    ? 'Le zoom d\u2019action'
                    : 'Le zoom de domaine'
                }
              >
                {option === 'action' ? (
                  <p className="text-center italic">
                    « Quelle est la meilleure attitude ou posture à adopter
                    maintenant pour débloquer cette situation ? »
                  </p>
                ) : (
                  <p className="text-center italic">
                    « Quel autre domaine de ma vie va être impacté par ricochet
                    par cette décision ? »
                  </p>
                )}
              </OcreCard>

              <div className="mt-6 text-center">
                <DiceButton onClick={rollFirst}>
                  Recommencer un tirage
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
