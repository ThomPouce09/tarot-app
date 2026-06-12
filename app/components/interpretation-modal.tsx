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

const crystalStars = [
  { x: 118, y: 104, size: 8, delay: 0 },
  { x: 178, y: 118, size: 6, delay: 0.6 },
  { x: 142, y: 148, size: 5, delay: 1.1 },
  { x: 96, y: 158, size: 4.5, delay: 1.5 },
  { x: 202, y: 166, size: 5, delay: 1.9 },
  { x: 158, y: 196, size: 7, delay: 2.3 },
  { x: 128, y: 210, size: 4, delay: 2.8 },
] as const;

const smokePaths = [
  {
    d: 'M150 226 C105 198 190 190 142 154 C118 136 138 116 158 104',
    color: 'rgba(236, 221, 255, 0.72)',
    delay: 0,
  },
  {
    d: 'M126 224 C88 190 158 178 126 142 C104 118 128 92 154 82',
    color: 'rgba(196, 181, 253, 0.55)',
    delay: 0.9,
  },
  {
    d: 'M178 224 C214 188 146 176 180 144 C202 122 174 96 150 86',
    color: 'rgba(216, 180, 254, 0.58)',
    delay: 1.7,
  },
] as const;

const crystalMotes = [
  { x: 132, y: 124, r: 2.2, delay: 0 },
  { x: 168, y: 136, r: 1.8, delay: 0.45 },
  { x: 108, y: 176, r: 2, delay: 0.9 },
  { x: 196, y: 184, r: 1.6, delay: 1.25 },
  { x: 146, y: 204, r: 2.4, delay: 1.65 },
  { x: 184, y: 96, r: 1.5, delay: 2.05 },
] as const;

