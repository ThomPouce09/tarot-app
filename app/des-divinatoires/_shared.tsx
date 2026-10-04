'use client';

// app/des-divinatoires/_shared.tsx
// Primitives visuelles partagées de la section "Dés du Zodiaque".
// Palette provisoire : rouge brique + ocre (à remplacer par tes visuels définitifs).

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, MutableRefObject, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { TargetFaces, DieKind } from '@/components/astro-dice';
import { PLANETS, SIGNS } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';
import { PLANET_NAMES, SIGN_NAMES } from '@/components/astro-dice/names';
import { useT, useLang, tr, getRuntimeLang } from '@/lib/i18n';
import { planetName, signName, houseName } from '@/components/astro-dice/names';
import { api } from '@/lib/api-client';

// Nuit étoilée animée — chargée dynamiquement (canvas lourd, hors SSR).
const StarryNight = dynamic(() => import('@/components/starry-night'), {
  ssr: false,
  loading: () => null,
});

/* Palette centralisée — Bleu nuit & Or fin.
   Les clés historiques (brick/ocre/...) sont conservées pour ne pas casser les
   autres primitives ; leurs VALEURS passent au bleu nuit + or fin, déclinées
   en jeux autour des deux couleurs centrales (indigo, bleu acier, or pâle). */
export const DICE_THEME = {
  brick: '#0a1430',        // bleu nuit profond (fonds)   [était rouge brique]
  brickDark: '#050a1c',    // bleu nuit quasi-black (profondeurs)
  brickDeep: '#050a1c',    // bleu nuit profond (bas dégradé)
  ocre: '#C9A24B',         // or adouci (surfaces)        [était ocre]
  ocreLight: '#E8C66A',    // or pâle lumineux (titres)   [était ocre clair]
  ocreSoft: '#D4AF3733',   // or fin translucide (filets)
  glyph: '#DCE6F5',        // givré bleuté clair (texte)  [était crème]
  gold: '#D4AF37',         // or fin (bords, filets)
  ink: '#04060f',          // encre
  parchment: '#DCE6F5',    // givré bleuté (alias glyph)
  // déclinaisons complémentaires
  night: '#0a1430',
  nightMid: '#14245a',     // indigo moyen
  steel: '#2a3a6b',        // bleu acier
} as const;

/* Fond commun — bleu nuit profond + voile doré subtil.
   `scrollable` : en mode scrollable, le fond devient un conteneur de
   hauteur viewport avec défilement interne (utile quand le contenu dépasse
   l'écran, ex. gobelet + tutoriel). Les autres pages gardent min-h-screen. */
