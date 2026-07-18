'use client';

// app/runes/mjolnir/page.tsx — Niveau 2.2 : Le Marteau de Mjölnir (5 runes en T)

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  RuneBackground,
  RuneTitle,
  RuneButton,
  RuneReading,
  BackToRunes,
  RUNE_THEME,
} from '../_shared';
import { type DrawnRune } from '@/components/rune-stones';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

const LEGEND = [
  'La Base du manche (Bas) : L’ancrage — ce qui sécurise l’utilisateur dans cette épreuve.',
  'Le Haut du manche (Milieu) : L’obstacle central — la nature exacte du blocage.',
  'Côté gauche de la tête : La menace — ce qu’il faut abandonner ou détruire.',
  'Côté droit de la tête : L’arme — la force ou la ressource à utiliser.',
  'Le Centre de la tête (Haut) : La frappe — l’action décisive à entreprendre.',
];
const POS = [
  'Base du manche — L’Ancrage',
  'Haut du manche — L’Obstacle',
  'Tête gauche — La Menace',
  'Tête droite — L’Arme',
  'Centre de la tête — La Frappe',
];

export default function MjolnirPage() {
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  const [done, setDone] = useState(false);

  const roll = useCallback(() => {
    setRunes([]);
    setDone(false);
    setIsRolling(true);
  }, []);

  const handleRest = useCallback((r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes(r);
    setDone(true);
  }, []);

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title="Le Marteau de Mjölnir"
        subtitle="Affronter un obstacle majeur : cinq runes en forme de T pour briser le blocage."
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Conteneur de hauteur constante : le bouton reste monté (visibility
            bascule) pour ne pas décaler le composant au moment du tirage. */}
        <div
          className="py-8 text-center"
          style={{ visibility: done ? 'hidden' : 'visible' }}
        >
          <RuneButton onClick={roll}>Invoquer la force de Mjölnir</RuneButton>
        </div>

        <RuneStonesSet
          count={5}
          layout="hammer"
          isRolling={isRolling}
          onRest={handleRest}
          height={500}
        />

        <AnimatePresence>
          {done && runes.length === 5 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-3"
            >
              {runes.map((d, i) => (
                <RuneReading
                  key={i}
                  rune={d.rune}
                  reversed={d.reversed}
                  position={POS[i]}
                  meaning={LEGEND[i]}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {done && (
          <div className="mt-8 text-center">
            <RuneButton onClick={roll}>Recommencer un tirage</RuneButton>
          </div>
        )}
      </div>

      <BackToRunes />
    </RuneBackground>
  );
}
