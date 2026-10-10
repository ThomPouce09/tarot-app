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
import { useCallback, useState, useEffect, useLayoutEffect, useRef } from 'react';
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
import { planetName, signName, houseName, dieKindLabel } from '@/components/astro-dice/names';
import { saveReading, updateReading } from '@/lib/save-reading';
import { nextRaceSeq } from '@/lib/race-guard';
import { useEntitlement, EntitlementGateModal, type GateReason } from '@/lib/use-entitlement';
import { api } from '@/lib/api-client';
import AnalysisWaitCard from '@/components/analysis-wait-card';
import { preloadAstroDice } from '@/components/astro-dice/preload';
import { ClickableFaces } from '@/components/astro-dice/constellation';
import { playSound } from '@/lib/sounds';
import { clampTwoSentences } from '@/lib/artemis-secret';
import { pickAndPreloadWaitVideo } from '@/lib/preload-wait-videos';
import EchoBox from '@/components/echo-box';
import { useT, useLang, tr , getRuntimeLang} from '@/lib/i18n';
import AuthGate from '@/components/auth-gate';

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
        {tr("Préparation des dés…", "Preparing the dice…", "Preparando los dados…", "पासे तैयार हो रहे हैं…")}
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
    label: k === 'planet' ? planetName(f[k] as string, getRuntimeLang()) : k === 'sign' ? signName(f[k] as string, getRuntimeLang()) : houseName(f[k], getRuntimeLang()),
  }));
}
function diceStaticTextFor(f: TargetFaces, kinds: DieKind[]) {
  return kinds.map((k) => `${KIND_LABEL[k]} ${f[k]} : ${meaningFor(k, f[k])}`).join('\n');
}

