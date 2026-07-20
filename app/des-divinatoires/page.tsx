'use client';

// app/des-divinatoires/page.tsx — Niveau 1 : Tableau de bord des Dés du Zodiaque

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import YiSlideNav from '@/components/yi-slide-nav';
import Firefly from '@/components/firefly';
import { DiceBackground, DiceTitle, DICE_THEME } from './_shared';

// Frise décorative de signes astrologiques — SVG vectoriel (trait fin doré),
// rendue uniquement après hydratation (cohérent avec /runes) pour éviter
// tout mismatch d'hydratation.
const ZODIAC_GLYPHS = [
  // 0 Bélier
  (<>
    <path d="M34 64 Q22 40 40 34 Q54 30 52 50" />
    <path d="M66 64 Q78 40 60 34 Q46 30 48 50" />
  </>),
  // 1 Taureau
  (<>
    <circle cx="50" cy="54" r="17" />
    <path d="M34 38 Q30 26 42 30" />
    <path d="M66 38 Q70 26 58 30" />
  </>),
  // 2 Gémeaux
  (<>
    <path d="M38 30 V70" />
    <path d="M62 30 V70" />
    <path d="M38 30 H62" />
    <path d="M38 70 H62" />
  </>),
  // 3 Cancer
  (<>
    <path d="M36 36 Q26 36 28 48 Q30 58 42 52" />
    <path d="M64 36 Q74 36 72 48 Q70 58 58 52" />
  </>),
  // 4 Lion
  (<>
    <path d="M30 62 Q30 34 50 34 Q70 34 70 58 Q70 70 56 66" />
    <path d="M50 34 V52" />
  </>),
  // 5 Vierge
  (<>
    <path d="M32 32 L44 68 L52 44 L60 68 L72 32" />
    <path d="M60 68 Q70 70 72 60" />
  </>),
  // 6 Balance
  (<>
    <path d="M28 38 H72" />
    <path d="M50 38 V60" />
    <path d="M40 60 L50 50 L60 60 Z" />
  </>),
  // 7 Scorpion
  (<>
    <path d="M30 36 L44 60 L58 36" />
    <path d="M58 36 Q72 40 66 54 Q62 62 52 58" />
  </>),
  // 8 Sagittaire
  (<>
    <path d="M30 66 Q50 50 70 34" />
    <path d="M70 34 L58 34" />
    <path d="M70 34 L70 46" />
  </>),
  // 9 Capricorne
  (<>
    <path d="M30 40 L50 64 L70 40" />
    <path d="M70 40 Q78 48 68 54" />
  </>),
  // 10 Verseau
  (<>
    <path d="M32 40 Q42 52 32 64" />
    <path d="M52 40 Q62 52 52 64" />
    <path d="M72 40 Q82 52 72 64" />
  </>),
  // 11 Poissons
  (<>
    <path d="M34 36 Q24 50 34 64" />
    <path d="M66 36 Q76 50 66 64" />
    <path d="M34 64 Q50 56 66 64" />
  </>),
];

function ZodiacFrieze({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-2 flex justify-center gap-3 overflow-hidden ${
        position === 'top' ? 'top-2.5' : 'bottom-2.5'
      }`}
      style={{ opacity: 1 }}
      aria-hidden
    >
      {ZODIAC_GLYPHS.map((glyph, i) => (
        <svg
          key={i}
          width="24"
          height="24"
          viewBox="0 0 100 100"
          fill="none"
          stroke={DICE_THEME.ocreLight}
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {glyph}
        </svg>
      ))}
    </div>
  );
}

interface Tile {
  href: string;
  title: string;
  desc: string;
  icon: string;
  bg: string;
}

const TILES: Tile[] = [
  {
    href: '/des-divinatoires/affinage',
    title: "Tirage par Affinage",
    desc: 'Un zoom intuitif pour préciser une nuance ou savoir comment surmonter un détail après un premier tirage clair.',
    icon: '🔍',
    bg: `linear-gradient(150deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 100%)`,
  },
  {
    href: '/des-divinatoires/choix',
    title: 'Le tirage du choix',
    desc: "Une alternative pour aider à la décision : comparez l'énergie de deux options lorsque vous hésitez entre deux chemins.",
    icon: '⚖️',
    bg: `linear-gradient(150deg, ${DICE_THEME.nightMid} 0%, ${DICE_THEME.brickDark} 100%)`,
  },
  {
    href: '/des-divinatoires/obstacle-solution',
    title: 'Obstacle & Solution',
    desc: "Une méthode en deux lancers pour comprendre l'origine d'un blocage et obtenir un conseil précis pour le débloquer.",
    icon: '🗝️',
    bg: `linear-gradient(150deg, ${DICE_THEME.steel} 0%, ${DICE_THEME.brickDeep} 100%)`,
  },
];

export default function DesDivinatoiresHub() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title="Les Dés du zodiaque"
        subtitle="Trois dés à douze faces — la Planète (qui/quoi), le Signe (comment) et la Maison (où) — pour éclairer vos questions avec précision."
      />

      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 px-4 pb-4 sm:gap-5">
        {TILES.map((tile, i) => (
          <Link key={tile.href} href={tile.href} className="block">
            <motion.div
              className="group relative flex h-[180px] w-full flex-col items-center overflow-hidden rounded-2xl p-4 text-center"
              style={{
                background: tile.bg,
                border: `1.5px solid ${DICE_THEME.ocre}66`,
                boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.12, duration: 0.4 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* halo ocre au survol */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${DICE_THEME.ocre}44 0%, transparent 70%)`,
                }}
              />
              {/* bordure ocre interne qui s'illumine */}
              <div
                className="pointer-events-none absolute inset-2 rounded-xl border transition-colors duration-500"
                style={{ borderColor: `${DICE_THEME.ocre}33` }}
              />

              {/* frise de signes astrologiques discrète (après hydratation) */}
              {mounted && <ZodiacFrieze position="top" />}
              {mounted && <ZodiacFrieze position="bottom" />}

              <span className="relative mb-3 text-4xl transition-transform duration-500 group-hover:scale-110">
                {tile.icon}
              </span>
              <h2
                className="relative mb-2 text-lg font-bold"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: DICE_THEME.ocreLight,
                  textShadow: `0 0 12px ${DICE_THEME.gold}44`,
                }}
              >
                {tile.title}
              </h2>
              <p
                className="relative text-xs sm:text-sm leading-relaxed"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: DICE_THEME.glyph,
                  opacity: 0.88,
                }}
              >
                {tile.desc}
              </p>
            </motion.div>
          </Link>
        ))}
      </div>
      <Firefly page="des-divinatoires" />
    </DiceBackground>
  );
}
