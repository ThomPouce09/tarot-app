'use client';

// app/des-divinatoires/choix/page.tsx — Niveau 2.2 : Le Tirage du choix (v2 « Duel »)
// Refonte validée par Thom (30/10/2026) : le consultant DÉPOSE son hésitation
// (deux options en phrases vécues + un nœud facultatif) ; UN SEUL lancer de
// Dés du Zodiaque éclaire la décision ; l'IA de la voyance professionnelle
// arbitre les deux options à la lumière du tirage (structure du duel CALCULÉE
// par le code — lib/duel-structure.ts — tissée, jamais récitée), ouvre les
// deux vies probables, nomme les angles morts, la condition qui renverserait
// le verdict, et offre la « Troisième Lumière ». C'est le consultant qui
// tranche, pas le tirage.
//
//   intro (dépôt des 2 options)
//   roll    → gobelet (un seul lancer, même environnement que /obstacle-solution)
//   pesee   → dès l'immobilisation : les 3 glyphes glissent vers leurs plateaux
//             (lecture du MOTEUR, calculée ici, diffusée PENDANT que l'IA rédige)
//   done    → verdict IA : les pesées se FIGENT (un glyphe qui traverse
//             l'écran = l'IA a corrigé le moteur), la balance se plante, et
//             l'argumentation se déplie sous la balance. Écho + choix final.
//
// Les anciens parcours v1 (deux lancers) ne sont plus écrits ; la LECTURE des
// anciens tirages 'des-choix' dans l'historique reste intacte (readings-views).

import dynamic from 'next/dynamic';
import YiSlideNav from '@/components/yi-slide-nav';
import EchoBox from '@/components/echo-box';
import AuthGate from '@/components/auth-gate';
import {
  DICE_THEME, DiceBackground, DiceTitle, DiceTutorial, OneLineQuestion,
  scrollToCupFit, useDiceCupHeight,
} from '../_shared';
import { Step, diceCards, diceStaticText } from './helpers';
import { DuelIntroCard } from './duel-intro';
import { DuelVerdictCard, type DuelVerdict } from './duel-verdict';
import { DuelBalance, applyIaPesees } from '@/components/duel-balance';
import { computeDuel } from '@/lib/duel-structure';
import type { Pesee, Side } from '@/lib/duel-structure';
import { TargetFaces, randomTargetFaces } from '@/components/astro-dice';
import { DiceSteps, ClickableFaces } from '@/components/astro-dice/constellation';
import { preloadAstroDice } from '@/components/astro-dice/preload';
import { dynamicWithRetry } from '@/lib/retry-dynamic';
import { tr, useLang, useT } from '@/lib/i18n';
import { pickAndPreloadWaitVideo } from '@/lib/preload-wait-videos';
import { saveReading, updateReading } from '@/lib/save-reading';
import { nextRaceSeq } from '@/lib/race-guard';
import { api } from '@/lib/api-client';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

