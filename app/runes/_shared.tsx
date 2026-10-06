'use client';

// app/runes/_shared.tsx
// Primitives visuelles partagées de la section "Runes Scandinaves".
// Palette : vert forêt / sapin profond (fonds), doré pâle / sable (bords, titres),
// vert sauge clair (textes secondaires / illustrations).
// Background provisoire : dégradé vert profond + voile doré subtil (à remplacer
// par tes visuels définitifs).

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Rune } from '@/components/rune-stones/runes';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import { playSound } from '@/lib/sounds';
import { useLang, tr } from '@/lib/i18n';
import { localizePosition } from '@/lib/i18n/positions';
import { api } from '@/lib/api-client';
import EchoBox from '@/components/echo-box';
// Blocs extraits au decoupage (re-exports : API de _shared preservee,
// aucun des ~20 sites d'import existants n'a besoin de changer).
import { RUNE_THEME } from './rune-theme';
import { RuneButton } from './rune-button';
import { RuneAnalysis } from './rune-analysis';
export { RUNE_THEME, RuneButton, RuneAnalysis };


/* Pochon vert à liserés dorés — décoratif, placé au-dessus du composant de
   tirage (le RuneStonesSet ne le contient plus). */
export function RunePouch() {
  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{
        width: 130,
        height: 78,
        background:
          'linear-gradient(180deg, #1f5234 0%, #14361f 70%, #0e2919 100%)',
        borderRadius: '50% 50% 46% 46% / 60% 60% 40% 40%',
        border: '2px solid #d8c79a',
        boxShadow:
          '0 0 22px rgba(216,199,154,0.25), inset 0 -8px 18px rgba(0,0,0,0.45)',
      }}
    >
      {/* liseré doré supérieur */}
      <div
        className="absolute"
        style={{
          top: 6,
          left: 14,
          right: 14,
          height: 3,
          background:
            'linear-gradient(90deg, transparent, #e9d9ac, transparent)',
          borderRadius: 2,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: '#e9d9ac',
          fontSize: 13,
          letterSpacing: '0.15em',
          opacity: 0.85,
        }}
      >
        RUNES
      </span>
    </div>
  );
}

/* Fond provisoire commun (dégradé vert profond + voile doré) */
export function RuneBackground({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.forestDeep} 55%, #06120b 100%)`,
      }}
    >
      {/* voile doré pâle subtil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(233,217,172,0.10) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* Titre de section stylé doré pâle / vert sauge */
export function RuneTitle({
  title,
  subtitle,
  compact,
  blinkSubtitle,
  fit = false,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  /** Si vrai, le sous-titre clignote doucement 3 fois puis disparaît. */
  blinkSubtitle?: boolean;
  /** Titre auto-tenu sur UNE ligne (clamp responsif) — /runes/yggdrasil. */
  fit?: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Ajustement à la LARGEUR RÉELLE (skill fit-text-to-container) : sur une
  // ligne nowrap la largeur est proportionnelle au font-size → on diminue
  // jusqu'à tenir. Le clamp vw ne marchait pas : Cinzel Decorative est plus
  // large que l'estimation. Re-mesure après le swap de la police web, et
  // uniquement quand la largeur du viewport change (barre d'URL mobile).
  useEffect(() => {
    if (!fit) return;
    const el = titleRef.current;
    if (!el) return;
    const measure = () => {
      const avail = (el.parentElement?.clientWidth ?? window.innerWidth) - 32;
      if (avail <= 0) return;
      let fs = 30;
      el.style.fontSize = fs + 'px';
      const w = el.scrollWidth;
      if (w > 0) fs = Math.min(44, Math.floor((fs * avail) / w * 10) / 10);
      el.style.fontSize = fs + 'px';
      // filet « shrink-only » terminal (jamais agrandir → zéro oscillation)
      while (el.scrollWidth > avail && fs > 12) { fs -= 1; el.style.fontSize = fs + 'px'; }
    };
    let lastW = 0;
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; measure(); } };
    lastW = window.innerWidth;
    measure();
    (document as any).fonts?.load?.('700 30px "Cinzel Decorative"').then(() => window.setTimeout(measure, 60)).catch(() => window.setTimeout(measure, 400));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fit, title]);

  return (
    <div className={`px-4 text-center ${compact ? 'pt-14 pb-1' : 'pt-16 pb-6'}`}>
      <h1
        ref={titleRef}
        className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-wide"
        style={fit ? {
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: RUNE_THEME.goldPale,
          textShadow: `0 0 30px ${RUNE_THEME.goldGlow}, 0 2px 6px rgba(0,0,0,0.6)`,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        } : {
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: RUNE_THEME.goldPale,
          textShadow: `0 0 30px ${RUNE_THEME.goldGlow}, 0 2px 6px rgba(0,0,0,0.6)`,
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </h1>
      {subtitle &&
        (blinkSubtitle ? (
          <BlinkingSubtitle text={subtitle} />
        ) : (
          <p
            className="mx-auto mt-3 max-w-xl text-sm sm:text-base italic"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              color: RUNE_THEME.sage,
              opacity: 0.9,
            }}
          >
            {subtitle}
          </p>
        ))}
    </div>
  );
}

