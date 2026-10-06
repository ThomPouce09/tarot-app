'use client';

// Sous-composants de rendu du tirage (dos de carte, emplacements des
// cartes tirees, etincelles, carte volante). Extraits tels quels de
// tarot-app.tsx (decoupage).

import { useRef, useState, useEffect, useMemo, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { cardDisplayName } from '@/lib/i18n/cards';
import { localizePosition } from '@/lib/i18n/positions';
import { getRuntimeLang } from '@/lib/i18n';
import { tr } from '@/lib/i18n';
import Image from 'next/image';
import type { TarotCard } from '@/lib/tarot-data';
import CardFace from './card-face';
import { ZONE, EDGE } from './tarot-config';

/* ---------- Dos de carte ---------- */
export const CARD_BACK_URL = '/images/card-back.png?v=2';
export function CardBack({ glow }: { glow?: boolean }) {
  return (
    <div className="w-full h-full rounded-[6px] pointer-events-none relative overflow-hidden" style={{
      border: glow ? "1.5px solid rgba(255,215,120,0.95)" : "1px solid rgba(150,110,30,0.6)",
      boxShadow: glow ? "0 0 16px rgba(255,215,120,0.8)" : "inset 0 0 0 3px rgba(150,110,30,0.2)",
    }}>
      <img src={CARD_BACK_URL} alt="" className="w-full h-full object-cover" draggable={false} />
    </div>
  );
}

/* ---------- Emplacements cartes tirées ---------- */
export const DEFAULT_POSITION_LABELS = ['Passé', 'Présent', 'Avenir'];
export const DEFAULT_POSITION_ICONS = ['☽', '☉', '★'];

export interface DrawnCardData {
  card: TarotCard;
  reversed: boolean;
  position: number;
}

export function DrawnCardSlot({ drawnCard, isMobile, isReady, slotRefs, position, positionLabels, positionIcons, cardW, cardH, labelSide = 'top' }: {
  drawnCard: DrawnCardData | null;
  isMobile: boolean;
  isReady: boolean;
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  position: number;
  positionLabels: string[];
  positionIcons: string[];
  cardW: number;
  cardH: number;
  labelSide?: 'top' | 'right';
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFace, setShowFace] = useState(false);
  const prevRef = useRef<DrawnCardData | null>(null);

  useEffect(() => {
    const sameCard = prevRef.current && drawnCard && prevRef.current.card?.id === drawnCard.card?.id && prevRef.current.position === drawnCard.position;
    if (!drawnCard) { setIsFlipped(false); setShowFace(false); prevRef.current = null; }
    else if (!sameCard) {
      prevRef.current = drawnCard; setIsFlipped(false); setShowFace(false);
      window.setTimeout(() => { setIsFlipped(true); window.setTimeout(() => setShowFace(true), 500); }, 200);
    }
  }, [drawnCard]);

  // labelSide 'right' : label disposé à droite de la carte (gain de place
  // verticale dans la croix), sinon au-dessus. En mobile, le label est compact
  // (maxWidth + troncature) pour que la grille tienne dans le viewport.
  // Si le label est vide → masqué (croix d'origine, sans titres de zone).
  const label = positionLabels[position] ? (
    <motion.div
      className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1 sm:py-2 rounded-full"
      style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(218,165,32,0.5)', backdropFilter: 'blur(4px)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', maxWidth: labelSide === 'right' && isMobile ? 64 : '100%' }}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : -10 }} transition={{ duration: 0.6 }}
    >
      <span style={{ color: '#FFD700', fontSize: isMobile ? (labelSide === 'right' ? 9 : 11) : 15 }}>{positionIcons[position]}</span>
      <span
        className="text-[8px] sm:text-sm md:text-base tracking-widest uppercase font-bold whitespace-nowrap overflow-hidden"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFD700', textOverflow: 'ellipsis' }}
      >
        {localizePosition(positionLabels[position])}
      </span>
    </motion.div>
  ) : null;

  if (labelSide === 'right') {
    return (
      <div className="flex items-center gap-1.5 sm:gap-3" style={{ marginTop: '-38px', marginBottom: '20px' }}>
        <div className="relative" style={{ perspective: '1000px', width: cardW, height: cardH }}>
          {!drawnCard ? (
            <motion.div className="w-full h-full rounded-lg slot-empty" initial={{ opacity: 0 }} animate={{ opacity: isReady ? 1 : 0 }} transition={{ duration: 0.6 }} />
          ) : (
            <motion.div
              ref={(el) => { slotRefs.current[drawnCard.position] = el; }}
              className="w-full h-full rounded-lg"
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18, duration: 0.7 }}
            >
              <div className="absolute inset-0 rounded-lg mystic-glow" style={{ zIndex: 0 }} />
              <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                <div className="card-face card-back" style={{ backgroundImage: `url(${CARD_BACK_URL})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid rgba(218,165,32,0.5)' }} />
                <div className="card-face card-front">
                  <CardFace card={drawnCard.card} reversed={drawnCard.reversed} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
        {label}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3" style={{ marginTop: '-38px', marginBottom: '20px' }}>
      {label}

      <div className="relative" style={{ perspective: '1000px', width: cardW, height: cardH }}>
        {!drawnCard ? (
          <motion.div className="w-full h-full rounded-lg slot-empty" initial={{ opacity: 0 }} animate={{ opacity: isReady ? 1 : 0 }} transition={{ duration: 0.6 }} />
        ) : (
          <motion.div
            ref={(el) => { slotRefs.current[drawnCard.position] = el; }}
            className="w-full h-full rounded-lg"
            initial={false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, duration: 0.7 }}
          >
            <div className="absolute inset-0 rounded-lg mystic-glow" style={{ zIndex: 0 }} />
            <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
              <div className="card-face card-back" style={{ backgroundImage: `url(${CARD_BACK_URL})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid rgba(218,165,32,0.5)' }} />
              <div className="card-face card-front">
                <CardFace card={drawnCard.card} reversed={drawnCard.reversed} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
      {/* Espace réservé pour le nom : toujours présent (hauteur fixe) pour que
          la grille ne bouge pas quand une carte est sélectionnée. */}
      <p
        className="text-[11px] sm:text-xs md:text-sm text-center font-semibold leading-tight"
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: '#FFD700',
          textShadow: drawnCard ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
          marginTop: '-2px',
          minHeight: isMobile ? '28px' : '34px',
          maxWidth: isMobile ? '120px' : '240px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '0px',
        }}
      >
        {drawnCard ? cardDisplayName(drawnCard.card, getRuntimeLang()) : ''}
      </p>
    </div>
  );
}

export function DrawnCards({ drawnCards, isReady, slotRefs, totalPicks, positionLabels, positionIcons, crossLayout, reveal }: {
  drawnCards: DrawnCardData[];
  isReady: boolean;
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  totalPicks: number;
  positionLabels: string[];
  positionIcons: string[];
  crossLayout?: { area: string; label: string; icon: string }[];
  reveal?: boolean;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [vw, setVw] = useState(375);
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    setVw(window.innerWidth);
    setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  // Largeur mobile adaptée au nombre d'emplacements : 5 cartes → slots plus
  // étroits pour tenir dans l'écran (5 × ~64px + marges ≈ 360px).
  const cardW = isMobile ? Math.min(110, Math.floor((vw - 16 - (totalPicks - 1) * 6) / totalPicks)) : 240;
  const cardH = isMobile ? Math.round(cardW * 1.68) : 405;

  // Mode croix : 3 colonnes seulement (pas totalPicks), titres masqués →
  // carte à la taille d'origine de la croix (~65px mobile), gaps 8px/12px.
  // Grille = 3 × 65 + 2 × 12 + padding 16 ≈ 235px, centrée dans le viewport.
  const crossW = isMobile ? 65 : 240;
  const crossH = isMobile ? Math.round(crossW * 1.68) : 405;

  // Mode croix : grille 3×3 (1 en haut, 3 au milieu, 1 en bas) comme la
  // croix celtique d'origine — emplacements seuls, sans titres latéraux.
  // Les positions se remplissent dans l'ordre d'affichage (crossLayout[i] →
  // drawnCards[i]). La largeur est calculée pour que la grille tienne dans
  // le viewport mobile (3 colonnes de ~70px + gaps ≈ 360px).
  if (crossLayout && crossLayout.length === totalPicks) {
    const areas = [
      '".        a0        .       "',
      '"a1       a2        a3      "',
      '".        a4        .       "',
    ];
    return (
      <motion.div
        className="absolute left-0 right-0 z-25 flex justify-center items-start px-2 sm:px-4"
        style={{ zIndex: 25 }}
        initial={{ top: isMobile ? '15vh' : '20vh' }}
        animate={{ top: reveal ? (isMobile ? '26vh' : '28vh') : (isMobile ? '15vh' : '20vh') }}
        transition={{ duration: reveal ? 1.1 : 0.6, ease: 'easeInOut' }}
      >
        {/* Halo magique discret derrière la croix au moment du recentrage */}
        <motion.div
          className="pointer-events-none absolute"
          style={{
            left: '50%', top: '50%',
            width: 220, height: 220,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,215,120,0.16) 0%, rgba(255,190,80,0.05) 50%, transparent 72%)',
            filter: 'blur(2px)',
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: reveal ? 1 : 0, scale: reveal ? [0.7, 1.08, 0.96, 1] : 0.7 }}
          transition={{ duration: reveal ? 2.2 : 0.4, ease: 'easeOut' }}
        />
        <motion.div
          className="grid relative"
          style={{
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: 'auto auto auto',
            gridTemplateAreas: areas.join(' '),
            gap: isMobile ? '8px 12px' : '14px 28px',
          }}
          initial={false}
          animate={{ scale: reveal ? 1.06 : 1 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        >
          {crossLayout.map((slot, i) => (
            <div key={slot.area} style={{ gridArea: `a${i}` }} className="flex justify-center">
              <DrawnCardSlot
                drawnCard={drawnCards[i] ?? null}
                isMobile={isMobile}
                isReady={isReady}
                slotRefs={slotRefs}
                position={i}
                // Titres masqués (croix d'origine) : le nom de la carte tirée
                // s'affiche sous l'emplacement.
                positionLabels={[]}
                positionIcons={[]}
                cardW={crossW}
                cardH={crossH}
              />
            </div>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="absolute left-0 right-0 z-25 flex justify-center items-start px-2 sm:px-4" style={{ zIndex: 25, top: '29vh', maxWidth: isMobile ? '100vw' : '1200px', margin: '0 auto' }}>
      {Array.from({ length: totalPicks }, (_, position) => (
        <div key={position} style={{ flex: '0 0 auto', marginRight: isMobile && position < totalPicks - 1 ? '6px' : '0' }}>
          <DrawnCardSlot drawnCard={drawnCards[position] ?? null} isMobile={isMobile} isReady={isReady} slotRefs={slotRefs} position={position} positionLabels={positionLabels} positionIcons={positionIcons} cardW={cardW} cardH={cardH} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Étincelles ---------- */
export function Sparkles({ x, y }: { x: number; y: number }) {
  const parts = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    a: (i / 14) * Math.PI * 2 + Math.random() * 0.5,
    d: 30 + Math.random() * 55,
    s: 3 + Math.random() * 4,
    dur: 0.6 + Math.random() * 0.5,
  })), []);
  return (
    <div style={{ position: "fixed", left: x, top: y, zIndex: 400, pointerEvents: "none" }}>
      {parts.map((p, i) => (
        <div key={i} style={{
          position: "absolute", width: p.s, height: p.s, borderRadius: "50%",
          background: "radial-gradient(circle,#fff7d0,#ffc94a)",
          boxShadow: "0 0 6px rgba(255,210,100,0.9)",
          animation: `sparkFly ${p.dur}s ease-out forwards`,
          "--dx": Math.cos(p.a) * p.d + "px",
          "--dy": Math.sin(p.a) * p.d - 40 + "px",
        } as CSSProperties} />
      ))}
    </div>
  );
}

/* ---------- Carte volante ---------- */
export function FlyingCard({ flying }: { flying: { from: DOMRect; to: DOMRect; cardId: number } }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(r); }, []);
  const { from, to } = flying;
  return (
    <>
      <div className="fixed pointer-events-none rounded-md" style={{
        left: go ? to.left : from.left, top: go ? to.top : from.top,
        width: go ? to.width : from.width, height: go ? to.height : from.height,
        zIndex: 295, transition: "all 1.05s cubic-bezier(.16,.84,.28,1)",
        background: "radial-gradient(ellipse, rgba(255,215,120,0.5), transparent 70%)",
        filter: "blur(10px)", transform: "scale(1.8)",
      }} />
      <div className="fixed z-50 pointer-events-none rounded-md overflow-hidden" style={{
        left: go ? to.left : from.left, top: go ? to.top : from.top,
        width: go ? to.width : from.width, height: go ? to.height : from.height,
        zIndex: 300,
        transform: go ? "scale(1) rotate(0deg)" : "scale(1.5) rotate(-8deg)",
        transition: "all .85s cubic-bezier(.16,.84,.28,1)",
        boxShadow: go ? "0 0 20px rgba(255,190,70,0.5)" : "0 0 46px rgba(255,220,120,0.95)",
        filter: go ? "brightness(1)" : "brightness(1.5)",
      }}>
        <CardBack glow />
      </div>
    </>
  );
}
