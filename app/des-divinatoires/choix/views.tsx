'use client';

// Cartes d'analyse et de synthese de /des-divinatoires/choix.
// Deplacees telles quelles depuis page.tsx (decoupage).

import AnalysisWaitCard from '@/components/analysis-wait-card';
import AnalysisWaitVideo from '@/components/analysis-wait-video';
import { DICE_THEME, DiceButton, OneLineQuestion, PLANET_NAMES, SIGN_NAMES } from '../_shared';
import { md } from './helpers';
import { TargetFaces } from '@/components/astro-dice';
import { ClickableFaces } from '@/components/astro-dice/constellation';
import { tr, useLang, useT } from '@/lib/i18n';
import { nextRaceSeq } from '@/lib/race-guard';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

// ──────────────────────────────────────────────
// Analyse courte (interprétation combinée) + approfondie
// ──────────────────────────────────────────────
export function DiceAnalysis({
  faces,
  question,
  spread,
  readingId,         // lectureId pour update si analyse profonde générée
  onInterpretationReady,
  onDeepAnalysisReady,
}: {
  faces: TargetFaces;
  question?: string | null;
  spread?: string;
  readingId?: string | null;
  onInterpretationReady?: (interp: string | null) => void;
  onDeepAnalysisReady?: (analysis: string | null) => void;
}) {
  const t = useT();
  const lang = useLang();

  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<string | null>(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const deepRef = useRef<HTMLDivElement | null>(null);
  const shortInterpRef = useRef<string | null>(null);

  // Scroll vers l'analyse approfondie dès qu'elle est prête
  useEffect(() => {
    if (deepAnalysis && deepRef.current) {
      setTimeout(() => deepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [deepAnalysis]);

  // ── Analyse approfondie LLM (prompt long) ──
  // Guard anti-course : si un nouveau runDeep démarre (double clic, relance),
  // la réponse de l'ancien est ignorée (ne doit jamais écraser la nouvelle).
  const deepLastSeqRef = useRef(0);
  const runDeep = useCallback(async () => {
    const seq = nextRaceSeq();
    deepLastSeqRef.current = seq;
    setDeepLoading(true);
    setDeepAnalysis(null);
    try {
      const planet = PLANET_NAMES[faces.planet as string];
      const sign = SIGN_NAMES[faces.sign as string];
      const house = `Maison ${faces.house}`;
      if (!planet || !sign) {
        if (seq === deepLastSeqRef.current) setDeepAnalysis(t('des.choix.deepNotAvail'));
        return;
      }
      const res = await fetch('/api/astro-interpretation-approfondie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planet, sign, house, question, spread, lang }),
      });
      const data = await res.json();
      if (seq !== deepLastSeqRef.current) return; // réponse obsolète → ignorer
      if (data.analysis) {
        setDeepAnalysis(data.analysis);
        onDeepAnalysisReady?.(data.analysis);
        if (readingId) {
          // La sauvegarde centralisée est gérée dans la page parente
        }
      } else {
        setDeepAnalysis(t('des.choix.deepNotAvail'));
      }
    } catch {
      if (seq === deepLastSeqRef.current) setDeepAnalysis(t('des.choix.deepNotAvail'));
    } finally {
      if (seq === deepLastSeqRef.current) setDeepLoading(false);
    }
  }, [faces, question, spread, readingId, t, lang]);

  // ── Interprétation courte automatique (LLM d'abord, DB en fallback) ──
  // Guard anti-course : les effets sont relancés en StrictMode dev et quand les
  // faces/question changent → seule la dernière exécution peut écrire l'état.
  const shortLastSeqRef = useRef(0);
  useEffect(() => {
    if (!faces.planet || !faces.sign || !faces.house) return;
    const planet = PLANET_NAMES[faces.planet as string];
    const sign = SIGN_NAMES[faces.sign as string];
    const house = `Maison ${faces.house}`;
    if (!planet || !sign) return;

    const seq = nextRaceSeq();
    shortLastSeqRef.current = seq;
    setDbLoading(true);
    setDbInterpretation(null);

    (async () => {
      // 1) Toujours tenter le LLM en premier (gère question=null)
      try {
        const llmRes = await fetch('/api/astro-interpretation-choix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house, question: question || undefined, spread, lang }),
        });
        const llmData = await llmRes.json();
        if (seq !== shortLastSeqRef.current) return; // réponse obsolète → ignorer
        if (llmData.interpretation) {
          setDbInterpretation(llmData.interpretation);
          shortInterpRef.current = llmData.interpretation;
          onInterpretationReady?.(llmData.interpretation);
          setDbLoading(false);
          return;
        }
      } catch {
        // fallback silencieux → DB
      }

      // 2) Fallback DB seulement si le LLM n'a rien donné
      try {
        const dbRes = await fetch('/api/astro-interpretation-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house }),
        });
        const dbData = await dbRes.json();
        if (seq !== shortLastSeqRef.current) return; // réponse obsolète → ignorer
        if (dbData.found && dbData.interpretation) {
          setDbInterpretation(dbData.interpretation);
          shortInterpRef.current = dbData.interpretation;
          onInterpretationReady?.(dbData.interpretation);
        }
      } catch {
        // silencieux
      } finally {
        if (seq === shortLastSeqRef.current) setDbLoading(false);
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
      {/* Keyframes partagées (attente courte + approfondie) — toujours rendues */}
      <style>{`
        @keyframes oracle-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes oracle-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes oracle-dot {
          0%, 20% { opacity: 0; }
          40% { opacity: 1; }
          100% { opacity: 1; }
        }
        .oracle-loader-dot { display: inline-block; animation: oracle-dot 1.4s infinite; }
        .oracle-loader-dot:nth-child(2) { animation-delay: 0.2s; }
        .oracle-loader-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      {/* Titre analyse */}
      <h3
        className="mb-4 text-center text-lg font-bold"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: DICE_THEME.ocreLight,
          textShadow: `0 0 12px ${DICE_THEME.gold}44`,
        }}
      >
        {t(spread === 'Premier Choix' ? 'des.choix.analysisFirst' : 'des.choix.analysisSecond')}
      </h3>

      {/* Le tirage n'est PAS répété dans l'encart : la pilule cliquable
          affichée juste avant porte déjà les 3 faces (+ modale de détail). */}

      {/* ── Interprétation courte (DB ou LLM 1-2 phrases) ── */}
      {dbLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mt-5 overflow-hidden rounded-2xl"
          style={{
            border: `1.5px solid ${DICE_THEME.gold}44`,
            boxShadow: `inset 0 0 30px ${DICE_THEME.gold}10, 0 0 30px ${DICE_THEME.gold}0c`,
          }}
        >
          {/* Vidéo d'attente aléatoire en fond — disparaît quand l'analyse est
              prête. AnalysisWaitVideo gère la rotation ET le fallback onError
              (les fichiers 5..9 n'existent pas : sans lui → écran noir). */}
          <AnalysisWaitVideo
            prefix="analyse-des-zodiaque"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          {/* Voile bas pour la lisibilité du message */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{
              background: 'linear-gradient(to top, rgba(4,6,15,0.85) 0%, rgba(4,6,15,0.35) 55%, transparent 100%)',
              height: '55%',
            }}
          />
          {/* Message d'attente */}
          <p
            className="absolute inset-x-0 bottom-0 pb-2 text-center text-xs font-bold uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-cinzel-deco), serif',
              color: DICE_THEME.gold,
              textShadow: `0 0 12px ${DICE_THEME.gold}44`,
            }}
          >
            {t('des.choix.analysisPending')}
          </p>
          {/* Hauteur minimale pour la vidéo */}
          <div className="h-52 sm:h-64" />
        </motion.div>
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
          <div
            className="text-center text-base leading-relaxed"
            style={{
              fontFamily: 'var(--font-cormorant), serif',
              color: '#F0E6D3',
              lineHeight: 1.75,
            }}
          >
            {md(dbInterpretation)}
          </div>
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
            <AnalysisWaitCard
              accent={DICE_THEME.gold}
              title={
                <>
                  {tr("La sagesse se dévoile", "Wisdom unfolds", "La sabiduría se revela", "ज्ञान प्रकट हो रहा है")}
                  <span className="oracle-loader-dot">.</span>
                  <span className="oracle-loader-dot">.</span>
                  <span className="oracle-loader-dot">.</span>
                </>
              }
              subtitle={t('des.choix.deepLoading')}
              videoPrefix="analyse-des-zodiaque"
            />
          )}
        {deepAnalysis && (
          <motion.div
            ref={deepRef}
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
              {md(deepAnalysis)}
              </div>
          </motion.div>
        )}

        {/* ✶ L'Écho scellé a été déplacé au récapitulatif FINAL : le tirage
            étant un duo (A + B), le scellement n'intervient qu'après le
            second choix analysé, et l'IA reçoit les deux lectures. */}
    </div>
  );
}

// ──────────────────────────────────────────────
// Section de synthèse : question + analyse courte (reprise)
// ──────────────────────────────────────────────
export function RecapCard({
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
      className="min-w-0 overflow-hidden rounded-2xl p-4"
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
        <OneLineQuestion
          className="mb-3 text-sm italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
          text={question}
        />
      )}
      <div className="mb-1"><ClickableFaces faces={faces} /></div>
      {shortInterpretation && (
        <div
          className="mt-3 text-sm leading-relaxed"
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            color: '#F0E6D3',
            lineHeight: 1.7,
          }}
        >
          {md(shortInterpretation)}
        </div>
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