function AffinagePage() {
  // Le chunk WebGL du gobelet se télécharge dès l'arrivée sur la page :
  // quand l'utilisateur atteint l'étape de tirage, plus rien ne « charge ».
  useEffect(() => { preloadAstroDice(); pickAndPreloadWaitVideo('analyse-des-zodiaque'); }, []);
  const [phase, setPhase] = useState<Phase>('initial');
  const [question, setQuestion] = useState<string | null>(null);
  const t = useT();
  const lang = useLang();
  // Privilège « Secret d'Artémis » : Initié 1/mois, Arkane illimité, autre refusé
  // (le serveur décide ; on mémorise le motif pour la modale à la révélation).
  const { gateReason, openGate, closeGate } = useEntitlement();
  const artemisBlockedRef = useRef<GateReason | null>(null);
  const [faces, setFaces] = useState<TargetFaces>(() =>
    typeof window === 'undefined' ? ({ planet: '☉', sign: '♈', house: 1 }) : randomTargetFaces()
  );
  const [option, setOption] = useState<Option | null>(null);
  // Thème des dés figé sur « moon » pour l'instant (sélecteur d'apparence
  // retiré ; à revoir plus tard).
  const skin = 'moon';
  const [ready, setReady] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [hasLaunched, setHasLaunched] = useState(false);
  // Cible du défilement automatique vers le haut du résultat après le tirage.
  const resultRef = useRef<HTMLDivElement>(null);
  const tutorialRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);

  // Tutoriel sous l'astrodice : visible dès que LE GOBETLET EST À L'ÉCRAN
  // (avant 1er jet, pendant le 1er lancer, et PENDANT LE JET D'AFFINAGE 1 dé —
  // le geste reste le même, il reste nécessaire), masqué dès le résultat posé.
  useEffect(() => {
    const arenaVisible = (phase === 'initial' && hasLaunched) || phase === 'firstRoll' || phase === 'refineRoll';
    if (arenaVisible) {
      const t = window.setTimeout(() => setShowTutorial(true), 500);
      return () => window.clearTimeout(t);
    }
    setShowTutorial(false);
  }, [phase, hasLaunched]);

  // ── Fenêtre appelante : combien de dés sont lancés ? ──
  // Par défaut les 3 ; peut être réduit à 1 dé (planète / signe / maison).
  const [activeDice, setActiveDice] = useState<DieKind[]>(['planet', 'sign', 'house']);

  // Dernier résultat remonté (clés présentes seulement).
  const [result, setResult] = useState<Partial<TargetFaces>>(faces);
  // Analyse LLM approfondie
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisSections, setAnalysisSections] = useState<
    { key: string; label: string; text: string }[] | null
  >(null);
  const [analysisSynthese, setAnalysisSynthese] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisErrored, setAnalysisErrored] = useState(false);
  const [savedDbInterpretation, setSavedDbInterpretation] = useState(false);
  // ── Le secret d'Artémis : réservé à la FIN de la 2ᵉ phase. PAS d'appel
  // séparé : il arrive DÈS L'ANALYSE DU DÉ RELANCÉ (payload withArtemis →
  // réponse { texte, artemis } en un seul appel). Le bouton ne fait que
  // révéler le texte déjà reçu. ──
  const [artemisRevealed, setArtemisRevealed] = useState(false);
  const [artemisAdvice, setArtemisAdvice] = useState<string | null>(null);
  // Parchemin secret-artemis.png : zone texte + police auto-ajustée (mécanique
  // identique à la carte Conseil d'Odin : binary search shrink-to-fit).
  const artemisBoxRef = useRef<HTMLDivElement | null>(null);
  const artemisTextRef = useRef<HTMLParagraphElement | null>(null);
  const [artemisFont, setArtemisFont] = useState<string | null>(null);

  // ── Verrouillage immédiat du scroll (pas via React — trop lent) ──
  // Appelé synchrone dans rollFirst/refine AVANT setPhase.
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
  // useLayoutEffect rattrape les cas où phase change ailleurs
  useLayoutEffect(() => {
    const locked = phase === 'firstRoll' || phase === 'refineRoll';
    if (locked) lockScrollImmediate();
    else unlockScrollImmediate();
  }, [phase, lockScrollImmediate, unlockScrollImmediate]);

  // Interprétation DB (curated, combo planète×signe×maison).
  const [dbInterpretation, setDbInterpretation] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Références pour la persistance historique (anti-doublon + update IA)
  const readingIdRef = useRef<string | null>(null);
  // Ref miroir en state : l'encadré « Écho scellé » doit se re-rendre dès que
  // la lecture est sauvegardée (une ref seule ne déclenche pas de rendu).
  const [readingId, setReadingId] = useState<string | null>(null);
  const savedRef = useRef(false);
  const originalFacesRef = useRef<TargetFaces | null>(null);
  // Accumulateur d'interprétation : on y ajoute les données au fil des étapes
  // (statique, DB, oracle flash, analyse LLM) et on persist le tout à chaque fois.
  const interpAccRef = useRef<Record<string, any>>({});

  // Dés réellement lancés (pilotés par la fenêtre appelante via activeDice).
  // En mode 1 dé, seule cette carte s'affiche.
  const presentKinds = activeDice;

  // Le 1er tirage se déclenche par le GESTE sur le gobelet (secousse/push) —
  // le bouton « Recommencer un tirage » et son encart ont été supprimés
  // (inutiles) ; un nouveau tirage se reprend depuis le hub des dés.
  // (Le verrou scroll/geste du lancer est assuré par AstroDiceCup lui-même :
  // pad touchAction:none + lock page html/body pendant rolling/strike.)

  // Relance sélective : on ne relance QUE le dé concerné. On réduit
  // activeDice à 1 dé pour que le gobelet n'affiche/lance que celui-ci.
  const refine = useCallback((opt: 'action' | 'domaine') => {
    // Verrouillage immédiat du scroll
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.touchAction = 'none';
    setOption(opt);
    setAnalysis(null);
    // Purger DÈS L'ICÎ l'analyse précédente : la gate de l'Écho scellé se
    // base sur (analysis || analysisSynthese) — sinon l'augure du tirage
    // d'avantage clignote pendant le nouveau lancer.
    setAnalysisSections(null);
    setAnalysisSynthese('');
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
  }, []);

  // Réception du résultat du gobelet (déclenché par le geste secousse+push,
  // ou par launchSignal). On avance l'état ICI, car c'est le seul moment
  // fiable où le tirage est terminé — pas via rollFirst/refine (qui ne sont
  // plus déclenchés par un bouton). Si une option d'affinage est active,
  // on bascule en refineDone, sinon en firstDone.
  const handleRest = useCallback(
    async (faces: TargetFaces) => {
      // Pendant l'affinage, faces ne contient qu'1 dé → merger avec le résultat précédent
      const resolved = option ? { ...result, ...faces } : { ...faces };
      setResult(resolved);
      setPhase(option ? 'refineDone' : 'firstDone');
      // Sauvegarde historique UNIQUEMENT au 1er lancer et une seule fois.
      if (!option && !savedRef.current) {
        savedRef.current = true;
        // Sauvegarder les faces originales pour l'affinage flash
        originalFacesRef.current = { ...faces };
        const staticText = diceStaticTextFor(faces, activeDice);
        interpAccRef.current = {
          static: staticText,
          cards: diceCardsFor(faces, activeDice),
        };
        const id = await saveReading({
          type: 'des-affinage',
          spread: 'Tirage complet',
          cards: diceCardsFor(faces, activeDice),
          interpretation: JSON.stringify(interpAccRef.current),
          question,
        });
        if (id) { readingIdRef.current = id; setReadingId(id); }
      }
      // Après affinage : mettre à jour la même lecture avec les nouvelles cartes
      // et le type de zoom.
      // NOTE : on merge result (qui contient les 3 dés du 1er lancer) avec
      // les faces fraîches du gobelet (qui ne contient qu'1 dé pendant l'affinage).
      if (option && readingIdRef.current) {
        const merged = { ...result, ...faces };
        const zoomLabel = option === 'action' ? 'Zoom Signe' : 'Zoom Maison';
        const refineCards = diceCardsFor(merged, ['planet', 'sign', 'house']);
        interpAccRef.current.refine = {
          option,
          originalFaces: originalFacesRef.current,
        };
        interpAccRef.current.cards = refineCards;
        await updateReading(readingIdRef.current, {
          cards: refineCards,
          spread: `Tirage complet — ${zoomLabel}`,
          interpretation: JSON.stringify(interpAccRef.current),
        });
      }
    },
    [option, activeDice, question, result],
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
  // Guard anti-course : seul le dernier lancement peut écrire l'état.
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
      let email = '';
      try { const u = localStorage.getItem('tarot_user'); if (u) email = JSON.parse(u).email || ''; } catch { /* noop */ }
      const payload: Record<string, unknown> = {
        faces: result,
        activeKinds: presentKinds,
        mode: llmMode(),
        dbInterpretation: dbInterpretation || undefined,
        question: question || undefined,
        lang,
        userId: email || undefined,
      };
      // Affinage → le secret d'Artémis est demandé DANS ce même appel
      // (réponse { texte, artemis }) : aucun rechargement IA à la révélation.
      if (option && originalFacesRef.current) {
        payload.withArtemis = true;
        payload.originalFaces = originalFacesRef.current;
      }
      const res = await api('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (seq !== analysisLastSeqRef.current) return; // réponse obsolète → ignorer
      // Secret d'Artémis refusé par le gating privilège (tier/limit/non connecté) :
      // l'analyse arrive sans chuchotement, le bouton révélera la modale.
      if (data.artemisBlocked) artemisBlockedRef.current = String(data.artemisBlocked) as GateReason;
      // Secret d'Artémis reçu EN MÊME TEMPS que l'analyse (aucun 2e appel).
      if (data.artemis) {
        setArtemisAdvice(String(data.artemis));
        interpAccRef.current.artemis = String(data.artemis);
      }
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
      const analysisKey = option ? 'analysisRefine' : 'analysisGlobal';
      const analysisPayload = data.sections
        ? { sections: data.sections, synthese: data.synthese || '', mode: llmMode() }
        : { texte: interpretationText, mode: llmMode() };
      interpAccRef.current[analysisKey] = analysisPayload;
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
  }, [result, presentKinds, phase, option, question]);

  // Le secret d'Artémis ARRIVE AVEC l'analyse d'affinage (un seul appel IA) :
  // le bouton ne fait que RÉVÉLER le texte déjà reçu — zéro rechargement.
  // Filet de sécurité (rare : JSON fusionné malformé côté modèle) : si le
  // chuchotement manque, on le demande en un petit appel à la révélation.
  const revealArtemis = useCallback(async () => {
    // Privilège refusé par le serveur (réservé / quota mensuel épuisé) :
    // on ouvre la modale de gating, le secret reste non révélé.
    if (!artemisAdvice && artemisBlockedRef.current) {
      openGate(artemisBlockedRef.current);
      return;
    }
    setArtemisRevealed(true);
    // Son AU CLIC (l'ancien, conservé) : le bouton ne s'affiche qu'une fois
    // (!artemisRevealed) → un seul déclenchement par tirage.
    playSound('artemis-secret', 1);
    // Puis, à l'APPARITION RÉELLE du texte, un second son (magic10.wav,
    // géré par l'effet plus bas) — les deux se cumulent volontairement.
    if (artemisAdvice) return;
    const orig = originalFacesRef.current;
    if (!orig) return;
    try {
      const res = await api('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: option === 'action' ? 'zoom-action' : 'zoom-domaine',
          faces: result,
          originalFaces: orig,
          withArtemis: true,
          activeKinds: ['planet', 'sign', 'house'],
          dbInterpretation: dbInterpretation || undefined,
          question: question || undefined,
          lang,
          userId: (() => { try { const u = localStorage.getItem('tarot_user'); return u ? (JSON.parse(u).email || undefined) : undefined; } catch { return undefined; } })(),
        }),
      });
      const data = await res.json();
      // Filet « 2 phrases max » aussi côté CLIENT : dans ce chemin de repli le
      // serveur peut n'avoir renvoyé que du texte long (JSON KO) — le parchemin
      // secret-artemis.png a une zone gravée à taille fixe, jamais de débordement.
      setArtemisAdvice(
        clampTwoSentences(String(data.artemis || data.texte || '')) ||
        tr("Les étoiles se voilent un instant… le secret n'a pas pu être chuchoté. Recommence plus tard.", "The stars veil for a moment… the secret could not be whispered. Try again later.", "Las estrellas se velan un instante… el secreto no pudo susurrarse. Inténtalo más tarde.", "तारे एक पल के लिए आवृत हो गई हैं… रहस्य फुसफुसाया नहीं जा सका। बाद में पुनः प्रयास करें।"),
      );
    } catch {
      setArtemisAdvice(tr("Les étoiles se voilent un instant… le secret n'a pas pu être chuchoté. Recommence plus tard.", "The stars veil for a moment… the secret could not be whispered. Try again later.", "Las estrellas se velan un instante… el secreto no pudo susurrarse. Inténtalo más tarde.", "तारे एक पल के लिए आवृत हो गई हैं… रहस्य फुसफुसाया नहीं जा सका। बाद में पुनः प्रयास करें।"));
    }
  }, [artemisAdvice, result, option, question, lang, dbInterpretation]);

  const showResult = phase === 'firstDone' || phase === 'refineDone';

  // Analyse approfondie DÉSORMAIS AUTOMATIQUE (bouton supprimé sur demande) :
  // à chaque nouveau résultat posé (1er tirage + affinage), une seule fois.
  const analysisAutoRef = useRef(0);
  useEffect(() => {
    if (!showResult) return;
    const epoch = ++analysisAutoRef.current;
    if (analysis !== null || analysisSections !== null || analysisLoading) return;
    const t = setTimeout(() => { if (epoch === analysisAutoRef.current) runAnalysis(); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, result.planet, result.sign, result.house, option]);

  // Recentre la vue sur l'analyse approfondie dès qu'elle tombe (repli
  // d'arène + latence LLM peuvent la laisser hors champ sinon).
  const oracleBlockRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const landed = analysisSections || analysis;
    if (!landed || analysisLoading || !showResult) return;
    const t = setTimeout(() => {
      const el = oracleBlockRef.current;
      if (!el) return;
      // -76 : le titre reste SOUS la barre de navigation.
      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 76), behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(t);
  }, [analysisSections, analysis, analysisLoading, showResult]);

  // Nouvelle analyse posée (1er tirage ou affinage) → le secret se referme
  // et se purge : il doit re-naître du NOUVEAU dé relancé, pas de l'ancien.
  useEffect(() => {
    setArtemisRevealed(false);
    setArtemisAdvice(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, analysisSections]);

  // Précharge secret-artemis.png dès que le secret est disponible (avant le
  // clic sur « Révéler ») → la carte apparaît sans attente de chargement.
  useEffect(() => {
    if (!artemisAdvice) return;
    const img = new Image();
    img.src = '/images/secret-artemis.png';
  }, [artemisAdvice]);

  // Auto-fit du texte gravé dans le parchemin (copie de la recette Odin :
  // mesure en px de LAYOUT après chargement de Cinzel, puis filet shrink-only).
  useEffect(() => {
    if (!artemisRevealed || !artemisAdvice) return;
    setArtemisFont(null);
    let cancelled = false;
    let late: number | undefined;
    const measure = () => {
      if (cancelled) return;
      const box = artemisBoxRef.current;
      const txt = artemisTextRef.current;
      if (!box || !txt) return;
      const basePx = parseFloat(getComputedStyle(txt).fontSize) || 14;
      const bh = box.clientHeight;
      if (bh <= 0) return;
      let lo = 9;
      let hi = Math.min(basePx * 1.9, 22, bh * 0.3);
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        txt.style.fontSize = mid + 'px';
        if (txt.offsetHeight <= bh - 1) lo = mid;
        else hi = mid;
      }
      const finalPx = Math.round(lo * 10) / 10;
      txt.style.fontSize = finalPx + 'px';
      setArtemisFont(finalPx + 'px');
    };
    const t = window.setTimeout(measure, 80);
    const fonts = (document as any).fonts;
    if (fonts?.load) {
      fonts
        .load('700 20px Cinzel')
        .then(() => window.setTimeout(measure, 30))
        .catch(() => {});
    }
    late = window.setTimeout(measure, 1200);
    const verify = () => {
      if (cancelled) return;
      const box = artemisBoxRef.current;
      const txt = artemisTextRef.current;
      if (!box || !txt) return;
      const bh = box.clientHeight;
      if (bh <= 0) return;
      let f = parseFloat(txt.style.fontSize) || parseFloat(getComputedStyle(txt).fontSize) || 14;
      while (f > 9 && txt.offsetHeight > bh - 1) {
        f -= 0.5;
        txt.style.fontSize = f + 'px';
      }
      setArtemisFont(f + 'px');
    };
    const v = window.setTimeout(verify, 2000);
    let lastW = window.innerWidth;
    const remeasure = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      setArtemisFont(null);
      window.setTimeout(measure, 60);
    };
    window.addEventListener('resize', remeasure);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      if (late) window.clearTimeout(late);
      window.clearTimeout(v);
      window.removeEventListener('resize', remeasure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artemisRevealed, artemisAdvice]);

  // Son de révélation — magic10.wav (clé 'artemis-reveal') : déclenché à
  // l'APPARITION EXACTE du texte du Secret d'Artémis (révélé + chuchotement
  // présent), y compris dans le chemin de repli où le texte arrive après
  // l'appel API. Refusé (gating) → jamais révélé → jamais de son.
  // Garde one-shot : un seul tintement par cycle de révélation.
  const artemisSoundDoneRef = useRef(false);
  useEffect(() => {
    if (!artemisRevealed || !artemisAdvice) return;
    if (artemisSoundDoneRef.current) return;
    artemisSoundDoneRef.current = true;
    playSound('artemis-reveal', 1);
  }, [artemisRevealed, artemisAdvice]);
  useEffect(() => {
    if (!artemisRevealed) artemisSoundDoneRef.current = false;
  }, [artemisRevealed]);


  // Amène l'utilisateur au résultat dès qu'il apparaît (après le tirage),
  // en laissant un espace en haut pour le menu (pas de scroll collé au bord).
  useEffect(() => {
    if (!showResult) return;
    // Repli de l'arène animé sur 550 ms : scroller APRÈS, sinon la position
    // mesurée est fausse (on reste dans le vide intermédiaire).
    const t = setTimeout(() => {
      const el = resultRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const OFFSET = 80; // laisse un peu d'air pour le menu en haut de l'écran
      window.scrollTo({ top: Math.max(0, top - OFFSET), behavior: 'smooth' });
    }, 620);
    return () => clearTimeout(t);
  }, [showResult]);

  // ── Fetch DB interpretation après chaque tirage réussi ──
  // Guard anti-course : un nouveau tirage (showResult change) ne doit pas être
  // écrasé par la réponse tardive du tirage précédent.
  const dbLastSeqRef = useRef(0);
  useEffect(() => {
    if (!showResult) return;
    const planetGlyph = result.planet;
    const signGlyph = result.sign;
    const houseNum = result.house;
    if (!planetGlyph || !signGlyph || !houseNum) return;

    const planet = PLANET_NAMES[planetGlyph as string];
    const sign = SIGN_NAMES[signGlyph as string];
    const house = `Maison ${houseNum}`;
    if (!planet || !sign) return;

    const seq = nextRaceSeq();
    dbLastSeqRef.current = seq;
    setDbLoading(true);
    setDbInterpretation(null);

    api('/api/astro-interpretation-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planet, sign, house }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (seq !== dbLastSeqRef.current) return; // réponse obsolète → ignorer
        if (data.found && data.interpretation) {
          setDbInterpretation(data.interpretation);
          // Ajouter DB à l'accumulateur et persister
          interpAccRef.current.dbInterpretation = data.interpretation;
          if (readingIdRef.current) {
            updateReading(readingIdRef.current, { interpretation: JSON.stringify(interpAccRef.current) });
          }
        }
      })
      .catch(() => {
        // silencieux — la DB est un bonus, pas un blocage
      })
      .finally(() => { if (seq === dbLastSeqRef.current) setDbLoading(false); });
  }, [showResult, result.planet, result.sign, result.house]);

  return (
    <><style dangerouslySetInnerHTML={{__html: `
      @keyframes glow-pulse {
              0%, 100% { text-shadow: 0 0 6px rgba(100,180,255,0.4), 0 0 16px rgba(100,180,255,0.25); }
              50%      { text-shadow: 0 0 12px rgba(100,220,255,0.9), 0 0 30px rgba(100,220,255,0.5), 0 0 50px rgba(100,220,255,0.2); }
            }
            .affinage-glow {
              color: #99d4ff;
              font-family: var(--font-cinzel), serif;
              font-size: 0.85rem;
              letter-spacing: 0.05em;
              animation: glow-pulse 2.2s ease-in-out infinite;
            }
            .bleu-ciel-glyph { color: #87CEEB !important; }
    `}} />
      <DiceBackground starry starryVariant="gold">
      <YiSlideNav />
      <DiceTitle title={t('des.affinage.title')} />

      <div className="mx-auto max-w-2xl px-4 pb-0 sm:pb-0">
        {/* Question à enregistrer — MODALE SEULE posée AVANT le gobelet : rien
            d'autre n'est visible tant qu'elle n'est pas confirmée. Le champ
            reste VIDE (pas de pré-remplissage) ; placeholder = exemple type ;
            validation impossible si < 2 mots. « Enregistrer » ferme la modale,
            révèle l'astrodice (remonté sous le titre) et le tutoriel. */}
        {phase === 'initial' && !hasLaunched && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center px-4" style={{ background: 'rgba(6,3,8,0.82)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm">
            <AskQuestion
            required
            minWords={2}
            onConfirm={(q) => {
              setQuestion(q);
              setHasLaunched(true);
            }}
            glowLabel={!question ? tr("Concentrez-vous sur votre question", "Focus on your question", "Concéntrese en su pregunta", "अपने प्रश्न पर ध्यान केंद्रित करें") : undefined}
            placeholder={tr("Ex. : Comment débloquer ma situation avec mon associé ?", "E.g.: How can I untangle my situation with my business partner?", "P. ej.: ¿Cómo desbloquear mi situación con mi socio?", "उदा.: अपने सहযোগी के साथ मेरी स्थिति कैसे सुधारें?")}
            confirmLabel={tr("Enregistrer", "Save", "Guardar", "सहेजें")}
            onLaunch={() => {
              setHasLaunched(true);
              setShowTutorial(true);
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 150);
            }}
          />
          </div>
          </div>
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

        {/* Gobelet + tutoriel superposé. L'arène se REPLIE (hauteur animée
            → 0) dès qu'un tirage est posé : sinon le gobelet fondu laisse un
            grand vide sous le titre. Elle se rouvre pour l'affinage (refineRoll). */}
        <div
          className="relative overflow-visible"
          style={{
            marginTop: 0,
            height: (hasLaunched && !showResult) ? 400 : 0,
            zIndex: 0,
            transition: 'height 550ms ease',
          }}>
          {hasLaunched && !showResult && (
          <div
            style={{
              height: 400,
              opacity: ready ? 1 : 0,
              overflow: 'hidden',
              transition: 'opacity 450ms ease',
              pointerEvents: ready ? 'auto' : 'none',
              marginTop: -1,
            }}
          >
          <AstroDiceCup
            key={resetSignal}
            targetFaces={faces}
            skin={skin}
            height={400}
            activeKinds={activeDice}
            onRest={handleRest}
            onReady={() => { setReady(true); }}
            resetSignal={resetSignal}
            launchSignal={0}
            onShake={() => setShowTutorial(false)}
            lockScroll={true}
            verticalShift={0}
            diceHop={0.18}
          />
          </div>
          )}
        </div>

        {/* Tutoriel en dessous du gobelet — DÉMONTÉ (et non plus fondu) une
            fois masqué : une opacité 0 réservait sa place → grand vide sous
            le titre après le tirage. */}
        {showTutorial && (
        <div
          ref={tutorialRef}
          className="flex flex-col items-center"
          style={{ marginTop: 24 }}
          >
            <style>{`
              @keyframes swipe-shake-affinage {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-16px); }
                75% { transform: translateX(16px); }
              }
              .swipe-icon-affinage {
                animation: swipe-shake-affinage 0.6s ease-in-out infinite;
                font-size: 28px;
                line-height: 1;
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
                fontSize: '0.5rem',
                maxWidth: 120,
                lineHeight: 1.2,
              }}
            >
              {tr("Secouez le gobelet pour mélanger les dés, puis poussez vers le haut pour les jeter", "Shake the cup to mix the dice, then swipe up to cast them", "Agite el vaso para mezclar los dados y deslice hacia arriba para lanzarlos", "गिलास को हिलाकर पाशों को मिलाएँ, फिर फेंकने के लिए ऊपर स्लाइड करें")}
            </p>
          </div>
        )}

        {/* CARTE-RÉSULTAT PROÉMINENTE + ENCART ANALYSE */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2"
            >
              {/* ENCART ANALYSE : statique immédiate + zone LLM en dessous */}
              <div
                ref={oracleBlockRef}
                className="mx-auto mt-1 max-w-2xl rounded-3xl p-5 sm:p-6"
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
                  {option ? t('des.affinage.analysisRefine') : t('des.affinage.analysisTitle')}
                </h3>

                {/* Pilule des faces (moule /choix & /obstacle-solution) : un tap
                    ouvre la modale donnant la signification exacte de chaque dé. */}
                <div className="mb-1">
                  <ClickableFaces faces={result as TargetFaces} />
                </div>

                {/* ── Comparaison visuelle pour l'affinage ── */}
                {option && originalFacesRef.current && (
                  <div className="mt-4">
                    {/* Ligne de comparaison */}
                    <div
                      className="flex items-center justify-center gap-3 rounded-2xl p-3 text-center"
                      style={{
                        background: `linear-gradient(135deg, ${DICE_THEME.gold}18 0%, ${DICE_THEME.ocre}14 100%)`,
                        border: `1px solid ${DICE_THEME.gold}44`,
                      }}
                    >
                      {option === 'action' ? (
                        <>
                          <div>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.5 }}>Signe</p>
                            <p className="text-lg" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.glyph, opacity: 0.5 }}>
                              {originalFacesRef.current.sign}
                            </p>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.4 }}>
                              {SIGN_NAMES[originalFacesRef.current.sign as string] || ''}
                            </p>
                          </div>
                          <span className="text-2xl" style={{ color: DICE_THEME.gold }}>→</span>
                          <div>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold, opacity: 0.8 }}>Signe</p>
                            <p className="text-lg" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}>
                              {result.sign}
                            </p>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold, opacity: 0.7 }}>
                              {SIGN_NAMES[result.sign as string] || ''}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.5 }}>Maison</p>
                            <p className="text-lg" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.glyph, opacity: 0.5 }}>
                              {originalFacesRef.current.house}
                            </p>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.4 }}>
                              Maison {originalFacesRef.current.house}
                            </p>
                          </div>
                          <span className="text-2xl" style={{ color: DICE_THEME.gold }}>→</span>
                          <div>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold, opacity: 0.8 }}>Maison</p>
                            <p className="text-lg" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}>
                              {result.house}
                            </p>
                            <p className="text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.gold, opacity: 0.7 }}>
                              Maison {result.house}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Phrase poétique */}
                    <p
                      className="mt-3 text-center text-xs italic"
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                        color: DICE_THEME.gold,
                        opacity: 0.65,
                        lineHeight: 1.4,
                      }}
                    >
                      Le fond du problème ne change pas,<br />
                      c&rsquo;est la sensibilité du microscope qui s&rsquo;ajuste.
                    </p>
                  </div>
                )}

                {/* Zone LLM — chargement puis texte généré */}
                <div className="mt-5 border-t pt-4" style={{ borderColor: `${DICE_THEME.gold}33` }}>
                  {analysisLoading && (
                    <AnalysisWaitCard
                      accent={DICE_THEME.gold}
                      title={t('des.affinage.thinking')}
                      videoPrefix="analyse-des-zodiaque"
                    />
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
                            {tr("Synthèse", "Synthesis", "Síntesis", "संक्षेप")}
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

                  {/* Bouton de relance si erreur */}
                  {analysisErrored && !analysisLoading && (
                    <div className="mt-4 text-center">
                      <DiceButton variant="ocre" onClick={runAnalysis}>
                        🔄 Relancer l&rsquo;analyse
                      </DiceButton>
                    </div>
                  )}



                  {/* ── Le secret d'Artémis — réservé à la FIN de la 2ᵉ phase :
                      le chuchotement ARRIVE AVEC l'analyse d'affinage (même
                      appel IA, payload withArtemis) — le bouton ne fait que le
                      RÉVÉLER, instantanément. Encart spécial (moule Conseil
                      d'Odin), fond lunaire provisoire — remplacer par l'image
                      user (TODO background). */}
                  {phase === 'refineDone' && !analysisLoading && (analysisSections || analysis) && !!originalFacesRef.current && (() => {
                    if (!artemisRevealed) {
                      return (
                        <div className="mt-6 text-center">
                          <button
                            type="button"
                            onClick={revealArtemis}
                            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.03] hover:brightness-110 active:scale-95"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a',
                              color: '#fff',
                              fontFamily: 'var(--font-cinzel), serif',
                              boxShadow:
                                '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)',
                            }}
                          >
                            <span aria-hidden className="text-base leading-none">☾</span>
                            {t('des.affinage.artemis.reveal')}
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className="mx-auto mt-6" style={{ maxWidth: 560 }}>
                        <p
                          className="mb-3 flex items-center justify-center gap-2 text-base font-bold uppercase tracking-[0.14em]"
                          style={{
                            fontFamily: 'var(--font-cinzel-deco), serif',
                            backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #DCE6F5 45%, #9FB4E8 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                            filter:
                              'drop-shadow(0 2px 3px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(200,215,255,0.45))',
                          }}
                        >
                          <span aria-hidden style={{ color: '#DCE6F5', WebkitTextFillColor: '#DCE6F5' }}>✦</span>
                          {t('des.affinage.artemis.title')}
                          <span aria-hidden style={{ color: '#DCE6F5', WebkitTextFillColor: '#DCE6F5' }}>✦</span>
                        </p>
                        {/* Le parchemin secret-artemis.png — RÉCEPTACLE du texte
                            (même mécanique que conseil-odin.png pour le Conseil
                            d'Odin) : cadre image, message gravé dans la zone
                            centrale claire, police auto-ajustée. */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.78, y: 20, filter: 'blur(8px)' }}
                          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                          transition={{ type: 'spring', damping: 15, stiffness: 150, mass: 0.9 }}
                          className="relative mx-auto overflow-hidden rounded-xl"
                          style={{
                            width: 'min(80%, 360px)',
                            aspectRatio: '250 / 318',
                            backgroundImage: "url('/images/secret-artemis.png')",
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            boxShadow: '0 14px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.35)',
                          }}
                        >
                          {/* Reflet lumineux qui balaie le parchemin */}
                          <motion.div
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 w-1/2"
                            style={{
                              background:
                                'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.08) 60%, transparent 100%)',
                              left: '-60%',
                            }}
                            initial={{ left: '-60%' }}
                            animate={{ left: '110%' }}
                            transition={{ delay: 0.35, duration: 0.95, ease: 'easeInOut' }}
                          />
                          {/* Lueur lunaire pulsante dans la zone claire */}
                          <motion.div
                            aria-hidden
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background:
                                'radial-gradient(circle at 50% 45%, rgba(214,228,255,0.55), transparent 70%)',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.5, 0.15, 0.35, 0.15] }}
                            transition={{ delay: 0.5, duration: 1.6, times: [0, 0.3, 0.55, 0.8, 1] }}
                          />
                          {/* Zone texte : calée DANS la partie claire du parchemin
                              (mesurée sur l'image : ~20–78% en hauteur, 15–85% en
                              largeur). Attend le texte réel : jamais le libellé
                              de chargement dans le cadre (sinon l'auto-fit
                              dimensionnerait la carte pour un faux texte). */}
                          <div
                            ref={artemisBoxRef}
                            className="absolute flex flex-col items-center justify-center"
                            style={{ top: '20%', bottom: '22%', left: '16%', right: '16%' }}
                          >
                            {artemisAdvice ? (
                              <motion.p
                                ref={artemisTextRef}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55, duration: 0.55 }}
                                className="text-center font-bold italic leading-snug"
                                style={{
                                  fontFamily: 'var(--font-cinzel), serif',
                                  fontSize: artemisFont || '12px',
                                  color: '#2E2A4A', // indigo nuit, gravé sur le vélin
                                  textShadow:
                                    '0 -1px 0 rgba(20,16,48,0.4), 0 1px 0 rgba(255,252,240,0.9), 0 2px 4px rgba(46,42,74,0.18)',
                                }}
                              >
                                {artemisAdvice}
                              </motion.p>
                            ) : (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center text-sm italic"
                                style={{ fontFamily: 'var(--font-cinzel), serif', color: '#2E2A4A' }}
                              >
                                {t('des.affinage.artemis.whispering')}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    );
                  })()}

                  {/* ✶ L'Écho scellé — prémonction datée née de cette lecture.
                      Proposée UNIQUEMENT quand l'affinage est terminé (option
                      choisie + analyse posée) : avant, la lecture va encore
                      évoluer (zoom A/B), sceller trop tôt figerait un brouillon. */}
                  {readingId && phase === 'refineDone' && !analysisLoading && (analysis || analysisSynthese) && (
                    <EchoBox
                      domain="des"
                      readingId={readingId}
                      question={question}
                      summary={(analysisSynthese || analysis || '').slice(0, 1200)}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Après le 1er tirage : proposer les deux options d'affinage — mais
            UNIQUEMENT une fois l'analyse IA du tirage initial ENTIÈREMENT
            affichée (chargement LLM terminé + sections/synthèse posées) :
            avant, les boutons seraient prématurés. */}
        <AnimatePresence>
          {phase === 'firstDone' && !analysisLoading && !!(analysisSections || analysis) && (
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { opt: 'action' as const, glyph: '♌', title: t('des.affinage.cardA.title'), desc: t('des.affinage.cardA.desc'), chip: t('des.affinage.cardA.chip'), accent: '#D4AF37' },
                  { opt: 'domaine' as const, glyph: '⌂', title: t('des.affinage.cardB.title'), desc: t('des.affinage.cardB.desc'), chip: t('des.affinage.cardB.chip'), accent: '#8FB8FF' },
                ].map((c) => (
                  <motion.button
                    key={c.opt}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ y: -3 }}
                    onClick={() => refine(c.opt)}
                    className="group relative overflow-hidden rounded-3xl p-5 text-left transition-all"
                    style={{
                      background: `linear-gradient(145deg, ${DICE_THEME.ocre}1f 0%, ${DICE_THEME.brickDark} 90%)`,
                      border: `1.5px solid ${c.accent}55`,
                      boxShadow: `inset 0 0 26px ${DICE_THEME.ocre}10, 0 10px 24px rgba(0,0,0,0.35)`,
                    }}
                  >
                    {/* Glyphe filigrane (coin haut-droit) */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-3 -top-7 select-none text-[6.5rem] leading-none opacity-[0.08] transition-opacity group-hover:opacity-[0.16]"
                      style={{ color: c.accent }}
                    >
                      {c.glyph}
                    </span>
                    <span className="relative flex items-center gap-2.5">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl"
                        style={{
                          background: `${c.accent}1f`,
                          border: `1px solid ${c.accent}66`,
                          color: c.accent,
                          textShadow: `0 0 10px ${c.accent}66`,
                        }}
                      >
                        {c.glyph}
                      </span>
                      <span
                        className="text-base font-bold uppercase tracking-wider"
                        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight }}
                      >
                        {c.title}
                      </span>
                    </span>
                    <span
                      className="relative mt-3 block text-sm leading-snug"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.85 }}
                    >
                      {c.desc}
                    </span>
                    <span
                      className="relative mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] uppercase tracking-widest"
                      style={{ background: `${c.accent}14`, border: `1px solid ${c.accent}44`, color: c.accent }}
                    >
                      ⟳ {c.chip}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Après l'affinage : plus rien d'additionnel — l'encart « Le zoom
            d'action/domaine » et le bouton « Recommencer un tirage » ont été
            supprimés (inutiles : l'analyse d'affinage suffit, et un nouveau
            tirage se reprend depuis le hub). */}
      </div>
    </DiceBackground>
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=swipe"
      /></>
  );
}

export default function GatedPage() {
  return <AuthGate><AffinagePage /></AuthGate>;
}
