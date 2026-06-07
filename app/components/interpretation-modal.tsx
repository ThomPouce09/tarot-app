'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface InterpretationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToHome: () => void;
  interpretation: { carte1: string; carte2: string; carte3: string } | null;
  cardNames: { carte1: string; carte2: string; carte3: string } | null;  // Noms des cartes
  loading: boolean;
  error: string | null;
  phase?: 'summoning' | 'revealing';
}

export default function InterpretationModal({ isOpen, onClose, onReturnToHome, interpretation, cardNames, loading, error, phase = 'summoning' }: InterpretationModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9998]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className="bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-amber-500/30 shadow-2xl shadow-amber-500/20 max-w-2xl w-full max-h-[85vh] flex flex-col pointer-events-auto"
              style={{
                boxShadow: '0 0 60px rgba(218,165,32,0.3), inset 0 0 60px rgba(0,0,0,0.8)',
              }}
            >
              {/* Header - STICKY */}
              <div className="sticky top-0 bg-gradient-to-b from-gray-900 via-gray-900/95 to-transparent p-6 border-b border-amber-500/20 z-10">
                <button
                  onClick={onReturnToHome}
                  className="absolute top-4 right-4 text-amber-400 hover:text-amber-200 transition-colors text-2xl z-20"
                >
                  ✕
                </button>
                
                {/* 3 petites boules de cristal (émojis) centrées au-dessus du titre */}
                <div className="flex items-center justify-center gap-3 mb-3 text-4xl">
                  🔮 🔮 🔮
                </div>
                
                {/* Titre centré sur 2 lignes */}
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

              {/* Content - SCROLLABLE */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-900/30 border border-red-500/40 rounded-lg text-red-300 text-center">
                    ⚠️ {error}
                  </div>
                )}

                {/* Phase de divination (5 secondes d'attente magique) */}
                {loading && phase === 'summoning' && (
                  <div className="py-12 space-y-8">
                    {/* Cercle mystique rotatif */}
                    <div className="relative flex items-center justify-center">
                      {/* Anneaux externes */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="absolute w-48 h-48 border border-amber-500/20 rounded-full"
                        style={{
                          boxShadow: '0 0 30px rgba(218,165,32,0.3), inset 0 0 30px rgba(218,165,32,0.2)',
                        }}
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                        className="absolute w-40 h-40 border border-amber-400/30 rounded-full"
                        style={{
                          boxShadow: '0 0 20px rgba(218,165,32,0.4)',
                        }}
                      />
                      
                      {/* Orbe centrale pulsante */}
                      <motion.div
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease:'easeInOut' }}
                        className="relative w-24 h-24 rounded-full"
                        style={{
                          background: 'radial-gradient(circle, rgba(218,165,32,0.8) 0%, rgba(218,165,32,0.2) 70%, transparent 100%)',
                          boxShadow: '0 0 60px rgba(218,165,32,0.8)',
                        }}
                      >
                        {/* Symbole tarot au centre */}
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">
                          🔮
                        </div>
                      </motion.div>
                      
                      {/* Particules flottantes */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ 
                            x: Math.cos((i / 8) * Math.PI * 2) * 100,
                            y: Math.sin((i / 8) * Math.PI * 2) * 100,
                            opacity: 0,
                          }}
                          animate={{ 
                            x: [
                              Math.cos((i / 8) * Math.PI * 2) * 100,
                              Math.cos((i / 8) * Math.PI * 2 + Math.PI) * 60,
                              Math.cos((i / 8) * Math.PI * 2) * 100,
                            ],
                            y: [
                              Math.sin((i / 8) * Math.PI * 2) * 100,
                              Math.sin((i / 8) * Math.PI * 2 + Math.PI) * 60,
                              Math.sin((i / 8) * Math.PI * 2) * 100,
                            ],
                            opacity: [0.3, 0.8, 0.3],
                            scale: [0.5, 1, 0.5],
                          }}
                          transition={{ 
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.3,
                          }}
                          className="absolute w-3 h-3 rounded-full"
                          style={{
                            background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)',
                            boxShadow: '0 0 20px rgba(218,165,32,0.8)',
                          }}
                        />
                      ))}
                    </div>
                    
                    {/* Texte évolutif */}
                    <div className="text-center space-y-4">
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="text-amber-300 text-xl"
                        style={{ 
                          fontFamily: 'var(--font-cinzel), serif',
                          textShadow: '0 0 20px rgba(218,165,32,0.6)',
                        }}
                      >
                        Les esprits consultent les cartes...
                      </motion.p>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2, duration: 1 }}
                        className="text-amber-400/80 text-lg"
                        style={{ 
                          fontFamily: 'var(--font-cinzel), serif',
                        }}
                      >
                        ✨ Concentrez-vous sur votre question... ✨
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 4, duration: 1 }}
                        className="text-amber-500/60 text-base"
                        style={{ 
                          fontFamily: 'var(--font-cinzel), serif',
                        }}
                      >
                        🌙 La révélation approche... 🌙
                      </motion.div>
                    </div>
                  </div>
                )}

                {/* Phase de révélation (interprétations) */}
                {interpretation && cardNames && !loading && (
                  <div className="space-y-6">
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
                          className="relative p-5 bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl border border-amber-500/20 overflow-hidden"
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
                          <div className="mb-3">
                            <h3 
                              className="text-lg md:text-xl font-bold"
                              style={{
                                fontFamily: 'var(--font-cinzel), serif',
                                color: '#FFD700',
                                textShadow: '0 0 15px rgba(255,215,0,0.8)',
                              }}
                            >
                              {section.icon} {section.position}
                            </h3>
                            <p
                              className="text-amber-400/90 text-sm mt-1"
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
                            className="text-gray-200 leading-relaxed text-sm md:text-base"
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

              {/* Footer */}
              <div className="p-6 border-t border-amber-500/20 text-center">
                <button
                  onClick={onReturnToHome}
                  className="px-8 py-3 rounded-xl text-lg font-bold transition-all transform hover:scale-105"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    background: 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)',
                    color: '#1a0e0a',
                    boxShadow: '0 0 30px rgba(218,165,32,0.4)',
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}