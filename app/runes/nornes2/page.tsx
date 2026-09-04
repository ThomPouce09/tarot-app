'use client';

// app/runes/nornes2/page.tsx — Niveau 2.1 bis : « Le Fil des Nornes —
// Simplifié » : le tirage de BASE de l'univers Runes (à l'aveugle).
// Le joueur secoue le sac, les 24 runes sortent face cachée et s'éparpillent
// sur la table ; il en choisit 3 à l'aveugle. Les 3 élues sont alors mises en
// valeur SUR LA TABLE par le scatter (envol en ligne + retournement + halo
// doré — elles sont déjà sorties et étalées, pas de nouvelle sortie du
// pochon), puis le déroulement est IDENTIQUE à /runes/nornes (validé) :
// lecture Urd/Verdandi/Skuld, analyse IA, Conseil d'Odin (ARKANE, tirage
// séparé depuis le sac), historique fusionné fil + tissage.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import YiSlideNav from '@/components/yi-slide-nav';
import { ThemeSelector } from './theme-selector';
import {
  RuneBackground,
  RuneTitle,
  RuneButton,
  RuneReading,
  RuneAnalysis,
  RUNE_THEME,
} from '../_shared';
import { NornesTutorialModal } from '../nornes/nornes-tutorial-modal';
import { type DrawnRune } from '@/components/rune-stones';
import { type ScatterPick } from './rune-scatter';
import { saveReading, updateReading } from '@/lib/save-reading';
import { useEntitlement } from '@/lib/use-entitlement';
import { useT } from '@/lib/i18n';
import AuthGate from '@/components/auth-gate';

const RuneScatter = dynamic(() => import('./rune-scatter').then((m) => m.RuneScatter), {
  ssr: false,
});

const RuneStonesSet = dynamic(
  () => import('@/components/rune-stones').then((m) => m.RuneStonesSet),
  { ssr: false },
);

const NORNES_POS = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir'];

