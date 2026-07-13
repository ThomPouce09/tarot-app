import { useEffect, useRef, useState } from 'react';

// Balayage doré lettre par lettre (meme effet que BrandTitle), timer INDEPENDANT
// par instance. Balayage TOUJOURS de droite a gauche. min/max = delai avant relance (ms).
// Renvoie col active (-1 = aucune), sweeping.
export function useShimmer(text: string, min: number, max: number) {
  const [col, setCol] = useState(-1);
  const timers = useRef<number[]>([]);
  const cols = text.replace(/\s/g, '').length || 1;

  useEffect(() => {
    const SWEEP_MS = 400; // meme vitesse que le titre
    let cancelled = false;
    const clear = () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const runSweep = () => {
      if (cancelled) return;
      const step = SWEEP_MS / cols;
      // droite -> gauche (comme demande : bordure + titre balaient de droite a gauche)
      for (let i = 0; i < cols; i++) {
        const c = cols - 1 - i;
        const id = window.setTimeout(() => {
          if (!cancelled) setCol(c);
        }, i * step);
        timers.current.push(id);
      }
      const endId = window.setTimeout(() => {
        if (cancelled) return;
        setCol(-1);
        schedule();
      }, SWEEP_MS + step);
      timers.current.push(endId);
    };

    const schedule = () => {
      if (cancelled) return;
      const id = window.setTimeout(runSweep, rand(min, max));
      timers.current.push(id);
    };

    const firstId = window.setTimeout(runSweep, rand(min, max));
    timers.current.push(firstId);

    return () => {
      cancelled = true;
      clear();
    };
  }, [text, cols, min, max]);

  return { col, sweeping: col >= 0 };
}
