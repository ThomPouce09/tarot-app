'use client';

// app/des-divinatoires/page.tsx — Niveau 1 : Tableau de bord des Dés du Zodiaque

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import YiSlideNav from '@/components/yi-slide-nav';
import Firefly from '@/components/firefly';
import { DiceBackground, DiceTitle, DICE_THEME } from './_shared';
import { TutorialModal, type TutorialSlide } from './tutorial-modal';
import { useLang } from '@/lib/i18n';
import { installSoundUnlock, playSound, stopSound } from '@/lib/sounds';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import GatedTile from '@/components/gated-tile';
import { useRequireVerified, VerifiedGate } from '@/components/verified-gate';

// Fonds d'écran aléatoires du hub /des-divinatoires (fournis par l'utilisateur).
const DES_BACKDROPS = [
  '/backgrounds/des-divinatoires1.jpg',
  '/backgrounds/des-divinatoires2.jpg',
  '/backgrounds/des-divinatoires3.jpg',
];

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
  descEn: string;
  icon: string;
  bg: string;
}

const TILES: Tile[] = [
  {
    href: '/des-divinatoires/affinage',
    title: "Tirage par Affinage",
    desc: 'Préciser une nuance ou ajuster votre posture sans refaire tout le tirage',
    descEn: 'Refine a nuance or adjust your stance without redoing the whole reading',
    icon: '🔍',
    bg: `linear-gradient(150deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 100%)`,
  },
  {
    href: '/des-divinatoires/choix',
    title: 'Le tirage du choix',
    desc: "Une aide à la décision : comparez l'énergie de deux options lorsque vous hésitez entre deux chemins.",
    descEn: "A decision aid: compare the energy of two options when you're torn between two paths.",
    icon: '⚖️',
    bg: `linear-gradient(150deg, ${DICE_THEME.nightMid} 0%, ${DICE_THEME.brickDark} 100%)`,
  },
  {
    href: '/des-divinatoires/obstacle-solution',
    title: 'Obstacle & Solution',
    desc: "Une méthode en deux lancers pour comprendre l'origine d'un blocage et obtenir un conseil précis pour le débloquer.",
    descEn: 'A two-throw method to understand the source of a block and get precise advice to overcome it.',
    icon: '🗝️',
    bg: `linear-gradient(150deg, ${DICE_THEME.steel} 0%, ${DICE_THEME.brickDeep} 100%)`,
  },
];

// ── Tutoriel par tirage ─────────────────────────────────────────────────────
// Chaque slide correspond à une tuile (même ordre que TILES). Le srcoll du
// tuto est indexé par tuile : cliquer sur le ⓘ d'une tuile ouvre SON slide.
const TUTORIALS: TutorialSlide[] = [
  {
    icon: '🔍',
    title: 'Tirage par Affinage',
    titleEn: 'Refinement Reading',
    desc: 'Préciser une nuance ou ajuster votre posture sans refaire tout le tirage.',
    descEn: 'Refine a nuance or adjust your stance without redoing the whole reading.',
    steps: [
      'Posez votre question de départ',
      'Lancez les trois dés (Planète, Signe, Maison)',
      'Affinez : relancez un dé pour préciser la réponse',
    ],
    stepsEn: [
      'Ask your initial question',
      'Roll the three dice (Planet, Sign, House)',
      'Refine: reroll one die to sharpen the answer',
    ],
  },
  {
    icon: '⚖️',
    title: 'Le tirage du choix',
    titleEn: 'The Choice Reading',
    desc: "Une aide à la décision : comparez l'énergie de deux options lorsque vous hésitez entre deux chemins.",
    descEn: "A decision aid: compare the energy of two options when you're torn between two paths.",
    steps: [
      'Formulez vos deux options clairement',
      'Lancez une première fois pour l’option A',
      'Relancez pour l’option B, puis comparez les énergies',
    ],
    stepsEn: [
      'State your two options clearly',
      'Roll once for option A',
      'Roll again for option B, then compare the energies',
    ],
  },
  {
    icon: '🗝️',
    title: 'Obstacle & Solution',
    titleEn: 'Obstacle & Solution',
    desc: "Une méthode en deux lancers pour comprendre l'origine d'un blocage et obtenir un conseil précis pour le débloquer.",
    descEn: 'A two-throw method to understand the source of a block and get precise advice to overcome it.',
    steps: [
      'Lancez pour identifier l’obstacle',
      'Lancez à nouveau pour la solution',
      'Lisez la synthèse combinée des deux tirages',
    ],
    stepsEn: [
      'Roll to identify the obstacle',
      'Roll again for the solution',
      'Read the combined synthesis of both readings',
    ],
  },
] satisfies readonly TutorialSlide[];

