'use client';

// app/runes/mjolnir/MjolnirArt.tsx — L'artwork définitif du Marteau (fourni
// par le user : /images/mjolnir.jpg, 354×600) + par-dessus les VEINES
// LUMINEUSES de l'animation (le user les garde : « traits qui s'illuminent »).
// Mécanique identique à YggdrasilArt : img object-contain et SVG au MÊME
// viewBox (354×600 = ratio exact de l'image, « meet ») → superposition
// parfaite ; les deux sont comprimés à 90 % de hauteur (ancre en haut) pour
// libérer la bande basse du pochon réduit.
// `lit` (0..5) allume zone par zone : bas du manche → haut du manche → aile
// gauche → aile droite → aigle/crête. `strike` = la FRAPPE (le calque éclair
// vit dans MjolnirStrike, monté au-dessus des pierres par la page).

import { motion } from 'framer-motion';

export default function MjolnirArt({ lit }: { lit: number }) {
  const on = (i: number) => lit > i;
  const gold = '#e9d9ac';
  const line = (glow: boolean) => ({
    stroke: glow ? gold : 'rgba(159,196,173,0.16)',
    strokeWidth: glow ? 2.2 : 1.4,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: glow
      ? { filter: 'drop-shadow(0 0 7px rgba(233,217,172,0.9))', transition: 'stroke 0.7s ease, stroke-width 0.7s ease, filter 0.7s ease' }
      : { transition: 'stroke 0.7s ease, stroke-width 0.7s ease, filter 0.7s ease' },
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* — l'artwork (comprimé à 90 %, ancré en haut : bande basse libre pour le pochon) — */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/mjolnir.png"
        alt="Mjölnir"
        className="absolute inset-0 h-full w-full object-contain opacity-95"
        style={{ transform: 'scale(1 0.9)', transformOrigin: 'top', filter: 'drop-shadow(0 0 26px rgba(233,217,172,0.16))' }}
      />
      {/* — les veines d'or, calées sur la MÊME boîte (354×600, scale 1·0.9) — */}
      <motion.svg
        viewBox="0 0 354 600"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        <g transform="scale(1 0.9)">
          {/* halo de forge : monte à mesure que les zones chauffent */}
          <motion.circle
            cx="177" cy="230" r="205" fill="url(#mjg-halo)"
            animate={{ opacity: lit > 2 ? 0.18 : 0.05 }}
            transition={{ duration: 1.2 }}
          />
          <defs>
            <radialGradient id="mjg-halo">
              <stop offset="0%" stopColor="rgba(233,217,172,0.6)" />
              <stop offset="60%" stopColor="rgba(180,140,60,0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* — CRÊTE (zone 4) : l'arche au-dessus de la tête d'oiseau — */}
          <g {...line(on(4))}>
            <path d="M118 92 Q177 38 236 92" />
            <path d="M138 80 Q177 52 216 80" strokeWidth="1.2" />
          </g>
          {/* — AILE GAUCHE de la tête (zone 2 : La Menace) — */}
          <g {...line(on(2))}>
            <path d="M26 128 L140 128" />
            <path d="M32 150 L136 150" strokeWidth="1.2" />
          </g>
          {/* — AILE DROITE (zone 3 : L'Arme) — */}
          <g {...line(on(3))}>
            <path d="M214 128 L328 128" />
            <path d="M218 150 L322 150" strokeWidth="1.2" />
          </g>
          {/* — HAUT DU MANCHE (zone 1 : L'Obstacle) : le fût tressé — */}
          <g {...line(on(1))}>
            <path d="M162 250 L160 300 M192 250 L194 300" />
            <path d="M162 276 q 15 6 30 0" strokeWidth="1.2" />
          </g>
          {/* — BAS DU MANCHE (zone 0 : L'Ancrage) + départ des racines — */}
          <g {...line(on(0))}>
            <path d="M160 305 L155 378 M194 305 L199 378" />
            <path d="M158 344 q 17 6 34 0" strokeWidth="1.2" />
            <path d="M148 382 q 29 16 58 0" />
          </g>
        </g>
      </motion.svg>
    </div>
  );
}

/* ── Calque de FRAPPE — monté par la page APRÈS les pierres (z-45) : il passe
   DEVANT toute la scène. Éclair JAUNE bordé d'un fin liseré BLEU ÉLECTRIQUE
   (gaine bleue large + cœur jaune étroit), réplique ~0,55 s après, gerbe
   or/bleu, craquelure d'or dans la tête, flash et secousse. Mêmes repères
   que MjolnirArt : viewBox 354×600 meet + scale(1 0.9). ── */
export function MjolnirStrike({ strike }: { strike: boolean }) {
  // Le trait est un VRAI polygone d'éclair (plein, effilé, en zigzag),
  // jaune bordé bleu électrique — plus aucun rectangle d'ambiance (c'étaient
  // eux qui faisaient « un grand rectangle » sur les bords de l'image).
  const BOLT = 'M206 -30 L166 48 L190 54 L150 126 L172 132 L146 162 L184 120 L164 114 L204 42 L184 36 L214 -30 Z';
  const BOLT2 = 'M96 -30 L78 22 L92 26 L70 74 L82 77 L66 98 L88 70 L78 66 L98 24 L89 21 L104 -30 Z';
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 45 }} aria-hidden>
      <motion.svg
        viewBox="0 0 354 600"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
        animate={strike ? { x: [0, -7, 6, -3, 0], y: [0, 5, -4, 2, 0] } : { x: 0, y: 0 }}
        transition={strike ? { duration: 0.45 } : {}}
      >
        <defs>
          <radialGradient id="mjg-flash">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="35%" stopColor="rgba(160,230,255,0.5)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="mjg-bolt-blur" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <g transform="scale(1 0.9)">
          {/* halo radial doux à l'impact (dégradé → aucun bord visible) */}
          {strike && (
            <motion.circle
              cx="177" cy="112" r="150" fill="url(#mjg-flash)"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.85, 0], scale: [0.4, 1.15, 1.5] }}
              transition={{ duration: 0.8, times: [0, 0.12, 1] }}
              style={{ transformOrigin: '177px 112px' }}
            />
          )}
          {/* craquelure d'or : la tête se fend depuis le point d'impact */}
          <motion.path
            d="M177 150 l -18 30 l 10 14 l -20 26 l 10 12 M177 150 l 16 32 l -8 16 l 18 26"
            stroke="#e9d9ac" strokeWidth="2" fill="none" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={strike ? { pathLength: [0, 1, 1], opacity: [0, 1, 0.75] } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 1.1, delay: 0.1, times: [0, 0.55, 1] }}
            style={{ filter: 'drop-shadow(0 0 6px rgba(233,217,172,0.9))' }}
          />
          {/* ÉCLAIR PRINCIPAL : silhouette pleine — aura bleue floutée, puis
                corps JAUNE cerclé d'un fin liseré BLEU ÉLECTRIQUE. */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={strike ? { opacity: [0, 1, 1, 0] } : { opacity: 0 }}
            transition={{ duration: 0.9, times: [0, 0.08, 0.7, 1] }}
          >
            <path d={BOLT} fill="#4fd8ff" filter="url(#mjg-bolt-blur)" opacity="0.75" />
            <motion.path
              d={BOLT} fill="#f8e87a" stroke="#4fd8ff" strokeWidth="2.6" strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(248,232,122,0.9))' }}
              initial={{ pathLength: 0 }}
              animate={strike ? { pathLength: [0, 1, 1] } : { pathLength: 0 }}
              transition={{ duration: 0.9, times: [0, 0.25, 1] }}
            />
            {/* cœur incandescent (blanc-jaune) au long du trait */}
            <path d={BOLT} fill="none" stroke="rgba(255,252,235,0.85)" strokeWidth="1.4" strokeLinejoin="round" />
          </motion.g>
          {/* RÉPLIQUE ~0,55 s après — silhouette fine, même parure */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={strike ? { opacity: [0, 0, 1, 0] } : { opacity: 0 }}
            transition={{ duration: 1.25, times: [0, 0.45, 0.62, 1] }}
          >
            <path d={BOLT2} fill="#4fd8ff" filter="url(#mjg-bolt-blur)" opacity="0.6" />
            <path d={BOLT2} fill="#f8e87a" stroke="#4fd8ff" strokeWidth="2" strokeLinejoin="round" />
          </motion.g>
          {/* gerbe d'étincelles or + bleu à la crête (impact ≈ (177,110)) */}
          {strike && [10, 46, 82, 118, 154, 190, 226, 262, 298, 334].map((deg, i) => {
            const r = (deg * Math.PI) / 180;
            return (
              <motion.circle
                key={deg}
                r={i % 3 === 0 ? 3 : 2.4}
                fill={i % 3 === 0 ? '#4fd8ff' : '#e9d9ac'}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [1, 1, 0],
                  cx: [177, 177 + Math.cos(r) * 96],
                  cy: [112, 112 + Math.sin(r) * 96],
                }}
                transition={{ duration: 0.9, delay: 0.08, times: [0, 0.4, 1] }}
              />
            );
          })}
        </g>
      </motion.svg>
    </div>
  );
}
