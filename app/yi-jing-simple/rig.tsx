'use client';

// Le rig de tirage de /yi-jing-simple (boite + 64 baguettes, physique du
// secouement, extrait de la baguette elue). Etape 2/2 du decoupage :
// deplace tel quel depuis page.tsx, sans modification de logique.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLang, pick4, tr } from '@/lib/i18n';
import { isEffectsEnabled } from '@/lib/sounds';
import {
  BOX_IMG, STICK_IMG, MOVEMENT_THRESHOLD, MAX_BOX_SHIFT_X, MAX_BOX_SHIFT_Y, STICK_LIFT_HEIGHT, STICK_RISE_EASE, STICK_SWING_K, STICK_SWING_DAMP, HORIZONTAL_SENSITIVITY, VERTICAL_SENSITIVITY, TOP_STICKS_COUNT, STICK_DISPLAY_WIDTH, STICK_DISPLAY_HEIGHT, STICK_REAL_WIDTH, BOX_WIDTH, BOX_HEIGHT, BOX_BOTTOM, RIG_W, RIG_H, STICK_BASE_BOTTOM_OFFSET, ACCEL_THRESHOLD, ACCEL_NOISE_FLOOR, SWIPE_ANIMATION_DURATION, SWIPE_ANIMATION_DISTANCE, SWIPE_BELOW_BOX, SWIPE_ICON_SIZE, SWIPE_ICON_OPACITY, SWIPE_TEXT_FONT_SIZE, SWIPE_TEXT_MAX_WIDTH, PROGRESS_BAR_ABOVE_BOX, RESULT_CONTAINER_BOTTOM, RESULT_SUBTITLE_FONT_SIZE, makeSticks, getStickRise,
  type MotionState, type Stick, type Jumping,
} from './rig-config';

