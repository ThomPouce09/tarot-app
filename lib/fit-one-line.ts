'use client';

// lib/fit-one-line.ts
// Réduit le font-size d'un élément jusqu'à ce que son texte tienne sur UNE
// seule ligne de la largeur disponible (parent − marge − inset). Shrink-only
// dans la boucle terminale : jamais d'agrandissement → zéro oscillation.
// (Même logique que le fit de RuneTitle, rendu réutilisable.)

import { useEffect, type RefObject } from 'react';

export function useFitOneLine(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
  opts: { base?: number; min?: number; max?: number; inset?: number; font?: string } = {},
) {
  const { base = 18, min = 9, max = 44, inset = 56, font = '700 18px "Cinzel Decorative"' } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const avail = (el.parentElement?.clientWidth ?? window.innerWidth) - 32 - inset;
      if (avail <= 0) return;
      let fs = base;
      el.style.fontSize = `${fs}px`;
      const w = el.scrollWidth;
      if (w > 0) fs = Math.min(max, Math.floor((fs * avail) / w * 10) / 10);
      el.style.fontSize = `${fs}px`;
      while (el.scrollWidth > avail && fs > min) { fs -= 0.5; el.style.fontSize = `${fs}px`; }
    };
    let lastW = 0;
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; measure(); } };
    lastW = window.innerWidth;
    measure();
    // Re-mesure après chargement de la police web (métriques différentes).
    (document as any).fonts?.load?.(font)
      .then(() => window.setTimeout(measure, 60)).catch(() => window.setTimeout(measure, 400));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
