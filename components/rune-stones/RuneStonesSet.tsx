'use client';

// components/rune-stones/RuneStonesSet.tsx
// Tirage de runes : pochon en bas, emplacements fixes en haut.
// - Vol en arc avec tumbling 3D : la rune sort FACE CACHÉE et se révèle en vol.
// - Épaisseur réelle : boîte 3D canonique (faces latérales aux bonnes dimensions).
// - Parallaxe DeviceOrientation renforcé (2 axes) + fallback souris desktop.
// - Extras : ombre au sol dynamique, reflet spéculaire lié au tilt, particules dorées.
//
// API inchangée : count, layout, isRolling, onRest, height.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { drawRunes, type Rune, type RuneLayout } from './runes';
import { installSoundUnlock, playRandom } from '@/lib/sounds';

export interface RuneStonesSetProps {
  count?: number;
  layout?: RuneLayout;
  isRolling?: boolean;
  onRest?: (runes: DrawnRune[]) => void;
  height?: number;
}

export interface DrawnRune {
  rune: Rune;
  reversed: boolean;
}

const STONE_W = 54;
const STONE_H = 78;
const STONE_DEPTH = 17;
const POUCH = { x: 50, y: 74 };
const FLIGHT_DURATION = 1.15;

function slotsFor(layout: RuneLayout, count: number): Array<[number, number]> {
  // Tirage d'une rune seule (ex: Conseil d'Odin) → centrée, en face du pochon.
  if (count === 1) return [[50, 26]];
  switch (layout) {
    case 'horizontal':
      return Array.from({ length: count }, (_, i) => [
        24 + (52 / Math.max(count - 1, 1)) * i,
        26,
      ]);
    case 'vertical':
      return Array.from({ length: count }, (_, i) => [
        50,
        76 - (56 / Math.max(count - 1, 1)) * i,
      ]);
    case 'cross':
      return ([
        [50, 50], [50, 14], [50, 84], [16, 50], [84, 50],
      ] as Array<[number, number]>).slice(0, count);
    case 'hammer':
      return ([
        [50, 76], [50, 48], [30, 28], [70, 28], [50, 18],
      ] as Array<[number, number]>).slice(0, count);
    default:
      return Array.from({ length: count }, (_, i) => [
        24 + (52 / Math.max(count - 1, 1)) * i,
        26,
      ]);
  }
}

function revealOrder(layout: RuneLayout, count: number): number[] {
  if (layout === 'hammer') return [0, 1, 2, 3, 4].slice(0, count);
  return Array.from({ length: count }, (_, i) => i);
}

/* ------------------------------------------------------------------ */
/* Parallaxe 3D : DeviceOrientation (mobile) + souris (desktop).       */
/* Mutation DOM directe dans une boucle rAF → aucun re-render.         */
/* Met aussi à jour --shx/--shy (reflet spéculaire) sur la couche.     */
/* ------------------------------------------------------------------ */
const TILT_GAIN = 3.2;
const TILT_MAX = 28;

function useDeviceTilt(tableRef: RefObject<HTMLDivElement>) {
  const target = useRef({ rx: 0, ry: 0 });
  const current = useRef({ rx: 0, ry: 0 });
  const raf = useRef<number | null>(null);
  const enabled = useRef(false);
  const baseBeta = useRef<number | null>(null);

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    // Calibration : la première mesure devient la position neutre avant/arrière.
    if (baseBeta.current == null) baseBeta.current = e.beta;
    target.current.ry = clamp((e.gamma / 2.2) * TILT_GAIN, -TILT_MAX, TILT_MAX);
    target.current.rx = clamp(
      (-(e.beta - baseBeta.current) / 2.2) * TILT_GAIN,
      -TILT_MAX,
      TILT_MAX,
    );
  }, []);

  const onMouse = useCallback((e: MouseEvent) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    target.current.ry = clamp(nx * 2 * TILT_MAX, -TILT_MAX, TILT_MAX);
    target.current.rx = clamp(-ny * 2 * TILT_MAX, -TILT_MAX, TILT_MAX);
  }, []);

  const loop = useCallback(() => {
    current.current.rx += (target.current.rx - current.current.rx) * 0.09;
    current.current.ry += (target.current.ry - current.current.ry) * 0.09;
    const el = tableRef.current;
    if (el) {
      const { rx, ry } = current.current;
      el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      // Reflet spéculaire : le point brillant glisse à l'opposé du tilt.
      el.style.setProperty('--shx', `${(50 - ry * 2.4).toFixed(1)}%`);
      el.style.setProperty('--shy', `${(38 + rx * 2.4).toFixed(1)}%`);
      // Intensité du reflet selon l'amplitude du tilt.
      const amp = Math.min(
        1,
        (Math.abs(rx) + Math.abs(ry)) / (TILT_MAX * 1.2),
      );
      el.style.setProperty('--shi', (0.25 + amp * 0.55).toFixed(2));
    }
    raf.current = requestAnimationFrame(loop);
  }, [tableRef]);

  const enable = useCallback(async () => {
    if (enabled.current) return;
    enabled.current = true;
    try {
      const DOE = (window as unknown as {
        DeviceOrientationEvent?: {
          requestPermission?: () => Promise<'granted' | 'denied'>;
        };
      }).DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          enabled.current = false;
          return;
        }
      }
      window.addEventListener('deviceorientation', onOrient);
      window.addEventListener('mousemove', onMouse);
      if (!raf.current) loop();
    } catch {
      enabled.current = false;
    }
  }, [loop, onOrient, onMouse]);

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('mousemove', onMouse);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [onOrient, onMouse]);

  return { enable };
}