export function DiceBackground({
  children,
  scrollable = false,
  bgImage,
  starry = false,
  starryVariant = 'blue',
}: {
  children: ReactNode;
  scrollable?: boolean;
  bgImage?: string;
  /** Active la nuit étoilée animée par-dessus le dégradé (canvas rAF). */
  starry?: boolean;
  /** Variante du ciel étoilé : blue (défaut), gold, silver. */
  starryVariant?: 'blue' | 'gold' | 'silver';
}) {
  return (
    <div
      id={scrollable ? 'dice-scroll-container' : undefined}
      className={`relative w-full overflow-x-hidden ${
        scrollable ? 'h-[100dvh] overflow-y-auto' : 'min-h-screen'
      }`}
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDeep} 55%, #02040c 100%)`,
      }}
    >
      {/* nuit étoilée animée (remplace le fond statique quand activée) */}
      {starry && (
        <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
          <StarryNight variant={starryVariant} />
        </div>
      )}
      {/* fond d'écran personnalisé (optionnel) — affiché à 100 % (aucun voile sombre) */}
      {bgImage && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      {/* <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.12) 0%, transparent 60%)',
        }}
      /> */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* Titre de section stylé ocre/doré */
/* Question posée, FORCÉE sur une seule ligne : troncature « … » si trop
   longue, et tap pour l'afficher EN ENTIER dans une modale (même esprit que
   la pilule des faces). Utilisée dans les bandeaux et les cartes récap. */
export function OneLineQuestion({ text, style, className, quotes = true }: {
  text: string;
  style?: CSSProperties;
  className?: string;
  /** « … » autour du texte (défaut : oui). */
  quotes?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <p
        className={`w-full cursor-pointer truncate text-center leading-relaxed ${className ?? ''}`}
        style={style}
        onClick={() => setOpen(true)}
        title={text}
      >
        {quotes ? `« ${text} »` : text}
      </p>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[95] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={{ duration: 0.3 }} onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border p-6"
              style={{
                // Bleu nuit indigo de l'univers des dés (même fond que la
                // modale des faces) + liseré doré — plus assorti, plus soigné.
                background: 'linear-gradient(160deg, #14245a 0%, #0a1430 100%)',
                borderColor: `${DICE_THEME.gold}66`,
                boxShadow: '0 0 44px rgba(212,175,55,0.18), 0 22px 54px rgba(0,0,0,0.7)',
              }}>
              {/* Voile d'étoiles très discret au-dessus du texte */}
              <div aria-hidden style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 60%)',
              }} />
              <p className="relative mb-3 text-center text-[10px] uppercase tracking-[0.35em]" style={{ color: `${DICE_THEME.gold}aa`, fontFamily: 'var(--font-cinzel-deco), serif' }}>
                ☾ · ✦ · ☼
              </p>
              <p className="relative text-center text-[10px] uppercase tracking-[0.28em]" style={{ color: 'rgba(176,224,255,0.75)', fontFamily: 'var(--font-cinzel), serif' }}>
                {t('des.qModal.title')}
              </p>
              <p className="relative mt-3 text-center text-lg italic leading-relaxed" style={{ fontFamily: 'var(--font-cormorant), serif', color: DICE_THEME.ocreLight, textShadow: '0 0 14px rgba(232,198,106,0.25)' }}>
                « {text} »
              </p>
              {/* Filet doré de séparation */}
              <div aria-hidden className="relative mx-auto mt-4 h-px w-24" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.7), transparent)' }} />
              <p className="relative mt-3 text-center text-[11px]" style={{ color: 'rgba(220,230,245,0.45)' }}>{t('des.qModal.close')}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* Tutoriel du gobelet (référence : rendu validé sur /choix) — icône main
   animée + consigne, mesurés par useDiceCupHeight pour la hauteur d'arène.
   Utilisé À L'IDENTIQUE par /choix et /obstacle-solution. */
