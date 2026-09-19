'use client';

import { useLang } from '@/lib/i18n';
import Firefly from '@/components/firefly';
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { useUniverseBackground } from '@/lib/use-universe-background';
import UniverseBgPicker from '@/components/universe-bg-picker';
import { YI_JING_BACKGROUND_POOLS } from '@/lib/backgrounds';
import YiSlideNav from '@/components/yi-slide-nav';
import SpeakerToggle from '@/components/speaker-toggle';
import FirstVisitHints from '@/components/first-visit-hints';
import { installSoundUnlock, playSound, stopSound } from '@/lib/sounds';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import GatedTile from '@/components/gated-tile';
import { useRequireVerified, VerifiedGate } from '@/components/verified-gate';
import { TutorialModal, type TutorialSlide } from './tutorial-modal';

// ── Tutoriel par tirage (réplique du pattern /des-divinatoires & /runes) ────
const YI_TUTORIALS: TutorialSlide[] = [
  {
    iconImg: '/images/yi-jing-icon.png',
    title: 'Le Double Hexagramme',
    titleEn: 'The Double Hexagram',
    desc: 'Le rituel des trois pièces (zhi gua) : six jets construisent ton hexagramme ; les lignes mutantes se retournent sous tes yeux et le présent enfante son futur.',
    descEn: 'The three-coin ritual (zhi gua): six casts build your hexagram; the moving lines flip before your eyes and the present gives birth to its future.',
    steps: [
      'Saisis les trois pièces d’un geste : brasse-les dans le bol, puis jette-les six fois vers le haut',
      'Les lignes mutantes ondulent en rouge puis se retournent — le second hexagramme naît en face du premier',
      'L’oracle lit la paire et annonce une échéance ; scelle l’augure et reviens juger le retournement',
    ],
    stepsEn: [
      'Take the three coins: rattle them in the bowl, then cast them upward — six times',
      'The moving lines ripple red, then flip — the second hexagram is born opposite the first',
      'The oracle reads the pair and names a date; seal the augury and come back to judge the turn',
    ],
  },
  {
    iconImg: '/images/yi-jing-icon.png',
    title: 'Yi Jing simplifié',
    titleEn: 'Simplified I Ching',
    desc: 'Le tirage des baguettes d\u2019achill\u00e9e : choisissez un domaine et une intention, puis secouez la boîte.',
    descEn: 'The yarrow stalk draw: choose a domain and an intention, then shake the box.',
    steps: [
      'Choisissez votre domaine',
      'Pr\u00e9cisez votre intention',
      'Tirez la baguette \u00e9lue',
    ],
    stepsEn: [
      'Pick your domain',
      'Set your intention',
      'Draw the chosen stalk',
    ],
  },
  {
    iconImg: '/images/yi-jing-simple.png',
    title: 'Yi Jing précis',
    titleEn: 'Precise I Ching',
    desc: 'Un tirage rapide pour obtenir une réponse claire en un seul hexagramme.',
    descEn: 'A quick reading for a clear answer from a single hexagram.',
    steps: [
      'Formulez votre question',
      'Tirez un hexagramme',
      'Lisez son message',
    ],
    stepsEn: [
      'Ask your question',
      'Draw one hexagram',
      'Read its message',
    ],
  },
  {
    iconImg: '/images/yi-jing-du-jour.png',
    title: 'Hexagramme du Jour',
    titleEn: 'Hexagram of the Day',
    desc: "Le conseil du jour sous forme d'un hexagramme tiré pour vous.",
    descEn: "The day's advice in a hexagram drawn for you.",
    steps: [
      'Faites le point sur votre journée',
      'Tirez l’hexagramme du jour',
      'Appliquez son conseil',
    ],
    stepsEn: [
      'Take stock of your day',
      'Draw today’s hexagram',
      'Apply its counsel',
    ],
  },
];

