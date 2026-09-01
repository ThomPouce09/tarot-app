'use client';

import { useLang } from '@/lib/i18n';
import Firefly from '@/components/firefly';
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import YiSlideNav from '@/components/yi-slide-nav';
import { installSoundUnlock, playSound, stopSound } from '@/lib/sounds';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import GatedTile from '@/components/gated-tile';
import { useRequireVerified, VerifiedGate } from '@/components/verified-gate';
import { TutorialModal, type TutorialSlide } from './tutorial-modal';

// ── Tutoriel par tirage (réplique du pattern /des-divinatoires & /runes) ────
// Chaque slide correspond à une tuile (même ordre).
const TAROT_TUTORIALS: TutorialSlide[] = [
  {
    iconImg: '/images/tirage-3-cartes.png',
    title: 'Tirage de 3 cartes',
    titleEn: '3-Card Reading',
    desc: 'Un tirage rapide et clair pour obtenir une réponse directe à votre question.',
    descEn: 'A quick, clear reading for a direct answer to your question.',
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
  },
  {
    iconImg: '/images/croix-5-cartes.png',
    title: 'La Croix de 5 cartes',
    titleEn: 'The 5-Card Cross',
    desc: 'Une lecture structurée en croix pour explorer situation, épreuve, passé et avenir.',
    descEn: 'A structured cross reading exploring situation, challenge, past and future.',
    steps: [
      'Formulez votre question',
      'Disposez les 5 cartes en croix',
      'Lisez chaque position pour la synthèse',
    ],
    stepsEn: [
      'Ask your question',
      'Lay out the 5 cards in a cross',
      'Read each position for the synthesis',
    ],
  },
  {
    iconImg: '/images/5 cartes manuelles.png',
    title: '5 cartes manuelles',
    titleEn: 'Manual 5-Card Reading',
    desc: "Choisissez vous-même vos 5 cartes dans le jeu pour une lecture personnalisée.",
    descEn: 'Pick your own 5 cards from the deck for a personal reading.',
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
      {/* BACKGROUND: même image que la landing */}
      <Image
        src="/backgrounds/landing-bg.jpg"
        alt="background mystique"
        fill
        priority
        style={{ objectFit: "cover" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(218,165,32,0.05) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Menu parchemin (remplace la croix) */}
      <YiSlideNav />

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
          Le Tarot
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
        {/* TUILE — 3 CARTES */}
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(0); }}
                  aria-label={ lang === 'en' ? 'How this reading works' : 'Comment fonctionne ce tirage' }
                  title={t('hubs.tarot.tile3')}
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
                <img src="/images/tirage-3-cartes.png" alt="Tirage 3 cartes" className="w-16 h-auto mb-1 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))" }} />
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
                  color: "rgba(255,215,0,0.7)",
                }}
              >
                {t('hubs.tarot.tile3sub')}
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

        {/* TUILE — 5 CARTES (CROIX) */}
        <GatedTile href="/tarot-5-cartes" allowed={tiles?.['tarot-5-cartes']?.allowed} reason={tiles?.['tarot-5-cartes']?.reason} onBlocked={openGate}>
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(1); }}
                  aria-label={ lang === 'en' ? 'How this reading works' : 'Comment fonctionne ce tirage' }
                  title={t('hubs.tarot.tile5')}
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
              <img src="/images/croix-5-cartes.png" alt="5 cartes en croix" className="w-16 h-auto mb-1 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.5))" }} />
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(2); }}
                  aria-label={ lang === 'en' ? 'How this reading works' : 'Comment fonctionne ce tirage' }
                  title={t('hubs.tarot.tileMan')}
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