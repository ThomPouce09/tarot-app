'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TAROT_CARDS, TarotCard } from '@/lib/tarot-data';
import CardFan from './card-fan';
import DrawnCards from './drawn-cards';
import InterpretationModal from './interpretation-modal';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export interface DrawnCardData {
  card: TarotCard;
  reversed: boolean;
  position: number;
}

const TABLE_BG = '/backgrounds/table-tarot-bg.jpg';
const TABLE_BG_WITH_VERSION = '/backgrounds/table-tarot-bg.jpg?v=5';

// Cinematic phases: 0=black, 1=table far, 2=zoom in, 3=ready
type CinematicPhase = 0 | 1 | 2 | 3;

export default function TarotApp() {
  const router = useRouter();
  const [drawnCards, setDrawnCards] = useState<DrawnCardData[]>([]);
  const [availableIndices, setAvailableIndices] = useState<Set<number>>(
    new Set(Array.from({ length: 78 }, (_, i) => i))
  );
  const usedCardIds = useRef<Set<number>>(new Set());
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>(0);
  const [showHint, setShowHint] = useState(true);  // Zone E : toujours affichée
  const [blinkHint, setBlinkHint] = useState(false);  // Zone E : mode clignotement
  const [resetSignal, setResetSignal] = useState(0);  // Signal pour reset CardFan

  // Cinematic sequence
  useEffect(() => {
    const t1 = setTimeout(() => setCinematicPhase(1), 300);    // fade from black
    const t2 = setTimeout(() => setCinematicPhase(2), 1200);   // start zoom in
    const t3 = setTimeout(() => setCinematicPhase(3), 3000);   // fully revealed
    
    // Zone E: Clignotement 3 fois pour attirer l'attention, puis reste affichée
    const t4 = setTimeout(() => {
      setBlinkHint(true);  // Commence à clignoter
      
      const blinkInterval = setInterval(() => {
        setBlinkHint((prev) => !prev);  // Alterne on/off
      }, 300);  // Clignote toutes les 300ms
      
      // Arrête de clignoter après 3 clignotements (environ 2s) et reste affichée
      const stopBlinkTimeout = setTimeout(() => {
        clearInterval(blinkInterval);
        setBlinkHint(false);  // Reste affichée sans clignoter
      }, 1800);  // 3 clignotements = 6 alternances * 300ms
      
      return () => {
        clearInterval(blinkInterval);
        clearTimeout(stopBlinkTimeout);
      };
    }, 3500);  // Commence après la cinématique (3s + 0.5s de délai)
    
    // Cleanup function for useEffect
    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearTimeout(t3); 
      clearTimeout(t4); 
    };
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
    usedCardIds.current = new Set();
    setAvailableIndices(new Set(Array.from({ length: 78 }, (_, i) => i)));
    setResetSignal((prev) => prev + 1);  // Force CardFan à réinitialiser son state
  }, []);

  const allDrawn = drawnCards.length >= 3;
  const isReady = cinematicPhase >= 3;

  // Sauvegarder le tirage dans la DB quand il est complet
  useEffect(() => {
    if (allDrawn && drawnCards.length === 3) {
      const saveReading = async () => {
        try {
          const payload = {
            spread: 'past_present_future',
            cards: drawnCards.map((dc, idx) => ({
              id: dc.card.id,
              name: dc.card.name,
              position: ['past', 'present', 'future'][idx],
              reversed: dc.reversed,
            })),
          };
          
          const response = await fetch('/api/readings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          const result = await response.json();
          console.log('Tirage sauvegardé:', result);
        } catch (error) {
          console.error('Erreur sauvegarde:', error);
        }
      };
      
      saveReading();
    }
  }, [allDrawn, drawnCards]);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: '#0a0604' }}>
      {/* ========== CINEMATIC BACKGROUND ========== */}
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: cinematicPhase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="relative w-full h-full"
          initial={{ scale: 0.92 }}
          animate={{ scale: cinematicPhase >= 2 ? 1.08 : 0.92 }}
          transition={{ duration: cinematicPhase >= 2 ? 2.2 : 0.8, ease: 'easeOut' }}
        >
          <Image
            src={TABLE_BG_WITH_VERSION}
            alt="Table en bois rustique"
            fill
            className="object-cover"
            style={{
              objectPosition: 'center 22%',
              transform: 'scale(1.0)',
              filter: 'brightness(1.08) contrast(1.06) saturate(1.08)',
            }}
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/15" />
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse at center 44%, transparent 45%, rgba(0,0,0,0.18) 100%)'
          }} />
        </motion.div>
      </motion.div>

      {/* ========== TITLE - Zone A : remontée ========== */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-30 text-center"
        style={{ top: '4%', transform: 'translateY(-50%)' }}
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
          className="text-sm sm:text-base md:text-lg mt-3 font-semibold"
          style={{ 
            color: '#FFD700',  // Or plus clair et brillant
            fontFamily: 'var(--font-cinzel), serif',
            textShadow: '0 0 15px rgba(255,215,0,0.8), 0 0 30px rgba(218,165,32,0.6), 0 2px 8px rgba(0,0,0,0.9)',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            padding: '4px 12px',
            borderRadius: '12px',
            display: 'inline-block',
          }}
        >
          {allDrawn
            ? 'Votre tirage est complet ✨'
            : `${3 - drawnCards.length} carte${(3 - drawnCards.length) > 1 ? 's' : ''} à tirer`}
        </motion.p>
      </motion.div>

      {/* ========== DRAWN CARDS - Zone D : descendue ========== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        <DrawnCards drawnCards={drawnCards} />
      </motion.div>

      {/* ========== CARD FAN - Zone F : descendue ========== */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : 60 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="absolute bottom-0 left-0 right-0"
        style={{ zIndex: 20 }}
      >
        <CardFan
          key={resetSignal}  // Force re-mount au reset pour réinitialiser removedCards
          availableIndices={Array.from(availableIndices)}
          onCardDrawn={handleCardDrawn}
          disabled={allDrawn}
          drawnCardsCount={drawnCards.length}
          drawnCardIndices={drawnCards.map(dc => dc.card.id)}
          drawnCards={drawnCards}  // <-- NOUVEAU : passe les cartes tirées
          showHint={showHint && !allDrawn}
          blinkHint={blinkHint}
          onReturnToHome={() => {
            router.push('/');  // Retour à la landing page
          }}
        />
      </motion.div>

      {/* ========== INTERPRETATION ZONE - Affichage direct sous les cartes ========== */}
      {/* Géré directement dans CardFan */}

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