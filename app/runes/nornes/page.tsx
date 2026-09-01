'use client';

// app/runes/nornes/page.tsx — Niveau 2.1 : Le Fil des Nornes (Passé/Présent/Avenir)

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, useRef } from 'react';
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
import { ShakeTutorial } from './shake-tutorial';
import { type DrawnRune } from '@/components/rune-stones';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useT } from '@/lib/i18n';
import AuthGate from '@/components/auth-gate';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

const NORNES_POS = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir'];

function NornesPage() {
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  const [phase, setPhase] = useState<'idle' | 'done' | 'advice'>('idle');
  const [question, setQuestion] = useState<string | null>(null);
  // Séquence d'apparition au 1er chargement :
  //   'question' → le champ question (concentration)
  //   'demo'     → le tutoriel animé montre le geste (sac qui se secoue)
  //   'ready'    → le tutoriel s'efface, le sac devient secouable (roll)
  const [intro, setIntro] = useState<'question' | 'demo' | 'ready'>('question');
  const t = useT();
  const readingIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

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

  // 🎬 Séquence d'apparition au chargement :
  // 1. 'question' : le champ question invite à la concentration (visible d'emblée)
  // 2. 'demo' : le tutoriel animé apparaît, reste ~5s, montre le geste
  // 3. 'ready' : le tutoriel sort en fondu (~0.45s), PUIS le sac s'active (roll
  //    différé de 600ms pour éviter tout chevauchement visuel).
  useEffect(() => {
    const t1 = window.setTimeout(() => setIntro('demo'), 1200);
    const t2 = window.setTimeout(() => {
      setIntro('ready');
      const t3 = window.setTimeout(() => roll(), 600);
      cleanupRef.current = () => window.clearTimeout(t3);
    }, 6200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        compact
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* 🎬 Enchaînement au 1er chargement :
            1. Le champ question RESTE visible (concentration) — il ne disparaît
               que quand l'utilisateur confirme sa question (mécanisme interne).
            2. 'demo' : le tutoriel animé apparaît ~5s, montre le geste.
            3. 'ready' : le tutoriel sort en fondu, le sac devient actif (roll
               différé pour éviter tout chevauchement visuel).
            Le champ + la zone tutoriel gardent des hauteurs stables pour ne pas
            décaler la zone de tirage pendant les transitions. */}
        <div className="py-2">
          {phase === 'idle' && (
            <AskQuestion onConfirm={setQuestion} accentColor={RUNE_THEME.goldPale} autoFocus={false} />
          )}
        </div>

        {/* Zone tutoriel : sa hauteur se déploie avec la modale puis se rétracte
            à 0 quand elle disparaît → la zone de tirage remonte à sa place. */}
        <motion.div
          className="overflow-hidden text-center"
          initial={false}
          animate={{ height: intro === 'demo' ? 'auto' : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <AnimatePresence>
            {intro === 'demo' && (
              <motion.div
                key="tuto"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <ShakeTutorial />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <RuneStonesSet
          count={3}
          layout="horizontal"
          isRolling={isRolling}
          onRest={handleRest}
          height={360}
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

export default function GatedPage() {
  return <AuthGate><NornesPage /></AuthGate>;
}
