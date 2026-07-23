'use client';

// components/astro-dice/AstroDiceCup.tsx
//
// <AstroDiceCup/> — Empile DEUX animations indépendantes :
//
//   ANIM 1 (fond, z-index bas)  : <AstroDiceSet/> existant — arène + 3 dés
//                                 qui roulent et s'immobilisent sur leurs faces.
//   ANIM 2 (overlay transparent, z-index haut) : un GOBELET en vue zénithale
//                                 (public/images/gobelet1/2/3.png) que
//                                 l'utilisateur secoue puis renverse pour
//                                 "faire tomber" les dés dans l'arène.
//
// Machine d'états (overlay) :
//   idle   : gobelet posé en bas de l'arène (gobelet1) — invitation à secouer
//   shake  : l'utilisateur bouge le doigt gauche/droite → autant d'A/R qu'il
//            veut pour "mélanger" ; 3 changements de direction déclenchent la
//            phase tip (prêt à renverser)
//   tip    : 3 "pushes" verticaux (montées) dans le pad → à chaque push on joue
//            gobelet2 puis gobelet3 ; AU 3e push (gobelet3 affiché) on déclenche
//            AUTOMATIQUEMENT le lancer (ANIM 1) en passant `spawn` = rebord bas
//   done   : gobelet3 reste ; l'ANIM 1 tourne ; on attend onRest
//
// Dépendances : framer-motion (déjà présent), React, le <AstroDiceSet/> frère.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useTransform,
  animate,
  type MotionStyle,
} from 'framer-motion';
import AstroDiceSet from './AstroDiceSet';
import { randomTargetFaces, type TargetFaces } from './glyphs';
import type { AstroDiceSetProps } from './AstroDiceSet';

/* -------------------------------------------------------------------------- */
/*  Physique des mini-dés dans le gobelet                                      */
/* -------------------------------------------------------------------------- */

/** Simulation 2D : N dés rebondissent dans un cercle de rayon R. Au shake, le
 *  déplacement horizontal du gobelet injecte de l'énergie (vitesse latérale).
 *  Retourne un tableau de MotionValue {x,y} (centre du dé, relatif au centre
 *  du gobelet) prêt à être branché sur `style={{ x, y }}`. */
