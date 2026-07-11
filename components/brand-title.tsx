'use client';

import { useEffect, useRef, useState } from 'react';

// Titre avec balayage doré : un rideau lumineux traverse de gauche à droite
// (~0,4 s) en allumant la MÊME colonne (même index de lettre) sur toutes les
// lignes SIMULTANÉMENT, puis s'éteint. Relance aléatoire toutes les 10 à 35 s.
const SWEEP_MS = 400; // durée du balayage
const MIN_GAP = 10000; // délai mini avant relance (ms)
const MAX_GAP = 35000; // délai maxi avant relance (ms)

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function BrandTitle({
  text = "L'oracle des étoiles",
  className = '',
  dimInactive = false, // assombrit les lettres non allumées (fond sombre)
  grow = false, // grossit la lettre allumée (false sur la landing : pas de déformation)
}: {
  text?: string; // peut contenir des \n pour plusieurs lignes
  className?: string;
  dimInactive?: boolean;
  grow?: boolean;
}) {
  const lines = text.split('\n');
  const cols = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const [col, setCol] = useState(-1); // colonne active (-1 = aucune)
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    const clear = () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };

    const runSweep = () => {
      if (cancelled) return;
      const step = SWEEP_MS / cols;
      for (let c = 0; c < cols; c++) {
        const id = window.setTimeout(() => {
          if (!cancelled) setCol(c);
        }, c * step);
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
      const id = window.setTimeout(runSweep, randBetween(MIN_GAP, MAX_GAP));
      timers.current.push(id);
    };

    // Premier balayage après un délai aléatoire dans la plage (10 à 35 s)
    const firstId = window.setTimeout(runSweep, randBetween(MIN_GAP, MAX_GAP));
    timers.current.push(firstId);

    return () => {
      cancelled = true;
      clear();
    };
  }, [text, cols]);

  return (
    <span className={className} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split('').map((ch, p) => {
            const active = col === p;
            const baseStyle: React.CSSProperties = {};
            if (!active && dimInactive) baseStyle.opacity = 0.45;
            const activeStyle: React.CSSProperties = {
              color: '#FFFBE6',
              fontWeight: 800,
              opacity: 1,
              textShadow:
                '0 0 16px rgba(255,235,150,1), 0 0 32px rgba(255,200,60,0.95)',
            };
            if (active && grow) {
              activeStyle.display = 'inline-block';
              activeStyle.transform = 'scale(1.35)';
            }
            return (
              <span
                key={p}
                aria-hidden
                className="transition-[color,text-shadow,opacity,transform] duration-200"
                style={active ? activeStyle : baseStyle}
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
