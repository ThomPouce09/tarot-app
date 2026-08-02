'use client';

// components/loading-animations.tsx
//
// Bibliothèque d'animations d'attente ORIGINALES (pur CSS/SVG, codées sur
// mesure pour cette app — 100% libres de droits, zéro fichier externe,
// zéro licence, zéro poids réseau).
//
// Chaque animation est un composant autonome + une entrée de registre :
//   key   → clé unique (référencée dans /api/interpretation-wait)
//   label → nom affiché dans la page de test /animations
//   Comp  → composant (taille ~120px, centré)
//
// Toutes sont conçues pour un fond sombre et une ambiance mystique.

import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';

/* ------------------------------------------------------------------------ */
/*  Registre                                                                    */
/* ------------------------------------------------------------------------ */

export interface LoadingAnimationDef {
  key: string;
  label: string;
  description: string;
  Comp: () => React.ReactNode;
}

/* ── 1. Orbe mystique : sphère lumineuse qui pulse + halo ─────────────── */
function OrbeMystique() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        style={{
          position: 'absolute',
          width: 110,
          height: 110,
          borderRadius: '50%',
          border: '1px solid rgba(218,165,32,0.35)',
        }}
        animate={{ scale: [0.75, 1.15, 0.75], opacity: [0.5, 0.1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '1px solid rgba(218,165,32,0.45)',
        }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 0.15, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />
      <motion.div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 38% 32%, rgba(255,244,214,0.95), rgba(218,165,32,0.75) 45%, rgba(120,80,20,0.9))',
          boxShadow: '0 0 34px rgba(218,165,32,0.75), inset 0 0 14px rgba(255,255,255,0.35)',
        }}
        animate={{ scale: [1, 1.12, 1], boxShadow: ['0 0 34px rgba(218,165,32,0.75)', '0 0 52px rgba(218,165,32,0.95)', '0 0 34px rgba(218,165,32,0.75)'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Éclats croisés */}
      <motion.div style={{ position: 'absolute', width: 100, height: 1, background: 'linear-gradient(90deg, transparent, rgba(218,165,32,0.7), transparent)' }} animate={{ rotate: [0, 180], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }} />
      <motion.div style={{ position: 'absolute', width: 1, height: 100, background: 'linear-gradient(180deg, transparent, rgba(218,165,32,0.7), transparent)' }} animate={{ rotate: [0, 180], opacity: [0.6, 0.9, 0.6] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }} />
    </div>
  );
}

/* ── 2. Runes tournantes : glyphes runiques en cercle ─────────────────── */
function RunesTournantes() {
  const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ'];
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div style={{ position: 'relative', width: 100, height: 100 }} animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}>
        {RUNES.map((r, i) => {
          const a = (i / RUNES.length) * Math.PI * 2;
          const x = 50 + Math.cos(a) * 44;
          const y = 50 + Math.sin(a) * 44;
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                color: '#e9d9ac',
                fontSize: 15,
                fontFamily: 'var(--font-cinzel-deco), serif',
                textShadow: '0 0 10px rgba(233,217,172,0.8)',
                opacity: 0.85,
              }}
            >
              {r}
            </span>
          );
        })}
      </motion.div>
      <motion.div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#e9d9ac',
          boxShadow: '0 0 16px rgba(233,217,172,0.9)',
        }}
        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </div>
  );
}

