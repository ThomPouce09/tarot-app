'use client';

// app/des-divinatoires-simplifie/page.tsx — « Les Dés du Zodiaque Simplifié »
//
// Même mécanique que /tarot-3-cartes-simplifie et /yi-jing-simplifie :
//   ÉTAPE 1 — l'intention : 4 Éléments astrologiques × 5 intentions
//             (DiceThemeSelector). La question composée « Élément — intention »
//             est mémorisée puis affichée en bandeau discret.
//   ÉTAPE 2 — le tirage de base : le gobelet <AstroDiceCup/> avec les 3 dés
//             (Planète, Signe, Maison), exactement comme /affinage — sans la
//             phase d'affinage. Analyse du tirage = les mêmes briques que
//             /affinage (statique + DB + oracle flash + analyse approfondie),
//             l'intention servant de question ancrée dans tous les prompts.
//
// Le tirage est sauvegardé sous le type 'des-simplifie' = tirage de BASE de
// l'univers « dés » dans lib/classification.ts (comme tarot-3-cartes-simplifie
// et yi-jing-simplifie pour leurs univers).

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  DiceBackground,
  DiceTitle,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../des-divinatoires/_shared';
import { randomTargetFaces, ALL_KINDS, type TargetFaces } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { planetName, signName, houseName, dieKindLabel } from '@/components/astro-dice/names';
import { HintLegende, ClickableFaces, legendeSeen, markLegendeSeen } from '@/components/astro-dice/constellation';
import { saveReading, updateReading } from '@/lib/save-reading';
import { nextRaceSeq } from '@/lib/race-guard';
import { preloadAstroDice } from '@/components/astro-dice/preload';
import { api } from '@/lib/api-client';
import EchoBox from '@/components/echo-box';
import AuthGate from '@/components/auth-gate';
import { useT, useLang, contentLang, pickContent, tr , getRuntimeLang} from '@/lib/i18n';
import { DiceThemeSelector, parseDiceQuestion } from './theme-selector';
import AnalysisWaitCard from '@/components/analysis-wait-card';

/* « Relancer » — pilule dorée gloss 3D (recette du bouton « Enregistrer », teinte or). */
function GoldGlossButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="rounded-full px-7 py-3 text-sm font-bold transition-all hover:brightness-110"
      style={{
        background: `
          linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 38%, rgba(255,255,255,0) 60%),
          linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)`,
        color: '#241505',
        fontFamily: 'var(--font-cinzel), serif',
        boxShadow: '0 0 18px rgba(212,175,55,0.55), inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -3px 7px rgba(0,0,0,0.35)',
        letterSpacing: '0.04em',
        border: '1.5px solid rgba(232,198,106,0.6)',
      }}
    >
      {children}
    </motion.button>
  );
}

/* E-mail de session (localStorage) pour le verrou serveur d'analyse. */

const AstroDiceCup = dynamic(
  () => import('@/components/astro-dice').then((m) => m.AstroDiceCup),
  { ssr: false, loading: () => <DiceLoader /> },
);

function DiceLoader() {
  return (
    <div
      className="flex items-center justify-center rounded-2xl"
      style={{ height: 440, background: '#1a0e0a', color: DICE_THEME.ocreLight }}
    >
      <span style={{ fontFamily: 'var(--font-cinzel), serif' }}>
        {tr("Préparation des dés…", "Preparing the dice…", "Preparando los dados…", "पासे तैयार हो रहे हैं…")}
      </span>
    </div>
  );
}

const KIND_LABEL: Record<string, string> = {
  planet: 'Planète',
  sign: 'Signe',
  house: 'Maison',
};

function diceCardsFor(f: TargetFaces) {
  return ALL_KINDS.map((k) => ({
    kind: k,
    value: f[k],
    label:
      k === 'planet'
        ? planetName(f[k] as string, getRuntimeLang())
        : k === 'sign'
          ? signName(f[k] as string, getRuntimeLang())
          : houseName(f[k], getRuntimeLang()),
  }));
}
function diceStaticTextFor(f: TargetFaces) {
  return ALL_KINDS.map((k) => `${KIND_LABEL[k]} ${f[k]} : ${meaningFor(k, f[k])}`).join('\n');
}

