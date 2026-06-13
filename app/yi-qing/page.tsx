'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const YI_QING_BG = '/backgrounds/yi-qing-bg.mp4';

export default function YiQingPage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <video
          src={YI_QING_BG}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* BACK BUTTON */}
      <Link href="/" className="absolute top-4 left-4 z-50">
        <button
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all opacity-80 hover:opacity-100"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            background: 'rgba(139, 105, 20, 0.25)',
            color: '#FFD700',
            border: '1px solid rgba(218, 165, 32, 0.3)',
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(139, 105, 20, 0.25)'}
        >
          ← Retour
        </button>
      </Link>

      {/* TITLE CENTERED NEAR TOP */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 z-30 text-center px-4">
        <h1
          className="title-glow px-4 text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-wider uppercase mb-4"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: '#FFD700',
            letterSpacing: '0.2em',
            textShadow: '0 0 40px rgba(255,215,0,0.7), 0 0 80px rgba(255,215,0,0.4)',
          }}
        >
          Yi Jing
        </h1>
        <p
          className="text-sm sm:text-base md:text-lg font-medium italic"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 0 10px rgba(255,215,0,0.6), 0 1px 4px rgba(0,0,0,0.9)',
            letterSpacing: '0.05em',
          }}
        >
          La sagesse des hexagames
        </p>
      </div>

      {/* COMING SOON CONTENT */}
      <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2 z-30 text-center px-4">
        <motion.div
          className="px-6 py-4 rounded-xl"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p
            className="text-sm sm:text-base md:text-lg font-medium"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              color: '#FFD700',
              textShadow: '0 0 8px rgba(255,215,0,0.5)',
            }}
          >
            Prochainement disponible
          </p>
        </motion.div>
      </div>
    </div>
  );
}