'use client';

// Composants de rendu de /des-divinatoires/obstacle-solution (etape 2/2).
// Deplaces tels quels depuis page.tsx. GlowDefsStrike reste prive ici.

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DICE_THEME, DiceButton, OneLineQuestion, PLANET_NAMES, SIGN_NAMES } from '../_shared';
import type { TargetFaces } from '@/components/astro-dice';
import { ClickableFaces } from '@/components/astro-dice/constellation';
import AnalysisWaitVideo from '@/components/analysis-wait-video';
import { nextRaceSeq } from '@/lib/race-guard';
import { api } from '@/lib/api-client';
import { useT, useLang, pick4, type Lang } from '@/lib/i18n';
import { md, VOIE_TINT } from './helpers';

// ── Analyse courte (LLM, fallback DB) + approfondie — moule /choix ──
export function DiceAnalysis({
  faces,
  question,
  spread,
  onInterpretationReady,
  onDeepAnalysisReady,
}: {
  faces: TargetFaces;
  question?: string | null;
  spread?: string;
  onInterpretationReady?: (interp: string | null) => void;
  onDeepAnalysisReady?: (analysis: string | null) => void;
}) {
  const t = useT();
  const lang = useLang();
  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [isDeep, setIsDeep] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Tirage AVANCÉ → l'analyse approfondie (prompt long) est automatique dès
  // que les dés sont posés, et REMPLACE le résumé court dans la même carte
  // (comportement calé sur /affinage). Le court (LLM 1-2 phrases, puis DB)
  // devient un filet de repli silencieux si l'approfondie n'arrive pas.
  // Guard anti-course : seule la dernière exécution peut écrire l'état.
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
        const res = await api('/api/astro-interpretation-obstacle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house, question, kind: spread, mode: 'deep', lang }),
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
        const res = await api('/api/astro-interpretation-obstacle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house, question, kind: spread, mode: 'short', lang }),
        });
        const data = await res.json();
        if (seq !== lastSeqRef.current) return;
        if (data.interpretation) {
          setDbInterpretation(data.interpretation);
          onInterpretationReady?.(data.interpretation);
          setDbLoading(false);
          return;
        }
      } catch { /* fallback DB */ }

      try {
        const res = await api('/api/astro-interpretation-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planet, sign, house }),
        });
        const data = await res.json();
        if (seq !== lastSeqRef.current) return;
        if (data.found && data.interpretation) {
          setDbInterpretation(data.interpretation);
          onInterpretationReady?.(data.interpretation);
        }
      } catch { /* silencieux */ }
      if (seq === lastSeqRef.current) setDbLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faces, question, spread, lang]);

  // Recentre la vue sur l'analyse dès qu'elle se pose (même geste que /affinage).
  useEffect(() => {
    if (dbInterpretation && cardRef.current) {
      setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [dbInterpretation]);

  return (
    <div className="mt-4 space-y-3">
      {/* Keyframes partagées (points de chargement de l'attente) */}
      <style>{`
        @keyframes oracle-dot {
          0%, 20% { opacity: 0; }
          40% { opacity: 1; }
          100% { opacity: 1; }
        }
        .oracle-loader-dot { display: inline-block; animation: oracle-dot 1.4s infinite; }
        .oracle-loader-dot:nth-child(2) { animation-delay: 0.2s; }
        .oracle-loader-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      {/* ── Analyse courte : vidéo d'attente (composant partagé, fallback
          onError) puis résumé doré — comme /choix. ── */}
      {dbLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mt-2 overflow-hidden rounded-2xl"
          style={{
            border: `1.5px solid ${DICE_THEME.gold}44`,
            boxShadow: `inset 0 0 30px ${DICE_THEME.gold}10, 0 0 30px ${DICE_THEME.gold}0c`,
          }}
        >
          <AnalysisWaitVideo
            prefix="analyse-des-zodiaque"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            style={{ background: 'linear-gradient(to top, rgba(4,6,15,0.85) 0%, rgba(4,6,15,0.35) 55%, transparent 100%)', height: '55%' }}
          />
          <p
            className="absolute inset-x-0 bottom-0 pb-2 text-center text-xs font-bold uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 12px ${DICE_THEME.gold}44` }}
          >
            {t('des.choix.analysisPending')}
          </p>
          <div className="h-52 sm:h-64" />
        </motion.div>
      )}
      {dbInterpretation && (
        <div
          ref={cardRef}
          className="mt-2 rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.brick} 100%)`,
            border: `1.5px solid ${DICE_THEME.gold}66`,
            boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
          }}
        >
          <p
            className="mb-3 text-center text-sm font-bold uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: `0 0 8px ${DICE_THEME.gold}33`, letterSpacing: '0.1em' }}
          >
            ✦ {t(isDeep ? 'des.choix.deepTitle' : 'des.choix.shortTitle')} ✦
          </p>
          <div
            className="text-center text-base leading-relaxed"
            style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.75 }}
          >
            {md(dbInterpretation)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cartes du récapitulatif final ──
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
          style={{ fontFamily: 'var(--font-cormorant), serif', color: '#F0E6D3', lineHeight: 1.7 }}
        >
          {md(shortInterpretation)}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Les Voies — en-tête : l'étoile-obstacle et son fil doré qui se divise
// vers quatre étoiles-destinations (SVG animé, filant le long des branches).
// ──────────────────────────────────────────────
export function VoiesHeader({ faces, loading, error, lang, onRetry }: {
  faces: TargetFaces;
  loading: boolean;
  error: boolean;
  lang: Lang;
  onRetry: () => void;
}) {
  return (
    <div className="text-center">
      <svg viewBox="0 0 300 92" className="mx-auto h-20 w-full max-w-md" aria-hidden>
        <GlowDefsStrike id="voie-thread" />
        {/* nœud obstacle = les 3 faces posées */}
        <motion.circle cx="30" cy="46" r="7" fill="none" stroke={DICE_THEME.gold} strokeWidth="1.6"
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ transformOrigin: '30px 46px' }} />
        <motion.text x="30" y="47" textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={DICE_THEME.ocreLight}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.08em' }}>
          {String(faces.planet)}{String(faces.sign)}·{faces.house}
        </motion.text>
        {/* fil principal jusqu'à la bifurcation */}
        <motion.line x1="40" y1="46" x2="118" y2="46" stroke="url(#voie-thread)" strokeWidth="1.4"
          initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }} />
        {/* 4 branches vers les étoiles-destinations */}
        {[[280, 12], [280, 35], [280, 57], [280, 80]].map(([ex, ey], i) => (
          <motion.path key={i} d={`M118,46 C170,46 200,${ey} ${ex - 8},${ey}`} fill="none"
            stroke="url(#voie-thread)" strokeWidth="1.15" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: loading || error ? 0.9 : [0.25, 0.9] }}
            transition={{ duration: 0.8, delay: 1.15 + i * 0.28 }} />
        ))}
        {[[280, 12], [280, 35], [280, 57], [280, 80]].map(([ex, ey], i) => (
          <motion.circle key={i} cx={ex} cy={ey} r="3.4" fill={DICE_THEME.gold}
            initial={{ opacity: 0, scale: 0 }}
            animate={loading ? { opacity: [0.5, 1, 0.5], scale: [0.8, 1.15, 0.8] } : { opacity: 1, scale: 1 }}
            transition={loading
              ? { duration: 1.6, delay: i * 0.24, repeat: Infinity }
              : { duration: 0.4, delay: 1.9 + i * 0.28 }} />
        ))}
      </svg>
      <h3 className="text-lg font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight, textShadow: '0 0 14px rgba(232,198,106,0.4)' }}>
        {pick4('Les Quatre Voies', 'The Four Paths', "Las Cuatro Vías", "चार पथ")(lang)}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-xs italic leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DCE6F599' }}>
        {pick4('L’oracle a lu ton obstacle et ouvre quatre attitudes pour le traverser. Choisis la tienne — la Solution répondra en elle.', 'The oracle reads your obstacle and opens four attitudes to cross it. Choose yours — the Solution will answer within it.', "El oráculo ha leído tu obstáculo y abre cuatro actitudes para atravesarlo. Elige la tuya — la Solución responderá en ella.", "भविष्यवक्ता ने तुम्हारी बाधा पढ़ ली है और उसे पार करने के चार रुख खोलता है। अपना चुनो — समाधान उसी में उत्तर देगा।")(lang)}
      </p>
      {error && (
        <div className="mt-2">
          <DiceButton variant="smallGold" onClick={onRetry}>
            {pick4('Réinterroger l’oracle', 'Ask the oracle again', "Volver a interrogar al oráculo", "भविष्यवक्ता से फिर पूछो")(lang)}
          </DiceButton>
        </div>
      )}
    </div>
  );
}

