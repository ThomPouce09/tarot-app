'use client';

// app/runes/page.tsx — Tableau de bord des Runes Scandinaves
// Tuiles visuelles type /tarot & /yi-jing (image/glyphe + titre + sous-titre),
// thème runes respecté (vert forêt / doré pâle / vert sauge), tout sur un écran
// mobile sans scroller.

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import YiSlideNav from '@/components/yi-slide-nav';
import Firefly from '@/components/firefly';
import { RuneBackground, RuneTitle } from './_shared';
import { RUNE_THEME } from './_shared';
import { installSoundUnlock, playSound, stopSound } from '@/lib/sounds';

// Frise décorative de runes — rendue uniquement après hydratation pour
// éviter le mismatch d'hydratation (glyphes runiques = Unicode hors-BMP).
const FRIEZE_TOP = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
const FRIEZE_BOTTOM = 'ᛟᛞᛜᛚᛗᛖᛒᛏᛊᛉᛈᛇᛃᛁᚾᚺᚹᚷᚲᚱᚨᚦᚢᚠ';

function RuneFrieze({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-1.5 select-none overflow-hidden whitespace-nowrap text-center ${
        position === 'top' ? 'top-1.5' : 'bottom-1.5'
      }`}
      style={{
        fontFamily: 'var(--font-cinzel-deco), serif',
        color: RUNE_THEME.goldPale,
        opacity: 0.1,
        fontSize: 11,
        letterSpacing: '0.35em',
      }}
      aria-hidden
    >
      {position === 'top' ? FRIEZE_TOP : FRIEZE_BOTTOM}
    </div>
  );
}

const TILES = [
  {
    href: '/runes/nornes',
    glyph: 'ᚾ', // N – Norn (Urdhr, Verdandi, Skuld)
    title: 'Le Fil des Nornes',
    subtitle: 'Passé, présent, avenir — et le conseil d’Odin.',
    bg: `linear-gradient(135deg, ${RUNE_THEME.forestMid} 0%, ${RUNE_THEME.forest} 100%)`,
    border: `${RUNE_THEME.goldPale}55`,
  },
  {
    href: '/runes/mjolnir',
    glyph: 'ᛗ', // M – Mjölnir
    title: 'Le Marteau de Mjölnir',
    subtitle: 'Briser un obstacle, trouver la force d’agir.',
    bg: `linear-gradient(135deg, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.ink} 100%)`,
    border: `${RUNE_THEME.goldSoft}55`,
  },
  {
    href: '/runes/yggdrasil',
    glyph: 'ᛟ', // O – Yggdrasil / Odin
    title: "Les Racines d'Yggdrasil",
    subtitle: 'Un bilan profond pour s’ancrer et grandir.',
    bg: `linear-gradient(135deg, #163a26 0%, ${RUNE_THEME.forestDeep} 100%)`,
    border: `${RUNE_THEME.sage}66`,
  },
];

export default function RunesHub() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Jingle d'ouverture : même pattern que /des-divinatoires (user activation
  // héritée de la navigation par lien ; installSoundUnlock couvre l'accès direct).
  // Le jingle est coupé dès que l'utilisateur quitte la page (navigation,
  // fermeture d'onglet, passage en arrière-plan) via stopSound().
  useEffect(() => {
    installSoundUnlock();
    const t = window.setTimeout(() => playSound('runes', 0.75), 150);
    const onVisibility = () => {
      if (document.hidden) stopSound('runes');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
      stopSound('runes');
    };
  }, []);
  return (
    <RuneBackground>
      <YiSlideNav />
      <RuneTitle
        title="Runes Scandinaves : Interroger le Futhark"
        subtitle="Le Futhark Ancien, 24 runes gravées sur pierre, révèle les courants du destin."
      />

      {/* TUILES : 2 colonnes sur mobile (comme /tarot & /yi-jing) */}
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 px-4 pb-4 sm:gap-5">
        {TILES.map((tile) => (
          <Link key={tile.href} href={tile.href} className="block">
            <motion.div
              className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl cursor-pointer transition-all"
              style={{
                background: tile.bg,
                border: `2px solid ${tile.border}`,
                boxShadow: `0 0 16px ${RUNE_THEME.goldGlow}, 0 4px 12px rgba(0,0,0,0.5)`,
              }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* frise de runes discrètes le long du liseré (après hydratation) */}
              {mounted && <RuneFrieze position="top" />}
              {mounted && <RuneFrieze position="bottom" />}
              <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                <div className="absolute inset-1.5 rounded-lg border border-[rgba(233,217,172,0.25)] pointer-events-none" />
                <span
                  className="mb-2 text-5xl leading-none sm:text-6xl"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: RUNE_THEME.goldPale,
                    textShadow: `0 0 16px ${RUNE_THEME.goldGlow}`,
                  }}
                >
                  {tile.glyph}
                </span>
                <h2
                  className="px-1 text-center text-[13px] font-bold leading-tight sm:text-base"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: RUNE_THEME.goldPale,
                    textShadow: `0 0 10px ${RUNE_THEME.goldGlow}`,
                  }}
                >
                  {tile.title}
                </h2>
                <p
                  className="mt-1 px-1 text-center text-[9px] leading-tight sm:text-[11px]"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: RUNE_THEME.sage,
                  }}
                >
                  {tile.subtitle}
                </p>
              </div>
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse at center, ${RUNE_THEME.goldGlow} 0%, transparent 70%)`,
                }}
              />
            </motion.div>
          </Link>
        ))}
      </div>
      <Firefly page="runes" />
    </RuneBackground>
  );
}
