'use client';

// app/des-divinatoires/affinage/page.tsx — Niveau 2.1 : L'Affinage d'un tirage
//
// Le gobelet <AstroDiceCup/> (validé sur /des-divinatoires/cup) remplace ici
// l'ancien <AstroDiceSet/> + bouton « Lancer ». Il pilote en interne le cycle
// secoue → renverse → roule, et remonte le résultat via onRest(faces).
//
// La FENÊTRE APPELANTE impose le nombre de dés via `activeDice` (1 dé ou 3) :
// seuls ces dés sont lancés, affichés, et remontés. Un sélecteur de mode
// (« 3 dés » / « 1 dé : Planète / Signe / Maison ») pilote le composant.
//
// Après chaque tirage : une CARTE-RÉSULTAT proéminente affiche les dés tirés
// avec leur signification STATIQUE (instantanée, fait patienter). Un encart
// ANALYSE propose en dessous une lecture LLM approfondie (bouton déclenchant
// /api/astro-dice-interpretation).
//
// Le composant reste INVISIBLE (overlay « Préparation des dés… ») tant que le
// contexte WebGL n'est pas prêt : on le révèle en fondu UNIQUEMENT à onReady.

import dynamic from 'next/dynamic';
import { useCallback, useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  DiceBackground,
  DiceTitle,
  DiceButton,
  DICE_THEME,
  PLANET_NAMES,
  SIGN_NAMES,
} from '../_shared';
import {
  randomTargetFaces,
  ALL_KINDS,
  type TargetFaces,
  type DieKind,
  type HouseNumber,
} from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';

// <AstroDiceCup/> = WebGL → jamais rendu côté serveur.
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

/* Tutoriel : texte qui disparaît après 8 s (timer interne). La page le coupe
   aussi au 1er lancer. Démarre au chargement de la page (voir useEffect). */
function TutorialText({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onDone, 600);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      style={{
        maxWidth: 300,
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 1.5,
        fontFamily: 'var(--font-cinzel), serif',
        color: DICE_THEME.glyph,
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        paddingBottom: 8,
      }}
    >
      Secouez le gobelet pour mélanger les dés, puis poussez vers le haut pour
      les jeter. Ou appuyez sur « Lancer les dés ».
    </motion.div>
  );
}

type Phase = 'initial' | 'firstRoll' | 'firstDone' | 'refineRoll' | 'refineDone';
type Option = 'action' | 'domaine';
type ModeLLM = 'global' | 'zoom-action' | 'zoom-domaine';

const KIND_LABEL: Record<DieKind, string> = {
  planet: 'Planète',
  sign: 'Signe',
  house: 'Maison',
};

