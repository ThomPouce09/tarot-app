'use client';

// app/des-divinatoires/choix/page.tsx — Niveau 2.2 : Le Tirage du choix
// Intègre le gobelet (AstroDiceCup) au geste, comme sur /affinage :
//   A_intro → A_roll → A_done (analyse courte + profonde)
//          → B_intro (question B optionnelle) → B_roll → B_done (analyse courte + profonde)
//          → Récapitulatif final des 2 options.
// Tout est traduit EN/FR via useT().

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import { AskQuestion } from '@/components/ask-question';
import {
  DiceBackground,
  DiceTitle,
  DiceButton,
  OcreCard,
  ResultLine,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../_shared';
import {
  randomTargetFaces,
  type TargetFaces,
  type DieKind,
} from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useT, useLang } from '@/lib/i18n';

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
          Préparation des dés…
        </span>
      </div>
    ),
  },
);

type Step = 'A_intro' | 'A_roll' | 'A_done' | 'B_intro' | 'B_roll' | 'B_done';

const ACTIVE_DICE: DieKind[] = ['planet', 'sign', 'house'];

function diceCards(f: TargetFaces) {
  return ACTIVE_DICE.map((k) => ({
    kind: k,
    value: f[k],
    label: k === 'planet' ? PLANET_NAMES[f[k] as string] : k === 'sign' ? SIGN_NAMES[f[k] as string] : `Maison ${f[k]}`,
  }));
}
function diceStaticText(f: TargetFaces) {
  return ACTIVE_DICE.map((k) => `${k === 'planet' ? 'Planète' : k === 'sign' ? 'Signe' : 'Maison'} ${f[k]} : ${meaningFor(k, f[k])}`).join('\n');
}

