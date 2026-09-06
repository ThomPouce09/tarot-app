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
import { useLang } from '@/lib/i18n';
import { api } from '@/lib/api-client';
import EchoBox from '@/components/echo-box';

// Étincelles dorées de la révélation du Conseil d'Odin (positions/délais
// déterministes — pas de random pendant le rendu).
const SPARKS: {
  x: string;
  y: string;
  rise: number;
  size: number;
  delay: number;
  dur: number;
  spin: number;
  color: string;
  char: string;
}[] = [
  { x: '8%', y: '38%', rise: 90, size: 13, delay: 0.1, dur: 0.3, spin: 40, color: '#FFE9A8', char: '✦' },
  { x: '16%', y: '58%', rise: 70, size: 9, delay: 0.45, dur: 0.2, spin: -30, color: '#FFF3CF', char: '✧' },
  { x: '24%', y: '30%', rise: 110, size: 12, delay: 0.25, dur: 0.4, spin: 60, color: '#FFD97A', char: '✦' },
  { x: '37%', y: '64%', rise: 80, size: 10, delay: 0.65, dur: 0.15, spin: -50, color: '#FFF0C2', char: '✧' },
  { x: '48%', y: '22%', rise: 120, size: 14, delay: 0.15, dur: 0.5, spin: 25, color: '#FFE9A8', char: '✦' },
  { x: '58%', y: '60%', rise: 75, size: 9, delay: 0.5, dur: 0.2, spin: -40, color: '#FFF9E0', char: '✧' },
  { x: '66%', y: '34%', rise: 100, size: 12, delay: 0.35, dur: 0.35, spin: 45, color: '#FFD97A', char: '✦' },
  { x: '76%', y: '55%', rise: 85, size: 10, delay: 0.7, dur: 0.2, spin: -60, color: '#FFEFC0', char: '✧' },
  { x: '86%', y: '40%', rise: 95, size: 13, delay: 0.2, dur: 0.45, spin: 35, color: '#FFE9A8', char: '✦' },
  { x: '93%', y: '62%', rise: 70, size: 9, delay: 0.55, dur: 0.25, spin: -25, color: '#FFF3CF', char: '✧' },
  { x: '30%', y: '80%', rise: 65, size: 11, delay: 0.8, dur: 0.3, spin: 30, color: '#FFE0A0', char: '✦' },
  { x: '70%', y: '84%', rise: 60, size: 10, delay: 0.9, dur: 0.25, spin: -35, color: '#FFF9E0', char: '✧' },
];

