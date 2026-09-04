'use client';

// app/runes/nornes2/page.tsx — « Le Fil des Nornes · Tirage à l'aveugle ».
// Variante de /runes/nornes : on secoue le sac pour faire sortir progressivement
// TOUTES les runes face cachée, puis on sélectionne 3 runes pour le tirage
// complet (Urd / Verdandi / Skuld + analyse IA + Conseil d'Odin).

import { useCallback, useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
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
import { ShakeTutorial } from '../nornes/shake-tutorial';
import { type ScatterPick } from './rune-scatter';
import { useEntitlement } from '@/lib/use-entitlement';
import { SacredTable } from './sacred-table';
import { RuneStonesSet } from '@/components/rune-stones';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useT } from '@/lib/i18n';

const RuneScatter = dynamic(() => import('./rune-scatter').then((m) => m.RuneScatter), {
  ssr: false,
});

const NORNES_POS = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir'];

export default function Nornes2Page() {
  const [runes, setRunes] = useState<DrawnRune2[]>([]);
  // picks : les 3 runes choisies à l'aveugle (avant la table sacrée)
  const [picks, setPicks] = useState<ScatterPick[] | null>(null);
  const [phase, setPhase] = useState<'intro' | 'scatter' | 'reveal' | 'reading' | 'advice'>('intro');
  const [question, setQuestion] = useState<string | null>(null);
  const [scatterKey, setScatterKey] = useState(0);
  const t = useT();
  // Conseil d'Odin (« Briser le Destin ») : réservé au forfait ARKANE.
  const { sub: entSub } = useEntitlement();
  const canOdinAdvice = entSub?.level === 'arkane';
  const readingIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Construit un texte d'interprétation statique à partir des runes tirées.
  const staticInterpretation = useCallback((r: DrawnRune2[], count: number) => {
    return r.slice(0, count).map((d, i) => {
      const name = d.rune?.name || 'Rune';
      const sense = d.reversed ? d.rune?.reversed : d.rune?.upright;
      const pos = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir', 'Conseil d’Odin'][i] || `Rune ${i + 1}`;
      return `**${pos} : ${name}**\n${sense || ''}`;
    }).join('\n\n');
  }, []);

  // 🎬 Séquence d'apparition : question (concentration) → tutoriel animé (~5s)
  // → activation du scatter (le sac devient secouable).
  useEffect(() => {
    const t2 = window.setTimeout(() => {
      setPhase('scatter');
      setScatterKey((k) => k + 1); // active le scatter (enabled)
    }, 6200);
    return () => {
      window.clearTimeout(t2);
      cleanupRef.current?.();
    };
  }, []);

  // État du scatter : activé seulement après la séquence d'intro (~6.2s).
  const scatterEnabled = phase === 'scatter' && scatterKey > 0;

  // 🎯 3 runes choisies et révélées → la table sacrée les met en valeur
  // (vol animé + gyro), puis on passe à la lecture.
  const handleScatterComplete = useCallback((p: ScatterPick[]) => {
    setPicks(p);
    setPhase('reveal');
  }, []);

  // Les 3 runes sont posées sur la table sacrée → lecture + interprétation IA.
  const handleRevealSettled = useCallback(async () => {
    if (!picks) return;
    setRunes(picks);
    setPhase('reading');
    if (!savedRef.current) {
      savedRef.current = true;
      const id = await saveReading({
        type: 'runes-nornes',
        spread: 'Le Fil des Nornes — Tirage à l’aveugle',
        cards: picks.slice(0, 3).map((d, i) => ({
          name: d.rune?.name,
          symbol: d.rune?.symbol,
          reversed: d.reversed,
          position: NORNES_POS[i],
        })),
        interpretation: staticInterpretation(picks, 3),
        question,
      });
      if (id) readingIdRef.current = id;
      setQuestion(null);
    }
  }, [picks, staticInterpretation, question]);

  const adviceRoll = useCallback(() => {
    setPhase('advice');
  }, []);

  const handleAdviceRest = useCallback(async (picks: ScatterPick[]) => {
    setRunes((prev) => {
      const all = [...prev.slice(0, 3), picks[0]];
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
  const inReading = phase === 'reading' || phase === 'advice';

  const reset = useCallback(() => {
    setRunes([]);
    setPicks(null);
    setPhase('intro');
    setScatterKey(0);
    savedRef.current = false;
    readingIdRef.current = null;
    // Relance la séquence intro (question → tuto → scatter)
    const t2 = window.setTimeout(() => {
      setPhase('scatter');
      setScatterKey((k) => k + 1);
    }, 6200);
    cleanupRef.current = () => window.clearTimeout(t2);
  }, []);

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title={t('runes.nornes.title')}
        subtitle="Tirage à l'aveugle : secouez le sac, puis choisissez 3 runes face cachée."
        compact
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Champ question — reste visible tant que le tirage n'est pas révélé */}
        <div className="py-2">
          {!inReading && (
            <AskQuestion onConfirm={setQuestion} accentColor={RUNE_THEME.goldPale} autoFocus={false} />
          )}
        </div>

        {/* Zone tutoriel : se déploie avec le tutoriel puis se rétracte */}
        <motion.div
          className="overflow-hidden text-center"
          initial={false}
          animate={{ height: !scatterEnabled ? 'auto' : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <AnimatePresence>
            {!scatterEnabled && (
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

        {/* Scatter : secouage + sélection de 3 runes — elles se retournent face
            visible dès la sélection, puis transition vers la table sacrée */}
        {phase === 'scatter' && (
          <RuneScatter
            height={430}
            enabled={scatterEnabled}
            onComplete={handleScatterComplete}
          />
        )}

        {/* 🎯 Table sacrée : les 3 runes choisies volent du bas vers leurs
            emplacements (Urd/Verdandi/Skuld), avec l'effet gyroscope (même
            que /nornes). Elle RESTE affichée quand la lecture + l'analyse IA
            s'affichent en dessous. */}
        {(phase === 'reveal' || phase === 'reading') && picks && (
          <SacredTable
            picks={picks}
            height={430}
            onSettled={handleRevealSettled}
          />
        )}

        {/* Lecture des 3 Nornes */}
        <AnimatePresence>
          {inReading && runes.length >= 3 && (
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

        {/* Analyse IA du fil des Nornes */}
        {inReading && runes.length >= 3 && (
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

        {/* Variation "Briser le Destin" — réservée au forfait ARKANE */}
        <AnimatePresence>
          {phase === 'reading' && !hasAdvice && canOdinAdvice && (
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

        {/* Conseil d'Odin : tirage d'1 rune dans la zone de tirage (comme /nornes) */}
        {phase === 'advice' && (
          <RuneStonesSet
            count={1}
            layout="horizontal"
            isRolling
            onRest={handleAdviceRest}
            height={300}
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
              {/* La révélation de la rune d'Odin (simple) — le texte du Conseil
                  vient de l'interprétation IA ci-dessous (bouton « Révéler le
                  Conseil d'Odin », carte fond conseil-odin.png). */}
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
                <RuneButton onClick={reset}>{t('runes.retry')}</RuneButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'reading' && !hasAdvice && (
          <div className="mt-8 text-center">
            <RuneButton onClick={reset}>{t('runes.retry')}</RuneButton>
          </div>
        )}
      </div>
    </RuneBackground>
  );
}

// Type local (le ScatterPick fournit rune+reversed, aligné sur DrawnRune).
type DrawnRune2 = ScatterPick;
