'use client';

// components/rune-stones/use-pouch-shake.ts
// Secouage du smartphone pour les pochons de runes : mêmes constantes validées
// que RuneStonesSet (debounce 320 ms, crête gamma ≥ 20°, peaks accel 3.6/5.2).
// - gamma (roulis g/d) : demi-balancement compté à chaque inversion de signe ;
// - devicemotion accel.x : couvre les secousses en translation (« lancer de
//   dés ») que le roulis seul rate ;
// - `last` PARTAGÉ entre les 2 capteurs → une seule poussée par balancement.
// iOS : DeviceMotionEvent.requestPermission SÉPARÉE de deviceorientation →
// appeler requestPermissions() au premier geste sur le sac. Android : no-op.

import { useCallback, useEffect, useRef } from 'react';

export function usePouchShake(
  active: boolean,
  onPush: () => void,
  onTilt?: (gamma: number) => void,
) {
  const pushRef = useRef(onPush);
  pushRef.current = onPush;
  const tiltRef = useRef(onTilt);
  tiltRef.current = onTilt;
  const activeRef = useRef(active);
  activeRef.current = active;

  const shakeRef = useRef({ sign: 0, peak: 0, last: 0 });
  const motionRef = useRef({ sign: 0, peak: 0 });
  const permRef = useRef(false);

  const requestPermissions = useCallback(async () => {
    if (permRef.current) return;
    permRef.current = true;
    try {
      const DOE = (window as unknown as {
        DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
      }).DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        await DOE.requestPermission();
      }
      const DME = (window as unknown as {
        DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
      }).DeviceMotionEvent;
      if (DME && typeof DME.requestPermission === 'function') {
        await DME.requestPermission();
      }
    } catch {
      // non supporté / refusé — on s'appuie sur le tap et le drag seuls
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const tryCount = (
      st: { sign: number; peak: number },
      now: number,
      minPeak: number,
    ) => {
      if (st.peak >= minPeak && now - shakeRef.current.last > 320) {
        shakeRef.current.last = now;
        pushRef.current();
      }
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      const g = e.gamma ?? 0;
      if (Math.abs(g) < 2.2) return;
      tiltRef.current?.(g);
      if (!activeRef.current) return;
      const s = g > 4 ? 1 : g < -4 ? -1 : 0;
      if (s === 0) return;
      const st = shakeRef.current;
      const now = Date.now();
      if (s !== st.sign) {
        tryCount(st, now, 20);
        st.sign = s;
        st.peak = 0;
      } else {
        st.peak = Math.max(st.peak, Math.abs(g));
      }
    };
    const onMotion = (e: DeviceMotionEvent) => {
      if (!activeRef.current) return;
      const acc = e.acceleration ?? e.accelerationIncludingGravity ?? null;
      if (!acc || acc.x == null) return;
      const gravityFree = e.acceleration != null;
      const a = gravityFree ? acc.x : acc.x * 0.85;
      if (Math.abs(a) < (gravityFree ? 0.9 : 1.6)) return;
      const dead = gravityFree ? 1.1 : 1.9;
      const minPeak = gravityFree ? 3.6 : 5.2;
      const s = a > dead ? 1 : a < -dead ? -1 : 0;
      if (s === 0) return;
      const st = motionRef.current;
      const now = Date.now();
      if (s !== st.sign) {
        tryCount(st, now, minPeak);
        st.sign = s;
        st.peak = 0;
      } else {
        st.peak = Math.max(st.peak, Math.abs(a));
      }
    };
    window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('devicemotion', onMotion);
    };
  }, [active]);

  return { requestPermissions };
}
