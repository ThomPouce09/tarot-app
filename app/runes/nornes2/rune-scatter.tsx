'use client';

// app/runes/nornes2/rune-scatter.tsx
// « Tirage à l'aveugle » : on secoue le sac, les 24 runes du Futhark sortent
// progressivement (face cachée) et s'éparpillent sur la table. Quand tout est
// sorti, on sélectionne 3 runes (tap) → elles se révèlent en flip 3D.
//
// Icônes/visuels SVG inline uniquement (règle utilisateur).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ELDER_FUTHARK, type Rune } from '@/components/rune-stones/runes';
import { installSoundUnlock, playRandom } from '@/lib/sounds';
import { RUNE_THEME } from '../_shared';

export interface ScatterPick {
  rune: Rune;
  reversed: boolean;
}

const STONE_W = 46;
const STONE_H = 66;
const COLS = 6;
const ROWS = 4;
const ALL = ELDER_FUTHARK; // 24 runes

/* ------------------------------------------------------------------ */
/* Positions pré-calculées : grille 6×4 avec léger jitter (stable).    */
/* ------------------------------------------------------------------ */
function layoutPositions(): Array<{ x: number; y: number; rot: number }> {
  const pos: Array<{ x: number; y: number; rot: number }> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      pos.push({
        x: 8 + (84 / (COLS - 1)) * c + (Math.random() * 4 - 2),
        y: 8 + (76 / (ROWS - 1)) * r + (Math.random() * 4 - 2),
        rot: Math.random() * 14 - 7,
      });
    }
  }
  // Mélange l'ordre (les runes sortent dans un ordre aléatoire).
  for (let i = pos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pos[i], pos[j]] = [pos[j], pos[i]];
  }
  return pos;
}

