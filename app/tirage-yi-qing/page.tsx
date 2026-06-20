'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const BOX_IMG = "/images/boite.png";
const STICK_IMG = "/images/baguette.png";
const HAND_IMG = "/images/hand.png"; // Assumons cet ajout asset

// --- Paramètres ajustables ---
const MOVEMENT_THRESHOLD = 450; // distance totale de mouvement (px) nécessaire pour déclencher le tirage
const STICK_LEFT_OFFSET = -3; // décalage vers la gauche en pixels
const MAX_BOX_SHIFT_X = 15; // déplacement max horizontal de la boîte en pixels
const MAX_BOX_SHIFT_Y = 10; // déplacement max vertical de la boîte en pixels
const STICK_JUMP_HEIGHT = 55
; // hauteur de saut supplémentaire depuis la position actuelle
const MAX_INITIAL_RISE = 15; // hauteur max de sortie initiale aléatoire des baguettes (px)
const HORIZONTAL_SENSITIVITY = 0.6; // sensibilité du déplacement horizontal
const VERTICAL_SENSITIVITY = 0.6; // sensibilité du déplacement vertical
const TOP_STICKS_COUNT = 3; // nombre de baguettes les plus hautes parmi lesquelles choisir

// --- Paramètres d'émergence ---
const PROMINENT_STICKS_MIN = 3; // nombre min de baguettes qui sortent franchement
const PROMINENT_STICKS_MAX = 9; // nombre max de baguettes qui sortent franchement
const MAX_RISE_IN_BOX = 6; // distance max de sortie pour les baguettes restant dans la boîte (px)
const MAX_PROMINENT_RISE = 95; // distance max de sortie pour les baguettes proéminentes (px)

// --- Dimensions des baguettes (ajustables librement) ---
const STICK_DISPLAY_WIDTH = 4.5; // largeur affichée de chaque baguette en px
const STICK_DISPLAY_HEIGHT = 260; // hauteur affichée de chaque baguette en px

// --- Dimensions de la boîte (s'adaptent aux baguettes) ---
const BOX_WIDTH = STICK_DISPLAY_WIDTH * 10; // largeur boîte = ~12 baguettes côte à côte
const BOX_HEIGHT = STICK_DISPLAY_HEIGHT * 0.45; // hauteur boîte = ~45% de la hauteur baguette
const BOX_BOTTOM = 70;

// --- Dimensions du conteneur (dérivées) ---
const RIG_W = BOX_WIDTH + 40;
const RIG_H = STICK_DISPLAY_HEIGHT + BOX_BOTTOM + 40;

const STICK_COUNT = 64;
const INTERIOR_WIDTH = BOX_WIDTH * 0.50;
const STICK_WIDTH = Math.max(2, INTERIOR_WIDTH / STICK_COUNT);

// --- Paramètres de positionnement ---
const RESULT_TEXT_BOTTOM = 148; // hauteur du texte "Baguette n°..." depuis le bas (px)
const STICK_BASE_BOTTOM_OFFSET = 52; // décalage vertical de départ des baguettes (px)

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

  // Déterminer combien de baguettes sortiront franchement
  const prominentCount = Math.floor(Math.random() * (PROMINENT_STICKS_MAX - PROMINENT_STICKS_MIN + 1)) + PROMINENT_STICKS_MIN;
  
  // Sélectionner aléatoirement les IDs des baguettes proéminentes
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
      // Les proéminentes montent jusqu'à MAX_PROMINENT_RISE, les autres limitées par MAX_RISE_IN_BOX
      baseRise: isProminent ? 20 + Math.random() * (MAX_PROMINENT_RISE - 20) : Math.random() * MAX_RISE_IN_BOX,
      rotation: Math.random() * 6 - 3,
      zJitter: 1 + Math.floor(Math.random() * 15),
      yJitter: Math.random() * 4,
      // Les proéminentes commencent à sortir tôt, les autres très tard
      emergenceDelay: isProminent ? Math.random() * 0.4 : 0.7 + Math.random() * 0.3,
      initialRise: Math.random() * MAX_INITIAL_RISE,
    };
  });
}