function starPath(x: number, y: number, size: number) {
  const points: string[] = [];

  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? size : size * 0.45;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${x + Math.cos(angle) * radius},${y + Math.sin(angle) * radius}`);
  }

  return points.join(' ');
}

export function CrystalBallLoader() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 12 }}
      className="relative mx-auto w-60 h-60 md:w-72 md:h-72"
      style={{ filter: 'drop-shadow(0 0 34px rgba(168,85,247,0.55))' }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(217,70,239,0.16) 38%, transparent 70%)' }}
      />

      <svg viewBox="0 0 300 280" className="relative w-full h-full" role="img" aria-label="Boule de cristal magique">
        <defs>
          <radialGradient id="crystalBallGradient" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="18%" stopColor="#f5e6ff" stopOpacity="0.72" />
            <stop offset="45%" stopColor="#c084fc" stopOpacity="0.46" />
            <stop offset="72%" stopColor="#7c3aed" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0.12" />
          </radialGradient>

          <radialGradient id="crystalGlowGradient" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="36%" stopColor="#d946ef" stopOpacity="0.24" />
            <stop offset="68%" stopColor="#7c3aed" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#111827" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="standGradient" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="42%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#581c87" />
          </linearGradient>

          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '150px 150px' }}
          filter="url(#softGlow)"
        >
          <circle cx="150" cy="150" r="101" fill="none" stroke="rgba(217,70,239,0.32)" strokeWidth="1.5" strokeDasharray="9 13" />
          <circle cx="150" cy="150" r="116" fill="none" stroke="rgba(251,191,36,0.16)" strokeWidth="1" strokeDasharray="3 11" />
        </motion.g>

        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '150px 150px' }}
        >
          <circle cx="150" cy="150" r="88" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="2 10" />
        </motion.g>

        <ellipse cx="150" cy="252" rx="66" ry="13" fill="rgba(0,0,0,0.42)" />
        <motion.path
          d="M76 241 C104 216 196 216 224 241"
          fill="none"
          stroke="rgba(251,191,36,0.38)"
          strokeWidth="4"
          strokeLinecap="round"
          animate={{ pathLength: [0, 1, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <path d="M92 244 C116 225 184 225 208 244 L198 257 L102 257 Z" fill="url(#standGradient)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
        <rect x="74" y="257" width="152" height="12" rx="6" fill="url(#standGradient)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
        <rect x="54" y="269" width="192" height="9" rx="4.5" fill="#2e1065" stroke="rgba(251,191,36,0.22)" strokeWidth="1" />

        <motion.g
          animate={{ y: [-5, 4, -5], opacity: [0.5, 0.92, 0.5] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <circle cx="150" cy="150" r="82" fill="url(#crystalGlowGradient)" />
          <circle cx="150" cy="150" r="76" fill="url(#crystalBallGradient)" opacity="0.98" />

          {smokePaths.map((smoke, index) => (
            <motion.path
              key={index}
              d={smoke.d}
              fill="none"
              stroke={smoke.color}
              strokeWidth="7"
              strokeLinecap="round"
              filter="url(#softGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 0], opacity: [0, 0.72, 0], translateY: [8, -8, 8] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: smoke.delay }}
            />
          ))}

          {crystalStars.map((star, index) => (
            <motion.g
              key={index}
              initial={{ scale: 0.75, opacity: 0.35 }}
              animate={{
                rotate: 360,
                scale: [0.75, 1.18, 0.75],
                opacity: [0.35, 0.96, 0.35],
              }}
              transition={{
                rotate: { duration: 9 + index * 0.8, repeat: Infinity, ease: 'linear' },
                scale: { duration: 2.7 + index * 0.2, repeat: Infinity, ease: 'easeInOut', delay: star.delay },
                opacity: { duration: 2.7 + index * 0.2, repeat: Infinity, ease: 'easeInOut', delay: star.delay },
              }}
              style={{ transformOrigin: `${star.x}px ${star.y}px` }}
            >
              <path d={starPath(star.x, star.y, star.size)} fill="#fff7ed" opacity="0.9" />
              <circle cx={star.x} cy={star.y} r={star.size * 0.24} fill="#f5d0fe" />
            </motion.g>
          ))}

          {crystalMotes.map((mote, index) => (
            <motion.circle
              key={index}
              cx={mote.x}
              cy={mote.y}
              r={mote.r}
              fill="#fef3c7"
              filter="url(#softGlow)"
              initial={{ opacity: 0.15, y: 8 }}
              animate={{ opacity: [0.15, 0.9, 0.15], y: [8, -18, 8], x: [0, (index % 2 === 0 ? 12 : -10), 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: mote.delay }}
            />
          ))}

          <path d="M86 160 C122 130 174 130 214 160" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="116" cy="112" r="13" fill="#ffffff" opacity="0.58" filter="url(#softGlow)" />
          <circle cx="150" cy="150" r="77" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
        </motion.g>
      </svg>
    </motion.div>
  );
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
                  <div className="py-10 md:py-12 space-y-8">
                    <CrystalBallLoader />

                    {/* Texte évolutif */}
                    <div className="text-center space-y-4">
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-amber-200 text-lg md:text-xl"
                        style={{ 
                          fontFamily: 'var(--font-cinzel), serif',
                          textShadow: '0 0 24px rgba(217,70,239,0.65), 0 0 8px rgba(255,255,255,0.45)',
                        }}
                      >
                        Les esprits consultent les cartes...
                      </motion.p>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                        className="text-violet-200/85 text-sm md:text-base"
                        style={{ 
                          fontFamily: 'var(--font-cinzel), serif',
                          textShadow: '0 0 18px rgba(168,85,247,0.55)',
                        }}
                      >
                        ✨ Concentrez-vous sur votre question... ✨
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 3.2, duration: 0.8 }}
                        className="text-amber-300/70 text-sm"
                        style={{ 
                          fontFamily: 'var(--font-cinzel), serif',
                          textShadow: '0 0 16px rgba(251,191,36,0.45)',
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