export default function DesDivinatoiresHub() {
  const [mounted, setMounted] = useState(false);
  const [activeSlide, setActiveSlide] = useState<TutorialSlide | null>(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const lang = useLang();
  const { tiles, loadTiles, gateReason, closeGate, openGate } = useEntitlement();
  const auth = useRequireVerified();

  // Fond d'écran : l'une des 3 images fournies, choisie au hasard à chaque
  // visite (côté client → aucun mismatch d'hydratation).
  const [bg, setBg] = useState<string | null>(null);
  useEffect(() => {
    setBg(DES_BACKDROPS[Math.floor(Math.random() * DES_BACKDROPS.length)]);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Lueur d'appel au 1er passage (une seule fois).
    if (typeof window !== 'undefined') {
      setFirstVisit(!localStorage.getItem('dd_tuto_seen'));
    }
  }, []);

  // Charge la dispo de tous les tirages (grisage des tuiles épuisées).
  useEffect(() => { loadTiles(); }, [loadTiles]);

  const openTutorial = (i: number) => {
    setActiveSlide(TUTORIALS[i]);
    if (typeof window !== 'undefined') localStorage.setItem('dd_tuto_seen', '1');
    setFirstVisit(false);
  };

  // Jingle d'ouverture : joue une fois au montage de la page. La navigation
  // depuis un lien (menu ou hub) hérite de la user activation du clic →
  // playSound() est autorisé. installSoundUnlock() couvre le cas d'un accès
  // direct (URL tapée) : le son se pré-déverrouille au 1er geste.
  // Le jingle est coupé dès que l'utilisateur quitte la page (navigation,
  // fermeture d'onglet, passage en arrière-plan) via stopSound().
  useEffect(() => {
    installSoundUnlock();
    const t = window.setTimeout(() => playSound('des-divinatoires', 0.75), 150);
    const onVisibility = () => {
      if (document.hidden) stopSound('des-divinatoires');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
      stopSound('des-divinatoires');
    };
  }, []);
  if (auth !== 'ok') return <VerifiedGate state={auth} />;
  return (
    <DiceBackground bgImage={bg ?? undefined}>
      <YiSlideNav />
      <DiceTitle
        title="Les Dés du zodiaque"
        subtitle="Trois dés à douze faces — la Planète (qui/quoi), le Signe (comment) et la Maison (où) — pour éclairer vos questions avec précision."
      />

      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 px-4 pb-4 sm:gap-5">
        {TILES.map((tile, i) => {
          // Déduit le type de tirage depuis la route : /des-divinatoires/affinage → des-affinage.
          const desType = 'des-' + tile.href.split('/').pop();
          return (
          <GatedTile key={tile.href} href={tile.href} className="block" allowed={tiles?.[desType]?.allowed} reason={tiles?.[desType]?.reason} onBlocked={openGate}>
            <motion.div
              className="group relative flex min-h-[180px] h-full w-full flex-col items-center rounded-2xl p-4 text-center"
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

              {/* ⓘ tutoriel de la tuile — coin supérieur droit, discret.
                  Le clic n'active PAS la navigation du lien (stopPropagation).
                  Lueur dorée au 1er passage (localStorage dd_tuto_seen). */}
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
                  firstVisit ? 'animate-[ddGlow_2s_ease-in-out_3]' : ''
                }`}
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  left: 'auto',
                  background: `${DICE_THEME.ocre}1a`,
                  border: `1px solid ${DICE_THEME.ocre}55`,
                  color: DICE_THEME.ocreLight,
                  opacity: firstVisit ? 1 : 0.5,
                  boxShadow: firstVisit
                    ? `0 0 16px ${DICE_THEME.gold}66, 0 0 0 4px ${DICE_THEME.ocre}22`
                    : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={DICE_THEME.ocreLight} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
              </button>
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
                {lang === 'en' ? tile.descEn : tile.desc}
              </p>
            </motion.div>
          </GatedTile>
          );
        })}
      </div>

      <TutorialModal open={activeSlide !== null} onClose={() => setActiveSlide(null)} slide={activeSlide} />
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      <Firefly page="des-divinatoires" />
    </DiceBackground>
  );
}