/* ── 3. Pentagramme : étoile à 5 branches qui tourne ──────────────────── */
function Pentagramme() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.svg width="104" height="104" viewBox="0 0 104 104" animate={{ rotate: 360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}>
        <circle cx="52" cy="52" r="48" fill="none" stroke="rgba(218,165,32,0.35)" strokeWidth="1.5" />
        <circle cx="52" cy="52" r="38" fill="none" stroke="rgba(218,165,32,0.25)" strokeWidth="1" strokeDasharray="4 6" />
        {/* Étoile à 5 branches */}
        <path
          d="M52 14 L61.5 39.2 L88.5 39.2 L66.5 55.5 L74 80 L52 64.5 L30 80 L37.5 55.5 L15.5 39.2 L42.5 39.2 Z"
          fill="none"
          stroke="#DAA520"
          strokeWidth="1.8"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(218,165,32,0.7))' }}
        />
      </motion.svg>
      <motion.div
        style={{
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#DAA520',
          boxShadow: '0 0 14px rgba(218,165,32,0.9)',
        }}
        animate={{ scale: [1, 1.8, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </div>
  );
}

/* ── 4. Boule de cristal : lueur intérieure + ondulations ─────────────── */
function BouleDeCristal() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        style={{
          width: 66,
          height: 66,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 36% 30%, rgba(200,220,255,0.85), rgba(130,160,220,0.55) 45%, rgba(60,80,140,0.75))',
          boxShadow: '0 0 30px rgba(130,180,255,0.55), inset 0 0 20px rgba(255,255,255,0.4)',
        }}
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: ['0 0 30px rgba(130,180,255,0.55)', '0 0 48px rgba(160,200,255,0.8)', '0 0 30px rgba(130,180,255,0.55)'],
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Ondulations émanant de la boule */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 66,
            height: 66,
            borderRadius: '50%',
            border: '1.5px solid rgba(160,200,255,0.5)',
          }}
          animate={{ scale: [1, 2.1], opacity: [0.55, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.85, ease: 'easeOut' }}
        />
      ))}
      {/* Support */}
      <div style={{ position: 'absolute', bottom: 6, width: 46, height: 8, borderRadius: '50%', background: 'rgba(160,180,220,0.4)', filter: 'blur(1px)' }} />
    </div>
  );
}

/* ── 5. Étoiles filantes : particules dorées qui traversent ───────────── */
function EtoilesFilantes() {
  const stars = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div style={{ position: 'relative', width: 120, height: 120, overflow: 'hidden' }}>
      {stars.map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#fff3c4',
            boxShadow: '0 0 8px rgba(255,243,196,0.9)',
            top: `${8 + i * 18}%`,
            left: 0,
          }}
          animate={{ x: [0, 130], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.38, ease: 'easeIn' }}
        />
      ))}
      {/* Traînées */}
      {stars.map((i) => (
        <motion.div
          key={`t-${i}`}
          style={{
            position: 'absolute',
            height: 1,
            width: 28,
            background: 'linear-gradient(90deg, transparent, rgba(255,243,196,0.8))',
            top: `${8 + i * 18 + 1}%`,
            left: 0,
          }}
          animate={{ x: [0, 130], opacity: [0, 0.9, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.38, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}

/* ── 6. Triple anneau : anneaux orbitaux ──────────────────────────────── */
function TripleAnneau() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 76 - i * 18,
            height: 76 - i * 18,
            borderRadius: '50%',
            borderTop: `3px solid ${['#DAA520', '#87CEEB', '#e9d9ac'][i]}`,
            borderRight: '3px solid transparent',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8 + i * 0.7, repeat: Infinity, ease: 'linear', direction: i % 2 ? 'reverse' : 'normal' }}
        />
      ))}
      <motion.div
        style={{ width: 10, height: 10, borderRadius: '50%', background: '#DAA520', boxShadow: '0 0 14px rgba(218,165,32,0.9)' }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    </div>
  );
}

/* ── 7. Dé qui roule : cube 3D CSS animé ──────────────────────────────── */
function DeQuiRoule() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 300 }}>
      <motion.div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'radial-gradient(circle at 35% 30%, #f4efe2, #cbb994)',
          border: '2px solid rgba(80,60,30,0.6)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          fontWeight: 700,
          color: '#5a4426',
        }}
        animate={{ rotateX: [0, 360], rotateY: [0, 360] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
      >
        ⚄
      </motion.div>
    </div>
  );
}

/* ── 8. Spinner élégant : arc doré fin qui tourne ─────────────────────── */
function SpinnerElegant() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          border: '2px solid rgba(218,165,32,0.15)',
          borderTopColor: '#DAA520',
          borderRightColor: '#DAA520',
          boxShadow: '0 0 18px rgba(218,165,32,0.25)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      />
      <motion.p
        style={{
          position: 'absolute',
          fontSize: 9,
          letterSpacing: '0.28em',
          color: '#DAA520',
          fontFamily: 'var(--font-cinzel), serif',
          opacity: 0.85,
        }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        ORACLE
      </motion.p>
    </div>
  );
}

