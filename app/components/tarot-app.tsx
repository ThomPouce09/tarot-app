'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TAROT_CARDS, TarotCard } from '@/lib/tarot-data';
import CardFan from './card-fan';
import DrawnCards from './drawn-cards';
import InterpretationPanel from './interpretation-panel';
import Image from 'next/image';

export interface DrawnCardData {
  card: TarotCard;
  reversed: boolean;
  position: number;
}

const TABLE_BG = 'https://cdn.abacus.ai/images/fa15d4d8-3350-4925-96db-6e3c7d57c889.png';

// Cinematic phases: 0=black, 1=table far, 2=zoom in, 3=ready
type CinematicPhase = 0 | 1 | 2 | 3;

export default function TarotApp() {
  const [drawnCards, setDrawnCards] = useState<DrawnCardData[]>([]);
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [availableIndices, setAvailableIndices] = useState<Set<number>>(
    new Set(Array.from({ length: 78 }, (_, i) => i))
  );
  const usedCardIds = useRef<Set<number>>(new Set());
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>(0);

  // Cinematic sequence
  useEffect(() => {
    const t1 = setTimeout(() => setCinematicPhase(1), 300);    // fade from black
    const t2 = setTimeout(() => setCinematicPhase(2), 1200);   // start zoom
    const t3 = setTimeout(() => setCinematicPhase(3), 3000);   // fully revealed
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleCardDrawn = useCallback((fanIndex: number) => {
    setDrawnCards((prev) => {
      if (prev.length >= 3) return prev;
      const available = TAROT_CARDS.filter((c) => !usedCardIds.current.has(c.id));
      if (available.length === 0) return prev;
      const randomCard = available[Math.floor(Math.random() * available.length)];
      const reversed = Math.random() > 0.7;
      usedCardIds.current.add(randomCard.id);
      return [...prev, { card: randomCard, reversed, position: prev.length }];
    });
    setAvailableIndices((prev) => {
      const next = new Set(prev);
      next.delete(fanIndex);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setDrawnCards([]);
    setShowInterpretation(false);
    usedCardIds.current = new Set();
    setAvailableIndices(new Set(Array.from({ length: 78 }, (_, i) => i)));
  }, []);

  const allDrawn = drawnCards.length >= 3;
  const isReady = cinematicPhase >= 3;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: '#0a0604' }}>
      {/* ========== CINEMATIC BACKGROUND ========== */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1.8, opacity: 0 }}
        animate={{
          scale: cinematicPhase >= 2 ? 1 : 1.8,
          opacity: cinematicPhase >= 1 ? 1 : 0,
        }}
        transition={{ duration: cinematicPhase >= 2 ? 2 : 0.8, ease: 'easeOut' }}
      >
        <Image
          src={TABLE_BG}
          alt="Table en bois rustique"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/45" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center 50%, transparent 30%, rgba(0,0,0,0.5) 100%)'
        }} />
      </motion.div>

      {/* ========== TITLE - Plus gros et central ========== */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-30 text-center"
        style={{ top: '8%', transform: 'translateY(-50%)' }}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : -40 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <h1
          className="title-glow px-3 text-2xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wider uppercase"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: '#DAA520',
            letterSpacing: '0.15em',
            textShadow: '0 0 30px rgba(218,165,32,0.6), 0 0 60px rgba(218,165,32,0.3)',
          }}
        >
          Faites votre tirage de 3 cartes
        </h1>
        <motion.p
          className="text-sm sm:text-base md:text-lg mt-3"
          style={{ 
            color: 'rgba(218,165,32,0.7)', 
            fontFamily: 'var(--font-cinzel), serif',
            textShadow: '0 0 10px rgba(218,165,32,0.4)',
          }}
        >
          {allDrawn
            ? 'Votre tirage est complet ✨'
            : `${3 - drawnCards.length} carte${(3 - drawnCards.length) > 1 ? 's' : ''} à tirer`}
        </motion.p>
      </motion.div>

      {/* ========== DRAWN CARDS ========== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <DrawnCards drawnCards={drawnCards} />
      </motion.div>

      {/* ========== INTERPRETATION BUTTON ========== */}
      <AnimatePresence>
        {allDrawn && !showInterpretation && (
          <motion.div
            className="absolute z-40 flex justify-center"
            style={{ top: '40vh', left: 0, right: 0 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 1.5 }}
          >
            <motion.button
              onClick={() => setShowInterpretation(true)}
              className="px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg md:text-xl font-bold tracking-wide"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                background: 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)',
                color: '#1a0e0a',
                boxShadow: '0 0 40px rgba(218,165,32,0.5), 0 6px 20px rgba(0,0,0,0.6)',
                border: '2px solid rgba(218,165,32,0.4)',
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              ✨ Interprétation du tirage ✨
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== CARD FAN ========== */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : 60 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="absolute bottom-0 left-0 right-0"
        style={{ zIndex: 20 }}
      >
        <CardFan
          availableIndices={availableIndices}
          onCardDrawn={handleCardDrawn}
          disabled={allDrawn}
        />
      </motion.div>

      {/* ========== TUTORIAL HINT - Drag & Drop ========== */}
      <AnimatePresence>
        {isReady && !allDrawn && drawnCards.length === 0 && (
          <motion.div
            className="absolute z-35 pointer-events-none"
            style={{ bottom: '52vh', left: '50%', transform: 'translateX(-50%)', zIndex: 35 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <div className="flex flex-col items-center gap-3">
              <motion.p
                className="text-sm sm:text-base md:text-lg whitespace-nowrap px-5 py-2.5 rounded-full"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(0,0,0,0.7)',
                  border: '2px solid rgba(218,165,32,0.4)',
                  backdropFilter: 'blur(6px)',
                  textShadow: '0 0 10px rgba(218,165,32,0.5)',
                }}
              >
                🖐️ Glissez une carte vers le haut
              </motion.p>
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg width="28" height="32" viewBox="0 0 28 32" fill="none">
                  <path 
                    d="M14 4 L14 24" 
                    stroke="rgba(218,165,32,0.9)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    opacity="0.9" 
                  />
                  <path 
                    d="M6 16 L14 26 L22 16" 
                    stroke="rgba(218,165,32,0.9)" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    fill="none" 
                    opacity="0.9" 
                  />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== INTERPRETATION PANEL ========== */}
      <AnimatePresence>
        {showInterpretation && (
          <InterpretationPanel
            drawnCards={drawnCards}
            onClose={() => setShowInterpretation(false)}
            onReset={handleReset}
          />
        )}
      </AnimatePresence>

      {/* ========== CINEMATIC BLACK OVERLAY ========== */}
      <motion.div
        className="absolute inset-0 z-[60] pointer-events-none"
        style={{ background: '#0a0604' }}
        initial={{ opacity: 1 }}
        animate={{ opacity: cinematicPhase >= 1 ? 0 : 1 }}
        transition={{ duration: 1.2 }}
      />
    </div>
  );
}