export function DiceTutorial({ show, boxRef, text }: { show: boolean; boxRef: MutableRefObject<HTMLDivElement | null>; text: string }) {
  return (
    <div
      ref={boxRef}
      className="flex flex-col items-center transition-opacity duration-300"
      style={{ marginTop: 6, opacity: show ? 1 : 0, pointerEvents: show ? 'auto' : 'none' }}
    >
      <style>{`
        @keyframes swipe-shake-dice {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-16px); }
          75% { transform: translateX(16px); }
        }
        .swipe-icon-dice {
          animation: swipe-shake-dice 0.6s ease-in-out infinite;
          font-size: 28px;
          line-height: 1;
          color: #B0E0FF;
          opacity: 0.95;
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
      <svg className="swipe-icon-dice" width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="#87CEEB" d="M9.5 1C8.67 1 8 1.67 8 2.5v7.38l-1.7-.85c-.3-.15-.65-.2-1-.15a1.5 1.5 0 0 0-1.3 1.3c-.15.65.05 1.3.5 1.75l4.35 4.35c.3.3.7.45 1.15.45H18c1.1 0 2-.9 2-2V9.5c0-.65-.45-1.2-1.05-1.4l-5.1-1.85c-.15-.05-.3-.05-.45-.05-.15 0-.3.05-.45.1l-.95.4V2.5C12 1.67 11.33 1 10.5 1h-1Z" opacity="0.6"/>
        <path fill="#87CEEB" d="m17.5 14.5-2.12-1.06c-.2-.1-.44-.14-.67-.11l-1.83.35.88-3.53a1.25 1.25 0 0 0-.88-1.5c-.65-.18-1.3.2-1.48.85l-1.4 5.6-2.1-1.05.3 1.5 3.5 1.75c.3.15.65.2 1 .15H16c.65 0 1.2-.45 1.4-1.05l.35-1.05c.08-.25.05-.52-.08-.75l-.17-.15Z" opacity="0.4"/>
      </svg>
      <p
        className="text-xs text-center mt-1"
        style={{ color: '#B0E0FF', opacity: 0.95, fontFamily: 'var(--font-cinzel), serif', maxWidth: 160, lineHeight: 1.3, fontSize: '0.65rem' }}
      >
        {text}
      </p>
    </div>
  );
}

/* Scroll « gobelet centré, tuteur garanti visible » : centre l'arène dans la
   vue, puis vérifie MESURE par mesure que le bas du tutoriel ne dépasse pas
   l'écran ; si oui (bandeau variables, barre URL mobile qui rétrécit le
   viewport après le calcul…), on remonte la page de l'écart exact. Relancé à
   2 reprises (fin du scroll smooth + stabilisation du viewport). */
export function scrollToCupFit(cupEl: HTMLElement | null, tutoEl?: HTMLElement | null) {
  if (!cupEl) return;
  cupEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const fix = () => {
    const vh = Math.max(window.innerHeight, 1);
    const MARGIN = 12; // marge basse de confort (barre URL, pouce…)
    const t = tutoEl ?? undefined;
    if (t) {
      const b = t.getBoundingClientRect().bottom;
      if (b > vh - MARGIN) window.scrollBy({ top: b - vh + MARGIN, behavior: 'smooth' });
    } else {
      const c = cupEl.getBoundingClientRect();
      if (c.bottom > vh - MARGIN) window.scrollBy({ top: c.bottom - vh + MARGIN, behavior: 'smooth' });
    }
  };
  window.setTimeout(fix, 350);
  window.setTimeout(fix, 750);
}

/* Hauteur du gobelet (arène WebGL) OPTIMISÉE et MESURÉE :
   contrainte 1 (fit)    : topH (bandeau titre+fil+question, mesuré via
                           offsetTop du bloc arène) + arène + tuto + marge ≤ vh
                           → même sans scroll possible le tuto est visible.
   contrainte 2 (centre) : arène ≤ 56 % vh (le scroll centre l'arène, il faut
                           de la place du tuto au-dessus ET en dessous).
   bornée [300, 560]. Recalculée au resize, à l'orientation, et dès que le
   bloc tutoriel ou le bloc arène changent de taille (ResizeObserver). */
export function useDiceCupHeight(tutorialBoxRef?: MutableRefObject<HTMLElement | null>, activeKey?: unknown, cupBoxRef?: MutableRefObject<HTMLElement | null>): number {
  const [cupH, setCupH] = useState(460);
  useEffect(() => {
    const measure = () => {
      const vh = Math.max(window.innerHeight, window.visualViewport?.height || 0) || 700;
      const tutH = tutorialBoxRef?.current?.offsetHeight ?? 110;
      // Bandeau réel au-dessus de l'arène (titre + fil d'étapes + question) =
      // position du bloc arène DANS LE DOCUMENT (mesure live, pas d'estimation).
      let topH = 0;
      if (cupBoxRef?.current) {
        const rect = cupBoxRef.current.getBoundingClientRect();
        topH = Math.max(0, Math.round(rect.top + window.scrollY));
      }
      const fit = topH > 0 ? vh - topH - tutH - 16 : vh - 24 - 2 * tutH;
      const next = Math.max(300, Math.min(560, Math.min(Math.round(vh * 0.56), fit)));
      setCupH((prev) => (prev === next ? prev : next));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      if (tutorialBoxRef?.current) ro.observe(tutorialBoxRef.current);
      if (cupBoxRef?.current) ro.observe(cupBoxRef.current);
    }
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      ro?.disconnect();
    };
    // re-mesure (et re-observe) quand le bloc tutoriel est monté/démonté
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);
  return cupH;
}

export function DiceTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="px-4 pt-12 pb-4 text-center">
      <h1
        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: DICE_THEME.ocreLight,
          textShadow: `0 0 30px ${DICE_THEME.gold}66, 0 2px 6px rgba(0,0,0,0.6)`,
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="mx-auto mt-3 max-w-xl text-[13px] italic sm:text-sm"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            fontWeight: 700,
            // Bleu foncé, entouré de jaune PÂLE (contour via ombres
            // directionnelles, sans fond).
            color: '#1E3A8A',
            textShadow:
              '0.6px 0 0 rgba(255,244,190,0.95), -0.6px 0 0 rgba(255,244,190,0.95), 0 0.6px 0 rgba(255,244,190,0.95), 0 -0.6px 0 rgba(255,244,190,0.95), 0 0 7px rgba(255,240,175,0.6)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* Bouton principal (rouge brique, bord doré) */
export function DiceButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ocre' | 'blue' | 'blueLight' | 'gold' | 'smallGold';
}) {
  const bg =
    variant === 'blueLight'
      ? 'linear-gradient(135deg, #0a3050 0%, #2070a0 50%, #50b8e8 100%)'
      : variant === 'blue'
      ? 'linear-gradient(135deg, #020d18 0%, #062040 50%, #0a3a60 100%)'
      : variant === 'ocre'
      ? (disabled ? DICE_THEME.brickDark : DICE_THEME.ocre)
      : variant === 'gold' || variant === 'smallGold'
      ? 'linear-gradient(135deg, #8a6d3b 0%, #c9a75b 50%, #e8d48b 100%)'
      : disabled
        ? DICE_THEME.brickDark
        : DICE_THEME.brick;
  const isGold = variant === 'gold' || variant === 'smallGold';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`rounded-xl px-6 py-3 text-sm sm:text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${variant === 'smallGold' ? '!px-3 !py-1.5 !text-xs' : ''}`}
      style={{
        fontFamily: 'var(--font-cinzel), serif',
        background: bg,
        color: isGold ? '#1a0e0a' : DICE_THEME.glyph,
        border: variant === 'blue' || variant === 'blueLight' ? '1.5px solid #5db8e8' : isGold ? '1.5px solid #e8d48b' : `1.5px solid ${DICE_THEME.gold}`,
        boxShadow: disabled
          ? 'none'
          : variant === 'blue' || variant === 'blueLight'
            ? '0 0 24px rgba(93,184,232,0.5), 0 4px 12px rgba(0,0,0,0.4)'
            : isGold
              ? '0 0 24px rgba(201,167,91,0.5), 0 4px 12px rgba(0,0,0,0.4)'
              : `0 0 18px ${DICE_THEME.gold}44, 0 4px 12px rgba(0,0,0,0.4)`,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </motion.button>
  );
}

/* Encart ocre doux (synthèses, indicateurs) */
export function OcreCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${DICE_THEME.ocre}22 0%, ${DICE_THEME.ocre}11 100%)`,
        border: `1.5px solid ${DICE_THEME.ocre}66`,
        boxShadow: `inset 0 0 30px ${DICE_THEME.ocre}18`,
      }}
    >
      {title && (
        <h3
          className="mb-3 text-center text-lg font-bold"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: DICE_THEME.ocreLight,
            textShadow: `0 0 12px ${DICE_THEME.gold}44`,
          }}
        >
          {title}
        </h3>
      )}
      <div
        className="text-sm sm:text-base leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
      >
        {children}
      </div>
    </div>
  );
}

