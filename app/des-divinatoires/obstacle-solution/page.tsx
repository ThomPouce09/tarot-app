'use client';

// app/des-divinatoires/obstacle-solution/page.tsx
// Refondu sur le moule de /choix : thème+sous-thème OU question obligatoire,
// mode du 2ᵉ tirage verrouillé sur celui du 1ᵉʳ (pas de mélange), frappe
// « le ciel se déchire » (dans AstroDiceCup), scroll gelé pendant le lancer,
// vidéos d'attente préchargées + AnalysisWaitVideo (plus d'écran noir),
// augure « Envie de défier l'Oracle ? » en fin de parcours avec la palette
// astro, récapitulatif final Obstacle & Solution.

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  DiceBackground,
  DiceTitle,
  DiceButton,
  OneLineQuestion,
  DiceTutorial,
  useDiceCupHeight,
  scrollToCupFit,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../_shared';
import { randomTargetFaces, type TargetFaces } from '@/components/astro-dice';
import { saveReading, updateReading } from '@/lib/save-reading';
import AnalysisWaitVideo from '@/components/analysis-wait-video';
import EchoBox from '@/components/echo-box';
import { useT, useLang, pick4, type Lang, tr } from '@/lib/i18n';
import { preloadAstroDice } from '@/components/astro-dice/preload';
import { pickAndPreloadWaitVideo } from '@/lib/preload-wait-videos';
import { playSound } from '@/lib/sounds';
import { api } from '@/lib/api-client';
import { DiceSteps, ClickableFaces } from '@/components/astro-dice/constellation';
import { DiceLaunchCard } from '@/app/des-divinatoires/launch-card';
import AuthGate from '@/components/auth-gate';
// Composants de rendu extraits a l'etape 2 du decoupage.
import {
  DiceAnalysis, RecapCard, VoiesHeader, VoiesCharged, VoieCard, VoieDestinyCard,
} from './views';
// Helpers purs extraits a l'etape 1 du decoupage.
import { diceCards, diceStaticText, type Step } from './helpers';

const AstroDiceCup = dynamic(
  () => import('@/components/astro-dice').then((m) => m.AstroDiceCup),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{ height: 440, background: '#0d1b2a', color: '#87CEEB' }}
      >
        <span style={{ fontFamily: 'var(--font-cinzel), serif' }}>
          {tr("Préparation des dés…", "Preparing the dice…", "Preparando los dados…", "पासे तैयार हो रहे हैं…")}
        </span>
      </div>
    ),
  },
);