/* Sous-titre qui pulse doucement 3 fois puis se replie (hauteur → 0),
   ce qui fait remonter le contenu en dessous sans espace vide. */
function BlinkingSubtitle({ text }: { text: string }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.p
      animate={
        gone
          ? { opacity: 0, height: 0, marginTop: 0 }
          : { opacity: [0.9, 0.12, 0.9, 0.12, 0.9, 0.12, 0.9] }
      }
      transition={
        gone
          ? { duration: 0.6, ease: 'easeInOut' }
          : { duration: 5.4, times: [0, 0.14, 0.28, 0.47, 0.66, 0.85, 1], ease: 'easeInOut' }
      }
      style={{
        overflow: 'hidden',
        fontFamily: 'var(--font-cinzel), serif',
        color: RUNE_THEME.sage,
        fontStyle: 'italic',
      }}
      className="mx-auto mt-3 max-w-xl text-sm sm:text-base"
    >
      {text}
    </motion.p>
  );
}


/* Encart vert doux (synthèses, indicateurs) */
export function SageCard({
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
        background: `linear-gradient(135deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forest}22 100%)`,
        border: `1.5px solid ${RUNE_THEME.goldPale}55`,
        boxShadow: `inset 0 0 30px ${RUNE_THEME.forestMid}22`,
      }}
    >
      {title && (
        <h3
          className="mb-3 text-center text-lg font-bold"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: RUNE_THEME.goldPale,
            textShadow: `0 0 12px ${RUNE_THEME.goldGlow}`,
          }}
        >
          {title}
        </h3>
      )}
      <div
        className="text-sm sm:text-base leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sagePale }}
      >
        {children}
      </div>
    </div>
  );
}

/* Carte / tuile de niveau 1 */
export function RuneTile({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <motion.div
        whileHover={{ y: -4 }}
        className="h-full rounded-2xl p-6 text-center"
        style={{
          background: `linear-gradient(150deg, ${RUNE_THEME.forestMid}55 0%, ${RUNE_THEME.forestDeep}cc 100%)`,
          border: `1.5px solid ${RUNE_THEME.goldPale}44`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <div
          className="mb-3 text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: RUNE_THEME.goldPale,
            textShadow: `0 0 14px ${RUNE_THEME.goldGlow}`,
          }}
        >
          {title}
        </div>
        <p
          className="text-sm sm:text-base leading-relaxed"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: RUNE_THEME.sage,
          }}
        >
          {description}
        </p>
        <div
          className="mt-4 inline-block text-xs uppercase tracking-widest"
          style={{ color: RUNE_THEME.goldSoft, opacity: 0.8 }}
        >
          {tr("Découvrir →", "Discover →", "Descubrir →", "जानें →")}
        </div>
      </motion.div>
    </Link>
  );
}

/* Lien retour vers le tableau de bord runes */
export function BackToRunes() {
  return (
    <div className="py-8 text-center">
      <Link
        href="/runes"
        className="text-sm underline-offset-4 hover:underline"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}
      >
        ← Retour aux Runes Scandinaves
      </Link>
    </div>
  );
}

/* Glyphe ⓘ (info) SVG inline — règle projet : pas d'emoji/Material. */
function InfoGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10.8v5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="7.4" r="1.25" fill="currentColor" />
    </svg>
  );
}

/* Légende de lecture d'une rune tirée (nom + sens + signification).
   compactInfo : tuile compacte (symbole + nom + position) avec une bulle ⓘ
   qui déplie l'explication à la demande — au lieu du long texte affiché. */
