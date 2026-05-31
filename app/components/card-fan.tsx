'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface CardFanProps {
  availableIndices: Set<number>;
  onCardDrawn: (index: number) => void;
  disabled: boolean;
}

const CARD_BACK_URL = 'https://cdn.abacus.ai/images/00de34b4-d163-46d0-b0cc-503b5a314aec.png';
const TOTAL_CARDS = 78;

export default function CardFan({ availableIndices, onCardDrawn, disabled }: CardFanProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [removedCards, setRemovedCards] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Card sizes - AUGMENTÉ pour occuper le tiers inférieur
  // Mobile: ×1.8, Desktop: ×2.0 par rapport à l'original
  const CARD_W = isMobile ? 95 : 160;  // was: 60/95
  const CARD_H = isMobile ? 142 : 240; // was: 90/143
  const OVERLAP = isMobile ? -35 : -55; // was: -22/-32 (augmenté pour compenser)

  const visibleCards = useMemo(() => {
    return Array.from({ length: TOTAL_CARDS }, (_, i) => i)
      .filter((i) => availableIndices.has(i) && !removedCards.has(i));
  }, [availableIndices, removedCards]);

  // ========== ARC DE L'ÉVENTAIL - Plus prononcé et esthétique ==========
  // Gentle arc for visual appeal - VERSION AUGMENTÉE
  const getCardStyle = useCallback((displayIndex: number, total: number) => {
    const fraction = total > 1 ? displayIndex / (total - 1) : 0.5;
    const centered = fraction - 0.5; // -0.5 to 0.5
    
    // Arc BEAUCOUP plus prononcé (×2.5 par rapport à l'original)
    // Forme bien incurvée en demi-cercle
    const arcY = Math.cos(centered * Math.PI) * 45; // was: 18 ( Courier: -55px au centre)
    
    // Rotation accentuée pour suivre la courbe (×2 par rapport à l'original)
    const rotation = centered * 45; // was: 20 (total: -22.5° to +22.5°)
    
    return { arcY: -arcY, rotation };
  }, []);

  // ========== SCROLL: mouse wheel scrolls horizontally ==========
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      // If shift is held or deltaX is non-zero, it's a natural horizontal scroll
      // Otherwise convert vertical scroll to horizontal
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return; // let native handle it
      }
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY * 2;
    }
  }, []);

  // ========== PINCH ZOOM (touch) ==========
  const getTouchDist = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStart.current = { dist: getTouchDist(e.touches), zoom };
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches);
      const scale = newDist / pinchStart.current.dist;
      setZoom(Math.max(1, Math.min(3, pinchStart.current.zoom * scale)));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchStart.current = null;
  }, []);

  // ========== CARD SELECTION (click/tap) ==========
  const handleCardClick = useCallback((originalIndex: number) => {
    if (disabled) return;

    if (confirmIndex === originalIndex) {
      // Second click = confirm extraction
      setRemovedCards((prev) => new Set(prev).add(originalIndex));
      onCardDrawn(originalIndex);
      setConfirmIndex(null);
      setHoveredIndex(null);
    } else {
      // First click = highlight and show confirm
      setConfirmIndex(originalIndex);
    }
  }, [disabled, confirmIndex, onCardDrawn]);

  // Dismiss confirm if clicking elsewhere
  const handleBackgroundClick = useCallback(() => {
    setConfirmIndex(null);
  }, []);

  return (
    <div
      className="relative w-full"
      // HAUTEUR AUGMENTÉE: tiers de l'écran + padding bas pour espace esthétique
      style={{ 
        height: isMobile ? '55vh' : '60vh', // was: 42vh/48vh
        paddingBottom: isMobile ? '8vh' : '10vh' // Espace esthétique en bas
      }}
      onClick={handleBackgroundClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Glow under the cards */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '130%',
          height: '70%',
          background: 'radial-gradient(ellipse at center bottom, rgba(218,165,32,0.1) 0%, transparent 60%)',
        }}
      />

      {/* Zoom indicator */}
      {zoom > 1.05 && (
        <div className="absolute top-1 right-2 z-30 flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[10px]"
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: 'rgba(218,165,32,0.8)',
              border: '1px solid rgba(218,165,32,0.3)',
              fontFamily: 'var(--font-cinzel), serif',
            }}
          >
            ×{zoom.toFixed(1)}
          </span>
          <button
            className="px-2 py-0.5 rounded-full text-[10px]"
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#DAA520',
              border: '1px solid rgba(218,165,32,0.3)',
              fontFamily: 'var(--font-cinzel), serif',
              cursor: 'pointer',
            }}
            onClick={(e) => { e.stopPropagation(); setZoom(1); }}
          >
            Réinitialiser
          </button>
        </div>
      )}

      {/* Scroll hint */}
      {!disabled && zoom <= 1.05 && (
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 rounded-full text-[9px] sm:text-[10px]"
          style={{
            background: 'rgba(0,0,0,0.45)',
            color: 'rgba(255,255,255,0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'var(--font-cinzel), serif',
          }}
        >
          {isMobile ? 'Glissez ↔ · Pincez pour zoomer' : 'Molette ↔ pour défiler · Ctrl+molette pour zoomer'}
        </div>
      )}

      {/* Scrollable card strip */}
      <div
        ref={scrollRef}
        className="absolute bottom-0 left-0 right-0 overflow-x-auto overflow-y-hidden fan-scroll"
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: isMobile ? '10px' : '16px',
          WebkitOverflowScrolling: 'touch',
        }}
        onWheel={handleWheel}
      >
        {/* Leading spacer */}
        <div style={{ minWidth: 'max(60px, calc(50vw - 150px))', flexShrink: 0 }} />

        {/* Zoomable inner container */}
        <div
          className="flex items-end flex-shrink-0"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center bottom',
            transition: 'transform 0.2s ease-out',
          }}
        >
          {visibleCards.map((originalIndex, displayIndex) => {
            const { arcY, rotation } = getCardStyle(displayIndex, visibleCards.length);
            const isHovered = hoveredIndex === originalIndex;
            const isConfirm = confirmIndex === originalIndex;

            return (
              <div
                key={originalIndex}
                className={`flex-shrink-0 relative ${disabled ? '' : 'cursor-pointer'}`}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: displayIndex === 0 ? 0 : OVERLAP,
                  transform: `
                    translateY(${arcY + (isConfirm ? -25 : isHovered ? -12 : 0)}px)
                    rotate(${isConfirm ? 0 : rotation}deg)
                    scale(${isConfirm ? 1.2 : isHovered ? 1.08 : 1})
                  `,
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                  zIndex: isConfirm ? 200 : isHovered ? 100 : 10 + displayIndex,
                  transformOrigin: 'center bottom',
                }}
                onClick={(e) => { e.stopPropagation(); handleCardClick(originalIndex); }}
                onMouseEnter={() => !disabled && setHoveredIndex(originalIndex)}
                onMouseLeave={() => { setHoveredIndex(null); }}
              >
                {/* Card */}
                <div
                  className="w-full h-full rounded-md sm:rounded-lg overflow-hidden card-shimmer"
                  style={{
                    boxShadow: isConfirm
                      ? '0 15px 40px rgba(0,0,0,0.7), 0 0 35px rgba(218,165,32,0.5)'
                      : isHovered
                      ? '0 8px 25px rgba(0,0,0,0.6), 0 0 15px rgba(218,165,32,0.25)'
                      : '0 2px 8px rgba(0,0,0,0.5)',
                    border: `${isConfirm ? '2px' : '1px'} solid rgba(218,165,32,${isConfirm ? 0.8 : isHovered ? 0.35 : 0.15})`,
                  }}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={CARD_BACK_URL}
                      alt="Carte de tarot"
                      fill
                      className="object-cover pointer-events-none"
                      sizes={`${CARD_W * 2}px`}
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Confirm overlay */}
                <AnimatePresence>
                  {isConfirm && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center rounded-md sm:rounded-lg"
                      style={{
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(2px)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        className="flex flex-col items-center gap-1"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                      >
                        <span
                          className="text-[9px] sm:text-[10px] md:text-xs font-bold tracking-wide uppercase"
                          style={{ color: '#DAA520', fontFamily: 'var(--font-cinzel), serif', textShadow: '0 0 10px rgba(218,165,32,0.6)' }}
                        >
                          Tirer ?
                        </span>
                        <motion.div
                          className="text-lg sm:text-xl"
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          ✨
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Glow ring on confirm */}
                {isConfirm && (
                  <div
                    className="absolute inset-[-3px] rounded-md sm:rounded-lg pointer-events-none"
                    style={{
                      boxShadow: '0 0 25px rgba(218,165,32,0.6), inset 0 0 15px rgba(218,165,32,0.15)',
                      border: '1px solid rgba(218,165,32,0.4)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Trailing spacer */}
        <div style={{ minWidth: 'max(60px, calc(50vw - 150px))', flexShrink: 0 }} />
      </div>
    </div>
  );
}
