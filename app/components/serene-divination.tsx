'use client';

import { motion } from 'framer-motion';

interface SereneDivinationProps {
  isVisible: boolean;
}

export default function SereneDivination({ isVisible }: SereneDivinationProps) {
  return (
    <motion.div 
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[10000] bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center overflow-hidden"
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
      {/* Fond étoilé discret */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-blue-200/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Support en bois foncé */}
      <div className="absolute bottom-20 w-[400px] h-[40px] bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 rounded-lg opacity-80"
        style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 2px 10px rgba(139,69,19,0.3)',
          background: `
            linear-gradient(90deg, 
              #1a0f0a 0%, 
              #3d2317 20%, 
              #5c3327 40%, 
              #3d2317 60%, 
              #2a1810 80%, 
              #1a0f0a 100%)
          `,
        }}
      >
        {/* Grain du bois */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(92,51,39,0.3) 2px,
            rgba(92,51,39,0.3) 4px
          )`,
        }} />
      </div>

      {/* Orbe centrale - petite et discrète */}
      <div className="relative -mt-20">
        {/* Halo extérieur subtil */}
        <motion.div
          className="absolute inset-0 w-[120px] h-[120px] -ml-[20px] -mt-[20px] rounded-full"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: 'radial-gradient(circle, rgba(138,132,200,0.3) 0%, transparent 70%)',
            filter: 'blur(10px)',
          }}
        />

        {/* Halo intérieur violet */}
        <motion.div
          className="absolute inset-0 w-[100px] h-[100px] -ml-[10px] -mt-[10px] rounded-full"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          style={{
            background: 'radial-gradient(circle, rgba(147,51,234,0.4) 0%, transparent 70%)',
            filter: 'blur(8px)',
          }}
        />

        {/* Orbe principale - bleue/violette */}
        <motion.div
          className="w-[80px] h-[80px] rounded-full relative"
          style={{
            background: `
              radial-gradient(circle at 35% 35%, 
                #e0e7ff 0%, 
                #a5b4fc 25%, 
                #6366f1 45%, 
                #4c1d95 70%, 
                #1e1b4b 100%)
            `,
            boxShadow: `
              0 0 30px rgba(99,102,241,0.4),
              0 0 60px rgba(139,92,246,0.3),
              inset 0 0 20px rgba(167,139,250,0.3)
            `,
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Point lumineux central - scintillement discret */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-blue-100"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              boxShadow: '0 0 15px 5px rgba(167,139,250,0.6)',
            }}
          />
        </motion.div>
      </div>

      {/* Texte */}
      <div className="absolute bottom-10 text-center px-8">
        <motion.p
          className="text-xl md:text-2xl"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
            color: '#a5b4fc',
            textShadow: '0 0 20px rgba(99,102,241,0.5)',
            letterSpacing: '0.05em',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Etude du tirage en cours...
        </motion.p>
      </div>

      {/* Styles CSS pour animations personnalisées */}
      <style>{`
        @keyframes gentle-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.05); opacity: 0.6; }
        }
      `}</style>
    </motion.div>
  );
}