export function RuneReading({
  rune,
  position,
  meaning,
  reversed,
  compactInfo = false,
  light = false,
}: {
  rune: Rune | null;
  position: string;
  meaning?: string;
  reversed?: boolean;
  compactInfo?: boolean;
  /** Variante claire : plaque crème + texte anthracite (ex. Conseil d'Odin). */
  light?: boolean;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  if (!rune) return null;

  const infoText = meaning ?? (reversed ? rune.reversed : rune.upright);

  // Variante compacte : la tuile reste fine, l'explication est derrière la bulle ⓘ.
  if (compactInfo) {
    return (
      <div
        className="relative mx-auto w-full max-w-xl rounded-xl px-3 py-2.5"
        style={
          light
            ? {
                background: 'rgba(253,249,238,0.66)',
                border: '1.5px solid rgba(150,115,55,0.55)',
              }
            : {
                background: `linear-gradient(150deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forestDeep}aa 100%)`,
                border: `1.5px solid ${RUNE_THEME.goldPale}44`,
              }
        }
      >
        {/* Bulle ⓘ (haut-droite) : déplie l'explication de la position */}
        <button
          type="button"
          onClick={() => setInfoOpen((o) => !o)}
          aria-expanded={infoOpen}
          aria-label={infoOpen
            ? tr('Masquer l’explication', 'Hide the explanation', 'Ocultar la explicación', 'व्याख्या छिपाएँ')
            : tr('En savoir plus sur cette position', 'Learn more about this position', 'Más información sobre esta posición', 'इस स्थिति के बारे में और जानें')}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{
            color: light ? '#8a6a2b' : RUNE_THEME.goldPale,
            background: infoOpen ? (light ? 'rgba(150,115,55,0.22)' : `${RUNE_THEME.goldPale}26`) : 'transparent',
            border: light
              ? `1px solid rgba(150,115,55,${infoOpen ? '0.55' : '0'})`
              : `1px solid ${RUNE_THEME.goldPale}${infoOpen ? '88' : '00'}`,
          }}
        >
          <InfoGlyph size={16} />
        </button>

        <div className="flex items-center gap-3 pr-9">
          <span
            style={{
              fontFamily: 'var(--font-cinzel-deco), serif',
              fontSize: 26,
              lineHeight: 1,
              color: light ? '#2E2A26' : RUNE_THEME.goldPale,
              display: 'inline-block',
              transform: reversed ? 'rotate(180deg)' : 'none',
            }}
          >
            {rune.symbol}
          </span>
          <div className="min-w-0 text-left">
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: light ? '#8a6a2b' : RUNE_THEME.goldSoft }}
            >
              {position}
            </p>
            <p className="text-sm font-bold leading-snug" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: light ? '#2E2A26' : RUNE_THEME.sagePale }}>
              {rune.name}
              {reversed ? ' (à l’envers)' : ''}
            </p>
          </div>
        </div>

        {/* Explication dépliée par la bulle ⓘ */}
        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.div
              key="info"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <p
                className="mt-2 border-t pt-2 text-xs leading-relaxed"
                style={{
                  borderColor: light ? 'rgba(150,115,55,0.25)' : `${RUNE_THEME.goldPale}22`,
                  fontFamily: 'var(--font-cinzel), serif',
                  color: light ? '#3f3a33' : RUNE_THEME.sage,
                }}
              >
                {infoText}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Layout classique (autres pages runes) : carte avec le texte affiché.
  return (
    <div
      className="mx-auto max-w-xl rounded-2xl p-4"
      style={
        light
          ? {
              background: 'rgba(253,249,238,0.72)',
              border: '1.5px solid rgba(150,115,55,0.55)',
            }
          : {
              background: `linear-gradient(150deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forestDeep}aa 100%)`,
              border: `1.5px solid ${RUNE_THEME.goldPale}44`,
            }
      }
    >
      <div className="mb-1 text-center">
        <span
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            fontSize: 38,
            color: light ? '#2E2A26' : RUNE_THEME.goldPale,
            display: 'inline-block',
            transform: reversed ? 'rotate(180deg)' : 'none',
          }}
        >
          {rune.symbol}
        </span>
      </div>
      <p
        className="text-center text-sm uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: light ? '#8a6a2b' : RUNE_THEME.goldSoft }}
      >
        {position}
      </p>
      <p
        className="text-center text-base font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: light ? '#2E2A26' : RUNE_THEME.sagePale }}
      >
        {rune.name}
        {reversed ? ' (à l’envers)' : ''}
      </p>
      <p
        className="mt-2 text-center text-sm leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: light ? '#3f3a33' : RUNE_THEME.sage }}
      >
        {infoText}
      </p>
    </div>
  );
}

/* Apparition progressive d'un bloc (lecture de runes) sans scintillement :
   fondu opacity seul (pas de transform `y` qui re-composite sur mobile),
   couche GPU stabilisée pour éviter le shimmer au fade. */
export function RuneReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

