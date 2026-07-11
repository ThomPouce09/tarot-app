'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const YI_QING_BG = '/backgrounds/yi-qing-bg.mp4';
const BOX_IMG = "/images/boite.png";
const STICK_IMG = "/images/baguette.png";

// ============================================================================
// 🎛️ PARAMÈTRES CONFIGURABLES
// ============================================================================

const MOVEMENT_THRESHOLD = 1200; // drag desktop : declenchement moins sensible
const STICK_LEFT_OFFSET = -3;
const MAX_BOX_SHIFT_X = 15;
const MAX_BOX_SHIFT_Y = 10;
const STICK_JUMP_HEIGHT = 55;
const STICK_LIFT_HEIGHT = 80; // sortie moderee, un peu moins haute
const STICK_RISE_EASE = 0.045;  // extraction: un poil plus rapide (0.04 -> 0.045)
const STICK_SWING_K = 0.06;    // raideur forte = rebond COURT et RAPIDE (table en bois)
const STICK_SWING_DAMP = 0.9; // amortissement plus doux = plusieurs rebonds avant stabilisation
const MAX_INITIAL_RISE = 15;
const HORIZONTAL_SENSITIVITY = 0.9;
const VERTICAL_SENSITIVITY = 0;
const TOP_STICKS_COUNT = 1;

const PROMINENT_STICKS_MIN = 3;
const PROMINENT_STICKS_MAX = 15;
const MAX_RISE_IN_BOX = 7;
const MAX_PROMINENT_RISE = 90;

const STICK_DISPLAY_WIDTH = 4.5;
const STICK_DISPLAY_HEIGHT = 260;
const BOX_WIDTH = STICK_DISPLAY_WIDTH * 10;
const BOX_HEIGHT = STICK_DISPLAY_HEIGHT * 0.45;
const BOX_BOTTOM = 125; // boite + baguettes, remontee legere (hint main suit via BOX_BOTTOM)
const RIG_W = BOX_WIDTH + 40;
const RIG_H = STICK_DISPLAY_HEIGHT + BOX_BOTTOM + 40;
const STICK_COUNT = 64;
const INTERIOR_WIDTH = BOX_WIDTH * 0.50;
const STICK_WIDTH = Math.max(2, INTERIOR_WIDTH / STICK_COUNT);
const STICK_BASE_BOTTOM_OFFSET = 52;

const ACCEL_THRESHOLD = 160; // shake mobile : declenchement moins sensible
const ACCEL_NOISE_FLOOR = 3.5; // ignore le micro-tremblement (moins sensible)

const SWIPE_ANIMATION_DURATION = '0.6s';
const SWIPE_ANIMATION_DISTANCE = '16px';
const SWIPE_BELOW_BOX = 0; // colle le hint sous le bas de la boite (ancre au bas de la boite)
const SWIPE_ICON_SIZE = '48px';
const SWIPE_ICON_OPACITY = 0.5;
const SWIPE_TEXT_FONT_SIZE = '0.65rem';
const SWIPE_TEXT_MAX_WIDTH = '140px';

const PROGRESS_BAR_ABOVE_BOX = 45; // POSITIF = remonte la barre (top = 50% - (RIG_H/2 + val))
const TITLE_TOP = 48;

const RESULT_CONTAINER_BOTTOM = '24%';
const RESULT_SUBTITLE_FONT_SIZE = '0.875rem';
const RESULT_NUMBER_FONT_SIZE = '1.5rem';
const RESULT_TEXT_SPACING = '0.5rem';

// ============================================================================

interface MotionState { x: number; y: number; z: number; }

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
  y: number;                  // hauteur verticale (monte sans rebond)
  swing: number;              // angle de balancement latéral courant (degrés)
  swingV: number;             // vélocité angulaire
  restAngle: number;          // angle de repos aléatoire final (qq degrés, de travers)
  peakY: number;              // apex vertical stabilisé
  settled: boolean;
  xOffset: number;
  opacity: number;
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

