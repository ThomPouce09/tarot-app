'use client';

// components/onboarding/use-swipe-gestures.ts
// Détecteur de gestes partagé par les mini-jeux du tutoriel — calqué sur les
// mécaniques RÉELLES du jeu :
// - drag temps réel (le décor suit le doigt, comme la boîte d'achillée et le
//   gobelet) : onDrag(dx, dy) à chaque mouvement ;
// - oscillation gauche/droite : inversion de direction avec amplitude cumulée
//   >= threshold => 1 « aller-retour » compté (Yi Jing en exige 4, comme
//   SHAKE_REVERSALS_REQUIRED dans /yi-jing-simplifie) ;
// - lancée verticale vers le haut (dy <= -flickDistance) : renversement du
//   gobelet (seuil réel : +36 px dominant, cf. AstroDiceCup).

import { useRef } from 'react';

export function useSwipeGestures(opts: {
  active: boolean;
  onDrag?: (dx: number, dy: number) => void;
  onOscillate?: () => void;
  onFlickUp?: () => void;
  threshold?: number; // amplitude min par demi-balancement (px)
  flickDistance?: number; // hauteur min de la lancée (px)
}) {
  const { active, threshold = 24, flickDistance = 90 } = opts;
  const cbRef = useRef(opts);
  cbRef.current = opts;

  const st = useRef({
    down: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    t0: 0,
    dir: 0, // -1 gauche, +1 droite
    travel: 0, // amplitude courante du demi-balancement
    lastOsc: 0,
    flicked: false,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!active) return;
    const s = st.current;
    s.down = true;
    s.startX = s.lastX = e.clientX;
    s.startY = s.lastY = e.clientY;
    s.t0 = Date.now();
    s.dir = 0;
    s.travel = 0;
    s.flicked = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!active || !s0()) return;
    const s = st.current;
    const dx = e.clientX - s.lastX;
    const dy = e.clientY - s.lastY;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    cbRef.current.onDrag?.(dx, dy);

    // oscillation (inversion de direction dominante horizontale)
    if (Math.abs(dx) >= 2) {
      const d = dx > 0 ? 1 : -1;
      if (s.dir === 0) {
        s.dir = d;
        s.travel = Math.abs(dx);
      } else if (d === s.dir) {
        s.travel += Math.abs(dx);
      } else {
        if (s.travel >= threshold && Date.now() - s.lastOsc > 180) {
          s.lastOsc = Date.now();
          cbRef.current.onOscillate?.();
        }
        s.dir = d;
        s.travel = Math.abs(dx);
      }
    }

    // lancée verticale vers le haut (une seule fois par geste)
    const totalDy = e.clientY - s.startY;
    if (!s.flicked && totalDy <= -flickDistance && Math.abs(totalDy) >= Math.abs(e.clientX - s.startX)) {
      s.flicked = true;
      cbRef.current.onFlickUp?.();
    }
  };

  function s0() {
    return st.current.down;
  }

  const onPointerUp = () => {
    const s = st.current;
    if (s.down && s.travel >= threshold) cbRef.current.onOscillate?.();
    s.down = false;
    s.dir = 0;
    s.travel = 0;
  };

  return { onPointerDown, onPointerMove, onPointerUp };
}
