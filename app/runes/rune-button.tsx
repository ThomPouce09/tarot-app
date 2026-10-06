'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { RUNE_THEME } from './rune-theme';

/* Bouton principal (vert sapin, bord doré pâle).
   variant='save' : reprise exacte du design « Enregistrer » (pilule teal
   glossée + halo) que l'utilisateur apprécie — utilisé pour « Compris »,
   « Tisser une nouvelle voie » et la relance de l'analyse IA. */
/* Teintes « save » par univers — même pilule glossy, couleur locale. */
const SAVE_THEME: Record<string, { base: string; glow: string; text: string }> = {
  runes: { base: '#005f6a', glow: 'rgba(0,95,106,0.5)', text: '#fff' },           // teal (défaut)
  tarot: { base: 'linear-gradient(180deg, #E8C66A 0%, #D4AF37 45%, #9A7A22 100%)',
           glow: 'rgba(212,175,55,0.55)', text: '#241505' },                       // jaune pâle glossy
  'yi-jing': { base: '#8e1c22', glow: 'rgba(180,40,45,0.5)', text: '#fff' },       // rouge laque
  des: { base: '#2a7fb8', glow: 'rgba(135,206,235,0.5)', text: '#fff' },           // bleu céleste AstroDice
  astro: { base: 'linear-gradient(180deg, #22366f 0%, #14245a 46%, #070d22 100%)',
           glow: 'rgba(212,175,55,0.5)', text: '#F7ECCE' },                          // nuit indigo sertie or (Dés)
  cedar: { base: 'linear-gradient(180deg, #3f8e5c 0%, #2f6f46 55%, #1d4a2e 100%)',
           glow: 'rgba(63,142,92,0.55)', text: '#f2fbf3' },                            // vert cèdre 3D (Yggdrasil)
};

export function RuneButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  saveTint = 'runes',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'gold' | 'save';
  /** Univers d'affichage pour le bouton « save » (couleur locale). */
  saveTint?: 'runes' | 'tarot' | 'yi-jing' | 'des' | 'cedar' | 'astro';
}) {
  if (variant === 'save') {
    const tint = SAVE_THEME[saveTint] || SAVE_THEME.runes;
    return (
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.04, y: -2 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        className="rounded-full px-7 py-3 text-sm sm:text-base font-bold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
        style={{
          // Gloss : reflet blanc dégradé par-dessus la couleur de base
          // (même recette que le bouton « Enregistrer » de ask-question).
          background: `
            linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%),
            ${tint.base}`,
          color: tint.text,
          fontFamily: 'var(--font-cinzel), serif',
          boxShadow: disabled
            ? 'none'
            : `0 0 16px ${tint.glow}, inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)`,
          letterSpacing: '0.04em',
        }}
      >
        {children}
      </motion.button>
    );
  }
  const bg =
    variant === 'gold'
      ? disabled
        ? RUNE_THEME.forestMid
        : RUNE_THEME.goldSoft
      : disabled
        ? RUNE_THEME.forestMid
        : RUNE_THEME.forest;
  const color = variant === 'gold' ? RUNE_THEME.ink : RUNE_THEME.goldPale;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="rounded-xl px-6 py-3 text-sm sm:text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        fontFamily: 'var(--font-cinzel), serif',
        background: bg,
        color,
        border: `1.5px solid ${RUNE_THEME.goldPale}`,
        boxShadow: disabled
          ? 'none'
          : `0 0 18px ${RUNE_THEME.goldGlow}, 0 4px 12px rgba(0,0,0,0.4)`,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </motion.button>
  );
}
