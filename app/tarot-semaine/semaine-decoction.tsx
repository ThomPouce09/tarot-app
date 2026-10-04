'use client';

// app/tarot-semaine/semaine-decoction.tsx
// Overlay d'attente des « Arcanes de la Semaine » — variante B « La Roue des
// Sept » du labo, retenue par le user : sept emplacements de lames en couronne
// activés l'un après l'autre, et au centre la FIOLE DE L'ORACLE qui bouillonne
// (liquide doré ondulatoire, bulles, vapeur), légende verbatim en dessous :
//   « Tirage de la semaine en cours de décoction ... » / EN parallèle.
// Remplace l'ancienne scène « ArcanumWait » (charte respectée : bordeaux, bois,
// or #DAA520/#F0C75E, ivoire — zéro bleu de l'univers Dés).
//
// Garde la fenêtre minimale de 4 s (le spectacle ne clignote pas si l'IA est
// rapide). Pur SVG + framer-motion, transforms/opacity uniquement (Android).

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';

const GOLD = '#DAA520';
const GOLD_PALE = '#F0C75E';
const IVORY = '#F5EAD6';
const CARD_BACK = '/images/card-back.png';

/* ── La couronne des sept ── */
const SLOT_R = 92;
const SLOTS = Array.from({ length: 7 }, (_, i) => {
  const a = (i * 2 * Math.PI) / 7 - Math.PI / 2;
  return { x: Math.cos(a) * SLOT_R, y: Math.sin(a) * SLOT_R };
});

/* Poussière d'étoiles du panneau (positions fixes → zéro mismatch). */
const DUST = Array.from({ length: 10 }, (_, i) => ({
  left: 8 + ((i * 73) % 84),
  delay: (i * 0.47) % 3.2,
  dur: 3.2 + ((i * 17) % 10) / 9,
  size: 1 + ((i * 7) % 2),
}));

/* Les sept luminaires planétaires des jours (dim ☉ … sam ♄), même ordre que
   les jours de la roue — posés en gros sur le dos des mini-lames. */
const SIGILS = ['☉', '☽', '♂', '☿', '♃', '♀', '♄'];

/* ── La fiole qui bout ── */
const FLASK_BUBBLES = [
  { x: -7, r: 2.2, delay: 0 }, { x: 0, r: 1.6, delay: 0.6 }, { x: 7, r: 2.0, delay: 1.1 },
  { x: -4, r: 1.4, delay: 1.7 }, { x: 4, r: 1.8, delay: 2.3 },
];
const STEAM = [
  { x: -6, delay: 0 }, { x: 0, delay: 1.2 }, { x: 6, delay: 2.1 },
];