/* Noms lisibles des glyphes — tables uniques dans names.ts, réexportées ici
   pour tous les imports existants (`_shared`). */
export { PLANET_NAMES, SIGN_NAMES } from '@/components/astro-dice/names';

/* Ligne de résultat lisible : "☉ Soleil · ♌ Lion · Maison 5" */
export function ResultLine({ faces }: { faces: TargetFaces }) {
  return (
    <div
      className="text-center text-base sm:text-lg font-semibold"
      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
    >
      <span title={tr("Planète", "Planet", "Planeta", "ग्रह")}>{faces.planet} {planetName(String(faces.planet), getRuntimeLang())}</span>
      <span style={{ color: DICE_THEME.glyph, opacity: 0.6 }}> · </span>
      <span title={tr("Signe", "Sign", "Signo", "राशि")}>{faces.sign} {signName(String(faces.sign), getRuntimeLang())}</span>
      <span style={{ color: DICE_THEME.glyph, opacity: 0.6 }}> · </span>
      <span title={tr("Maison", "House", "Casa", "भाव")}>{houseName(faces.house, getRuntimeLang())}</span>
    </div>
  );
}

/* Légende de lecture (Planète / Signe / Maison) */
export function ReadingLegend({
  items,
}: {
  items: { die: 'Planète' | 'Signe' | 'Maison'; text: string }[];
}) {
  return (
    <ul className="mx-auto max-w-xl space-y-2">
      {items.map((it) => (
        <li
          key={it.die}
          className="flex gap-2 text-sm sm:text-base leading-snug"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
        >
          <span
            className="font-bold shrink-0"
            style={{ color: DICE_THEME.ocreLight }}
          >
            {it.die} :
          </span>
          <span style={{ opacity: 0.9 }}>{it.text}</span>
        </li>
      ))}
    </ul>
  );
}

