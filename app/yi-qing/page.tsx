'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const YI_QING_BG = '/backgrounds/yi-qing-bg.mp4';

const BOX_IMG = "/images/boite.png";
const STICK_IMG = "/images/baguette.png";

// ============================================================================
// 🎛️ PARAMÈTRES CONFIGURABLES
// ============================================================================

// --- Physique & Mouvement ---
const MOVEMENT_THRESHOLD = 700;
const STICK_LEFT_OFFSET = -3;
const MAX_BOX_SHIFT_X = 15;
const MAX_BOX_SHIFT_Y = 10;
const STICK_JUMP_HEIGHT = 55;
const MAX_INITIAL_RISE = 15;
const HORIZONTAL_SENSITIVITY = 0.9;
const VERTICAL_SENSITIVITY = 0.;
const TOP_STICKS_COUNT = 1;

// --- Émergence des baguettes ---
const PROMINENT_STICKS_MIN = 3;
const PROMINENT_STICKS_MAX = 15;
const MAX_RISE_IN_BOX = 7;
const MAX_PROMINENT_RISE = 90;

// --- Dimensions des baguettes & Boîte ---
const STICK_DISPLAY_WIDTH = 4.5;
const STICK_DISPLAY_HEIGHT = 260;
const BOX_WIDTH = STICK_DISPLAY_WIDTH * 10;
const BOX_HEIGHT = STICK_DISPLAY_HEIGHT * 0.45;
const BOX_BOTTOM = 170;
const RIG_W = BOX_WIDTH + 40;
const RIG_H = STICK_DISPLAY_HEIGHT + BOX_BOTTOM + 40;
const STICK_COUNT = 64;
const INTERIOR_WIDTH = BOX_WIDTH * 0.50;
const STICK_WIDTH = Math.max(2, INTERIOR_WIDTH / STICK_COUNT);
const STICK_BASE_BOTTOM_OFFSET = 52;

// --- Device Motion (mobile) ---
const ACCEL_THRESHOLD = 80;
const ACCEL_NOISE_FLOOR = 1.5;

// --- Animation Swipe (Main) ---
const SWIPE_ANIMATION_DURATION = '0.6s';
const SWIPE_ANIMATION_DISTANCE = '16px';
const SWIPE_BELOW_BOX = 80;
const SWIPE_ICON_SIZE = '48px';
const SWIPE_ICON_OPACITY = 0.5;
const SWIPE_TEXT_FONT_SIZE = '0.65rem';
const SWIPE_TEXT_MAX_WIDTH = '140px';

// --- Positionnement UI ---
const PROGRESS_BAR_ABOVE_BOX = -32;
const TITLE_TOP = 48;

// --- Texte de Résultat ("Le sort a parlé" & "Baguette n°..") ---
const RESULT_CONTAINER_BOTTOM = '24%';
const RESULT_SUBTITLE_FONT_SIZE = '0.875rem';
const RESULT_NUMBER_FONT_SIZE = '1.5rem';
const RESULT_TEXT_SPACING = '0.5rem';

// ============================================================================

interface MotionState {
  x: number;
  y: number;
  z: number;
}

interface Stick {
  id: number;
  xOffset: number;
  baseRise: number;
  rotation: number;
  zJitter: number;
  yJitter: number;
  emergenceDelay: number;
  initialRise: number;
}

interface Jumping {
  id: number;
  y: number;
  targetY: number;
  rotation: number;
  opacity: number;
  xOffset: number;
}

function makeSticks(): Stick[] {
  const left = -INTERIOR_WIDTH / 2 + STICK_WIDTH / 2;
  const usableWidth = INTERIOR_WIDTH - STICK_WIDTH;
  const step = usableWidth / (STICK_COUNT - 1);

  const prominentCount = Math.floor(Math.random() * (PROMINENT_STICKS_MAX - PROMINENT_STICKS_MIN + 1)) + PROMINENT_STICKS_MIN;
  
  const allIds = Array.from({ length: STICK_COUNT }, (_, i) => i);
  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }
  const prominentIds = new Set(allIds.slice(0, prominentCount));

  return Array.from({ length: STICK_COUNT }, (_, i) => {
    const isProminent = prominentIds.has(i);
    return {
      id: i,
      xOffset: left + i * step + (Math.random() * 1.5 - 0.75) + STICK_LEFT_OFFSET,
      baseRise: isProminent ? 20 + Math.random() * (MAX_PROMINENT_RISE - 20) : Math.random() * MAX_RISE_IN_BOX,
      rotation: Math.random() * 6 - 3,
      zJitter: 1 + Math.floor(Math.random() * 15),
      yJitter: Math.random() * 4,
      emergenceDelay: isProminent ? Math.random() * 0.4 : 0.7 + Math.random() * 0.3,
      initialRise: Math.random() * MAX_INITIAL_RISE,
    };
  });
}