function Fiole() {
  return (
    <motion.svg
      viewBox="0 0 100 130" width={78} height={101}
      className="absolute" style={{ left: -39, top: -56 }}
      animate={{ y: [0, -3, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        <clipPath id="sd-liquid">
          <path d="M44 26 L44 50 Q22 66 21 92 Q21 112 50 112 Q79 112 79 92 Q78 66 56 50 L56 26 Z" />
        </clipPath>
        <linearGradient id="sd-brew" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GOLD_PALE} stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8A5A22" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* verre */}
      <path
        d="M44 18 L44 50 Q22 66 21 92 Q21 112 50 112 Q79 112 79 92 Q78 66 56 50 L56 18 Z"
        fill="rgba(245,234,214,0.06)" stroke={GOLD_PALE} strokeWidth="2" strokeLinejoin="round"
      />
      <path d="M40 18 H60" stroke={GOLD_PALE} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M30 96 Q29 80 38 68" fill="none" stroke="rgba(245,234,214,0.35)" strokeWidth="2" strokeLinecap="round" />

      {/* liquide ondulatoire + bulles */}
      <g clipPath="url(#sd-liquid)">
        <motion.g
          animate={{ x: [0, -14, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d="M-4 76 Q 12 70 28 76 T 60 76 T 92 76 T 124 76 V 116 H -4 Z" fill="url(#sd-brew)" />
        </motion.g>
        {FLASK_BUBBLES.map((b, i) => (
          <motion.circle
            key={i} cx={50 + b.x} r={b.r} fill="none" stroke="#FFF3D0" strokeWidth="1"
            animate={{ cy: [104, 82], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeIn', delay: b.delay }}
          />
        ))}
      </g>

      {/* vapeur dorée + ✦ qui s'échappe */}
      {STEAM.map((s, i) => (
        <motion.path
          key={i}
          d={`M${50 + s.x} 16 q 3 -6 -1 -11 q -3 -5 1 -10`}
          fill="none" stroke={GOLD_PALE} strokeWidth="1.6" strokeLinecap="round"
          animate={{ y: [0, -14], opacity: [0, 0.75, 0], scale: [0.8, 1.1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeOut', delay: s.delay }}
        />
      ))}
      <motion.text x="50" y="14" textAnchor="middle" fontSize="9" fill={GOLD_PALE}
        animate={{ y: [14, -4], opacity: [0, 1, 0] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 3.5, ease: 'easeOut' }}>
        ✦
      </motion.text>
    </motion.svg>
  );
}

/* ── La scène complète ── */
export default function SemaineDecoction({ on, label }: { on: boolean; label: string }) {
  const lang = useLang();
  const [visible, setVisible] = useState(on);
  // Gel du libellé pendant la fermeture : quand `on` repasse faux (fin des 4 s
  // de « Chargement des arcanes »), la page bascule son libellé sur la branche
  // « décoction » — et ce message inapproprié devenait aperçu pendant la grâce
  // de 400 ms + le fondu de sortie. On conserve donc le dernier libellé émis
  // pendant que la scène était active jusqu'à sa disparition complète.
  const [frozen, setFrozen] = useState(label);
  useEffect(() => { if (on) setFrozen(label); }, [on, label]);
  const shown = on ? label : frozen;

  // Grâce de fermeture : 400 ms. Elle absorbe les micro-coupures entre phases
  // (ex. cast terminé → tissage IA démarré une frame plus tard) : si `on`
  // repasse vrai avant l'échéance, le timer est annulé et la scène CONTINUE
  // sans redémarrage. La durée minimale de l'épisode d'ouverture (4 s) est
  // pilotée par la page (minDone/booting), pas ici — sinon un « rien à
  // afficher » resterait bloqué 4 s au lieu de livrer le CTA aussitôt.
  useEffect(() => {
    if (on) { setVisible(true); return; }
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), 400);
    return () => window.clearTimeout(t);
  }, [on, visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="decoction-wait"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="fixed inset-0 z-[85] flex items-center justify-center px-5"
          role="status" aria-live="polite"
          style={{ background: 'rgba(12,6,4,0.78)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="relative flex w-full max-w-[380px] flex-col items-center overflow-hidden rounded-3xl px-6 pb-6 pt-7"
            style={{
              background: 'linear-gradient(160deg, #4A2C1A 0%, #34121F 55%, #180B05 100%)',
              border: `1.5px solid ${GOLD}66`,
              boxShadow: '0 16px 56px rgba(0,0,0,0.6), 0 0 44px rgba(218,165,32,0.16), inset 0 0 60px rgba(74,25,49,0.35)',
            }}
          >
            {/* voile doré + liseré de lame */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(240,199,94,0.2) 0%, transparent 72%)' }} />
            <div className="pointer-events-none absolute inset-2 rounded-[22px] border" style={{ borderColor: `${GOLD}22` }} />

            {/* poussière d'étoiles qui tombe derrière la scène */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {DUST.map((p, i) => (
                <motion.span
                  key={i} aria-hidden
                  className="absolute rounded-full"
                  style={{ left: `${p.left}%`, top: -6, width: p.size, height: p.size, background: GOLD_PALE }}
                  animate={{ y: [0, 330], opacity: [0, 0.85, 0] }}
                  transition={{ duration: p.dur, repeat: Infinity, ease: 'linear', delay: p.delay }}
                />
              ))}
            </div>

            {/* ── La Roue des Sept + fiole ── */}
            <div className="relative" style={{ width: 264, height: 250 }}>
              <div className="absolute left-1/2 top-1/2" style={{ width: 240, height: 240, marginLeft: -120, marginTop: -120 }}>
                {/* deux cercles en contre-rotation */}
                <motion.div
                  className="absolute inset-0 rounded-full" style={{ border: `1px dashed ${GOLD}3a` }}
                  animate={{ rotate: 360 }} transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute rounded-full" style={{ inset: 22, border: `1px solid ${GOLD}22` }}
                  animate={{ rotate: -360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                />

                {/* couronne de 7 mini-lames — le cercle tourne, les cartes restent droites */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }} transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
                >
                  {SLOTS.map((p, i) => (
                    <div key={i} className="absolute left-1/2 top-1/2" style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                      <motion.div
                        className="relative" style={{ width: 0, height: 0, transformOrigin: '0px 0px' }}
                        animate={{ rotate: -360 }} transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
                      >
                        {/* halo d'activation, allumé à son tour (cadence lente) */}
                        <motion.div
                          className="absolute rounded-full"
                          style={{ left: -30, top: -39, width: 60, height: 78, background: 'radial-gradient(circle, rgba(240,199,94,0.6) 0%, transparent 70%)' }}
                          animate={{ opacity: [0.05, 0.05, 1, 1, 0.05] }}
                          transition={{ duration: 6, times: [0, (i * 0.6) / 6, (i * 0.6 + 0.3) / 6, (i * 0.6 + 0.85) / 6, Math.min(0.999, (i * 0.6 + 1.5) / 6)], repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="absolute overflow-hidden rounded-[3px]"
                          style={{ left: -22, top: -32, width: 44, height: 64, backgroundImage: `url(${CARD_BACK})`, backgroundSize: 'cover', border: `1px solid ${GOLD}44` }}
                          animate={{ scale: [1, 1, 1.22, 1.22, 1], y: [0, -1, -7, -7, 0] }}
                          transition={{ duration: 6, times: [0, (i * 0.6) / 6, (i * 0.6 + 0.3) / 6, (i * 0.6 + 0.85) / 6, Math.min(0.999, (i * 0.6 + 1.5) / 6)], repeat: Infinity, ease: 'easeOut' }}
                        >
                          {/* Le luminaire du jour, en GROS et GRAS sur le dos de la
                              lame — double halo doré : immédiatement lisible. */}
                          <span
                            className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold"
                            style={{
                              fontSize: 30, lineHeight: 1, fontWeight: 700, color: GOLD_PALE,
                              textShadow: `0 0 10px ${GOLD}, 0 0 22px rgba(218,165,32,0.7), 0 1px 3px rgba(0,0,0,0.9)`,
                              fontFamily: 'Georgia, "Times New Roman", serif',
                            }}
                          >
                            {SIGILS[i]}
                          </span>
                        </motion.div>
                      </motion.div>
                    </div>
                  ))}
                </motion.div>

                {/* cœur : halo + fiole bouillonnante */}
                <div className="absolute left-1/2 top-1/2" style={{ width: 0, height: 0 }}>
                  <motion.div
                    className="absolute rounded-full"
                    style={{ width: 130, height: 130, left: -65, top: -58, background: 'radial-gradient(circle, rgba(240,199,94,0.30) 0%, rgba(138,90,34,0.12) 55%, transparent 75%)' }}
                    animate={{ scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <Fiole />
                </div>
              </div>
            </div>

            {/* Légende verbatim FR + EN en parallèle — bien en évidence */}
            <motion.div
              className="relative mt-3 flex items-center gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <span className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
              <motion.p
                className="text-center font-[family-name:var(--font-cinzel-deco)] text-[13px] font-semibold uppercase tracking-[0.14em] sm:text-sm"
                style={{ color: GOLD_PALE, textShadow: `0 0 14px ${GOLD}, 0 1px 3px rgba(0,0,0,0.9)` }}
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {shown}
              </motion.p>
              <span className="h-px w-8" style={{ background: `linear-gradient(270deg, transparent, ${GOLD})` }} />
            </motion.div>

            {/* trois points d'or qui respirent */}
            <div className="mt-3 flex items-center gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i} className="block h-1 w-1 rounded-full" style={{ background: GOLD_PALE }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.22 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
