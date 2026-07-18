'use client';

// app/runes/yggdrasil/page.tsx — Niveau 2.3 : Les Racines d'Yggdrasil (4 runes verticales)

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  RuneBackground,
  RuneTitle,
  RuneButton,
  RuneReading,
  RuneReveal,
  BackToRunes,
  RUNE_THEME,
} from '../_shared';
import { type DrawnRune } from '@/components/rune-stones';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

const POS = [
  'Les Racines — Profondeur',
  'Le Tronc — Soutien',
  'Les Branches — Choix',
  'L’Aigle au sommet — Vision',
];
const LEGEND = [
  'Ce qui est caché, l’inconscient ou les fondations secrètes du projet.',
  'Ce qui soutient actuellement la situation, la solidité du présent.',
  'Les directions possibles, la croissance et les opportunités qui se déploient.',
  'La perspective supérieure, la réalisation finale ou le message spirituel à retenir.',
];

export default function YggdrasilPage() {
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
        title="Les Racines d'Yggdrasil"
        subtitle="L’Arbre-Monde : un bilan profond, des racines aux branches, pour s’ancrer et grandir."
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Conteneur de hauteur constante : le bouton reste monté (visibility
            bascule) pour ne pas décaler le composant au moment du tirage. */}
        <div
          className="py-8 text-center"
          style={{ visibility: done ? 'hidden' : 'visible' }}
        >
          <RuneButton onClick={roll}>Observer l’Arbre-Monde</RuneButton>
        </div>

        <RuneStonesSet
          count={4}
          layout="vertical"
          isRolling={isRolling}
          onRest={handleRest}
          height={520}
        />

        <RuneReveal className="mt-6 space-y-3">
          {done &&
            runes.slice(0, 4).map((d, i) => (
              <RuneReading
                key={i}
                rune={d.rune}
                reversed={d.reversed}
                position={POS[i]}
                meaning={LEGEND[i]}
              />
            ))}
        </RuneReveal>

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
