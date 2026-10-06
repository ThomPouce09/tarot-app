'use client';

// Pierres runiques à l’écran : la pierre elle-même, la pierre en vol,
// l'explosion dorée et le pochon. Extraits tels quels de RuneStonesSet.tsx.

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { tr } from '@/lib/i18n';
import type { Rune, RuneLayout } from './runes';
import type { DrawnRune } from './RuneStonesSet';
import { STONE_W, STONE_H, STONE_DEPTH, FLIGHT_DURATION } from './stone-layout';

/* ------------------------------------------------------------------ */
/* Rune en vol : arc + tumbling, face cachée → révélation en vol,      */
/* ombre au sol dynamique synchronisée.                                */
/* ------------------------------------------------------------------ */
export function FlyingStone({
  stone,
  dropX,
  dropY,
  left,
  top,
}: {
  stone: DrawnRune;
  dropX: number;
  dropY: number;
  left: number;
  top: number;
}) {
  // Légère variation par rune pour un rendu organique.
  const spin = useMemo(() => (Math.random() < 0.5 ? 1 : -1), []);
  const wobble = useMemo(() => Math.random() * 10 - 5, []);

  return (
    <div
      className="absolute"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
        transformStyle: 'preserve-3d',
        zIndex: 20,
      }}
    >
      {/* Trajectoire : jaillit du pochon, arc montant, tumbling, rebond. */}
      <motion.div
        initial={{
          x: dropX,
          y: dropY,
          scale: 0.25,
          opacity: 0,
        }}
        animate={{
          x: [dropX, dropX * 0.4 + wobble * 4, 0, 0],
          y: [dropY, dropY * 0.35 - 70, -12, 0],
          scale: [0.25, 1.12, 1.04, 1],
          opacity: [0, 1, 1, 1],
        }}
        transition={{
          duration: FLIGHT_DURATION,
          times: [0, 0.48, 0.82, 1],
          ease: ['easeOut', 'easeInOut', 'easeOut'],
        }}
        style={{ borderRadius: 8, transformStyle: 'preserve-3d' }}
      >
        {/* Tumbling 3D : sort dos visible (rotateY 180) → se retourne en vol. */}
        <motion.div
          initial={{ rotateY: 180 * spin, rotateX: 60, rotateZ: wobble * 3 }}
          animate={{
            rotateY: [180 * spin, 320 * spin, 355 * spin, 360 * spin],
            rotateX: [60, -180, -350, -360],
            rotateZ: [wobble * 3, -wobble * 2, wobble, 0],
          }}
          transition={{
            duration: FLIGHT_DURATION,
            times: [0, 0.5, 0.85, 1],
            ease: 'easeOut',
          }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <RuneStone
            symbol={stone.rune.symbol}
            reversed={stone.reversed}
            name={stone.rune.name}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Domino d'os : boîte 3D canonique aux bonnes dimensions.             */
/* Côtés : DEPTH × H. Haut/bas : W × DEPTH. Front/back : W × H.        */
/* ------------------------------------------------------------------ */
export function RuneStone({
  symbol,
  reversed,
  name,
}: {
  symbol: string;
  reversed: boolean;
  name: string;
}) {
  const half = STONE_DEPTH / 2;
  // Côtés marqués → les arêtes se voient bien (relief).
  const sideV = 'linear-gradient(180deg, #c9b083 0%, #a8855a 100%)'; // côtés
  const sideH = 'linear-gradient(90deg, #c2a87d 0%, #9f8154 100%)'; // haut/bas
  const edge = '1px solid rgba(90,70,40,0.5)'; // fine bordure d'arête

  return (
    <div
      title={`${name}${reversed ? ' (à l’envers)' : ''}`}
      style={{
        position: 'relative',
        width: STONE_W,
        height: STONE_H,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Face arrière (dos en os brut, sans glyphe → face cachée en vol). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          background:
            'linear-gradient(160deg, #f3ebd8 0%, #e6d9bf 60%, #dccaa6 100%)',
          border: '1px solid #c9b78f',
          transform: `rotateY(180deg) translateZ(${half}px)`,
          backfaceVisibility: 'hidden',
        }}
      />
      {/* Côté droit : DEPTH × H, centré puis pivoté à l'arête droite. */}
      <div
        style={{
          position: 'absolute',
          width: STONE_DEPTH,
          height: STONE_H,
          left: (STONE_W - STONE_DEPTH) / 2,
          top: 0,
          background: sideV,
          borderRadius: 8,
          border: edge,
          overflow: 'hidden',
          transform: `rotateY(90deg) translateZ(${STONE_W / 2 - 1}px)`,
        }}
      />
      {/* Côté gauche. */}
      <div
        style={{
          position: 'absolute',
          width: STONE_DEPTH,
          height: STONE_H,
          left: (STONE_W - STONE_DEPTH) / 2,
          top: 0,
          background: sideV,
          borderRadius: 8,
          border: edge,
          overflow: 'hidden',
          transform: `rotateY(-90deg) translateZ(${STONE_W / 2 - 1}px)`,
        }}
      />
      {/* Côté haut : W × DEPTH. */}
      <div
        style={{
          position: 'absolute',
          width: STONE_W,
          height: STONE_DEPTH,
          left: 0,
          top: (STONE_H - STONE_DEPTH) / 2,
          background: sideH,
          borderRadius: 8,
          border: edge,
          overflow: 'hidden',
          transform: `rotateX(90deg) translateZ(${STONE_H / 2 - 1}px)`,
        }}
      />
      {/* Côté bas. */}
      <div
        style={{
          position: 'absolute',
          width: STONE_W,
          height: STONE_DEPTH,
          left: 0,
          top: (STONE_H - STONE_DEPTH) / 2,
          background: sideH,
          borderRadius: 8,
          border: edge,
          overflow: 'hidden',
          transform: `rotateX(-90deg) translateZ(${STONE_H / 2 - 1}px)`,
        }}
      />
      {/* Face avant (os crème + glyphe gravé). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          transform: `translateZ(${half}px) ${reversed ? 'rotate(180deg)' : ''}`,
          background:
            'linear-gradient(150deg, #fbf6e9 0%, #efe6d2 55%, #e2d4ba 100%)',
          border: '1px solid #b9a98a',
          boxShadow:
            'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(120,95,55,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backfaceVisibility: 'hidden',
          overflow: 'hidden',
        }}
      >
        {/* Reflet spéculaire "os poli" — suit l'inclinaison via --shx/--shy. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            background:
              'radial-gradient(circle 60px at var(--shx) var(--shy), rgba(255,255,255,var(--shi)) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
            mixBlendMode: 'soft-light',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            fontSize: 38,
            lineHeight: 1,
            color: '#7a2e1e',
            textShadow:
              '0 1px 0 rgba(255,255,255,0.55), 0 -1px 1px rgba(90,30,15,0.35)',
            userSelect: 'none',
          }}
        >
          {symbol}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Particules dorées jaillissant du pochon.                            */
/* ------------------------------------------------------------------ */
const PARTICLE_COUNT = 14;

export function GoldBurst({ x, y }: { x: number; y: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        dx: (Math.random() - 0.5) * 140,
        dy: -40 - Math.random() * 110,
        size: 2 + Math.random() * 4,
        dur: 0.7 + Math.random() * 0.6,
        delay: Math.random() * 0.12,
      })),
    [],
  );
  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {parts.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, #fff3c8 0%, #e9c96a 60%, rgba(233,201,106,0) 100%)',
            boxShadow: '0 0 6px 2px rgba(233,217,172,0.7)',
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Pouch({
  active,
  pushes,
  need,
  dragActive,
  hideCounter = false,
  counterAbove = false,
}: {
  active: boolean;
  pushes: number;
  need: number;
  dragActive: boolean;
  hideCounter?: boolean;
  /** layout tree : compteur affiché AU-DESSUS du sac (bas de zone occupé). */
  counterAbove?: boolean;
}) {
  const remaining = Math.max(need - pushes, 0);
  return (
    <motion.div
      // Pas de whileTap ici : la capture du pointeur (agitation) est gérée par
      // le parent, un whileTap resterait « pressé » tant que le doigt bouge.
      animate={
        active && !dragActive
          ? { rotate: [0, -3.5, 0, 3.5, 0] }
          : { rotate: 0 }
      }
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
      style={{
        width: '100%',
        height: '100%',
        cursor: active ? 'grab' : 'default',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/pochon.png"
        alt="Pochon de runes"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.55))',
        }}
      />
      {active && !hideCounter && (
        <div
          style={{
            position: 'absolute',
            ...(counterAbove ? { top: -20 } : { bottom: -22 }),
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: 11.5,
            color: '#e9d9ac',
            opacity: 0.9,
            userSelect: 'none',
            textShadow: '0 1px 3px rgba(0,0,0,0.7)',
            whiteSpace: 'nowrap',
          }}
        >
          {remaining > 0
            ? `Encore ${remaining} agitation${remaining > 1 ? 's' : ''}`
            : '...'}
        </div>
      )}
    </motion.div>
  );
}
