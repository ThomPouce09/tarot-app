'use client';

// components/rune-stones/RuneStonesSet.tsx
// Composant réutilisable : un "sac de runes" d'où sortent des galets vert d'eau
// pâle portant un symbole runique gravé en sombre. Les pierres sont jetées /
// retournées une à une depuis le pochon (vue plongeante sur la zone de tirage).
//
// Props :
//  - count   : nombre de runes à tirer (ex: 3)
//  - layout  : 'horizontal' | 'cross' | 'hammer' | 'vertical'
//  - isRolling : déclenche l'animation de tirage
//  - onRest  : appelé quand toutes les runes sont posées
//  - height  : hauteur du conteneur (px)

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { drawRunes, ELDER_FUTHARK, type Rune, type RuneLayout } from './runes';

export interface RuneStonesSetProps {
  count?: number;
  layout?: RuneLayout;
  isRolling?: boolean;
  onRest?: (runes: DrawnRune[]) => void;
  height?: number;
}

/** Une rune tirée, avec son sens (à l'endroit / à l'envers). */
export interface DrawnRune {
  rune: Rune;
  reversed: boolean;
}

/** Positions (en % de largeur/hauteur) selon la disposition demandée. */
function slotsFor(layout: RuneLayout, count: number): [number, number][] {
  switch (layout) {
    case 'horizontal':
      return Array.from({ length: count }, (_, i) => [
        10 + (80 / Math.max(count - 1, 1)) * i,
        50,
      ]);
    case 'vertical':
      // De bas en haut : Rune 1 en bas (Racines), Rune N en haut (Aigle).
      return Array.from({ length: count }, (_, i) => [
        50,
        88 - (76 / Math.max(count - 1, 1)) * i,
      ]);
    case 'cross':
      // Croix : centre + 4 branches (utilisé pour count=5 typiquement).
      return ([
        [50, 50], // centre
        [50, 12], // haut
        [50, 88], // bas
        [12, 50], // gauche
        [88, 50], // droite
      ] as [number, number][]).slice(0, count);
    case 'hammer':
      // Marteau de Mjölnir inversé (T) : 5 runes.
      // manche bas, manche haut, tête gauche, tête droite, tête centre (haut).
      return ([
        [50, 88], // 1 base du manche (bas)
        [50, 50], // 2 haut du manche (milieu)
        [26, 22], // 3 côté gauche de la tête
        [74, 22], // 4 côté droit de la tête
        [50, 12], // 5 centre de la tête (haut)
      ] as [number, number][]).slice(0, count);
    default:
      return Array.from({ length: count }, (_, i) => [10 + (80 / Math.max(count - 1, 1)) * i, 50]);
  }
}

/** Ordre d'apparition : pour le marteau, de bas en haut. */
function revealOrder(layout: RuneLayout, count: number): number[] {
  if (layout === 'hammer') {
    // Index dans l'ordre slotsFor : [1=base, 2=manche, 3=gauche, 4=droite, 5=centre]
    // On veut apparaître : base, manche, gauche, droite, centre.
    return [0, 1, 2, 3, 4].slice(0, count);
  }
  if (layout === 'vertical') {
    // De bas en haut = slots déjà ordonnés ainsi (index 0 = bas).
    return Array.from({ length: count }, (_, i) => i);
  }
  // horizontal / cross : de gauche à droite.
  return Array.from({ length: count }, (_, i) => i);
}

/** Taille du galet / symbole (px). Tiny is sexy : compact sur smartphone. */
export const STONE_SIZE = 46;
export const STONE_SYMBOL = 26;

export default function RuneStonesSet({
  count = 3,
  layout = 'horizontal',
  isRolling = false,
  onRest,
  height = 360,
}: RuneStonesSetProps) {
  const [drawn, setDrawn] = useState<DrawnRune[]>([]);
  const [revealed, setRevealed] = useState<number>(0);
  const restFired = useRef(false);

  // Tirage à chaque nouveau lancer.
  useEffect(() => {
    if (!isRolling) {
      restFired.current = false;
      return;
    }
    const picks = drawRunes(count).map((rune) => ({
      rune,
      reversed: Math.random() < 0.28, // ~28% de runes à l'envers
    }));
    setDrawn(picks);
    setRevealed(0);
  }, [isRolling, count]);

  const order = useMemo(() => revealOrder(layout, count), [layout, count]);
  const slots = useMemo(() => slotsFor(layout, count), [layout, count]);

  // Révélation progressive (une à une), puis onRest.
  useEffect(() => {
    if (!isRolling || drawn.length === 0) return;
    if (revealed >= drawn.length) {
      if (!restFired.current) {
        restFired.current = true;
        onRest?.(drawn);
      }
      return;
    }
    const t = setTimeout(() => setRevealed((v) => v + 1), 320);
    return () => clearTimeout(t);
  }, [revealed, drawn, isRolling, onRest]);

  return (
    <div
      className="relative w-full select-none"
      style={{ height: `${height}px`, overflow: 'hidden' }}
      aria-label={`Tirage de ${count} runes`}
    >
      {/* Fond transparent : la zone s'intègre au fond de la page (charte
          vert/doré) qui contient déjà le composant. */}

      {/* Les galets / pierres runiques */}
      <AnimatePresence>
        {drawn.map((cast, i) => {
          const shown = order.indexOf(i) < revealed;
          const [x, y] = slots[i];
          return (
            <motion.div
              key={`${cast.rune.name}-${i}`}
              className="absolute z-20"
              style={{ left: `${x}%`, top: `${y}%`, x: '-50%', y: '-50%' }}
              initial={{ scale: 0.2, opacity: 0, y: '-260%' }}
              animate={
                shown
                  ? { scale: 1, opacity: 1, y: '-50%' }
                  : { scale: 0.2, opacity: 0, y: '-260%' }
              }
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 14,
                delay: shown ? order.indexOf(i) * 0.32 : 0,
              }}
            >
              <RuneStone
                symbol={cast.rune.symbol}
                reversed={cast.reversed}
                name={cast.rune.name}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* Galet vert d'eau pâle, symbole gravé en sombre. */
function RuneStone({
  symbol,
  reversed,
  name,
}: {
  symbol: string;
  reversed: boolean;
  name: string;
}) {
  return (
    <motion.div
      className="flex items-center justify-center rounded-full"
      title={`${name}${reversed ? ' (à l’envers)' : ''}`}
      animate={{ rotate: reversed ? 180 : 0 }}
      transition={{ duration: 0.5 }}
      style={{
        width: STONE_SIZE,
        height: STONE_SIZE,
        background:
          'radial-gradient(circle at 35% 30%, #dfeee4 0%, #b9d4c4 45%, #8fb3a3 100%)',
        border: '1px solid #6f927f',
        boxShadow:
          '0 3px 8px rgba(0,0,0,0.45), inset 0 1px 3px rgba(255,255,255,0.45), inset 0 -4px 8px rgba(40,70,55,0.4)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          fontSize: STONE_SYMBOL,
          lineHeight: 1,
          color: '#2b3a30',
          textShadow: '0 1px 1px rgba(255,255,255,0.5)',
          userSelect: 'none',
        }}
      >
        {symbol}
      </span>
    </motion.div>
  );
}
