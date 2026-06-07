'use client';

import { motion } from 'framer-motion';

interface DivinationScreenProps {
  isVisible: boolean;
}

export default function DivinationScreen({ isVisible }: DivinationScreenProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}  // Transition rapide
      className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-md flex items-center justify-center pointer-events-auto"
      style={{ 
        display: isVisible ? 'flex' : 'none',  // Désactiver les events quand invisible
      }}
    >
      {/* Cercle mystique rotatif */}
      <div className="relative flex items-center justify-center">
        {/* Anneaux externes */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute w-64 h-64 border border-amber-500/20 rounded-full"
          style={{
            boxShadow: '0 0 40px rgba(218,165,32,0.4), inset 0 0 40px rgba(218,165,32,0.3)',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute w-52 h-52 border border-amber-400/30 rounded-full"
          style={{
            boxShadow: '0 0 30px rgba(218,165,32,0.5)',
          }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute w-40 h-40 border border-amber-300/40 rounded-full"
          style={{
            boxShadow: '0 0 20px rgba(218,165,32,0.6)',
          }}
        />
        
        {/* Orbe centrale pulsante */}
        <motion.div
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-32 h-32 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.9) 0%, rgba(218,165,32,0.6) 50%, rgba(218,165,32,0.1) 80%, transparent 100%)',
            boxShadow: '0 0 100px rgba(218,165,32,1), 0 0 200px rgba(255,215,0,0.8)',
          }}
        >
          {/* Symbole tarot au centre */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center text-5xl"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            🔮
          </motion.div>
        </motion.div>
        
        {/* Particules flottantes */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.cos((i / 12) * Math.PI * 2) * 120,
              y: Math.sin((i / 12) * Math.PI * 2) * 120,
              opacity: 0,
              scale: 0,
            }}
            animate={{ 
              x: [
                Math.cos((i / 12) * Math.PI * 2) * 120,
                Math.cos((i / 12) * Math.PI * 2 + Math.PI) * 80,
                Math.cos((i / 12) * Math.PI * 2) * 120,
              ],
              y: [
                Math.sin((i / 12) * Math.PI * 2) * 120,
                Math.sin((i / 12) * Math.PI * 2 + Math.PI) * 80,
                Math.sin((i / 12) * Math.PI * 2) * 120,
              ],
              opacity: [0.2, 1, 0.2],
              scale: [0.3, 1.2, 0.3],
            }}
            transition={{ 
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.25,
            }}
            className="absolute w-4 h-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)',
              boxShadow: '0 0 30px rgba(218,165,32,1)',
            }}
          />
        ))}

        {/* Runes/ glyphes autour */}
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const x = Math.cos(angle) * 140;
          const y = Math.sin(angle) * 140;
          const glyphs = ['✦', '◈', '⬡', '❖', '⬢', '◊', '✧', '◎'];
          return (
            <motion.div
              key={`glyph-${i}`}
              className="absolute text-2xl text-amber-300"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                textShadow: '0 0 20px rgba(218,165,32,0.8)',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
                rotate: [0, 180, 360],
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.4,
              }}
            >
              {glyphs[i]}
            </motion.div>
          );
        })}
      </div>

      {/* Textes évolutifs */}
      <div className="absolute bottom-32 text-center space-y-6">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-3xl md:text-4xl font-bold"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 0 30px rgba(218,165,32,0.8), 0 0 60px rgba(218,165,32,0.6)',
          }}
        >
          Divination en cours...
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="text-amber-300 text-xl"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
            textShadow: '0 0 20px rgba(218,165,32,0.6)',
          }}
        >
          Les esprits consultent les cartes...
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="text-amber-400/80 text-lg"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
          }}
        >
          ✨ Concentrez-vous sur votre question... ✨
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.5, duration: 1 }}
          className="text-amber-500/60 text-base"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
          }}
        >
          🌙 La révélation approche... 🌙
        </motion.p>
      </div>
    </motion.div>
  );
}