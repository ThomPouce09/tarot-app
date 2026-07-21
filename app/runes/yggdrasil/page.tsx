'use client';

// app/runes/yggdrasil/page.tsx — Niveau 2.3 : Les Racines d'Yggdrasil (4 runes verticales)

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import YiSlideNav from '@/components/yi-slide-nav';
import { AskQuestion } from '@/components/ask-question';
import {
  RuneBackground,
  RuneTitle,
  RuneButton,
  RuneReading,
  RuneReveal,
  RUNE_THEME,
} from '../_shared';
import { type DrawnRune } from '@/components/rune-stones';
import { saveReading } from '@/lib/save-reading';
import { useT } from '@/lib/i18n';

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
  const t = useT();
  const [question, setQuestion] = useState<string | null>(null);

  const roll = useCallback(() => {
    setRunes([]);
    setDone(false);
    setIsRolling(true);
  }, []);

  const handleRest = useCallback((r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes(r);
    setDone(true);
    // Sauvegarde dans l'historique (4 runes verticales)
    saveReading({
      type: 'runes-yggdrasil',
      spread: "Les Racines d'Yggdrasil",
      cards: r.slice(0, 4).map((d, i) => ({
        name: d.rune?.name,
        symbol: d.rune?.symbol,
        reversed: d.reversed,
        position: POS[i],
      })),
      question,
    });
    setQuestion(null);
  }, [question]);

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title={t('runes.yggdrasil.title')}
        subtitle={t('runes.yggdrasil.subtitle')}
      />

      {/* Question avant le tirage */}
      {!done && (
        <AskQuestion onConfirm={setQuestion} accentColor={RUNE_THEME.goldPale} />
      )}

      <div className="mx-auto max-w-2xl px-4">
        {/* Conteneur de hauteur constante : le bouton reste monté (visibility
            bascule) pour ne pas décaler le composant au moment du tirage. */}
        <div
          className="py-8 text-center"
          style={{ visibility: done ? 'hidden' : 'visible' }}
        >
          <RuneButton onClick={roll}>{t('runes.yggdrasil.cta')}</RuneButton>
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
            <RuneButton onClick={roll}>{t('runes.retry')}</RuneButton>
          </div>
        )}
      </div>
    </RuneBackground>
  );
}
