'use client';

// app/runes/nornes2/sacred-table.tsx
// « Table sacrée » : zone de tirage où les 3 runes choisies à l'aveugle sont
// mises en valeur. Même langage visuel que RuneStonesSet de /nornes :
//   - couche inclinable au GYROSCOPE (deviceorientation) + fallback souris
//   - reflet spéculaire lié au tilt (--shx/--shy/--shi)
//   - vol en arc avec tumbling : la rune sort FACE CACHÉE et se révèle en vol
// Les 3 runes arrivent du bas-centre vers leurs emplacements, une par une.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { installSoundUnlock, playRandom } from '@/lib/sounds';
import { useDeviceTilt } from '@/components/rune-stones';
import { type ScatterPick } from './rune-scatter';
import { RUNE_THEME } from '../_shared';

const STONE_W = 62;
const STONE_H = 90;
const STONE_DEPTH = 19;
const SLOTS: Array<[number, number]> = [
  [50, 30],
  [18, 72],
  [82, 72],
]; // Urd / Verdandi / Skuld
const FLIGHT = 1.2;

/* ------------------------------------------------------------------ */
/* Pierre d'os 3D (boîte canonique), face cachée en vol puis révélée.  */
/* ------------------------------------------------------------------ */
function RuneStone({
  symbol,
  revealed,
  reversed,
}: {
  symbol: string;
  revealed: boolean;
  reversed: boolean;
}) {
  const half = STONE_DEPTH / 2;
  const sideV = 'linear-gradient(180deg, #c9b083 0%, #a8855a 100%)';
  const sideH = 'linear-gradient(90deg, #c2a87d 0%, #9f8154 100%)';
  const edge = '1px solid rgba(90,70,40,0.5)';

  return (
    <div
      style={{
        position: 'relative',
        width: STONE_W,
        height: STONE_H,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Face arrière (dos en os brut → face cachée en vol) */}
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
      {/* Côté droit */}
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
      {/* Côté gauche */}
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
      {/* Côté haut */}
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
      {/* Côté bas */}
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
      {/* Face avant (glyphe) — révélée en vol */}
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
        {/* Reflet spéculaire — suit l'inclinaison via --shx/--shy */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            background:
              'radial-gradient(circle 70px at var(--shx) var(--shy), rgba(255,255,255,var(--shi)) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
            mixBlendMode: 'soft-light',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            fontSize: 44,
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
/* Table sacrée.                                                       */
/* ------------------------------------------------------------------ */
export function SacredTable({
  picks,
  height = 430,
  onSettled,
}: {
  picks: ScatterPick[];
  height?: number;
  /** Appelé quand les 3 runes sont posées et révélées. */
  onSettled?: () => void;
}) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { enable: enableTilt } = useDeviceTilt(tableRef);
  const [done, setDone] = useState(0);
  const settledRef = useRef(false);

  // Sons + déverrouillage + activation du gyro au montage.
  useEffect(() => {
    installSoundUnlock();
    void enableTilt();
    const t1 = window.setTimeout(() => playRandom('rune-falling-1', 'rune-hit-1'), 350);
    const t2 = window.setTimeout(() => playRandom('rune-hit-1'), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [enableTilt]);

  // Compte les vols terminés → onSettled quand les 3 sont posées.
  useEffect(() => {
    if (done >= 3 && !settledRef.current) {
      settledRef.current = true;
      const t = window.setTimeout(() => onSettled?.(), 400);
      return () => window.clearTimeout(t);
    }
  }, [done, onSettled]);

  const stones = picks.slice(0, 3);

  return (
    <div
      className="relative w-full select-none"
      style={{ height: `${height}px`, overflow: 'hidden', perspective: 1100 }}
      aria-label="Table sacrée : les 3 runes tirées"
    >
      {/* Emplacements (hors couche inclinable) */}
      {SLOTS.map(([sx, sy], i) => (
        <div
          key={`slot-${i}`}
          className="absolute"
          style={{
            left: `${sx}%`,
            top: `${sy}%`,
            transform: 'translate(-50%, -50%)',
            width: STONE_W + 16,
            height: STONE_H + 16,
            borderRadius: 12,
            border: '1px dashed rgba(232,217,172,0.4)',
            boxShadow: 'inset 0 0 16px rgba(232,217,172,0.1)',
            zIndex: 5,
          }}
        />
      ))}

      {/* Couche inclinable (gyro) : les 3 runes */}
      <div
        ref={tableRef}
        className="absolute inset-0"
        style={
          {
            transformStyle: 'preserve-3d',
            '--shx': '50%',
            '--shy': '38%',
            '--shi': '0.3',
          } as React.CSSProperties
        }
      >
        {stones.map((d, i) => {
          const [sx, sy] = SLOTS[i];
          // Départ depuis le bas-centre (comme la sortie du pochon).
          const dropX = 0;
          const dropY = ((88 - sy) / 100) * height;
          return (
            <div
              key={`${d.rune.name}-${i}`}
              className="absolute"
              style={{
                left: `${sx}%`,
                top: `${sy}%`,
                transform: 'translate(-50%, -50%)',
                transformStyle: 'preserve-3d',
                zIndex: 20,
              }}
            >
              {/* Trajectoire : jaillit du bas, arc, rebond. */}
              <motion.div
                initial={{ x: dropX, y: dropY, scale: 0.3, opacity: 0 }}
                animate={{
                  x: [dropX, dropX * 0.4, 0, 0],
                  y: [dropY, dropY * 0.3 - 80, -14, 0],
                  scale: [0.3, 1.15, 1.05, 1],
                  opacity: [0, 1, 1, 1],
                }}
                transition={{
                  duration: FLIGHT,
                  times: [0, 0.45, 0.82, 1],
                  ease: ['easeOut', 'easeInOut', 'easeOut'],
                  delay: i * 0.28,
                }}
                style={{ borderRadius: 8, transformStyle: 'preserve-3d' }}
                onAnimationComplete={() => {
                  if (i >= done) {
                    setDone((d2) => Math.max(d2, i + 1));
                  }
                }}
              >
                {/* Tumbling 3D : dos visible → se retourne en vol. */}
                <motion.div
                  initial={{ rotateY: 180, rotateX: 60 }}
                  animate={{
                    rotateY: [180, 320, 355, 360],
                    rotateX: [60, -180, -350, -360],
                  }}
                  transition={{
                    duration: FLIGHT,
                    times: [0, 0.5, 0.85, 1],
                    ease: 'easeOut',
                    delay: i * 0.28,
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <RuneStone
                    symbol={d.rune.symbol}
                    revealed
                    reversed={d.reversed}
                  />
                </motion.div>
              </motion.div>

              {/* Halo doré une fois posée (mise en valeur) */}
              {done > i && (
                <motion.div
                  className="pointer-events-none absolute"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    left: '50%',
                    top: '50%',
                    width: STONE_W + 34,
                    height: STONE_H + 34,
                    transform: 'translate(-50%, -50%)',
                    borderRadius: 16,
                    border: `1.5px solid ${RUNE_THEME.goldPale}55`,
                    boxShadow: `0 0 26px ${RUNE_THEME.goldGlow}, inset 0 0 18px rgba(233,217,172,0.15)`,
                    zIndex: 15,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Titre discret de la table */}
      <div
        className="pointer-events-none absolute inset-x-0 z-30 text-center"
        style={{ top: 6 }}
      >
        <p
          className="text-[11px] uppercase tracking-[0.2em]"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: `${RUNE_THEME.goldPale}aa`,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          Urd · Verdandi · Skuld
        </p>
      </div>
    </div>
  );
}
