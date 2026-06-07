'use client';

import { motion } from 'framer-motion';

interface QuickDivinationProps {
  isVisible: boolean;
}

export default function QuickDivination({ isVisible }: QuickDivinationProps) {
  return (
    <motion.div 
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.05 }}
      className="fixed inset-0 z-[10000] bg-black flex items-center justify-center"
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
      {/* Orbe simple - juste un div avec gradient */}
      <div className="relative">
        <div 
          className="w-40 h-40 rounded-full"
          style={{
            background: 'radial-gradient(circle, #FFD700 0%, #DAA520 50%, transparent 80%)',
            boxShadow: '0 0 100px #DAA520, 0 0 200px #FFD700',
          }}
        />
        {/* Anneau simple avec animation CSS inline */}
        <div 
          className="absolute inset-0 w-64 h-64 -ml-12 -mt-12 border-2 border-amber-400/40 rounded-full"
          style={{
            boxShadow: '0 0 30px rgba(218,165,32,0.6)',
            animation: 'kd-spin 10s linear infinite',
          }}
        />
      </div>
      
      {/* Texte simple */}
      <div className="absolute bottom-40 text-center">
        <h2 
          className="text-3xl font-bold text-amber-300"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
            textShadow: '0 0 30px rgba(218,165,32,0.8)',
          }}
        >
          Divination en cours...
        </h2>
      </div>
      
      {/* Styles globaux injectés */}
      <style>{`
        @keyframes kd-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes kd-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}