/* Lien retour vers le tableau de bord */
export function BackToHub() {
  return (
    <div className="py-8 text-center">
      <Link
        href="/des-divinatoires"
        className="text-sm underline-offset-4 hover:underline"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
      >
        ← Retour aux Dés du zodiaque
      </Link>
    </div>
  );
}

/* Encart Analyse du tirage : statique immédiate (glyphes + meanings) +
   bouton IA qui interroge /api/astro-dice-interpretation et rend les
   sections (Planète / Signe / Maison) + synthèse en belles cartes.
   Partagé par toutes les pages Dés du Zodiaque pour un rendu harmonieux. */
export function DiceAnalysis({
  faces,
  activeKinds,
  mode = 'global',
  kind,
  question,
  dbInterpretation,
}: {
  faces: TargetFaces;
  activeKinds: DieKind[];
  mode?: 'global' | 'zoom-action' | 'zoom-domaine' | 'obstacle-solution';
  kind?: 'obstacle' | 'solution';
  question?: string | null;
  dbInterpretation?: string | null;
}) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [sections, setSections] = useState<
    { key: string; label: string; text: string }[] | null
  >(null);
  const [synthese, setSynthese] = useState<string>('');
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasErrored, setHasErrored] = useState(false);
  const lang = useLang();

  const run = useCallback(async () => {
    setLoading(true);
    setHasErrored(false);
    setAnalysis(null);
    setSections(null);
    setSynthese('');
    setActions([]);
    try {
      const res = await api('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faces, activeKinds, mode, kind, question: question || undefined, dbInterpretation: dbInterpretation || undefined, lang }),
      });
      const data = await res.json();
      if (data.sections && Array.isArray(data.sections)) {
        setSections(data.sections);
        setSynthese(data.synthese || '');
        setActions(Array.isArray(data.actions) ? data.actions : []);
      } else {
        setAnalysis(data.texte || 'Analyse indisponible.');
      }
    } catch {
      setHasErrored(true);
      setAnalysis('Les étoiles se sont voilées… Réessaie l’analyse.');
    } finally {
      setLoading(false);
    }
  }, [faces, activeKinds, mode, kind]);

  return (
    <div
      className="mx-auto mt-5 max-w-2xl rounded-3xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${DICE_THEME.ocre}14 0%, ${DICE_THEME.brick} 100%)`,
        border: `1.5px solid ${DICE_THEME.ocre}55`,
        boxShadow: `inset 0 0 30px ${DICE_THEME.ocre}14`,
      }}
    >
      <h3
        className="mb-4 text-center text-lg font-bold"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: DICE_THEME.ocreLight,
          textShadow: `0 0 12px ${DICE_THEME.gold}44`,
        }}
      >
        {tr("Analyse du tirage", "Reading analysis", "Análisis de la tirada", "वाचन का विश्लेषण")}
      </h3>

      {/* Partie statique — instantanée (fait patienter) */}
      <div className="space-y-3">
        {activeKinds.map((k) => {
          const val = faces[k] as string | number;
          return (
            <div
              key={k}
              className="flex gap-3 text-sm leading-relaxed"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
            >
              <span
                className="mt-0.5 text-2xl leading-none"
                style={{ color: DICE_THEME.ocreLight }}
              >
                {val}
              </span>
              <span style={{ opacity: 0.92 }}>{meaningFor(k, val)}</span>
            </div>
          );
        })}
      </div>

      {/* Zone LLM — chargement puis texte généré */}
      <div className="mt-5 border-t pt-4" style={{ borderColor: `${DICE_THEME.gold}33` }}>
        {loading && (
          <div
            className="text-center text-sm italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph, opacity: 0.8 }}
          >
            {tr("Les astres réfléchissent… ✨", "The stars reflect… ✨", "Los astros reflexionan… ✨", "ग्रह चिंतन कर रहे हैं… ✨")}
          </div>
        )}

        {/* Analyse structurée en belles cartes */}
        {sections && !loading && (
          <div className="space-y-3">
            {sections.map((s) => (
              <div
                key={s.key}
                className="rounded-2xl p-4"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.ocre}1f 0%, ${DICE_THEME.ocre}0a 100%)`,
                  border: `1px solid ${DICE_THEME.ocre}44`,
                }}
              >
                <p
                  className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
                >
                  {s.label}
                </p>
                <p
                  className="text-center text-sm leading-relaxed italic"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                >
                  {s.text}
                </p>
              </div>
            ))}

            {synthese && (
              <div
                className="mt-4 rounded-2xl p-4"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.gold}22 0%, ${DICE_THEME.ocre}14 100%)`,
                  border: `1px solid ${DICE_THEME.gold}55`,
                  boxShadow: `inset 0 0 24px ${DICE_THEME.gold}14`,
                }}
              >
                <p
                  className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                >
                  {tr("Synthèse", "Synthesis", "Síntesis", "सारांश")}
                </p>
                <p
                  className="text-center text-sm leading-relaxed italic"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                >
                  {synthese}
                </p>
              </div>
            )}

            {actions.length > 0 && (
              <div
                className="mt-4 rounded-2xl p-4"
                style={{
                  background: `linear-gradient(135deg, ${DICE_THEME.gold}26 0%, ${DICE_THEME.ocre}1c 100%)`,
                  border: `1.5px solid ${DICE_THEME.gold}66`,
                  boxShadow: `inset 0 0 28px ${DICE_THEME.gold}1f`,
                }}
              >
                <p
                  className="mb-3 text-center text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.gold }}
                >
                  Passer à l&apos;action
                </p>
                <ul className="mx-auto max-w-xl space-y-2">
                  {actions.map((a, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-relaxed"
                      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
                    >
                      <span style={{ color: DICE_THEME.ocreLight }}>✦</span>
                      <span style={{ opacity: 0.94 }}>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Fallback texte libre */}
        {analysis && !loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm leading-relaxed italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}
          >
            {analysis}
          </motion.p>
        )}

        {/* Bouton de relance si erreur */}
        {hasErrored && !loading && (
          <div className="mt-4 text-center">
            <DiceButton variant="ocre" onClick={run}>
              🔄 Relancer l&apos;analyse
            </DiceButton>
          </div>
        )}

        {!analysis && !sections && !loading && (
          <div className="text-center">
            <DiceButton variant="ocre" onClick={run}>
              ✨ Analyser en profondeur
            </DiceButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* ré-exports utiles */
export { PLANETS, SIGNS };