type Phase = 'intention' | 'firstRoll' | 'firstDone';

function SimplifiePage() {
  // Le chunk WebGL du gobelet se télécharge dès l'arrivée sur la page :
  // quand l'utilisateur atteint l'étape de tirage, plus rien ne « charge ».
  useEffect(() => { preloadAstroDice(); }, []);
  const t = useT();
  const lang = useLang();
  // Légende « Planète / Signe / Maison » : 3 bulles affichées une seule fois
  // (première découverte du vocabulaire), tap pour fermer.
  const [legendeOn, setLegendeOn] = useState(false);
  useEffect(() => { setLegendeOn(!legendeSeen()); }, []);
  const closeLegende = useCallback(() => { setLegendeOn(false); markLegendeSeen(); }, []);
  const [phase, setPhase] = useState<Phase>('intention');
  // Question composée « Élément — intention » (le tirage n'apparaît qu'après).
  const [question, setQuestion] = useState<string | null>(null);
  const theme = parseDiceQuestion(question);
  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 }) : randomTargetFaces()
  );
  const skin = 'moon';
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [result, setResult] = useState<Partial<TargetFaces>>(faces);
  const resultRef = useRef<HTMLDivElement>(null);

  // Oracle flash — réponse courte, déclenchée automatiquement après le tirage
  const [oracleFlash, setOracleFlash] = useState<string | null>(null);
  const [oracleFlashLoading, setOracleFlashLoading] = useState(false);
  const [oracleErrored, setOracleErrored] = useState(false);
  // Interprétation DB (curated, combo planète×signe×maison)
  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Persistance historique (une seule lecture par tirage)
  const readingIdRef = useRef<string | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const savedRef = useRef(false);
  const interpAccRef = useRef<Record<string, any>>({});

  // ── Verrouillage du scroll pendant le lancer (comme /affinage) ──
  const lockScrollImmediate = useCallback(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'none';
  }, []);
  const unlockScrollImmediate = useCallback(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.documentElement.style.touchAction = '';
  }, []);
  useLayoutEffect(() => {
    if (phase === 'firstRoll') lockScrollImmediate();
    else unlockScrollImmediate();
  }, [phase, lockScrollImmediate, unlockScrollImmediate]);

  // Tutoriel sous l'astrodice (MOULE /affinage) : affiché au montage du
  // gobelet, démonté à la première secousse — et il ne réserve AUCUNE place
  // une fois masqué (démonté, pas fondu).
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    if (phase === 'firstRoll') {
      const t = window.setTimeout(() => setShowTutorial(true), 500);
      return () => window.clearTimeout(t);
    }
    setShowTutorial(false);
  }, [phase]);

  // Lancer : validé par l'intention → on brasse et on jette.
  const launch = useCallback((q: string) => {
    setQuestion(q);
    setFaces(randomTargetFaces());
    setPhase('firstRoll');
    setResetSignal((n) => n + 1);
    setOracleFlash(null);
    setOracleErrored(false);
    setDbInterpretation(null);
    savedRef.current = false;
    readingIdRef.current = null;
    setReadingId(null);
    interpAccRef.current = {};
  }, []);

  // Réception du résultat du gobelet : le tirage est posé.
  const handleRest = useCallback(
    async (f: TargetFaces) => {
      setResult({ ...f });
      setPhase('firstDone');
      unlockScrollImmediate();
      if (!savedRef.current) {
        savedRef.current = true;
        interpAccRef.current = {
          static: diceStaticTextFor(f),
          cards: diceCardsFor(f),
        };
        const id = await saveReading({
          type: 'des-simplifie',
          spread: 'Tirage complet — intention guidée',
          cards: diceCardsFor(f),
          interpretation: JSON.stringify(interpAccRef.current),
          question,
        });
        if (id) { readingIdRef.current = id; setReadingId(id); }
      }
    },
    [question, unlockScrollImmediate]
  );

  // Amener l'utilisateur au résultat dès qu'il apparaît.
  useEffect(() => {
    if (phase !== 'firstDone') return;
    // Le repli de l'arène du gobelet s'anime sur 550 ms : on scrolle APRÈS,
    // sinon la position mesurée est fausse (trop haute, vide intermédiaire).
    const t = setTimeout(() => {
      const el = resultRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 80), behavior: 'smooth' });
    }, 620);
    return () => clearTimeout(t);
  }, [phase]);

  // ── DB (curated) après chaque tirage ──
  const dbLastSeqRef = useRef(0);
  useEffect(() => {
    if (phase !== 'firstDone') return;
    const planetGlyph = result.planet;
    const signGlyph = result.sign;
    const houseNum = result.house;
    if (!planetGlyph || !signGlyph || !houseNum) return;
    const planet = PLANET_NAMES[planetGlyph as string];
    const sign = SIGN_NAMES[signGlyph as string];
    if (!planet || !sign) return;
    const seq = nextRaceSeq();
    dbLastSeqRef.current = seq;
    setDbLoading(true);
    setDbInterpretation(null);
    api('/api/astro-interpretation-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planet, sign, house: `Maison ${houseNum}` }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (seq !== dbLastSeqRef.current) return;
        if (data.found && data.interpretation) {
          setDbInterpretation(data.interpretation);
          interpAccRef.current.dbInterpretation = data.interpretation;
          if (readingIdRef.current) {
            updateReading(readingIdRef.current, { interpretation: JSON.stringify(interpAccRef.current) });
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (seq === dbLastSeqRef.current) setDbLoading(false); });
  }, [phase, result.planet, result.sign, result.house]);

  // ── Oracle flash — automatique, ancré sur l'intention ──
  // Guard anti-course : si un nouveau tirage arrive pendant que la requête est
  // en vol, la réponse tardive de l'ancien tirage ne doit pas écraser l'état.
  const oracleLastSeqRef = useRef(0);
  const launchOracle = useCallback(() => {
    if (!result.planet || !result.sign || !result.house) return;
    const seq = nextRaceSeq();
    oracleLastSeqRef.current = seq;
    setOracleErrored(false);
    setOracleFlashLoading(true);
    const startedAt = Date.now();
    api('/api/astro-dice-oracle-flash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faces: { planet: result.planet, sign: result.sign, house: result.house },
        activeKinds: ['planet', 'sign', 'house'],
        question: question || undefined,
        length: 'standard', // réponse de 4-5 phrases (Dés Simplifié)
        lang,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error('http'); return r.json(); })
      .then((data) => {
        if (seq !== oracleLastSeqRef.current) return;
        // Fenêtre d'attente garantie ≥ 4 s (exigence user) : la vidéo
        // d'analyse reste à l'écran même si l'IA répond plus vite.
        const apply = () => {
          if (seq !== oracleLastSeqRef.current) return;
          if (data.oracle) {
            setOracleFlash(data.oracle);
            interpAccRef.current.oracleFlash = data.oracle;
            if (readingIdRef.current) {
              updateReading(readingIdRef.current, { interpretation: JSON.stringify(interpAccRef.current) });
            }
          } else {
            // Réponse vide (LLM muet) → plantage : bouton de relance.
            setOracleErrored(true);
          }
          setOracleFlashLoading(false);
        };
        const hold = Math.max(0, 4000 - (Date.now() - startedAt));
        if (hold > 0) window.setTimeout(apply, hold);
        else apply();
      })
      .catch(() => {
        const hold = Math.max(0, 4000 - (Date.now() - startedAt));
        window.setTimeout(() => {
          if (seq !== oracleLastSeqRef.current) return;
          setOracleErrored(true);
          setOracleFlashLoading(false);
        }, hold);
      });
  }, [result, question]);
  useEffect(() => {
    if (phase !== 'firstDone') return;
    // Une erreur affichée attend le clic : pas de nouvelle tentative automatique.
    if (oracleFlash !== null || oracleFlashLoading || oracleErrored) return;
    launchOracle();
  }, [phase, result, oracleFlash, oracleFlashLoading, oracleErrored, launchOracle]);

  // Recentre la vue sur l'oracle IA dès qu'il tombe (l'arène qui se
  // replie + le temps de réponse peuvent le laisser hors champ sinon).
  const oracleBlockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!oracleFlash || phase !== 'firstDone') return;
    const t = setTimeout(() => {
      const el = oracleBlockRef.current;
      if (!el) return;
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 76), behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(t);
  }, [oracleFlash, phase]);


  const showResult = phase === 'firstDone';
  const intentionLabel = theme ? `${pickContent(theme.theme.label, lang)} — ${theme.sub}` : question;

  /* ── ÉTAPE 1 — l'intention (les 4 Éléments × 5 intentions) ── */
  if (phase === 'intention') {
    return (
      <DiceBackground starry starryVariant="gold">
        <YiSlideNav />
        <DiceTitle
          title={t('des.simplifie.castTitle')}
          subtitle={t('des.simplifie.subtitle')}
        />
        <div className="mx-auto max-w-2xl px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
            className="mt-2"
          >
            <DiceThemeSelector onConfirm={launch} />
          </motion.div>
        </div>
      </DiceBackground>
    );
  }

  /* ── ÉTAPE 2 — le tirage des 3 dés (mécanique /affinage, sans affinage) ── */
  return (
    <>
    <DiceBackground starry starryVariant="gold">
      <YiSlideNav />
      <DiceTitle title={t('des.simplifie.castTitle')} />

      <div className="mx-auto max-w-2xl px-4 pb-10">
        {/* Bandeau discret de l'intention (jamais sur les dés) */}
        {intentionLabel && (
          <div
            className="mx-auto mb-2 w-fit rounded-full px-4 py-1.5 text-center"
            style={{
              background: `${DICE_THEME.gold}14`,
              border: `1px solid ${DICE_THEME.gold}44`,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: DICE_THEME.ocreLight,
                fontSize: '0.75rem',
                letterSpacing: '0.04em',
              }}
            >
              ✦ {intentionLabel}
            </p>
          </div>
        )}
        {/* Arène du gobelet : se REPLIE (hauteur animée → 0) dès que le tirage
            est posé, pour que le résultat remonte sous le titre sans grand
            vide. Le gobelet est démonté juste après (see below). */}
        <div className="relative overflow-visible" style={{ height: showResult ? 0 : 460, zIndex: 0, transition: 'height 550ms ease' }}>
          {!showResult && (
          <div
            style={{
              height: 460,
              opacity: ready ? 1 : 0,
              overflow: 'hidden',
              transition: 'opacity 450ms ease',
              pointerEvents: ready ? 'auto' : 'none',
              marginTop: -16,
            }}
          >
            <AstroDiceCup
              key={resetSignal}
              targetFaces={faces}
              skin={skin}
              height={460}
              activeKinds={ALL_KINDS}
              onRest={handleRest}
              onReady={() => setReady(true)}
              resetSignal={resetSignal}
              launchSignal={0}
              onShake={() => setShowTutorial(false)}
              lockScroll={phase === 'firstRoll'}
              diceHop={0.18}
            />
          </div>
          )}
        </div>

        {/* Tutoriel en dessous de l'astrodice (le même que /affinage) */}
        {showTutorial && !showResult && (
          <div className="flex flex-col items-center" style={{ marginTop: 4 }}>
            <style>{`
              @keyframes swipe-shake-simplifie {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-16px); }
                75% { transform: translateX(16px); }
              }
              .swipe-icon-simplifie {
                animation: swipe-shake-simplifie 0.6s ease-in-out infinite;
                font-size: 28px;
                line-height: 1;
                color: #87CEEB;
                opacity: 0.5;
                user-select: none;
                -webkit-user-select: none;
              }
            `}</style>
            <span className="material-symbols-outlined swipe-icon-simplifie">swipe</span>
            <p
              className="text-center leading-tight"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.5rem',
                maxWidth: 120,
                lineHeight: 1.2,
              }}
            >
              {tr("Secouez le gobelet pour mélanger les dés, puis poussez vers le haut pour les jeter", "Shake the cup to mix the dice, then swipe up to cast them", "Agite el vaso para mezclar los dados y deslice hacia arriba para lanzarlos", "गिलास को हिलाकर पाशों को मिलाएँ, फिर फेंकने के लिए ऊपर स्लाइड करें")}
            </p>
          </div>
        )}

        <AnimatePresence>
          {showResult && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              {/* Légende découverte (1re fois) : Planète = énergie, Signe = sa
                  couleur, Maison = le domaine de vie touché. */}
              <div className="relative">
                <HintLegende open={legendeOn && showResult} onClose={closeLegende} />
              </div>

              {/* Analyse : statique immédiate + oracle flash + approfondie */}
              <div
                className="mx-auto mt-5 max-w-2xl rounded-3xl p-5 sm:p-6"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.ocre}14 0%, ${DICE_THEME.brick} 100%)`,
                  border: `1.5px solid ${DICE_THEME.ocre}55`,
                  boxShadow: `inset 0 0 30px ${DICE_THEME.ocre}14`,
                }}
              >
                <h3
                  className="mb-2 text-center text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: DICE_THEME.ocreLight,
                    textShadow: `0 0 12px ${DICE_THEME.gold}44`,
                  }}
                >
                  {t('des.affinage.analysisTitle')}
                </h3>

                {/* Pilule des faces (moule /choix) : un tap ouvre la modale
                    donnant la signification exacte de chaque dé. */}
                <div className="mb-1">
                  <ClickableFaces faces={result as TargetFaces} />
                </div>

                {oracleFlashLoading && (
                  <AnalysisWaitCard
                    accent={DICE_THEME.gold}
                    title={t('des.affinage.thinking')}
                    videoPrefix="analyse-des-zodiaque"
                    minHeight={220}
                  />
                )}
                {oracleErrored && !oracleFlashLoading && !oracleFlash && (
                  <div
                    className="mt-6 rounded-2xl p-4 text-center"
                    style={{
                      background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
                      border: `1.5px solid ${DICE_THEME.gold}66`,
                    }}
                  >
                    <p
                      className="text-sm italic"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
                    >
                      {t('des.simplifie.oracleError')}
                    </p>
                    <div className="mt-3">
                      <GoldGlossButton onClick={launchOracle}>
                        🔄 {t('des.simplifie.relaunch')}
                      </GoldGlossButton>
                    </div>
                  </div>
                )}
                {oracleFlash && (
                  <div
                    ref={oracleBlockRef}
                    className="mt-6 rounded-2xl p-4"
                    style={{
                      background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
                      border: `1.5px solid ${DICE_THEME.gold}66`,
                      boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
                    }}
                  >
                    <p
                      className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                    >
                      {t('des.simplifie.oracle')}
                    </p>
                    <p
                      className="text-center text-sm leading-relaxed italic"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
                    >
                      « {oracleFlash} »
                    </p>
                  </div>
                )}
                {!oracleFlash && !oracleFlashLoading && dbInterpretation && (
                  <div
                    className="mt-6 rounded-2xl p-4"
                    style={{
                      background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
                      border: `1.5px solid ${DICE_THEME.gold}66`,
                    }}
                  >
                    <p
                      className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                      style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                    >
                      {t('des.simplifie.summary')}
                    </p>
                    <p
                      className="text-center text-sm leading-relaxed"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
                    >
                      {dbInterpretation}
                    </p>
                  </div>
                )}

                  {/* ✶ L'Augure scellé — prémonction née de cette lecture. */}
                  {readingId && oracleFlash && (
                    <EchoBox
                      domain="des"
                      readingId={readingId}
                      question={question}
                      summary={oracleFlash.slice(0, 1200)}
                    />
                  )}
                </div>

              {/* Recommencer (autre intention) — supprimé sur demande : retour via le menu */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DiceBackground>
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=swipe"
    />
    </>
  );
}

export default function GatedPage() {
  return (
    <AuthGate>
      <SimplifiePage />
    </AuthGate>
  );
}