// ──────────────────────────────────────────────
// Analyse courte (interprétation combinée) + approfondie
// ──────────────────────────────────────────────
function DiceAnalysis({
  faces,
  activeKinds,
  question,
  spread,
  readingId,         // lectureId pour update si analyse profonde générée
  onInterpretationReady,
  onDeepAnalysisReady,
}: {
  faces: TargetFaces;
  activeKinds: DieKind[];
  question?: string | null;
  spread?: string;
  readingId?: string | null;
  onInterpretationReady?: (interp: string | null) => void;
  onDeepAnalysisReady?: (analysis: string | null) => void;
}) {
  const t = useT();
  const lang = useLang();

  const [analysis, setAnalysis] = useState<string | null>(null);       // texte libre (fallback)
  const [sections, setSections] = useState<{ key: string; label: string; text: string }[] | null>(null);
  const [synthese, setSynthese] = useState<string>('');
  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [loading, setLoading] = useState(false);       // analyse structurée (bouton)
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);

  // ── Analyse structurée (bouton "Analyser en profondeur") ──
  const run = useCallback(async () => {
    setLoading(true);
    setAnalysis(null);
    setSections(null);
    setSynthese('');
    try {
      const res = await fetch('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faces, activeKinds, mode: 'global', question: question || undefined, dbInterpretation: dbInterpretation || undefined }),
      });
      const data = await res.json();
      if (data.sections && Array.isArray(data.sections)) {
        setSections(data.sections);
        setSynthese(data.synthese || '');
      } else {
        setAnalysis(data.texte || 'Analyse indisponible.');
      }
    } catch {
      setAnalysis('Les étoiles se sont voilées… Réessaie l\'analyse.');
    } finally {
      setLoading(false);
    }
  }, [faces, activeKinds, question, dbInterpretation]);

  // ── Analyse approfondie LLM (prompt long) ──
  const runDeep = useCallback(async () => {
    setDeepLoading(true);
    setDeepAnalysis(null);
    try {
      const planet = PLANET_NAMES[faces.planet as string];
      const sign = SIGN_NAMES[faces.sign as string];
      const house = `Maison ${faces.house}`;
      if (!planet || !sign) {
        setDeepAnalysis(t('des.choix.deepNotAvail'));
        return;
      }
      const res = await fetch('/api/astro-interpretation-approfondie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planet, sign, house, question, spread, lang }),
      });
      const data = await res.json();
      if (data.analysis) {
        setDeepAnalysis(data.analysis);
        onDeepAnalysisReady?.(data.analysis);
        // Mettre à jour la lecture dans l'historique avec l'analyse longue
        if (readingId) {
          updateReading(readingId, { interpretation: data.analysis });
        }
      } else {
        setDeepAnalysis(t('des.choix.deepNotAvail'));
      }
    } catch {
      setDeepAnalysis(t('des.choix.deepNotAvail'));
    } finally {
      setDeepLoading(false);
    }
  }, [faces, question, spread, readingId, t, lang]);

  // ── Interprétation courte automatique (LLM si question → DB sinon) ──
  useEffect(() => {
    if (!faces.planet || !faces.sign || !faces.house) return;
    const planet = PLANET_NAMES[faces.planet as string];
    const sign = SIGN_NAMES[faces.sign as string];
    const house = `Maison ${faces.house}`;
    if (!planet || !sign) return;

    setDbLoading(true);
    setDbInterpretation(null);

    const endpoint = question
      ? '/api/astro-interpretation-choix'
      : '/api/astro-interpretation-db';

    const body = question
      ? { planet, sign, house, question, spread }
      : { planet, sign, house };

    (async () => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.found && data.interpretation) {
          setDbInterpretation(data.interpretation);
          onInterpretationReady?.(data.interpretation);
        }
      } catch {
        // silencieux
      } finally {
        setDbLoading(false);
      }
    })();
  }, [faces.planet, faces.sign, faces.house, question, spread]);

  const shortReady = dbInterpretation && !dbLoading;

  return (
    <div
      className="mx-auto mt-5 max-w-2xl rounded-3xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${DICE_THEME.ocre}14 0%, ${DICE_THEME.brick} 100%)`,
        border: `1.5px solid ${DICE_THEME.ocre}55`,
        boxShadow: `inset 0 0 30px ${DICE_THEME.ocre}14`,
      }}
    >
      {/* Titre analyse */}
      <h3
        className="mb-4 text-center text-lg font-bold"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: DICE_THEME.ocreLight,
          textShadow: `0 0 12px ${DICE_THEME.gold}44`,
        }}
      >
        {t('des.choix.analysis')}
      </h3>

      {/* Partie statique — les 3 dés */}
      <div className="space-y-3">
        {activeKinds.map((k) => {
          const val = faces[k] as string | number;
          return (
            <div
              key={k}
              className="flex gap-3 text-sm leading-relaxed"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
            >
              <span
                className="mt-0.5 text-2xl leading-none"
                style={{ color: DICE_THEME.ocreLight }}
              >
                {val}
              </span>
              <span style={{ opacity: 0.92 }}>{meaningFor(k, val)}</span>
            </div>
          );
        })}
      </div>

      {/* ── Interprétation courte (DB ou LLM 1-2 phrases) ── */}
      {dbLoading && (
        <div
          className="mt-4 text-center text-xs italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.6 }}
        >
          {t('des.choix.searching')}
        </div>
      )}
      {shortReady && (
        <div
          className="mt-5 rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
            border: `1.5px solid ${DICE_THEME.gold}66`,
            boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
          }}
        >
          <p
            className="mb-3 text-center text-sm font-bold uppercase tracking-wider"
            style={{
              fontFamily: 'var(--font-cinzel-deco), serif',
              color: DICE_THEME.gold,
              textShadow: `0 0 8px ${DICE_THEME.gold}33`,
              letterSpacing: '0.1em',
            }}
          >
            ✦ {t('des.choix.shortTitle')} ✦
          </p>
          <p
            className="text-center text-base leading-relaxed"
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              color: '#F0E6D3',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.75,
            }}
          >
            {dbInterpretation}
          </p>
        </div>
      )}

      {/* ── Analyse structurée (bouton anal. en profondeur) ── */}
      <div className="mt-5 border-t pt-4" style={{ borderColor: `${DICE_THEME.gold}33` }}>
        {loading && (
          <div
            className="text-center text-sm italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.8 }}
          >
            {t('des.choix.thinkingStars')}
          </div>
        )}
        {sections && !loading && (
          <div className="space-y-3">
            {sections.map((s) => (
              <div
                key={s.key}
                className="rounded-2xl p-4"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.ocre}1f 0%, ${DICE_THEME.ocre}0a 100%)`,
                  border: `1px solid ${DICE_THEME.ocre}44`,
                }}
              >
                <p
                  className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
                >
                  {s.label}
                </p>
                <p
                  className="text-center text-base leading-relaxed italic"
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    color: '#F0E6D3',
                    lineHeight: 1.75,
                  }}
                >
                  {s.text}
                </p>
              </div>
            ))}
            {synthese && (
              <div
                className="mt-4 rounded-2xl p-4"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.ocre}14 100%)`,
                  border: `1px solid ${DICE_THEME.gold}55`,
                  boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
                }}
              >
                <p
                  className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                >
                  {t('des.choix.synthesis')}
                </p>
                <p
                  className="text-center text-base leading-relaxed italic"
                  style={{
                    fontFamily: 'var(--font-cormorant), serif',
                    color: '#F0E6D3',
                    lineHeight: 1.75,
                  }}
                >
                  {synthese}
                </p>
              </div>
            )}
          </div>
        )}
        {analysis && !loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm leading-relaxed italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
          >
            {analysis}
          </motion.p>
        )}
        {!analysis && !sections && !loading && !shortReady && (
          <div className="mt-2 text-center">
            <DiceButton variant="blue" onClick={run}>
              {t('des.choix.deepBtn')}
            </DiceButton>
          </div>
        )}

        {/* ── Analyse APPROFONDIE (prompt long) ── */}
        {/* Toujours visible (indépendant du mode structuré) dès que les dés sont posés */}
        {!deepAnalysis && !deepLoading && (
          <div className="mt-4 text-center">
            <DiceButton variant="gold" onClick={runDeep}>
              {t('des.choix.deepLongBtn')}
            </DiceButton>
          </div>
        )}
        {deepLoading && (
          <div
            className="mt-4 text-center text-sm italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold, opacity: 0.8 }}
          >
            {t('des.choix.deepLoading')}
          </div>
        )}
        {deepAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl p-6"
            style={{
              background: `linear-gradient(135deg, ${DICE_THEME.gold}18 0%, ${DICE_THEME.brickDeep} 100%)`,
              border: `1.5px solid ${DICE_THEME.gold}44`,
              boxShadow: `inset 0 0 30px ${DICE_THEME.gold}10`,
            }}
          >
            <p
              className="mb-4 text-center text-base font-bold uppercase tracking-wider"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                color: DICE_THEME.gold,
                textShadow: `0 0 12px ${DICE_THEME.gold}44`,
                letterSpacing: '0.12em',
              }}
            >
              ✦ {t('des.choix.deepTitle')} ✦
            </p>
            <div
              className="whitespace-pre-line text-base leading-relaxed"
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                color: '#F0E6D3',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.75,
                fontSize: '1.05rem',
              }}
            >
              {deepAnalysis}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Section de synthèse : question + analyse courte (reprise)
