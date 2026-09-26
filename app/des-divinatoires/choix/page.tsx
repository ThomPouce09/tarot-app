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
import { nextRaceSeq } from '@/lib/race-guard';
import AnalysisWaitCard from '@/components/analysis-wait-card';
import AnalysisWaitVideo from '@/components/analysis-wait-video';
import EchoBox from '@/components/echo-box';
import { useT, useLang } from '@/lib/i18n';
import { preloadAstroDice } from '@/components/astro-dice/preload';
import { pickAndPreloadWaitVideo } from '@/lib/preload-wait-videos';
import { DiceSteps, BalancePlateaux, ClickableFaces, strikeTokens } from '@/components/astro-dice/constellation';
import AuthGate from '@/components/auth-gate';
import { DiceThemeSelector } from '@/app/des-divinatoires-simplifie/theme-selector';

/** Mini-renderer markdown → React nodes */
function md(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={key++} className="text-sm font-bold uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 8px ${DICE_THEME.gold}33`, letterSpacing: '0.08em' }}>{inlineMd(trimmed.slice(3))}</h3>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h4 key={key++} className="text-sm font-bold mt-3 mb-1" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}>{inlineMd(trimmed.slice(2))}</h4>);
    } else {
      elements.push(<p key={key++} className="mb-1 leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.7 }}>{inlineMd(trimmed || '\u00A0')}</p>);
    }
  }
  return elements;
}
function inlineMd(s: string): React.ReactNode {
  // **bold**
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#87CEEB' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

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
          body: JSON.stringify({ planet, sign, house, question: question || undefined, spread }),
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
                  La sagesse se dévoile
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

/* Carte d'introduction « Le tirage du choix » — remplace l'ancien double
   bouton (Enregistrer / Lancer direct) : soit Élément + intention (même
   sélecteur que le tirage simplifié), soit question libre écrite. Le CTA
   « Enregistrer et lancer les dés » est serti or sur indigo profond. */
function DiceLaunchCard({ title, placeholder, instruct, draft, setDraft, onLaunch, lockedMode }: {
  title: string;
  placeholder: string;
  instruct: string;
  draft: string;
  setDraft: (v: string) => void;
  onLaunch: (q: string | null, m: 'theme' | 'free') => void;
  /** Mode imposé (chemin B = chemin A : pas de mixage thème/question). */
  lockedMode?: 'theme' | 'free' | null;
}) {
  const [mode, setMode] = useState<'theme' | 'free'>(lockedMode ?? 'theme');
  const eff = lockedMode ?? mode;
  const q = draft.trim();
  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl p-5 sm:p-6"
      style={{
        background: 'linear-gradient(160deg, rgba(20,36,90,0.92) 0%, rgba(10,20,48,0.94) 55%, rgba(4,6,15,0.95) 100%)',
        border: '1.5px solid rgba(212,175,55,0.42)',
        boxShadow: '0 18px 44px rgba(0,0,0,0.6), inset 0 0 40px rgba(212,175,55,0.07)',
      }}
    >
      <h3
        className="mb-1 text-center text-lg font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight, textShadow: '0 0 14px rgba(232,198,106,0.4)' }}
      >
        {title}
      </h3>
      <p
        className="mx-auto mb-4 max-w-md text-center text-xs italic leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DCE6F599' }}
        dangerouslySetInnerHTML={{ __html: instruct }}
      />

      {/* Onglets : Élément & intention (défaut) / question libre. Verrouillés
          quand le second choix doit imiter le premier (pas de mixage). */}
      <div className="mb-4 flex justify-center gap-2">
        {([
          ['theme', 'Élément & intention'],
          ['free', 'Ma question libre'],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            disabled={!!lockedMode}
            onClick={() => !lockedMode && setMode(k)}
            className="rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-[0.97]"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              letterSpacing: '0.06em',
              color: eff === k ? DICE_THEME.ocreLight : 'rgba(220,230,245,0.55)',
              background: eff === k ? 'linear-gradient(180deg, #2a3a6b 0%, #0a1430 100%)' : 'transparent',
              border: eff === k ? '1px solid rgba(212,175,55,0.75)' : '1px solid rgba(212,175,55,0.25)',
              boxShadow: eff === k ? '0 0 16px rgba(212,175,55,0.3), inset 0 1px 0 rgba(232,198,106,0.3)' : 'none',
              opacity: lockedMode && eff !== k ? 0.35 : 1,
            }}
          >
            {eff === k ? '✦ ' : ''}{label}{eff === k ? ' ✦' : ''}{lockedMode ? (lockedMode === k ? ' (repris du 1ᵉʳ choix)' : '') : ''}
          </button>
        ))}
      </div>

      {eff === 'theme' ? (
        <DiceThemeSelector ctaSculpt onConfirm={(qq) => onLaunch(qq, 'theme')} />
      ) : (
        <div>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl px-4 py-3 text-center text-sm"
            style={{
              background: 'rgba(4,6,15,0.6)',
              border: '1px solid rgba(212,175,55,0.35)',
              color: '#DCE6F5',
              fontFamily: 'var(--font-cormorant), serif',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.55)',
            }}
          />
          <div className="mt-5 text-center">
            <button
              onClick={() => onLaunch(q || null, 'free')}
              disabled={!q}
              className="rounded-full px-9 py-3.5 text-base font-bold transition-all active:scale-[0.97] disabled:opacity-40"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                letterSpacing: '0.05em',
                color: '#F7ECCE',
                background: 'linear-gradient(180deg, #22366f 0%, #14245a 46%, #070d22 100%)',
                border: '1px solid rgba(232,198,106,0.85)',
                boxShadow: '0 0 0 4px rgba(212,175,55,0.12), 0 12px 26px rgba(3,5,12,0.85), 0 0 36px rgba(212,175,55,0.3), inset 0 1px 0 rgba(232,198,106,0.5), inset 0 -14px 26px rgba(0,0,0,0.55)',
                textShadow: '0 0 12px rgba(232,198,106,0.5), 0 1px 2px rgba(0,0,0,0.9)',
              }}
            >
              Enregistrer et lancer les dés
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [showDeepA, setShowDeepA] = useState(false);
  const [showDeepB, setShowDeepB] = useState(false);

  // Scroll vers le gobelet + tutoriel dès qu'il est monté (A_roll ou B_roll)
  const scrollToCup = useCallback(() => {
    // Le gobelet CENTRÉ dans l'écran (les deux tirages) → mieux visible
    // pendant le lancer ; le tutoriel reste visible en dessous.
    if (cupRef.current) {
      cupRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (cupAreaRef.current) {
      cupAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    setShowDeepA(false);
    setShowDeepB(false);
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
  // Interprétation combinée quand les 2 analyses courtes sont prêtes
  useEffect(() => {
    if (step === 'B_done' && shortInterpA && shortInterpB && readingAId) {
      const payload = {
        version: 'des-choix',
        facesA: resultA,
        facesB: resultB,
        shortA: shortInterpA,
        shortB: shortInterpB,
      };
      updateReading(readingAId, { interpretation: JSON.stringify(payload) });
    }
  }, [step, shortInterpA, shortInterpB, readingAId, resultA, resultB]);

  // Analyse approfondie (sauve quand les deux analyses longues sont prêtes)
  useEffect(() => {
    if (!readingAId) return;
    if (deepAnalysisA && deepAnalysisB) {
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
    }
  }, [deepAnalysisA, deepAnalysisB, shortInterpA, shortInterpB, readingAId, resultA, resultB]);

  const cupVisible = step !== 'A_intro' && step !== 'B_intro';

  return (
    <DiceBackground starry>
      <YiSlideNav />
      <DiceTitle title={t('des.choix.title')} />

      {/* Fil d'étapes : Confier › Chemin A › Chemin B › Comparaison */}
      <DiceSteps
        steps={lang === 'en' ? ['Entrust', 'Path A', 'Path B', 'Compare'] : ['Confier', 'Chemin A', 'Chemin B', 'Comparaison']}
        current={step === 'A_intro' ? 0 : step === 'A_roll' || step === 'A_done' ? 1 : step === 'B_roll' ? 2 : 3}
      />

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
                  color: #B0E0FF;
                  opacity: 0.95;
                  user-select: none;
                  -webkit-user-select: none;
                }
              `}</style>
              <svg className="swipe-icon-choix" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="#87CEEB" d="M9.5 1C8.67 1 8 1.67 8 2.5v7.38l-1.7-.85c-.3-.15-.65-.2-1-.15a1.5 1.5 0 0 0-1.3 1.3c-.15.65.05 1.3.5 1.75l4.35 4.35c.3.3.7.45 1.15.45H18c1.1 0 2-.9 2-2V9.5c0-.65-.45-1.2-1.05-1.4l-5.1-1.85c-.15-.05-.3-.05-.45-.05-.15 0-.3.05-.45.1l-.95.4V2.5C12 1.67 11.33 1 10.5 1h-1Z" opacity="0.6"/>
                <path fill="#87CEEB" d="m17.5 14.5-2.12-1.06c-.2-.1-.44-.14-.67-.11l-1.83.35.88-3.53a1.25 1.25 0 0 0-.88-1.5c-.65-.18-1.3.2-1.48.85l-1.4 5.6-2.1-1.05.3 1.5 3.5 1.75c.3.15.65.2 1 .15H16c.65 0 1.2-.45 1.4-1.05l.35-1.05c.08-.25.05-.52-.08-.75l-.17-.15Z" opacity="0.4"/>
              </svg>
              <p
                className="text-xs text-center mt-1"
                style={{ color: '#B0E0FF', opacity: 0.95, fontFamily: 'var(--font-cinzel), serif', maxWidth: 160, lineHeight: 1.3, fontSize: '0.65rem' }}
              >
                {t('des.choix.tutorial')}
                </p>
                {/* Marqueur invisible — le scroll cible ce point */}
                <span id="scroll-marker-tuto" style={{ display: 'block', height: 1, width: 1 }} />
                </div>
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
                          lineHeight: 1.7,
                        }}
                      >
                        {md(deepAnalysisA)}
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
                          lineHeight: 1.7,
                        }}
                      >
                        {md(deepAnalysisB)}
                      </div>
                    )}
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
