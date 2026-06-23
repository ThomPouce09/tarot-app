'use client';

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function TarotHubPage() {
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
        className="absolute top-[8%] left-1/2 -translate-x-1/2 z-30 text-center px-4 pointer-events-none"
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

      {/* TUILES : 3 cartes et 5 cartes (mis sur 2 lignes sur mobile) */}
      <div
        className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col sm:flex-row gap-4 sm:gap-6 px-4"
      >
        {/* TUILE — 3 CARTES */}
        <Link href="/tarot-3-cartes" className="block">
          <motion.div
            className="group relative w-44 sm:w-48 md:w-52 rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(218,165,32,0.3)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-5 sm:p-6 flex flex-col items-center justify-center min-h-[180px]"
              style={{
                background:
                  "linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 50%, #2d1b4e 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-amber-500/25 rounded-lg pointer-events-none" />
              <div className="text-4xl mb-2">🎴</div>
              <h2
                className="text-lg sm:text-xl font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#FFD700",
                  textShadow: "0 0 8px rgba(255,215,0,0.4)",
                }}
              >
                3 Cartes
              </h2>
              <p
                className="text-xs sm:text-sm text-center leading-tight mt-1"
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
        <Link href="/tarot-5-cartes" className="block">
          <motion.div
            className="group relative w-44 sm:w-48 md:w-52 rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 24px rgba(218,165,32,0.45), 0 4px 14px rgba(0,0,0,0.55)",
              border: "2px solid rgba(218,165,32,0.45)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-5 sm:p-6 flex flex-col items-center justify-center min-h-[180px]"
              style={{
                background:
                  "linear-gradient(135deg, #4a2c1a 0%, #2a1408 50%, #4a2c1a 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-amber-400/30 rounded-lg pointer-events-none" />
              <div className="text-4xl mb-2">✨</div>
              <h2
                className="text-lg sm:text-xl font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#FFD700",
                  textShadow: "0 0 8px rgba(255,215,0,0.45)",
                }}
              >
                5 Cartes en Croix
              </h2>
              <p
                className="text-xs sm:text-sm text-center leading-tight mt-1"
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
      </div>

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