/* ── 9. Points pulsants : trio de points qui respirent ────────────────── */
function PointsPulsants() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: 120, height: 120 }}>
      {['#DAA520', '#87CEEB', '#e9d9ac'].map((c, i) => (
        <motion.span
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: c,
            boxShadow: `0 0 14px ${c}`,
          }}
          animate={{ y: [0, -14, 0], opacity: [0.6, 1, 0.6], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ── 10. Lune croissante : croissant qui tourne ───────────────────────── */
function LuneCroissante() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 62% 40%, #f5eecb, #e9d9ac 55%, #b89a5a)',
          boxShadow: '0 0 30px rgba(233,217,172,0.6)',
          position: 'relative',
          overflow: 'hidden',
        }}
        animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 30px rgba(233,217,172,0.6)', '0 0 46px rgba(233,217,172,0.85)', '0 0 30px rgba(233,217,172,0.6)'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Ombre interne (cratères) */}
        <div style={{ position: 'absolute', top: 16, left: 12, width: 8, height: 8, borderRadius: '50%', background: 'rgba(160,130,70,0.4)' }} />
        <div style={{ position: 'absolute', top: 36, left: 28, width: 5, height: 5, borderRadius: '50%', background: 'rgba(160,130,70,0.35)' }} />
        <div style={{ position: 'absolute', top: 24, left: 40, width: 6, height: 6, borderRadius: '50%', background: 'rgba(160,130,70,0.3)' }} />
      </motion.div>
      {/* Étoiles autour */}
      {[[14, 18], [92, 26], [84, 88], [20, 96], [104, 60]].map(([x, y], i) => (
        <motion.span
          key={i}
          style={{ position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: '50%', background: '#fff3c4', boxShadow: '0 0 6px rgba(255,243,196,0.9)' }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
        />
      ))}
    </div>
  );
}

/* ── 11. Spirale dorée : cercles qui se resserrent ────────────────────── */
function SpiraleDoree() {
  const SPINS = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {SPINS.map((deg, i) => (
        <motion.div
          key={deg}
          style={{
            position: 'absolute',
            width: 86 - i * 8,
            height: 86 - i * 8,
            borderRadius: '50%',
            border: '1px solid rgba(218,165,32,0.55)',
            borderLeftColor: 'transparent',
            transform: `rotate(${deg}deg)`,
          }}
          animate={{ rotate: [deg, deg + 360] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      <motion.div style={{ width: 9, height: 9, borderRadius: '50%', background: '#DAA520', boxShadow: '0 0 14px rgba(218,165,32,0.9)' }} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.1, repeat: Infinity }} />
    </div>
  );
}

/* ── 12. Flamme de bougie : chandelle qui vacille ─────────────────────── */
function FlammeBougie() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        style={{
          width: 26,
          height: 44,
          borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
          background: 'radial-gradient(circle at 50% 30%, #fff8dc, #ffd700 45%, #ff8c00 80%, rgba(255,100,0,0.7))',
          boxShadow: '0 0 26px rgba(255,180,60,0.85), 0 0 60px rgba(255,140,0,0.4)',
          transformOrigin: '50% 100%',
        }}
        animate={{
          scaleY: [1, 1.12, 0.94, 1.08, 1],
          scaleX: [1, 0.92, 1.06, 0.96, 1],
          rotate: [-2, 2.5, -1.5, 2, -2],
        }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Mèche */}
      <div style={{ position: 'absolute', bottom: 26, width: 3, height: 10, background: '#3a2a1a', borderRadius: 2 }} />
      {/* Bougie */}
      <div style={{ position: 'absolute', bottom: 6, width: 22, height: 26, borderRadius: 4, background: 'linear-gradient(180deg, #f0e6d0, #d8c9a8)', border: '1px solid rgba(120,90,40,0.5)' }} />
      {/* Halo */}
      <motion.div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,180,60,0.16), transparent 65%)' }} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.6, repeat: Infinity }} />
    </div>
  );
}

/* ── 13. Yin-Yang : symbole qui tourne ────────────────────────────────── */
function YinYang() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.svg width="84" height="84" viewBox="0 0 100 100" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
        <defs>
          <linearGradient id="yy-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5eecb" />
            <stop offset="100%" stopColor="#DAA520" />
          </linearGradient>
        </defs>
        {/* Fond */}
        <circle cx="50" cy="50" r="46" fill="rgba(20,14,8,0.85)" stroke="url(#yy-gold)" strokeWidth="2" />
        {/* Moitié claire (gauche) */}
        <path d="M50 4 A46 46 0 0 1 50 96 A23 23 0 0 1 50 50 A23 23 0 0 0 50 4 Z" fill="rgba(233,217,172,0.9)" />
        {/* Moitié sombre (droite) */}
        <path d="M50 4 A46 46 0 0 0 50 96 A23 23 0 0 0 50 50 A23 23 0 0 1 50 4 Z" fill="rgba(40,28,14,0.9)" />
        {/* Points */}
        <circle cx="50" cy="27" r="6" fill="rgba(40,28,14,0.9)" />
        <circle cx="50" cy="73" r="6" fill="rgba(233,217,172,0.9)" />
      </motion.svg>
    </div>
  );
}