// ──────────────────────────────────────────────
function RecapCard({
  label,
  faces,
  question,
  shortInterpretation,
  deepAvailable,
  onToggleDeep,
}: {
  label: string;
  faces: TargetFaces;
  question?: string | null;
  shortInterpretation?: string | null;
  deepAvailable: boolean;
  onToggleDeep: () => void;
}) {
  const t = useT();
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: `linear-gradient(135deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 100%)`,
        border: `1.5px solid ${DICE_THEME.gold}44`,
      }}
    >
      <p
        className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
      >
        {label}
      </p>
      {question && (
        <p
          className="mb-3 text-center text-sm italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
        >
          « {question} »
        </p>
      )}
      <ResultLine faces={faces} />
      {shortInterpretation && (
        <p
          className="mt-3 text-center text-sm leading-relaxed"
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            color: '#F0E6D3',
            lineHeight: 1.7,
          }}
        >
          {shortInterpretation}
        </p>
      )}
      {deepAvailable && (
        <div className="mt-3 text-center">
          <DiceButton variant="smallGold" onClick={onToggleDeep}>
            {t('des.choix.seeDeep')}
          </DiceButton>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Page principale
// ──────────────────────────────────────────────
export default function ChoixPage() {
  const [step, setStep] = useState<Step>('A_intro');
  const t = useT();

  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 } as TargetFaces) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [resultA, setResultA] = useState<TargetFaces | null>(null);
  const [resultB, setResultB] = useState<TargetFaces | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [questionB, setQuestionB] = useState<string | null>(null); // 2e choix (optionnel)
  const questionRef = useRef<string | null>(null);                 // snapshot pour le lancer A
  const questionBRef = useRef<string | null>(null);                 // snapshot pour le lancer B

  const [showTutorial, setShowTutorial] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const cupRef = useRef<HTMLDivElement | null>(null);
  const tutorialRef = useRef<HTMLDivElement | null>(null);

  // Reading IDs pour update avec analyses
  const [readingAId, setReadingAId] = useState<string | null>(null);
  const [readingBId, setReadingBId] = useState<string | null>(null);
  // Guards anti-doublon (évite 2 saves si handleRest appelé plusieurs fois)
  const savedARef = useRef(false);
  const savedBRef = useRef(false);

  // Analyses approfondies stockées pour le récapitulatif
  const [deepAnalysisA, setDeepAnalysisA] = useState<string | null>(null);
  const [deepAnalysisB, setDeepAnalysisB] = useState<string | null>(null);
  const [shortInterpA, setShortInterpA] = useState<string | null>(null);
  const [shortInterpB, setShortInterpB] = useState<string | null>(null);
  const [showDeepA, setShowDeepA] = useState(false);
  const [showDeepB, setShowDeepB] = useState(false);

  // Scroll vers le gobelet + tutoriel dès qu'il est monté (A_roll ou B_roll)
  useEffect(() => {
    if (step === 'A_roll' || step === 'B_roll') {
      const t = setTimeout(() => {
        if (tutorialRef.current) {
          tutorialRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (cupRef.current) {
          const top = cupRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, top - 220), behavior: 'smooth' });
        }
      }, 600); // attend le rendu du composant dynamique
      return () => clearTimeout(t);
    }
  }, [step]);

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
        if (!savedARef.current) {
          savedARef.current = true;
          saveReading({
            type: 'des-choix',
            spread: 'Premier Choix',
            cards: diceCards(f),
            interpretation: diceStaticText(f),
            question: questionRef.current,
          }).then((id) => { if (id) setReadingAId(id); });
        }
        return 'A_done';
      }
      if (s === 'B_roll') {
        setResultB(f);
        if (!savedBRef.current) {
          savedBRef.current = true;
          saveReading({
            type: 'des-choix',
            spread: 'Second Choix',
            cards: diceCards(f),
            interpretation: diceStaticText(f),
            question: questionBRef.current,
          }).then((id) => { if (id) setReadingBId(id); });
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
    setReady(false);
    setResetSignal((n) => n + 1);
    setStep('A_intro');
    setReadingAId(null);
    setReadingBId(null);
    savedARef.current = false;
    savedBRef.current = false;
    setDeepAnalysisA(null);
    setDeepAnalysisB(null);
    setShortInterpA(null);
    setShortInterpB(null);
    setShowDeepA(false);
    setShowDeepB(false);
  }, []);

  const cupVisible = step !== 'A_intro' && step !== 'B_intro';

  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle title={t('des.choix.title')} />

      <div className="mx-auto max-w-2xl px-4">
        {/* Question sauvegardée affichée en permanence après enregistrement */}
        {question && (
          <p
            className="mt-4 text-center text-base"
            style={{
              fontFamily: 'var(--font-cinzel-deco), serif',
              color: '#D4AF37',
              textShadow: '0 0 12px rgba(212,175,55,0.35)',
            }}
          >
            {question}
          </p>
        )}

        {/* ════════════ ÉTAPE INTRO A ════════════ */}
        {step === 'A_intro' && (
          <>
            {/* AskQuestion avec bouton de lancement intégré */}
            <AskQuestion
              key="qA"
              onConfirm={(q) => {
                setQuestion(q);
                questionRef.current = q;
              }}
              onLaunch={() => {
                chooseA();
                setTimeout(() => {
                  tutorialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 600);
              }}
              label={t('des.choix.askLabel')}
              placeholder={t('des.choix.askPlaceholder')}
              confirmLabel={t('des.choix.save')}
              launchLabel={t('des.choix.castFirst')}
            />

            {/* Carte Premier Choix — explicative uniquement */}
            <div className="mt-6">
              <div
                className="mx-auto max-w-2xl rounded-2xl p-5 sm:p-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(135,206,235,0.12) 0%, rgba(60,140,220,0.08) 100%)',
                  border: '1.5px solid rgba(135,206,235,0.5)',
                  boxShadow: 'inset 0 0 30px rgba(135,206,235,0.12)',
                }}
              >
                <h3
                  className="mb-3 text-center text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: '#87CEEB',
                    textShadow: '0 0 12px rgba(135,206,235,0.4)',
                  }}
                >
                  {t('des.choix.first')}
                </h3>
                <p
                  className="text-center text-xs italic"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(135,206,235,0.6)', marginBottom: 14 }}
                >
                  {t('des.choix.introFirst')}
                </p>
                <div
                  className="text-sm sm:text-base leading-relaxed text-center"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DCE6F5' }}
                >
                  <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('des.choix.instructFirst') }} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════════════ GOBELET + TUTORIEL ════════════ */}
        {(step === 'A_roll' || step === 'B_roll') && (
          <>
            <div
              ref={cupRef}
              style={{
                height: 460,
                opacity: ready ? 1 : 0,
                transition: 'opacity 450ms ease',
              }}
            >
              <AstroDiceCup
                key={resetSignal}
                targetFaces={faces}
                skin="moon"
                height={460}
                activeKinds={ACTIVE_DICE}
                onRest={handleRest}
                onReady={() => setReady(true)}
                resetSignal={resetSignal}
                launchSignal={0}
                onShake={() => setShowTutorial(false)}
              />
            </div>
            {/* Tutoriel */}
            <div
              ref={tutorialRef}
              className="flex flex-col items-center transition-opacity duration-300"
              style={{
                marginTop: 6,
                opacity: showTutorial ? 1 : 0,
                pointerEvents: showTutorial ? 'auto' : 'none',
              }}
            >
              <style>{`
                @keyframes swipe-shake-choix {
                  0%, 100% { transform: translateX(0); }
                  25% { transform: translateX(-16px); }
                  75% { transform: translateX(16px); }
                }
                .swipe-icon-choix {
                  animation: swipe-shake-choix 0.6s ease-in-out infinite;
                  font-size: 28px;
                  line-height: 1;
                  color: #87CEEB;
                  opacity: 0.85;
                  user-select: none;
                  -webkit-user-select: none;
                }
              `}</style>
              <svg className="swipe-icon-choix" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#87CEEB" d="M9.5 1C8.67 1 8 1.67 8 2.5v7.38l-1.7-.85c-.3-.15-.65-.2-1-.15a1.5 1.5 0 0 0-1.3 1.3c-.15.65.05 1.3.5 1.75l4.35 4.35c.3.3.7.45 1.15.45H18c1.1 0 2-.9 2-2V9.5c0-.65-.45-1.2-1.05-1.4l-5.1-1.85c-.15-.05-.3-.05-.45-.05-.15 0-.3.05-.45.1l-.95.4V2.5C12 1.67 11.33 1 10.5 1h-1Z" opacity="0.6"/>
                <path fill="#87CEEB" d="m17.5 14.5-2.12-1.06c-.2-.1-.44-.14-.67-.11l-1.83.35.88-3.53a1.25 1.25 0 0 0-.88-1.5c-.65-.18-1.3.2-1.48.85l-1.4 5.6-2.1-1.05.3 1.5 3.5 1.75c.3.15.65.2 1 .15H16c.65 0 1.2-.45 1.4-1.05l.35-1.05c.08-.25.05-.52-.08-.75l-.17-.15Z" opacity="0.4"/>
              </svg>
              <p
                className="text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.5rem',
                  maxWidth: 120,
                  lineHeight: 1.2,
                }}
              >
                {t('des.choix.tutorial')}
              </p>
            </div>
          </>
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
              <ResultLine faces={resultA} />
              <DiceAnalysis
                faces={resultA}
                activeKinds={ACTIVE_DICE}
                question={questionRef.current}
                spread="Premier Choix"
                readingId={readingAId}
                onInterpretationReady={setShortInterpA}
                onDeepAnalysisReady={setDeepAnalysisA}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ TRANSITION A → B (saisie 2e choix) ════════════ */}
        <AnimatePresence>
          {step === 'A_done' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              {/* AskQuestion pour le second choix — avec lancement intégré */}
              <AskQuestion
                key="qB"
                onConfirm={(q) => {
                  setQuestionB(q);
                  questionBRef.current = q;
                }}
                onLaunch={() => {
                  chooseB();
                  setTimeout(() => {
                    tutorialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 600);
                }}
                label={t('des.choix.askLabel')}
                placeholder={t('des.choix.secondPlaceholder')}
                confirmLabel={t('des.choix.save')}
                launchLabel={t('des.choix.castSecond')}
              />

              {/* Carte Second Choix — explicative uniquement */}
              <div
                className="mx-auto max-w-2xl rounded-2xl p-5 sm:p-6 mt-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(135,206,235,0.1) 0%, rgba(60,140,220,0.06) 100%)',
                  border: '1.5px solid rgba(135,206,235,0.4)',
                  boxShadow: 'inset 0 0 24px rgba(135,206,235,0.1)',
                }}
              >
                <h3
                  className="mb-3 text-center text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: '#87CEEB',
                    textShadow: '0 0 12px rgba(135,206,235,0.4)',
                  }}
                >
                  {t('des.choix.second')}
                </h3>
                <p
                  className="text-center text-xs italic"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(135,206,235,0.6)' }}
                >
                  {t('des.choix.introSecond')}
                </p>
              </div>
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
              <ResultLine faces={resultB} />
              <DiceAnalysis
                faces={resultB}
                activeKinds={ACTIVE_DICE}
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

                {/* Grille des 2 options */}
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Option A */}
                  <div className="space-y-3">
                    <RecapCard
                      label={t('des.choix.first')}
                      faces={resultA!}
                      question={questionRef.current}
                      shortInterpretation={shortInterpA}
                      deepAvailable={!!deepAnalysisA}
                      onToggleDeep={() => setShowDeepA(!showDeepA)}
                    />

                    {showDeepA && deepAnalysisA && (
                      <div
                        className="rounded-2xl p-5 text-sm leading-relaxed"
                        style={{
                          background: `linear-gradient(135deg, ${DICE_THEME.gold}14 0%, ${DICE_THEME.brick} 100%)`,
                          border: `1px solid ${DICE_THEME.gold}33`,
                          fontFamily: 'var(--font-cormorant), serif',
                          color: '#F0E6D3',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.7,
                        }}
                      >
                        {deepAnalysisA}
                      </div>
                    )}
                  </div>

                  {/* Option B */}
                  <div className="space-y-3">
                    <RecapCard
                      label={t('des.choix.second')}
                      faces={resultB!}
                      question={questionBRef.current}
                      shortInterpretation={shortInterpB}
                      deepAvailable={!!deepAnalysisB}
                      onToggleDeep={() => setShowDeepB(!showDeepB)}
                    />
                    {showDeepB && deepAnalysisB && (
                      <div
                        className="rounded-2xl p-5 text-sm leading-relaxed"
                        style={{
                          background: `linear-gradient(135deg, ${DICE_THEME.gold}14 0%, ${DICE_THEME.brick} 100%)`,
                          border: `1px solid ${DICE_THEME.gold}33`,
                          fontFamily: 'var(--font-cormorant), serif',
                          color: '#F0E6D3',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.7,
                        }}
                      >
                        {deepAnalysisB}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton Recommencer */}
                <div className="mt-8 text-center">
                  <DiceButton onClick={restart}>
                    {t('des.choix.restart')}
                  </DiceButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DiceBackground>
  );
}