// Petite lueur d'or (defs partagées par les voies) — même veine que cons-fade.
function GlowDefsStrike({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f4d98b" />
        <stop offset="55%" stopColor={DICE_THEME.gold} />
        <stop offset="100%" stopColor="#b98f3e" />
      </linearGradient>
    </defs>
  );
}

// ──────────────────────────────────────────────
// Les Voies — chargement : les astres consultent (déjà-vus des dots oracle).
// ──────────────────────────────────────────────
export function VoiesCharged({ lang }: { lang: Lang }) {
  return (
    <p className="mt-4 text-center text-xs font-bold uppercase tracking-widest"
      style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold, textShadow: '0 0 12px rgba(212,175,55,0.35)' }}>
      {pick4('Les astres tracent tes voies', 'The stars are tracing your paths', "Los astres trazan tus vías", "तारे तुम्हारे पथ रेखांकित कर रहे हैं")(lang)}
      <span className="oracle-loader-dot">.</span>
      <span className="oracle-loader-dot">.</span>
      <span className="oracle-loader-dot">.</span>
    </p>
  );
}

// ──────────────────────────────────────────────
// Les Voies — carte : constellation personnelle (3 piliers reliés au nom),
// pulsation dorée au survol/tap, empreinte de l'élément en filigrane.
// ──────────────────────────────────────────────

