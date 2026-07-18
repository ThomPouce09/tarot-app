'use client';

// app/runes/nornes/page.tsx — Niveau 2.1 : Le Fil des Nornes (Passé/Présent/Avenir)

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  RuneBackground,
  RuneTitle,
  RuneButton,
  RuneReading,
  SageCard,
  BackToRunes,
  RUNE_THEME,
} from '../_shared';
import { type DrawnRune } from '@/components/rune-stones';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

export default function NornesPage() {
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  const [phase, setPhase] = useState<'idle' | 'done' | 'advice'>('idle');

  const roll = useCallback(() => {
    setRunes([]);
    setPhase('idle');
    setIsRolling(true);
  }, []);

  const handleRest = useCallback((r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes(r);
    setPhase('done');
  }, []);

  const adviceRoll = useCallback(() => {
    setPhase('advice');
    setIsRolling(true);
  }, []);

  const handleAdviceRest = useCallback((r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes((prev) => [...prev.slice(0, 3), r[0]]);
  }, []);

  const hasAdvice = runes.length === 4;
  const skuld = runes[2];

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title="Le Fil des Nornes"
        subtitle="Urd, Verdandi, Skuld tissent le destin : ce qui fut, ce qui est, ce qui sera."
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Conteneur de hauteur constante : le bouton reste monté (visibility
            bascule) pour ne pas décaler le composant au moment du tirage. */}
        <div
          className="py-8 text-center"
          style={{ visibility: phase === 'idle' ? 'visible' : 'hidden' }}
        >
          <RuneButton onClick={roll}>Interroger les Nornes</RuneButton>
        </div>

        <RuneStonesSet
          count={3}
          layout="horizontal"
          isRolling={isRolling}
          onRest={handleRest}
          height={440}
        />

        {/* Lecture des 3 Nornes */}
        <AnimatePresence>
          {runes.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-3"
            >
              <RuneReading
                rune={runes[0]?.rune ?? null}
                reversed={runes[0]?.reversed}
                position="Urd — Le Passé"
                meaning="Les origines de la situation, ce qui est déjà accompli."
              />
              <RuneReading
                rune={runes[1]?.rune ?? null}
                reversed={runes[1]?.reversed}
                position="Verdandi — Le Présent"
                meaning="La nécessité actuelle, le mouvement en cours."
              />
              <RuneReading
                rune={runes[2]?.rune ?? null}
                reversed={runes[2]?.reversed}
                position="Skuld — L’Avenir"
                meaning="L’aboutissement logique si rien ne change."
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Variation "Briser le Destin" */}
        <AnimatePresence>
          {phase === 'done' && !hasAdvice && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 text-center"
            >
              <p
                className="mb-4 text-sm italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sage }}
              >
                Si l’avenir (Skuld) vous paraît lourd, vous pouvez tisser une
                nouvelle voie.
              </p>
              <RuneButton variant="gold" onClick={adviceRoll}>
                Tisser une nouvelle voie
              </RuneButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tirage séparé du Conseil d'Odin (1 rune). Le composant est
            ré-affiché pour ce round : count=1, layout horizontal. */}
        {hasAdvice && (
          <RuneStonesSet
            count={1}
            layout="horizontal"
            isRolling={isRolling}
            onRest={handleAdviceRest}
            height={260}
          />
        )}

        {/* 4ème rune : Conseil d'Odin */}
        <AnimatePresence>
          {hasAdvice && runes[3] && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <SageCard title="Le Conseil d’Odin">
                <p className="mb-3 text-center" style={{ color: RUNE_THEME.sage }}>
                  L’action précise à mener au présent (Verdandi) pour modifier
                  l’avenir (Skuld).
                </p>
                <RuneReading
                  rune={runes[3].rune}
                  reversed={runes[3].reversed}
                  position="Conseil d'Odin"
                />
              </SageCard>
              <div className="mt-6 text-center">
                <RuneButton onClick={roll}>Recommencer un tirage</RuneButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'done' && !hasAdvice && (
          <div className="mt-8 text-center">
            <RuneButton onClick={roll}>Recommencer un tirage</RuneButton>
          </div>
        )}
      </div>

      <BackToRunes />
    </RuneBackground>
  );
}
