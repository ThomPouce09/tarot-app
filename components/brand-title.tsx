'use client';

import { useEffect, useRef, useState } from 'react';

// Titre avec balayage doré lettre par lettre : un point lumineux traverse de
// gauche à droite (~1,5 s), puis s'éteint, et le cycle se relance aléatoirement.
// En DEV : relance fréquente (3 à 10 s) pour voir l'effet sans attendre.
// Le texte reste du flux naturel (espaces + retour à la ligne préservés) ;
// seule la lettre active change d'apparence (jamais de `display` sur les autres).
const SWEEP_MS = 1500; // durée du balayage
const MIN_GAP = 3000; // délai mini avant relance (ms) — court en DEV
const MAX_GAP = 10000; // délai maxi avant relance (ms) — court en DEV

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function BrandTitle({
  text = "L'oracle des étoiles",
  className = '',
  dimInactive = false, // assombrit les lettres non allumées (fond sombre : dashboard)
  grow = false, // grossit la lettre allumée (false sur la landing pour ne pas déformer)
}: {
  text?: string;
  className?: string;
  dimInactive?: boolean;
  grow?: boolean;
}) {
  const [lit, setLit] = useState(-1); // index de la lettre qui brille, -1 = aucune
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    const clear = () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current = [];
    };

    const runSweep = () => {
      if (cancelled) return;
      const n = text.length;
      const step = SWEEP_MS / n;
      for (let i = 0; i < n; i++) {
        const id = window.setTimeout(() => {
          if (!cancelled) setLit(i);
        }, i * step);
        timers.current.push(id);
      }
      const endId = window.setTimeout(() => {
        if (cancelled) return;
        setLit(-1);
        schedule();
      }, SWEEP_MS + step);
      timers.current.push(endId);
    };

    const schedule = () => {
      if (cancelled) return;
      const id = window.setTimeout(runSweep, randBetween(MIN_GAP, MAX_GAP));
      timers.current.push(id);
    };

    // Premier balayage peu après le chargement pour que l'effet soit vu tôt
    const firstId = window.setTimeout(runSweep, 1500);
    timers.current.push(firstId);

    return () => {
      cancelled = true;
      clear();
    };
  }, [text]);

  return (
    <span className={className} aria-label={text}>
      {text.split('').map((ch, i) => {
        const active = lit === i;
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
            key={i}
            aria-hidden
            className="transition-[color,text-shadow,opacity,transform] duration-200"
            style={active ? activeStyle : baseStyle}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
