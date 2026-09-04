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
import { NornesTutorialModal } from './nornes-tutorial-modal';
import { type DrawnRune } from '@/components/rune-stones';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useEntitlement } from '@/lib/use-entitlement';
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
  // L'interprétation IA du tirage initial a-t-elle été affichée ? (le CTA
  // « Tisser une nouvelle voie » + « Recommencer un tirage » n'apparaissent
  // qu'après — jamais avant).
  const [mainAnalysisDone, setMainAnalysisDone] = useState(false);
  // Idem pour l'interprétation du Conseil d'Odin (4ème rune).
  const [adviceAnalysisDone, setAdviceAnalysisDone] = useState(false);
  // Abonnement : la variation « Briser le Destin / Conseil d'Odin » est
  // réservée au forfait ARKANE.
  const { sub: entSub } = useEntitlement();
  const canOdinAdvice = entSub?.level === 'arkane';
  const [phase, setPhase] = useState<'idle' | 'done' | 'advice'>('idle');
  const [question, setQuestion] = useState<string | null>(null);
  // Modale « Principe du Fil des Nornes » affichée au chargement :
  //   'demo'  → la modale est ouverte (le sac est inactif derrière)
  //   'ready' → « Compris » cliqué : la modale se ferme, le sac s'active (roll)
  const [intro, setIntro] = useState<'demo' | 'ready'>('demo');
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
    // Nouveau tirage → les interprétations doivent être (re)affichées avant
    // que les actions « Recommencer » / « Tisser une nouvelle voie » réapparaissent.
    setMainAnalysisDone(false);
    setAdviceAnalysisDone(false);
  }, []);

  // Clic sur « Compris » : ferme la modale → le champ question (obligatoire) est
  // mis en avant ; le sac ne s'active qu'après l'enregistrement de la question.
  const understand = useCallback(() => {
    setIntro('ready');
  }, []);

  // Question obligatoire : elle conditionne l'activation du sac (roll différé
  // de 350ms pour laisser le champ se refermer proprement).
  const handleQuestionConfirm = useCallback((q: string | null) => {
    if (!q) return;
    setQuestion(q);
    const t3 = window.setTimeout(() => roll(), 350);
    cleanupRef.current = () => window.clearTimeout(t3);
  }, [roll]);

  // Nettoie le timeout de roll différé si l'on quitte la page avant le clic.
  useEffect(() => {
    return () => cleanupRef.current?.();
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

  // « Tisser une nouvelle voie » : le clic a lieu en bas de page → recentrer
  // la vue sur le sac du Conseil d'Odin dès qu'il apparaît (laisse le temps
  // au sac de se monter avant le scroll).
  const adviceBagRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== 'advice') return;
    const t = window.setTimeout(() => {
      adviceBagRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 450);
    return () => window.clearTimeout(t);
  }, [phase]);

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

  // Révélation IA du tirage principal prête. Le focus est géré par RuneAnalysis
  // lui-même (il amène sa tête — la grande tuile URD — en haut d'écran).
  const onMainAnalysis = useCallback(
    (text: string) => {
      setMainAnalysisDone(true);
      onAnalysis(text);
    },
    [onAnalysis],
  );

  // Révélation IA du Conseil d'Odin prête (permet le « Recommencer » du bloc advice).
  const onAdviceAnalysis = useCallback(
    (text: string) => {
      setAdviceAnalysisDone(true);
      onAnalysis(text);
    },
    [onAnalysis],
  );

  const hasAdvice = runes.length === 4;

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title={t('runes.nornes.title')}
        subtitle={t('runes.nornes.subtitle')}
        compact
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Modale « Principe du Fil des Nornes » affichée avant le tirage : elle
            recouvre la page jusqu'au clic « Compris ». */}
        {intro === 'demo' && <NornesTutorialModal onDone={understand} />}

        {/* QUESTION (obligatoire, mise en avant) : le tirage ne démarre qu'une
            fois la question écrite + enregistrée. L'invite « Écrivez votre
            question… » est dans l'encadré du champ, au-dessus du texte. */}
        {phase === 'idle' && !question && (
          <div className="py-2">
            <motion.div
              className="rounded-2xl"
              animate={{
                boxShadow: [
                  `0 0 0 1px ${RUNE_THEME.goldPale}33, 0 0 14px ${RUNE_THEME.goldPale}18`,
                  `0 0 0 1px ${RUNE_THEME.goldPale}88, 0 0 34px ${RUNE_THEME.goldPale}55`,
                  `0 0 0 1px ${RUNE_THEME.goldPale}33, 0 0 14px ${RUNE_THEME.goldPale}18`,
                ],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AskQuestion
                required
                onConfirm={handleQuestionConfirm}
                accentColor={RUNE_THEME.goldPale}
                autoFocus={false}
              />
            </motion.div>
          </div>
        )}

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
                compactInfo
              />
              <RuneReading
                rune={runes[1]?.rune ?? null}
                reversed={runes[1]?.reversed}
                position="Verdandi — Le Présent"
                meaning="La nécessité actuelle, le mouvement en cours."
                compactInfo
              />
              <RuneReading
                rune={runes[2]?.rune ?? null}
                reversed={runes[2]?.reversed}
                position="Skuld — L’Avenir"
                meaning="L’aboutissement logique si rien ne change."
                compactInfo
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
            onAnalysis={onMainAnalysis}
            autoRun
          />
        )}

        {/* Variation "Briser le Destin" — réservée aux abonnés Initié et
            Arkane, et uniquement APRÈS l'affichage de l'interprétation IA du
            tirage initial. */}
        <AnimatePresence>
          {phase === 'done' && !hasAdvice && mainAnalysisDone && canOdinAdvice && (
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
          <div ref={adviceBagRef} className="scroll-mt-4">
            <RuneStonesSet
              count={1}
              layout="horizontal"
              isRolling={isRolling}
              onRest={handleAdviceRest}
              height={340}
            />
          </div>
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
                  compactInfo
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
                onAnalysis={onAdviceAnalysis}
                autoRun
              />
              {/* « Recommencer » uniquement après l'affichage de l'interprétation d'Odin */}
              {adviceAnalysisDone && (
                <div className="mt-6 text-center">
                  <RuneButton onClick={roll}>{t('runes.retry')}</RuneButton>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* « Recommencer un tirage » uniquement après l'affichage de l'interprétation IA */}
        {phase === 'done' && !hasAdvice && mainAnalysisDone && (
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
