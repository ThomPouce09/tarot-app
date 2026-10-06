'use client';

// app/des-divinatoires/choix/page.tsx — Niveau 2.2 : Le Tirage du choix
// Intègre le gobelet (AstroDiceCup) au geste, comme sur /affinage :
//   A_intro → A_roll → A_done (analyse courte + profonde)
//          → B_intro (question B optionnelle) → B_roll → B_done (analyse courte + profonde)
//          → Récapitulatif final des 2 options.
// Tout est traduit EN/FR via useT().


import dynamic from 'next/dynamic';
import YiSlideNav from '@/components/yi-slide-nav';
import EchoBox from '@/components/echo-box';
import AuthGate from '@/components/auth-gate';
import { DICE_THEME, DiceBackground, DiceTitle, DiceTutorial, OneLineQuestion, scrollToCupFit, useDiceCupHeight } from '../_shared';
import { Step, diceCards, diceStaticText } from './helpers';
import { DiceAnalysis, RecapCard } from './views';
import { DiceLaunchCard } from '@/app/des-divinatoires/launch-card';
import { TargetFaces, randomTargetFaces } from '@/components/astro-dice';
import { BalancePlateaux, ClickableFaces, DiceSteps, strikeTokens } from '@/components/astro-dice/constellation';
import { preloadAstroDice } from '@/components/astro-dice/preload';
import { tr, useLang, useT } from '@/lib/i18n';
import { pickAndPreloadWaitVideo } from '@/lib/preload-wait-videos';
import { saveReading, updateReading } from '@/lib/save-reading';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';


const AstroDiceCup = dynamic(
  () => import('@/components/astro-dice').then((m) => m.AstroDiceCup),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{ height: 440, background: '#1a0e0a', color: DICE_THEME.ocreLight }}
      >
        <span style={{ fontFamily: 'var(--font-cinzel), serif' }}>
          {tr("Préparation des dés…", "Preparing the dice…", "Preparando los dados…", "पासे तैयार हो रहे हैं…")}
        </span>
      </div>
    ),
  },
);