function getStickRise(stick: Stick, progress: number): number {
  const stickProgress = Math.max(0, (progress - stick.emergenceDelay) / (1 - stick.emergenceDelay));
  return stick.initialRise + stickProgress * stick.baseRise;
}

// --- YiQingRig Component ---
function YiQingRig() {
  const [sticks] = useState<Stick[]>(makeSticks);
  const [shiftX, setShiftX] = useState(0);
  const [shiftY, setShiftY] = useState(0);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [jumping, setJumping] = useState<Jumping | null>(null);
  const [totalMovement, setTotalMovement] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'jumping' | 'done'>('idle');
  const [animatingProgress, setAnimatingProgress] = useState(0);

  const dragging = useRef(false);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const lastAccel = useRef<MotionState | null>(null);
  const drawnRef = useRef<number | null>(null);
  const shiftXRef = useRef(0);
  const frozenProgressRef = useRef(0);
  const hasTriggeredRef = useRef(false); // 🛡️ Verrou synchrone immédiat
  const rafRef = useRef<number | null>(null);

  const interiorBottom = BOX_BOTTOM - BOX_HEIGHT;

  const triggerDraw = useCallback((progress: number, currentShiftX: number) => {
    if (hasTriggeredRef.current) return;
    
    // 🛡️ Verrouille immédiatement pour bloquer tout événement de mouvement suivant
    hasTriggeredRef.current = true;
    frozenProgressRef.current = progress;
    
    const stickRises = sticks.map(s => ({
      id: s.id,
      rise: getStickRise(s, progress),
      stick: s,
    }));
    
    stickRises.sort((a, b) => b.rise - a.rise);
    const topSticks = stickRises.slice(0, TOP_STICKS_COUNT);
    const chosen = topSticks[Math.floor(Math.random() * topSticks.length)];
    
    drawnRef.current = chosen.id;
    setDrawn(chosen.id);
    setAnimatingProgress(0);
    setPhase('jumping');

    const currentRise = chosen.rise;

    setTimeout(() => {
      setJumping({
        id: chosen.id,
        y: -currentRise,
        targetY: -currentRise - STICK_JUMP_HEIGHT,
        rotation: chosen.stick.rotation + currentShiftX * 0.03 * (chosen.id % 2 === 0 ? 1 : -1),
        xOffset: chosen.stick.xOffset,
        opacity: 1,
      });
    }, 400);
  }, [sticks]);

  // --- DeviceMotion (shake) ---
  useEffect(() => {
    if (phase === 'done' || phase === 'jumping') return;
    
    const handleMotion = (e: DeviceMotionEvent) => {
      // 🛡️ Vérification synchrone immédiate
      if (hasTriggeredRef.current) return;
      if (!e.accelerationIncludingGravity) return;
      
      const { x, y, z } = e.accelerationIncludingGravity;
      const prev = lastAccel.current;
      
      if (prev) {
        const dx = (x ?? 0) - prev.x;
        const dy = (y ?? 0) - prev.y;
        const dz = (z ?? 0) - prev.z;
        
        const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (magnitude > ACCEL_NOISE_FLOOR) {
            const distance = magnitude * 8;
            
            setShiftX((prevX) => {
              const next = Math.max(-MAX_BOX_SHIFT_X, Math.min(MAX_BOX_SHIFT_X, prevX + dx * HORIZONTAL_SENSITIVITY * 2));
              shiftXRef.current = next;
              return next;
            });
            setShiftY((prevY) => Math.max(-MAX_BOX_SHIFT_Y, Math.min(MAX_BOX_SHIFT_Y, prevY + dy * VERTICAL_SENSITIVITY * 2)));

            setTotalMovement((prev) => {
              const next = prev + distance;
              if (next >= ACCEL_THRESHOLD) {
                triggerDraw(Math.min(1, next / ACCEL_THRESHOLD), shiftXRef.current);
              }
              return next;
            });
        }
      }
      lastAccel.current = { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
    };

    if (typeof DeviceMotionEvent !== 'undefined' && 
        (DeviceMotionEvent as any).requestPermission) {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch(() => {});
    } else if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [phase, triggerDraw]);

  // --- Pointer events (desktop drag) ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase === 'done' || phase === 'jumping') return;
    dragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // 🛡️ Vérification synchrone immédiate
    if (hasTriggeredRef.current) return;
    if (!dragging.current || !lastPos.current || lastX.current === null || lastY.current === null) return;

    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setShiftX((prev) => {
      const next = Math.max(-MAX_BOX_SHIFT_X, Math.min(MAX_BOX_SHIFT_X, prev + dx * HORIZONTAL_SENSITIVITY));
      shiftXRef.current = next;
      return next;
    });
    setShiftY((prev) => Math.max(-MAX_BOX_SHIFT_Y, Math.min(MAX_BOX_SHIFT_Y, prev + dy * VERTICAL_SENSITIVITY)));

    setTotalMovement((prev) => {
      const next = prev + distance;
      const progress = Math.min(1, next / MOVEMENT_THRESHOLD);
      if (next >= MOVEMENT_THRESHOLD) {
        triggerDraw(progress, shiftXRef.current);
      }
      return next;
    });
  };

  const endDrag = () => {
    dragging.current = false;
    lastX.current = null;
    lastY.current = null;
    lastPos.current = null;

    const settle = setInterval(() => {
      setShiftX((s) => {
        const next = s * 0.82;
        if (Math.abs(next) < 0.3) { clearInterval(settle); return 0; }
        shiftXRef.current = next;
        return next;
      });
      setShiftY((s) => {
        const next = s * 0.82;
        if (Math.abs(next) < 0.3) { clearInterval(settle); return 0; }
        return next;
      });
    }, 16);
  };

  // --- Jumping animation ---
  useEffect(() => {
    if (!jumping) return;

    const step = () => {
      setAnimatingProgress((p) => Math.min(1, p + 0.015));
      
      setJumping((j) => {
        if (!j) return j;
        const nextY = j.y + (j.targetY - j.y) * 0.08;
        const arrived = Math.abs(nextY - j.targetY) < 0.5;

        if (arrived) {
          setPhase('done');
          return { ...j, y: j.targetY };
        }

        return { ...j, y: nextY };
      });
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [jumping]);

  // 🛡️ Utilise strictement la progression gelée dès que le tirage est acté
  const effectiveProgress = drawn !== null 
    ? frozenProgressRef.current 
    : Math.min(1, totalMovement / MOVEMENT_THRESHOLD);

  const TITLE_BLOCK_RESERVE = 60;
  const showSwipeHint = phase === 'idle' && totalMovement === 0;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: "absolute",
        top: TITLE_BLOCK_RESERVE,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: phase === 'done' ? 'default' : 'grab',
        touchAction: "none",
        zIndex: 10,
        backgroundColor: 'transparent',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ✅ Barre de progression FIXE */}
      {phase === 'idle' && (
        <div 
          className="w-32 h-1.5 rounded-full overflow-hidden z-30" 
          style={{ 
            position: 'absolute',
            top: `calc(50% - ${RIG_H / 2 + PROGRESS_BAR_ABOVE_BOX}px)`,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 215, 0, 0.2)' 
          }}
        >
          <div
            style={{
              width: `${effectiveProgress * 100}%`,
              height: '100%',
              backgroundColor: '#FFD700',
              transition: 'width 0.1s',
            }}
          />
        </div>
      )}

      <div
        style={{
          position: "relative",
          width: RIG_W,
          height: RIG_H,
          transform: `translate(${shiftX}px, ${shiftY}px)`,
          transition: dragging.current ? "none" : "transform 0.25s ease-out",
        }}
      >
        {sticks.map((s) => {
          const isDrawn = drawn === s.id;
          const stickProgress = isDrawn
            ? animatingProgress
            : Math.max(0, (effectiveProgress - s.emergenceDelay) / (1 - s.emergenceDelay));
          const rise = s.initialRise + stickProgress * s.baseRise;

          return (
            <div
              key={s.id}
              style={{
                position: "absolute",
                bottom: interiorBottom + STICK_BASE_BOTTOM_OFFSET,
                left: "50%",
                width: STICK_DISPLAY_WIDTH,
                height: STICK_DISPLAY_HEIGHT,
                transformOrigin: "bottom center",
                transform: `translateX(${s.xOffset}px) translateY(${-rise}px) rotate(${s.rotation + shiftX * 0.03 * (s.id % 2 === 0 ? 1 : -1)}deg)`,
                transition: dragging.current ? "none" : "transform 0.3s ease-out",
                opacity: isDrawn && phase === 'jumping' ? 0 : 1,
                zIndex: s.zJitter,
              }}
            >
              <Image src={STICK_IMG} alt="" fill draggable={false} style={{ objectFit: "contain" }} />
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            bottom: BOX_BOTTOM,
            left: "50%",
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
            transform: "translateX(-50%)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <Image src={BOX_IMG} alt="Boîte" fill draggable={false} style={{ objectFit: "contain" }} />
        </div>

        {jumping && (
          <div
            style={{
              position: "absolute",
              bottom: interiorBottom + STICK_BASE_BOTTOM_OFFSET,
              left: "50%",
              width: STICK_DISPLAY_WIDTH * 1.3,
              height: STICK_DISPLAY_HEIGHT,
              transform: `translateX(${jumping.xOffset}px) translateY(${jumping.y}px) rotate(${jumping.rotation}deg)`,
              zIndex: 10,
              opacity: jumping.opacity,
            }}
          >
            <Image src={STICK_IMG} alt="" fill draggable={false} style={{ objectFit: "contain" }} />
          </div>
        )}
      </div>

      {/* ✅ Animation Swipe (main qui s'agite) sous la boîte */}
      {showSwipeHint && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1"
          style={{
            bottom: `calc(50% - ${RIG_H / 2 - SWIPE_BELOW_BOX}px)`,
          }}
        >
          <style>{`
            @keyframes swipe-shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-${SWIPE_ANIMATION_DISTANCE}); }
              75% { transform: translateX(${SWIPE_ANIMATION_DISTANCE}); }
            }
            .swipe-icon {
              animation: swipe-shake ${SWIPE_ANIMATION_DURATION} ease-in-out infinite;
              color: rgba(255, 255, 255, ${SWIPE_ICON_OPACITY});
              font-size: ${SWIPE_ICON_SIZE};
              user-select: none;
              -webkit-user-select: none;
            }
          `}</style>
          <span className="material-symbols-outlined swipe-icon">swipe</span>
          <p
            className="text-center leading-tight"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: SWIPE_TEXT_FONT_SIZE,
              maxWidth: SWIPE_TEXT_MAX_WIDTH,
              lineHeight: '1.3',
            }}
          >
            Secouez la boîte pour le tirage<br />d&apos;une baguette d&apos;achillée
          </p>
        </div>
      )}

      {phase === 'done' && drawn !== null && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 text-center animate-fade-in"
          style={{ bottom: RESULT_CONTAINER_BOTTOM }}
        >
          <p
            className="mb-2"
            style={{ 
              fontFamily: 'var(--font-cinzel), serif', 
              color: 'rgba(255, 215, 0, 0.7)',
              fontSize: RESULT_SUBTITLE_FONT_SIZE
            }}
          >
            Le sort a parlé
          </p>
          <strong
            className="block"
            style={{ 
              fontFamily: 'var(--font-cinzel), serif', 
              color: '#FFD700',
              fontSize: RESULT_NUMBER_FONT_SIZE,
              marginTop: RESULT_TEXT_SPACING
            }}
          >
            Baguette n°{drawn + 1}
          </strong>
        </div>
      )}

      {/* Zone G: Bouton Interprétation - apparaît quand le tirage est complet */}
      {phase === 'done' && drawn !== null && (
        <motion.div
          className="absolute w-full text-center z-40"
          style={{
            bottom: '8vh',
            left: 0,
            right: 0,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={() => {
              // TODO: Implémenter l'interprétation Yi Jing
              alert('Interprétation Yi Jing à venir !');
            }}
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
    </div>
  );
}

// --- Main Page ---
export default function YiQingPage() {
  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{
        height: '100dvh',
        minHeight: '-webkit-fill-available',
      }}
    >
      {/* VIDEO BACKGROUND */}
      <div className="absolute inset-0 z-0 bg-black" style={{ pointerEvents: 'none' }}>
        <video
          src={YI_QING_BG}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center center', pointerEvents: 'none' }}
        />
        <div className="absolute inset-0 bg-black/40" style={{ pointerEvents: 'none' }} />
      </div>

      {/* YI QING RIG */}
      <YiQingRig />

      {/* Google Material Symbols */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=swipe"
      />

      {/* TITLE */}
      <div
        style={{
          position: "absolute",
          top: TITLE_TOP,
          left: 0,
          right: 0,
          zIndex: 30,
          textAlign: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <h1
          className="title-glow"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: '#FFD700',
            letterSpacing: '0.2em',
            textShadow: '0 0 40px rgba(255,215,0,0.7), 0 0 80px rgba(255,215,0,0.4)',
            fontSize: 'clamp(1.6rem, 6vw, 4.5rem)',
            textTransform: 'uppercase',
            marginBottom: '0.25rem',
          }}
        >
          Yi Jing
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 0 10px rgba(255,215,0,0.6), 0 1px 4px rgba(0,0,0,0.9)',
            letterSpacing: '0.05em',
            fontStyle: 'italic',
            fontSize: 'clamp(0.7rem, 2vw, 1rem)',
          }}
        >
          La sagesse des hexagrammes
        </p>
      </div>
    </div>
  );
}