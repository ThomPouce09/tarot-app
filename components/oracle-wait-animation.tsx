'use client';

// components/oracle-wait-animation.tsx — Attente cosmique de l'oracle (Dés Simplifié).
// Overlay centré à l'écran dès que les dés sont posés, pendant que l'IA réfléchit.
// Trois animations tournent en boucle (8 s chacune) :
//   A · Nébuleuse d'oracle  — poussière d'or en orbite autour d'un noyau.
//   B · Constellation       — les étoiles s'allument, se relient, puis s'effacent.
//   C · Astrolabe           — aiguille d'or balayant le cercle du zodiaque.
// Styles + keyframes : .ow-* dans app/globals.css.

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';

const ZODIAC = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

type CSS = React.CSSProperties & Record<'--x' | '--y' | '--a' | '--d', string>;

function Nebula() {
  return (
    <div className="ow-neb">
      <div className="ow-dust" />
      <div className="ow-sweep" />
      <div className="ow-ring ow-r1">
        <i className="ow-dot" style={{ '--x': '-70px', '--y': '-12px' } as CSS} />
        <i className="ow-dot" style={{ '--x': '64px', '--y': '18px', '--d': '.5s' } as CSS} />
        <i className="ow-dot" style={{ '--x': '-38px', '--y': '60px', '--d': '1.1s' } as CSS} />
      </div>
      <div className="ow-ring ow-r2">
        <i className="ow-dot" style={{ '--x': '48px', '--y': '-30px', '--d': '.3s' } as CSS} />
        <i className="ow-dot" style={{ '--x': '-44px', '--y': '36px', '--d': '.8s' } as CSS} />
      </div>
      <div className="ow-ring ow-r3">
        <i className="ow-dot" style={{ '--x': '-30px', '--y': '-22px', '--d': '1.4s' } as CSS} />
        <i className="ow-dot" style={{ '--x': '26px', '--y': '28px', '--d': '.2s' } as CSS} />
        <i className="ow-dot" style={{ '--x': '0px', '--y': '-36px', '--d': '1.7s' } as CSS} />
      </div>
      <div className="ow-core" />
    </div>
  );
}

function Constellation() {
  // 6 étoiles + arêtes dessinées progressivement (dasharray), cycle 6 s.
  const stars: [number, number, number, number][] = [
    [28, 118, 2.6, 0], [64, 60, 3.4, 0.9], [110, 82, 2.8, 1.8],
    [142, 34, 3.6, 2.7], [190, 58, 2.6, 3.5], [126, 128, 3, 4.2],
  ];
  const edges: [string, number][] = [
    ['M28 118 L64 60', 0], ['M64 60 L110 82', 0.9], ['M110 82 L142 34', 1.8],
    ['M142 34 L190 58', 2.7], ['M110 82 L126 128', 3.5], ['M126 128 L190 58', 4.2],
  ];
  return (
    <svg viewBox="0 0 220 150" width="220" height="150" className="ow-cons">
      {edges.map(([d, delay], i) => (
        <path key={i} d={d} pathLength={100} className="ow-edge" style={{ animationDelay: `${delay}s` }} />
      ))}
      {stars.map(([cx, cy, r, delay], i) => (
        <g key={i} style={{ animationDelay: `${delay}s` }}>
          <circle cx={cx} cy={cy} r={r * 2.3} className="ow-halo" style={{ animationDelay: `${delay}s` }} />
          <circle cx={cx} cy={cy} r={r} className="ow-star" style={{ animationDelay: `${delay}s` }} />
        </g>
      ))}
    </svg>
  );
}

function Astrolabe() {
  return (
    <div className="ow-astro">
      <div className="ow-frame" />
      <div className="ow-zodiac">
        {ZODIAC.map((g, i) => (
          <span key={g} style={{ '--a': `${i * 30}deg` } as CSS}>{g}</span>
        ))}
      </div>
      <div className="ow-ticks">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 30 + 15}deg` } as CSS} />
        ))}
      </div>
      <div className="ow-needle" />
      <div className="ow-center" />
    </div>
  );
}

const VARIANTS = [Nebula, Constellation, Astrolabe];
const ROTATE_MS = 8000;

/** État global de la page appelante : vrai pendant la 1ʳᵉ réflexion IA des Dés
 *  Simplifié. L'overlay se monte/démonte lui-même (hook hors du cycle de rendu). */
let oracleWaitActive = false;
const oracleWaitListeners = new Set<(on: boolean) => void>();
export function setOracleWait(on: boolean) {
  if (oracleWaitActive === on) return;
  oracleWaitActive = on;
  oracleWaitListeners.forEach((fn) => fn(on));
}

export default function OracleWaitAnimation() {
  const t = useT();
  const [v, setV] = useState(0);
  const [on, setOn] = useState(oracleWaitActive);
  useEffect(() => {
    const fn = (next: boolean) => setOn(next);
    oracleWaitListeners.add(fn);
    return () => { oracleWaitListeners.delete(fn); };
  }, []);
  useEffect(() => {
    if (!on) { setV(0); return; }
    const id = window.setInterval(() => setV((n) => (n + 1) % VARIANTS.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [on]);
  if (!on) return null;
  const Current = VARIANTS[v];
  return (
    <div className="ow-overlay" role="status" aria-live="polite">
      <div className="ow-card">
        <div className="ow-stage" key={v}>
          <Current />
        </div>
        <p className="ow-label">{t('des.affinage.thinking')}</p>
      </div>
    </div>
  );
}