// --- YiJingQuestionRig Component ---
function YiJingQuestionRig({ questionAsked }: { questionAsked: boolean }) {
  const [sticks] = useState<Stick[]>(makeSticks);
  const [shiftX, setShiftX] = useState(0);
  const [shiftY, setShiftY] = useState(0);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [jumping, setJumping] = useState<Jumping | null>(null);
  const [totalMovement, setTotalMovement] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'jumping' | 'done'>('idle');
  const [isShaking, setIsShaking] = useState(false); // user a commence a secouer -> glow boite off
  const router = useRouter();

  const dragging = useRef(false);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const lastAccel = useRef<MotionState | null>(null);
  const drawnRef = useRef<number | null>(null);
  const shiftXRef = useRef(0);
  const frozenProgressRef = useRef(0);
  const hasTriggeredRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const interiorBottom = BOX_BOTTOM - BOX_HEIGHT;

  const triggerDraw = useCallback((progress: number, currentShiftX: number) => {
    if (hasTriggeredRef.current) return;
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
    setPhase('jumping');

    // La gagnante est la SEULE à bouger : elle SORT doucement hors du haut de la
    // boîte (halo doré = « c'est celle-là »), se redresse, puis se balance
    // latéralement (gauche↔droite) avant de se stabiliser — comme une baguette
    // d'achillée qui se détache en douceur quand on agite la boîte.
    // Le clone apparaît IMMÉDIATEMENT à la position exacte de la baguette émergente
    // (même xOffset + rise gelé) : aucune disparition ni surgissement ailleurs.
    const currentRise = chosen.rise;

    setJumping({
      id: chosen.id,
      y: -currentRise,
      swing: (chosen.id % 2 === 0 ? -1 : 1) * 4, // amorçage du rebond (court)
      swingV: 0,
      restAngle: (Math.random() * 2 - 1) * 6,      // appui incliné très léger (±6°)
      peakY: -currentRise - STICK_LIFT_HEIGHT,
      settled: false,
      xOffset: chosen.stick.xOffset,
      opacity: 1,
    });
  }, [sticks]);

  // --- DeviceMotion (shake) ---
  useEffect(() => {
    if (!questionAsked) return;
    if (phase === 'done' || phase === 'jumping') return;

    const handleMotion = (e: DeviceMotionEvent) => {
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
  }, [phase, triggerDraw, questionAsked]);

  // --- Pointer events (desktop drag) ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (!questionAsked) return;
    if (phase === 'done' || phase === 'jumping') return;
    dragging.current = true;
    setIsShaking(true); // debut secouage -> retire le glow de la boite
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastPos.current = { x: e.clientX, y: e.clientY };
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!questionAsked) return;
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
      // L'émergence est gelée (effectiveProgress = frozenProgress) : on n'avance
      // PAS animatingProgress, sinon la gagnante continuerait de monter sous le clone.
      setJumping((j) => {
        if (!j || j.settled) return j;

        // Vertical : redressement lissé vers l'apex (sans rebond vertical).
        const nextY = j.y + (j.peakY - j.y) * STICK_RISE_EASE;

        // Balancement latéral : pendule amorti qui vise progressivement restAngle
        // (de travers), donc l'oscillation est forte AU DÉBUT puis s'estompe — pas
        // de déviation ajoutée à la fin.
        const swingV = (j.swingV + (j.restAngle - j.swing) * STICK_SWING_K) * STICK_SWING_DAMP;
        const nextSwing = j.swing + swingV;

        const vertDone = Math.abs(nextY - j.peakY) < 0.5;
        const swingDone = Math.abs(swingV) < 0.02 && Math.abs(nextSwing - j.restAngle) < 0.1;
        if (vertDone && swingDone) {
          setPhase('done');
          return { ...j, y: j.peakY, swing: j.restAngle, swingV: 0, settled: true };
        }
        return { ...j, y: nextY, swing: nextSwing, swingV };
      });
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [jumping]);

  const effectiveProgress = drawn !== null
    ? frozenProgressRef.current
    : Math.min(1, totalMovement / MOVEMENT_THRESHOLD);

  const TITLE_BLOCK_RESERVE = 60;
  const showSwipeHint = phase === 'idle' && totalMovement === 0 && questionAsked;

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
        cursor: phase === 'done' ? 'default' : (questionAsked ? 'grab' : 'default'),
        touchAction: "none",
        zIndex: 10,
        backgroundColor: 'transparent',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
      ` }} />
      {/* ✅ Barre de progression */}
      {phase === 'idle' && questionAsked && (
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
          // Progression gelée pour toutes (y compris gagnante) une fois le tirage
          // acté : la gagnante reste EXACTEMENT à sa position d'émergence (là où le
          // clone démarre) — aucune disparition ni surgissement d'une autre baguette.
          const stickProgress = Math.max(0, (effectiveProgress - s.emergenceDelay) / (1 - s.emergenceDelay));
          const rise = s.initialRise + stickProgress * s.baseRise;

          // La gagnante est masquée dès la phase jumping : le clone la recouvre à
          // l'identique (même xOffset + rise), donc le passage est invisible.
          const isLeaving = isDrawn && (phase === 'jumping' || phase === 'done');

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
                opacity: isLeaving ? 0 : 1,
                zIndex: s.zJitter,
              }}
            >
              <Image src={STICK_IMG} alt="" fill draggable={false} style={{ objectFit: "contain" }} />
            </div>
          );
        })}

        <div
          className={phase === 'idle' && !isShaking ? 'box-glow' : undefined}
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
              width: STICK_DISPLAY_WIDTH,
              height: STICK_DISPLAY_HEIGHT,
              transform: `translateX(${jumping.xOffset}px) translateY(${jumping.y}px) rotate(${jumping.swing}deg)`,
              transformOrigin: "bottom center", // bascule depuis la base (sol)
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
          style={{ bottom: `${BOX_BOTTOM - SWIPE_BELOW_BOX}px` }} // ancre au bas de la boite descendue
        >
          <style dangerouslySetInnerHTML={{ __html: `
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
          ` }} />
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
        </div>
      )}

      {/* ✅ Bulle animée collée à la baguette gagnante (style de l'app) */}
      {phase === 'done' && jumping && drawn !== null && (
        <motion.div
          className="absolute z-[55] pointer-events-none"
          style={{
            left: `calc(50% + ${jumping.xOffset + STICK_DISPLAY_WIDTH * 0.95 + 34}px)`,
            bottom: interiorBottom + STICK_BASE_BOTTOM_OFFSET + STICK_DISPLAY_HEIGHT * 0.7 - jumping.y,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes baguette-num-shimmer {
              0%, 100% { text-shadow: 0 0 5px rgba(255,215,0,0.55), 0 0 11px rgba(243,201,105,0.4); }
              50%      { text-shadow: 0 0 9px rgba(255,215,0,0.8),  0 0 18px rgba(243,201,105,0.6); }
            }
            .baguette-num {
              animation: baguette-num-shimmer 2.8s ease-in-out infinite;
            }
            @keyframes baguette-spark {
              0%   { opacity: 0; transform: translate(0,0) scale(0.4); }
              20%  { opacity: 1; }
              100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
            }
            .baguette-spark {
              position: absolute;
              width: 4px; height: 4px;
              border-radius: 9999px;
              background: #FFE9A8;
              box-shadow: 0 0 6px rgba(255,215,0,0.9);
              pointer-events: none;
              animation: baguette-spark 1.8s ease-out infinite;
            }
          ` }} />

          <div
            className="baguette-num relative flex items-center justify-center rounded-full px-3 py-1.5"
            style={{
              background: 'rgba(20, 14, 30, 0.82)',
              border: '1px solid rgba(243, 201, 105, 0.85)',
              boxShadow: 'inset 0 0 8px rgba(243, 201, 105, 0.15)',
              fontFamily: 'var(--font-cinzel), serif',
              color: '#FFD700',
              fontSize: '1.25rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {drawn + 1}
            {/* petites étincelles discrètes autour du numéro */}
            <span className="baguette-spark" style={{ top: '-4px', left: '20%', ['--dx' as any]: '-6px', ['--dy' as any]: '-10px', animationDelay: '0s' }} />
            <span className="baguette-spark" style={{ top: '30%', right: '-6px', left: 'auto', ['--dx' as any]: '8px', ['--dy' as any]: '-4px', animationDelay: '0.6s' }} />
            <span className="baguette-spark" style={{ bottom: '-4px', left: '60%', top: 'auto', ['--dx' as any]: '4px', ['--dy' as any]: '9px', animationDelay: '1.1s' }} />
            <span className="baguette-spark" style={{ bottom: '20%', left: '-6px', top: 'auto', ['--dx' as any]: '-7px', ['--dy' as any]: '5px', animationDelay: '1.4s' }} />
          </div>
        </motion.div>
      )}

      {/* Bouton Interprétation */}
      {phase === 'done' && drawn !== null && (
        <motion.div
          className="absolute w-full text-center z-40"
          style={{ bottom: '8vh', left: 0, right: 0 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={() => {
              localStorage.setItem('yi-jing-question-baguette', String(drawnRef.current));
              router.push('/yi-jing-question/interpretation');
            }}
            className="px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg md:text-xl font-bold tracking-wide"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              background: 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)',
              color: '#1a0e0a',
              boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
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
export default function YiJingQuestionPage() {
  const [question, setQuestion] = useState('');
  const [questionAsked, setQuestionAsked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setIsLoggedIn(true);
    setCheckingAuth(false);
  }, []);

  const handleSubmitQuestion = () => {
    if (question.trim()) {
      localStorage.setItem('yi-jing-question-question', question.trim());
      setQuestionAsked(true);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-purple-300">Vérification...</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}
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

      {/* Croix retour vers /yi-jing */}
      <Link
        href="/yi-jing"
        className="fixed top-4 right-4 text-purple-300 text-3xl font-bold hover:text-purple-200 transition-colors z-50 leading-none p-2 -m-2"
        aria-label="Retour au Yi Jing"
        style={{ textShadow: "0 0 12px rgba(180,140,200,0.35)" }}
      >
        ×
      </Link>

      {/* YI JING QUESTION RIG */}
      <YiJingQuestionRig questionAsked={questionAsked} />

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
            color: '#C6A8E6',
            letterSpacing: '0.2em',
            textShadow: '0 0 40px rgba(180,140,200,0.7), 0 0 80px rgba(140,100,180,0.4)',
            fontSize: 'clamp(1.4rem, 5vw, 3.5rem)',
            textTransform: 'uppercase',
            marginBottom: '0.25rem',
          }}
        >
          Yi Jing — Question
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#E0CFF0',
            textShadow: '0 0 10px rgba(180,140,200,0.6), 0 1px 4px rgba(0,0,0,0.9)',
            letterSpacing: '0.05em',
            fontStyle: 'italic',
            fontSize: 'clamp(0.65rem, 1.8vw, 0.9rem)',
          }}
        >
          Posez votre question à l'oracle
        </p>
      </div>

      {/* CHAMP QUESTION — visible avant le tirage */}
      {!questionAsked && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-full max-w-md bg-black/70 backdrop-blur-md rounded-2xl p-5 border border-yellow-700/30 shadow-2xl">
            <p
              className="text-center text-yellow-300/80 text-sm mb-3"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              🪶 Formulez votre question
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitQuestion();
                }
              }}
              placeholder="Ex: Dois-je accepter cette opportunité professionnelle ?"
              className="w-full bg-black/50 text-yellow-100 placeholder-yellow-700/50 rounded-lg p-3 text-sm border border-yellow-800/30 focus:border-yellow-500/50 focus:outline-none transition-colors resize-none"
              rows={3}
              style={{ fontFamily: 'serif' }}
              autoFocus
            />
            <motion.button
              onClick={handleSubmitQuestion}
              disabled={!question.trim()}
              className="w-full mt-3 py-3 rounded-xl font-bold tracking-wide transition-all"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                background: question.trim()
                  ? 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)'
                  : 'rgba(60, 50, 20, 0.4)',
                color: question.trim() ? '#1a0e0a' : 'rgba(255, 215, 0, 0.3)',
                boxShadow: question.trim() ? '0 0 30px rgba(218,165,32,0.4)' : 'none',
                border: '2px solid rgba(218,165,32,0.3)',
                cursor: question.trim() ? 'pointer' : 'not-allowed',
              }}
              whileHover={question.trim() ? { scale: 1.03 } : {}}
              whileTap={question.trim() ? { scale: 0.97 } : {}}
            >
              ✨ Valider et tirer une baguette
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Affichage de la question posée */}
      {questionAsked && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-6"
          style={{ top: TITLE_TOP + 60 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-yellow-950/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-yellow-700/20 text-center">
            <p className="text-yellow-500/60 text-xs uppercase tracking-wide mb-0.5">Votre question</p>
            <p className="text-yellow-200 italic text-sm">"{question}"</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