export function VoieCard({ voie, i, onPick, chosen, dimmed, reason }: { voie: { id: string; glyph: string; name: string; motto: string }; i: number; onPick: () => void; chosen?: boolean; dimmed?: boolean; reason?: string | null }) {
  const tint = VOIE_TINT[voie.id] ?? DICE_THEME.gold;
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={dimmed}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: dimmed ? 0.25 : 1, y: 0, scale: chosen ? 1.03 : 1 }}
      transition={{ delay: 0.2 + i * 0.16, duration: 0.5 }}
      className="group relative min-w-0 overflow-hidden rounded-2xl p-4 text-left transition-shadow"
      style={{
        background: chosen
          ? 'linear-gradient(160deg, rgba(42,58,107,0.95) 0%, rgba(10,20,48,0.95) 100%)'
          : 'linear-gradient(160deg, rgba(20,36,90,0.85) 0%, rgba(7,13,34,0.92) 100%)',
        border: chosen ? `1.5px solid ${DICE_THEME.gold}` : `1px solid ${DICE_THEME.gold}44`,
        boxShadow: chosen ? `0 0 26px ${DICE_THEME.gold}55, inset 0 1px 0 rgba(232,198,106,0.4)` : 'inset 0 1px 0 rgba(232,198,106,0.14)',
      }}
    >
      {/* filigrane de l'élément */}
      <span aria-hidden className="pointer-events-none absolute -right-2 -top-3 text-[74px] leading-none opacity-[0.07] transition-opacity group-hover:opacity-[0.16]"
        style={{ color: tint, fontFamily: 'serif' }}>
        {voie.glyph}
      </span>
      {/* constellation de la voie : 3 piliers (corps/esprit/acte) reliés au sceau */}
      <svg viewBox="0 0 64 40" className="mb-2 h-10 w-16" aria-hidden>
        <motion.path d="M8,30 C18,26 22,14 32,10 M32,10 C42,14 46,22 56,8" fill="none"
          stroke={DICE_THEME.gold} strokeWidth="0.8" strokeLinecap="round" opacity="0.65"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, delay: 0.5 + i * 0.16 }} />
        {[[8, 30], [32, 10], [56, 8]].map(([cx, cy], k) => (
          <motion.circle key={k} cx={cx} cy={cy} r="2.2" fill={tint}
            initial={{ opacity: 0 }} animate={{ opacity: [0.55, 1] }} transition={{ duration: 0.6, delay: 0.7 + k * 0.2 + i * 0.16 }} />
        ))}
      </svg>
      <p className="text-sm font-bold tracking-wide"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight }}>
        {voie.name}
      </p>
      <p className="mt-1 text-xs leading-relaxed italic"
        style={{ fontFamily: 'var(--font-cormorant), serif', color: '#DCE6F5CC', lineHeight: 1.5 }}>
        {voie.motto}
      </p>
      {chosen && reason && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-1.5 text-[11px] leading-snug"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight, textShadow: '0 0 10px rgba(232,198,106,0.35)' }}>
          ✦ {reason} ✦
        </motion.p>
      )}
      <p className="mt-2 text-[10px] uppercase tracking-[0.28em] opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold }}>
        ✦ {voie.glyph} marcher cette voie ✦
      </p>
    </motion.button>
  );
}

