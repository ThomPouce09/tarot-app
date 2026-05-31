'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { CONFIG, CARD_FAN, ARC } from '@/lib/config';

interface CardFanProps {
  availableIndices: Set<number>;
  onCardDrawn: (index: number) => void;
  disabled: boolean;
}

const CARD_BACK_URL = 'https://cdn.abacus.ai/images/00de34b4-d163-46d0-b0cc-503b5a314aec.png';
const TOTAL_CARDS = CONFIG.GAME.totalCards;

export default function CardFan({ availableIndices, onCardDrawn, disabled }: CardFanProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [removedCards, setRemovedCards] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  // Drag & Drop state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; cardIndex: number } | null>(null);
  const draggedCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Dimensions from config
  const cardConfig = isMobile ? CARD_FAN.mobile : CARD_FAN.desktop;
  const arcConfig = isMobile ? ARC.mobile : ARC.desktop;
  const CARD_W = cardConfig.width;
  const CARD_H = cardConfig.height;
  const OVERLAP = cardConfig.overlap;

  const visibleCards = useMemo(() => {
    return Array.from({ length: TOTAL_CARDS }, (_, i) => i)
      .filter((i) => availableIndices.has(i) && !removedCards.has(i));
  }, [availableIndices, removedCards]);

  // ========== ARC DE L'ÉVENTAIL - Très prononcé ==========
  const getCardStyle = useCallback((displayIndex: number, total: number) => {
    const fraction = total > 1 ? displayIndex / (total - 1) : 0.5;
    const centered = fraction - 0.5; // -0.5 to 0.5
    
    // Arc très prononcé (comme un paquet tendu)
    const arcY = Math.cos(centered * Math.PI) * arcConfig.amplitude;
    
    // Rotation accentuée pour suivre la courbe
    const rotation = centered * arcConfig.rotation * 2;
    
    return { arcY: -arcY, rotation };
  }, [arcConfig]);

  // ========== SCROLL horizontal ==========
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }
      e.preventDefault();
      scrollRef.current.scrollLeft += e.deltaY * 2;
    }
  }, []);

  // ========== PINCH ZOOM ==========
  const getTouchDist = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartRef.current = { dist: getTouchDist(e.touches), zoom };
    } else if (e.touches.length === 1 && !disabled) {
      // Début du drag tactile
      const touch = e.touches[0];
      const cardIndex = getCardIndexFromTouch(touch);
      if (cardIndex !== null) {
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          cardIndex,
        };
      }
    }
  }, [disabled, zoom, visibleCards]);

  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches);
      const scale = newDist / pinchStartRef.current.dist;
      setZoom(Math.max(1, Math.min(3, pinchStartRef.current.zoom * scale)));
    } else if (e.touches.length === 1 && dragStartRef.current && !draggingIndex) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      const distance = Math.hypot(dx, dy);
      
      // Seuil pour commencer le drag
      if (distance > CONFIG.DRAG.minDragDistance) {
        setDraggingIndex(dragStartRef.current.cardIndex);
        setDragPosition({ x: touch.clientX, y: touch.clientY });
        e.preventDefault();
      }
    } else if (draggingIndex && dragPosition) {
      const touch = e.touches[0];
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      e.preventDefault();
    }
  }, [draggingIndex, dragPosition]);

  const handleTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
    
    if (draggingIndex !== null && dragPosition) {
      // Vérifier si relâché dans la zone de tirage
      const releasedInDrawZone = dragPosition.y < window.innerHeight * 0.4;
      
      if (releasedInDrawZone) {
        // Carte validée
        setRemovedCards((prev) => new Set(prev).add(draggingIndex));
        onCardDrawn(draggingIndex);
      }
      
      // Reset du drag
      setDraggingIndex(null);
      setDragPosition(null);
      dragStartRef.current = null;
    }
  }, [draggingIndex, dragPosition, onCardDrawn]);

  // ========== DESKTOP: Mouse Drag ==========
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (disabled) return;
    e.preventDefault();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cardIndex: index,
    };
    setDraggingIndex(index);
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, [disabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingIndex !== null && dragStartRef.current) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  }, [draggingIndex]);

  const handleMouseUp = useCallback(() => {
    if (draggingIndex !== null && dragPosition) {
      const releasedInDrawZone = dragPosition.y < window.innerHeight * 0.4;
      
      if (releasedInDrawZone) {
        setRemovedCards((prev) => new Set(prev).add(draggingIndex));
        onCardDrawn(draggingIndex);
      }
      
      setDraggingIndex(null);
      setDragPosition(null);
      dragStartRef.current = null;
    }
  }, [draggingIndex, dragPosition, onCardDrawn]);

  // Helper pour trouver quelle carte est touchée
  const getCardIndexFromTouch = (touch: React.Touch): number | null => {
    // Implementation simplifiée - en prod, utiliser une logic plus précise
    return visibleCards[0]; // Pour l'exemple
  };

  // ========== RENDER ==========
  return (
    <div
      className="relative w-full"
      style={{ 
        height: `calc(${CONFIG.SECTIONS.fan}vh - ${CONFIG.SECTIONS.bottomPadding}vh)`,
        paddingTop: '15vh',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hint de drag */}
      {!disabled && !draggingIndex && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none">
          <p
            className="text-xs sm:text-sm font-semibold"
            style={{
              color: 'rgba(218,165,32,0.8)',
              fontFamily: 'var(--font-cinzel), serif',
              textShadow: '0 0 10px rgba(218,165,32,0.5)',
            }}
          >
            🖐️ Glissez une carte vers le haut pour la tirer
          </p>
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
          paddingBottom: isMobile ? '10vh' : '12vh',
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
            const isDragging = draggingIndex === originalIndex;
            
            return (
              <div
                key={originalIndex}
                className={`flex-shrink-0 relative cursor-grab active:cursor-grabbing`}
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: displayIndex === 0 ? 0 : OVERLAP,
                  transform: isDragging 
                    ? 'scale(1.1) rotate(0deg)' 
                    : `translateY(${arcY}px) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.25s ease',
                  zIndex: isDragging ? 1000 : 10 + displayIndex,
                  transformOrigin: 'center bottom',
                }}
                onMouseDown={(e) => handleMouseDown(e, originalIndex)}
              >
                {/* Card */}
                <div
                  className="w-full h-full rounded-lg overflow-hidden card-shimmer"
                  style={{
                    boxShadow: isDragging
                      ? '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(218,165,32,0.6)'
                      : '0 2px 8px rgba(0,0,0,0.5)',
                    border: isDragging 
                      ? '2px solid rgba(218,165,32,0.8)' 
                      : '1px solid rgba(218,165,32,0.15)',
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

                {/* Drag indicator overlay */}
                {isDragging && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'rgba(218,165,32,0.1)',
                      border: '3px solid rgba(218,165,32,0.8)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Trailing spacer */}
        <div style={{ minWidth: 'max(60px, calc(50vw - 150px))', flexShrink: 0 }} />
      </div>

      {/* Dragged card ghost (follows cursor/finger) */}
      <AnimatePresence>
        {draggingIndex !== null && dragPosition && (
          <motion.div
            className="fixed pointer-events-none z-50"
            style={{
              width: CARD_W,
              height: CARD_H,
              left: dragPosition.x - CARD_W / 2,
              top: dragPosition.y - CARD_H / 2,
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ 
              x: 0,
              y: 0,
              scale: 1.1,
              opacity: 0.95,
            }}
            exit={{ 
              scale: 1,
              opacity: 0,
              transition: { duration: 0.2 },
            }}
          >
            <div
              className="w-full h-full rounded-lg overflow-hidden"
              style={{
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(218,165,32,0.6)',
                border: '3px solid rgba(218,165,32,0.9)',
              }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={CARD_BACK_URL}
                  alt="Carte de tarot"
                  fill
                  className="object-cover"
                  sizes={`${CARD_W * 2}px`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}