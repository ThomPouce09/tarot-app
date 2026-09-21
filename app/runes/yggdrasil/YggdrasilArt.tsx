'use client';

// app/runes/yggdrasil/YggdrasilArt.tsx — Le World Tree.
// Fond : l'artwork définitif /images/iggdrasil.png (335×600, fourni par le
// user), centré en « contain ». Par-dessus : les VEINES LUMINEUSES créées pour
// l'animation du tirage (mêmes tracés que les zones de pose des pierres),
// allumées rang par rang (racines → couronne) puis pulsées au bloom.
// viewBox 300×540 = même ratio que l'image, preserveAspectRatio « meet » :
// l'img et le SVG occupent la même boîte centrée → superposition parfaite.

import { motion } from 'framer-motion';

export default function YggdrasilArt({ lit, pulse }: { lit: number; pulse: boolean }) {
  // zones allumées : lit = nb de positions éclairées (ordre grow 0..4)
  const on = (i: number) => lit > i;
  const gold = '#e9d9ac';
  const line = (glow: boolean) => ({
    // Éteinte : à peine perceptible (l'artwork porte déjà le dessin) ;
    // allumée : la veine d'or — l'effet « sève » du tirage.
    stroke: glow ? gold : 'rgba(233,217,172,0.14)',
    strokeWidth: glow ? 1.8 : 1.2,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: glow
      ? { filter: 'drop-shadow(0 0 6px rgba(233,217,172,0.85))', transition: 'stroke 0.9s ease, stroke-width 0.9s ease, filter 0.9s ease' }
      : { transition: 'stroke 0.9s ease, stroke-width 0.9s ease, filter 0.9s ease' },
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* — L'arbre définitif (contenu centré, garde son ratio) — */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/iggdrasil.png"
        alt=""
        className="absolute inset-0 h-full w-full object-contain opacity-95"
        style={{ filter: 'drop-shadow(0 0 26px rgba(233,217,172,0.16))' }}
      />
      {/* — Les veines lumineuses, repérées sur la MÊME boîte (meet 300×540) — */}
      <motion.svg
        viewBox="0 0 300 540"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        animate={pulse ? { opacity: [0.9, 1, 0.95] } : { opacity: 1 }}
        transition={pulse ? { duration: 2.4, repeat: Infinity } : {}}
      >
        {/* halo final : l'arbre entier s'embrase */}
        <motion.circle
          cx="150" cy="270" r="190" fill="url(#ygg-halo)"
          animate={{ opacity: pulse ? 0.5 : lit > 2 ? 0.16 : 0.05 }}
          transition={{ duration: 1.4 }}
        />
        <defs>
          <radialGradient id="ygg-halo">
            <stop offset="0%" stopColor="rgba(233,217,172,0.65)" />
            <stop offset="55%" stopColor="rgba(180,140,60,0.18)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Dessin calé sur l'arbre de l'artwork (marges = étiquettes ; bas = pochon) */}
        <g transform="translate(-7.5 8) scale(1.05)">

        {/* — RACINES (Urðr à gauche, Níðhöggr à droite + la centrale) — */}
        <g {...line(on(0))}>
          <path d="M150 330 C 118 358, 92 366, 58 388" />
          <path d="M150 330 C 132 362, 116 372, 96 396" />
        </g>
        <g {...line(on(1))}>
          <path d="M150 330 C 182 358, 210 366, 244 388" />
          <path d="M150 330 C 168 362, 186 372, 206 396" />
          {/* le serpent Níðhöggr : trait ondulé le long de la racine droite */}
          <path d="M236 384 q -10 -6 -4 -14 q 6 -8 -2 -14 q -8 -6 -2 -14" strokeDasharray="2 4" />
        </g>
        <g {...line(on(2))}>
          <path d="M150 330 C 148 352, 152 372, 150 402" />
        </g>

        {/* — TRONC — */}
        <g {...line(on(2))}>
          <path d="M138 332 C 142 280, 136 220, 146 160" />
          <path d="M162 332 C 158 280, 164 220, 154 160" />
          <path d="M150 320 C 149 270, 151 215, 150 168" strokeDasharray="6 9" strokeWidth="1" />
        </g>

        {/* — BRANCHES (canopée basse) — */}
        <g {...line(on(3))}>
          <path d="M146 186 C 112 168, 92 156, 62 142" />
          <path d="M154 186 C 188 168, 208 156, 238 142" />
          <path d="M148 168 C 122 140, 108 130, 88 110" />
          <path d="M152 168 C 178 140, 192 130, 212 110" />
          <path d="M62 142 q -8 -2 -14 4" strokeWidth="1" />
          <path d="M238 142 q 8 -2 14 4" strokeWidth="1" />
        </g>

        {/* — COURONNE (l'aigle) — */}
        <g {...line(on(4))}>
          <path d="M150 160 C 150 120, 148 90, 150 52" />
          <path d="M150 78 C 132 64, 122 58, 106 50" />
          <path d="M150 78 C 168 64, 178 58, 194 50" />
          <path d="M138 44 L150 30 L162 44 M150 30 L150 52" strokeWidth="2" />
        </g>

        <circle cx="150" cy="330" r="2.4" fill={on(2) ? gold : 'rgba(233,217,172,0.2)'} />
        <circle cx="150" cy="160" r="2" fill={on(3) ? gold : 'rgba(233,217,172,0.14)'} />
        </g>
      </motion.svg>
    </div>
  );
}