function Nornes2Page() {
  const [isRolling, setIsRolling] = useState(false);
  const [runes, setRunes] = useState<DrawnRune[]>([]);
  // picks : les 3 runes choisies à l'aveugle (face cachée) → preset révélé.
  const [picks, setPicks] = useState<ScatterPick[] | null>(null);
  // L'interprétation IA du tirage initial a-t-elle été affichée ? (le CTA
  // « Tisser une nouvelle voie » n'apparaît qu'après — jamais avant).
  const [mainAnalysisDone, setMainAnalysisDone] = useState(false);
  // Abonnement : la variation « Briser le Destin / Conseil d'Odin » est
  // réservée au forfait ARKANE.
  const { sub: entSub } = useEntitlement();
  const canOdinAdvice = entSub?.level === 'arkane';
  const [phase, setPhase] = useState<'idle' | 'scatter' | 'done' | 'advice'>('idle');
  const [question, setQuestion] = useState<string | null>(null);
  // Modale « Principe du Fil des Nornes » affichée au chargement :
  //   'demo'  → la modale est ouverte (le scatter est inactif derrière)
  //   'ready' → « Compris » cliqué : la modale se ferme, le sac s'active.
  const [intro, setIntro] = useState<'demo' | 'ready'>('demo');
  const t = useT();
  const readingIdRef = useRef<string | null>(null);
  // Analyse IA du fil (sections Urd/Verdandi/Skuld) conservée pour la fusionner
  // avec le Conseil d'Odin dans l'historique — sinon la 2e écriture (Conseil
  // d'Odin) écrase la 1ère et tout le tirage n'apparaît pas.
  const mainAnalysisRef = useRef<Record<string, unknown> | null>(null);
  const savedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Construit un texte d'interprétation statique à partir des runes tirées.
  const staticInterpretation = useCallback((r: DrawnRune[], count: number) => {
    return r.slice(0, count).map((d, i) => {
      const name = d.rune?.name || 'Rune';
      const sense = d.reversed ? d.rune?.reversed : d.rune?.upright;
      const pos = ['Urd — Le Passé', 'Verdandi — Le Présent', 'Skuld — L’Avenir', 'Conseil d’Odin'][i] || `Rune ${i + 1}`;
      return `**${pos} : ${name}**\n${sense || ''}`;
    }).join('\n\n');
  }, []);

  const roll = useCallback(() => {
    setRunes([]);
    setPicks(null);
    setPhase('idle');
    setIsRolling(false);
    savedRef.current = false;
    readingIdRef.current = null;
    // Nouveau tirage → l'interprétation doit être (re)affichée avant que
    // l'action « Tisser une nouvelle voie » réapparaisse.
    setMainAnalysisDone(false);
    setQuestion(null); // le sélecteur de thème réapparaît
    mainAnalysisRef.current = null;
  }, []);

  // Clic sur « Compris » : ferme la modale → la question (obligatoire) est
  // mise en avant ; le sac ne s'active qu'après son enregistrement.
  const understand = useCallback(() => {
    setIntro('ready');
  }, []);

  // Thème + intention choisis : ils conditionnent l'activation du sac
  // (scatter différé de 350 ms pour laisser le panneau se refermer proprement).
  const handleThemeConfirm = useCallback((q: string) => {
    setQuestion(q);
    const t3 = window.setTimeout(() => setPhase('scatter'), 350);
    cleanupRef.current = () => window.clearTimeout(t3);
  }, []);

  // Nettoie le timeout différé si l'on quitte la page avant le clic.
  useEffect(() => {
    return () => cleanupRef.current?.();
  }, []);

  // 🎯 Les 3 runes sont choisies à l'aveugle ; le scatter les a déjà révélées
  //    sur la table (envol en ligne + flip + halo — pas de sortie du pochon :
  //    elles sont déjà sorties et étalées). On passe directement à la lecture.
  const handleScatterComplete = useCallback(
    async (p: ScatterPick[]) => {
      setPicks(p);
      setRunes(p);
      setPhase('done');
      if (!savedRef.current) {
        savedRef.current = true;
        const id = await saveReading({
          type: 'runes-nornes2',
          spread: 'Le Fil des Nornes — Simplifié',
          cards: p.slice(0, 3).map((d, i) => ({
            name: d.rune?.name,
            symbol: d.rune?.symbol,
            reversed: d.reversed,
            position: NORNES_POS[i],
          })),
          interpretation: staticInterpretation(p, 3),
          question,
        });
        if (id) readingIdRef.current = id;
        // NB : la question/thème reste en place — elle est transmise à
        // l'analyse IA (RuneAnalysis) et sera réinitialisée au prochain roll.
      }
    },
    [staticInterpretation, question],
  );

  const adviceRoll = useCallback(() => {
    setPhase('advice');
    setIsRolling(true);
  }, []);

  // « Tisser une nouvelle voie » : le clic a lieu en bas de page → recentrer
  // la vue sur le sac du Conseil d'Odin dès qu'il apparaît.
  const adviceBagRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (phase !== 'advice') return;
    const t = window.setTimeout(() => {
      adviceBagRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 450);
    return () => window.clearTimeout(t);
  }, [phase]);

  const handleAdviceRest = useCallback(async (r: DrawnRune[]) => {
    setIsRolling(false);
    setRunes((prev) => {
      const all = [...prev.slice(0, 3), r[0]];
      if (readingIdRef.current) {
        const allCards = all.map((d, i) => ({
          name: d.rune?.name,
          symbol: d.rune?.symbol,
          reversed: d.reversed,
          position: NORNES_POS[i] || 'Conseil d’Odin',
        }));
        // On n'écrase PAS l'interprétation IA du fil par le texte statique :
        // elle est conservée puis fusionnée avec le Conseil d'Odin quand son
        // analyse arrive (onAdviceAnalysis) — l'historique montre tout le tirage.
        if (mainAnalysisRef.current) {
          updateReading(readingIdRef.current, { cards: allCards });
        } else {
          updateReading(readingIdRef.current, {
            cards: allCards,
            interpretation: staticInterpretation(all, 4),
          });
        }
      }
      return all;
    });
  }, [staticInterpretation]);

  const onAnalysis = useCallback((text: string) => {
    if (readingIdRef.current && text) {
      updateReading(readingIdRef.current, { interpretation: text });
    }
  }, []);

  // Révélation IA du tirage principal prête. Le focus est géré par RuneAnalysis
  // lui-même (il amène sa tête — la grande tuile URD — en haut d'écran).
  const onMainAnalysis = useCallback(
    (text: string) => {
      setMainAnalysisDone(true);
      // Conserver l'analyse structurée du fil (JSON) : elle sera fusionnée avec
      // le Conseil d'Odin à destination de l'historique (onAdviceAnalysis).
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          mainAnalysisRef.current = parsed as Record<string, unknown>;
        }
      } catch { /* texte non JSON : rien à conserver */ }
      onAnalysis(text);
    },
    [onAnalysis],
  );

  // Révélation IA du Conseil d'Odin prête → fusion avec le fil pour l'historique.
  const onAdviceAnalysis = useCallback(
    (text: string) => {
      // Fusionner l'analyse du Conseil d'Odin AVEC celle du fil (U/V/S) : la
      // lecture historique doit montrer TOUT le tirage, pas seulement le Conseil
      // (sinon la 2e écriture écrase la 1ère).
      try {
        const odin = JSON.parse(text) as Record<string, any>;
        const main = mainAnalysisRef.current;
        if (odin && main && Array.isArray(odin.sections)) {
          // Format structuré à DEUX blocs pour l'historique :
          //   fil     → sections U/V/S + synthèse + 1er Conseil d'Odin
          //   tissage → section du Conseil + 2e Conseil d'Odin
          const merged = {
            version: 'nornes-full',
            fil: {
              sections: Array.isArray(main.sections) ? (main.sections as unknown[]) : [],
              synthese: (main.synthese as string) || '',
              conseil_action: (main.conseil_action as string) || '',
            },
            tissage: {
              sections: odin.sections as unknown[],
              synthese: (odin.synthese as string) || '',
              conseil_action: (odin.conseil_action as string) || '',
            },
          };
          onAnalysis(JSON.stringify(merged));
          return;
        }
      } catch { /* réponse non JSON → on garde le texte reçu */ }
      onAnalysis(text);
    },
    [onAnalysis],
  );

  const hasAdvice = runes.length === 4;
  const scatterActive = phase === 'scatter' && !picks;

  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title={t('runes.nornes2.title')}
        subtitle={t('runes.nornes2.subtitle')}
        compact
      />

      <div className="mx-auto max-w-2xl px-4 pb-20">
        {/* Modale « Principe du Fil des Nornes » affichée avant le tirage : elle
            recouvre la page jusqu'au clic « Compris ». */}
        {intro === 'demo' && (
          <NornesTutorialModal
            onDone={understand}
            step1Key="runes.nornes2.modalStep1"
            step2Key="runes.nornes2.modalStep2"
            step3Key="runes.nornes2.modalStep3"
          />
        )}

        {/* THÈME (obligatoire, mise en avant) : le tirage ne démarre qu'une
            fois le domaine + l'intention choisis (« Tisser le fil »). */}
        {phase === 'idle' && !question && (
          <div className="py-2">
            <motion.div
              className="rounded-2xl"
              animate={{
                boxShadow: [
                  `0 0 0 1px ${RUNE_THEME.goldPale}33, 0 0 14px ${RUNE_THEME.goldPale}18`,
                  `0 0 0 1px ${RUNE_THEME.goldPale}88, 0 0 34px ${RUNE_THEME.goldPale}55`,
                  `0 0 0 1px ${RUNE_THEME.goldPale}33, 0 0 14px ${RUNE_THEME.goldPale}18`,
                ],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ThemeSelector onConfirm={handleThemeConfirm} />
            </motion.div>
          </div>
        )}

        {/* ÉTAPE 1 — Tirage à l'aveugle : secouer le sac, choisir 3 runes.
            La mise en valeur des 3 élues (envol en ligne + flip + halo doré)
            est jouée PAR LE SCATTER LUI-MÊME : les runes sont déjà sorties et
            étalées, elles ne repassent pas par le pochon. */}
        {scatterActive && (
          <RuneScatter height={430} enabled onComplete={handleScatterComplete} />
        )}

        {/* Lecture des 3 Nornes (GARDES identiques à /nornes validé) */}
        <AnimatePresence>
          {runes.length >= 3 && !isRolling && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-3"
            >
              <RuneReading
                rune={runes[0]?.rune ?? null}
                reversed={runes[0]?.reversed}
                position="Urd — Le Passé"
                meaning="Les origines de la situation, ce qui est déjà accompli."
                compactInfo
              />
              <RuneReading
                rune={runes[1]?.rune ?? null}
                reversed={runes[1]?.reversed}
                position="Verdandi — Le Présent"
                meaning="La nécessité actuelle, le mouvement en cours."
                compactInfo
              />
              <RuneReading
                rune={runes[2]?.rune ?? null}
                reversed={runes[2]?.reversed}
                position="Skuld — L’Avenir"
                meaning="L’aboutissement logique si rien ne change."
                compactInfo
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyse IA du fil des Nornes (3 premières runes) — reste monté même
            pendant la phase advice pour ne pas tuer une analyse en cours. */}
        {phase !== 'idle' && runes.length >= 3 && (
          <RuneAnalysis
            mode="nornes"
            gateType="runes-nornes2"
            runes={[
              { rune: runes[0].rune, reversed: runes[0].reversed, position: 'Urd — Le Passé' },
              { rune: runes[1].rune, reversed: runes[1].reversed, position: 'Verdandi — Le Présent' },
              { rune: runes[2].rune, reversed: runes[2].reversed, position: 'Skuld — L’Avenir' },
            ]}
            onAnalysis={onMainAnalysis}
            question={question}
            autoRun
          />
        )}

        {/* Variation "Briser le Destin" — réservée aux abonnés Initié et
            Arkane, et uniquement APRÈS l'affichage de l'interprétation IA du
            tirage initial. */}
        <AnimatePresence>
          {phase === 'done' && !hasAdvice && mainAnalysisDone && canOdinAdvice && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 text-center"
            >
              <p
                className="mb-4 text-sm italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sage }}
              >
                Si l’avenir (Skuld) vous paraît lourd, vous pouvez tisser une
                nouvelle voie.
              </p>
              <RuneButton variant="save" onClick={adviceRoll}>
                {t('runes.nornes.advice')}
              </RuneButton>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tirage séparé du Conseil d'Odin (1 rune). Le composant est
            ré-affiché pour ce round : count=1, layout horizontal. */}
        {phase === 'advice' && (
          <div ref={adviceBagRef} className="scroll-mt-4">
            <RuneStonesSet
              count={1}
              layout="horizontal"
              isRolling={isRolling}
              onRest={handleAdviceRest}
              height={340}
            />
          </div>
        )}

        {/* 4ème rune : Conseil d'Odin — révélation UNIQUE (même principe que
            /nornes) : RuneAnalysis (odinReveal) n'affiche qu'UN bouton
            « Révéler le Conseil d'Odin » ; la carte parchemin dorée révèle la
            rune, son sens, la lecture et l'action concrète — sans section ni
            « Synthèse » dupliquées. */}
        <AnimatePresence>
          {phase === 'advice' && runes[3] && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              {/* Analyse IA ciblée : le Conseil d'Odin par rapport aux 3 Nornes */}
              <RuneAnalysis
                mode="nornes"
                gateType="runes-nornes2"
                focus="odin"
                odinReveal
                buttonLabel="Consulter l'Oracle sur le conseil d'Odin"
                runes={[
                  { rune: runes[0].rune, reversed: runes[0].reversed, position: 'Urd — Le Passé' },
                  { rune: runes[1].rune, reversed: runes[1].reversed, position: 'Verdandi — Le Présent' },
                  { rune: runes[2].rune, reversed: runes[2].reversed, position: 'Skuld — L’Avenir' },
                  { rune: runes[3].rune, reversed: runes[3].reversed, position: 'Conseil d’Odin' },
                ]}
                onAnalysis={onAdviceAnalysis}
                autoRun
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RuneBackground>
  );
}

export default function GatedPage() {
  return <AuthGate><Nornes2Page /></AuthGate>;
}
