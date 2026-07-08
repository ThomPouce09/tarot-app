'use client';

import { motion } from 'framer-motion';
import { useWaitMessages } from './use-wait-messages';

interface CrystalBallDivinationProps {
  isVisible: boolean;
}

export default function CrystalBallDivination({ isVisible }: CrystalBallDivinationProps) {
  const msg = useWaitMessages('crystal-ball-divination');
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

      {/* Boule de cristal de divination */}
      <div className="flex flex-col items-center justify-center">
        {/* Halo subtil autour de la boule */}
        <motion.div
          className="absolute w-[160px] h-[160px] -mt-[20px] rounded-full"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background: 'radial-gradient(circle, rgba(138,132,200,0.2) 0%, transparent 70%)',
            filter: 'blur(15px)',
          }}
        />

        {/* Boule de cristal principale */}
        <motion.div
          className="w-[120px] h-[120px] rounded-full relative z-10"
          style={{
            background: `
              radial-gradient(circle at 30% 30%,
                rgba(255,255,255,0.9) 0%,
                rgba(200,220,255,0.4) 15%,
                rgba(138,132,200,0.2) 40%,
                rgba(99,102,241,0.15) 60%,
                rgba(67,56,202,0.2) 80%,
                rgba(30,27,75,0.4) 100%)
            `,
            boxShadow: `
              0 0 40px rgba(99,102,241,0.3),
              0 0 80px rgba(139,92,246,0.2),
              inset 0 0 30px rgba(167,139,250,0.2),
              inset -10px -10px 20px rgba(67,56,202,0.3)
            `,
            backdropFilter: 'blur(5px)',
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {/* Reflet lumineux principal (highlight) */}
          <div
            className="absolute top-3 left-4 w-6 h-6 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
              filter: 'blur(1px)',
            }}
          />
          
          {/* Reflet secondaire */}
          <div
            className="absolute bottom-4 right-5 w-4 h-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(200,220,255,0.6) 0%, rgba(200,220,255,0) 70%)',
              filter: 'blur(2px)',
            }}
          />

          {/* Brume intérieure animée (effet de divination) */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(circle at 50% 50%,
                  rgba(139,92,246,0.15) 0%,
                  transparent 50%)
              `,
              filter: 'blur(8px)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Point lumineux central - scintillement */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-2 h-2 -ml-1 -mt-1 rounded-full bg-white"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              boxShadow: '0 0 20px 8px rgba(167,139,250,0.5)',
            }}
          />
        </motion.div>

        {/* Texte - Positionné SOUS la boule */}
        <motion.div
          className="text-center mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.p
            key={msg}
            className="text-xl md:text-2xl"
            style={{ 
              fontFamily: 'var(--font-cinzel), serif',
              color: '#a5b4fc',
              textShadow: '0 0 20px rgba(99,102,241,0.6)',
              letterSpacing: '0.05em',
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {msg}
          </motion.p>
        </motion.div>
      </div>

      {/* Styles CSS pour animations personnalisées */}
      <style>{`
        @keyframes crystal-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.95; }
        }
      `}</style>
    </motion.div>
  );
}