// ── Page principale ──
function ObstacleSolutionPage() {
  // Chunk WebGL + vidéo d'attente téléchargés dès l'arrivée sur la page.
  useEffect(() => { preloadAstroDice(); pickAndPreloadWaitVideo('analyse-des-zodiaque'); }, []);
  const [step, setStep] = useState<Step>('intro');
  const t = useT();
  const lang = useLang();

  // Résultats des dés
  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 }) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const [obstacle, setObstacle] = useState<TargetFaces | null>(null);
  const [solution, setSolution] = useState<TargetFaces | null>(null);
  const obstacleRef = useRef<TargetFaces | null>(null);

  // Les Voies (moule obstacle→solution) : l'oracle trace 4 attitudes de
  // sortie à partir du tirage d'Obstacle ; le tirage de Solution se joue SUR
  // la voie choisie (plus de thème/question en B : c'est LE choix).
  const [question, setQuestion] = useState<string | null>(null);
  const [questionB, setQuestionB] = useState<string | null>(null);
  const questionRef = useRef<string | null>(null);
  const questionBRef = useRef<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState('');
  type Voie = { id: string; glyph: string; name: string; motto: string };
  const [voies, setVoies] = useState<Voie[] | null>(null);
  const [voiesLoading, setVoiesLoading] = useState(false);
  const [voiesError, setVoiesError] = useState(false);
  const voieRef = useRef<Voie | null>(null);
  const voiesFetchedRef = useRef(false);

  // Interprétations LLM courtes
  const [shortObstacle, setShortObstacle] = useState<string | null>(null);
  const [shortSolution, setShortSolution] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Analyses approfondies
  const [deepObstacle, setDeepObstacle] = useState<string | null>(null);
  const [deepSolution, setDeepSolution] = useState<string | null>(null);

  // Sauvegarde centralisée
  const readingIdRef = useRef<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const savedObstacleRef = useRef(false);

  // Refs de scroll
  const cupAreaRef = useRef<HTMLDivElement | null>(null);
  const cupRef = useRef<HTMLDivElement | null>(null);
  // Bloc d'analyse de la Solution — cible du focus après le 2ᵉ tirage.
  const solutionRef = useRef<HTMLDivElement | null>(null);
  const tutorialRef = useRef<HTMLDivElement | null>(null);
  // Hauteur d'arène OPTIMISÉE par écran (bandeau + tuto MESURÉS) : le tutoriel
  // ne déborde jamais du bas de l'écran, même sans scroll possible.
  const cupH = useDiceCupHeight(tutorialRef, step === 'obstacle_roll' || step === 'solution_roll', cupAreaRef);

  const scrollToCup = useCallback(() => {
    // Gobelet CENTRÉ dans l'écran pendant le lancer (comme /choix) +
    // correction mesurée : le bas du tuteur ne dépasse jamais l'écran.
    scrollToCupFit(cupRef.current ?? cupAreaRef.current, tutorialRef.current);
  }, []);

  useEffect(() => {
    if (step === 'obstacle_roll' || step === 'solution_roll') {
      const t = setTimeout(scrollToCup, 600);
      return () => clearTimeout(t);
    }
  }, [step, scrollToCup]);

  const rollObstacle = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('obstacle_roll');
    setShowTutorial(true);
  }, []);

  const rollSolution = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('solution_roll');
    setResetSignal((n) => n + 1);
    setShowTutorial(true);
  }, []);

  const handleRest = useCallback((f: TargetFaces) => {
    setStep((s) => {
      if (s === 'obstacle_roll') {
        setObstacle(f);
        obstacleRef.current = f;
        if (!savedObstacleRef.current) {
          savedObstacleRef.current = true;
          saveReading({
            type: 'des-obstacle-solution',
            spread: 'Obstacle',
            cards: diceCards(f),
            interpretation: diceStaticText(f),
            question: questionRef.current,
          }).then((id) => { if (id) { setReadingId(id); readingIdRef.current = id; } });
        }
        return 'obstacle_done';
      }
      if (s === 'solution_roll') {
        setSolution(f);
        return 'solution_done';
      }
      return s;
    });
  }, []);

  // ── Sauvegarde différée : faces combinées (attend readingId) ──
  const combinedSavedRef = useRef(false);
  useEffect(() => {
    if (readingId && obstacle && solution && !combinedSavedRef.current) {
      const combinedCards = [...diceCards(obstacle), ...diceCards(solution)];
      updateReading(readingId, {
        cards: combinedCards,
        interpretation: JSON.stringify({
          version: 'des-obstacle-solution',
          facesA: obstacle,
          facesB: solution,
        }),
      });
      combinedSavedRef.current = true;
    }
  }, [readingId, obstacle, solution]);

  // ── Sauvegarde centralisée : analyses (approfondie auto ; court = repli) ──
  useEffect(() => {
    if (step !== 'solution_done' || !readingId) return;
    const obst = deepObstacle || shortObstacle;
    const solu = deepSolution || shortSolution;
    if (!obst || !solu) return;
    updateReading(readingId, { interpretation: JSON.stringify({
      version: 'des-obstacle-solution',
      facesA: obstacle,
      facesB: solution,
      shortA: shortObstacle,
      shortB: shortSolution,
      deepA: deepObstacle,
      deepB: deepSolution,
    }) });
  }, [step, shortObstacle, shortSolution, deepObstacle, deepSolution, readingId, obstacle, solution]);

  // ── Les Voies : dès que l'Obstacle est posé, l'oracle trace 4 attitudes ──
  useEffect(() => {
    if (step !== 'obstacle_done' || !obstacle) return;
    if (voiesFetchedRef.current) return;
    voiesFetchedRef.current = true;
    setVoiesLoading(true);
    setVoiesError(false);
    (async () => {
      try {
        const res = await api('/api/astro-voies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planet: PLANET_NAMES[obstacle.planet as string] ?? obstacle.planet,
            sign: SIGN_NAMES[obstacle.sign as string] ?? obstacle.sign,
            house: obstacle.house,
            question: questionRef.current,
            lang,
          }),
        });
        const data = await res.json();
        if (Array.isArray(data.voies) && data.voies.length === 4) {
          setVoies(data.voies);
          playSound('scroll1', 0.55);
        } else {
          setVoiesError(true);
        }
      } catch {
        setVoiesError(true);
      } finally {
        setVoiesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, obstacle, lang]);

  const chooseVoie = useCallback((v: Voie, reason?: string | null) => {
    voieRef.current = v;
    // La Solution se lit DANS la voie choisie : son énoncé devient la
    // question du second lancer (l'IA relie obstacle, voie et faces).
    const qq = reason ? `${v.name} — ${v.motto} (l'oracle impose : ${reason})` : `${v.name} — ${v.motto}`;
    setQuestionB(qq);
    questionBRef.current = qq;
    rollSolution();
    setTimeout(scrollToCup, 700);
  }, [rollSolution, scrollToCup]);

  // ── 5ᵉ carte mystérieuse : « Que les dés choisissent ma voie ». ──
  // L'oracle départage les 4 voies ouvertes et désigne la plus avisée ;
  // la voie élue s'illumine, les autres s'effacent, puis le lancer suit.
  const [destiny, setDestiny] = useState<{ id: string; reason: string | null } | null>(null);
  const [destinyLoading, setDestinyLoading] = useState(false);
  const askDice = useCallback(async () => {
    if (!obstacle || !voies || destinyLoading || destiny) return;
    setDestinyLoading(true);
    playSound('spell3', 0.6);
    try {
      const res = await api('/api/astro-voies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planet: PLANET_NAMES[obstacle.planet as string] ?? obstacle.planet,
          sign: SIGN_NAMES[obstacle.sign as string] ?? obstacle.sign,
          house: obstacle.house,
          question: questionRef.current,
          lang,
          voies,
        }),
      });
      const data = await res.json();
      const chosen = voies.find((v) => v.id === data.chosenId);
      if (chosen) {
        setDestiny({ id: chosen.id, reason: data.reason || null });
        // Laisse la voie élue s'illuminer ~1,8 s avant de lancer les dés.
        window.setTimeout(() => chooseVoie(chosen, data.reason || null), 1800);
      }
    } catch { /* silencieux : la carte reste disponible */ }
    finally { setDestinyLoading(false); }
  }, [obstacle, voies, destinyLoading, destiny, lang, chooseVoie]);

  // Focus : après le 2ᵉ tirage, on vient se poser pile sur l'analyse de la
  // Solution (la frappe « ciel déchiré » est déjà finie à ce moment-là).
  useEffect(() => {
    if (step === 'solution_done' && solutionRef.current) {
      const t = setTimeout(() => solutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <DiceBackground starry starryVariant="silver">
      <YiSlideNav />
      <DiceTitle title={t('des.obstacle.title')} />

      {/* Fil d'étapes (une ligne, auto-fit) : Confier › Obstacle › Solution */}
      <DiceSteps
        steps={lang === 'en' ? ['Entrust', 'Obstacle', 'Solution'] : lang === 'es' ? ['Confiar', 'Obstáculo', 'Solución'] : lang === 'hi' ? ['सौंपें', 'अवरोध', 'समाधान'] : ['Confier', 'Obstacle', 'Solution']}
        current={step === 'intro' ? 0 : step === 'obstacle_roll' || step === 'obstacle_done' ? 1 : 2}
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

        {/* ════════════ INTRO — Obstacle : thème OU question (obligatoire) ════════════ */}
        {step === 'intro' && (
          <div className="mt-6">
            <DiceLaunchCard
              title={t('des.obstacle.readObstacle')}
              placeholder={t('des.obstacle.askFirst')}
              instruct={t('des.obstacle.instructFirst')}
              draft={questionDraft}
              setDraft={setQuestionDraft}
              onLaunch={(qq) => {
                setQuestion(qq);
                questionRef.current = qq;
                rollObstacle();
                setTimeout(scrollToCup, 700);
              }}
            />
          </div>
        )}

        {/* ════════════ GOBELET + TUTORIEL ════════════ */}
        {(step === 'obstacle_roll' || step === 'solution_roll') && (
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
                strikeSound={{ key: 'animation-zodiac-obstacle', ms: 4040 }}
              />
            </div>
            {/* Tutoriel — rendu partagé (référence /choix) */}
            <DiceTutorial show={showTutorial} boxRef={tutorialRef} text={t('des.choix.tutorial')} />
          </div>
        )}

        {/* ════════════ RÉSULTAT OBSTACLE (pilule cliquable + analyse) ════════════ */}
        <AnimatePresence>
          {obstacle && step !== 'obstacle_roll' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                {t('des.obstacle.readObstacle')}
              </p>
              <div className="mb-1"><ClickableFaces faces={obstacle} /></div>
              <DiceAnalysis
                faces={obstacle}
                question={questionRef.current}
                spread="Obstacle"
                onInterpretationReady={setShortObstacle}
                onDeepAnalysisReady={setDeepObstacle}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ LES VOIES — l'oracle trace la sortie de l'Obstacle ════════════ */}
        <AnimatePresence>
          {step === 'obstacle_done' && obstacle && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="mt-8"
            >
              <div
                className="mx-auto max-w-2xl rounded-3xl p-5 sm:p-7"
                style={{
                  background: 'linear-gradient(165deg, rgba(20,36,90,0.94) 0%, rgba(10,20,48,0.96) 55%, rgba(4,6,15,0.97) 100%)',
                  border: '1.5px solid rgba(212,175,55,0.45)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.65), inset 0 0 46px rgba(212,175,55,0.07)',
                }}
              >
                {/* Fil d'or : de l'obstacle (3 faces) aux voies */}
                <VoiesHeader
                  faces={obstacle}
                  loading={voiesLoading}
                  error={voiesError}
                  lang={lang}
                  onRetry={() => {
                    voiesFetchedRef.current = false;
                    setVoiesError(false);
                  }}
                />

                {voiesLoading && <VoiesCharged lang={lang} />}

                {voiesError && !voiesLoading && (
                  <div className="py-8 text-center">
                    <p className="mb-4 text-sm italic" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#8FA3C8' }}>
                      {pick4('Les astres se sont tus un instant…', 'The stars are momentarily silent…', "Los astres han callado un instante…", "तारे एक पल के लिए चुप हो गए…")(lang)}
                    </p>
                    <DiceButton variant="smallGold" onClick={() => { voiesFetchedRef.current = false; setVoiesError(false); }}>
                      {pick4('Réinterroger l’oracle', 'Ask the oracle again', "Volver a interrogar al oráculo", "भविष्यवक्ता से फिर पूछो")(lang)}
                    </DiceButton>
                  </div>
                )}

                {voies && !voiesLoading && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {voies.map((v, i) => <VoieCard key={v.id} voie={v} i={i} chosen={destiny?.id === v.id} reason={destiny?.id === v.id ? destiny.reason : null} dimmed={!!destiny && destiny.id !== v.id} onPick={() => !destiny && chooseVoie(v)} />)}
                    {/* 5ᵉ carte : le choix mystérieux — l'oracle tranche. */}
                    <VoieDestinyCard loading={destinyLoading} disabled={!!destiny} lang={lang} onPick={askDice} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ RÉSULTAT SOLUTION ════════════ */}
        <AnimatePresence>
          {solution && step === 'solution_done' && (
            <motion.div
              ref={solutionRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                {t('des.obstacle.readSolution')}
              </p>
              {questionB && questionB !== question && (
                <OneLineQuestion
                  className="mb-2 text-sm italic"
                  style={{ fontFamily: 'var(--font-cormorant), serif', color: DICE_THEME.glyph }}
                  text={questionB}
                />
              )}
              <div className="mb-1"><ClickableFaces faces={solution} /></div>
              <DiceAnalysis
                faces={solution}
                question={questionBRef.current || questionRef.current}
                spread="Solution"
                onInterpretationReady={setShortSolution}
                onDeepAnalysisReady={setDeepSolution}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ RÉCAPITULATIF FINAL + AUGURE (fin de parcours) ════════════ */}
        <AnimatePresence>
          {step === 'solution_done' && (
            <motion.div
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
                  {t('des.obstacle.recap')}
                </h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  {obstacle && (
                    <RecapCard
                      label={t('des.obstacle.readObstacle')}
                      faces={obstacle}
                      question={questionRef.current}
                      shortInterpretation={deepObstacle || shortObstacle}
                    />
                  )}
                  {solution && (
                    <RecapCard
                      label={t('des.obstacle.readSolution')}
                      faces={solution}
                      question={questionBRef.current}
                      shortInterpretation={deepSolution || shortSolution}
                    />
                  )}
                </div>

                {/* ✶ L'Augure — SEULEMENT ici, en fin de parcours : le sceau
                    n'apparaît qu'après les DEUX tirages analysés, et son
                    prompt reçoit l'obstacle ET la solution. */}
                {readingId && (shortObstacle || deepObstacle) && (shortSolution || deepSolution) && (
                  <div className="mt-2">
                    <EchoBox
                      domain="des"
                      readingId={readingId}
                      question={questionRef.current}
                      summary={[
                        `Obstacle — « ${questionRef.current || '—'} » : ${(shortObstacle || '').slice(0, 260)}${deepObstacle ? ` [analyse : ${deepObstacle.slice(0, 240)}…]` : ''}`,
                        `Solution — « ${questionBRef.current || '—'} » : ${(shortSolution || '').slice(0, 260)}${deepSolution ? ` [analyse : ${deepSolution.slice(0, 240)}…]` : ''}`,
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
  return <AuthGate><ObstacleSolutionPage /></AuthGate>;
}