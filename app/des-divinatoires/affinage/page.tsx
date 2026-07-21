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
import { AskQuestion } from '@/components/ask-question';
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
import { saveReading, updateReading } from '@/lib/save-reading';
import { useT } from '@/lib/i18n';

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


type Phase = 'initial' | 'firstRoll' | 'firstDone' | 'refineRoll' | 'refineDone';
type Option = 'action' | 'domaine';
type ModeLLM = 'global' | 'zoom-action' | 'zoom-domaine';

const KIND_LABEL: Record<DieKind, string> = {
  planet: 'Planète',
  sign: 'Signe',
  house: 'Maison',
};

// Helpers de sérialisation pour l'historique (dés du zodiaque).
function diceCardsFor(f: TargetFaces, kinds: DieKind[]) {
  return kinds.map((k) => ({
    kind: k,
    value: f[k],
    label: k === 'planet' ? PLANET_NAMES[f[k] as string] : k === 'sign' ? SIGN_NAMES[f[k] as string] : `Maison ${f[k]}`,
  }));
}
function diceStaticTextFor(f: TargetFaces, kinds: DieKind[]) {
  return kinds.map((k) => `${KIND_LABEL[k]} ${f[k]} : ${meaningFor(k, f[k])}`).join('\n');
}

export default function AffinagePage() {
  const [phase, setPhase] = useState<Phase>('initial');
  const [question, setQuestion] = useState<string | null>(null);
  const t = useT();
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
  const tutorialRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);

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

  // Références pour la persistance historique (anti-doublon + update IA)
  const readingIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);

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
    savedRef.current = false;
    readingIdRef.current = null;
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
    async (faces: TargetFaces) => {
      setResult({ ...faces });
      setPhase(option ? 'refineDone' : 'firstDone');
      // Sauvegarde historique UNIQUEMENT au 1er lancer et une seule fois.
      if (!option && !savedRef.current) {
        savedRef.current = true;
        const id = await saveReading({
          type: 'des-affinage',
          spread: 'Tirage complet',
          cards: diceCardsFor(faces, activeDice),
          interpretation: diceStaticTextFor(faces, activeDice),
          question,
        });
        if (id) readingIdRef.current = id;
        // Réinitialiser la question pour le prochain tirage
        setQuestion(null);
      }
      // Après affinage : mettre à jour la même lecture avec les nouvelles cartes
      // et le type de zoom.
      // NOTE : on merge result (qui contient les 3 dés du 1er lancer) avec
      // les faces fraîches du gobelet (qui ne contient qu'1 dé pendant l'affinage).
      if (option && readingIdRef.current) {
        const merged = { ...result, ...faces };
        const zoomLabel = option === 'action' ? 'Zoom Signe' : 'Zoom Maison';
        updateReading(readingIdRef.current, {
          cards: diceCardsFor(merged, ['planet', 'sign', 'house']),
          spread: `Tirage complet — ${zoomLabel}`,
        });
      }
    },
    [option, activeDice, question],
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
      let interpretationText = '';
      if (data.sections && Array.isArray(data.sections)) {
        setAnalysisSections(data.sections);
        setAnalysisSynthese(data.synthese || '');
        // Persister la réponse structurée complète
        interpretationText = JSON.stringify(data);
      } else {
        interpretationText = data.texte || 'Analyse indisponible.';
        setAnalysis(data.texte || 'Analyse indisponible.');
      }
      // Persister l'interprétation IA dans la lecture existante
      if (readingIdRef.current && interpretationText) {
        updateReading(readingIdRef.current, { interpretation: interpretationText });
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
    <><style>{`
      @keyframes glow-pulse {
              0%, 100% { text-shadow: 0 0 6px rgba(100,180,255,0.4), 0 0 16px rgba(100,180,255,0.25); }
              50%      { text-shadow: 0 0 12px rgba(100,220,255,0.9), 0 0 30px rgba(100,220,255,0.5), 0 0 50px rgba(100,220,255,0.2); }
            }
            .affinage-glow {
              color: #99d4ff;
              font-family: 'var(--font-cinzel), serif';
              font-size: 0.85rem;
              letter-spacing: 0.05em;
              animation: glow-pulse 2.2s ease-in-out infinite;
            }
    `}</style><DiceBackground>
      <YiSlideNav />
      <DiceTitle title={t('des.affinage.title')} />

      <div className="mx-auto max-w-2xl px-4 pb-20">
        {/* Question avant le premier tirage */}
        {phase === 'initial' && (
          <>
            {!question && (
            <p
              className="text-center mt-6 mb-4 affinage-glow"
            >
              Concentrez-vous sur votre question
            </p>
            )}
            <AskQuestion
            onConfirm={setQuestion}
            label="Garder votre question en mémoire (facultatif)"
            placeholder="Garder votre question en mémoire (facultatif)"
            confirmLabel="Enregistrer"
            launchLabel="Lancer les dés zodiacaux !"
            onLaunch={() => {
              setShowTutorial(true);
              setTimeout(() => {
                tutorialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 500);
            }}
          />
          </>
        )}

        {/* Question persistante après enregistrement */}
        {question && (
          <p
            ref={questionRef}
            className="text-center mx-auto mb-2"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              color: DICE_THEME.gold,
              fontSize: '0.8rem',
              maxWidth: 260,
              lineHeight: 1.4,
              opacity: 0.75,
            }}
          >
            {question}
          </p>
        )}

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
            onShake={() => setShowTutorial(false)}
          />
        </div>

        {/* Tutoriel — calqué sur yi-jing-simple : icône Material "swipe" + texte */  }
        {showTutorial && (
          <motion.div
            ref={tutorialRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex flex-col items-center gap-1"
          >
            <style>{`
              @keyframes swipe-shake-affinage {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-16px); }
                75% { transform: translateX(16px); }
              }
              .swipe-icon-affinage {
                animation: swipe-shake-affinage 0.6s ease-in-out infinite;
                font-size: 48px;
                color: #87CEEB;
                opacity: 0.5;
                user-select: none;
                -webkit-user-select: none;
              }
            `}</style>
            <span className="material-symbols-outlined swipe-icon-affinage">swipe</span>
            <p
              className="text-center leading-tight"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.65rem',
                maxWidth: 140,
                lineHeight: 1.3,
              }}
            >
              Secouez le gobelet pour mélanger les dés, puis poussez vers le haut pour les jeter
            </p>
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
                  {t('des.affinage.yourDice')}
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
                  {t('des.affinage.analysisTitle')}
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
                      {t('des.affinage.thinking')}
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
                      <DiceButton variant="ocre" onClick={runAnalysis}>
                        {t('des.affinage.analyze')}
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
                {t('des.affinage.choose')}
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <DiceButton onClick={() => refine('action')}>
                                  {t('des.affinage.optA')}
                                </DiceButton>
                                <DiceButton variant="ocre" onClick={() => refine('domaine')}>
                                  {t('des.affinage.optB')}
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
                {t('des.affinage.hint')}
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
                  {option === 'action' ? t('des.affinage.zoomAction') : t('des.affinage.zoomDomaine')}
                </h3>
                <p className="text-center italic" style={{ color: DICE_THEME.glyph }}>
                  {option === 'action' ? t('des.affinage.qAction') : t('des.affinage.qDomaine')}
                </p>
              </div>

              <div className="mt-6 text-center">
                <DiceButton onClick={rollFirst}>{t('runes.retry')}</DiceButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DiceBackground>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=swipe"
      /></>
  );
}