export default function YiJingHubPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeSlide, setActiveSlide] = useState<TutorialSlide | null>(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const t = useT();
  const lang = useLang();
  const { tiles, loadTiles, gateReason, closeGate, openGate } = useEntitlement();
  const auth = useRequireVerified();
  // Fond de l'univers : rotation aléatoire restreinte au forfait + sélection
  // de la modale UniverseBgPicker (aperçu immédiat, recharge à la fermeture).
  const bg = useUniverseBackground(YI_JING_BACKGROUND_POOLS);

  useEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (user) setIsLoggedIn(true);
    if (typeof window !== 'undefined') {
      setFirstVisit(!localStorage.getItem('yijing_tuto_seen'));
    }
  }, []);

  // Charge la dispo de tous les tirages (grisage des tuiles épuisées).
  useEffect(() => { loadTiles(); }, [loadTiles]);

  const openTutorial = (i: number) => {
    setActiveSlide(YI_TUTORIALS[i]);
    if (typeof window !== 'undefined') localStorage.setItem('yijing_tuto_seen', '1');
    setFirstVisit(false);
  };

  // Jingle d'ouverture : même pattern que /des-divinatoires et /runes
  // (user activation héritée de la navigation par lien ; installSoundUnlock
  // couvre l'accès direct). Coupé dès que l'utilisateur quitte la page
  // (navigation, onglet fermé, arrière-plan) via stopSound().
  useEffect(() => {
    installSoundUnlock();
    const t = window.setTimeout(() => playSound('yi-jing', 0.75), 150);
    const onVisibility = () => {
      if (document.hidden) stopSound('yi-jing');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
      stopSound('yi-jing');
    };
  }, []);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLoginPrompt(true);
    setTimeout(() => setShowLoginPrompt(false), 3000);
  };

  if (auth !== 'ok') return <VerifiedGate state={auth} />;
  return (
    <div className="relative w-full min-h-screen overflow-y-auto flex items-center justify-center">
      {/* BACKGROUND — rotation aléatoire parmi les fonds de l'univers (pool du
          forfait ∩ sélection de la modale). Même structure que la landing : une
          vidéo en z négatif passerait DERRIÈRE le fond opaque du body → noir. */}
      <div className="absolute inset-0 z-0">
        {bg.isVideo ? (
          <video
            src={bg.background}
            autoPlay muted loop playsInline preload="auto"
            onLoadedData={() => bg.setVideoReady(true)}
            onCanPlay={() => bg.setVideoReady(true)}
            onPlaying={() => bg.setVideoReady(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${bg.videoReady ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <Image
            src={bg.background || '/backgrounds/yi-jing-bg.jpg'}
            alt="background mystique"
            fill
            priority
            style={{ objectFit: "cover" }}
          />
        )}
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(180,40,45,0.05) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Menu parchemin (remplace la croix) */}
      <YiSlideNav />
      <SpeakerToggle />
      {/* Modale de sélection des fonds — bouton discret à gauche de l'enceinte. */}
      {bg.ready && (
        <UniverseBgPicker pools={YI_JING_BACKGROUND_POOLS} level={bg.level} current={bg.background}
          onPreview={(b) => bg.preview(b)} onReselect={() => bg.reselect()} />
      )}
      <FirstVisitHints flagKey="hints_yijing" hints={[{ selector: '[data-nav-menu]', textKey: 'hint.hubMenu' }, { selector: '[data-info-i]', textKey: 'hint.hubInfo' }]} />

      {/* Titre */}
      <div className="absolute top-[8%] left-1/2 w-[92vw] max-w-xl -translate-x-1/2 z-30 text-center px-4 pointer-events-none">
        <h1
          className="title-glow px-4 text-3xl sm:text-5xl md:text-6xl tracking-wide uppercase mb-3"
          style={{
            fontFamily: "var(--font-cinzel-deco), serif",
            color: "#F3C969",
            letterSpacing: "0.18em",
            textShadow:
              "0 0 40px rgba(180,40,45,0.7), 0 0 80px rgba(92,15,22,0.4)",
          }}
        >
          {t('hubs.yijing.title') || 'Le Yi Jing'}
        </h1>
        <p
          className="mx-auto max-w-[340px] text-sm sm:text-base md:text-lg font-medium italic leading-snug sm:max-w-md"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "#F5EAD6",
            textWrap: "balance",
            textShadow:
              "0 0 10px rgba(180,40,45,0.6), 0 1px 4px rgba(0,0,0,0.9)",
            letterSpacing: "0.05em",
          }}
        >
          {t('hubs.yijing.subtitle')}
        </p>
      </div>

      {/* GRILLE : 2 colonnes sur smartphone */}
      <div className="relative z-30 grid grid-cols-2 gap-4 px-4 max-w-md mx-auto mt-16">
        {/* TUILE — YI JING (base : baguettes d'achillée) */}
        <GatedTile href="/yi-jing-simplifie" className="block" allowed={tiles?.['yi-jing-simplifie']?.allowed} reason={tiles?.['yi-jing-simplifie']?.reason} onBlocked={openGate}>
          <motion.div
            className="group relative h-[170px] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(180,40,45,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(180,40,45,0.35)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-3 flex flex-col items-center justify-center h-full"
              style={{
                background:
                  "linear-gradient(135deg, #140a0e 0%, #0a0507 50%, #140a0e 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-[#f3c969]/25 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(1); }}
                  aria-label={ lang === 'en' ? 'How this reading works' : 'Comment fonctionne ce tirage' }
                  title={t('hubs.yijing.base')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[yijGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(243,201,105,0.10)', border: '1px solid rgba(243,201,105,0.33)',
                    color: '#F5EAD6', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(243,201,105,0.4), 0 0 0 4px rgba(243,201,105,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5EAD6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              <img
                src="/images/yi-jing-icon.png"
                alt="Yi Jing"
                className="w-[32px] h-[32px] mt-0 mb-6 object-contain rounded-md"
                style={{ filter: "drop-shadow(0 0 8px rgba(180,40,45,0.6))" }}
              />
              <h2
                className="text-base font-bold text-center leading-tight mb-1 mt-1"
                style={{
                  fontFamily: "'Hoshiko Satsuki', serif",
                  color: "#F5EAD6",
                  textShadow: "0 0 8px rgba(180,40,45,0.5)",
                }}
              >
                {t('hubs.yijing.base')}
              </h2>
              <p
                className="text-[11px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(245,234,214,0.7)",
                }}
              >
                {t('hubs.yijing.basesub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(180,40,45,0.18) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </GatedTile>

        {/* TUILE — YI JING SIMPLE */}
        <GatedTile href="/yi-jing-simple" className="block" allowed={tiles?.['yi-jing-simple']?.allowed} reason={tiles?.['yi-jing-simple']?.reason} onBlocked={openGate}>
          <motion.div
            className="group relative h-[170px] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(180,40,45,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(180,40,45,0.35)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-3 flex flex-col items-center justify-center h-full"
              style={{
                background:
                  "linear-gradient(135deg, #140a0e 0%, #0a0507 50%, #140a0e 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-[#f3c969]/25 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(2); }}
                  aria-label={ lang === 'en' ? 'How this reading works' : 'Comment fonctionne ce tirage' }
                  title={t('hubs.yijing.simple')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[yijGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(243,201,105,0.10)', border: '1px solid rgba(243,201,105,0.33)',
                    color: '#F5EAD6', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(243,201,105,0.4), 0 0 0 4px rgba(243,201,105,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5EAD6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              <img
                src="/images/yi-jing-simple.png"
                alt="Yi Jing Simple"
                className="w-[32px] h-[32px] mt-0 mb-6 object-contain rounded-md"
                style={{ filter: "drop-shadow(0 0 8px rgba(180,40,45,0.6))" }}
              />
              <h2
                className="text-base font-bold text-center leading-tight mb-1 mt-1"
                style={{
                  fontFamily: "'Hoshiko Satsuki', serif",
                  color: "#F5EAD6",
                  textShadow: "0 0 8px rgba(180,40,45,0.5)",
                }}
              >
                {t('hubs.yijing.simple')}
              </h2>
              <p
                className="text-[11px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(245,234,214,0.7)",
                }}
              >
                {t('hubs.yijing.simplesub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(180,40,45,0.18) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </GatedTile>

        {/* TUILE — HEXAGRAMME DU JOUR */}
        <GatedTile href="/yi-jing-du-jour" className="block" allowed={tiles?.['yi-jing-du-jour']?.allowed} reason={tiles?.['yi-jing-du-jour']?.reason} onBlocked={openGate}>
          <motion.div
            className="group relative h-[170px] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(180,40,45,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(180,40,45,0.35)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-3 flex flex-col items-center justify-center h-full"
              style={{
                background:
                  "linear-gradient(135deg, #140a0e 0%, #0a0507 50%, #140a0e 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-[#f3c969]/25 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(3); }}
                  aria-label={ lang === 'en' ? 'How this reading works' : 'Comment fonctionne ce tirage' }
                  title={t('hubs.yijing.day')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[yijGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(243,201,105,0.10)', border: '1px solid rgba(243,201,105,0.33)',
                    color: '#F5EAD6', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(243,201,105,0.4), 0 0 0 4px rgba(243,201,105,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5EAD6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              <img
                src="/images/yi-jing-du-jour.png"
                alt="Hexagramme du Jour"
                className="w-[32px] h-[32px] mt-0 mb-6 object-contain rounded-md"
                style={{ filter: "drop-shadow(0 0 8px rgba(180,40,45,0.6))" }}
              />
              <h2
                className="text-base font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "'Hoshiko Satsuki', serif",
                  color: "#F5EAD6",
                  textShadow: "0 0 8px rgba(180,40,45,0.5)",
                }}
              >
                {t('hubs.yijing.day')}
              </h2>
              <p
                className="text-[11px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(245,234,214,0.7)",
                }}
              >
                {t('hubs.yijing.daysub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(180,40,45,0.18) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </GatedTile>

        {/* TUILE — LE DOUBLE HEXAGRAMME (zhi gua) */}
        <GatedTile href="/yi-jing-double" className="block" allowed={tiles?.['yi-jing-double']?.allowed} reason={tiles?.['yi-jing-double']?.reason} onBlocked={openGate}>
          <motion.div
            className="group relative h-[170px] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(180,40,45,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(180,40,45,0.35)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-3 flex flex-col items-center justify-center h-full"
              style={{
                background:
                  "linear-gradient(135deg, #140a0e 0%, #1a0a10 50%, #241014 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-[#f3c969]/25 rounded-lg pointer-events-none" />
                {/* ⓘ tutoriel — le clic n'active PAS la navigation */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTutorial(0); }}
                  aria-label={ lang === 'en' ? 'How this reading works' : 'Comment fonctionne ce tirage' }
                  title={t('hubs.yijing.double')}
                  data-info-i
                  className={`absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${firstVisit ? 'animate-[yijGlow_2s_ease-in-out_3]' : ''}`}
                  style={{
                    position: 'absolute', top: 6, right: 6, left: 'auto',
                    background: 'rgba(243,201,105,0.10)', border: '1px solid rgba(243,201,105,0.33)',
                    color: '#F5EAD6', opacity: firstVisit ? 1 : 0.5,
                    boxShadow: firstVisit ? '0 0 16px rgba(243,201,105,0.4), 0 0 0 4px rgba(243,201,105,0.13)' : 'none',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5EAD6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 11v5" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              <div className="flex items-center gap-1.5 mt-0 mb-5">
                <span className="text-2xl leading-none" style={{ color: '#F3C969', textShadow: '0 0 12px rgba(243,201,105,0.6)' }} aria-hidden>䷊</span>
                <span className="text-sm leading-none" style={{ color: '#FF6B5E', textShadow: '0 0 10px rgba(255,107,94,0.55)' }} aria-hidden>➔</span>
                <span className="text-2xl leading-none" style={{ color: '#FF6B5E', textShadow: '0 0 12px rgba(255,107,94,0.6)' }} aria-hidden>䷅</span>
              </div>
              <h2
                className="text-base font-bold text-center leading-tight mb-1 mt-1"
                style={{
                  fontFamily: "'Hoshiko Satsuki', serif",
                  color: "#F5EAD6",
                  textShadow: "0 0 8px rgba(243,201,105,0.5)",
                }}
              >
                {t('hubs.yijing.double')}
              </h2>
              <p
                className="text-[11px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(245,234,214,0.7)",
                }}
              >
                {t('hubs.yijing.doubleSub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(180,40,45,0.18) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </GatedTile>
      </div>

      {/* Login prompt message */}
      {showLoginPrompt && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#140a0e]/95 border border-[#8e1c22] rounded-lg px-4 py-2">
          <p className="text-[#f3c969] text-sm font-medium">{t('hubs.loginPrompt')}</p>
        </div>
      )}

      {/* Footer text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
        <p
          className="text-xs italic"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "rgba(245,234,214,0.5)",
            letterSpacing: "0.05em",
          }}
        >
          {t('hubs.yijing.footer')}
        </p>
      </div>
    <TutorialModal open={activeSlide !== null} onClose={() => setActiveSlide(null)} slide={activeSlide} />
    <EntitlementGateModal reason={gateReason} onClose={closeGate} />
    <Firefly page="yi-jing" />
    </div>
  );
}