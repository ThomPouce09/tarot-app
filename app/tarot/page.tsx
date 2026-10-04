'use client';

import { useLang, pick4, tr } from '@/lib/i18n';
import Firefly from '@/components/firefly';
import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import YiSlideNav from '@/components/yi-slide-nav';
import FirstVisitHints from '@/components/first-visit-hints';
import { installSoundUnlock, playSound, stopSound } from '@/lib/sounds';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import GatedTile from '@/components/gated-tile';
import { useRequireVerified, VerifiedGate } from '@/components/verified-gate';
import { TutorialModal, type TutorialSlide } from './tutorial-modal';
// Liste AUTO-GÉNÉRÉE au build/dev (scripts/gen-backdrops.cjs lit
// public/backgrounds/tarot-bg*.jpg|.mp4) : déposer un nouveau fichier
// numéroté suffit, aucune édition de code.
import tarotBackdrops from '@/lib/generated/backdrops-tarot.json';

// Poster noir inline : neutralise le triangle par défaut de la WebView Android
// avant décodage de la vidéo (même correctif que les autres fonds du projet).
const BLACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='black'/%3E%3C/svg%3E";

// Fonds d'écran aléatoires du hub /tarot — liste auto-générée ci-dessus
// (fallback statique si la génération n'a pas tourné).
const TAROT_BACKDROPS: string[] = (tarotBackdrops as string[]).length
  ? (tarotBackdrops as string[])
  : ['/backgrounds/tarot-bg.jpg', '/backgrounds/tarot-bg1.jpg', '/backgrounds/tarot-bg2.jpg'];

// Un fond de la liste (images + vidéos) est tiré au hasard à chaque ouverture
// de la page (tirage côté client → aucun mismatch d'hydratation), comme
// /runes, /des-divinatoires et /yi-jing, sous un voile sombre pour la lisibilité.
function TarotRandomBackdrop() {
  const [src, setSrc] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    setVideoReady(false);
    setSrc(TAROT_BACKDROPS[Math.floor(Math.random() * TAROT_BACKDROPS.length)]);
  }, []);
  if (!src) return null;
  const isVideo = /\.(mp4|webm|ogg)$/i.test(src);
  return (
    <>
      {/* Une vidéo en z négatif passerait derrière le fond opaque du body
          (noir) → conteneur dédié en z-0. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {isVideo ? (
          <video
            key={src}
            src={src}
            autoPlay muted loop playsInline preload="auto"
            poster={BLACK_POSTER}
            onCanPlay={() => setVideoReady(true)}
            onPlaying={() => setVideoReady(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <motion.img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            style={{ objectPosition: 'center 30%' }}
          />
        )}
      </div>
      {/* Voile : garde le titre et les tuiles parfaitement lisibles */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(218,165,32,0.05) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)',
        }}
      />
    </>
  );
}

