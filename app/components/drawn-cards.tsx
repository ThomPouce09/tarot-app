'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { DrawnCardData } from './tarot-app';
import CardFace from './card-face';
import { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/i18n';
import { cardDisplayName } from '@/lib/i18n/cards';

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
        top: '28vh',
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
  const lang = useLang();

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
    <div className="flex flex-col items-center gap-2 sm:gap-3" style={{ marginTop: '-20px', marginBottom: '20px' }}>
      {/* Position label - mis en valeur mobile */}
      <motion.div
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(218,165,32,0.5)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 + position * 0.2 }}
      >
        <span style={{ color: '#FFD700', fontSize: isMobile ? '12px' : '15px', textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>{POSITION_ICONS[position]}</span>
        <span
          className="text-xs sm:text-sm md:text-base tracking-widest uppercase font-bold"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 1px 1px rgba(0,0,0,0.3)',
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
          width: isMobile ? '110px' : '240px',
          height: isMobile ? '185px' : '405px',
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

            {/* Sparkles - Effet scintillant doré */}
            <AnimatePresence>
              {isFlipped && (
                <>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const leftPos = 5 + (i * 90 / 12);
                    const topPos = 10 + ((i * 7) % 5) * 18;

                    const goldColors = [
                      '#FFD700',
                      '#DAA520',
                      '#FFA500',
                      '#FFE57C',
                      '#FDB931',
                    ];
                    const randomColor = goldColors[i % goldColors.length];

                    const sizes = ['6px', '7px', '8px', '6px', '7px'];
                    const randomSize = sizes[i % sizes.length];

                    const delay = i * 0.05;

                    return (
                      <motion.div
                        key={`sparkle-${position}-${i}`}
                        className="absolute pointer-events-none"
                        style={{
                          left: `${leftPos}%`,
                          top: `${topPos}%`,
                          color: randomColor,
                          fontSize: randomSize,
                          textShadow: `0 0 8px ${randomColor}, 0 0 15px ${randomColor}80`,
                          filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.8))',
                        }}
                        initial={{ opacity: 0, scale: 0, rotate: 0 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          scale: [0, 1.2, 1, 0],
                          rotate: [0, 180, 360],
                          y: [0, -50 - (i % 3) * 20],
                          x: [(i % 2 === 0 ? -10 : 10), 0],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: delay,
                          ease: 'easeOut',
                        }}
                      >
                        ✦
                      </motion.div>
                    );
                  })}
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Card name - Zone C : noms des cartes sélectionnées */}
      <AnimatePresence>
        {showFace && drawnCard && (
          <CardNameLabel cardName={cardDisplayName(drawnCard.card, lang)} isMobile={isMobile} />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Composant intelligent pour l'affichage des noms de cartes
 * - Conteneur de largeur fixe adaptés à l'écran
 * - Police qui s'adapte dynamiquement (clamp CSS)
 * - Retour à la ligne automatique si nécessaire
 * - Background qui s'ajuste à la hauteur du contenu
 */
function CardNameLabel({ cardName, isMobile }: { cardName: string; isMobile: boolean }) {
  const containerWidth = isMobile ? '90px' : '180px';

  const nameLength = cardName.length;
  const baseFontSize = isMobile ? 9 : 11;
  const minFontSize = isMobile ? 7 : 9;

  const adjustedFontSize = nameLength > 20
    ? Math.max(minFontSize, baseFontSize - (nameLength - 20) * 0.3)
    : baseFontSize;

  const allowWrap = nameLength > 18;

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        width: containerWidth,
        maxWidth: '100%',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          fontWeight: 'bold',
          color: '#FFD700',
          textShadow: '0 0 10px rgba(218,165,32,0.8), 0 2px 6px rgba(0,0,0,0.9), 0 0 20px rgba(255,215,0,0.4)',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          padding: allowWrap ? '6px 10px' : '4px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(218,165,32,0.3)',
          fontSize: `${adjustedFontSize}px`,
          lineHeight: allowWrap ? '1.3' : '1',
          textAlign: 'center',
          whiteSpace: allowWrap ? 'normal' : 'nowrap',
          wordBreak: allowWrap ? 'break-word' : 'normal',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {cardName}
      </div>
    </motion.div>
  );
}