// ──────────────────────────────────────────────
// 5ᵉ carte — « Que les dés choisissent ma voie » : le sceau du destin,
// plus sombre, cerclé d'un anneau de runes tournant lentement, brume
// violette au survol. Le clic laisse l'oracle départager les voies.
// ──────────────────────────────────────────────
export function VoieDestinyCard({ loading, disabled, lang, onPick }: {
  loading: boolean; disabled: boolean; lang: Lang; onPick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPick}
      disabled={loading || disabled}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.6 }}
      className="group relative min-w-0 overflow-hidden rounded-2xl p-4 text-left disabled:opacity-70"
      style={{
        background: 'radial-gradient(ellipse at 80% -10%, rgba(88,48,120,0.55) 0%, rgba(20,10,44,0.9) 45%, rgba(4,6,15,0.95) 100%)',
        border: '1px dashed rgba(200,170,255,0.4)',
        boxShadow: 'inset 0 0 28px rgba(120,80,180,0.18)',
      }}
    >
      {/* anneau de runes qui tourne lentement */}
      <motion.span aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 flex h-24 w-24 items-center justify-center rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        style={{
          border: '1px dashed rgba(200,170,255,0.35)',
          color: 'rgba(216,190,255,0.5)', fontSize: 11, letterSpacing: '0.35em', fontFamily: 'serif',
        }}>
        ☾✧♆✧☽✧⚹✧
      </motion.span>
      {/* voile brumeux qui se lève au survol */}
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at 70% 20%, rgba(168,120,255,0.16), transparent 60%)' }} />
      <p className="text-[26px] leading-none" style={{ filter: 'drop-shadow(0 0 10px rgba(168,120,255,0.6))' }}>❔</p>
      <p className="mt-2 text-sm font-bold tracking-wide"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#D8BEFF', textShadow: '0 0 12px rgba(168,120,255,0.4)' }}>
        {pick4('Que les dés choisissent ma voie', 'Let the dice choose my path', "Que los dados elijan mi vía", "दिए ही मेरा पथ चुनें")(lang)}
      </p>
      <p className="mt-1 text-xs leading-relaxed italic"
        style={{ fontFamily: 'var(--font-cormorant), serif', color: '#CBB8E8CC', lineHeight: 1.5 }}>
        {pick4('Remets le choix : l’oracle pèse les quatre voies et désigne la plus avisée.', 'Surrender the choice: the oracle weighs the four paths and designates the wisest.', "Confía la elección: el oráculo sopesa las cuatro vías y designa la más acertada.", "चुनाव सौंप दो: भविष्यवक्ता चार पथ तौलता है और सबसे समझदार को चुनता है।")(lang)}
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.28em]"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: loading ? '#D8BEFF' : 'rgba(216,190,255,0.65)' }}>
        {loading
          ? <>◌ l’oracle {pick4('pèse tes voies', 'is weighing your paths', "sopesa tus vías", "तुम्हारे पथ तौल रहा है")(lang)}<span className="oracle-loader-dot">.</span><span className="oracle-loader-dot">.</span></>
          : <>✦ {pick4('remets-toi au destin', 'abandon yourself to fate', "Entrégate al destino", "भाग्य के हवाले हो जाओ")(lang)} ✦</>}
      </p>
    </motion.button>
  );
}
