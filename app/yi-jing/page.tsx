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

export default function YiJingHubPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const t = useT();

  useEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (user) setIsLoggedIn(true);
  }, []);

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

  return (
    <div className="relative w-full min-h-screen overflow-y-auto flex items-center justify-center">
      {/* BACKGROUND */}
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
            "radial-gradient(ellipse at center, rgba(180,140,200,0.05) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Menu parchemin (remplace la croix) */}
      <YiSlideNav />

      {/* Titre */}
      <div className="absolute top-[8%] left-1/2 -translate-x-1/2 z-30 text-center px-4 pointer-events-none">
        <h1
          className="title-glow px-4 text-3xl sm:text-5xl md:text-6xl tracking-wide uppercase mb-3"
          style={{
            fontFamily: "var(--font-cinzel-deco), serif",
            color: "#C6A8E6",
            letterSpacing: "0.18em",
            textShadow:
              "0 0 40px rgba(180,140,200,0.7), 0 0 80px rgba(140,100,180,0.4)",
          }}
        >
          {t('hubs.yijing.title') || 'Le Yi Jing'}
        </h1>
        <p
          className="text-sm sm:text-base md:text-lg font-medium italic"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            color: "#E0CFF0",
            textShadow:
              "0 0 10px rgba(180,140,200,0.6), 0 1px 4px rgba(0,0,0,0.9)",
            letterSpacing: "0.05em",
          }}
        >
          {t('hubs.yijing.subtitle')}
        </p>
      </div>

      {/* GRILLE : 2 colonnes sur smartphone */}
      <div className="relative z-30 grid grid-cols-2 gap-4 px-4 max-w-md mx-auto mt-16">
        {/* TUILE — YI JING SIMPLE */}
        <Link href="/yi-jing-simple" className="block">
          <motion.div
            className="group relative h-[170px] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(160,130,200,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(180,140,220,0.35)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-3 flex flex-col items-center justify-center h-full"
              style={{
                background:
                  "linear-gradient(135deg, #1a1230 0%, #0a0618 50%, #1a1230 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-purple-400/30 rounded-lg pointer-events-none" />
              <img
                src="/images/yi-jing-simple.png"
                alt="Yi Jing Simple"
                className="w-[32px] h-[32px] mt-0 mb-6 object-contain rounded-md"
                style={{ filter: "drop-shadow(0 0 8px rgba(180,140,200,0.6))" }}
              />
              <h2
                className="text-base font-bold text-center leading-tight mb-1 mt-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#E0CFF0",
                  textShadow: "0 0 8px rgba(180,140,200,0.5)",
                }}
              >
                {t('hubs.yijing.simple')}
              </h2>
              <p
                className="text-[11px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(200,180,230,0.7)",
                }}
              >
                {t('hubs.yijing.simplesub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(180,140,220,0.18) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </Link>

        {/* TUILE — HEXAGRAMME DU JOUR */}
        <Link href="/yi-jing-du-jour" className="block">
          <motion.div
            className="group relative h-[170px] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(160,130,200,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(180,140,220,0.35)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-3 flex flex-col items-center justify-center h-full"
              style={{
                background:
                  "linear-gradient(135deg, #1a1230 0%, #0a0618 50%, #1a1230 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-purple-400/30 rounded-lg pointer-events-none" />
              <img
                src="/images/yi-jing-du-jour.png"
                alt="Hexagramme du Jour"
                className="w-[32px] h-[32px] mt-0 mb-6 object-contain rounded-md"
                style={{ filter: "drop-shadow(0 0 8px rgba(180,140,200,0.6))" }}
              />
              <h2
                className="text-base font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#E0CFF0",
                  textShadow: "0 0 8px rgba(180,140,200,0.5)",
                }}
              >
                {t('hubs.yijing.day')}
              </h2>
              <p
                className="text-[11px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(200,180,230,0.7)",
                }}
              >
                {t('hubs.yijing.daysub')}
              </p>
            </div>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(180,140,220,0.18) 0%, transparent 70%)",
              }}
            />
          </motion.div>
        </Link>

        {/* TUILE — YI JING AVEC QUESTION */}
        {isLoggedIn ? (
          <Link href="/yi-jing-question" className="block">
            <motion.div
              className="group relative h-[170px] rounded-xl overflow-hidden cursor-pointer transition-all"
              style={{
                boxShadow:
                  "0 0 24px rgba(180,140,220,0.45), 0 4px 14px rgba(0,0,0,0.55)",
                border: "2px solid rgba(200,160,240,0.5)",
              }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="relative p-3 flex flex-col items-center justify-center h-full"
                style={{
                  background:
                    "linear-gradient(135deg, #3a2050 0%, #1a0a28 50%, #3a2050 100%)",
                }}
              >
                <div className="absolute inset-1.5 border border-purple-300/40 rounded-lg pointer-events-none" />
                <img
                  src="/images/yi-jing-question.png"
                  alt="Yi Jing avec Question"
                  className="w-[32px] h-[32px] mt-0 mb-6 object-contain rounded-md"
                  style={{ filter: "drop-shadow(0 0 8px rgba(200,160,240,0.6))" }}
                />
                <h2
                  className="text-base font-bold text-center leading-tight mb-1"
                  style={{
                    fontFamily: "var(--font-cinzel-deco), serif",
                    color: "#F0E0FF",
                    textShadow: "0 0 8px rgba(200,160,240,0.5)",
                  }}
                >
                  {t('hubs.yijing.question')}
                  </h2>
                <p
                  className="text-[11px] text-center leading-tight"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    color: "rgba(220,200,250,0.75)",
                  }}
                >
                  {t('hubs.yijing.questionsub')}
                </p>
              </div>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(200,160,240,0.22) 0%, transparent 70%)",
                }}
              />
            </motion.div>
          </Link>
        ) : (
          <div className="block opacity-50 cursor-not-allowed" onClick={handleLockedClick}>
            <motion.div
              className="group relative h-[170px] rounded-xl overflow-hidden"
              style={{
                boxShadow:
                  "0 0 24px rgba(180,140,220,0.45), 0 4px 14px rgba(0,0,0,0.55)",
                border: "2px solid rgba(200,160,240,0.2)",
              }}
            >
              <div
                className="relative p-3 flex flex-col items-center justify-center h-full"
                style={{
                  background:
                    "linear-gradient(135deg, #3a2050 0%, #1a0a28 50%, #3a2050 100%)",
                }}
              >
                <div className="absolute inset-1.5 border border-purple-300/20 rounded-lg pointer-events-none" />
                <img
                  src="/images/yi-jing-question.png"
                  alt="Yi Jing avec Question"
                  className="w-[32px] h-[32px] mt-0 mb-6 object-contain rounded-md opacity-50"
                  style={{ filter: "drop-shadow(0 0 8px rgba(200,160,240,0.6))" }}
                />
                <h2
                  className="text-base font-bold text-center leading-tight mb-1 opacity-50"
                  style={{
                    fontFamily: "var(--font-cinzel-deco), serif",
                    color: "#F0E0FF",
                    textShadow: "0 0 8px rgba(200,160,240,0.5)",
                  }}
                >
                  {t('hubs.yijing.question')}
                  </h2>
                <p
                  className="text-[11px] text-center leading-tight opacity-50"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    color: "rgba(220,200,250,0.75)",
                  }}
                >
                  🔒 Connectez-vous
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
            color: "rgba(200,180,230,0.5)",
            letterSpacing: "0.05em",
          }}
        >
          {t('hubs.yijing.footer')}
        </p>
      </div>
    <Firefly page="yi-jing" />
    </div>
  );
}