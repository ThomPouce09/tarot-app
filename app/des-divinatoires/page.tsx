'use client';

// app/des-divinatoires/page.tsx — Niveau 1 : Tableau de bord des Dés du Zodiaque

import Link from 'next/link';
import { motion } from 'framer-motion';
import YiSlideNav from '@/components/yi-slide-nav';
import { DiceBackground, DiceTitle, DICE_THEME } from './_shared';

interface Tile {
  href: string;
  title: string;
  desc: string;
  icon: string;
}

const TILES: Tile[] = [
  {
    href: '/des-divinatoires/affinage',
    title: "Tirage par Affinage",
    desc: 'Un zoom intuitif pour préciser une nuance ou savoir comment surmonter un détail après un premier tirage clair.',
    icon: '🔍',
  },
  {
    href: '/des-divinatoires/choix',
    title: 'Le tirage du choix',
    desc: "Une alternative pour aider à la décision : comparez l'énergie de deux options lorsque vous hésitez entre deux chemins.",
    icon: '⚖️',
  },
  {
    href: '/des-divinatoires/obstacle-solution',
    title: 'Obstacle & Solution',
    desc: "Une méthode en deux lancers pour comprendre l'origine d'un blocage et obtenir un conseil précis pour le débloquer.",
    icon: '🗝️',
  },
];

export default function DesDivinatoiresHub() {
  return (
    <DiceBackground>
      <YiSlideNav />
      <DiceTitle
        title="Les Dés du zodiaque"
        subtitle="Trois dés à douze faces — la Planète (qui/quoi), le Signe (comment) et la Maison (où) — pour éclairer vos questions avec précision."
      />

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile, i) => (
          <Link key={tile.href} href={tile.href}>
            <motion.div
              className="group relative flex h-full flex-col items-center overflow-hidden rounded-2xl p-6 text-center"
              style={{
                background: `linear-gradient(150deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 100%)`,
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
    </DiceBackground>
  );
}