/* ------------------------------------------------------------------ */
export default function RuneStonesSet({
  count = 3,
  layout = 'horizontal',
  isRolling = false,
  onRest,
  height = 440,
}: RuneStonesSetProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { enable: enableTilt } = useDeviceTilt(tableRef);

  const [stones, setStones] = useState<DrawnRune[]>([]);
  const [thresholds, setThresholds] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [pushes, setPushes] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'drawing' | 'done'>('idle');
  const [burstKey, setBurstKey] = useState(0);
  const restFired = useRef(false);

  // ── Sons : déverrouillage au premier geste (autoplay policy). ──
  useEffect(() => {
    installSoundUnlock();
  }, []);

  const order = useMemo(() => revealOrder(layout, count), [layout, count]);
  const slots = useMemo(() => slotsFor(layout, count), [layout, count]);

  useEffect(() => {
    if (!isRolling) {
      restFired.current = false;
      setPhase('idle');
      return;
    }
    const picks = drawRunes(count).map((rune) => ({
      rune,
      reversed: Math.random() < 0.3,
    }));
    const thr = Array.from(
      { length: count },
      () => 2 + Math.floor(Math.random() * 3),
    );
    setStones(picks);
    setThresholds(thr);
    setRevealed(0);
    setPushes(0);
    setPhase('drawing');
    restFired.current = false;
  }, [isRolling, count]);

  const onPouchTap = useCallback(() => {
    void enableTilt();
    if (phase !== 'drawing' || revealed >= count) return;
    // Chaque tap sur le pochon = remuage des runes.
    playRandom('runes-handle-1', 'runes-handle-2');
    const next = pushes + 1;
    setPushes(next);
    if (next >= (thresholds[revealed] ?? 3)) {
      const justRevealed = revealed;
      setRevealed((v) => v + 1);
      setPushes(0);
      setBurstKey((k) => k + 1); // déclenche les particules dorées
      // La rune jaillit du pochon → chute.
      playRandom('rune-falling-1', 'rune-falling-2', 'rune-hit-1');
      if (justRevealed + 1 >= count) setPhase('done');
    }
  }, [phase, pushes, revealed, count, thresholds, enableTilt]);

  useEffect(() => {
    if (phase !== 'done') return;
    if (!restFired.current) {
      restFired.current = true;
      onRest?.(stones);
    }
  }, [phase, stones, onRest]);

  const need = thresholds[revealed] ?? 0;
  const active = phase === 'drawing';

  return (
    <div
      className="relative w-full select-none"
      style={{ height: `${height}px`, overflow: 'hidden', perspective: 900 }}
      aria-label={`Tirage de ${count} runes`}
    >
      {/* Emplacements fixes (hors couche inclinable). */}
      {slots.map(([sx, sy], i) => (
        <div
          key={`slot-${i}`}
          className="absolute"
          style={{
            left: `${sx}%`,
            top: `${sy}%`,
            transform: 'translate(-50%, -50%)',
            width: STONE_W + 12,
            height: STONE_H + 12,
            borderRadius: 10,
            border: '1px dashed rgba(232,217,172,0.32)',
            boxShadow: 'inset 0 0 12px rgba(232,217,172,0.08)',
          }}
        />
      ))}

      {/* Couche inclinable (runes uniquement). */}
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
        <AnimatePresence>
          {stones.map((s, i) => {
            const shown = order.indexOf(i) < revealed;
            if (!shown) return null;
            const [sx, sy] = slots[i];
            const dropY = ((POUCH.y - sy) / 100) * height;
            const dropX = ((POUCH.x - sx) / 100) * 100; // approx. en px (léger)
            return (
              <FlyingStone
                key={`${s.rune.name}-${i}`}
                stone={s}
                dropX={dropX}
                dropY={dropY}
                left={sx}
                top={sy}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Particules dorées à la sortie du pochon. */}
      {burstKey > 0 && (
        <GoldBurst
          key={burstKey}
          x={POUCH.x}
          y={POUCH.y - 8}
        />
      )}

      {/* Pochon (hors couche inclinable). */}
      <div
        className="absolute"
        style={{
          left: `${POUCH.x}%`,
          top: `${POUCH.y}%`,
          transform: 'translate(-50%, -50%)',
          width: 150,
          height: 150,
          zIndex: 30,
        }}
      >
        <Pouch onTap={onPouchTap} active={active} pushes={pushes} need={need} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rune en vol : arc + tumbling, face cachée → révélation en vol,      */
/* ombre au sol dynamique synchronisée.                                */
/* ------------------------------------------------------------------ */
function FlyingStone({
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
function RuneStone({
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

function GoldBurst({ x, y }: { x: number; y: number }) {
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
function Pouch({
  onTap,
  active,
  pushes,
  need,
}: {
  onTap: () => void;
  active: boolean;
  pushes: number;
  need: number;
}) {
  const remaining = Math.max(need - pushes, 0);
  return (
    <motion.div
      onPointerDown={onTap}
      whileTap={active ? { scaleX: 1.08, scaleY: 0.88 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 12 }}
      style={{
        width: '100%',
        height: '100%',
        cursor: active ? 'pointer' : 'default',
        touchAction: 'manipulation',
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
      {active && (
        <div
          style={{
            position: 'absolute',
            bottom: -22,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-cinzel), serif',
            fontSize: 12,
            color: '#e9d9ac',
            opacity: 0.9,
            userSelect: 'none',
            textShadow: '0 1px 3px rgba(0,0,0,0.7)',
          }}
        >
          {remaining > 0 ? `Appuie encore ${remaining}` : '...'}
        </div>
      )}
    </motion.div>
  );
}