// ──────────────────────────────────────────────
// Page principale
// ──────────────────────────────────────────────
function ChoixPage() {
  // Le chunk WebGL du gobelet se télécharge dès l'arrivée sur la page :
  // quand l'utilisateur atteint l'étape de tirage, plus rien ne « charge ».
  useEffect(() => { preloadAstroDice(); pickAndPreloadWaitVideo('analyse-des-zodiaque'); }, []);
  const [step, setStep] = useState<Step>('A_intro');
  const t = useT();
  const lang = useLang();

  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 } as TargetFaces) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [resultA, setResultA] = useState<TargetFaces | null>(null);
  const [resultB, setResultB] = useState<TargetFaces | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [questionB, setQuestionB] = useState<string | null>(null); // 2e choix (optionnel)
  const [questionBDraft, setQuestionBDraft] = useState('');        // valeur live du champ Second Choix
  // Mode choisi pour le chemin A : le chemin B est verrouillé sur le même
  // (thème+sous-thème OU question libre — jamais de mélange des deux).
  const [modeA, setModeA] = useState<'theme' | 'free' | null>(null);
  const questionRef = useRef<string | null>(null);                 // snapshot pour le lancer A
  const questionBRef = useRef<string | null>(null);                 // snapshot pour le lancer B
  const [questionDraft, setQuestionDraft] = useState('');          // valeur live du champ Premier Choix

  const [showTutorial, setShowTutorial] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const resultAnalysisRef = useRef<HTMLDivElement | null>(null);
  const cupRef = useRef<HTMLDivElement | null>(null);
  const tutorialRef = useRef<HTMLDivElement | null>(null);
  const cupAreaRef = useRef<HTMLDivElement | null>(null);
  // Hauteur d'arène OPTIMISÉE par écran (bandeau + tuto MESURÉS) : le tutoriel
  // ne déborde jamais du bas de l'écran, même sans scroll possible.
  const cupH = useDiceCupHeight(tutorialRef, step === 'A_roll' || step === 'B_roll', cupAreaRef);

  // Reading IDs pour update avec analyses
  const [readingAId, setReadingAId] = useState<string | null>(null);
  const [readingBId, setReadingBId] = useState<string | null>(null);
  // Guards anti-doublon (évite 2 saves si handleRest appelé plusieurs fois)
  const savedARef = useRef(false);
  const savedBRef = useRef(false);
  const readingAIdRef = useRef<string | null>(null);
  const resultARef = useRef<TargetFaces | null>(null);

  // Analyses approfondies stockées pour le récapitulatif
  const [deepAnalysisA, setDeepAnalysisA] = useState<string | null>(null);
  const [deepAnalysisB, setDeepAnalysisB] = useState<string | null>(null);
  const [shortInterpA, setShortInterpA] = useState<string | null>(null);
  const [shortInterpB, setShortInterpB] = useState<string | null>(null);

  // Scroll vers le gobelet + tutoriel dès qu'il est monté (A_roll ou B_roll)
  const scrollToCup = useCallback(() => {
    // Le gobelet CENTRÉ dans l'écran (les deux tirages) → mieux visible
    // pendant le lancer ; et correction mesurée pour que le BAS DU TUTEUR
    // ne dépasse jamais l'écran (bandeau + barre URL mobile variables).
    scrollToCupFit(cupRef.current ?? cupAreaRef.current, tutorialRef.current);
  }, []);

  useEffect(() => {
    if (step === 'A_roll' || step === 'B_roll') {
      const t = setTimeout(scrollToCup, 600);
      return () => clearTimeout(t);
    }
  }, [step, scrollToCup]);

  const chooseA = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('A_roll');
    setShowTutorial(true);
  }, []);

  const chooseB = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('B_roll');
    setResetSignal((n) => n + 1);
    setShowTutorial(true);
  }, []);

  const handleRest = useCallback((f: TargetFaces) => {
    setStep((s) => {
      if (s === 'A_roll') {
        setResultA(f);
        resultARef.current = f;
        if (!savedARef.current) {
          savedARef.current = true;
          saveReading({
            type: 'des-choix',
            spread: 'Premier Choix',
            cards: diceCards(f),
            interpretation: diceStaticText(f),
            question: questionRef.current,
          }).then((id) => { if (id) { setReadingAId(id); readingAIdRef.current = id; } });
        }
        return 'A_done';
      }
      if (s === 'B_roll') {
        setResultB(f);
        if (!savedBRef.current) {
          savedBRef.current = true;
          // Fusionner dans le même enregistrement que le Premier Choix
          const targetId = readingAIdRef.current;
          const prevResultA = resultARef.current;
          setReadingBId(targetId);
          if (targetId && prevResultA) {
            // Stocker les 2 jeux de dés (6 cards) + faces structurées en JSON
            const combinedCards = [
              ...diceCards(prevResultA),
              ...diceCards(f),
            ];
            const payload = {
              version: 'des-choix',
              facesA: prevResultA,
              facesB: f,
            };
            updateReading(targetId, { cards: combinedCards, interpretation: JSON.stringify(payload) });
          }
        }
        return 'B_done';
      }
      return s;
    });
  }, []);

  const restart = useCallback(() => {
    setResultA(null);
    setResultB(null);
    setQuestion(null);
    setQuestionB(null);
    setModeA(null);
    setReady(false);
    setResetSignal((n) => n + 1);
    setStep('A_intro');
    setReadingAId(null);
    setReadingBId(null);
    savedARef.current = false;
    savedBRef.current = false;
    readingAIdRef.current = null;
    resultARef.current = null;
    setDeepAnalysisA(null);
    setDeepAnalysisB(null);
    setShortInterpA(null);
    setShortInterpB(null);
  }, []);

  // Scroll vers les résultats après chaque phase
  useEffect(() => {
    if (step === 'A_done' || step === 'B_done') {
      const t = setTimeout(() => {
        // Scroll au marqueur placé juste avant DiceAnalysis
        if (resultAnalysisRef.current) {
          resultAnalysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (resultRef.current) {
          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500); // attend le rendu du contenu
      return () => clearTimeout(t);
    }
  }, [step]);

  const recapRef = useRef<HTMLDivElement | null>(null);

  // ── Sauvegarde centralisée dans l'historique ──
  // Analyse posée par chemin = approfondie (auto) à défaut court (repli DB).
  useEffect(() => {
    if (step !== 'B_done' || !readingAId) return;
    const a = deepAnalysisA || shortInterpA;
    const b = deepAnalysisB || shortInterpB;
    if (!a || !b) return;
    const payload = {
      version: 'des-choix',
      facesA: resultA,
      facesB: resultB,
      shortA: shortInterpA,
      shortB: shortInterpB,
      deepA: deepAnalysisA,
      deepB: deepAnalysisB,
    };
    updateReading(readingAId, { interpretation: JSON.stringify(payload) });
  }, [step, shortInterpA, shortInterpB, deepAnalysisA, deepAnalysisB, readingAId, resultA, resultB]);

  return (
    <DiceBackground starry>
      <YiSlideNav />
      <DiceTitle title={t('des.choix.title')} />

      {/* Fil d'étapes : Confier › Chemin A › Chemin B › Comparaison */}
      <DiceSteps
        steps={
          lang === 'en' ? ['Entrust', 'Path A', 'Path B', 'Compare']
          : lang === 'es' ? ['Confiar', 'Camino A', 'Camino B', 'Comparación']
          : lang === 'hi' ? ['सौंपें', 'मार्ग A', 'मार्ग B', 'तुलना']
          : ['Confier', 'Chemin A', 'Chemin B', 'Comparaison']
        }
        current={step === 'A_intro' ? 0 : step === 'A_roll' || step === 'A_done' ? 1 : step === 'B_roll' ? 2 : 3}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Question sauvegardée affichée en permanence après enregistrement
            (une seule ligne — tap pour la modale qui l'affiche en entier) */}
        {question && (
          <OneLineQuestion
            className="mx-auto mb-4 max-w-xl text-sm italic leading-relaxed"
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              color: DICE_THEME.ocreLight,
              textShadow: '0 0 10px rgba(232,198,106,0.25)',
            }}
            text={question}
          />
        )}

        {/* ════════════ ÉTAPE INTRO A — Premier Choix : thème OU question ════════════ */}
        {step === 'A_intro' && (
          <div className="mt-6">
            <DiceLaunchCard
              title={t('des.choix.first')}
              placeholder={t('des.choix.askPlaceholder')}
              instruct={t('des.choix.instructFirst')}
              draft={questionDraft}
              setDraft={setQuestionDraft}
              onLaunch={(qq, m) => {
                setQuestion(qq);
                setModeA(m);
                questionRef.current = qq;
                chooseA();
                setShowTutorial(true);
                setTimeout(scrollToCup, 700);
              }}
            />
          </div>
        )}

        {/* ════════════ GOBELET + TUTORIEL ════════════ */}
        {(step === 'A_roll' || step === 'B_roll') && (
          <div ref={cupAreaRef}>
            <div
              ref={cupRef}
              style={{
                height: cupH,
                opacity: ready ? 1 : 0,
                transition: 'opacity 450ms ease',
              }}
            >
              <AstroDiceCup
                key={resetSignal}
                targetFaces={faces}
                skin="moon"
                height={cupH}
                lockScroll
                onRest={handleRest}
                onReady={() => setReady(true)}
                resetSignal={resetSignal}
                launchSignal={0}
                onShake={() => setShowTutorial(false)}
              />
            </div>
            {/* Tutoriel — rendu partagé (référence /choix) */}
            <DiceTutorial show={showTutorial} boxRef={tutorialRef} text={t('des.choix.tutorial')} />
          </div>
        )}

        {/* ════════════ RÉSULTAT A ════════════ */}
        <AnimatePresence>
          {resultA && step !== 'A_roll' && (
            <motion.div
              ref={step === 'A_done' ? resultRef : undefined}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                {t('des.choix.first')}
              </p>
              <div className="mb-1"><ClickableFaces faces={resultA} /></div>
              <div ref={resultAnalysisRef} />
              <DiceAnalysis
                faces={resultA}
                question={questionRef.current}
                spread="Premier Choix"
                readingId={readingAId}
                onInterpretationReady={setShortInterpA}
                onDeepAnalysisReady={setDeepAnalysisA}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ TRANSITION A → B — Second Choix : thème OU question ════════════ */}
        <AnimatePresence>
          {step === 'A_done' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <DiceLaunchCard
                title={t('des.choix.second')}
                placeholder={t('des.choix.secondPlaceholder')}
                instruct={t('des.choix.instructSecond')}
                draft={questionBDraft}
                setDraft={setQuestionBDraft}
                lockedMode={modeA}
                onLaunch={(qq) => {
                  setQuestionB(qq);
                  questionBRef.current = qq;
                  chooseB();
                  setShowTutorial(true);
                  setTimeout(scrollToCup, 700);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ RÉSULTAT B ════════════ */}
        <AnimatePresence>
          {resultB && step === 'B_done' && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                {t('des.choix.second')}
              </p>
              <div className="mb-1"><ClickableFaces faces={resultB} /></div>
              <div ref={resultAnalysisRef} />
              <DiceAnalysis
                faces={resultB}
                question={questionBRef.current || questionRef.current}
                spread="Second Choix"
                readingId={readingBId}
                onInterpretationReady={setShortInterpB}
                onDeepAnalysisReady={setDeepAnalysisB}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ RÉCAPITULATIF FINAL ════════════ */}
        <AnimatePresence>
          {step === 'B_done' && (
            <motion.div
              ref={recapRef}
              initial={{ opacity: 0, y: 14 }}

              animate={{ opacity: 1, y: 0 }}
              className="mt-8 mb-10"
            >
              <div
                className="mx-auto max-w-2xl"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.gold}18 0%, ${DICE_THEME.brickDeep} 100%)`,
                  border: `1.5px solid ${DICE_THEME.gold}33`,
                  borderRadius: 20,
                  boxShadow: `inset 0 0 30px ${DICE_THEME.gold}0c`,
                  padding: 24,
                }}
              >
                <h3
                  className="mb-6 text-center text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: DICE_THEME.gold,
                    textShadow: `0 0 20px ${DICE_THEME.gold}44`,
                  }}
                >
                  {t('des.choix.recap')}
                </h3>

                {/* Le duel des constellations : les deux plateaux se dressent,
                    un pont de lumière les relie, la balance s'incline. */}
                {resultA && resultB && (
                  <BalancePlateaux
                    tokensA={strikeTokens(resultA)}
                    tokensB={strikeTokens(resultB)}
                    labelA={t('des.choix.first')}
                    labelB={t('des.choix.second')}
                  />
                )}

                {/* Grille des 2 options */}
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Option A */}
                  <div className="min-w-0 space-y-3">
                    <RecapCard
                      label={t('des.choix.first')}
                      faces={resultA!}
                      question={questionRef.current}
                      shortInterpretation={deepAnalysisA || shortInterpA}
                    />
                  </div>

                  {/* Option B */}
                  <div className="min-w-0 space-y-3">
                    <RecapCard
                      label={t('des.choix.second')}
                      faces={resultB!}
                      question={questionBRef.current}
                      shortInterpretation={deepAnalysisB || shortInterpB}
                    />
                  </div>
                </div>

                {/* ✶ L'Écho scellé — SEULEMENT ici, en fin de parcours : le
                    sceau n'apparaît qu'après le second choix analysé, et son
                    prompt reçoit les lectures des DEUX chemins. */}
                {readingAId && (shortInterpA || deepAnalysisA) && (shortInterpB || deepAnalysisB) && (
                  <div className="mt-2">
                    <EchoBox
                      domain="des"
                      readingId={readingAId}
                      question={questionRef.current}
                      summary={[
                        `Chemin A — « ${questionRef.current || '—'} » : ${(shortInterpA || '').slice(0, 260)}${deepAnalysisA ? ` [analyse : ${deepAnalysisA.slice(0, 240)}…]` : ''}`,
                        `Chemin B — « ${questionBRef.current || '—'} » : ${(shortInterpB || '').slice(0, 260)}${deepAnalysisB ? ` [analyse : ${deepAnalysisB.slice(0, 240)}…]` : ''}`,
                      ].join(' || ')}
                    />
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DiceBackground>
  );
}

export default function GatedPage() {
  return <AuthGate><ChoixPage /></AuthGate>;
}