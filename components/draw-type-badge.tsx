'use client';

// components/draw-type-badge.tsx — Icônes des deux familles de tirages.
// Base = une carte unique posée ; avancé = un éventail de cartes.
// Style trait doré fin, conforme à la charte (aucun remplissage, strokeLinecap rond).

import type { ReactNode } from 'react';

/** Glyphe « tirage de base » : une carte. */
export function BaseDrawGlyph({ size = 14, color = '#DAA520' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7.5" y="3.5" width="9" height="17" rx="1.6" />
      <path d="M12 9.2v.01" />
      <path d="M9.6 16.8h4.8" />
    </svg>
  );
}

/** Glyphe « tirage avancé » : trois cartes en éventail. */
export function AdvancedDrawGlyph({ size = 14, color = '#DAA520' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.2" y="6.4" width="8.2" height="14" rx="1.4" transform="rotate(-10 7.3 13.4)" />
      <rect x="12.6" y="6.4" width="8.2" height="14" rx="1.4" transform="rotate(10 16.7 13.4)" />
      <rect x="8" y="4.2" width="8" height="14.4" rx="1.5" />
      <path d="M12 9v.01" />
    </svg>
  );
}

/** Pastille explicite « Tirage de base / avancé » — titres modaux des ⓘ et
    cartes d'abonnement. `pill` = contour discret, thème par props couleur. */
export function DrawTypePill({ base, color = '#DAA520', bg, label }: {
  base: boolean;
  color?: string;
  bg?: string;
  label: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase"
      style={{
        color,
        background: bg ?? `${color}14`,
        border: `1px solid ${color}55`,
        fontFamily: 'var(--font-cinzel), serif',
      }}
    >
      {base ? <BaseDrawGlyph size={12} color={color} /> : <AdvancedDrawGlyph size={12} color={color} />}
      {label}
    </span>
  );
}

/** Coin de tuile : glyphe seul, discret (légende aria + title).
    Retourne null si le type est inconnu (pas de badge devinette). */
export function DrawTypeCorner({ base, color = '#DAA520', title }: {
  base: boolean | undefined;
  color?: string;
  title: string;
}) {
  if (base === undefined) return null;
  return (
    <span
      className="pointer-events-none absolute z-10"
      style={{ left: 8, bottom: 8, opacity: 0.92 }}
      title={title}
      aria-label={title}
      role="img"
    >
      {base ? <BaseDrawGlyph size={15} color={color} /> : <AdvancedDrawGlyph size={15} color={color} />}
    </span>
  );
}
