'use client';

// app/runes/nornes/page.tsx — Niveau 2.1 : Le Fil des Nornes (Passé/Présent/Avenir)

import dynamic from 'next/dynamic';
import { useCallback, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import { AskQuestion } from '@/components/ask-question';
import {
  RuneBackground,
  RuneTitle,
  RuneButton,
  RuneReading,
  RuneAnalysis,
  SageCard,
  RUNE_THEME,
} from '../_shared';
import { type DrawnRune } from '@/components/rune-stones';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useT } from '@/lib/i18n';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

const NORNES_POS = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir'];

export default function NornesPage() {
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  const [phase, setPhase] = useState<'idle' | 'done' | 'advice'>('idle');
  const [question, setQuestion] = useState<string | null>(null);
  const t = useT();
  const readingIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);

  // Construit un texte d'interprétation statique à partir des runes tirées.
  const staticInterpretation = useCallback((r: DrawnRune[], count: number) => {
    return r.slice(0, count).map((d, i) => {
      const name = d.rune?.name || 'Rune';
      const sense = d.reversed ? d.rune?.reversed : d.rune?.upright;
      const pos = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir', 'Conseil d’Odin'][i] || `Rune ${i + 1}`;
      return `**${pos} : ${name}**\n${sense || ''}`;
    }).join('\n\n');
  }, []);

  const roll = useCallback(() => {
    setRunes([]);
    setPhase('idle');
    setIsRolling(true);
    savedRef.current = false;
    readingIdRef.current = null;
  }, []);

  const handleRest = useCallback(async (r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes(r);
    setPhase('done');
    if (!savedRef.current) {
      savedRef.current = true;
      const id = await saveReading({
        type: 'runes-nornes',
        spread: 'Le Fil des Nornes',
        cards: r.slice(0, 3).map((d, i) => ({
          name: d.rune?.name,
          symbol: d.rune?.symbol,
          reversed: d.reversed,
          position: NORNES_POS[i],
        })),
        interpretation: staticInterpretation(r, 3),
        question,
      });
      if (id) readingIdRef.current = id;
      // Réinitialiser la question pour le prochain tirage
      setQuestion(null);
    }
  }, [staticInterpretation, question]);

  const adviceRoll = useCallback(() => {
    setPhase('advice');
    setIsRolling(true);
  }, []);

  const handleAdviceRest = useCallback(async (r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes((prev) => {
      const all = [...prev.slice(0, 3), r[0]];
      // Mettre à jour la lecture historique avec la 4e rune + interprétation combinée
      if (readingIdRef.current) {
        const allCards = all.map((d, i) => ({
          name: d.rune?.name,
          symbol: d.rune?.symbol,
          reversed: d.reversed,
          position: NORNES_POS[i] || 'Conseil d’Odin',
        }));
        updateReading(readingIdRef.current, {
          cards: allCards,
          interpretation: staticInterpretation(all, 4),
        });
      }
      return all;
    });
  }, [staticInterpretation]);

  const onAnalysis = useCallback((text: string) => {
    if (readingIdRef.current && text) {
      updateReading(readingIdRef.current, { interpretation: text });
    }
  }, []);

  const hasAdvice = runes.length === 4;
  const skuld = runes[2];

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title={t('runes.nornes.title')}
        subtitle={t('runes.nornes.subtitle')}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Question avant le tirage */}
        {phase === 'idle' && (
          <AskQuestion onConfirm={setQuestion} accentColor={RUNE_THEME.goldPale} />
        )}

        {/* Conteneur de hauteur constante : le bouton reste monté (visibility
            bascule) pour ne pas décaler le composant au moment du tirage. */}
        <div
          className="py-8 text-center"
          style={{ visibility: phase === 'idle' ? 'visible' : 'hidden' }}
        >
          <RuneButton onClick={roll}>{t('runes.nornes.cta')}</RuneButton>
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

        {/* Analyse IA du fil des Nornes (3 premières runes) — reste monté même
            pendant la phase advice pour ne pas tuer une analyse en cours. */}
        {phase !== 'idle' && runes.length >= 3 && (
          <RuneAnalysis
            mode="nornes"
            runes={[
              { rune: runes[0].rune, reversed: runes[0].reversed, position: 'Urd — Le Passé' },
              { rune: runes[1].rune, reversed: runes[1].reversed, position: 'Verdandi — Le Présent' },
              { rune: runes[2].rune, reversed: runes[2].reversed, position: 'Skuld — L’Avenir' },
            ]}
            onAnalysis={onAnalysis}
          />
        )}

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
                {t('runes.nornes.advice')}
              </RuneButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tirage séparé du Conseil d'Odin (1 rune). Le composant est
            ré-affiché pour ce round : count=1, layout horizontal. */}
        {phase === 'advice' && (
          <RuneStonesSet
            count={1}
            layout="horizontal"
            isRolling={isRolling}
            onRest={handleAdviceRest}
            height={340}
          />
        )}

        {/* 4ème rune : Conseil d'Odin */}
        <AnimatePresence>
          {phase === 'advice' && runes[3] && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <SageCard title={t('runes.conseilOdin')}>
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
              {/* Analyse IA ciblée : le Conseil d'Odin par rapport aux 3 Nornes */}
              <RuneAnalysis
                mode="nornes"
                focus="odin"
                buttonLabel="Consulter l'Oracle sur le conseil d'Odin"
                runes={[
                  { rune: runes[0].rune, reversed: runes[0].reversed, position: 'Urd — Le Passé' },
                  { rune: runes[1].rune, reversed: runes[1].reversed, position: 'Verdandi — Le Présent' },
                  { rune: runes[2].rune, reversed: runes[2].reversed, position: 'Skuld — L’Avenir' },
                  { rune: runes[3].rune, reversed: runes[3].reversed, position: 'Conseil d’Odin' },
                ]}
                onAnalysis={onAnalysis}
              />
              <div className="mt-6 text-center">
                <RuneButton onClick={roll}>{t('runes.retry')}</RuneButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'done' && !hasAdvice && (
          <div className="mt-8 text-center">
            <RuneButton onClick={roll}>{t('runes.retry')}</RuneButton>
          </div>
        )}
      </div>
    </RuneBackground>
  );
}