const AstroDiceCup = dynamic(
  // Garde-fou téléphone d'entrée de gamme : chunk 3D trop lent →
  // 2 tentatives chronométrées avant de laisser le loading d'origine (8).
  dynamicWithRetry(() => import('@/components/astro-dice').then((m) => m.AstroDiceCup)),
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
  const t = useT();
  const lang = useLang();

  // ── état machine v2 (les anciens A_*/B_* restent typés pour la compat
  //    historique ; plus personne ne les écrit) ──
  const [step, setStep] = useState<Step>('intro');

  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 } as TargetFaces) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  // Dépôt du consultant (les deux options + le nœud) — refs pour snapshots.
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [knot, setKnot] = useState('');
  const duelRef = useRef<{ a: string; b: string; knot: string } | null>(null);
  // Une ligne, sous le titre, rappelant l'hésitation déposée.
  const question = optA && optB ? `A — ${optA}   ⇄   B — ${optB}` : null;

  // ── La pesée (moteur) puis le verdict (IA) ──
  const [pesees, setPesees] = useState<Pesee[]>([]);
  const [balance, setBalance] = useState<Side | null>(null);
  const [iaArrived, setIaArrived] = useState(false);
  const [verdict, setVerdict] = useState<DuelVerdict | null>(null);
  const [iaError, setIaError] = useState(false);

  const [readingId, setReadingId] = useState<string | null>(null);
  const readingIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const cupRef = useRef<HTMLDivElement | null>(null);
  const tutorialRef = useRef<HTMLDivElement | null>(null);
  const cupAreaRef = useRef<HTMLDivElement | null>(null);
  // Hauteur d'arène OPTIMISÉE par écran (bandeau + tuto MESURÉS).
  const cupH = useDiceCupHeight(tutorialRef, step === 'roll', cupAreaRef);

  const scrollToCup = useCallback(() => {
    scrollToCupFit(cupRef.current ?? cupAreaRef.current, tutorialRef.current);
  }, []);

  useEffect(() => {
    if (step === 'roll') {
      const tt = setTimeout(scrollToCup, 600);
      return () => clearTimeout(tt);
    }
  }, [step, scrollToCup]);

  const launchDuel = useCallback((a: string, b: string, k: string) => {
    duelRef.current = { a, b, knot: k };
    setOptA(a); setOptB(b); setKnot(k);
    setFaces(randomTargetFaces());
    setStep('roll');
    setShowTutorial(true);
    // reset du tirage précédent
    setPesees([]); setBalance(null); setIaArrived(false); setVerdict(null);
    setIaError(false);
    savedRef.current = false;
    setResetSignal((n) => n + 1);
  }, []);

  // ── Verdict IA : appelé dès l'immobilisation des dés (l'UI anime la pesée
  //    du moteur PENDANT la rédaction ; course-guard si relance). ──
  const lastSeqRef = useRef(0);
  const fetchVerdict = useCallback(async (f: TargetFaces, a: string, b: string, k: string) => {
    const seq = nextRaceSeq();
    lastSeqRef.current = seq;
    try {
      const res = await api('/api/astro-choix-verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faces: f, optionA: a, optionB: b, knot: k || undefined, lang }),
      });
      const data = await res.json();
      if (seq !== lastSeqRef.current) return;
      if (data && data.verdict) {
        // Le moteur affichait déjà SES pesées ; l'IA confirme ou CORRIGE
        // (le glyphe dont le plateau change traverse l'écran — delta animé).
        setPesees((prev) => applyIaPesees(prev, data.peseesIA ?? null));
        const base = computeDuel(f, a, b);
        // la route NE REND PLUS QUE des majorités (2-1 ou 3-0) : la balance tombe.
        const iaBal: Side = data.balanceIA === 'A' || data.balanceIA === 'B' ? data.balanceIA : base.balance;
        setBalance(iaBal);
        setVerdict(data.verdict as DuelVerdict);
        setIaArrived(true);
        // enrichir la lecture enregistrée avec le verdict
        if (readingIdRef.current) {
          updateReading(readingIdRef.current, {
            interpretation: JSON.stringify({
              version: 'des-choix-v2', faces: f, optionA: a, optionB: b, knot: k,
              structure: base, verdict: data.verdict, balance: iaBal,
            }),
          });
        }
      } else {
        setIaError(true);
      }
    } catch {
      if (seq === lastSeqRef.current) setIaError(true);
    }
  }, [lang]);

  const handleRest = useCallback((f: TargetFaces) => {
    // lecture du MOTEUR (calculée ici, identique à celle de la route : fonction pure)
    const d = duelRef.current;
    if (!d) return;
    const structure = computeDuel(f, d.a, d.b);
    setPesees(structure.pesees);
    setBalance(structure.balance);
    setStep('done');

    if (!savedRef.current) {
      savedRef.current = true;
      saveReading({
        type: 'des-choix',
        spread: 'Duel',
        cards: diceCards(f),
        interpretation: JSON.stringify({
          version: 'des-choix-v2', faces: f, optionA: d.a, optionB: d.b, knot: d.knot,
          structure, balance: structure.balance,
        }),
        question: `A — ${d.a}   ⇄   B — ${d.b}`,
      }).then((id) => { if (id) { setReadingId(id); readingIdRef.current = id; } });
    }
    fetchVerdict(f, d.a, d.b, d.knot);
    // La balance vient de se monter (le gobelet s'est démonté → scroll libre) :
    // on recentre dessus, puis une 2ᵉ passe après le glissement des glyphes.
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 600);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 5600);
  }, [fetchVerdict]);



  return (
    <DiceBackground starry>
      <YiSlideNav />
      <DiceTitle title={t('des.choix.title')} />

      {/* Fil d'étapes : Confier › Lancer › Pesée › Trancher */}
      <DiceSteps
        steps={
          lang === 'en' ? ['Entrust', 'Cast', 'Weighing', 'Decide']
          : lang === 'es' ? ['Confiar', 'Lanzar', 'Pesée', 'Decidir']
          : lang === 'hi' ? ['सौंपें', 'फेंकें', 'तौल', 'निर्णय']
          : ['Confier', 'Lancer', 'Pesée', 'Trancher']
        }
        current={step === 'intro' ? 0 : step === 'roll' ? 1 : step === 'pesee' ? 2 : 3}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Hésitation déposée — une ligne, tap pour la modale entière */}
        {question && step !== 'roll' && (
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

        {/* ════════════ DÉPÔT DES DEUX OPTIONS ════════════ */}
        {step === 'intro' && (
          <div className="mt-6">
            <DuelIntroCard onLaunch={launchDuel} />
          </div>
        )}

        {/* ════════════ GOBELET (un seul lancer) + TUTORIEL ════════════ */}
        {step === 'roll' && (
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
            <DiceTutorial show={showTutorial} boxRef={tutorialRef} text={t('des.choix.tutorial')} />
          </div>
        )}

        {/* ════════════ LA BALANCE (pesée animée → verdict figé) ════════════ */}
        <AnimatePresence>
          {step === 'done' && pesees.length > 0 && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4"
            >
              <div className="mb-1"><ClickableFaces faces={faces} /></div>
              <DuelBalance
                phase={!iaArrived ? 'pesee' : 'verdict'}
                pesees={pesees}
                plateaux={[
                  { label: t('des.choix.duel.pathA'), text: optA },
                  { label: t('des.choix.duel.pathB'), text: optB },
                ]}
                balance={balance}
                awaiting={iaArrived ? null : t('des.choix.duel.weighing')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ VERDICT DÉPLIÉ + TRANCHÉ DU CONSULTANT ════════════ */}
        <AnimatePresence>
          {verdict && (
            <motion.div className="mt-5">
              <DuelVerdictCard
                verdict={verdict}
                balance={balance === 'B' ? 'B' : 'A'}
              />

              {/* L'Écho scellé — après le verdict : l'augure J+40 demandera
                  lequel des deux chemins le consultant aura suivi. */}
              {readingId && (
                <div className="mt-4">
                  <EchoBox
                    domain="des"
                    readingId={readingId}
                    question={question}
                    summary={`Duel — A : ${optA} || B : ${optB}${knot ? ` || nœud : ${knot}` : ''} || verdict : ${verdict.resume}`}
                  />
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ Filet honnête : l'IA n'a pas répondu — la balance du
              moteur reste, le consultant tranche seul. ════════════ */}
        {!verdict && iaError && (
          <p className="mt-6 text-center text-sm italic" style={{ color: `${DICE_THEME.glyph}bb`, fontFamily: 'var(--font-cormorant), serif' }}>
            {t('des.choix.duel.aiUnavailable')}
          </p>
        )}

        <div className="h-16" />
      </div>
    </DiceBackground>
  );
}

export default function GatedPage() {
  return <AuthGate><ChoixPage /></AuthGate>;
}