/* Palette centralisée */
export const RUNE_THEME = {
  forestDeep: '#0c2417', // vert forêt très profond (fond principal)
  forest: '#14361f', // vert sapin
  forestMid: '#1f5234', // vert sapin moyen
  sage: '#9fc4ad', // vert sauge clair (texte secondaire)
  sagePale: '#cfe3d6', // vert sauge très clair (illustration)
  goldPale: '#e9d9ac', // doré pâle / beige sable (titres, bordures)
  goldSoft: '#d8c79a', // doré un peu plus soutenu
  goldGlow: '#e9d9ac66',
  ink: '#0a1c11',
  stone: '#b9d4c4',
} as const;

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
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  /** Si vrai, le sous-titre clignote doucement 3 fois puis disparaît. */
  blinkSubtitle?: boolean;
}) {
  return (
    <div className={`px-4 text-center ${compact ? 'pt-14 pb-1' : 'pt-16 pb-6'}`}>
      <h1
        className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-wide"
        style={{
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

/* Bouton principal (vert sapin, bord doré pâle).
   variant='save' : reprise exacte du design « Enregistrer » (pilule teal
   glossée + halo) que l'utilisateur apprécie — utilisé pour « Compris »,
   « Tisser une nouvelle voie » et la relance de l'analyse IA. */
export function RuneButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'gold' | 'save';
}) {
  if (variant === 'save') {
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
            #005f6a`,
          color: '#fff',
          fontFamily: 'var(--font-cinzel), serif',
          boxShadow: disabled
            ? 'none'
            : '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)',
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
          Découvrir →
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
          aria-label={infoOpen ? 'Masquer l’explication' : 'En savoir plus sur cette position'}
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

/* Analyse IA structurée d'un tirage de runes (appelle /api/rune-interpretation). */
export function RuneAnalysis({
  runes,
  mode,
  focus,
  buttonLabel = "✨ Interroger l'Oracle",
  onAnalysis,
  autoRun = false,
  odinReveal = false,
  question = null,
  gateType = null,
  echo = null,
}: {
  runes: { rune: Rune; reversed: boolean; position: string }[];
  mode: 'nornes' | 'mjolnir' | 'yggdrasil';
  /** Type de quota consommé par l'appel IA (défaut : runes-<mode>). /nornes2
      passe 'runes-nornes2' : le mode IA reste 'nornes' mais la lecture à
      l'aveugle consomme le tirage de BASE « Simplifié », pas l'avancé. */
  gateType?: string | null;
  /** Écho : id de la lecture sauvegardée + question → affiche l'encadré
      « L'Écho scellé » sous l'analyse (Initié/Arkane). Omis/null = pas d'écho. */
  echo?: { readingId: string | null; question?: string | null } | null;
  focus?: 'odin';
  buttonLabel?: string;
  /** Rappelé avec le texte complet de l'analyse (synthèse + sections + conseil) dès qu'elle est disponible. */
  onAnalysis?: (text: string) => void;
  /** Lance l'interprétation IA automatiquement dès le montage (pas de bouton). */
  autoRun?: boolean;
  /** Question/intention du consultant (thème choisi) : cible l'analyse IA. */
  question?: string | null;
  /** « Tisser une autre voie » (/nornes) : révélation UNIQUE du Conseil d'Odin —
      ni section « Conseil d'Odin » ni bloc « Synthèse » dupliqués. La rune, son
      sens, la lecture et l'action sont révélés en un seul acte (bouton → carte
      parchemin dorée + texte). Opt-in : les autres pages gardent le rendu
      historique (nornes2, analyse initiale, mjolnir, yggdrasil). */
  odinReveal?: boolean;
}) {
  const [sections, setSections] = useState<
    { position: string; rune: string; sens: string; lecture: string }[] | null
  >(null);
  const [synthese, setSynthese] = useState('');
  const [conseil, setConseil] = useState('');
  // Conseil d'Odin : texte isolé du JSON → révélé par le bouton dédié (bas de
  // l'interprétation), dans la carte au fond conseil-odin.png.
  const [conseilRevealed, setConseilRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Vidéo d'attente aléatoire (analyse-runesX.mp4) pendant l'interprétation.
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // Messages d'attente rotatifs, affichés en bas de la vidéo (par langue).
  const [waitMsgs, setWaitMsgs] = useState<string[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const lang = useLang();
  const { sub: entSub, gateReason, closeGate, openGate } = useEntitlement();
  const isArkane = entSub?.level === 'arkane';
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Carte du Conseil d'Odin : au clic sur « Révéler », centre la révélation
  // dans le viewport (cadre entier visible, bien placé).
  const revealStageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!conseilRevealed || !revealStageRef.current) return;
    const t = window.setTimeout(() => {
      revealStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [conseilRevealed]);

  // Auto-fit du texte du Conseil d'Odin (1ère phase ET tissage : 1 instance
  // RuneAnalysis = 1 état local) : la plus GRANDE police (plafonnée) qui tient
  // dans la zone claire du parchemin — texte court → grossit pour remplir,
  // texte long → rétrécit sans déborder. Recherche binaire sur le px (la
  // hauteur d'un texte wrappé n'est pas linéaire), mesure après montage de la
  // carte. Re-mesure au changement de LARGEUR uniquement (rotation) : le
  // resize vertical (barre d'URL mobile) est ignoré pour éviter le clignotement.
  const odinBoxRef = useRef<HTMLDivElement | null>(null);
  const odinTextRef = useRef<HTMLParagraphElement | null>(null);
  const [odinFont, setOdinFont] = useState<string | null>(null);
  useEffect(() => {
    if (!conseilRevealed || !conseil) return;
    setOdinFont(null);
    let cancelled = false;
    let late: number | undefined;
    const measure = () => {
      if (cancelled) return;
      const box = odinBoxRef.current;
      const txt = odinTextRef.current;
      if (!box || !txt) return;
      const basePx = parseFloat(getComputedStyle(txt).fontSize) || 12;
      const bh = box.clientHeight;
      if (bh <= 0) return;
      let lo = 9;
      let hi = Math.min(basePx * 1.9, 24, bh * 0.3);
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        txt.style.fontSize = mid + 'px';
        // offsetHeight (px de LAYOUT) et pas getBoundingClientRect : la carte
        // apparaît en spring scale 0.72→1 — le rect renvoie la hauteur VISUELLE
        // (× scale en cours d'animation) → le fit accepte une police trop
        // grande qui déborde dès l'animation finie. -1px : marge d'arrondi.
        if (txt.offsetHeight <= bh - 1) lo = mid;
        else hi = mid;
      }
      // Ne JAMAIS vider style.fontSize à la fin : la mesure tourne plusieurs
      // fois. Si un re-calcul donne la même taille, setOdinFont est un no-op
      // React (pas de re-render) et le style inline effacé ne revient jamais →
      // texte retombé sur le 16px par défaut → déborde en haut ET en bas.
      const finalPx = Math.round(lo * 10) / 10;
      txt.style.fontSize = finalPx + 'px';
      setOdinFont(finalPx + 'px');
    };
    const t = window.setTimeout(measure, 80);
    // Cinzel doit être CHARGÉE avant la mesure définitive : fonts.ready peut
    // se résoudre AVANT même le début du téléchargement (police pas encore
    // demandée au moment de l'appel) → mesure sur le fallback serif, puis le
    // swap réel fait grossir le texte après coup → débordement. fonts.load()
    // force le chargement et ne résout qu'une fois la police disponible.
    const fonts = (document as any).fonts;
    if (fonts?.load) {
      fonts
        .load('700 20px Cinzel')
        .then(() => window.setTimeout(measure, 30))
        .catch(() => {});
    }
    // Filet de sécurité : re-mesure une fois l'animation d'apparition finie.
    late = window.setTimeout(measure, 1200);
    // Filet « shrink-only » : si, police réelle + animation installées, le
    // texte dépasse encore la zone, resserrer jusqu'à ce qu'il tienne (ne
    // JAMAIS agrandir ici → aucune oscillation possible). Garantit un rendu
    // sans débordement quel que soit le timing de chargement de Cinzel.
    const verify = () => {
      if (cancelled) return;
      const box = odinBoxRef.current;
      const txt = odinTextRef.current;
      if (!box || !txt) return;
      const bh = box.clientHeight;
      if (bh <= 0) return;
      let f = parseFloat(txt.style.fontSize) || parseFloat(getComputedStyle(txt).fontSize) || 12;
      while (f > 9 && txt.offsetHeight > bh - 1) {
        f -= 0.5;
        txt.style.fontSize = f + 'px';
      }
      setOdinFont(f + 'px');
    };
    const v = window.setTimeout(verify, 2000);
    let lastW = window.innerWidth;
    const remeasure = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      setOdinFont(null);
      window.setTimeout(measure, 60);
    };
    window.addEventListener('resize', remeasure);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      if (late) window.clearTimeout(late);
      window.removeEventListener('resize', remeasure);
    };
  }, [conseilRevealed, conseil]);

  // Précharge conseil-odin.png dès que le conseil est disponible (avant le
  // clic sur « Révéler ») → la carte apparaît sans attente de chargement.
  useEffect(() => {
    if (!conseil || !isArkane || mode !== 'nornes') return;
    const img = new Image();
    img.src = '/images/conseil-odin.png';
  }, [conseil, isArkane, mode]);

  // Type d'attente (pool de messages) selon le tirage : les Nornes (nornes &
  // nornes2) ajoutent leur message dédié, Yggdrasil le sien, Mjölnir la base.
  const waitType =
    mode === 'nornes' ? 'runes-nornes'
    : mode === 'yggdrasil' ? 'runes-yggdrasil'
    : 'runes-mjolnir';

  // Charge une vidéo d'attente au hasard (détectée dynamiquement côté serveur)
  // + la liste des messages d'attente de la langue courante.
  const pickVideo = useCallback(async () => {
    try {
      const res = await api(`/api/interpretation-wait?type=${waitType}&lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      const urls: string[] = data?.backgroundUrls ?? [];
      if (urls.length > 0) setVideoUrl(urls[0]);
      setWaitMsgs(Array.isArray(data?.messages) ? (data.messages as string[]) : []);
      setMsgIndex(0);
    } catch {
      // Pas de vidéo : l'état loading texte suffit.
    }
  }, [waitType, lang]);

  // Rotation douce des messages d'attente (tant que l'analyse est en cours).
  // Chaque message reste affiché ~6s (assez long pour être lu confortablement).
  useEffect(() => {
    if (!loading || waitMsgs.length < 2) return;
    const id = window.setInterval(() => setMsgIndex((i) => i + 1), 6000);
    return () => window.clearInterval(id);
  }, [loading, waitMsgs.length]);

  // La vidéo est montée APRÈS le fetch (hors geste utilisateur) : l'attribut
  // autoPlay peut être bloqué par le navigateur. On force play() explicitement
  // dès que l'URL est disponible (vidéo muted → toujours autorisé).
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const v = videoRef.current;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [videoUrl]);

  const run = useCallback(async () => {
    setError('');
    setLoading(true);
    setSections(null);
    setSynthese('');
    setConseil('');
    setConseilRevealed(false);
    void pickVideo();
    try {
      const payload = runes.map((r) => ({
        name: r.rune.name,
        symbol: r.rune.symbol,
        position: r.position,
        sense: r.reversed ? r.rune.reversed : r.rune.upright,
        reversed: r.reversed,
      }));
      // Identité + type (pour le gating serveur) : runes-mjolnir | runes-nornes | runes-yggdrasil.
      const runeType = `runes-${mode}`;
      let userId = '';
      try { const u = localStorage.getItem('tarot_user'); if (u) userId = JSON.parse(u).email || ''; } catch { /* noop */ }
      const res = await api('/api/rune-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runes: payload, mode, focus, userId, type: gateType || runeType, question: question || undefined }),
      });
      if (res.status === 402) {
        const d = await res.json().catch(() => ({}));
        if (mountedRef.current) { setLoading(false); openGate(d.reason || 'limit-grand'); }
        return;
      }
      if (!res.ok) {
        throw new Error(`API ${res.status}`);
      }
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.sections && Array.isArray(data.sections)) {
        setSections(data.sections);
        setSynthese(data.synthese || '');
        setConseil(data.conseil_action || '');
        // Propager la réponse structurée complète à la page parente (pour persistance historique)
        onAnalysis?.(JSON.stringify(data));
      } else {
        setError("L'Oracle n'a pas répondu de façon structurée. Réessaie.");
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError("L'Oracle est silencieux… Réessaie dans un instant.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [runes, mode, focus, question]);

  // autoRun : lance l'interprétation dès le montage (pas de bouton) + amène le
  // focus sur la zone d'attente une fois l'analyse en cours.
  const boxRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const ranRef = useRef(false);
  const runStartRef = useRef(0);
  const waitFocusedRef = useRef(false);

  // Force le layer transparent (sous la vidéo) à s'afficher : son bas s'aligne
  // sur le bas de l'écran → la vidéo, au-dessus, est garantie entièrement
  // visible (scrollIntoView fonctionne sur tout conteneur de scroll).
  const focusWaitBottom = useCallback(() => {
    if (waitFocusedRef.current || !spacerRef.current) return;
    waitFocusedRef.current = true;
    spacerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    if (!autoRun || ranRef.current) return;
    ranRef.current = true;
    runStartRef.current = Date.now();
    run();
    // ~1,5s de délai : laisse le temps de VOIR le tirage (runes + tuiles)
    // avant de rediriger le focus vers la vidéo d'attente.
    const t = window.setTimeout(focusWaitBottom, 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // Si la vidéo n'est pas encore montée à l'échéance des 1,5s, le focus part
  // dès qu'elle apparaît ; sinon le timer ci-dessus s'en est déjà chargé.
  useEffect(() => {
    if (!autoRun || !videoUrl || waitFocusedRef.current) return;
    const elapsed = Date.now() - runStartRef.current;
    const t = window.setTimeout(focusWaitBottom, Math.max(0, 1500 - elapsed));
    return () => window.clearTimeout(t);
  }, [autoRun, videoUrl, focusWaitBottom]);

  // Relance MANUELLE (bouton d'erreur, bouton « Consulter l'Oracle » de
  // nornes2, …) : quand la vidéo d'attente apparaît, on la ramène à l'écran
  // (même ancrage que le flux autoRun) — sinon le focus resterait sur le
  // bouton, souvent sous la ligne de flottaison.
  useEffect(() => {
    if (autoRun || !loading || !videoUrl) return;
    waitFocusedRef.current = false;
    const t = window.setTimeout(focusWaitBottom, 120);
    return () => window.clearTimeout(t);
  }, [autoRun, loading, videoUrl, focusWaitBottom]);

  // Révélation IA prête → amener le début de l'interprétation en tête d'écran
  // (la grande tuile de la position, pas les tuiles compactes au-dessus).
  const scrolledSectionsRef = useRef(false);
  useEffect(() => {
    if (!autoRun || !sections || loading || scrolledSectionsRef.current) return;
    scrolledSectionsRef.current = true;
    const t = window.setTimeout(() => {
      boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [autoRun, sections, loading]);

  // Conseil d'Odin du tissage (/nornes, prop odinReveal — exigence user
  // 2026-09-04) : l'analyse IA de la nouvelle rune s'affiche DIRECTEMENT
  // (carte standard SANS l'en-tête de position « Conseil d'Odin », qui
  // dupliquerait le titre de la révélation) ; la « Synthèse » est fondue en
  // phrase de clôture DANS la carte (pas de bloc dupliqué) ; le bouton
  // « Révéler le Conseil d'Odin » + la carte parchemin dorée restent SOUS
  // l'analyse, avec la même mécanique que dans la 1ère phase.
  const unifiedOdin = odinReveal && mode === 'nornes' && focus === 'odin';

  return (
    <div
      className="mt-6"
      ref={boxRef}
      style={{ scrollMarginTop: '4vh' }}
    >
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      {!autoRun && !sections && !loading && !error && (
        <div className="text-center">
          <RuneButton variant="save" onClick={run}>
            {buttonLabel}
          </RuneButton>
        </div>
      )}

      {loading && (
        videoUrl ? (
          <>
            {/* Vidéo d'attente aléatoire (16:9), centrée, en boucle, avec messages
               d'attente rotatifs superposés en bas (sur voile dégradé). */}
            <div className="relative mx-auto w-full max-w-xl">
            <video
              key={videoUrl}
              ref={videoRef}
              className="aspect-video w-full rounded-2xl object-cover shadow-[0_0_40px_rgba(218,165,32,0.25)]"
              style={{ border: `1px solid ${RUNE_THEME.goldPale}44` }}
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
            />
            {/* Voile bas pour la lisibilité du message */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl"
              style={{
                background: 'linear-gradient(to top, rgba(6,18,11,0.92) 0%, rgba(6,18,11,0.35) 55%, transparent 100%)',
                height: '42%',
              }}
            />
            {/* Message d'attente rotatif */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 text-center">
              <AnimatePresence mode="wait">
                {waitMsgs.length > 0 && (
                  <motion.p
                    key={msgIndex % waitMsgs.length}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                    className="text-[11px] italic sm:text-xs"
                    style={{
                      fontFamily: 'var(--font-cinzel), serif',
                      color: RUNE_THEME.goldPale,
                      textShadow: '0 1px 8px rgba(0,0,0,0.85)',
                    }}
                  >
                    {waitMsgs[msgIndex % waitMsgs.length]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            </div>

            {/* Layer transparent sous la vidéo : sert d'ancre de scroll. En le
                forçant à s'afficher (focusWaitBottom), le bas de la vidéo reste
                au-dessus du bord bas de l'écran → la vidéo tient entièrement à
                l'écran, bandeau de messages compris. */}
            <div ref={spacerRef} aria-hidden="true" className="h-[20vh] w-full" />
          </>
        ) : (
          <div
            className="text-center text-sm italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale, opacity: 0.8 }}
          >
            L&apos;Oracle déchiffre les runes… ✦
          </div>
        )
      )}

      {error && !loading && (
        <div className="text-center space-y-2">
          <p className="text-amber-400/70 text-xs italic">{error}</p>
          <RuneButton variant="save" onClick={run}>
            {buttonLabel}
          </RuneButton>
        </div>
      )}

      {sections && !loading && (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forest}22 100%)`,
                border: `1px solid ${RUNE_THEME.goldPale}44`,
              }}
            >
              {!unifiedOdin && (
                <p
                  className="mb-1 text-center text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}
                >
                  {s.position}
                </p>
              )}
              <p
                className="mb-2 text-center text-base"
                style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale }}
              >
                {s.rune}
              </p>
              <p
                className="mb-2 text-center text-xs italic"
                style={{ color: RUNE_THEME.sage, opacity: 0.85 }}
              >
                {s.sens}
              </p>
              <p
                className="text-center text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {s.lecture}
              </p>
              {unifiedOdin && synthese && (
                <p
                  className="mt-3 text-center text-sm italic leading-relaxed"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sagePale }}
                >
                  {synthese}
                </p>
              )}
            </div>
          ))}

          {!unifiedOdin && synthese && (
            <div
              className="mt-4 rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${RUNE_THEME.goldPale}22 0%, ${RUNE_THEME.forestMid}14 100%)`,
                border: `1px solid ${RUNE_THEME.goldPale}55`,
              }}
            >
              <p
                className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale }}
              >
                Synthèse
              </p>
              <p
                className="text-center text-sm leading-relaxed italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {synthese}
              </p>
            </div>
          )}

          {/* Conseil d'Odin (tirages nornes : initial ET tissage) : le texte vient
              du JSON de l'interprétation IA (conseil_action) — isolé puis révélé
              par le bouton dédié. Carte conseil-odin.png (cadre + parchemin),
              texte calé DANS le parchemin. Réservé au forfait ARKANE. */}
          {conseil && mode === 'nornes' && isArkane && (
            <div className="mt-4 text-center">
              {!conseilRevealed ? (
                <button
                  type="button"
                  onClick={() => setConseilRevealed(true)}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.03] hover:brightness-110 active:scale-95"
                  style={{
                    background: `
                      linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%),
                      #005f6a`,
                    color: '#fff',
                    fontFamily: 'var(--font-cinzel), serif',
                    boxShadow:
                      '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="3.2" />
                    <path d="M2.5 12s3.2-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.2 5.5-9.5 5.5S2.5 12 2.5 12z" />
                  </svg>
                  Révéler le Conseil d&apos;Odin
                </button>
              ) : (
                <motion.div
                  ref={revealStageRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative mx-auto scroll-mt-24"
                  style={{ maxWidth: 560 }}
                >
                  {/* ── Rayons dorés derrière la carte ── */}
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'conic-gradient(from 0deg, rgba(255,214,110,0) 0deg, rgba(255,214,110,0.5) 12deg, rgba(255,214,110,0) 24deg, rgba(255,214,110,0) 60deg, rgba(255,214,110,0.42) 72deg, rgba(255,214,110,0) 84deg, rgba(255,214,110,0) 120deg, rgba(255,214,110,0.5) 132deg, rgba(255,214,110,0) 144deg, rgba(255,214,110,0) 180deg, rgba(255,214,110,0.42) 192deg, rgba(255,214,110,0) 204deg, rgba(255,214,110,0) 240deg, rgba(255,214,110,0.5) 252deg, rgba(255,214,110,0) 264deg, rgba(255,214,110,0) 300deg, rgba(255,214,110,0.42) 312deg, rgba(255,214,110,0) 324deg, rgba(255,214,110,0) 360deg)',
                      filter: 'blur(2px)',
                    }}
                    initial={{ opacity: 0, scale: 0.25, rotate: 0 }}
                    animate={{ opacity: [0, 0.85, 0], scale: 1.55, rotate: 18 }}
                    transition={{ duration: 1.4, times: [0, 0.4, 1], ease: 'easeOut' }}
                  />
                  {/* ── Halo lumineux arrière-plan ── */}
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -inset-6"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 45%, rgba(255,225,140,0.55), rgba(255,215,120,0.12) 55%, transparent 75%)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.9, 0.45] }}
                    transition={{ duration: 1.2, times: [0, 0.35, 1] }}
                  />

                  {/* ── Titre AU-DESSUS de la carte (orné, doré) ── */}
                  <motion.h3
                    initial={{ opacity: 0, y: 10, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-3 flex items-center justify-center gap-2.5 px-2 text-center sm:gap-3"
                  >
                    <motion.span
                      aria-hidden
                      className="h-px flex-1"
                      style={{ maxWidth: 90, background: 'linear-gradient(90deg, transparent, rgba(243,201,105,0.85))' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    />
                    <span
                      aria-hidden
                      className="text-sm"
                      style={{ color: '#F3C969', textShadow: '0 0 12px rgba(243,201,105,0.8)' }}
                    >
                      ✦
                    </span>
                    <span
                      className="text-xl uppercase tracking-[0.14em] sm:text-2xl"
                      style={{
                        fontFamily: 'var(--font-cinzel-deco), serif',
                        backgroundImage: 'linear-gradient(180deg, #FFF6D8 0%, #F3C969 48%, #C9962E 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        filter:
                          'drop-shadow(0 2px 3px rgba(0,0,0,0.55)) drop-shadow(0 0 16px rgba(243,201,105,0.4))',
                      }}
                    >
                      Conseil d&apos;Odin
                    </span>
                    <span
                      aria-hidden
                      className="text-sm"
                      style={{ color: '#F3C969', textShadow: '0 0 12px rgba(243,201,105,0.8)' }}
                    >
                      ✦
                    </span>
                    <motion.span
                      aria-hidden
                      className="h-px flex-1"
                      style={{ maxWidth: 90, background: 'linear-gradient(270deg, transparent, rgba(243,201,105,0.85))' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    />
                  </motion.h3>

                  {/* ── La carte (parchemin conseil-odin.png) ── */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.72, y: 26, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', damping: 15, stiffness: 150, mass: 0.9 }}
                    onAnimationStart={() => playSound('spell')}
                    className="relative w-full overflow-hidden rounded-xl"
                    style={{
                      aspectRatio: '450 / 292',
                      backgroundImage: "url('/images/conseil-odin.png')",
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      boxShadow: '0 14px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Reflet lumineux qui balaie la carte */}
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-1/2"
                      style={{
                        background:
                          'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.08) 60%, transparent 100%)',
                        left: '-60%',
                      }}
                      initial={{ left: '-60%' }}
                      animate={{ left: '110%' }}
                      transition={{ delay: 0.35, duration: 0.95, ease: 'easeInOut' }}
                    />
                    {/* Lueur dorée pulsante (fond) */}
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 42%, rgba(255,222,130,0.5), transparent 70%)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.55, 0.18, 0.4, 0.18] }}
                      transition={{ delay: 0.5, duration: 1.6, times: [0, 0.3, 0.55, 0.8, 1] }}
                    />

                    {/* ── Texte seul, calé DANS le parchemin (zone centrale claire,
                        largeur réduite pour ne pas toucher le cadre intérieur).
                        Font-size auto-fit : la plus grande qui tient (cf. effet
                        odinFont ci-dessus) — texte court rempli, long ajusté. ── */}
                    <div
                      ref={odinBoxRef}
                      className="absolute flex flex-col items-center justify-center"
                      style={{ top: '30%', bottom: '25%', left: '18%', right: '18%' }}
                    >
                      <motion.p
                        ref={odinTextRef}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.55 }}
                        className="text-center font-bold leading-snug"
                        style={{
                          fontFamily: 'var(--font-cinzel), serif',
                          fontSize: odinFont || '12px',
                          color: '#6B4423', // bronze foncé
                          // Effet gravé (bizeautage) : arête supérieure sombre
                          // (creux) + arête inférieure claire (lumière rasante) —
                          // comme si le texte était incisé dans le parchemin.
                          textShadow:
                            '0 -1px 0 rgba(74,44,12,0.5), 0 1px 0 rgba(255,249,233,0.85), 0 2px 4px rgba(100,70,25,0.18)',
                        }}
                      >
                        {conseil}
                      </motion.p>
                    </div>
                  </motion.div>

                  {/* ── Étincelles ascendantes ── */}
                  {SPARKS.map((s, i) => (
                    <motion.span
                      key={i}
                      aria-hidden
                      className="pointer-events-none absolute select-none"
                      style={{
                        left: s.x,
                        top: s.y,
                        fontSize: s.size,
                        color: s.color,
                        textShadow: '0 0 8px rgba(255,220,120,0.9)',
                      }}
                      initial={{ opacity: 0, y: 0, scale: 0.4 }}
                      animate={{ opacity: [0, 1, 0], y: -s.rise, scale: [0.4, 1.2, 0.5], rotate: s.spin }}
                      transition={{ delay: 0.5 + s.delay, duration: 1.5 + s.dur, ease: 'easeOut' }}
                    >
                      {s.char}
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* Conseil générique (autres tirages : pas le Conseil d'Odin nornes) — affiché en clair. */}
          {conseil && mode !== 'nornes' && (
            <div
              className="mt-4 rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${RUNE_THEME.sage}22 0%, ${RUNE_THEME.forestMid}18 100%)`,
                border: `1px solid ${RUNE_THEME.sage}66`,
              }}
            >
              <p
                className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.sage }}
              >
                Conseil d&apos;Odin
              </p>
              <p
                className="text-center text-sm leading-relaxed italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {conseil}
              </p>
            </div>
          )}

          {/* ✶ L'Écho scellé — prémonction datée née de cette lecture (Initié/Arkane). */}
          {echo && (synthese || conseil) && (
            <EchoBox
              domain="runes"
              readingId={echo.readingId}
              question={echo.question ?? question}
              summary={[...sections.map((s) => s.lecture), synthese, conseil].filter(Boolean).join('\n')}
            />
          )}
        </div>
      )}
    </div>
  );
}
