'use client';

import { motion } from 'framer-motion';
import { useWaitMessages } from './use-wait-messages';

interface MagicalDivinationProps {
  isVisible: boolean;
}

export default function MagicalDivination({ isVisible }: MagicalDivinationProps) {
  const msg = useWaitMessages('magical-divination');
  return (
    <motion.div 
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[10000] bg-gradient-to-b from-black via-slate-950 to-black flex items-center justify-center overflow-hidden"
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
      {/* Arrière-plan étoilé */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-200/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Cercle extérieur - Anneau runique */}
      <motion.div
        className="absolute w-[600px] h-[600px] border border-amber-500/20 rounded-full"
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        style={{
          boxShadow: '0 0 60px rgba(218, 165, 32, 0.3), inset 0 0 60px rgba(218, 165, 32, 0.1)',
        }}
      >
        {/* Symboles runiques sur l'anneau */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 text-amber-400/60 text-2xl font-bold"
            style={{
              left: '50%',
              top: '0',
              transform: `rotate(${i * 30}deg) translateY(-50%) translateX(-50%)`,
              transformOrigin: 'center 300px',
            }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.25 }}
          >
            ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ
          </motion.div>
        ))}
      </motion.div>

      {/* Deuxième anneau - Cercle intermédiaire */}
      <motion.div
        className="absolute w-[450px] h-[450px] border-2 border-amber-400/30 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{
          boxShadow: '0 0 40px rgba(218, 165, 32, 0.4), inset 0 0 40px rgba(218, 165, 32, 0.2)',
          borderStyle: 'dashed',
        }}
      />

      {/* Troisième anneau - Cercle rapide */}
      <motion.div
        className="absolute w-[320px] h-[320px] border border-amber-300/40 rounded-full"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
        }}
      />

      {/* Particules flottantes */}
      {[...Array(16)].map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-2 h-2 bg-gradient-to-r from-amber-300 to-yellow-500 rounded-full"
          style={{
            boxShadow: '0 0 20px 4px rgba(218, 165, 32, 0.6)',
          }}
          animate={{
            x: [
              Math.cos(i * Math.PI / 8) * 180,
              Math.cos(i * Math.PI / 8 + Math.PI) * 180,
              Math.cos(i * Math.PI / 8) * 180,
            ],
            y: [
              Math.sin(i * Math.PI / 8) * 180,
              Math.sin(i * Math.PI / 8 + Math.PI) * 180,
              Math.sin(i * Math.PI / 8) * 180,
            ],
            scale: [1, 1.5, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}

      {/* Orbe centrale - Coeur divinatoire */}
      <div className="relative">
        {/* Halo extérieur */}
        <motion.div
          className="absolute inset-0 w-[280px] h-[280px] -ml-[40px] -mt-[40px] rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: 'radial-gradient(circle, rgba(218,165,32,0.4) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Halo intermédiaire */}
        <motion.div
          className="absolute inset-0 w-[220px] h-[220px] -ml-[10px] -mt-[10px] rounded-full"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.5) 0%, transparent 70%)',
            filter: 'blur(15px)',
          }}
        />

        {/* Orbe principale */}
        <motion.div
          className="w-[200px] h-[200px] rounded-full relative"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, 
                #FFD700 0%, 
                #FDB931 20%, 
                #DAA520 45%, 
                #B8860B 70%, 
                #8B6914 100%)
            `,
            boxShadow: `
              0 0 60px #DAA520,
              0 0 120px #FFD700,
              0 0 180px rgba(218, 165, 32, 0.6),
              inset 0 0 60px rgba(255, 215, 0, 0.5),
              inset 0 0 100px rgba(218, 165, 32, 0.8)
            `,
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Effet de brillance tournant */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Point lumineux central */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2 rounded-full bg-white"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            boxShadow: '0 0 30px 10px rgba(255, 255, 255, 0.8)',
          }}
        />
      </div>

      {/* Glyphes flottants autour de l'orbe */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`glyph-${i}`}
          className="absolute w-8 h-8 text-amber-300/70 text-2xl font-bold"
          style={{
            left: '50%',
            top: '50%',
            transform: `rotate(${i * 45}deg) translate(140px) rotate(-${i * 45}deg)`,
            textShadow: '0 0 20px rgba(218, 165, 32, 0.8)',
          }}
          animate={{
            opacity: [0.4, 0.9, 0.4],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        >
          {['☽', '☼', '⭐', '✦', '◈', '◇', '○', '●'][i]}
        </motion.div>
      ))}

      {/* Texte de divination */}
      <div className="absolute bottom-32 text-center px-8">
        <motion.h2
          key={msg}
          className="text-4xl md:text-5xl font-bold mb-4"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 0 30px rgba(218,165,32,0.8), 0 0 60px rgba(255,215,0,0.6)',
            letterSpacing: '0.1em',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {msg}
        </motion.h2>
        
        <motion.p
          className="text-lg md:text-xl text-amber-200/80"
          style={{ 
            fontFamily: 'var(--font-cinzel-decorative), serif',
            textShadow: '0 0 15px rgba(218,165,32,0.6)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          Les esprits consultent les cartes pour vous...
        </motion.p>

        {/* Sablier animé */}
        <motion.div
          className="mt-8 mx-auto w-16 h-24 relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.8 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          {/* Cadre du sablier */}
          <div className="absolute inset-0 border-2 border-amber-400/60 rounded-lg" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 80% 45%, 20% 45%, 20% 55%, 80% 55%, 80% 100%, 20% 100%)' }}>
            {/* Sable supérieur */}
            <motion.div
              className="absolute top-2 left-2 right-2 h-10 bg-gradient-to-b from-amber-300 to-amber-500 rounded-t-lg"
              style={{ clipPath: 'polygon(25% 0%, 75% 0%, 75% 100%, 25% 100%)' }}
              animate={{ height: ['40px', '0px'] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
            {/* Sable inférieur */}
            <motion.div
              className="absolute bottom-2 left-2 right-2 bg-gradient-to-t from-amber-400 to-amber-600 rounded-b-lg"
              style={{ clipPath: 'polygon(25% 0%, 75% 0%, 75% 100%, 25% 100%)' }}
              animate={{ height: ['0px', '40px'] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
            {/* Fil de sable */}
            <motion.div
              className="absolute left-1/2 w-0.5 bg-amber-400 -ml-px"
              style={{ top: '45%', height: '10%' }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>

      {/* Styles CSS pour animations personnalisées */}
      <style>{`
        @keyframes mystical-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
          50% { transform: scale(1.1) rotate(180deg); opacity: 1; }
        }
        
        @keyframes particle-orbit {
          0% { transform: rotate(0deg) translateX(180px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(180px) rotate(-360deg); }
        }
        
        @keyframes runic-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(218,165,32,0.6); }
          50% { text-shadow: 0 0 30px rgba(218,165,32,1), 0 0 60px rgba(255,215,0,0.8); }
        }
      `}</style>
    </motion.div>
  );
}