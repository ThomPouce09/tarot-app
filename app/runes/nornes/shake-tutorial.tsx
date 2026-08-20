'use client';

// app/runes/nornes/shake-tutorial.tsx
// Mini-tutoriel animé remplaçant le bouton « Interroger les Nornes » :
// explique le geste (se concentrer, secouer le sac plusieurs fois, les runes
// sortent une par une) avec un sac SVG qui se secoue en boucle.
// Icônes SVG inline uniquement (règle utilisateur : pas d'emoji/Material).

import { motion } from 'framer-motion';
import { useLang, useT } from '@/lib/i18n';
import { RUNE_THEME } from '../_shared';

/* ------------------------------------------------------------------ */
/* Sac SVG (pochon vert à liseré doré) — animé en secousse par le      */
/* parent. L'animation rotate/translate est pilotée par framer-motion. */
/* ------------------------------------------------------------------ */
export function ShakePouch({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))' }}
    >
      {/* Cordon */}
      <path
        d="M18 14c4-6 12-8 14-8s10 2 14 8"
        stroke={RUNE_THEME.goldPale}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Sac */}
      <path
        d="M14 18c0 16 6 32 18 32s18-16 18-32Z"
        fill={RUNE_THEME.forest}
        stroke={RUNE_THEME.goldSoft}
        strokeWidth="2.5"
      />
      {/* Liseré doré supérieur */}
      <path
        d="M16 20c5 5 27 5 32 0"
        stroke={RUNE_THEME.goldPale}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Glyphe runique gravé */}
      <text
        x="32"
        y="42"
        textAnchor="middle"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          fontSize: 18,
          fill: RUNE_THEME.sagePale,
          letterSpacing: 0,
        }}
      >
        ᛉ
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Mini-puce runique (étape)                                           */
/* ------------------------------------------------------------------ */
function StepDot({ glyph }: { glyph: string }) {
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px]"
      style={{
        background: `${RUNE_THEME.goldPale}1f`,
        border: `1px solid ${RUNE_THEME.goldPale}55`,
        color: RUNE_THEME.goldPale,
        fontFamily: 'var(--font-cinzel-deco), serif',
      }}
    >
      {glyph}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tutoriel animé : sac qui se secoue + 3 étapes en cascade.           */
/* ------------------------------------------------------------------ */
export function ShakeTutorial() {
  const t = useT();
  const lang = useLang();
  const isEn = lang === 'en';

  const steps = [
    { glyph: 'ᛟ', key: 'runes.nornes.tutoStep1' },
    { glyph: 'ᚲ', key: 'runes.nornes.tutoStep2' },
    { glyph: 'ᛉ', key: 'runes.nornes.tutoStep3' },
  ] as const;

  return (
    <div
      className="mx-auto inline-block rounded-2xl px-4 py-3 text-center"
      style={{
        background: `linear-gradient(135deg, ${RUNE_THEME.forestMid}44 0%, ${RUNE_THEME.forest}33 100%)`,
        border: `1.5px solid ${RUNE_THEME.goldPale}44`,
        boxShadow: `inset 0 0 24px ${RUNE_THEME.forestMid}22`,
      }}
    >
      {/* Sac en secousse (boucle lente, pause entre chaque secousse) */}
      <motion.div
        className="mx-auto mb-1.5 flex items-center justify-center"
        animate={{ rotate: [0, -7, 7, -7, 7, 0], x: [0, -3, 3, -3, 3, 0] }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          repeatDelay: 0.9,
          ease: 'easeInOut',
        }}
      >
        <ShakePouch size={48} />
        {/* Particules dorées lors de la secousse */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute rounded-full"
            style={{
              width: 4 + i * 2,
              height: 4 + i * 2,
              background: 'radial-gradient(circle, #fff3c8 0%, #e9c96a 70%, transparent 100%)',
              boxShadow: `0 0 6px 1px ${RUNE_THEME.goldPale}88`,
            }}
            animate={{
              opacity: [0, 1, 0],
              y: [-2, -12 - i * 5],
              x: [-4 + i * 4, -8 + i * 8],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 1.1,
              delay: i * 0.22,
              ease: 'easeOut',
            }}
          />
        ))}
      </motion.div>

      <p
        className="mb-1.5 text-[13px] font-bold"
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: RUNE_THEME.goldPale,
          letterSpacing: '0.03em',
        }}
      >
        {t('runes.nornes.tutoTitle')}
      </p>

      {/* Étapes en cascade */}
      <div className="flex flex-col items-start gap-1">
        {steps.map((s, i) => (
          <motion.div
            key={s.key}
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.28, duration: 0.35, ease: 'easeOut' }}
          >
            <StepDot glyph={s.glyph} />
            <span
              className="text-left text-[11px] leading-snug sm:text-xs"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: RUNE_THEME.sagePale,
              }}
            >
              {t(s.key)}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Note : le sac ci-dessous est déjà prêt */}
      <motion.p
        className="mt-2 text-[10px] italic"
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: RUNE_THEME.sage,
          opacity: 0.85,
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {isEn ? 'The pouch below is ready — tap it to shake.' : 'Le sac ci-dessous est prêt — touchez-le pour secouer.'}
      </motion.p>
    </div>
  );
}
