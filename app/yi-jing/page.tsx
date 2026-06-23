'use client';

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function YiJingHubPage() {
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
            "radial-gradient(ellipse at center, rgba(180,140,200,0.05) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Croix retour à l'accueil */}
      <Link
        href="/"
        className="fixed top-4 right-4 text-purple-300 text-3xl font-bold hover:text-purple-200 transition-colors z-50 leading-none"
        aria-label="Retour à l'accueil"
        style={{ textShadow: "0 0 12px rgba(180,140,200,0.35)" }}
      >
        ×
      </Link>

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
          Le Yi Jing
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
          Choisissez votre consultation
        </p>
      </div>

      {/* TUILES : Yi Jing simple vs Yi Jing avec question */}
      <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col sm:flex-row gap-4 sm:gap-6 px-4">
        {/* TUILE — YI JING SIMPLE */}
        <Link href="/yi-jing-simple" className="block">
          <motion.div
            className="group relative w-44 sm:w-48 md:w-52 rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 20px rgba(160,130,200,0.4), 0 4px 12px rgba(0,0,0,0.5)",
              border: "2px solid rgba(180,140,220,0.35)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-5 sm:p-6 flex flex-col items-center justify-center min-h-[180px]"
              style={{
                background:
                  "linear-gradient(135deg, #1a1230 0%, #0a0618 50%, #1a1230 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-purple-400/30 rounded-lg pointer-events-none" />
              <div className="text-4xl mb-2">☯</div>
              <h2
                className="text-lg sm:text-xl font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#E0CFF0",
                  textShadow: "0 0 8px rgba(180,140,200,0.5)",
                }}
              >
                Yi Jing Simple
              </h2>
              <p
                className="text-xs sm:text-sm text-center leading-tight mt-1"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(200,180,230,0.7)",
                }}
              >
                Tirage classique sans question
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
        <Link href="/yi-jing-question" className="block">
          <motion.div
            className="group relative w-44 sm:w-48 md:w-52 rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                "0 0 24px rgba(180,140,220,0.45), 0 4px 14px rgba(0,0,0,0.55)",
              border: "2px solid rgba(200,160,240,0.5)",
            }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="relative p-5 sm:p-6 flex flex-col items-center justify-center min-h-[180px]"
              style={{
                background:
                  "linear-gradient(135deg, #3a2050 0%, #1a0a28 50%, #3a2050 100%)",
              }}
            >
              <div className="absolute inset-1.5 border border-purple-300/40 rounded-lg pointer-events-none" />
              <div className="text-4xl mb-2">🪶</div>
              <h2
                className="text-lg sm:text-xl font-bold text-center leading-tight mb-1"
                style={{
                  fontFamily: "var(--font-cinzel-deco), serif",
                  color: "#F0E0FF",
                  textShadow: "0 0 8px rgba(200,160,240,0.5)",
                }}
              >
                Yi Jing avec Question
              </h2>
              <p
                className="text-xs sm:text-sm text-center leading-tight mt-1"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  color: "rgba(220,200,250,0.75)",
                }}
              >
                Posez votre question aux baguettes
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
      </div>

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
          ☯ Les hexagrammes murmurent ☯
        </p>
      </div>
    </div>
  );
}