export default function AffinagePage() {
  const [phase, setPhase] = useState<Phase>('initial');
  const [faces, setFaces] = useState<TargetFaces>(() => randomTargetFaces());
  const [option, setOption] = useState<Option | null>(null);
  // Thème des dés figé sur « moon » pour l'instant (sélecteur d'apparence
  // retiré ; à revoir plus tard).
  const skin = 'moon';
  const [ready, setReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  // Cible du défilement automatique vers le haut du résultat après le tirage.
  const resultRef = useRef<HTMLDivElement>(null);

  // Tutoriel : démarre au chargement complet de la page (après un court
  // délai pour laisser le gobelet s'afficher), puis se masque tout seul
  // (timer 8 s dans TutorialText) ou au 1er lancer.
  useEffect(() => {
    const t = window.setTimeout(() => setShowTutorial(true), 500);
    return () => window.clearTimeout(t);
  }, []);

  // ── Fenêtre appelante : combien de dés sont lancés ? ──
  // Par défaut les 3 ; peut être réduit à 1 dé (planète / signe / maison).
  const [activeDice, setActiveDice] = useState<DieKind[]>(['planet', 'sign', 'house']);

  // Dernier résultat remonté (clés présentes seulement).
  const [result, setResult] = useState<Partial<TargetFaces>>(faces);
  // Analyse LLM (profondeur).
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisSections, setAnalysisSections] = useState<
    { key: string; label: string; text: string }[] | null
  >(null);
  const [analysisSynthese, setAnalysisSynthese] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Dés réellement lancés (pilotés par la fenêtre appelante via activeDice).
  // En mode 1 dé, seule cette carte s'affiche.
  const presentKinds = activeDice;

  // 1er lancer : 3 dés (on remet activeDice au complet au cas où un
  // affinage précédent l'aurait réduit à 1 dé).
  const rollFirst = useCallback(() => {
    setOption(null);
    setAnalysis(null);
    setShowTutorial(false);
    setActiveDice(['planet', 'sign', 'house']);
    setFaces(randomTargetFaces());
    setPhase('firstRoll');
    setResetSignal((n) => n + 1);
  }, []);

  // Relance sélective : on ne relance QUE le dé concerné. On réduit
  // activeDice à 1 dé pour que le gobelet n'affiche/lance que celui-ci.
  const refine = useCallback(
    (opt: Option) => {
      setOption(opt);
      setAnalysis(null);
      setShowTutorial(false);
      setActiveDice(opt === 'action' ? ['sign'] : ['house']);
      setFaces((prev) => {
        const next = { ...prev };
        if (opt === 'action') {
          next.sign = randomTargetFaces().sign;
        } else {
          next.house = randomTargetFaces().house as HouseNumber;
        }
        return next;
      });
      setPhase('refineRoll');
      setResetSignal((n) => n + 1);
    },
    [],
  );

  // Réception du résultat du gobelet (déclenché par le geste secousse+push,
  // ou par launchSignal). On avance l'état ICI, car c'est le seul moment
  // fiable où le tirage est terminé — pas via rollFirst/refine (qui ne sont
  // plus déclenchés par un bouton). Si une option d'affinage est active,
  // on bascule en refineDone, sinon en firstDone.
  const handleRest = useCallback(
    (faces: TargetFaces) => {
      setResult({ ...faces });
      setPhase(option ? 'refineDone' : 'firstDone');
    },
    [option],
  );

  // Au repos, on capture les faces effectivement présentes.
  useEffect(() => {
    if (phase === 'firstDone' || phase === 'refineDone') {
      setResult({ ...faces });
    }
  }, [phase, faces]);

  // Mode LLM selon la phase courante.
  const llmMode = (): ModeLLM => {
    if (phase === 'refineDone' && option === 'action') return 'zoom-action';
    if (phase === 'refineDone' && option === 'domaine') return 'zoom-domaine';
    return 'global';
  };

  // Déclenche l'analyse LLM approfondie.
  const runAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setAnalysis(null);
    setAnalysisSections(null);
    setAnalysisSynthese('');
    try {
      const payload = {
        faces: result,
        activeKinds: presentKinds,
        mode: llmMode(),
      };
      const res = await fetch('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.sections && Array.isArray(data.sections)) {
        setAnalysisSections(data.sections);
        setAnalysisSynthese(data.synthese || '');
      } else {
        setAnalysis(data.texte || 'Analyse indisponible.');
      }
    } catch {
      setAnalysis('Les étoiles se sont voilées… Réessaie l’analyse.');
    } finally {
      setAnalysisLoading(false);
    }
  }, [result, presentKinds, phase, option]);

  const showResult = phase === 'firstDone' || phase === 'refineDone';

  // Amène l'utilisateur au résultat dès qu'il apparaît (après le tirage),
  // en laissant un espace en haut pour le menu (pas de scroll collé au bord).
  useEffect(() => {
    if (showResult && resultRef.current) {
      const top = resultRef.current.getBoundingClientRect().top + window.scrollY;
      const OFFSET = 80; // laisse un peu d'air pour le menu en haut de l'écran
      window.scrollTo({ top: Math.max(0, top - OFFSET), behavior: 'smooth' });
    }
  }, [showResult]);

  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title="Tirage par Affinage"
      />

      <div className="mx-auto max-w-2xl px-4 pb-20">
        {/* Gobelet */}
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
            activeKinds={activeDice}
            onRest={handleRest}
            onReady={() => {
              setReady(true);
            }}
            resetSignal={resetSignal}
            launchSignal={0}
          />
        </div>

        {/* Tutoriel sous le composant */}
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex flex-col items-center gap-2"
          >
            <motion.div
              initial={{ x: -22 }}
              animate={{
                x: [-22, 22, -22, 22, -22, 0],
                y: [0, 0, 0, 0, 0, -18],
              }}
              transition={{
                duration: 2.6,
                times: [0, 0.16, 0.32, 0.48, 0.62, 1],
                repeat: Infinity,
                repeatDelay: 0.5,
                ease: 'easeInOut',
              }}
              style={{
                fontSize: 40,
                opacity: 0.5,
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))',
              }}
            >
              ✋
            </motion.div>
            <TutorialText onDone={() => setShowTutorial(false)} />
          </motion.div>
        )}

        {/* CARTE-RÉSULTAT PROÉMINENTE + ENCART ANALYSE */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              {/* Carte-résultat : chaque dé tiré, glyphe + nom + sens statique */}
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
                  Vos dés ont parlé
                </h3>
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${presentKinds.length}, minmax(0, 1fr))` }}
                >
                  {presentKinds.map((k) => {
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
                        <div
                          className="text-4xl leading-none"
                          style={{ color: DICE_THEME.ocreLight }}
                        >
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

              {/* ENCART ANALYSE : statique immédiate + zone LLM en dessous */}
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
                  Analyse du tirage
                </h3>

                {/* Partie statique — instantanée (fait patienter) */}
                <div className="space-y-3">
                  {presentKinds.map((k) => {
                    const val = result[k] as string | number;
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

                {/* Zone LLM — chargement puis texte généré */}
                <div className="mt-5 border-t pt-4" style={{ borderColor: `${DICE_THEME.gold}33` }}>
                  {analysisLoading && (
                    <div
                      className="text-center text-sm italic"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.8 }}
                    >
                      Les astres réfléchissent… ✨
                    </div>
                  )}

                  {/* Analyse structurée en belles cartes */}
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
                            boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
                          }}
                        >
                          <p
                            className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                            style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                          >
                            Synthèse
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

                  {/* Fallback texte libre */}
                  {analysis && !analysisLoading && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm leading-relaxed italic"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                    >
                      {analysis}
                    </motion.p>
                  )}

                  {!analysis && !analysisSections && !analysisLoading && (
                    <div className="text-center">
                      <DiceButton
                        variant="ocre"
                        onClick={runAnalysis}
                      >
                        ✨ Analyser en profondeur
                      </DiceButton>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Après le 1er tirage : proposer les deux options d'affinage */}
        <AnimatePresence>
          {phase === 'firstDone' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <p
                className="mb-4 text-center text-sm"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: DICE_THEME.glyph,
                  opacity: 0.85,
                }}
              >
                Choisissez la nuance à préciser :
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <DiceButton onClick={() => refine('action')}>
                  🔁 Option A — Le zoom d&apos;action
                </DiceButton>
                <DiceButton variant="ocre" onClick={() => refine('domaine')}>
                  🔁 Option B — Le zoom de domaine
                </DiceButton>
              </div>
              <p
                className="mt-3 text-center text-xs"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: DICE_THEME.glyph,
                  opacity: 0.6,
                }}
              >
                A : relance le dé des Signes · B : relance le dé des Maisons
                (les autres dés restent en place).
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Après l'affinage : question interprétative */}
        <AnimatePresence>
          {phase === 'refineDone' && option && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div
                className="mx-auto max-w-2xl rounded-2xl p-5"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.ocre}22 0%, ${DICE_THEME.ocre}11 100%)`,
                  border: `1.5px solid ${DICE_THEME.ocre}66`,
                  boxShadow: `inset 0 0 30px ${DICE_THEME.ocre}18`,
                }}
              >
                <h3
                  className="mb-3 text-center text-lg font-bold"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: DICE_THEME.ocreLight,
                    textShadow: `0 0 12px ${DICE_THEME.gold}44`,
                  }}
                >
                  {option === 'action'
                    ? 'Le zoom d’action'
                    : 'Le zoom de domaine'}
                </h3>
                <p className="text-center italic" style={{ color: DICE_THEME.glyph }}>
                  {option === 'action'
                    ? '« Quelle est la meilleure attitude ou posture à adopter maintenant pour débloquer cette situation ? »'
                    : '« Quel autre domaine de ma vie va être impacté par ricochet par cette décision ? »'}
                </p>
              </div>

              <div className="mt-6 text-center">
                <DiceButton onClick={rollFirst}>
                  Recommencer un tirage
                </DiceButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DiceBackground>
  );
}