// ── Tutoriel par tirage (réplique du pattern /des-divinatoires & /runes) ────
// Chaque slide correspond à une tuile (même ordre).
const TAROT_TUTORIALS: TutorialSlide[] = [
  {
    iconImg: '/images/tirage-3-cartes.png',
    title: '3 Cartes Simplifié',
    titleEn: '3 Cards Simplified',
titleEs: "3 Cartas Simple", titleHi: "3 पत्ते सरल",
    desc: 'Notre tirage de base : choisissez votre arcane-guide et une intention, les cartes répondent en Passé, Présent et Avenir.',
    descEn: 'Our base reading: choose your guide-arcana and an intention, the cards answer in Past, Present and Future.',
descEs: "Nuestra tirada base: elija su arcano guía y una intención, las cartas responden en Pasado, Presente y Futuro.", descHi: "हमारी आधार-विन्यास: अपना आर्काना-मार्गदर्शक और एक संकल्प चुनिए, पत्ते अतीत, वर्तमान और भविष्य में उत्तर देते हैं।",
    steps: [
      'Choisissez votre arcane-guide',
      'Sélectionnez votre intention',
      'Tirez 3 cartes et lisez leur message',
    ],
    stepsEn: [
      'Pick your guide-arcana',
      'Select your intention',
      'Draw 3 cards and read their message',
    ],
stepsEs: ["Elija su arcano guía", "Seleccione su intención", "Tire 3 cartas y lea su mensaje"],
stepsHi: ["अपना अर्काना-मार्गदर्शक चुनें", "अपना संकल्प चुनें", "3 पत्ते निकालें और उनका संदेश पढ़ें"],
  },
  {
    iconImg: '/images/tirage-3-cartes.png',
    title: '3 Cartes · Précis',
    titleEn: '3 Cards · Precise',
titleEs: "3 Cartas · Preciso", titleHi: "3 पत्ते · संक्षिप्त",
    desc: 'Un tirage rapide et clair pour obtenir une réponse directe à votre question.',
    descEn: 'A quick, clear reading for a direct answer to your question.',
descEs: "Una tirada rápida y clara para obtener una respuesta directa a su pregunta.", descHi: "एक तेज़ और स्पष्ट वाचन, आपके प्रश्न का सीधा उत्तर पाने के लिए।",
    steps: [
      'Formulez votre question',
      'Mélangez et coupez le jeu',
      'Tirez 3 cartes et lisez leur message',
    ],
    stepsEn: [
      'Ask your question',
      'Shuffle and cut the deck',
      'Draw 3 cards and read their message',
    ],
stepsEs: ["Formule su pregunta", "Baraje y corte el mazo", "Tire 3 cartas y lea su mensaje"],
stepsHi: ["अपने प्रश्न को शब्द दें", "गड्डी फेंटें और काटें", "3 पत्ते निकालें और उनका संदेश पढ़ें"],
  },
  {
    iconImg: '/images/roue-semaine.svg',
    title: 'Les Arcanes de la Semaine',
    titleEn: 'Arcana of the Week',
titleEs: "Los Arcanos de la Semana", titleHi: "सप्ताह के आर्काना",
    desc: 'Sept arcanes majeurs, un par jour : votre semaine se déplie jour après jour, puis le fil rouge se scelle en augure.',
    descEn: 'Seven major arcana, one per day: your week unfolds day by day, then the red thread seals as an augury.',
descEs: "Siete arcanos mayores, uno por día: su semana se despliega día tras día, y luego el hilo rojo se sella en augurio.", descHi: "सात बृहत् अर्काना, एक-एक दिन: आपका सप्ताह दिन-प्रतिदिन खुलता है, फिर लाल धागा शुभसूचन बनकर मुद्रित हो जाता है।",
    steps: [
      'Posez la roue (un seul geste, deux grands tirages)',
      'Chaque jour, ouvrez la carte qui luit — les jours passés se révèlent seuls',
      'À la fin de la semaine, tissez le fil rouge et scellez-le en augure',
      'Notez votre semaine en pourcentage — la Ferveur s’en souvient',
    ],
    stepsEn: [
      'Cast the wheel (one gesture, two advanced readings)',
      'Each day, open the glowing card — past days reveal themselves',
      'At week’s end, weave the red thread and seal it as an augury',
      'Score your week in percent — the Fervor remembers',
    ],
stepsEs: ["Despliegue la rueda (un solo gesto, dos grandes tiradas)", "Cada día, abra la carta que brilla — los días pasados se revelan solos", "Al final de la semana, teja el hilo rojo y séllelo en augurio", "Puntúe su semana en porcentaje — el Fervor lo recuerda"],
stepsHi: ["चक्र बिछाइए (एक ही क्रिया, दो बड़े वाचन)", "हर दिन वह पत्ता खोलें जो चमकता है — बीते दिन स्वयं प्रकट हो जाते हैं", "सप्ताह के अंत में लाल धागा बुनें और उसे शुभसूचन में मुद्रित करें", "अपने सप्ताह को प्रतिशत में अंकित करें — उत्ताप इसे याद रखता है"],
  },
  {
    iconImg: '/images/5 cartes manuelles.png',
    title: '5 cartes manuelles',
    titleEn: 'Manual 5-Card Reading',
titleEs: "5 cartas manuales", titleHi: "5 पत्ते, हाथ से चुने",
    desc: "Choisissez vous-même vos 5 cartes dans le jeu pour une lecture personnalisée.",
    descEn: 'Pick your own 5 cards from the deck for a personal reading.',
descEs: "Elija usted mismo sus 5 cartas del mazo para una lectura personalizada.", descHi: "व्यक्तिगत वाचन के लिए गड्डी में से अपने 5 पत्ते स्वयं चुनें।",
    steps: [
      'Parcourez le jeu',
      'Sélectionnez vos 5 cartes',
      'Lisez l’interprétation combinée',
    ],
    stepsEn: [
      'Browse the deck',
      'Select your 5 cards',
      'Read the combined interpretation',
    ],
stepsEs: ["Recorra el mazo", "Seleccione sus 5 cartas", "Lea la interpretación combinada"],
stepsHi: ["गड्डी का अवलोकन करें", "अपने 5 पत्ते चुनें", "संयुक्त व्याख्या पढ़ें"],
  },
];

