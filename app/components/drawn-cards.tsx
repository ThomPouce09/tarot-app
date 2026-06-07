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
        top: '28vh',  // Descendu de 22vh à 28vh pour mieux centrer sur le tapis violet
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
    <div className="flex flex-col items-center gap-2 sm:gap-3" style={{ marginTop: '-20px', marginBottom: '20px' }}>
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
          height: isMobile ? '185px' : '405px',  // ratio 0.595 pour matcher PNG (764x1286)
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
                    // Positions aléatoires mais réparties sur la carte
                    const leftPos = 5 + (i * 90 / 12);
                    const topPos = 10 + ((i * 7) % 5) * 18;
                    
                    // Variations de couleurs dorées
                    const goldColors = [
                      '#FFD700',  // Or pur
                      '#DAA520',  // Solid gold
                      '#FFA500',  // Orange doré
                      '#FFE57C',  // Or clair
                      '#FDB931',  // Or intense
                    ];
                    const randomColor = goldColors[i % goldColors.length];
                    
                    // Variations de taille
                    const sizes = ['6px', '7px', '8px', '6px', '7px'];
                    const randomSize = sizes[i % sizes.length];
                    
                    // Délais décalés pour effet vague
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
          <CardNameLabel cardName={drawnCard.card.name} isMobile={isMobile} />
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
  // Largeur du conteneur basée sur la taille de l'écran
  const containerWidth = isMobile ? '90px' : '180px';
  
  // Calcul dynamique de la taille de police avec clamp()
  // Plus le nom est long, plus la police réduit (dans des limites raisonnables)
  const nameLength = cardName.length;
  const baseFontSize = isMobile ? 9 : 11;
  const minFontSize = isMobile ? 7 : 9;
  const maxFontSize = isMobile ? 10 : 12;
  
  // Réduction progressive de la taille selon la longueur du nom
  const adjustedFontSize = nameLength > 20 
    ? Math.max(minFontSize, baseFontSize - (nameLength - 20) * 0.3)
    : baseFontSize;
  
  // Autoriser le retour à la ligne pour les noms très longs
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
