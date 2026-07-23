'use client';

// app/des-divinatoires/choix/page.tsx — Niveau 2.2 : Le Tirage du choix
// Intègre le gobelet (AstroDiceCup) au geste, comme sur /affinage,
// en gardant les specs : consigne A → lancer → résultat A (analyse) →
// consigne B → lancer → résultat B (analyse) → synthèse.

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
import { saveReading } from '@/lib/save-reading';
import { useT } from '@/lib/i18n';

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

// Les 3 dés sont toujours lancés (Planète / Signe / Maison).
const ACTIVE_DICE: DieKind[] = ['planet', 'sign', 'house'];

// Helpers de sérialisation pour l'historique (dés du zodiaque).
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

/** Encart Analyse : statique immédiate + bouton IA (même pattern que /affinage). */
function DiceAnalysis({
  faces,
  activeKinds,
  mode = 'global',
  question,
}: {
  faces: TargetFaces;
  activeKinds: DieKind[];
  mode?: 'global' | 'zoom-action' | 'zoom-domaine';
  question?: string | null;
}) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [sections, setSections] = useState<
    { key: string; label: string; text: string }[] | null
  >(null);
  const [synthese, setSynthese] = useState<string>('');
  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setAnalysis(null);
    setSections(null);
    setSynthese('');
    try {
      const res = await fetch('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faces, activeKinds, mode, question: question || undefined, dbInterpretation: dbInterpretation || undefined }),
      });
      const data = await res.json();
      if (data.sections && Array.isArray(data.sections)) {
        setSections(data.sections);
        setSynthese(data.synthese || '');
      } else {
        setAnalysis(data.texte || 'Analyse indisponible.');
      }
    } catch {
      setAnalysis('Les étoiles se sont voilées… Réessaie l’analyse.');
    } finally {
      setLoading(false);
    }
  }, [faces, activeKinds, mode]);

  // ── Fetch DB interpretation automatiquement après chaque lancer ──
  useEffect(() => {
    if (!faces.planet || !faces.sign || !faces.house) return;
    const planet = PLANET_NAMES[faces.planet as string];
    const sign = SIGN_NAMES[faces.sign as string];
    const house = `Maison ${faces.house}`;
    if (!planet || !sign) return;

    setDbLoading(true);
    setDbInterpretation(null);

    fetch('/api/astro-interpretation-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planet, sign, house }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.found && data.interpretation) {
          setDbInterpretation(data.interpretation);
        }
      })
      .catch(() => {
        // silencieux — la DB est un bonus, pas un blocage
      })
      .finally(() => setDbLoading(false));
  }, [faces.planet, faces.sign, faces.house]);

  return (
    <div
      className="mx-auto mt-5 max-w-2xl rounded-3xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${DICE_THEME.ocre}14 0%, ${DICE_THEME.brick} 100%)`,
        border: `1.5px solid ${DICE_THEME.ocre}55`,
        boxShadow: `inset 0 0 30px ${DICE_THEME.ocre}14`,
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
        Analyse du tirage
      </h3>

      {/* Partie statique — instantanée (fait patienter) */}
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

      {/* ── Carte DB — interprétation combinée planète×signe×maison ── */}
      {dbLoading && (
        <div
          className="mt-4 text-center text-xs italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.6 }}
        >
          Recherche de l'interprétation…
        </div>
      )}
      {dbInterpretation && !dbLoading && (
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
            Interprétation combinée
          </p>
          <p
            className="text-center text-sm leading-relaxed"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
          >
            {dbInterpretation}
          </p>
        </div>
      )}

      {/* Zone LLM — chargement puis texte généré */}
      <div className="mt-5 border-t pt-4" style={{ borderColor: `${DICE_THEME.gold}33` }}>
        {loading && (
          <div
            className="text-center text-sm italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.8 }}
          >
            Les astres réfléchissent… ✨
          </div>
        )}

        {/* Analyse structurée en belles cartes */}
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
                  className="text-center text-sm leading-relaxed italic"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
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
                  Synthèse
                </p>
                <p
                  className="text-center text-sm leading-relaxed italic"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                >
                  {synthese}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Fallback texte libre */}
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

        {!analysis && !sections && !loading && (
          <div className="text-center">
            <DiceButton variant="ocre" onClick={run}>
              ✨ Analyser en profondeur
            </DiceButton>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChoixPage() {
  const [step, setStep] = useState<Step>('A_intro');
  const t = useT();
  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 }) : randomTargetFaces()
  );
  const [ready, setReady] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [resultA, setResultA] = useState<TargetFaces | null>(null);
  const [resultB, setResultB] = useState<TargetFaces | null>(null);
  const [comparaison, setComparaison] = useState<string | null>(null);
  const [comparaisonLoading, setComparaisonLoading] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  // Cible de scroll après un lancer (pointe sur le bloc résultat monté).
  const resultRef = useRef<HTMLDivElement | null>(null);
  // Cible de scroll vers l'arène des dés (gobelet).
  const cupRef = useRef<HTMLDivElement | null>(null);

  // Analyse comparative des deux tirages (mode 'choix' côté API).
  const runComparaison = useCallback(async () => {
    if (!resultA || !resultB) return;
    setComparaisonLoading(true);
    setComparaison(null);
    try {
      const res = await fetch('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'choix',
          facesA: resultA,
          facesB: resultB,
          activeKinds: ACTIVE_DICE,
        }),
      });
      const data = await res.json();
      setComparaison(data.comparaison || 'Comparaison indisponible.');
    } catch {
      setComparaison('Les étoiles se sont voilées… Réessaie la comparaison.');
    } finally {
      setComparaisonLoading(false);
    }
  }, [resultA, resultB]);

  // Le lancer se fait AU GESTE (tap / secousse) — pas d'autolancement.
  const chooseA = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('A_roll');
  }, []);

  const chooseB = useCallback(() => {
    setFaces(randomTargetFaces());
    setStep('B_roll');
    setResetSignal((n) => n + 1); // remount propre du gobelet pour le lancer B
    // Retourner devant l'arène des dés (le gobelet est en haut).
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (cupRef.current) {
          const top = cupRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, top - 80), behavior: 'smooth' });
        }
      }, 60);
    });
  }, []);

  const handleRest = useCallback((f: TargetFaces) => {
    setStep((s) => {
      if (s === 'A_roll') {
        setResultA(f);
        // Sauvegarde historique — Premier Choix
        saveReading({
          type: 'des-choix',
          spread: 'Premier Choix',
          cards: diceCards(f),
          interpretation: diceStaticText(f),
          question,
        });
        return 'A_done';
      }
      if (s === 'B_roll') {
        setResultB(f);
        // Sauvegarde historique — Second Choix
        saveReading({
          type: 'des-choix',
          spread: 'Second Choix',
          cards: diceCards(f),
          interpretation: diceStaticText(f),
          question,
        });
        return 'B_done';
      }
      return s;
    });
    setQuestion(null);
    // Descente directe vers le résultat + analyse (après rendu du bloc).
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (resultRef.current) {
          const top = resultRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: top - 80, behavior: 'smooth' });
        }
      }, 60);
    });
  }, [question]);

  const restart = useCallback(() => {
    setResultA(null);
    setResultB(null);
    setQuestion(null);
    setReady(false);
    setResetSignal((n) => n + 1);
    setStep('A_intro');
  }, []);

  const cupVisible = step !== 'A_intro';

  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title={t('des.choix.title')}
        subtitle={t('des.choix.subtitle')}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Question avant le tirage */}
        {step === 'A_intro' && (
          <AskQuestion onConfirm={setQuestion} accentColor={DICE_THEME.gold} />
        )}
        {/* Consigne Premier Choix */}
        {(step === 'A_intro') && (
          <OcreCard title={t('des.choix.first')}>
            <p className="text-center">
              Formulez clairement votre <b>premier choix</b> dans votre esprit
              (ex : « changer d&apos;emploi »), puis lancez les dés.
            </p>
            <div className="mt-5 text-center">
              <DiceButton onClick={chooseA}>Lancer les dés astrologiques</DiceButton>
            </div>
          </OcreCard>
        )}

        {/* Gobelet (monté dès le départ, révélé à onReady + dès l'étape A_roll).
            Le lancer se fait au geste (secousse / appui) — pas de bouton. */}
        <div
          ref={cupRef}
          style={{
            height: cupVisible ? 460 : 0,
            opacity: cupVisible && ready ? 1 : 0,
            overflow: 'hidden',
            transition: 'opacity 450ms ease',
            pointerEvents: cupVisible ? 'auto' : 'none',
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
          />
        </div>

        {(step === 'A_roll' || step === 'B_roll') && (
          <p
            className="mt-3 text-center text-xs italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.7 }}
          >
            ✋ Secouez le gobelet puis poussez vers le haut (ou appuyez) pour lancer les dés.
          </p>
        )}

        {/* Résultat A + analyse */}
        <AnimatePresence>
          {resultA && step !== 'A_intro' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <p
                className="mb-1 text-center text-xs uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
              >
                Premier Choix
              </p>
              <ResultLine faces={resultA} />
              <p
                className="mt-2 text-center text-xs italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.7 }}
              >
                📝 Notez la vibration (ex : Lune en Cancer en Maison 4 =
                introspection, confort, protection du foyer).
              </p>
              <DiceAnalysis faces={resultA} activeKinds={ACTIVE_DICE} question={question} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Passage au Second Choix */}
        <AnimatePresence>
          {step === 'A_done' && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <OcreCard title={t('des.choix.first')}>
                <p className="text-center">
                  Voici la vibration de votre <b>premier choix</b>. Lisez-la puis
                  analysez-la.
                </p>
                <div className="mt-5 text-center">
                  <DiceButton variant="ocre" onClick={chooseB}>
                    Lancer les dés astrologiques
                  </DiceButton>
                </div>
              </OcreCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Résultat B + analyse */}
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
                Second Choix
              </p>
              <ResultLine faces={resultB} />
              <p
                className="mt-2 text-center text-xs italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.7 }}
              >
                📝 Notez la vibration (ex : Uranus en Verseau en Maison 10 =
                grand changement pro, liberté, rupture de routine).
              </p>
              <DiceAnalysis faces={resultB} activeKinds={ACTIVE_DICE} question={question} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Synthèse finale */}
        <AnimatePresence>
          {step === 'B_done' && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <OcreCard title="Indicateur de choix">
                <p className="text-center italic leading-relaxed">
                  Comparez la fluidité des énergies. Le <b>Premier Choix</b> apporte-t-il
                  de la <b>stabilité</b> ou de la <b>stagnation</b> ? Le <b>Second Choix</b>
                  génère-t-il du <b>renouveau</b> ou de l&apos;<b>instabilité</b> ?
                </p>

                <div className="mt-5 text-center">
                  <DiceButton variant="ocre" onClick={runComparaison}>
                    {t('des.choix.compare')}
                  </DiceButton>
                </div>

                {comparaisonLoading && (
                  <p
                    className="mt-4 text-center text-sm italic"
                    style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.8 }}
                  >
                    Les astres comparent vos chemins… ✨
                  </p>
                )}

                {comparaison && !comparaisonLoading && (
                  <div
                    className="mt-5 rounded-2xl p-5"
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
                      Mise en lumière
                    </p>
                    <p
                      className="text-center text-sm leading-relaxed italic"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                    >
                      {comparaison}
                    </p>
                  </div>
                )}
              </OcreCard>

              <div className="mt-6 text-center">
                <DiceButton onClick={restart}>
                  Recommencer
                </DiceButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </DiceBackground>
  );
}
