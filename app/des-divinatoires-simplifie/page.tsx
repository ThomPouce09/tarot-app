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
  DiceButton,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../des-divinatoires/_shared';
import { randomTargetFaces, ALL_KINDS, type TargetFaces } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { saveReading, updateReading } from '@/lib/save-reading';
import { nextRaceSeq } from '@/lib/race-guard';
import EchoBox from '@/components/echo-box';
import AuthGate from '@/components/auth-gate';
import { useT, useLang } from '@/lib/i18n';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import OracleWaitAnimation, { setOracleWait } from '@/components/oracle-wait-animation';
import { DiceThemeSelector, parseDiceQuestion } from './theme-selector';

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
function readEmailLocal(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? ''; } catch { return ''; }
}

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
        Préparation des dés…
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
        ? PLANET_NAMES[f[k] as string]
        : k === 'sign'
          ? SIGN_NAMES[f[k] as string]
          : `Maison ${f[k]}`,
  }));
}
function diceStaticTextFor(f: TargetFaces) {
  return ALL_KINDS.map((k) => `${KIND_LABEL[k]} ${f[k]} : ${meaningFor(k, f[k])}`).join('\n');
}

type Phase = 'intention' | 'firstRoll' | 'firstDone';

function SimplifiePage() {
  const t = useT();
  const lang = useLang();
  // Verrou « Analyser en profondeur » : réservé Initié/Arkane (modale paywall).
  const { sub, gateReason, closeGate, openGate } = useEntitlement();
  const canDeep = sub?.level === 'initie' || sub?.level === 'arkane';
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

  // Analyse LLM approfondie (bouton « Analyser en profondeur »)
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisSections, setAnalysisSections] = useState<
    { key: string; label: string; text: string }[] | null
  >(null);
  const [analysisSynthese, setAnalysisSynthese] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisErrored, setAnalysisErrored] = useState(false);
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

  // Lancer : validé par l'intention → on brasse et on jette.
  const launch = useCallback((q: string) => {
    setQuestion(q);
    setFaces(randomTargetFaces());
    setPhase('firstRoll');
    setResetSignal((n) => n + 1);
    setAnalysis(null);
    setAnalysisSections(null);
    setAnalysisSynthese('');
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
    if (phase === 'firstDone' && resultRef.current) {
      const top = resultRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 80), behavior: 'smooth' });
    }
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
    fetch('/api/astro-interpretation-db', {
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
    fetch('/api/astro-dice-oracle-flash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faces: { planet: result.planet, sign: result.sign, house: result.house },
        activeKinds: ['planet', 'sign', 'house'],
        question: question || undefined,
        length: 'standard', // réponse de 4-5 phrases (Dés Simplifié)
      }),
    })
      .then((r) => { if (!r.ok) throw new Error('http'); return r.json(); })
      .then((data) => {
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
      })
      .catch(() => { if (seq === oracleLastSeqRef.current) setOracleErrored(true); })
      .finally(() => { if (seq === oracleLastSeqRef.current) setOracleFlashLoading(false); });
  }, [result, question]);
  useEffect(() => {
    if (phase !== 'firstDone') return;
    // Une erreur affichée attend le clic : pas de nouvelle tentative automatique.
    if (oracleFlash !== null || oracleFlashLoading || oracleErrored) return;
    launchOracle();
  }, [phase, result, oracleFlash, oracleFlashLoading, oracleErrored, launchOracle]);

  // ── Analyse approfondie (bouton) ──
  const analysisLastSeqRef = useRef(0);
  const runAnalysis = useCallback(async () => {
    const seq = nextRaceSeq();
    analysisLastSeqRef.current = seq;
    setAnalysisLoading(true);
    setAnalysisErrored(false);
    setAnalysis(null);
    setAnalysisSections(null);
    setAnalysisSynthese('');
    try {
      const res = await fetch('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faces: result,
          activeKinds: ALL_KINDS,
          mode: 'global',
          dbInterpretation: dbInterpretation || undefined,
          question: question || undefined,
          requireInitie: true,        // verrou serveur : Initié/Arkane seuls
          email: sub ? readEmailLocal() : undefined,
        }),
      });
      // 403 tier → l'utilisateur a changé de statut entre-temps : modale paywall.
      if (res.status === 403) {
        setAnalysisLoading(false);
        openGate('limit-grand');
        return;
      }
      // Réponse HTTP en erreur (LLM en panne, timeout serveur) → relance possible.
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (seq !== analysisLastSeqRef.current) return;
      let interpretationText = '';
      if (data.sections && Array.isArray(data.sections) && data.sections.length) {
        setAnalysisSections(data.sections);
        setAnalysisSynthese(data.synthese || '');
        interpretationText = JSON.stringify(data);
      } else if (data.texte && String(data.texte).trim()) {
        const txt = String(data.texte).trim();
        // L'API renvoie un texte d'échec (LLM muet) → plantage : relance possible.
        if (/pas pu .re g.n.r.e|voilent un instant/i.test(txt)) throw new Error('gen');
        interpretationText = txt;
        setAnalysis(txt);
      } else {
        // Réponse vide/experte (« Analyse indisponible ») → plantage :
        // on lève l'erreur pour afficher le bouton de relance.
        throw new Error('empty');
      }
      const analysisPayload = data.sections
        ? { sections: data.sections, synthese: data.synthese || '', mode: 'global' }
        : { texte: interpretationText, mode: 'global' };
      interpAccRef.current.analysisGlobal = analysisPayload;
      if (readingIdRef.current && interpretationText) {
        updateReading(readingIdRef.current, { interpretation: JSON.stringify(interpAccRef.current) });
      }
    } catch {
      if (seq === analysisLastSeqRef.current) {
        setAnalysisErrored(true);
        setAnalysis('Les étoiles se sont voilées… Réessaie l’analyse.');
      }
    } finally {
      if (seq === analysisLastSeqRef.current) setAnalysisLoading(false);
    }
  }, [result, question, dbInterpretation]);

  // L'overlay d'attente cosmique (au milieu de l'écran) vit pendant la 1ʳᵉ
  // réflexion IA et pendant l'analyse approfondie : l'animation est partout
  // où l'oracle travaille, au centre de l'écran, dès le tirage des dés posés.
  useEffect(() => { setOracleWait(oracleFlashLoading || analysisLoading); }, [oracleFlashLoading, analysisLoading]);
  useEffect(() => () => setOracleWait(false), []);

  const showResult = phase === 'firstDone';
  const intentionLabel = theme ? `${theme.theme.label[lang]} — ${theme.sub}` : question;

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
        <div className="relative overflow-visible" style={{ height: 460, zIndex: 0 }}>
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
              lockScroll={phase === 'firstRoll'}
              diceHop={0.18}
            />
          </div>
        </div>

        <AnimatePresence>
          {showResult && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              {/* Carte-résultat : les 3 dés, glyphe + nom */}
              <div
                className="mx-auto max-w-2xl rounded-3xl p-5 sm:p-6"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDark} 100%)`,
                  border: `1.5px solid ${DICE_THEME.gold}66`,
                  boxShadow: `0 0 40px ${DICE_THEME.gold}22, inset 0 0 30px ${DICE_THEME.gold}10`,
                }}
              >
                <h3
                  className="mb-4 text-center text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: DICE_THEME.ocreLight,
                    textShadow: `0 0 12px ${DICE_THEME.gold}44`,
                  }}
                >
                  {t('des.affinage.yourDice')}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {ALL_KINDS.map((k) => {
                    const val = result[k] as string | number;
                    const dieName =
                      k === 'planet'
                        ? PLANET_NAMES[val as string]
                        : k === 'sign'
                          ? SIGN_NAMES[val as string]
                          : `Maison ${val}`;
                    return (
                      <div
                        key={k}
                        className="flex flex-col items-center rounded-2xl p-3 text-center"
                        style={{
                          background: `${DICE_THEME.gold}0f`,
                          border: `1px solid ${DICE_THEME.gold}33`,
                        }}
                      >
                        <div className="text-4xl leading-none" style={{ color: '#87CEEB' }}>
                          {val}
                        </div>
                        <div
                          className="mt-2 text-xs uppercase tracking-widest"
                          style={{ color: DICE_THEME.glyph, opacity: 0.7 }}
                        >
                          {KIND_LABEL[k]}
                        </div>
                        <p
                          className="mt-2 text-base font-semibold leading-snug"
                          style={{
                            fontFamily: 'var(--font-cinzel), serif',
                            color: DICE_THEME.ocreLight,
                            textShadow: `0 0 10px ${DICE_THEME.gold}44`,
                          }}
                        >
                          {dieName}
                        </p>
                      </div>
                    );
                  })}
                </div>
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

                <div className="space-y-3">
                  {ALL_KINDS.map((k) => {
                    const val = result[k] as string | number;
                    return (
                      <div
                        key={k}
                        className="flex gap-3 text-sm leading-relaxed"
                        style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                      >
                        <span className="mt-0.5 text-2xl leading-none" style={{ color: '#87CEEB' }}>
                          {val}
                        </span>
                        <span style={{ opacity: 0.92 }}>{meaningFor(k, val)}</span>
                      </div>
                    );
                  })}
                </div>

                {oracleFlashLoading && (
                  <div
                    className="mt-5 rounded-2xl p-4 text-center text-xs italic"
                    style={{
                      background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
                      border: `1.5px solid ${DICE_THEME.gold}66`,
                      fontFamily: 'var(--font-cinzel), serif',
                      color: DICE_THEME.glyph,
                      opacity: 0.6,
                    }}
                  >
                    {t('des.affinage.thinking')}
                  </div>
                )}
                {oracleErrored && !oracleFlashLoading && !oracleFlash && (
                  <div
                    className="mt-5 rounded-2xl p-4 text-center"
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
                    className="mt-5 rounded-2xl p-4"
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
                    className="mt-5 rounded-2xl p-4"
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

                {/* Zone analyse approfondie — l'attente est montrée par l'overlay
                    cosmique central (OracleWaitAnimation), plus de carte dedans. */}
                <div className="mt-5 border-t pt-4" style={{ borderColor: `${DICE_THEME.gold}33` }}>
                  {analysisSections && !analysisLoading && (
                    <div className="space-y-3">
                      {analysisSections.map((s) => (
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
                            className="text-center text-sm leading-relaxed italic"
                            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                          >
                            {s.text}
                          </p>
                        </div>
                      ))}
                      {analysisSynthese && (
                        <div
                          className="mt-4 rounded-2xl p-4"
                          style={{
                            background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.ocre}14 100%)`,
                            border: `1px solid ${DICE_THEME.gold}55`,
                          }}
                        >
                          <p
                            className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                            style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                          >
                            {t('des.simplifie.synthese')}
                          </p>
                          <p
                            className="text-center text-sm leading-relaxed italic"
                            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                          >
                            {analysisSynthese}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {analysis && !analysisSections && !analysisLoading && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm leading-relaxed italic"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                    >
                      {analysis}
                    </motion.p>
                  )}
                  {analysisErrored && !analysisLoading && (
                    <div className="mt-4 text-center">
                      <GoldGlossButton onClick={runAnalysis}>
                        🔄 {t('des.simplifie.relaunch')}
                      </GoldGlossButton>
                    </div>
                  )}
                  {!analysis && !analysisSections && !analysisLoading && (
                    <div className="text-center">
                      {canDeep ? (
                        <DiceButton variant="blue" onClick={runAnalysis}>
                          {t('des.affinage.analyze')}
                        </DiceButton>
                      ) : (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => openGate('limit-grand')}
                          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
                          style={{
                            fontFamily: 'var(--font-cinzel), serif',
                            background: 'rgba(212,175,55,0.08)',
                            border: '1.5px dashed rgba(212,175,55,0.45)',
                            color: DICE_THEME.ocreLight,
                            letterSpacing: '0.04em',
                          }}
                        >
                          🔒 {t('des.affinage.analyze')}
                          <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                            {t('des.simplifie.initieOnly')}
                          </span>
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* ✶ L'Augure scellé — prémonction née de cette lecture. */}
                  {readingId && (analysis || analysisSynthese) && (
                    <EchoBox
                      domain="des"
                      readingId={readingId}
                      question={question}
                      summary={(analysisSynthese || analysis || '').slice(0, 1200)}
                    />
                  )}
                </div>
              </div>

              {/* Recommencer (autre intention) — supprimé sur demande : retour via le menu */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Attente cosmique : overlay centré pendant la 1ʳᵉ réflexion de l'oracle. */}
      <OracleWaitAnimation />
      {/* Paywall « Analyser en profondeur » (Initié/Arkane). */}
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
    </DiceBackground>
  );
}

export default function GatedPage() {
  return (
    <AuthGate>
      <SimplifiePage />
    </AuthGate>
  );
}