function getStickRise(stick: Stick, progress: number): number {
  const stickProgress = Math.max(0, (progress - stick.emergenceDelay) / (1 - stick.emergenceDelay));
  return stick.initialRise + stickProgress * stick.baseRise;
}

export default function TirageYiQingPage() {
  const [sticks] = useState<Stick[]>(makeSticks);
  const [shiftX, setShiftX] = useState(0);
  const [shiftY, setShiftY] = useState(0);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [jumping, setJumping] = useState<Jumping | null>(null);
  const [totalMovement, setTotalMovement] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'jumping' | 'done'>('idle');

  const dragging = useRef(false);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const drawnRef = useRef<number | null>(null);
  const shiftXRef = useRef(0);

  const interiorBottom = BOX_BOTTOM - BOX_HEIGHT;

  const triggerDraw = useCallback((progress: number, currentShiftX: number) => {
    if (drawnRef.current !== null) return;
    
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

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase === 'done' || phase === 'jumping') return;
    dragging.current = true;
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drawnRef.current !== null) return;
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

  useEffect(() => {
    if (!jumping) return;

    const step = () => {
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

  const progress = Math.min(1, totalMovement / MOVEMENT_THRESHOLD);

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ backgroundColor: '#0a0604' }}>
      {/* Titre Yi Jing abaissé */}
      <div className="absolute top-16 w-full text-center z-50">
        <h1 className="text-4xl text-[#FFD700] font-serif tracking-widest">Yi Jing</h1>
      </div>

      <div className="flex items-center justify-center h-full">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            position: "relative",
            width: RIG_W,
            height: RIG_H,
            margin: "0 auto",
            cursor: phase === 'done' ? 'default' : 'grab',
            touchAction: "none",
          }}
        >
          {/* Main qui se déplace (Hand animation) */}
          {phase === 'idle' && (
            <motion.div
              className="absolute -bottom-24 left-1/2 -translate-x-1/2 z-40 opacity-50"
              initial={{ x: -40 }}
              animate={{ x: 40 }}
              transition={{ repeat: 8, duration: 1, repeatType: "reverse", ease: "easeInOut" }}
            >
              <Image src={HAND_IMG} alt="Hand" width={40} height={40} />
            </motion.div>
          )}

          {/* Barre de progression déplacée et stylisée */}
          {phase === 'idle' && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-2 rounded-full overflow-hidden border border-[#FFD700]/30" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  backgroundColor: '#FFD700',
                  transition: 'width 0.1s',
                  boxShadow: '0 0 10px #FFD700'
                }}
              />
            </div>
          )}

          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translate(${shiftX}px, ${shiftY}px)`,
              transition: dragging.current ? "none" : "transform 0.25s ease-out",
            }}
          >
                      {/* Baguettes */}
            {sticks.map((s) => {
              const isDrawn = drawn === s.id;
              const stickProgress = isDrawn
                ? progress
                : Math.max(0, (progress - s.emergenceDelay) / (1 - s.emergenceDelay));
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

            {/* Boîte */}
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

            {/* Baguette tirée qui saute depuis sa position actuelle */}
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
        </div>
      </div>

      {/* Résultat */}
      {phase === 'done' && drawn !== null && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-50 text-center animate-fade-in" 
          style={{ bottom: RESULT_TEXT_BOTTOM }}
        >
          <p
            className="text-sm mb-2"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(255, 215, 0, 0.7)' }}
          >
            Le sort a parlé
          </p>
          <strong
            className="text-2xl block"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFD700' }}
          >
            Baguette n°{drawn + 1}
          </strong>
        </div>
      )}

      {/* Instructions */}
      {phase === 'idle' && (
        <div className="absolute left-1/2 -translate-x-1/2 z-50 text-center" style={{ bottom: RESULT_TEXT_BOTTOM }}>
          <p
            className="text-sm"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(255, 215, 0, 0.5)' }}
          >
            Secouez la boîte pour consulter l'oracle
          </p>
        </div>
      )}
    </div>
  );
}