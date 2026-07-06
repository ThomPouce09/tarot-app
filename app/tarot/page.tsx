'use client';

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function TarotHubPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  useEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (user) setIsLoggedIn(true);
  }, []);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLoginPrompt(true);
    setTimeout(() => setShowLoginPrompt(false), 3000);
  };

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

      {/* Croix retour à l'accueil */}
      <Link
        href="/"
        className="fixed top-4 right-4 text-amber-400 text-3xl font-bold hover:text-amber-300 transition-colors z-50 leading-none"
        aria-label="Retour à l'accueil"
        style={{ textShadow: "0 0 12px rgba(251, 191, 36, 0.3)" }}
      >
        ×
      </Link>

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
          Choisissez votre tirage
        </p>
      </div>

      {/* TUILES : grille 2 colonnes sur mobile */}
      <div
        className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 grid grid-cols-2 gap-3 sm:gap-4 px-4 w-full max-w-md"
      >
        {/* TUILE — 3 CARTES */}
        <Link href="/tarot-3-cartes">
          <motion.div
            className="group relative w-full rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 16px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(218,165,32,0.3)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-2 flex flex-col items-center justify-center min-h-[90px]"
              style={{
                background:
                  "linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 50%, #2d1b4e 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-amber-500/25 rounded-lg pointer-events-none" />
              <div className="text-2xl mb-1">🎴</div>
              <h2
                className="text-sm font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#FFD700",
                  textShadow: "0 0 8px rgba(255,215,0,0.4)",
                }}
              >
                3 Cartes
              </h2>
              <p
                className="text-[9px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(255,215,0,0.7)",
                }}
              >
                Passé · Présent · Avenir
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
        </Link>

        {/* TUILE — 5 CARTES (CROIX) */}
        <Link href="/tarot-5-cartes">
          <motion.div
            className="group relative w-full rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 18px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(218,165,32,0.3)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-2 flex flex-col items-center justify-center min-h-[90px]"
              style={{
                background:
                  "linear-gradient(135deg, #4a2c1a 0%, #2a1408 50%, #4a2c1a 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-amber-400/30 rounded-lg pointer-events-none" />
              <div className="text-2xl mb-1">✨</div>
              <h2
                className="text-sm font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#FFD700",
                  textShadow: "0 0 8px rgba(255,215,0,0.45)",
                }}
              >
                5 Cartes en Croix
              </h2>
              <p
                className="text-[9px] text-center leading-tight"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(255,215,0,0.75)",
                }}
              >
                Sommet · Orient · Synthèse · Occident · Base
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
        </Link>

        {/* TUILE — 5 CARTES MANUEL - centré sur 2 colonnes (Bloqué si non connecté) */}
        {isLoggedIn ? (
          <Link href="/tarot-5-c-manuelle" className="col-span-2">
            <motion.div
              className="group relative w-full max-w-[140px] mx-auto rounded-xl overflow-hidden cursor-pointer transition-all"
              style={{
                boxShadow:
                  "0 0 18px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5)",
                border: "2px solid rgba(251,191,36,0.3)",
              }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="relative p-2 flex flex-col items-center justify-center min-h-[90px]"
                style={{
                  background:
                    "linear-gradient(135deg, #3a1f4d 0%, #1a0a2e 50%, #3a1f4d 100%)",
                }}
              >
                <div className="absolute inset-1.5 border border-amber-400/35 rounded-lg pointer-events-none" />
                <div className="text-2xl mb-1">🔮</div>
                <h2
                  className="text-sm font-bold text-center leading-tight mb-1"
                  style={{
                    fontFamily: "var(--font-cinzel-deco), serif",
                    color: "#FFD700",
                    textShadow: "0 0 8px rgba(255,215,0,0.45)",
                  }}
                >
                  5 Cartes Manuelles
                </h2>
                <p
                  className="text-[9px] text-center leading-tight"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    color: "rgba(255,215,0,0.75)",
                  }}
                >
                  Sans IA
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
          </Link>
        ) : (
          <div className="block opacity-50 cursor-not-allowed col-span-2" onClick={handleLockedClick}>
            <motion.div
              className="group relative w-full max-w-[140px] mx-auto rounded-xl overflow-hidden"
              style={{
                boxShadow:
                  "0 0 18px rgba(251,191,36,0.4), 0 4px 12px rgba(0,0,0,0.5)",
                border: "2px solid rgba(251,191,36,0.2)",
              }}
            >
              <div
                className="relative p-2 flex flex-col items-center justify-center min-h-[90px]"
                style={{
                  background:
                    "linear-gradient(135deg, #3a1f4d 0%, #1a0a2e 50%, #3a1f4d 100%)",
                }}
              >
                <div className="absolute inset-1.5 border border-amber-400/20 rounded-lg pointer-events-none" />
                <div className="text-2xl mb-1 opacity-50">🔮</div>
                <h2
                  className="text-sm font-bold text-center leading-tight mb-1 opacity-50"
                  style={{
                    fontFamily: "var(--font-cinzel-deco), serif",
                    color: "#FFD700",
                    textShadow: "0 0 8px rgba(255,215,0,0.45)",
                  }}
                >
                  5 Cartes Manuelles
                </h2>
                <p
                  className="text-[9px] text-center leading-tight"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    color: "rgba(255,215,0,0.75)",
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
          <p className="text-purple-300 text-sm font-medium">🔒 Connectez-vous pour accéder à cette fonction</p>
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
          ✦ Les étoiles vous guident ✦
        </p>
      </div>
    </div>
  );
}