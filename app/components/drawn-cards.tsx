'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { DrawnCardData } from './tarot-app';
import CardFace from './card-face';
import { useState, useEffect, useRef } from 'react';

interface DrawnCardsProps {
  drawnCards: DrawnCardData[];
}

const POSITION_LABELS = ['Passé', 'Présent', 'Avenir'];
const POSITION_ICONS = ['☽', '☉', '★'];
const CARD_BACK_URL = 'https://cdn.abacus.ai/images/00de34b4-d163-46d0-b0cc-503b5a314aec.png';

export default function DrawnCards({ drawnCards }: DrawnCardsProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);
  
  return (
    <div
      className="absolute left-0 right-0 z-25 flex justify-center items-start px-2 sm:px-4"
      style={{ 
        zIndex: 25, 
        top: '18vh',
        // IMPORTANT: Overflow visible mais avec contrainte pour mobile
        maxWidth: isMobile ? '100vw' : '1200px',
        margin: '0 auto',
      }}
    >
      {[0, 1, 2].map((position) => {
        const drawnCard = drawnCards.find((c) => c.position === position) ?? null;
        return (
          <div 
            key={position} 
            style={{ 
              flex: '0 0 auto',
              // Réduire l'espacement sur mobile pour éviter l'overflow
              marginRight: isMobile && position < 2 ? '8px' : '0',
            }}
          >
            <DrawnCardSlot
              position={position}
              drawnCard={drawnCard}
              isMobile={isMobile}
            />
          </div>
        );
      })}
    </div>
  );
}

interface DrawnCardSlotProps {
  position: number;
  drawnCard: DrawnCardData | null;
  isMobile: boolean;
}

function DrawnCardSlot({ position, drawnCard, isMobile }: DrawnCardSlotProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFace, setShowFace] = useState(false);
  const prevCardRef = useRef<DrawnCardData | null>(null);

  useEffect(() => {
    if (!drawnCard) {
      setIsFlipped(false);
      setShowFace(false);
      prevCardRef.current = null;
    } else if (drawnCard !== prevCardRef.current) {
      prevCardRef.current = drawnCard;
      setIsFlipped(false);
      setShowFace(false);
    }
  }, [drawnCard]);

  const handleAnimationComplete = () => {
    if (drawnCard && !isFlipped) {
      setTimeout(() => {
        setIsFlipped(true);
        setTimeout(() => setShowFace(true), 500);
      }, 200);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      {/* Position label */}
      <motion.div
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.7)',
          border: '2px solid rgba(218,165,32,0.5)',
          backdropFilter: 'blur(6px)',
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 + position * 0.2 }}
      >
        <span style={{ color: '#DAA520', fontSize: '12px sm:14px' }}>{POSITION_ICONS[position]}</span>
        <span
          className="text-xs sm:text-sm md:text-base tracking-widest uppercase font-bold"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#DAA520',
            textShadow: '0 0 10px rgba(218,165,32,0.6)',
          }}
        >
          {POSITION_LABELS[position]}
        </span>
      </motion.div>

      {/* Card slot - AGRANDI (ajusté mobile pour éviter overflow) */}
      <div 
        className="relative" 
        style={{ 
          perspective: '1000px',
          // Mobile: réduit pour tenir dans l'écran sans overflow
          // Desktop: grandi pour être impressionnant
          width: isMobile ? '110px' : '240px',
          height: isMobile ? '165px' : '360px',
        }}
      >
        {!drawnCard ? (
          <motion.div
            className="w-full h-full rounded-lg slot-empty"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + position * 0.15 }}
          />
        ) : (
          <motion.div
            className="w-full h-full rounded-lg"
            initial={{ opacity: 0, scale: 0.3, y: 300 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 180,
              damping: 18,
              duration: 0.7,
            }}
            onAnimationComplete={handleAnimationComplete}
          >
            <div className="absolute inset-0 rounded-lg mystic-glow" style={{ zIndex: 0 }} />

            <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
              <div
                className="card-face card-back"
                style={{
                  backgroundImage: `url(${CARD_BACK_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '2px solid rgba(218,165,32,0.5)',
                }}
              />
              <div className="card-face card-front">
                <CardFace card={drawnCard.card} reversed={drawnCard.reversed} />
              </div>
            </div>

            {/* Sparkles */}
            <AnimatePresence>
              {isFlipped && (
                <>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={`sparkle-${position}-${i}`}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${10 + (i * 80 / 8)}%`,
                        top: `${15 + (i % 3) * 30}%`,
                        color: '#DAA520',
                        fontSize: '14px',
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        y: [0, -35],
                      }}
                      transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeOut' }}
                    >
                      ✦
                    </motion.div>
                  ))}
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Card name */}
      <AnimatePresence>
        {showFace && drawnCard && (
          <motion.div
            className="text-center max-w-[80px] sm:max-w-[120px] md:max-w-[150px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="text-[9px] sm:text-[10px] md:text-xs font-semibold leading-tight"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: '#DAA520',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              {drawnCard.card.name}
            </p>
            {drawnCard.reversed && (
              <span className="text-[8px] sm:text-[9px] italic" style={{ color: 'rgba(218,165,32,0.6)' }}>
                (Inversée)
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
