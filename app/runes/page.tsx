'use client';

// app/runes/page.tsx — Tableau de bord des Runes Scandinaves
// Tuiles visuelles type /tarot & /yi-jing (image/glyphe + titre + sous-titre),
// thème runes respecté (vert forêt / doré pâle / vert sauge), tout sur un écran
// mobile sans scroller.

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import YiSlideNav from '@/components/yi-slide-nav';
import Firefly from '@/components/firefly';
import { RuneBackground, RuneTitle } from './_shared';
import { RUNE_THEME } from './_shared';
import { TutorialModal, type TutorialSlide } from './tutorial-modal';
import { useLang } from '@/lib/i18n';
import { installSoundUnlock, playSound, stopSound } from '@/lib/sounds';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import GatedTile from '@/components/gated-tile';

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

// ── Tutoriel par tirage (réplique du pattern /des-divinatoires) ────────────
// Chaque slide correspond à une tuile (même ordre que TILES).
const TUTORIALS: TutorialSlide[] = [
  {
    glyph: 'ᚾ',
    title: 'Le Fil des Nornes',
    titleEn: 'The Thread of the Norns',
    desc: 'Passé, présent, avenir — et le conseil d’Odin.',
    descEn: 'Past, present, future — and Odin’s counsel.',
    steps: [
      'Formulez votre question',
      'Tirez trois runes : passé, présent, avenir',
      'Lisez la synthèse + le conseil d’Odin',
    ],
    stepsEn: [
      'Ask your question',
      'Draw three runes: past, present, future',
      'Read the synthesis + Odin’s counsel',
    ],
  },
  {
    glyph: 'ᛗ',
    title: 'Le Marteau de Mjölnir',
    titleEn: "Mjölnir's Hammer",
    desc: 'Briser un obstacle, trouver la force d’agir.',
    descEn: "Break through an obstacle, find the strength to act.",
    steps: [
      'Identifiez le blocage qui vous freine',
      'Tirez la rune du défi',
      'Tirez la rune de la force pour le surmonter',
    ],
    stepsEn: [
      'Identify what is blocking you',
      'Draw the rune of the challenge',
      'Draw the rune of strength to overcome it',
    ],
  },
  {
    glyph: 'ᛟ',
    title: "Les Racines d'Yggdrasil",
    titleEn: "The Roots of Yggdrasil",
    desc: 'Un bilan profond pour s’ancrer et grandir.',
    descEn: 'A deep review to ground yourself and grow.',
    steps: [
      'Faites le point sur votre situation',
      'Tirez la rune du bilan',
      'Accueillez le message d’ancrage et de croissance',
    ],
    stepsEn: [
      'Take stock of your situation',
      'Draw the rune of the review',
      'Welcome the message of grounding and growth',
    ],
  },
] satisfies readonly TutorialSlide[];

export default function RunesHub() {
  const [mounted, setMounted] = useState(false);
  const [activeSlide, setActiveSlide] = useState<TutorialSlide | null>(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const lang = useLang();
  const { tiles, loadTiles, gateReason, closeGate, openGate } = useEntitlement();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setFirstVisit(!localStorage.getItem('runes_tuto_seen'));
    }
  }, []);

  // Charge la dispo de tous les tirages (grisage des tuiles épuisées).
  useEffect(() => { loadTiles(); }, [loadTiles]);

  const openTutorial = (i: number) => {
    setActiveSlide(TUTORIALS[i]);
    if (typeof window !== 'undefined') localStorage.setItem('runes_tuto_seen', '1');
    setFirstVisit(false);
  };

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
        {TILES.map((tile, i) => {
          // Déduit le type de tirage depuis la route : /runes/nornes → runes-nornes.
          const runeType = 'runes-' + tile.href.split('/').pop();
          return (
          <GatedTile key={tile.href} href={tile.href} allowed={tiles?.[runeType]?.allowed} reason={tiles?.[runeType]?.reason} onBlocked={openGate} className="block">
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
              {/* ⓘ tutoriel de la tuile — le clic n'active PAS la navigation.
                  Lueur dorée au 1er passage (localStorage runes_tuto_seen). */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openTutorial(i);
                }}
                aria-label={
                  lang === 'en'
                    ? `How this reading works: ${tile.title}`
                    : `Comment fonctionne ce tirage : ${tile.title}`
                }
                className={`absolute z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
                  firstVisit ? 'animate-[runesGlow_2s_ease-in-out_3]' : ''
                }`}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  left: 'auto',
                  background: `${RUNE_THEME.goldPale}1a`,
                  border: `1px solid ${RUNE_THEME.goldPale}55`,
                  color: RUNE_THEME.goldPale,
                  opacity: firstVisit ? 1 : 0.5,
                  boxShadow: firstVisit
                    ? `0 0 16px ${RUNE_THEME.goldGlow}, 0 0 0 4px ${RUNE_THEME.goldPale}22`
                    : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={RUNE_THEME.goldPale} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
              </button>

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
          </GatedTile>
          );
        })}
      </div>
      <TutorialModal open={activeSlide !== null} onClose={() => setActiveSlide(null)} slide={activeSlide} />
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      <Firefly page="runes" />
    </RuneBackground>
  );
}
