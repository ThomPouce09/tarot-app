'use client';
import { api } from '@/lib/api-client';

// Cartes d'analyse et de synthese de /des-divinatoires/choix.
// Deplacees telles quelles depuis page.tsx (decoupage).

import AnalysisWaitVideo from '@/components/analysis-wait-video';
import WaitPoolLine from '@/components/wait-pool-line';
import { DICE_THEME, OneLineQuestion, PLANET_NAMES, SIGN_NAMES } from '../_shared';
import { md } from './helpers';
import { TargetFaces } from '@/components/astro-dice';
import { ClickableFaces } from '@/components/astro-dice/constellation';
import { useLang, useT } from '@/lib/i18n';
import { nextRaceSeq } from '@/lib/race-guard';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

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
  const [isDeep, setIsDeep] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // ── Analyse approfondie AUTOMATIQUE (prompt long) dès que les dés sont posés ──
  // Le tirage étant avancé, l'analyse longue remplace le résumé court dans la
  // même carte (comportement calé sur /affinage). Le court (LLM 1-2 phrases,
  // puis DB) reste le filet silencieux si l'approfondie n'arrive pas.
  // Guard anti-course : les effets sont relancés en StrictMode et quand les
  // faces/question changent → seule la dernière exécution peut écrire l'état.
  const lastSeqRef = useRef(0);
  useEffect(() => {
    if (!faces.planet || !faces.sign || !faces.house) return;
    const planet = PLANET_NAMES[faces.planet as string];
    const sign = SIGN_NAMES[faces.sign as string];
    const house = `Maison ${faces.house}`;
    if (!planet || !sign) return;

    const seq = nextRaceSeq();
    lastSeqRef.current = seq;
    setDbLoading(true);
    setDbInterpretation(null);
    setIsDeep(false);

    (async () => {
      // 1) Analyse approfondie automatique
      try {
        const res = await api('/api/astro-interpretation-approfondie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house, question, spread, lang }),
        });
        const data = await res.json();
        if (seq !== lastSeqRef.current) return;
        if (data.analysis) {
          setDbInterpretation(data.analysis);
          setIsDeep(true);
          onDeepAnalysisReady?.(data.analysis);
          setDbLoading(false);
          return;
        }
      } catch { /* repli court ci-dessous */ }

      // 2) Filet : LLM court, puis interprétation DB (jamais un tirage vide)
      try {
        const llmRes = await api('/api/astro-interpretation-choix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house, question: question || undefined, spread, lang }),
        });
        const llmData = await llmRes.json();
        if (seq !== lastSeqRef.current) return;
        if (llmData.interpretation) {
          setDbInterpretation(llmData.interpretation);
          onInterpretationReady?.(llmData.interpretation);
          setDbLoading(false);
          return;
        }
      } catch {
        // fallback silencieux → DB
      }

      try {
        const dbRes = await api('/api/astro-interpretation-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house }),
        });
        const dbData = await dbRes.json();
        if (seq !== lastSeqRef.current) return;
        if (dbData.found && dbData.interpretation) {
          setDbInterpretation(dbData.interpretation);
          onInterpretationReady?.(dbData.interpretation);
        }
      } catch {
        // silencieux
      } finally {
        if (seq === lastSeqRef.current) setDbLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces.planet, faces.sign, faces.house, question, spread, lang]);

  // Recentre la vue sur l'analyse dès qu'elle se pose (même geste que /affinage).
  useEffect(() => {
    if (dbInterpretation && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [dbInterpretation]);

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
          <WaitPoolLine
            universe="des"
            className="absolute inset-x-0 bottom-0 px-3 pb-2 text-center text-[11px] leading-snug"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold, textShadow: `0 0 12px ${DICE_THEME.gold}44` }}
          />
          {/* Hauteur minimale pour la vidéo */}
          <div className="h-52 sm:h-64" />
        </motion.div>
      )}
      {shortReady && (
        <div
          ref={cardRef}
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
            ✦ {t(isDeep ? 'des.choix.deepTitle' : 'des.choix.shortTitle')} ✦
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
}: {
  label: string;
  faces: TargetFaces;
  question?: string | null;
  shortInterpretation?: string | null;
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
    </div>
  );
}