// --- YiQingRig Component ---
export function YiQingRig({ questionAsked, question }: { questionAsked: boolean; question: string }) {
  const lang = useLang();
  const [sticks] = useState<Stick[]>(makeSticks);
  const [shiftX, setShiftX] = useState(0);
  const [shiftY, setShiftY] = useState(0);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [jumping, setJumping] = useState<Jumping | null>(null);
  const [totalMovement, setTotalMovement] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'jumping' | 'done'>('idle');
  const [isShaking, setIsShaking] = useState(false); // user a commence a secouer -> glow boite off
  const [fadingOut, setFadingOut] = useState(false); // boite + baguettes disparaissent apres le tirage
  const [messageGone, setMessageGone] = useState(false); // le message sous le bouton disparait apres 10s
  const [winSparkOn, setWinSparkOn] = useState(false); // etincelles autour de la gagnante 1.5s apres le tirage
  const [centered, setCentered] = useState(false); // baguette + numero derivent vers le centre apres le tirage
  const [interpreting, setInterpreting] = useState(false); // bouton Interpretation : anti double-clic + greye
  const router = useRouter();

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
  const lastDirRef = useRef<number>(0);      // direction du dernier mouvement (shake)
  const reversalsRef = useRef<number>(0);    // nombre d'inversions de direction
  const SHAKE_REVERSALS_REQUIRED = 4;        // secousses reelles (aller-retour) minimum
  // Audio de tirage : instance réutilisable + déverrouillage autoplay au 1er geste/capteur.
  const drawSoundRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudio = useCallback(() => {
    if (!isEffectsEnabled()) return;
    try {
      const a = new Audio('/audio/stick-draw.mp3');
      a.volume = 0.8;
      a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
      drawSoundRef.current = a;
    } catch {}
  }, []);
  useEffect(() => {
    const onFirst = () => unlockAudio();
    window.addEventListener('pointerdown', onFirst, { once: true });
    window.addEventListener('touchstart', onFirst, { once: true });
    window.addEventListener('keydown', onFirst, { once: true });
    window.addEventListener('devicemotion', onFirst, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('touchstart', onFirst);
      window.removeEventListener('keydown', onFirst);
      window.removeEventListener('devicemotion', onFirst);
    };
  }, [unlockAudio]);

  const interiorBottom = BOX_BOTTOM - BOX_HEIGHT;

  const triggerDraw = useCallback((progress: number, currentShiftX: number) => {
          if (hasTriggeredRef.current) return;
    
          // 🛡️ Verrouille immédiatement pour bloquer tout événement de mouvement suivant
    hasTriggeredRef.current = true;
    frozenProgressRef.current = progress;
    
    // Son de tirage : déclenché à l'instant où le tirage est détecté,
    // juste avant la montée de la baguette élue.
    if (isEffectsEnabled()) {
      try {
        const snd = drawSoundRef.current || new Audio('/audio/stick-draw.mp3');
        drawSoundRef.current = snd;
        snd.volume = 0.8;
        snd.currentTime = 0;
        snd.play().catch(() => {});
      } catch {}
    }
    
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
    if (!questionAsked) return; // le tirage ne demarre qu'apres la question
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
            // direction dominante du mouvement (pour detecter un vrai shake aller-retour)
            const dir = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy);
            if (lastDirRef.current !== 0 && dir !== 0 && dir !== lastDirRef.current) {
              reversalsRef.current += 1;
            }
            if (dir !== 0) lastDirRef.current = dir;
            
            setShiftX((prevX) => {
              const next = Math.max(-MAX_BOX_SHIFT_X, Math.min(MAX_BOX_SHIFT_X, prevX + dx * HORIZONTAL_SENSITIVITY * 2));
              shiftXRef.current = next;
              return next;
            });
            setShiftY((prevY) => Math.max(-MAX_BOX_SHIFT_Y, Math.min(MAX_BOX_SHIFT_Y, prevY + dy * VERTICAL_SENSITIVITY * 2)));

            setTotalMovement((prev) => {
              const next = prev + distance;
              // declenchement uniquement apres assez de secousses reelles (aller-retour)
              if (reversalsRef.current >= SHAKE_REVERSALS_REQUIRED && next >= ACCEL_THRESHOLD) {
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
            // Déverrouille l'autoplay audio dès l'interaction capteur (clic iOS).
            if (isEffectsEnabled()) {
              try {
                const a = new Audio('/audio/stick-draw.mp3');
                a.volume = 0.8;
                a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
                drawSoundRef.current = a;
              } catch {}
            }
          }
        })
        .catch(() => {});
    } else if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion);
      // Desktop : le 1er mouvement capteur sert de déverrouillage autoplay.
      try {
        const a = new Audio('/audio/stick-draw.mp3');
        a.volume = 0.8;
        a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
        drawSoundRef.current = a;
      } catch {}
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, [phase, triggerDraw, questionAsked]);

  // --- Pointer events (desktop drag) ---
  const onPointerDown = (e: React.PointerEvent) => {
    if (!questionAsked) return; // question obligatoire avant le tirage
    if (phase === 'done' || phase === 'jumping') return;
    dragging.current = true;
    setIsShaking(true); // debut secouage -> retire le glow de la boite
    lastX.current = e.clientX;
    lastY.current = e.clientY;
    lastPos.current = { x: e.clientX, y: e.clientY };
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // 🛡️ Vérification synchrone immédiate
    if (hasTriggeredRef.current) return;
    if (!dragging.current || !lastPos.current || lastX.current === null || lastY.current === null) return;

    const dx = e.clientX - lastX.current;
    const dy = e.clientY - lastY.current;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // direction dominante (horizontal = secousse reelle) : compte les aller-retour
    const dir = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy);
    if (lastDirRef.current !== 0 && dir !== 0 && dir !== lastDirRef.current) {
      reversalsRef.current += 1;
    }
    if (dir !== 0) lastDirRef.current = dir;
    
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
      // declenchement uniquement apres assez de secousses reelles (aller-retour)
      if (reversalsRef.current >= SHAKE_REVERSALS_REQUIRED && next >= MOVEMENT_THRESHOLD) {
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

  // --- Disparition progressive boite + baguettes des que la gagnante est sortie (2s) ---
  // Le message sous le bouton disparait 5s apres le tirage.
  useEffect(() => {
    if (phase !== 'done') return;
    setFadingOut(true);
    const tMsg = setTimeout(() => setMessageGone(true), 10000);
    const tSpark = setTimeout(() => setWinSparkOn(true), 1500);
    // baguette + numero derivent vers le centre 0.8s apres le tirage
    const tCenter = setTimeout(() => setCentered(true), 800);
    return () => { clearTimeout(tMsg); clearTimeout(tSpark); clearTimeout(tCenter); };
  }, [phase]);

  // Position d'affichage : derive vers le centre (xOffset -> 0) une fois 'centered'
  const displayX = centered ? 0 : (jumping?.xOffset ?? 0);

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

  // 🛡️ Utilise strictement la progression gelée dès que le tirage est acté
  const effectiveProgress = drawn !== null 
    ? frozenProgressRef.current 
    : Math.min(1, totalMovement / MOVEMENT_THRESHOLD);

  const TITLE_BLOCK_RESERVE = 60;
  const showSwipeHint = questionAsked && phase === 'idle' && totalMovement === 0;

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
      <style dangerouslySetInnerHTML={{ __html: `
        .yi-interpret-btn::before {
          content: "";
          position: absolute;
          inset: 4px;
          border-radius: 9px;
          border: 1px solid rgba(243, 201, 105, 0);
          background: linear-gradient(120deg, rgba(243,201,105,0.9) 0%, rgba(243,201,105,0) 40%, rgba(243,201,105,0) 60%, rgba(243,201,105,0.9) 100%) border-box;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          padding: 1px;
          opacity: 0.6;
          transition: opacity 0.3s ease;
          pointer-events: none;
          animation: yi-interpret-pulse 2.2s ease-in-out infinite;
        }
        .yi-interpret-btn {
          animation: yi-interpret-glow 2.2s ease-in-out infinite;
        }
        @keyframes yi-interpret-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes yi-interpret-glow {
          0%, 100% { box-shadow: 0 0 14px rgba(218,165,32,0.45), inset 0 0 10px rgba(255,240,200,0.25); }
          50% { box-shadow: 0 0 28px rgba(218,165,32,0.8), inset 0 0 10px rgba(255,240,200,0.3); }
        }
        .yi-interpret-btn:hover::before { animation: none; opacity: 1; }
        .yi-win-spark {
          position: absolute;
          width: 5px; height: 5px;
          border-radius: 9999px;
          background: #FFE9A8;
          box-shadow: 0 0 5px rgba(255,215,0,0.9);
          pointer-events: none;
          animation: yi-win-spark 1.8s ease-out infinite;
        }
        @keyframes yi-win-spark {
          0%   { opacity: 0; transform: translate(0,0) scale(0.4); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx, 6px), var(--dy, -8px)) scale(1); }
        }
      ` }} />
      {/* ✅ Barre de progression FIXE */}
      {questionAsked && phase === 'idle' && (
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
          const stickProgress = Math.max(0, (effectiveProgress - s.emergenceDelay) / (1 - s.emergenceDelay));
          const rise = s.initialRise + stickProgress * s.baseRise;

          // La baguette ELEUE est la vraie baguette de tete de la pile : elle sort
          // directement (pas de clone). En phase jumping/done, elle prend l'etat
          // anime 'jumping' (montee + swing) et passe au-dessus des autres.
          const isWin = isDrawn && jumping != null;
          const winX = isWin ? displayX : s.xOffset;
          const winY = isWin ? (centered ? 0 : jumping.y) : -rise;
          const winRot = isWin ? jumping.swing : s.rotation + shiftX * 0.03 * (s.id % 2 === 0 ? 1 : -1);
          const isLeaving = isDrawn && (phase === 'jumping' || phase === 'done');

          return (
            <div
              key={s.id}
              style={{
                position: "absolute",
                bottom: isWin
                  ? `calc(57% - ${STICK_DISPLAY_HEIGHT / 2}px)`
                  : interiorBottom + STICK_BASE_BOTTOM_OFFSET,
                left: "50%",
                width: STICK_DISPLAY_WIDTH,
                height: STICK_DISPLAY_HEIGHT,
                transformOrigin: "bottom center",
                transform: `translateX(${winX}px) translateY(${winY}px) rotate(${winRot}deg)`,
                transition: dragging.current ? "none" : (isWin ? (centered ? "transform 2.5s ease-in-out, opacity 2s linear" : "transform 0.1s linear, opacity 2s linear") : "transform 0.3s ease-out, opacity 2s linear"),
                opacity: isWin ? 1 : ((isDrawn && !fadingOut) ? 1 : (fadingOut ? 0 : (isLeaving ? 0.7 : 1))),
                zIndex: isWin ? 12 : s.zJitter,
                filter: isWin ? "drop-shadow(0 0 3px rgba(243,201,105,0.95)) drop-shadow(0 0 7px rgba(243,201,105,0.55))" : undefined,
              }}
            >
              <Image src={STICK_IMG} alt="" fill draggable={false} style={{ objectFit: "contain" }} />
              {/* etincelles autour de la gagnante (apres 1.5s) : calque recadre sur
                  la baguette pour positionner les etincelles */}
              {isWin && winSparkOn && (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    width: STICK_REAL_WIDTH,
                    height: STICK_DISPLAY_HEIGHT,
                    transform: "translateX(-50%)",
                    pointerEvents: "none",
                  }}
                >
                  <span className="yi-win-spark" style={{ top: '28%', left: '30%', animationDelay: '0s' }} />
                  <span className="yi-win-spark" style={{ top: '38%', right: '20%', left: 'auto', animationDelay: '0.5s' }} />
                  <span className="yi-win-spark" style={{ top: '48%', left: '10%', animationDelay: '1s' }} />
                  <span className="yi-win-spark" style={{ top: '58%', right: '15%', left: 'auto', animationDelay: '1.4s' }} />
                  <span className="yi-win-spark" style={{ top: '66%', left: '28%', animationDelay: '0.8s' }} />
                  <span className="yi-win-spark" style={{ top: '72%', right: '25%', left: 'auto', animationDelay: '1.8s' }} />
                </div>
              )}
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
            opacity: fadingOut ? 0 : 1,
            transition: "opacity 2s linear",
          }}
        >
          <Image src={BOX_IMG} alt={tr('Boîte', 'Box', 'Caja', 'डिब्बा')} fill draggable={false} style={{ objectFit: "contain" }} />
        </div>

      </div>

      {/* ✅ Animation Swipe (main qui s'agite) sous la boîte */}
      {showSwipeHint && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1"
          style={{
            bottom: `${BOX_BOTTOM - SWIPE_BELOW_BOX}px`, // ancre au bas de la boite descendue
          }}
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
            {pick4('Secouez la boîte pour le tirage d\'une baguette d\'achillée', 'Shake the box to draw a yarrow stalk', 'Agita la caja para extraer una vara de milenrama', 'एचिली की डंडी निकालने के लिए डिब्बा हिलाएँ')(lang)}
          </p>
        </div>
      )}

      {phase === 'done' && drawn !== null && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-50 text-center animate-fade-in"
          style={{
            bottom: RESULT_CONTAINER_BOTTOM,
            opacity: fadingOut ? 0 : 1,
            transition: "opacity 2s linear",
          }}
        >
          <p
            className="mb-2"
            style={{ 
              fontFamily: 'var(--font-cinzel), serif', 
              color: 'rgba(255, 215, 0, 0.7)',
              fontSize: RESULT_SUBTITLE_FONT_SIZE
            }}
          >
            {pick4('Le sort a parlé', 'The lot has spoken', "El destino ha hablado", "भाग्य ने कह दिया")(lang)}
          </p>
        </div>
      )}

      {/* ✅ Bulle animée collée à la baguette gagnante (style de l'app) */}
      {phase === 'done' && jumping && drawn !== null && (
        <div
          className="absolute z-[55] pointer-events-none baguette-num-pop"
          style={{
            left: `calc(50% + ${displayX + STICK_DISPLAY_WIDTH * 0.95 + 34}px)`,
            bottom: centered
              ? `calc(57% + ${STICK_DISPLAY_HEIGHT * 0.05}px)`
              : interiorBottom + STICK_BASE_BOTTOM_OFFSET + STICK_DISPLAY_HEIGHT * 0.85 - jumping.y,
            transition: "left 2.5s ease-in-out, bottom 2.5s ease-in-out", // suit la baguette vers le centre
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes baguette-num-shimmer {
              0%, 100% { text-shadow: 0 0 5px rgba(255,215,0,0.55), 0 0 11px rgba(243,201,105,0.4); }
              50%      { text-shadow: 0 0 9px rgba(255,215,0,0.8),  0 0 18px rgba(243,201,105,0.6); }
            }
            .baguette-num {
              animation: baguette-num-shimmer 2.8s ease-in-out infinite;
            }
            @keyframes baguette-num-pop {
              0%   { opacity: 0; transform: scale(0.5); }
              100% { opacity: 1; transform: scale(1); }
            }
            .baguette-num-pop { animation: baguette-num-pop 0.5s ease-out both; }
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
        </div>
      )}

      {/* Zone G: Bouton Interprétation - glisse vers l'emplacement de la boite apres le tirage */}
      {phase === 'done' && drawn !== null && (
        <motion.div
          className="absolute w-full text-center z-50"
          style={{
            left: 0,
            right: 0,
          }}
          initial={{ opacity: 0, bottom: '40px' }}
          animate={{
            opacity: 1,
            bottom: fadingOut ? `${BOX_BOTTOM - 45}px` : '40px',
          }}
          transition={{ bottom: { duration: 2.5, ease: 'easeInOut' }, opacity: { duration: 0.6 } }}
        >
          <motion.button
            onClick={() => {
              if (interpreting) return;
              setInterpreting(true);
              // drawnRef.current est 0-based (0..63) -> +1 pour l'hexagramme 1..64
              localStorage.setItem('yi-jing-simple-baguette', String((drawnRef.current ?? 0) + 1));
              // Question posée dans la modale (transmise à l'IA + historique).
              localStorage.setItem('yi-jing-simple-question', question);
              router.push('/yi-jing-simple/interpretation');
            }}
            disabled={interpreting}
            className="yi-interpret-btn px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg md:text-xl font-bold tracking-wide"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              position: 'relative',
              background: interpreting
                ? 'linear-gradient(135deg, #6b6b6b 0%, #4a4a4a 55%, #6b6b6b 100%)'
                : 'linear-gradient(135deg, #E8B84B 0%, #C9962E 55%, #E8B84B 100%)',
              color: interpreting ? '#cfcfcf' : '#2a1808',
              border: interpreting ? '2px solid #888' : '2px solid #F3C969',
              boxShadow: interpreting
                ? 'none'
                : '0 0 16px rgba(218,165,32,0.45), inset 0 0 10px rgba(255,240,200,0.25)',
              cursor: interpreting ? 'not-allowed' : 'pointer',
              opacity: interpreting ? 0.6 : 1,
            }}
            whileHover={{ scale: interpreting ? 1 : 1.04 }}
            whileTap={{ scale: interpreting ? 1 : 0.97 }}
          >
            <span className="relative z-10">
              {interpreting ? (pick4('Chargement…', 'Loading…', "Cargando…", "लोड हो रहा है…")(lang)) : (pick4('Consulter l\'Oracle', 'Consult the Oracle', 'Consultar el Oráculo', 'ओरैकल से परामर्श करें')(lang))}
            </span>
          </motion.button>
          <p
            className="mt-3 text-center"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              color: 'rgba(255, 215, 0, 0.75)',
              fontSize: '0.95rem',
              lineHeight: '1.35',
              maxWidth: '20rem',
              marginLeft: 'auto',
              marginRight: 'auto',
              opacity: messageGone ? 0 : 1,
              transition: 'opacity 1s ease-in',
            }}
          >
            {pick4('La baguette élue est sortie de la boîte. Cliquez sur le bouton pour découvrir le message que l\'Oracle vous destine.', 'The chosen stalk has left the box. Click the button to discover the message the Oracle has for you.', 'La vara elegida ha salido de la caja. Pulse el botón para descubrir el mensaje que el Oráculo tiene para usted.', 'चुनी हुई डंडी डिब्बे से बाहर आ गई है। बटन दबाकर जानिए ओरैकल आपके लिए क्या संदेश लेकर आया है।')(lang)}
          </p>
        </motion.div>
      )}
    </div>
  );
}
