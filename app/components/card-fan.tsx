'use client';

import { useRef, useState, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { CONFIG, CARD_FAN, ARC, CARD_FAN_WIDE, CARD_FAN_CLASSIC, ARC_WIDE, ARC_CLASSIC } from '@/lib/config';
import { DrawnCardData } from './tarot-app';
import InterpretationModal from './interpretation-modal';
import QuickDivination from './quick-divination';
import MagicalDivination from './magical-divination';
import SereneDivination from './serene-divination';
import { createPortal } from 'react-dom';

interface CardFanProps {
  availableIndices: number[];
  onCardDrawn: (index: number) => void;
  disabled?: boolean;
  drawnCardsCount: number;
  drawnCardIndices?: number[];
  drawnCards?: DrawnCardData[];  // <-- NOUVEAU : les cartes tirées complete s
  showHint: boolean;
  blinkHint?: boolean;
  onReturnToHome?: () => void;
}

const CARD_BACK_URL = 'https://cdn.abacus.ai/images/00de34b4-d163-46d0-b0cc-503b5a314aec.png';
const TOTAL_CARDS = CONFIG.GAME.totalCards;

export default function CardFan({ availableIndices, onCardDrawn, disabled, drawnCardsCount, drawnCardIndices = [], drawnCards = [], showHint, blinkHint, onReturnToHome }: CardFanProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [removedCards, setRemovedCards] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scrollProgress, setScrollProgress] = useState({ start: 0, end: 1 });
  
  // Drag & Drop state
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingConfirmed, setIsDraggingConfirmed] = useState(false);
  
  // États pour l'interprétation IA
  const [interpretation, setInterpretation] = useState<{ carte1: string; carte2: string; carte3: string } | null>(null);
  const [cardNames, setCardNames] = useState<{ carte1: string; carte2: string; carte3: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterpretation, setShowInterpretation] = useState(false);
  const [showDivination, setShowDivination] = useState(false);
  const [divinationPhase, setDivinationPhase] = useState<'summoning' | 'revealing'>('summoning');
  
  // États pour le rendu client-side uniquement
  const [hasMounted, setHasMounted] = useState(false);
  const hasCenteredRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; cardIndex: number; cardRect: DOMRect; holdTimer?: NodeJS.Timeout } | null>(null);
  const draggedCardRef = useRef<HTMLDivElement | null>(null);
  
  // Montage client-side
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Dimensions from config - support du mode wide/classic
  const isWideMode = CONFIG.FAN_MODE === 'wide';
  const cardConfig = isMobile 
    ? (isWideMode ? CARD_FAN_WIDE.mobile : CARD_FAN_CLASSIC.mobile)
    : (isWideMode ? CARD_FAN_WIDE.desktop : CARD_FAN_CLASSIC.desktop);
  const arcConfig = isMobile
    ? (isWideMode ? ARC_WIDE.mobile : ARC_CLASSIC.mobile)
    : (isWideMode ? ARC_WIDE.desktop : ARC_CLASSIC.desktop);
  const CARD_W = cardConfig.width;
  const CARD_H = cardConfig.height;
  const OVERLAP = cardConfig.overlap; // Utilise l'overlap de la config

  const visibleCards = useMemo(() => {
    return Array.from({ length: TOTAL_CARDS }, (_, i) => i)
      .filter((i) => availableIndices.includes(i) && !removedCards.has(i));
  }, [availableIndices, removedCards]);

  // Gestionnaire de scroll pour mettre à jour le curseur
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || visibleCards.length === 0) return;
    
    const totalCards = visibleCards.length;
    const cardSpacing = CARD_W + OVERLAP;
    const totalWidth = CARD_W + (totalCards - 1) * cardSpacing;
    const containerWidth = scrollRef.current.clientWidth;
    const scrollPos = scrollRef.current.scrollLeft;
    
    updateScrollIndicator(scrollPos, containerWidth, totalWidth);
  }, [visibleCards.length, CARD_W, OVERLAP]);

  // Fonction utilitaire pour mettre à jour le curseur
  const updateScrollIndicator = (scrollPos: number, containerWidth: number, totalWidth: number) => {
    const startPercent = Math.max(0, Math.min(1, scrollPos / totalWidth));
    const visiblePercent = Math.min(1, containerWidth / totalWidth);
    const endPercent = Math.min(1, startPercent + visiblePercent);
    
    setScrollProgress({ start: startPercent * 100, end: endPercent * 100 });
  };

  // Attacher le gestionnaire de scroll
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // ========== ARC DE L'ÉVENTAIL - Arc classique ==========
  const getCardStyle = useCallback((displayIndex: number, total: number) => {
    const fraction = total > 1 ? displayIndex / (total - 1) : 0.5;
    const centered = fraction - 0.5; // -0.5 to 0.5
    
    // Arc en cosinus
    const arcY = Math.cos(centered * Math.PI) * arcConfig.amplitude;
    
    // Rotation pour suivre la courbe
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

  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartRef.current = { dist: getTouchDist(e.touches), zoom };
    } else if (e.touches.length === 1 && !disabled) {
      // Reset des états
      setIsDraggingConfirmed(false);
      setDraggingIndex(null);
      setDragPosition(null);
      
      // Début du drag tactile
      const touch = e.touches[0];
      const touchRect = (e.target as Element)?.getBoundingClientRect();
      
      // Trouver l'index de la carte touchée
      let cardIndex: number | null = null;
      const cards = document.querySelectorAll('[data-card-index]');
      cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          cardIndex = parseInt(card.getAttribute('data-card-index') || '-1');
        }
      });
      
      if (cardIndex !== null && cardIndex >= 0) {
        dragStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          cardIndex,
          cardRect: (cards[visibleCards.indexOf(cardIndex)] as HTMLElement)?.getBoundingClientRect() || touchRect,
        };
        
        // Timer : si on reste appuyé 1s sans bouger, la carte se sélectionne
        const holdTimer = setTimeout(() => {
          if (dragStartRef.current && dragStartRef.current.cardIndex === cardIndex) {
            setIsDraggingConfirmed(true);
            setDraggingIndex(cardIndex);
            setDragPosition({ x: touch.clientX, y: touch.clientY });
          }
        }, 20); // Timer ultra court : 20ms (desktop)
        
        dragStartRef.current.holdTimer = holdTimer;
      }
    }
  }, [disabled, zoom, visibleCards]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const newDist = getTouchDist(e.touches);
      const scale = newDist / pinchStartRef.current.dist;
      setZoom(Math.max(1, Math.min(3, pinchStartRef.current.zoom * scale)));
    } else if (e.touches.length === 1 && dragStartRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      
      // Si déjà en train de draguer, on suit le mouvement
      if (draggingIndex !== null) {
        setDragPosition({ x: touch.clientX, y: touch.clientY });
        e.preventDefault();
        return;
      }
      
      // Si drag déjà confirmé (par maintien ou mouvement), on active
      if (isDraggingConfirmed) {
        setDraggingIndex(dragStartRef.current.cardIndex);
        setDragPosition({ x: touch.clientX, y: touch.clientY });
        e.preventDefault();
        return;
      }
      
      // Annuler le timer de maintien si on bouge
      if (dragStartRef.current.holdTimer) {
        clearTimeout(dragStartRef.current.holdTimer);
        dragStartRef.current.holdTimer = undefined;
      }
      
      // Détection d'un scroll horizontal TROP important → on annule tout
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        dragStartRef.current = null;
        return;
      }
      
      // Détection d'un vrai drag (mouvement vertical OU horizontal modéré)
      const minDrag = 20; // Seuil réduit : 20px
      if (Math.abs(dx) > minDrag || dy < -minDrag) {
        // On ne confirme que si le mouvement est vers le haut ou diagonal vers le haut
        if (dy < 0 || Math.abs(dy) > Math.abs(dx)) {
          setIsDraggingConfirmed(true);
          setDraggingIndex(dragStartRef.current.cardIndex);
          setDragPosition({ x: touch.clientX, y: touch.clientY });
          e.preventDefault();
        }
      }
    } else if (draggingIndex !== null && dragPosition) {
      const touch = e.touches[0];
      setDragPosition({ x: touch.clientX, y: touch.clientY });
      e.preventDefault();
    }
  }, [draggingIndex, isDraggingConfirmed]);

  const handleTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
    
    // Annuler le timer de maintien
    if (dragStartRef.current?.holdTimer) {
      clearTimeout(dragStartRef.current.holdTimer);
      dragStartRef.current.holdTimer = undefined;
    }
    
    if (draggingIndex !== null && dragPosition) {
      // Zone de validation - milieu de l'écran (50%)
      const releasedInDrawZone = dragPosition.y < window.innerHeight * 0.95;
      
      if (releasedInDrawZone) {
        setRemovedCards((prev) => new Set(prev).add(draggingIndex));
        onCardDrawn(draggingIndex);
      }
    }
    
    // Reset complet
    setIsDraggingConfirmed(false);
    setDraggingIndex(null);
    setDragPosition(null);
    dragStartRef.current = null;
  }, [draggingIndex, dragPosition, onCardDrawn]);

  // ========== DESKTOP: Mouse Drag ==========
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    console.log('🖱️ [DEBUG Desktop] handleMouseDown called, index:', index, 'disabled:', disabled);
    
    if (disabled) {
      console.log('❌ [DEBUG] Bloqué car disabled=true');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const cardElement = e.currentTarget;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      cardIndex: index,
      cardRect: cardElement.getBoundingClientRect(),
    };
    
    console.log('✅ [DEBUG] Drag started, timer 1s lancé...');
    
    // Reset des états
    setDraggingIndex(null);
    setDragPosition(null);
    setIsDraggingConfirmed(false);
    
    // Timer : si on reste appuyé 1s sans bouger, la carte se sélectionne
    const holdTimer = setTimeout(() => {
      if (dragStartRef.current && dragStartRef.current.cardIndex === index) {
        console.log('✅ [DEBUG] Hold timer écoulé, carte confirmée!');
        setIsDraggingConfirmed(true);
        setDraggingIndex(index);
        // Position initiale : la carte reste à sa place
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    }, 20); // Timer ultra court : 20ms (desktop)
    
    dragStartRef.current.holdTimer = holdTimer;
  }, [disabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStartRef.current) return;
    
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    
    // Si déjà en train de draguer, on suit le mouvement
    if (draggingIndex !== null) {
      setDragPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Si drag déjà confirmé (par maintien ou mouvement), on active
    if (isDraggingConfirmed) {
      setDraggingIndex(dragStartRef.current.cardIndex);
      setDragPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Annuler le timer de maintien si on bouge
    if (dragStartRef.current.holdTimer) {
      clearTimeout(dragStartRef.current.holdTimer);
      dragStartRef.current.holdTimer = undefined;
    }
    
    // Détection d'un scroll horizontal TROP important → on annule tout
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      dragStartRef.current = null;
      return;
    }
    
    // Détection d'un vrai drag (mouvement vertical OU horizontal modéré)
    const minDrag = 20; // Seuil réduit : 20px
    if (Math.abs(dx) > minDrag || dy < -minDrag) {
      // On ne confirme que si le mouvement est vers le haut ou diagonal vers le haut
      if (dy < 0 || Math.abs(dy) > Math.abs(dx)) {
        setIsDraggingConfirmed(true);
        setDraggingIndex(dragStartRef.current.cardIndex);
        setDragPosition({ x: e.clientX, y: e.clientY });
      }
    }
  }, [draggingIndex, isDraggingConfirmed]);

  const handleMouseUp = useCallback(() => {
    // Annuler le timer de maintien
    if (dragStartRef.current?.holdTimer) {
      clearTimeout(dragStartRef.current.holdTimer);
      dragStartRef.current.holdTimer = undefined;
    }
    
    if (draggingIndex !== null && dragPosition) {
      // Zone de validation - milieu de l'écran (50%)
      const releasedInDrawZone = dragPosition.y < window.innerHeight * 0.95;
      
      if (releasedInDrawZone) {
        setRemovedCards((prev) => new Set(prev).add(draggingIndex));
        onCardDrawn(draggingIndex);
      }
    }
    
    // Reset complet
    setIsDraggingConfirmed(false);
    setDraggingIndex(null);
    setDragPosition(null);
    dragStartRef.current = null;
  }, [draggingIndex, dragPosition, onCardDrawn]);

  // Calcul de la position initiale de scroll pour centrer la pioche
  const getInitialScrollPosition = useMemo(() => {
    if (availableIndices.length < 75 || visibleCards.length === 0) {
      return 0;
    }
    const totalCards = visibleCards.length;
    const cardSpacing = CARD_W + OVERLAP;
    const totalWidth = CARD_W + (totalCards - 1) * cardSpacing;
    const centerOfDeck = totalWidth / 2;
    const estimatedScreenWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    return Math.max(0, centerOfDeck - (estimatedScreenWidth / 2));
  }, [availableIndices.length, visibleCards.length, CARD_W, OVERLAP]);

  // Centrage à chaque changement de cartes (simple et fiable)
  useEffect(() => {
    if (getInitialScrollPosition > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft = getInitialScrollPosition;
    }
  }, [getInitialScrollPosition]);

  // Fonction pour appeler l'API d'interprétation
  const handleRequestInterpretation = useCallback(async () => {
    // Debug: écrire dans un fichier via une API locale
    const debugLog = async (msg: string) => {
      try {
        await fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ msg, ts: Date.now() }),
        }).catch(() => {});
      } catch {}
    };
    
    await debugLog('🔮 Début interprétation');
    await debugLog(`🃏 Cartes: ${JSON.stringify(drawnCardIndices)}`);
    await debugLog(`📊 drawnCardsCount: ${drawnCardsCount}`);
    await debugLog(`🔒 disabled: ${disabled}`);
    
    // Check plus détaillé
    if (!drawnCardIndices || drawnCardIndices.length === 0) {
      const msg = '❌ drawnCardIndices est vide ou undefined !';
      await debugLog(msg + ` (drawnCardsCount=${drawnCardsCount})`);
      setError(msg + ' (drawnCardsCount=' + drawnCardsCount + ')');
      setShowInterpretation(true);  // Affiche quand même la zone pour voir l'erreur
      setLoading(false);
      return;
    }
    
    if (drawnCardIndices.length !== 3) {
      const msg = `❌ Attend 3 cartes, reçu ${drawnCardIndices.length}`;
      await debugLog(msg);
      setError(msg);
      setShowInterpretation(true);  // Affiche quand même la zone
      setLoading(false);
      return;
    }
    
    await debugLog('✅ 3 cartes valides, appel API...');
        setLoading(true);
        setError(null);
        setShowInterpretation(true);  // Ouvre la modal IMMÉDIATEMENT avec la vidéo
    
        try {
          await debugLog('📦 Affichage écran de divination avec vidéo...');
          await debugLog('🔮 Modal affichée !');
     
          // ÉTAPE 2: Attendre 5 secondes MINIMUM (en parallèle de l'API)
          const startTime = Date.now();
          const minWait = 5000;
      
            await debugLog('⏳ Lancement API + attente 5s...');
      
            // Lancer l'API en parallèle
            const apiPromise = fetch('/api/interpretation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cartes: drawnCardIndices }),
            }).then(async (response) => {
              const responseText = await response.text();
              await debugLog(`📥 Status: ${response.status}, Taille: ${responseText.length} chars`);
        
              if (!response.ok) {
                let errorData;
                try { errorData = JSON.parse(responseText); } catch { errorData = { error: responseText }; }
                await debugLog(`❌ Erreur API: ${JSON.stringify(errorData)}`);
                throw new Error(errorData.error || 'Échec de l\'interprétation');
              }
        
              let data;
              try { 
                data = JSON.parse(responseText); 
                await debugLog(`✅ JSON parsé`);
              } catch (parseErr) { 
                await debugLog(`❌ Erreur parsing: ${parseErr}`);
                throw new Error('Format de réponse invalide'); 
              }
              return data;
            });
      
            // Attendre 5 secondes ET que l'API soit prête
            await Promise.all([
              apiPromise,
              new Promise(resolve => setTimeout(resolve, minWait)),
            ]);
      
            const elapsed = Date.now() - startTime;
            await debugLog(`⏱️ Attente totale: ${elapsed}ms`);
      
            // Récupérer les données (déjà résolues par Promise.all)
            const data = await apiPromise;
      
            // Extraire les noms des cartes depuis drawnCards
            const names = drawnCards && drawnCards.length >= 3 ? {
              carte1: drawnCards[0].card.name,
              carte2: drawnCards[1].card.name,
              carte3: drawnCards[2].card.name,
            } : null;
            setCardNames(names);
      
            // ÉTAPE 3: Afficher l'interprétation dans la modal
            setInterpretation(data);
            setLoading(false);  // Cache la vidéo, montre les cartes
            await debugLog('✨ Modal ouverte - interprétation affichée !');
      
    } catch (err) {
      await debugLog(`💥 Exception: ${err instanceof Error ? err.message : String(err)}`);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      await debugLog('🏁 Terminé');
      setLoading(false);
    }
  }, [drawnCardIndices]);

  // Centrer une seule fois quand la position est prête
  useEffect(() => {
    if (getInitialScrollPosition > 0 && scrollRef.current && !hasCenteredRef.current) {
      hasCenteredRef.current = true;
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = getInitialScrollPosition;
        }
      });
    }
  }, [getInitialScrollPosition]);

  // ========== RENDER ==========
  return (
    <div
      className="relative w-full"
      style={{ 
        height: `calc(${CONFIG.SECTIONS.fan}vh)`,
        paddingTop: '20vh',
        paddingBottom: CONFIG.SECTIONS.bottomPadding + 'vh',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hint de drag - Zone E : descendue plus bas, réduite, clignotante */}
      {!disabled && !draggingIndex && drawnCardsCount === 0 && showHint && (
        <motion.div 
          className="absolute w-full text-center z-40 pointer-events-none"
          style={{
            top: '8vh',  // Descendu plus bas (était 0vh), plus proche de la pioche F
            left: 0,
            right: 0,
          }}
          animate={blinkHint ? {
            opacity: [1, 0.3, 1],  // Clignotement
            scale: [1, 0.95, 1],
          } : {
            opacity: 1,  // Fixe
            scale: 1,
          }}
          transition={{ 
            duration: 0.3,
            repeat: blinkHint ? Infinity : 0  // Clignote indéfiniment si blinkHint=true
          }}
        >
          <p
            className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full inline-block"
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'var(--font-cinzel), serif',
              textShadow: '0 0 10px rgba(218,165,32,0.5), 0 1px 4px rgba(0,0,0,0.8)',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(218,165,32,0.35)',
              backdropFilter: 'blur(6px)',
              fontSize: '0.85rem',  // Plus petit
            }}
          >
            🖐️ Glissez une carte vers le haut
          </p>
        </motion.div>
      )}

      {/* Zone G: Bouton Interprétation - apparaît quand 3 cartes sont tirées */}
      {disabled && drawnCardsCount === 3 && (
        <motion.div
          className="absolute w-full text-center z-40"
          style={{
            top: '20vh',  // Descendu de 8vh à 12vh pour être sous les titres des cartes
            left: 0,
            right: 0,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={handleRequestInterpretation}
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

      {/* Scrollable card strip */}
      <div
        ref={scrollRef}
        className="absolute bottom-0 left-0 right-0 overflow-x-auto overflow-y-visible"
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          paddingBottom: isMobile ? '8vh' : '10vh',
          overflowY: 'visible',
        }}
        onWheel={handleWheel}
      >
        {/* Leading spacer */}
        <div style={{ minWidth: 'max(80px, calc(50vw - 180px))', flexShrink: 0 }} />

        {/* Zoomable inner container */}
        <div
          className="flex items-end flex-shrink-0"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center bottom',
            transition: 'transform 0.2s ease-out',
            // IMPORTANT: overflow visible pour l'arc
            overflow: 'visible',
          }}
        >
          {visibleCards.map((originalIndex, displayIndex) => {
            const { arcY, rotation } = getCardStyle(displayIndex, visibleCards.length);
            // L'effet visuel ET le drag ne s'activent que si le mouvement vers le haut est confirmé
            const isActive = isDraggingConfirmed && draggingIndex === originalIndex;
            
            return (
              <div
                key={originalIndex}
                data-card-index={originalIndex}
                className="flex-shrink-0 relative cursor-grab active:cursor-grabbing"
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  marginLeft: displayIndex === 0 ? 0 : OVERLAP,
                  transform: isActive 
                    ? 'scale(1.15) rotate(0deg) translateY(-30px)' 
                    : `translateY(${arcY}px) rotate(${rotation}deg)`,
                  transition: isActive ? 'none' : 'transform 0.25s ease',
                  zIndex: isActive ? 1000 : Math.floor(10 + displayIndex),
                  transformOrigin: 'center bottom',
                  // IMPORTANT: overflow visible pour voir l'arc complet
                  overflow: 'visible',
                }}
                onMouseDown={(e) => handleMouseDown(e, originalIndex)}
              >
                {/* Card */}
                <div
                  className="w-full h-full rounded-lg overflow-hidden card-shimmer"
                  style={{
                    boxShadow: isActive
                      ? '0 25px 80px rgba(0,0,0,0.9), 0 0 50px rgba(218,165,32,0.7)'
                      : '0 4px 15px rgba(0,0,0,0.6), 0 0 8px rgba(218,165,32,0.2)',
                    border: isActive 
                      ? '3px solid rgba(218,165,32,0.9)' 
                      : '2px solid rgba(218,165,32,0.2)',
                    // IMPORTANT: overflow visible pour l'arc
                    overflow: 'visible',
                  }}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={CARD_BACK_URL}
                      alt="Carte de tarot"
                      fill
                      className="object-cover pointer-events-none select-none"
                      sizes={`${CARD_W * 2}px`}
                      draggable={false}
                      priority={displayIndex < 5}
                    />
                  </div>
                </div>

                {/* Drag indicator overlay */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'rgba(218,165,32,0.15)',
                      border: '3px solid rgba(218,165,32,0.9)',
                      boxShadow: '0 0 40px rgba(218,165,32,0.6)',
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
        <div style={{ minWidth: 'max(80px, calc(50vw - 180px))', flexShrink: 0 }} />
      </div>

      {/* ===== CURSEUR DE NAVIGATION ===== */}
      <div className="w-full flex justify-center mt-32 mb-4">
        <div 
          className="relative bg-gray-900/90 rounded-full overflow-hidden border-2 border-amber-500/60"
          style={{
            width: '25vw',  // 1/4 de la largeur de l'écran
            maxWidth: '200px',
            minWidth: '120px',
            height: '8px',
            boxShadow: '0 0 35px rgba(218,165,32,0.8), inset 0 0 20px rgba(0,0,0,0.8), 0 0 60px rgba(255,215,0,0.4)',
          }}
        >
          {/* Zone visible (portion actuelle de la pioche) */}
          <motion.div
            className="absolute h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FFD700 0%, #FFF8DC 50%, #FFD700 100%)',
              boxShadow: '0 0 30px rgba(218,165,32,1), 0 0 60px rgba(255,215,0,0.9), 0 0 90px rgba(255,215,0,0.6)',
              left: `${scrollProgress.start}%`,
              width: `${scrollProgress.end - scrollProgress.start}%`,
            }}
            initial={{ opacity: 0.7 }}
            animate={{ 
              opacity: 1,
              boxShadow: [
                '0 0 30px rgba(218,165,32,1), 0 0 60px rgba(255,215,0,0.9), 0 0 90px rgba(255,215,0,0.6)',
                '0 0 50px rgba(218,165,32,1), 0 0 100px rgba(255,215,0,1), 0 0 150px rgba(255,215,0,0.8)',
                '0 0 30px rgba(218,165,32,1), 0 0 60px rgba(255,215,0,0.9), 0 0 90px rgba(255,215,0,0.6)',
              ],
            }}
            transition={{ 
              duration: 0.4,
              boxShadow: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            }}
          />
          
          {/* Marqueurs de cartes (lignes fines tous les 10%) */}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
            <div
              key={pct}
              className="absolute h-full bg-amber-400/50"
              style={{
                left: `${pct}%`,
                width: '1.5px',
                boxShadow: '0 0 10px rgba(218,165,32,0.8)',
              }}
            />
          ))}
        </div>
      </div>

      {/* ========== ZONE D'INTERPRÉTATION IA (affichage direct) ========== */}
      <AnimatePresence>
        {showInterpretation && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="w-full px-4 pb-8 pt-4"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)',
            }}
          >
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Titre */}
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center text-xl md:text-2xl font-bold mb-6"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: '#DAA520',
                  textShadow: '0 0 20px rgba(218,165,32,0.6)',
                }}
              >
                🔮 Interprétation du Tirage 🔮
              </motion.h3>

              {/* Message d'erreur */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-red-900/30 border border-red-500/40 rounded-lg text-red-300 text-center"
                >
                  ⚠️ {error}
                </motion.div>
              )}

              {/* Loader */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="inline-block relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-400 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center text-2xl"
                    >
                      🔮
                    </motion.div>
                  </div>
                  <p
                    className="mt-4 text-amber-300 text-lg"
                    style={{ fontFamily: 'var(--font-cinzel), serif' }}
                  >
                    Les esprits consultent les cartes...
                  </p>
                </motion.div>
              )}

              {/* Interprétations */}
              {interpretation && !loading && (
                <>
                  {[
                    { key: 'carte1', title: '🕰️ Passé / Situation', index: 0 },
                    { key: 'carte2', title: '⚔️ Défi / Obstacle', index: 1 },
                    { key: 'carte3', title: '💫 Conseil / Issue', index: 2 },
                  ].map((section, idx) => {
                    const text = interpretation[section.key as keyof typeof interpretation];
                    return (
                      <motion.div
                        key={section.key}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (idx * 0.4), duration: 0.6 }}
                        className="relative p-5 bg-gradient-to-r from-gray-800/60 to-gray-900/60 rounded-xl border border-amber-500/20 overflow-hidden"
                        style={{
                          backdropFilter: 'blur(8px)',
                          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), 0 4px 20px rgba(218,165,32,0.2)',
                        }}
                      >
                        {/* Glow effect */}
                        <div
                          className="absolute inset-0 opacity-20"
                          style={{
                            background: 'radial-gradient(ellipse at top, rgba(218,165,32,0.3) 0%, transparent 70%)',
                          }}
                        />

                        <div className="relative z-10">
                          <h4
                            className="text-lg md:text-xl font-bold mb-3 text-amber-400"
                            style={{ fontFamily: 'var(--font-cinzel), serif' }}
                          >
                            {section.title}
                          </h4>
                          <p
                            className="text-base md:text-lg text-amber-100/95 leading-relaxed"
                            style={{
                              fontFamily: 'var(--font-cinzel-decorative), serif',
                              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                            }}
                          >
                            {text}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              scale: 1.15,
              opacity: 0.98,
              rotate: 0,
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
                boxShadow: '0 30px 100px rgba(0,0,0,0.9), 0 0 60px rgba(218,165,32,0.8)',
                border: '4px solid rgba(218,165,32,0.95)',
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

      {/* Modal d'interprétation IA via portail (rendu dans <body>) */}
      {hasMounted && createPortal(
        <InterpretationModal
          isOpen={showInterpretation}
          onClose={() => {
            setShowInterpretation(false);
            setInterpretation(null);
            setError(null);
          }}
          onReturnToHome={() => {
            setShowInterpretation(false);
            setInterpretation(null);
            setError(null);
            if (onReturnToHome) {
              onReturnToHome();
            }
          }}
          interpretation={interpretation}
          cardNames={cardNames}
          loading={loading}
          error={error}
        />,
        document.getElementById('portal-root') || document.body
      )}
    </div>
  );
}