/* ── 14. Onde magique : barres qui dansent (spectre) ──────────────────── */
function OndeMagique() {
  const BARS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: 120, height: 120 }}>
      {BARS.map((i) => (
        <motion.div
          key={i}
          style={{
            width: 5,
            height: 34,
            borderRadius: 4,
            background: i % 2 === 0 ? '#DAA520' : '#87CEEB',
            boxShadow: `0 0 10px ${i % 2 === 0 ? 'rgba(218,165,32,0.7)' : 'rgba(135,206,235,0.7)'}`,
          }}
          animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.09, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ── 15. Carte qui se retourne : dos → face ───────────────────────────── */
function CarteRetourne() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 400 }}>
      <motion.div
        style={{
          width: 52,
          height: 76,
          borderRadius: 8,
          background: 'linear-gradient(145deg, #3a2a52, #241a38)',
          border: '2px solid #DAA520',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          transformStyle: 'preserve-3d',
        }}
        animate={{ rotateY: [0, 180, 360] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Dos (motif étoile) */}
        <span style={{ fontSize: 22, color: '#DAA520', position: 'absolute', backfaceVisibility: 'hidden' }}>✦</span>
        {/* Face (glyphe) */}
        <span style={{ fontSize: 26, color: '#87CEEB', position: 'absolute', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>☾</span>
      </motion.div>
    </div>
  );
}

/* ── 16. Halo de champignons / anneaux concentriques pulsants ─────────── */
function HaloPulsant() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: `2px solid ${i % 2 ? '#87CEEB' : '#DAA520'}`,
          }}
          animate={{ scale: [1, 4.2], opacity: [0.85, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.55, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        style={{ width: 16, height: 16, borderRadius: '50%', background: 'radial-gradient(circle, #fff3c4, #DAA520)', boxShadow: '0 0 18px rgba(218,165,32,0.9)' }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      />
    </div>
  );
}

/* ── 17. Feuille de fougère / encens qui monte ────────────────────────── */
function Encens() {
  const FUMEE = [0, 1, 2, 3, 4];
  return (
    <div style={{ position: 'relative', width: 120, height: 120, overflow: 'hidden' }}>
      {/* Bâton d'encens */}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 4, height: 60, background: 'linear-gradient(180deg, #7a5230, #4a3018)', borderRadius: 2, transformOrigin: '50% 100%', rotate: '-12deg' }} />
      <div style={{ position: 'absolute', bottom: 60, left: 'calc(50% - 8px)', width: 10, height: 10, borderRadius: '50%', background: 'radial-gradient(circle, #ff8c00, #c04000)', boxShadow: '0 0 14px rgba(255,120,0,0.8)' }} />
      {/* Volutes de fumée */}
      {FUMEE.map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            bottom: 66,
            left: '50%',
            width: 16 + i * 3,
            height: 16 + i * 3,
            borderRadius: '50%',
            border: '1px solid rgba(200,190,180,0.4)',
            background: 'radial-gradient(circle, rgba(220,210,200,0.18), transparent 70%)',
          }}
          animate={{ y: [0, -(40 + i * 14)], x: [0, (i % 2 ? 1 : -1) * (6 + i * 4)], scale: [0.6, 1.8], opacity: [0.6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ── 18. Sablier cosmique : grains dorés ──────────────────────────────── */
function SablierCosmique() {
  const GRAINS = [0, 1, 2, 3, 4, 5];
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Sablier */}
      <svg width="54" height="74" viewBox="0 0 54 74" style={{ position: 'absolute' }}>
        <path d="M8 4 H46 L30 37 L46 70 H8 L24 37 Z" fill="none" stroke="#DAA520" strokeWidth="2" />
        <line x1="6" y1="4" x2="48" y2="4" stroke="#DAA520" strokeWidth="3" />
        <line x1="6" y1="70" x2="48" y2="70" stroke="#DAA520" strokeWidth="3" />
      </svg>
      {/* Grains qui tombent */}
      {GRAINS.map((i) => (
        <motion.span
          key={i}
          style={{
            position: 'absolute',
            left: 60 + (i % 2 ? 4 : -4),
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#e9d9ac',
            boxShadow: '0 0 6px rgba(233,217,172,0.9)',
          }}
          animate={{ y: [6, 68], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3, ease: 'easeIn' }}
        />
      ))}
      {/* Accumulation en bas */}
      <motion.div style={{ position: 'absolute', bottom: 6, left: 44, width: 8, height: 8, borderRadius: '50%', background: '#e9d9ac', boxShadow: '0 0 10px rgba(233,217,172,0.9)' }} animate={{ scale: [0.5, 1.4, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }} />
    </div>
  );
}

/* ── 19. Constellation : points reliés qui scintillent ────────────────── */
function Constellation() {
  const NODES = [
    [18, 28], [46, 14], [80, 22], [98, 52], [74, 84], [40, 92], [14, 70], [26, 50],
  ];
  return (
    <div style={{ position: 'relative', width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ position: 'absolute', inset: 0 }}>
        {/* Lignes */}
        {NODES.map((n, i) => {
          const next = NODES[(i + 1) % NODES.length];
          return (
            <motion.line
              key={i}
              x1={n[0]}
              y1={n[1]}
              x2={next[0]}
              y2={next[1]}
              stroke="rgba(135,206,235,0.4)"
              strokeWidth="1"
              animate={{ opacity: [0.15, 0.6, 0.15] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}
            />
          );
        })}
      </svg>
      {NODES.map(([x, y], i) => (
        <motion.span
          key={i}
          style={{
            position: 'absolute',
            left: x - 3,
            top: y - 3,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#87CEEB',
            boxShadow: '0 0 10px rgba(135,206,235,0.9)',
          }}
          animate={{ scale: [1, 1.7, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/* ── 20. Œil d'Horus : regard qui scrute ──────────────────────────────── */
function OeilHorus() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="96" height="64" viewBox="0 0 96 64">
        {/* Œil */}
        <motion.path
          d="M6 32 C 20 10, 76 10, 90 32 C 76 54, 20 54, 6 32 Z"
          fill="none"
          stroke="#DAA520"
          strokeWidth="2.2"
          animate={{ d: ['M6 32 C 20 10, 76 10, 90 32 C 76 54, 20 54, 6 32 Z', 'M6 32 C 22 14, 74 14, 90 32 C 74 50, 22 50, 6 32 Z', 'M6 32 C 20 10, 76 10, 90 32 C 76 54, 20 54, 6 32 Z'] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(218,165,32,0.6))' }}
        />
        {/* Iris + pupille */}
        <motion.circle
          cx="48"
          cy="32"
          r="14"
          fill="rgba(218,165,32,0.25)"
          stroke="#DAA520"
          strokeWidth="1.6"
          animate={{ r: [14, 11, 14] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="48"
          cy="32"
          r="5"
          fill="#e9d9ac"
          animate={{ cx: [48, 44, 52, 48] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Sourcil / aile */}
        <path d="M14 18 C 30 8, 52 8, 82 16" fill="none" stroke="#DAA520" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ── 21. Cartes qui dansent : pile de cartes qui respire ──────────────── */
function CartesQuiDansent() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 44,
            height: 64,
            borderRadius: 7,
            background: `linear-gradient(145deg, ${['#3a2a52', '#2e2142', '#241a38', '#3a2a52', '#2e2142'][i]}, #1a1228)`,
            border: '1.5px solid rgba(218,165,32,0.6)',
            transform: `translateX(${(i - 2) * 13}px) rotate(${(i - 2) * 6}deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          }}
          animate={{ y: [0, -(4 + i * 3)], rotate: [(i - 2) * 6, (i - 2) * 6 + (i % 2 ? 3 : -3), (i - 2) * 6] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        >
          <span style={{ fontSize: 12, color: '#DAA520' }}>{['♠', '♥', '♣', '♦', '★'][i]}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ── 22. Glyphe d'invocation : cercle runique qui pulse + trace ───────── */
function GlypheInvocation() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.svg width="108" height="108" viewBox="0 0 108 108">
        {/* Cercle extérieur qui se trace */}
        <motion.circle
          cx="54"
          cy="54"
          r="48"
          fill="none"
          stroke="#DAA520"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="301.6"
          animate={{ strokeDashoffset: [301.6, 0, 0, 301.6] }}
          transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', times: [0, 0.45, 0.55, 1] }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(218,165,32,0.7))' }}
        />
        {/* Cercle interne */}
        <circle cx="54" cy="54" r="34" fill="none" stroke="rgba(218,165,32,0.35)" strokeWidth="1" strokeDasharray="3 7" />
        {/* Glyphe central */}
        <motion.text x="54" y="64" textAnchor="middle" fill="#e9d9ac" fontSize="30" fontFamily="var(--font-cinzel-deco), serif" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.2, repeat: Infinity }}>
          ☿
        </motion.text>
        {/* 4 étoiles cardinales */}
        {[[54, 8], [54, 100], [8, 54], [100, 54]].map(([x, y], i) => (
          <motion.text key={i} x={x} y={y + 5} textAnchor="middle" fill="#87CEEB" fontSize="11" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }}>
            ✦
          </motion.text>
        ))}
      </motion.svg>
    </div>
  );
}

/* ── Registre exporté ─────────────────────────────────────────────────── */

export const LOADING_ANIMATIONS: LoadingAnimationDef[] = [
  { key: 'orbe-mystique', label: 'Orbe mystique', description: 'Sphère dorée pulsante avec halo et éclats croisés', Comp: OrbeMystique },
  { key: 'runes-tournantes', label: 'Runes tournantes', description: 'Glyphes runiques en cercle autour d\'un cœur lumineux', Comp: RunesTournantes },
  { key: 'pentagramme', label: 'Pentagramme', description: 'Étoile à 5 branches dorée qui tourne lentement', Comp: Pentagramme },
  { key: 'boule-de-cristal', label: 'Boule de cristal', description: 'Sphère bleutée avec ondulations qui émanent', Comp: BouleDeCristal },
  { key: 'etoiles-filantes', label: 'Étoiles filantes', description: 'Particules dorées qui traversent l\'écran', Comp: EtoilesFilantes },
  { key: 'triple-anneau', label: 'Triple anneau', description: '3 anneaux orbitaux or/bleu/ivoire', Comp: TripleAnneau },
  { key: 'de-qui-roule', label: 'Dé qui roule', description: 'Cube 3D qui tourne sur lui-même', Comp: DeQuiRoule },
  { key: 'spinner-elegant', label: 'Spinner élégant', description: 'Arc doré fin avec texte ORACLE', Comp: SpinnerElegant },
  { key: 'points-pulsants', label: 'Points pulsants', description: 'Trio de points or/bleu/ivoire qui respirent', Comp: PointsPulsants },
  { key: 'lune-croissante', label: 'Lune croissante', description: 'Lune dorée avec cratères et étoiles scintillantes', Comp: LuneCroissante },
  { key: 'spirale-doree', label: 'Spirale dorée', description: 'Cercles concentriques qui se resserrent', Comp: SpiraleDoree },
  { key: 'flamme-bougie', label: 'Flamme de bougie', description: 'Chandelle dorée qui vacille avec halo', Comp: FlammeBougie },
  { key: 'yin-yang', label: 'Yin-Yang', description: 'Symbole or/ombre qui tourne', Comp: YinYang },
  { key: 'onde-magique', label: 'Onde magique', description: 'Barres or/bleu qui dansent (spectre)', Comp: OndeMagique },
  { key: 'carte-retournee', label: 'Carte retournée', description: 'Carte tarot qui se retourne dos→face', Comp: CarteRetourne },
  { key: 'halo-pulsant', label: 'Halo pulsant', description: 'Anneaux concentriques qui explosent', Comp: HaloPulsant },
  { key: 'encens', label: 'Encens', description: 'Bâton d\'encens avec volutes de fumée', Comp: Encens },
  { key: 'sablier-cosmique', label: 'Sablier cosmique', description: 'Grains dorés qui tombent dans un sablier', Comp: SablierCosmique },
  { key: 'constellation', label: 'Constellation', description: 'Points bleus reliés qui scintillent', Comp: Constellation },
  { key: 'oeil-horus', label: 'Œil d\'Horus', description: 'Œil doré qui scrute, pupille mobile', Comp: OeilHorus },
  { key: 'cartes-qui-dansent', label: 'Cartes qui dansent', description: 'Éventail de cartes qui respire', Comp: CartesQuiDansent },
  { key: 'glyphe-invocation', label: 'Glyphe d\'invocation', description: 'Cercle runique qui se trace avec glyphe central', Comp: GlypheInvocation },
];

/** Résout une animation par sa clé (fallback : orbe-mystique). */
export function loadingAnimationByKey(key: string): LoadingAnimationDef {
  return (
    LOADING_ANIMATIONS.find((a) => a.key === key) ?? LOADING_ANIMATIONS[0]
  );
}