export default function TarotHubPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeSlide, setActiveSlide] = useState<TutorialSlide | null>(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const t = useT();
  const lang = useLang();
  const { tiles, loadTiles, gateReason, closeGate, openGate } = useEntitlement();
  const auth = useRequireVerified();

  useEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (user) setIsLoggedIn(true);
    if (typeof window !== 'undefined') {
      setFirstVisit(!localStorage.getItem('tarot_tuto_seen'));
    }
  }, []);

  // Charge la dispo de tous les tirages (grisage des tuiles épuisées).
  useEffect(() => { loadTiles(); }, [loadTiles]);

  const openTutorial = (i: number) => {
    setActiveSlide(TAROT_TUTORIALS[i]);
    if (typeof window !== 'undefined') localStorage.setItem('tarot_tuto_seen', '1');
    setFirstVisit(false);
  };

  // Jingle d'ouverture : même pattern que /des-divinatoires et /runes
  // (user activation héritée de la navigation par lien ; installSoundUnlock
  // couvre l'accès direct). Coupé dès que l'utilisateur quitte la page
  // (navigation, onglet fermé, arrière-plan) via stopSound().
  useEffect(() => {
    installSoundUnlock();
    const t = window.setTimeout(() => playSound('tarot2', 0.75), 150);
    const onVisibility = () => {
      if (document.hidden) stopSound('tarot2');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
      stopSound('tarot2');
    };
  }, []);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLoginPrompt(true);
    setTimeout(() => setShowLoginPrompt(false), 3000);
  };

  if (auth !== 'ok') return <VerifiedGate state={auth} />;
  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      {/* BACKGROUND — un fond de la liste auto-générée (images + vidéos) est
          tiré au hasard à chaque ouverture de la page, comme /runes,
          /des-divinatoires et /yi-jing, sous un voile sombre pour la lisibilité. */}
      <TarotRandomBackdrop />

      {/* Menu parchemin (remplace la croix) */}
      <YiSlideNav />
      <FirstVisitHints flagKey="hints_tarot" hints={[{ selector: '[data-nav-menu]', textKey: 'hint.hubMenu' }, { selector: '[data-info-i]', textKey: 'hint.hubInfo' }]} />

      {/* Titre */}
      <div
        className="absolute top-[6%] left-1/2 -translate-x-1/2 z-30 text-center px-4 pointer-events-none"
      >
        <h1
          className="title-glow px-4 text-3xl sm:text-5xl md:text-6xl tracking-wide uppercase mb-3"
          style={{
            fontFamily: "var(--font-cinzel-deco), serif",
            color: "#DAA520",
            letterSpacing: "0.18em",
            textShadow:
              "0 0 40px rgba(218,165,32,0.7), 0 0 80px rgba(218,165,32,0.4)",
          }}
        >
          {tr("Le Tarot", "The Tarot", "El Tarot", "तारोट")}
        </h1>
        <p
          className="text-sm sm:text-base md:text-lg font-medium italic"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "#FFD700",
            textShadow:
              "0 0 10px rgba(255,215,0,0.6), 0 1px 4px rgba(0,0,0,0.9)",
            letterSpacing: "0.05em",
          }}
        >
          {t('hubs.tarot.subtitle')}
        </p>
      </div>

      {/* TUILES : grille 2 colonnes sur mobile */}
      <div
        className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 grid grid-cols-[128px_128px] sm:grid-cols-[144px_144px] md:grid-cols-[160px_160px] lg:grid-cols-[176px_176px] gap-x-5 gap-y-6 justify-items-center px-4"
      >
        {/* TUILE — 3 CARTES SIMPLIFIÉ (tirage de base, accessible Apprenti) */}
        <GatedTile href="/tarot-3-cartes-simplifie" allowed={tiles?.['tarot-3-cartes-simplifie']?.allowed} reason={tiles?.['tarot-3-cartes-simplifie']?.reason} onBlocked={openGate}>
          <motion.div
            className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 16px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(218,165,32,0.3)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative w-full h-full p-2 flex flex-col items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #5a4420 0%, #34240c 50%, #5a4420 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-amber-500/25 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(0); }}
                  aria-label={ pick4('Comment fonctionne ce tirage', 'How this reading works', "Cómo funciona esta tirada", "यह विन्यास कैसे काम करता है")(lang) }
                  title={t('hubs.tarot.tile3s')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[tarotGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(218,165,32,0.10)', border: '1px solid rgba(218,165,32,0.33)',
                    color: '#FFD700', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(218,165,32,0.4), 0 0 0 4px rgba(218,165,32,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
                <img src="/images/tirage-3-cartes.png" alt="3 Cartes Simplifié" className="w-16 h-auto mb-1 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))" }} />
              <h2
                className="text-sm font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#FFD700",
                  textShadow: "0 0 8px rgba(255,215,0,0.4)",
                }}
              >
                {t('hubs.tarot.tile3s')}
              </h2>
              <p
                className="text-[9px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(255,215,0,0.7)",
                }}
              >
                {t('hubs.tarot.tile3ssub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(218,165,32,0.18) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </GatedTile>

        {/* TUILE — 3 CARTES · PRÉCIS (question libre → avancé) */}
        <GatedTile href="/tarot-3-cartes" allowed={tiles?.['tarot-3-cartes']?.allowed} reason={tiles?.['tarot-3-cartes']?.reason} onBlocked={openGate}>
          <motion.div
            className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 16px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(218,165,32,0.3)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative w-full h-full p-2 flex flex-col items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #5a4420 0%, #34240c 50%, #5a4420 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-amber-500/25 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(1); }}
                  aria-label={ pick4('Comment fonctionne ce tirage', 'How this reading works', "Cómo funciona esta tirada", "यह विन्यास कैसे काम करता है")(lang) }
                  title={t('hubs.tarot.tile3')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[tarotGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(218,165,32,0.10)', border: '1px solid rgba(218,165,32,0.33)',
                    color: '#FFD700', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(218,165,32,0.4), 0 0 0 4px rgba(218,165,32,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
                <img src="/images/tirage-3-cartes.png" alt="3 Cartes Précis" className="w-16 h-auto mb-1 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))" }} />
              <h2
                className="text-sm font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#FFD700",
                  textShadow: "0 0 8px rgba(255,215,0,0.4)",
                }}
              >
                {t('hubs.tarot.tile3')}
              </h2>
              <p
                className="text-[9px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(255,215,0,0.75)",
                }}
              >
                {t('hubs.tarot.tile3sub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(218,165,32,0.22) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </GatedTile>

        {/* TUILE — 5 CARTES (CROIX) */}
        <GatedTile href="/tarot-semaine" allowed={tiles?.['tarot-semaine']?.allowed} reason={tiles?.['tarot-semaine']?.reason} onBlocked={openGate}>
          <motion.div
            className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 18px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(218,165,32,0.3)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative w-full h-full p-2 flex flex-col items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #4a2c1a 0%, #2a1408 50%, #4a2c1a 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-amber-400/30 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(2); }}
                  aria-label={ pick4('Comment fonctionne ce tirage', 'How this reading works', "Cómo funciona esta tirada", "यह विन्यास कैसे काम करता है")(lang) }
                  title={t('hubs.tarot.tile5')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[tarotGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(218,165,32,0.10)', border: '1px solid rgba(218,165,32,0.33)',
                    color: '#FFD700', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(218,165,32,0.4), 0 0 0 4px rgba(218,165,32,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              <img src="/images/roue-semaine.svg" alt="Roue des sept arcanes" className="w-16 h-16 mb-1 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))" }} />
              <h2
                className="text-sm font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#FFD700",
                  textShadow: "0 0 8px rgba(255,215,0,0.45)",
                }}
              >
                {t('hubs.tarot.tile5')}
              </h2>
              <p
                className="text-[9px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(255,215,0,0.75)",
                }}
              >
                {t('hubs.tarot.tile5sub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(218,165,32,0.22) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </GatedTile>

        {/* TUILE — 5 CARTES MANUEL - centré sur 2 colonnes (Bloqué si non connecté) */}
        {isLoggedIn ? (
          <GatedTile href="/tarot-5-c-manuelle" allowed={tiles?.['tarot-5-c-manuelle']?.allowed} reason={tiles?.['tarot-5-c-manuelle']?.reason} onBlocked={openGate}>
            <motion.div
              className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
              style={{
                boxShadow:
                  "0 0 18px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5)",
                border: "2px solid rgba(251,191,36,0.3)",
              }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="relative w-full h-full p-2 flex flex-col items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #321a0c 0%, #180a04 50%, #321a0c 100%)",
                }}
              >
                <div className="absolute inset-1.5 border border-amber-500/30 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(3); }}
                  aria-label={ pick4('Comment fonctionne ce tirage', 'How this reading works', "Cómo funciona esta tirada", "यह विन्यास कैसे काम करता है")(lang) }
                  title={t('hubs.tarot.tileMan')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[tarotGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(218,165,32,0.10)', border: '1px solid rgba(218,165,32,0.33)',
                    color: '#FFD700', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(218,165,32,0.4), 0 0 0 4px rgba(218,165,32,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
                <img src="/images/5 cartes manuelles.png" alt="5 cartes manuelles" className="w-16 h-auto mb-1 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))" }} />
                <h2
                  className="text-sm font-bold text-center leading-tight mb-1"
                  style={{
                    fontFamily: "var(--font-cinzel-deco), serif",
                    color: "#FFD700",
                    textShadow: "0 0 8px rgba(255,215,0,0.45)",
                  }}
                >
                  {t('hubs.tarot.tileMan')}
                  </h2>
                <p
                  className="text-[9px] text-center leading-tight"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    color: "rgba(255,215,0,0.75)",
                  }}
                >
                  {t('hubs.tarot.tileMansub')}
                </p>
              </div>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(218,165,32,0.22) 0%, transparent 70%)",
                }}
              />
            </motion.div>
          </GatedTile>
        ) : (
          <div className="block opacity-50 cursor-not-allowed" onClick={handleLockedClick}>
            <motion.div
              className="group relative w-32 sm:w-36 md:w-40 lg:w-44 aspect-[2/3] rounded-xl overflow-hidden"
              style={{
                boxShadow:
                  "0 0 18px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5)",
                border: "2px solid rgba(251,191,36,0.2)",
              }}
            >
              <div
                className="relative w-full h-full p-2 flex flex-col items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, #321a0c 0%, #180a04 50%, #321a0c 100%)",
                }}
              >
                <div className="absolute inset-1.5 border border-amber-600/25 rounded-lg pointer-events-none" />
                <img src="/images/5 cartes manuelles.png" alt="5 cartes manuelles" className="w-16 h-auto mb-1 object-contain opacity-50" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))" }} />
                <h2
                  className="text-sm font-bold text-center leading-tight mb-1 opacity-50"
                  style={{
                    fontFamily: "var(--font-cinzel-deco), serif",
                    color: "#FFD700",
                    textShadow: "0 0 8px rgba(255,215,0,0.45)",
                  }}
                >
                  {t('hubs.tarot.tileMan')}
                  </h2>
                <p
                  className="text-[9px] text-center leading-tight"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    color: "rgba(255,215,0,0.75)",
                  }}
                >
                  {t('hubs.loginRequired')}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Login prompt message */}
      {showLoginPrompt && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-purple-900/90 border border-purple-500 rounded-lg px-4 py-2">
          <p className="text-purple-300 text-sm font-medium">{t('hubs.loginPrompt')}</p>
        </div>
      )}

      {/* Footer text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
        <p
          className="text-xs italic"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "rgba(255,215,0,0.45)",
            letterSpacing: "0.05em",
          }}
        >
          {t('hubs.tarot.footer')}
        </p>
      </div>
    <TutorialModal open={activeSlide !== null} onClose={() => setActiveSlide(null)} slide={activeSlide} />
    <EntitlementGateModal reason={gateReason} onClose={closeGate} />
    <Firefly page="tarot" />
    </div>
  );
}