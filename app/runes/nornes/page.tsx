'use client';

// app/runes/nornes/page.tsx — Niveau 2.1 : Le Fil des Nornes — Précis
// (tirage AVANCÉ : réponse ciblée sur la question exacte posée).

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import { RuneAskCard } from '../rune-ask';
import {
  RuneBackground,
  RuneTitle,
  RuneReading,
  RuneAnalysis,
  RUNE_THEME,
} from '../_shared';
import { NornesTutorialModal } from './nornes-tutorial-modal';
import { type DrawnRune } from '@/components/rune-stones';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useT, tr, useLang } from '@/lib/i18n';
import { localizePosition } from '@/lib/i18n/positions';
import AuthGate from '@/components/auth-gate';

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

const NORNES_POS = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir'];

function NornesPage() {
  const lang = useLang();
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  const [phase, setPhase] = useState<'idle' | 'done'>('idle');
  const [question, setQuestion] = useState<string | null>(null);
  // Question posée, CONSERVÉE pendant tout le tirage (le champ `question`
  // ci-dessus est le brouillon du champ de saisie, effacé à la sauvegarde
  // pour qu'un nouveau tirage redemande une question). `asked` alimente :
  // le bandeau « Votre question » affiché en fin de tirage, la prop `question`
  // des analyses IA (fil + Conseil d'Odin — sans elle, l'Oracle répondait à
  // côté de la question) et l'écho scellé. La ref évite les closures périmées
  // dans les callbacks asynchrones (sauvegarde déclenchée à l'arrêt des runes).
  const [asked, setAsked] = useState<string | null>(null);
  const askedRef = useRef<string | null>(null);
  // Modale « Principe du Fil des Nornes » affichée au chargement :
  //   'demo'  → la modale est ouverte (le sac est inactif derrière)
  //   'ready' → « Compris » cliqué : la modale se ferme, le sac s'active (roll)
  const [intro, setIntro] = useState<'demo' | 'ready'>('demo');
  const t = useT();
  const readingIdRef = useRef<string | null>(null);
  // Ref miroir en state : l'encadré « Écho scellé » doit se re-rendre dès que
  // la lecture est sauvegardée (une ref seule ne déclenche pas de rendu).
  const [readingId, setReadingId] = useState<string | null>(null);
  const savedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Construit un texte d'interprétation statique à partir des runes tirées.
  const staticInterpretation = useCallback((r: DrawnRune[], count: number) => {
    return r.slice(0, count).map((d, i) => {
      const name = d.rune?.name || 'Rune';
      const sense = d.reversed ? d.rune?.reversed : d.rune?.upright;
      const pos = localizePosition(['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir', 'Conseil d’Odin'][i], lang) || `Rune ${i + 1}`;
      return `**${pos} : ${name}**\n${sense || ''}`;
    }).join('\n\n');
  }, []);

  const roll = useCallback(() => {
    setRunes([]);
    setPhase('idle');
    setIsRolling(true);
    savedRef.current = false;
    readingIdRef.current = null;
    setReadingId(null);
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
    // Conserver la question posée pour TOUT le tirage : appels IA, bandeau
    // « Votre question », écho scellé (le champ `question` sera effacé à la
    // sauvegarde pour réarmer la saisie au tirage suivant — `asked`, lui, reste).
    askedRef.current = q;
    setAsked(q);
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
        spread: 'Le Fil des Nornes — Précis',
        cards: r.slice(0, 3).map((d, i) => ({
          name: d.rune?.name,
          symbol: d.rune?.symbol,
          reversed: d.reversed,
          position: localizePosition(NORNES_POS[i], lang),
        })),
        interpretation: staticInterpretation(r, 3),
        question: askedRef.current ?? question,
      });
      if (id) { readingIdRef.current = id; setReadingId(id); }
      // Réinitialiser la question pour le prochain tirage
      setQuestion(null);
    }
  }, [staticInterpretation, question]);

  // Révélation IA du tirage prête → persiste l'analyse structurée dans
  // l'historique (le focus est géré par RuneAnalysis lui-même).
  const onAnalysis = useCallback((text: string) => {
    if (readingIdRef.current && text) {
      updateReading(readingIdRef.current, { interpretation: text });
    }
  }, []);

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title={t('runes.nornes.titlePrecis')}
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
              <RuneAskCard
                title={tr("Quel fil veux-tu dérouler ?", "Which thread shall we unfold?")}
                sub={tr("Confie ta question précise aux Nornes — le thème oriente la lecture si tu préfères rester abstrait.", "Entrust your precise question to the Norns — a theme orients the reading if you prefer to stay abstract.")}
                cta={tr("Tisser le fil", "Weave the thread")}
                onConfirm={handleQuestionConfirm}
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
              {/* BANDEAU « Votre question » (fin de tirage) : la question posée
                  doit rester visible avec le résultat — même rendu que le
                  thème/intention des tirages tarot (bandeau doré compact). */}
              {asked && (
                <div
                  className="rounded-xl px-4 py-2.5 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${RUNE_THEME.goldPale}1f 0%, ${RUNE_THEME.goldPale}0a 100%)`,
                    border: `1px solid ${RUNE_THEME.goldPale}55`,
                  }}
                >
                  <p
                    className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}
                  >
                    {tr("Votre question", "Your question", "Su pregunta", "आपका प्रश्न")}
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ fontFamily: 'var(--font-cormorant), serif', color: RUNE_THEME.stone }}
                  >
                    {asked}
                  </p>
                </div>
              )}
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

        {/* Analyse IA du fil des Nornes (3 runes) — ciblée sur la question posée. */}
        {phase !== 'idle' && runes.length >= 3 && (
          <RuneAnalysis
            mode="nornes"
            question={asked}
            runes={[
              { rune: runes[0].rune, reversed: runes[0].reversed, position: 'Urd — Le Passé' },
              { rune: runes[1].rune, reversed: runes[1].reversed, position: 'Verdandi — Le Présent' },
              { rune: runes[2].rune, reversed: runes[2].reversed, position: 'Skuld — L’Avenir' },
            ]}
            onAnalysis={onAnalysis}
            echo={{ readingId, question: asked }}
            autoRun
          />
        )}
      </div>
    </RuneBackground>
  );
}

export default function GatedPage() {
  return <AuthGate><NornesPage /></AuthGate>;
}
