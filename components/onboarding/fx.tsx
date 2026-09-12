'use client';

// components/onboarding/fx.tsx — briques visuelles partagées des mini-jeux du
// tutoriel « Le hall des Etoiles » (palette charte Tarot, aucun son).

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export const GOLD = '#DAA520';
export const GOLD_PALE = '#F0C75E';
export const IVORY = '#F5EAD6';
export const ROSE = '#E2B8AC';
export const WINE = '#4A1931';

export function goldPill(): React.CSSProperties {
  return {
    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_PALE} 100%)`,
    color: '#2a1808',
    border: `1px solid ${GOLD_PALE}`,
    fontFamily: 'var(--font-cinzel), serif',
    boxShadow: '0 3px 14px rgba(218,165,32,0.4), inset 0 1px 0 rgba(255,255,255,0.35)',
  };
}

export function darkPill(): React.CSSProperties {
  return {
    background: 'rgba(24, 10, 4, 0.45)',
    color: IVORY,
    border: `1px solid ${GOLD}55`,
    fontFamily: 'var(--font-cinzel), serif',
  };
}

// Filet de lumière dorée qui traverse un texte (mot-clé révélé).
export function ShineText({ children, color = GOLD_PALE }: { children: React.ReactNode; color?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="text-center text-[13px] font-bold tracking-wide"
      style={{
        fontFamily: 'var(--font-cinzel), serif',
        color,
        textShadow: `0 0 14px ${GOLD}88, 0 1px 2px rgba(0,0,0,0.65)`,
      }}
    >
      {children}
    </motion.span>
  );
}

// Cadre de la zone de jeu des mini-jeux (tapis sombre, liseré or).
export function GameFrame({
  children,
  hint,
  done,
  doneLabel,
  doneDelay,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  children: ReactNode;
  hint?: string;
  done?: boolean;
  doneLabel?: string;
  doneDelay?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className="relative mx-auto w-full max-w-sm select-none overflow-hidden rounded-2xl px-4 py-4"
      style={{
        background: 'linear-gradient(165deg, rgba(24,10,4,0.55) 0%, rgba(52,18,31,0.55) 100%)',
        border: `1px solid ${GOLD}44`,
        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.35)',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
      {done && <CheckBadge label={doneLabel} delay={doneDelay} />}
      {hint && (
        <p
          className="mt-3 text-center text-[11px] italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}bb` }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* ── coche verte «démo réussie» : apparaît ~0.6 s après la fin de l'animation,
   dans l'angle haut-gauche de l'aire, anneau qui s'ouvre puis trait tracé. ── */
export function CheckBadge({ label, delay = 0.6 }: { label?: string; delay?: number }) {
  return (
    <motion.div
      data-tour="check"
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 16 }}
      className="pointer-events-none absolute left-2 top-2 z-40"
      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(34,197,94,0.65))' }}
    >
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" role="img" aria-label={label || 'OK'}>
        <defs>
          <linearGradient id="chkGrad" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4ade80" />
            <stop offset="1" stopColor="#15803d" />
          </linearGradient>
        </defs>
        {/* pastille sombre + anneau */}
        <circle cx="20" cy="20" r="17.5" fill="rgba(4,18,10,0.78)" stroke="rgba(74,222,128,0.5)" strokeWidth="1" />
        {/* anneau vert qui se dessine */}
        <motion.circle
          cx="20" cy="20" r="17.5" stroke="url(#chkGrad)" strokeWidth="2.6" strokeLinecap="round"
          fill="none" pathLength={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay, duration: 0.5, ease: 'easeOut' }}
          style={{ transformOrigin: '20px 20px', rotate: '-90deg' }}
        />
        {/* la coche, tracée juste après */}
        <motion.path
          d="M12.4 20.6 L17.7 25.8 L27.8 15.2"
          stroke="url(#chkGrad)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: delay + 0.32, duration: 0.38, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}

// Petit bouton discret « Passer cette démo » (jamais bloquant).
export function SkipDemo({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mx-auto mt-2 block text-[10px] underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-100"
      style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}99` }}
    >
      {label}
    </button>
  );
}
