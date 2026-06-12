'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface InterpretationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToHome: () => void;
  interpretation: { carte1: string; carte2: string; carte3: string } | null;
  cardNames: { carte1: string; carte2: string; carte3: string } | null;
  loading: boolean;
  error: string | null;
}

export default function InterpretationModal({ isOpen, onClose, onReturnToHome, interpretation, cardNames, loading, error }: InterpretationModalProps) {
  if (!isOpen) return null;

  // Timer pour afficher le texte après 5 secondes
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowText(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9998]"
            onClick={onClose}
          />

          {/* Modal - FULLSCREEN */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-full h-full flex flex-col pointer-events-auto"
              style={{
                boxShadow: '0 0 60px rgba(218,165,32,0.3)',
              }}
            >
              {/* Header - caché pendant le loading vidéo, avec bouton X visible */}
              {!loading && (
                <div className="p-4 md:p-6 text-center relative">
                  <button
                    onClick={onReturnToHome}
                    className="absolute top-4 right-4 text-amber-400 hover:text-amber-200 transition-colors text-2xl z-20"
                  >
                    ✕
                  </button>

                  <div className="flex items-center justify-center gap-3 mb-3 text-3xl md:text-4xl">
                    🔮 🔮 🔮
                  </div>

                  <h2
                    className="text-2xl md:text-3xl font-bold text-center"
                    style={{
                      fontFamily: 'var(--font-cinzel), serif',
                      color: '#DAA520',
                      textShadow: '0 0 30px rgba(218,165,32,0.6)',
                    }}
                  >
                    INTERPRÉTATION<br/>DU TIRAGE
                  </h2>
                </div>
              )}

              {/* Content - FULL HEIGHT, CENTERED - fixed height to prevent shift */}
              <div className="flex-1 flex items-center justify-center px-4 md:px-6 min-h-0">
                {/* Phase de divination - vidéo pendant le chargement */}
                {loading && (
                  <div className="w-full h-full flex flex-col items-center justify-center px-4 md:px-6 -mt-8">
                    <video
                      src="/tirage.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full max-w-xs sm:max-w-sm md:max-w-md"
                      style={{ maxHeight: '60vh', objectFit: 'contain' }}
                    />

                    {/* Texte - apparaît après 5 secondes, hauteur fixe pour éviter le shift */}
                    <div className="h-8 mt-6 flex items-center justify-center">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: showText ? 1 : 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-amber-300/90 text-lg md:text-xl"
                        style={{
                          fontFamily: 'var(--font-cinzel), serif',
                          textShadow: '0 0 24px rgba(251,191,36,0.45)',
                        }}
                      >
                        🌙 La révélation approche... 🌙
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Phase de révélation (interprétations) */}
                {interpretation && cardNames && !loading && (
                  <div className="w-full max-w-2xl space-y-3 md:space-y-4 overflow-y-auto max-h-[65vh]">
                    {error && (
                      <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-lg text-red-300 text-center text-xs">
                        ⚠️ {error}
                      </div>
                    )}

                    {[
                      { key: 'carte1', position: 'Passé', icon: '🕰️' },
                      { key: 'carte2', position: 'Présent', icon: '⚡' },
                      { key: 'carte3', position: 'Avenir', icon: '💫' },
                    ].map((section, idx) => {
                      const text = interpretation[section.key as keyof typeof interpretation];
                      const cardName = cardNames[section.key as keyof typeof cardNames];
                      return (
                        <motion.div
                          key={section.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + (idx * 0.3), duration: 0.6 }}
                          className="relative p-3 md:p-4 bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl border border-amber-500/20 overflow-hidden"
                          style={{
                            backdropFilter: 'blur(8px)',
                            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), 0 4px 20px rgba(218,165,32,0.2)',
                          }}
                        >
                          {/* Glow effect */}
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              background: 'radial-gradient(ellipse at top, rgba(218,165,32,0.3) 0%, transparent 70%)',
                            }}
                          />

                          {/* Title avec nom de la carte */}
                          <div className="mb-2">
                            <h3
                              className="text-base md:text-lg font-bold"
                              style={{
                                fontFamily: 'var(--font-cinzel), serif',
                                color: '#FFD700',
                                textShadow: '0 0 15px rgba(255,215,0,0.8)',
                              }}
                            >
                              {section.icon} {section.position}
                            </h3>
                            <p
                              className="text-amber-400/90 text-xs mt-1"
                              style={{
                                fontFamily: 'var(--font-cinzel), serif',
                                textShadow: '0 0 10px rgba(218,165,32,0.4)',
                              }}
                            >
                              {cardName}
                            </p>
                          </div>

                          {/* Text */}
                          <p
                            className="text-gray-200 leading-relaxed text-xs md:text-sm"
                            style={{
                              fontFamily: 'var(--font-cinzel), serif',
                              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                            }}
                          >
                            {text}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}