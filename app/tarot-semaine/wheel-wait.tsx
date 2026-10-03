'use client';

// app/tarot-semaine/wheel-wait.tsx
// Attente du chargement de la roue (« Les Arcanes de la Semaine »).
//
// Déroulé (~3,5 s) : le cadran s'éveille → les SEPT SYMBOLES PLANÉTAIRES
// apparaissent L'UN APRÈS L'AUTRE (éclat + halo + onde) → le trait de liaison
// doré les relie à mesure puis se referme → onde de clôture → respiration
// d'attente (les symboles scintillent en vague, le cadran tourne).
//
// Géométrie : le trait de liaison court sur le cercle des jours (r = 84) et les
// symboles sont posés À L'EXTÉRIEUR de ce trait (r = 116), en grand (26 px) —
// c'est ce qui les rend lisibles d'un coup d'œil.
//
// Palette : MARRON et OR uniquement (charte maison).
//
// Pur SVG + framer-motion, aucun asset, aucun feGaussianBlur animé : les halos
// sont des dégradés radiaux et le lien un double tracé — bien moins coûteux
// qu'un filtre recalculé à chaque frame sur un Android modeste.

import { motion } from 'framer-motion';
import { useLang } from '@/lib/i18n';

const GOLD = '#DAA520';
const GOLD_PALE = '#F0C75E';
const BROWN_DEEP = '#3A2410';
const BROWN = '#5A3A1E';
const BROWN_WARM = '#8A5A22';
const IVORY = '#F5EAD6';

// Les sept luminaires planétaires, dans l'ordre des jours de la roue (dim→sam).
const SIGILS = ['☉', '☽', '♂', '☿', '♃', '♀', '♄'];

const C = 150;        // centre (viewBox 300 × 300)
const DAY_R = 84;     // rayon du cercle des jours = trait de liaison
const SYM_R = 116;    // rayon des symboles — À L'EXTÉRIEUR du trait

const PTS = SIGILS.map((_, i) => {
  const a = (i * 2 * Math.PI) / SIGILS.length - Math.PI / 2; // le 1er jour naît en haut
  return { x: C + SYM_R * Math.cos(a), y: C + SYM_R * Math.sin(a) };
});
// Points du trait de liaison (sur le cercle des jours, sous chaque symbole).
const LINK_PTS = SIGILS.map((_, i) => {
  const a = (i * 2 * Math.PI) / SIGILS.length - Math.PI / 2;
  return { x: C + DAY_R * Math.cos(a), y: C + DAY_R * Math.sin(a) };
});

// Cadran : 28 graduations fines, à l'intérieur du cercle des jours.
const TICKS = Array.from({ length: 28 }, (_, i) => {
  const a = (i * 2 * Math.PI) / 28;
  const major = i % 7 === 0;
  const r1 = 66;
  const r2 = major ? 80 : 76;
  return { x1: C + r1 * Math.cos(a), y1: C + r1 * Math.sin(a), x2: C + r2 * Math.cos(a), y2: C + r2 * Math.sin(a), major };
});

/* ── Chronologie (secondes) ─────────────────────────────────────────────── */
const T0 = 0.5;                              // 1er symbole
const STEP = 0.36;                           // intervalle entre deux symboles
const CLOSE = T0 + SIGILS.length * STEP;     // le trait se referme (3,02 s)
const IDLE = CLOSE + 0.5;                    // respiration d'attente (3,52 s)

const originAt = (x: number, y: number) =>
  ({ transformOrigin: `${x}px ${y}px`, transformBox: 'view-box' }) as const;
const CENTER_ORIGIN = originAt(C, C);

// Un segment du trait de liaison : jour i → jour i+1 (le dernier referme).
const linkSegment = (i: number) => {
  const a = LINK_PTS[i];
  const b = LINK_PTS[(i + 1) % SIGILS.length];
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};