/* ------------------------------------------------------------------ */
/* Pochon — image réelle utilisée dans /runes/nornes (pochon.png),      */
/* animée en secousse par le parent.                                    */
/* ------------------------------------------------------------------ */
function PouchImage({ size = 120 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/pochon.png"
      alt="Pochon de runes"
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.55))',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Pierre d'os face cachée (dos) — le glyphe n'est visible qu'après    */
/* révélation (flip 3D piloté par le parent).                          */
/* ------------------------------------------------------------------ */
function Stone({
  revealed = false,
  symbol,
  reversed,
}: {
  revealed?: boolean;
  symbol?: string;
  reversed?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: STONE_W,
        height: STONE_H,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Dos (face cachée) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          background: 'linear-gradient(160deg, #f3ebd8 0%, #e6d9bf 60%, #dccaa6 100%)',
          border: '1px solid #c9b78f',
          boxShadow:
            'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(120,95,55,0.25)',
          backfaceVisibility: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Motif discret au dos (runes gravées en filigrane) */}
        <span
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            fontSize: 15,
            color: '#c9b78f',
            opacity: 0.65,
          }}
        >
          ✦
        </span>
      </div>
      {/* Face avant (glyphe) — cachée tant que non révélée */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          background: 'linear-gradient(150deg, #fbf6e9 0%, #efe6d2 55%, #e2d4ba 100%)',
          border: '1px solid #b9a98a',
          boxShadow:
            'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(120,95,55,0.25)',
          backfaceVisibility: 'hidden',
          transform: `rotateY(180deg) ${reversed ? 'rotateZ(180deg)' : ''}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            fontSize: 26,
            lineHeight: 1,
            color: '#7a2e1e',
            textShadow: '0 1px 0 rgba(255,255,255,0.55), 0 -1px 1px rgba(90,30,15,0.35)',
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
/* RuneScatter : sac + table + sélection.                              */
/*   - shakes : nb de secousses données sur le sac                     */
/*   - picks  : 3 runes sélectionnées → onComplete(picks) automatique  */
/*              (transition vers la zone de tirage propre dans la page) */
/* ------------------------------------------------------------------ */
export function RuneScatter({
  height = 440,
  enabled = true,
  onComplete,
}: {
  height?: number;
  enabled?: boolean;
  onComplete: (picks: ScatterPick[]) => void;
}) {
  const [shakes, setShakes] = useState(0);
  const [pickedIdx, setPickedIdx] = useState<number[]>([]);
  const [firing, setFiring] = useState(false);
  const [burst, setBurst] = useState(0);
  const firedRef = useRef(false);

  // Positions stables + ordre de sortie mélangé.
  const slots = useMemo(layoutPositions, []);
  const order = useMemo(() => ELDER_FUTHARK.map((_, i) => i), []);

  // Chaque secousse fait sortir 1 rune (2 avec 30% de chance) face cachée.
  const outCount = Math.min(shakes + 1, ALL.length);

  useEffect(() => {
    installSoundUnlock();
  }, []);

  const onPouchTap = useCallback(() => {
    if (!enabled || outCount >= ALL.length || firing) return;
    playRandom('runes-handle-1', 'runes-handle-2');
    const gain = Math.random() < 0.3 && outCount + 2 <= ALL.length ? 2 : 1;
    setShakes((s) => s + gain);
    if (outCount + gain >= ALL.length) {
      playRandom('rune-falling-1', 'rune-hit-1');
    }
    setBurst((b) => b + 1);
  }, [enabled, outCount, firing]);

  const allOut = outCount >= ALL.length;

  const onStoneTap = useCallback(
    (idx: number) => {
      if (!enabled || !allOut || firing) return;
      setPickedIdx((prev) => {
        if (prev.includes(idx)) return prev.filter((i) => i !== idx);
        if (prev.length >= 3) return prev;
        playRandom('rune-falling-1');
        return [...prev, idx];
      });
    },
    [enabled, allOut, firing],
  );

  // 🎬 Dès la 3e rune sélectionnée (et révélée) : petite pause pour montrer les
  // 3 runes, puis transition directe vers la zone des runes tirées (lecture).
  useEffect(() => {
    if (pickedIdx.length !== 3 || firedRef.current) return;
    firedRef.current = true;
    setFiring(true);
    playRandom('rune-hit-1');
    const t = window.setTimeout(() => {
      const picks: ScatterPick[] = pickedIdx.map((i) => ({
        rune: ALL[i],
        reversed: Math.random() < 0.3,
      }));
      onComplete(picks);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [pickedIdx, onComplete]);

  const active = enabled && !allOut && !firing;
  const selecting = enabled && allOut && !firing;

  return (
    <div
      className="relative w-full select-none"
      style={{ height: `${height}px`, overflow: 'hidden', perspective: 900 }}
      aria-label="Tirage à l'aveugle : secouez le sac puis choisissez 3 runes"
    >
      {/* ── Table : runes sorties ── */}
      <div className="absolute inset-x-0 top-0" style={{ height: '68%' }}>
        {ALL.map((rune, i) => {
          const idx = order.indexOf(i);
          if (idx >= outCount) return null;
          const s = slots[i];
          const picked = pickedIdx.includes(i);
          // Départ depuis le sac (bas-centre) → arrive à sa position.
          const dx = (50 - s.x) / 100 * 320;
          const dy = ((88 - (s.y * 0.68 + 14)) / 100) * height;
          return (
            <div
              key={rune.name}
              className="absolute"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: picked ? 30 : 20,
              }}
            >
              <motion.button
                type="button"
                initial={{
                  x: dx,
                  y: dy + 110,
                  opacity: 0,
                  scale: 0.3,
                }}
                animate={{
                  x: 0,
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  rotate: s.rot,
                }}
                transition={{ duration: 0.95, ease: 'easeOut' }}
                onClick={() => onStoneTap(i)}
                style={{
                  cursor: selecting ? 'pointer' : 'default',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  filter: picked
                    ? 'drop-shadow(0 0 14px rgba(233,217,172,0.9))'
                    : 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))',
                }}
                aria-label={picked ? `Rune sélectionnée ${rune.name}` : `Rune cachée ${rune.name}`}
              >
                <motion.div
                  animate={{
                    rotateY: picked ? 180 : 0,
                    y: picked ? -10 : 0,
                  }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <Stone revealed={picked} symbol={rune.symbol} />
                </motion.div>
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* ── Barre de progression ── */}
      {!allOut && (
        <div
          className="absolute left-1/2 z-30 -translate-x-1/2 rounded-full px-3 py-1"
          style={{
            bottom: '30%',
            background: 'rgba(10,30,18,0.75)',
            border: `1px solid ${RUNE_THEME.goldPale}55`,
          }}
        >
          <p
            className="whitespace-nowrap text-[11px]"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              color: RUNE_THEME.goldPale,
            }}
          >
            {outCount} / {ALL.length} runes sorties
          </p>
        </div>
      )}

      {/* ── Sac (secouable tant qu'il reste des runes) ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 14,
          width: 120,
          height: 120,
          zIndex: 40,
        }}
      >
        <motion.button
          type="button"
          onPointerDown={active ? onPouchTap : undefined}
          whileTap={active ? { scaleX: 1.08, scaleY: 0.86 } : undefined}
          animate={
            active
              ? { rotate: [0, -8, 8, -8, 8, 0], x: [0, -4, 4, -4, 4, 0] }
              : { rotate: 0, x: 0 }
          }
          transition={
            active
              ? { duration: 1.4, repeat: Infinity, repeatDelay: 0.8, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
          style={{
            width: '100%',
            height: '100%',
            cursor: active ? 'pointer' : 'default',
            touchAction: 'manipulation',
            background: 'transparent',
            border: 'none',
          }}
          aria-label="Secouer le sac pour faire sortir les runes"
        >
          <PouchImage size={120} />
          {active && (
            <span
              className="pointer-events-none absolute inset-x-0 -bottom-7 text-center text-[11px]"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: RUNE_THEME.goldPale,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              Secouez le sac
            </span>
          )}
        </motion.button>
      </div>

      {/* ── Bandeau de sélection / transition ── */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-0 z-40 px-4 text-center"
            style={{ bottom: 150 }}
          >
            <motion.p
              key="msg"
              className="text-sm"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: RUNE_THEME.goldPale,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
              animate={
                pickedIdx.length === 3
                  ? { scale: [1, 1.08, 1], opacity: [1, 1, 0.6, 1] }
                  : undefined
              }
              transition={
                pickedIdx.length === 3
                  ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                  : undefined
              }
            >
              {pickedIdx.length < 3
                ? pickedIdx.length === 0
                  ? 'Choisissez 3 runes face cachée'
                  : pickedIdx.length === 1
                    ? 'Encore 2 runes à choisir'
                    : 'Encore 1 rune à choisir'
                : 'Tirage en cours…'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Particules dorées à chaque secousse ── */}
      {burst > 0 && (
        <GoldPuff key={burst} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Petites particules dorées jaillissant du sac à chaque secousse.     */
/* ------------------------------------------------------------------ */
function GoldPuff() {
  const parts = useMemo(
    () =>
      Array.from({ length: 10 }, () => ({
        dx: (Math.random() - 0.5) * 120,
        dy: -30 - Math.random() * 80,
        size: 2 + Math.random() * 4,
        dur: 0.6 + Math.random() * 0.5,
        delay: Math.random() * 0.1,
      })),
    [],
  );
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ left: '50%', bottom: 70 }}
    >
      {parts.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff3c8 0%, #e9c96a 60%, rgba(233,201,106,0) 100%)',
            boxShadow: `0 0 6px 2px ${RUNE_THEME.goldPale}77`,
          }}
        />
      ))}
    </div>
  );
}