function useCupDice(
  count: number,
  R: number,
  shakeX: ReturnType<typeof useMotionValue<number>>,
) {
  const state = useRef(
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return {
        x: Math.cos(a) * R * 0.5,
        y: Math.sin(a) * R * 0.5,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
      };
    }),
  );
  const mvs = useRef(
    Array.from({ length: count }, () => ({
      x: useMotionValue(0),
      y: useMotionValue(0),
    })),
  ).current;

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let lastShake = shakeX.get();
    const s = state.current;
    const dtCap = 0.032;

    const step = (now: number) => {
      const dt = Math.min((now - prev) / 1000, dtCap);
      prev = now;
      const sx = shakeX.get();
      const dShake = sx - lastShake;
      lastShake = sx;
      const kick = dShake * 6;

      for (let i = 0; i < s.length; i++) {
        const d = s[i];
        d.vx += kick;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vx *= 0.992;
        d.vy *= 0.992;
        const dist = Math.hypot(d.x, d.y);
        const lim = R - CUP_DIE_SIZE / 2;
        if (dist > lim) {
          const nx = d.x / dist;
          const ny = d.y / dist;
          d.x = nx * lim;
          d.y = ny * lim;
          const dot = d.vx * nx + d.vy * ny;
          d.vx -= 2 * dot * nx;
          d.vy -= 2 * dot * ny;
          d.vx *= 0.9;
          d.vy *= 0.9;
        }
        d.vy += 12 * dt;
        mvs[i].x.set(d.x);
        mvs[i].y.set(d.y);
      }

      for (let i = 0; i < s.length; i++) {
        for (let j = i + 1; j < s.length; j++) {
          const a = s[i];
          const b = s[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy);
          const min = CUP_DIE_SIZE;
          if (d > 0 && d < min) {
            const nx = dx / d;
            const ny = dy / d;
            const overlap = (min - d) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            const va = a.vx * nx + a.vy * ny;
            const vb = b.vx * nx + b.vy * ny;
            const diff = vb - va;
            a.vx += diff * nx;
            a.vy += diff * ny;
            b.vx -= diff * nx;
            b.vy -= diff * ny;
          }
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, R]);

  return mvs;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

type Phase = 'idle' | 'shake' | 'tip' | 'done';
type CupImg = '/images/gobelet1.png' | '/images/gobelet2.png' | '/images/gobelet3.png';

export interface AstroDiceCupProps
  extends Omit<AstroDiceSetProps, 'spawn' | 'isRolling'> {
  /**
   * Point de "chute" (repère monde XZ de l'arène) où les 3 dés apparaissent
   * quand on renverse le gobelet. Par défaut le rebord bas de l'arène
   * (z = +ARENA_R*0.62) → tombe du bas de l'écran, cohérent avec le gobelet
   * renversé vers le haut.
   */
  spawn?: { x: number; z: number };
  /** Callback appelé quand le contexte WebGL du canvas est prêt (arène
   *  jouable). Permet à la page parente de révéler le composant uniquement
   *  une fois entièrement chargé (gobelet prêt à être secoué). */
  onReady?: () => void;
  /** Incrémenter ce nombre remet le composant à son état initial
   *  (mini-dés visibles dans gobelet1, dés d'animation invisibles). */
  resetSignal?: number;
  /** Incrémenter ce nombre déclenche un lancer programmatique du gobelet
   *  (équivalent au geste push). Permet un bouton « Lancer » côté page. */
  launchSignal?: number;
  /** Callback appelé dès que l'utilisateur commence à secouer le gobelet
   *  (premier touch/pointer down sur le pad de secousse). */
  onShake?: () => void;
  /** Quand true, le pad tactile passe en touchAction:'none' (bloque le scroll
   *  pendant la manipulation du gobelet). */
  lockScroll?: boolean;
}

/* Gobelet : taille validée (60px). Positionné au BORD BAS de l'arène, pas au
   centre → on le place à ~80% de la hauteur du conteneur. */
const GOBLET_SIZE = 52; // px (taille intermédiaire commune aux 3 gobelets)
const GOBLET_TOP = '88%'; // bord bas de l'arène (un peu plus bas)

/* Mini-dés simulant les dés dans le gobelet : ils rebondissent librement
   dans la circonférence interne du gobelet (physique 2D : murs + collisions
   inter-dés + injection d'énergie au shake). Voir useCupDice ci-dessous. */
const CUP_DICE_COUNT = 3;
const CUP_DIE_SIZE = 10; // px (petit)
const CUP_CIRCLE_R = 17; // rayon interne du gobelet (px) — à calibrer visuellement

/* Pad de secousse en bas de l'écran (hors arène) : il capte le gauche/droite
   (shake) et les montées (tip). */
const PAD_HEIGHT = 90; // px

/* -------------------------------------------------------------------------- */
/*  Composant                                                                    */
/* -------------------------------------------------------------------------- */

export default function AstroDiceCup({
  targetFaces,
  rollDurationMs = 3000,
  onRest,
  height = 460,
  font,
  skin,
  background,
  className,
  spawn = { x: 0, z: 3.2 },
  resetSignal = 0,
  /** Incrémenter ce compteur (depuis la page) déclenche un lancer
   *  programmatique du gobelet (équivalent au geste push). Permet un
   *  bouton « Lancer » sans dépendre du geste tactile. */
  launchSignal = 0,
  onReady,
  activeKinds,
  onShake,
  lockScroll,
  verticalShift = 0,
  diceHop,
}: AstroDiceCupProps) {
  // `rolling` est PILOTÉ EN INTERNE par le wrapper : au 2e push (gobelet3),
  // on passe rolling=true → l'ANIM 1 se déclenche (dés qui "tombent" en
  // `spawn`). handleRest remet rolling=false + remonte le résultat.
  const [phase, setPhase] = useState<Phase>('idle');
  const [cupImg, setCupImg] = useState<CupImg>('/images/gobelet1.png');
  const [showCupDice, setShowCupDice] = useState(true);
  const [rolling, setRolling] = useState(false);
  // Une fois le gobelet renversé, les dés de l'arène restent VISIBLES (même
  // après le roulement). `revealed` passe à true au 1er lancer et ne redescend
  // jamais → on neutralise hideIdle pour ne plus masquer les dés.
  const [revealed, setRevealed] = useState(false);

  // Déplacement du gobelet (secousse + bascule). En px, relatif à GOBLET_BASE.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  // transform réellement réactif aux MotionValue (sinon rien ne bouge).
  const transform = useMotionTemplate`translate(${x}px, ${y}px) rotate(${rotate}deg)`;
  // Mini-dés : simulation physique dans le gobelet. Leur nombre suit
  // activeKinds (1 dé → 1 mini-dé, sinon 3).
  const cupDice = useCupDice(activeKinds?.length === 1 ? 1 : CUP_DICE_COUNT, CUP_CIRCLE_R, x);

  // Suivi du mouvement pour détecter les secousses (gauche↔droite).
  const lastX = useRef(0);
  const lastDir = useRef(0);
  const shaking = useRef(false);
  // Détection d'un TAP (pour déclencher le lancer sans bloquer le scroll
  // vertical : touchAction: pan-y laisse passer le tap mais pas le drag Y).
  const downX = useRef(0);
  const downY = useRef(0);
  const downT = useRef(0);
  const pushStartY = useRef<number | null>(null);

  // ── Quand l'ANIM 1 a fini de rouler, on fige l'overlay sur 'done'. ──
  useEffect(() => {
    if (rolling) {
      setPhase('done');
      setShowCupDice(false); // les dés sont "tombés" dans l'arène
    }
  }, [rolling]);

  // ── Reset complet vers l'état initial (bouton "Nouveau tirage"). ──
  useEffect(() => {
    setPhase('idle');
    setCupImg('/images/gobelet1.png');
    setShowCupDice(true); // mini-dés visibles dans le gobelet
    setRevealed(false); // dés d'animation à nouveau invisibles
    setRolling(false);
    animate(x, 0, { type: 'spring', stiffness: 260, damping: 18 });
    animate(y, 0, { type: 'spring', stiffness: 260, damping: 18 });
    animate(rotate, 0, { type: 'spring', stiffness: 260, damping: 18 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  /* --- Déclenchement programmatique (bouton « Lancer ») ------------------- */
  // Même cascade que le push tactile : gobelet2 → 0.4s → gobelet3 + lancer.
  const launch = useCallback(() => {
    if (revealed || rolling) return;
    setPhase('done');
    setShowCupDice(false);
    setCupImg('/images/gobelet2.png');
    rotate.set(-9);
    y.set(-13);
    window.setTimeout(() => {
      setCupImg('/images/gobelet3.png');
      rotate.set(-18);
      y.set(-26);
      setRevealed(true);
      setRolling(true);
    }, 400);
  }, [revealed, rolling, rotate, y]);

  // Incrémenter launchSignal (depuis la page) → lancer programmatique.
  // On initialise la ref à 0 (et non à launchSignal) : au 1er montage le
  // signal vaut 0 → pas d'autolancement (le 1er lancer vient du geste tap).
  // Après un remount (key=resetSignal), launchSignal > 0 → on lance.
  const prevLaunch = useRef(0);
  useEffect(() => {
    if (launchSignal !== prevLaunch.current) {
      prevLaunch.current = launchSignal;
      launch();
    }
  }, [launchSignal, launch]);

  /* --- Pointeur (sur le PAD du bas) ----------------------------------------- */

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Une fois le tirage effectué (revealed), le gobelet n'est plus
      // shakable — sauf après un "Nouveau tirage" (resetSignal remet
      // revealed à false / remonte le composant).
      if (revealed) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      if (phase === 'idle' || phase === 'shake') {
        shaking.current = true;
        lastX.current = e.clientX;
        lastDir.current = 0;
        if (phase === 'idle') {
          setPhase('shake');
          onShake?.();
        }
        // On mémorise la position de départ pour détecter un drag vertical.
        pushStartY.current = e.clientY;
        // Mémorise le point de départ + temps pour détecter un TAP.
        downX.current = e.clientX;
        downY.current = e.clientY;
        downT.current = Date.now();
      }
    },
    [phase, revealed, onShake],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if ((phase === 'idle' || phase === 'shake') && shaking.current && !revealed) {
        const dx = e.clientX - lastX.current;
        const dy = pushStartY.current != null ? pushStartY.current - e.clientY : 0;
        // Drag vertical DOMINANT vers le haut → on déclenche la CASCADE
        // (gobelet2 → 0.4s → gobelet3 + lancer). On coupe le shake pour ne
        // pas rester bloqué dans la branche horizontale.
        if (dy > 36 && Math.abs(dy) >= Math.abs(dx)) {
          shaking.current = false;
          pushStartY.current = null;
          setPhase('done');
          setShowCupDice(false);
          setCupImg('/images/gobelet2.png');
          rotate.set(-9);
          y.set(-13);
          window.setTimeout(() => {
            setCupImg('/images/gobelet3.png');
            rotate.set(-18);
            y.set(-26);
            setRevealed(true); // les dés de l'arène restent visibles après
            setRolling(true); // ← pilote l'ANIM 1 en interne
          }, 400);
          return;
        }
        // Sinon secousse horizontale (amplifiée pour la visibilité), bornée
        // aux 20% centraux de l'écran pour que le gobelet reste lisible.
        const lim = (typeof window !== 'undefined' ? window.innerWidth : 360) * 0.15;
        const nextX = Math.max(-lim, Math.min(lim, x.get() + dx * 2.8));
        x.set(nextX);
        const dir = Math.sign(dx);
        if (dir !== 0 && dir !== lastDir.current && Math.abs(dx) > 2) {
          lastDir.current = dir;
        }
        lastX.current = e.clientX;
      }
    },
    [phase, x, y, rotate],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      shaking.current = false;
      pushStartY.current = null;
      // TAP (sans drag) → lance le tirage. Permet de déclencher sans
      // bloquer le scroll vertical (pan-y laisse passer le tap).
      const movedX = Math.abs(e.clientX - downX.current);
      const movedY = Math.abs(e.clientY - downY.current);
      const dt = Date.now() - downT.current;
      if (
        !revealed &&
        (phase === 'idle' || phase === 'shake') &&
        movedX < 12 &&
        movedY < 12 &&
        dt < 250
      ) {
        launch();
        return;
      }
      // On ne ramène PAS le gobelet à 0 pendant le shake : l'utilisateur doit
      // pouvoir enchaîner autant d'A/R que voulu. On ne recentre que si le
      // gobelet est déjà renversé (phase done) ou au reset complet.
      if (phase === 'done') {
        animate(x, 0, { type: 'spring', stiffness: 260, damping: 18 });
        animate(y, 0, { type: 'spring', stiffness: 260, damping: 18 });
        animate(rotate, 0, { type: 'spring', stiffness: 260, damping: 18 });
      }
    },
    [phase, x, y, rotate, revealed, launch],
  );

  // ── Réception du résultat de l'ANIM 1 : on remonte au parent + reset. ──
  const handleRest = useCallback(
    (faces: TargetFaces) => {
      setRolling(false);
      onRest?.(faces);
    },
    [onRest],
  );

  // ── Remise à zéro de l'overlay quand une nouvelle manche commence. ──
  const prevRolling = useRef(false);
  useEffect(() => {
    if (prevRolling.current && !rolling) {
      setPhase('idle');
      setCupImg('/images/gobelet1.png');
      // NB : on ne remet PAS showCupDice à true → les mini-dés restent
      // disparus (les dés sont "tombés" dans l'arène). Gobelet1 revient seul.
      animate(x, 0, { type: 'spring', stiffness: 260, damping: 18 });
      animate(y, 0, { type: 'spring', stiffness: 260, damping: 18 });
      animate(rotate, 0, { type: 'spring', stiffness: 260, damping: 18 });
    }
    prevRolling.current = rolling;
  }, [rolling, x, y, rotate]);

  const cupStyle: MotionStyle = {
    position: 'absolute',
    left: '50%',
    top: GOBLET_TOP,
    width: GOBLET_SIZE,
    height: GOBLET_SIZE,
    marginLeft: -GOBLET_SIZE / 2,
    marginTop: -GOBLET_SIZE / 2,
    overflow: 'visible',
    transform,
    pointerEvents: 'none', // le pad du bas capte les gestes
    touchAction: 'none',
    userSelect: 'none',
    zIndex: 5,
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        overflow: 'hidden',
        borderRadius: 16,
      }}
      className={className}
    >
      {/* ANIM 1 — arène + dés (fond). On lui passe le spawn pour la chute. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <AstroDiceSet
          isRolling={rolling}
          targetFaces={targetFaces}
          rollDurationMs={rollDurationMs}
          onRest={handleRest}
          height={height}
          font={font}
          skin={skin}
          background="url(/backgrounds/des-divinatoires-bg.png) center / contain no-repeat"
          spawn={spawn}
          hideIdle={!revealed}
          onReady={onReady}
          activeKinds={activeKinds}
          lockScroll={lockScroll}
          verticalShift={verticalShift}
          diceHop={diceHop}
        />
      </div>

      {/* ANIM 2 — overlay gobelet transparent au bord bas de l'arène. Non
          interactif : c'est le pad du bas qui capte les gestes ; le gobelet
          réagit visuellement (transform lié aux MotionValue). */}
      <motion.div style={cupStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cupImg}
          alt="Gobelet du zodiaque"
          draggable={false}
          style={{
            width: '100%',
            height: 'auto',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
        />
        {/* Mini-dés PAR-DESSUS le gobelet (zIndex supérieur) : simulation
           physique — ils rebondissent dans la circonférence interne et
           s'entrechoquent. Masqués dès gobelet2. */}
        {showCupDice &&
          cupDice.map((d, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: CUP_DIE_SIZE,
                height: CUP_DIE_SIZE,
                marginLeft: -CUP_DIE_SIZE / 2,
                marginTop: -CUP_DIE_SIZE / 2,
                borderRadius: 3,
                background:
                  'radial-gradient(circle at 35% 30%, #f4efe2, #cbb994)',
                border: '1px solid rgba(80,60,30,0.5)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                opacity: 0.92,
                zIndex: 2,
                x: d.x,
                y: d.y,
              }}
            />
          ))}
      </motion.div>

      {/* PAD de secousse (bas de l'écran, hors arène) : capte shake + pushes. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: PAD_HEIGHT,
          zIndex: 7,
          touchAction: lockScroll ? 'none' as const : 'pan-y' as const,
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f3e4c4',
          fontSize: 12,
          letterSpacing: 0.5,
          fontFamily: 'system-ui, sans-serif',
          textShadow: '0 1px 3px rgba(0,0,0,0.7)',
          background:
            'linear-gradient(to top, rgba(10,14,30,0.85), rgba(10,14,30,0))',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
      </div>
    </div>
  );
}