export default function WheelWait() {
  const lang = useLang();
  const fr = lang !== 'en';

  return (
    <div className="mt-12 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ width: 'min(80vw, 292px)' }}
      >
        <svg
          viewBox="0 0 300 300"
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label={fr ? 'Chargement des arcanes' : 'Loading the arcana'}
        >
          <defs>
            <radialGradient id="wwCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFF3D0" stopOpacity="0.95" />
              <stop offset="26%" stopColor={GOLD_PALE} stopOpacity="0.5" />
              <stop offset="62%" stopColor={GOLD} stopOpacity="0.11" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="wwHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={GOLD_PALE} stopOpacity="0.55" />
              <stop offset="52%" stopColor={BROWN_WARM} stopOpacity="0.4" />
              <stop offset="100%" stopColor={BROWN} stopOpacity="0" />
            </radialGradient>
            {/* Nappe marron : l'animation repose sur un fond de bois chaud */}
            <radialGradient id="wwBrown" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={BROWN} stopOpacity="0.5" />
              <stop offset="58%" stopColor={BROWN_DEEP} stopOpacity="0.3" />
              <stop offset="100%" stopColor={BROWN_DEEP} stopOpacity="0" />
            </radialGradient>
            {/* Le trait de liaison : or en haut, marron en bas */}
            <linearGradient id="wwLink" gradientUnits="userSpaceOnUse" x1="45" y1="35" x2="255" y2="265">
              <stop offset="0%" stopColor={GOLD_PALE} />
              <stop offset="45%" stopColor={GOLD} />
              <stop offset="100%" stopColor={BROWN_WARM} />
            </linearGradient>
          </defs>

          {/* Nappe de bois chaud */}
          <motion.circle
            cx={C} cy={C} r={148} fill="url(#wwBrown)"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4 }}
          />

          {/* Cadran gradué + couronne pointillée intérieure, en contretemps */}
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.25 }}
            style={CENTER_ORIGIN}
          >
            <motion.g animate={{ rotate: 360 }} transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}>
              {TICKS.map((t, i) => (
                <line
                  key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                  stroke={t.major ? GOLD_PALE : `${BROWN_WARM}b0`}
                  strokeWidth={t.major ? 1.4 : 1}
                  opacity={t.major ? 0.85 : 0.6}
                />
              ))}
            </motion.g>
            <motion.circle
              cx={C} cy={C} r={58} fill="none" stroke={`${BROWN_WARM}99`} strokeWidth="1"
              strokeDasharray="1 10"
              animate={{ rotate: -360 }} transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
              style={CENTER_ORIGIN}
            />
          </motion.g>

          {/* Le cercle des jours se trace d'un trait */}
          <motion.circle
            cx={C} cy={C} r={DAY_R} fill="none" stroke={`${GOLD}66`} strokeWidth="1.1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            style={{ ...CENTER_ORIGIN, rotate: -90 }}
          />

          {/* Le trait de liaison doré : un segment par jour, tissé à mesure */}
          {SIGILS.map((_, i) => (
            <g key={`l${i}`}>
              <motion.path
                d={linkSegment(i)} fill="none" stroke={BROWN_WARM} strokeWidth="5" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 0.4, 0.4] }}
                transition={{ duration: 0.4, delay: T0 + (i + 1) * STEP - 0.2, ease: 'easeOut' }}
              />
              <motion.path
                d={linkSegment(i)} fill="none" stroke="url(#wwLink)" strokeWidth="1.6" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 1] }}
                transition={{ duration: 0.4, delay: T0 + (i + 1) * STEP - 0.2, ease: 'easeOut' }}
              />
            </g>
          ))}

          {/* Le cœur de l'oracle : s'allume avec la roue, puis respire */}
          <motion.circle
            cx={C} cy={C} r={46} fill="url(#wwCore)"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15, ease: 'easeOut' }}
            style={CENTER_ORIGIN}
          />
          <motion.circle
            cx={C} cy={C} r={46} fill="url(#wwCore)"
            animate={{ opacity: [0.5, 1, 0.5], scale: [0.96, 1.05, 0.96] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: IDLE }}
            style={CENTER_ORIGIN}
          />
          <motion.circle
            cx={C} cy={C} r={4.5} fill="#FFF7DC"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.62, 1], r: [3, 5.8, 4.4, 5.6] }}
            transition={{ duration: CLOSE, times: [0, 0.34, 0.62, 1], ease: 'easeInOut' }}
            style={CENTER_ORIGIN}
          />

          {/* Onde de clôture : la roue se referme d'un souffle */}
          <motion.circle
            cx={C} cy={C} r={DAY_R} fill="none" stroke={GOLD_PALE} strokeWidth="1.7"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: [0.55, 1.55], opacity: [0, 0.75, 0] }}
            transition={{ duration: 1, delay: CLOSE + 0.06, ease: 'easeOut' }}
            style={CENTER_ORIGIN}
          />

          {/* LES SEPT SYMBOLES — À L'EXTÉRIEUR du trait, en grand */}
          {SIGILS.map((sigil, i) => {
            const delay = T0 + i * STEP;
            const p = PTS[i];
            const o = originAt(p.x, p.y);
            return (
              <g key={i}>
                {/* onde de charge — part exactement quand le symbole apparaît */}
                <motion.circle
                  cx={p.x} cy={p.y} r={24} fill="none" stroke={GOLD_PALE} strokeWidth="1.4"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [0.4, 1.6], opacity: [0, 0.9, 0] }}
                  transition={{ duration: 0.75, delay, ease: 'easeOut' }}
                  style={o}
                />
                {/* éclat bref au moment de l'apparition */}
                <motion.circle
                  cx={p.x} cy={p.y} r={40} fill="url(#wwHalo)"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 0.5], scale: [0.5, 1.3, 1] }}
                  transition={{ duration: 0.8, delay, ease: 'easeOut' }}
                  style={o}
                />
                {/* le symbole : jaillit puis se pose, et scintille ensuite */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.35 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay, ease: 'backOut' }}
                  style={o}
                >
                  <motion.g
                    animate={{ opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut', delay: IDLE + i * 0.17 }}
                  >
                    <circle cx={p.x} cy={p.y} r={22} fill="none" stroke={`${GOLD}80`} strokeWidth="1.2" />
                    <circle cx={p.x} cy={p.y} r={17} fill={BROWN_DEEP} fillOpacity="0.55" />
                    <text
                      x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                      fill={GOLD_PALE} fontSize="27"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {sigil}
                    </text>
                  </motion.g>
                </motion.g>
              </g>
            );
          })}
        </svg>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="mt-5 text-center text-[11px] uppercase tracking-[0.34em]"
        style={{ color: `${IVORY}bb`, fontFamily: 'var(--font-cinzel-deco), serif' }}
      >
        {fr ? 'Chargement des arcanes' : 'Loading the arcana'}
      </motion.p>

      {/* Sept points : ils s'allument au rythme exact des sept symboles */}
      <div className="mt-3 flex items-center gap-2" aria-hidden>
        {SIGILS.map((_, i) => (
          <motion.span
            key={i}
            className="block h-1 w-1 rounded-full"
            style={{ background: GOLD_PALE }}
            initial={{ opacity: 0.12, scale: 0.7 }}
            animate={{ opacity: [0.12, 1, 0.55], scale: [0.7, 1.3, 1] }}
            transition={{ duration: 0.45, delay: T0 + i * STEP, ease: 'easeOut' }}
          />
        ))}
      </div>
    </div>
  );
}
