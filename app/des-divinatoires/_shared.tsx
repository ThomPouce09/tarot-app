'use client';

// app/des-divinatoires/_shared.tsx
// Primitives visuelles partagées de la section "Dés du Zodiaque".
// Palette provisoire : rouge brique + ocre (à remplacer par tes visuels définitifs).

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { TargetFaces, DieKind } from '@/components/astro-dice';
import { PLANETS, SIGNS } from '@/components/astro-dice';
import { meaningFor } from '@/components/astro-dice/meanings';

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
}: {
  children: ReactNode;
  scrollable?: boolean;
  bgImage?: string;
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
      {/* fond d'écran personnalisé (optionnel) */}
      {bgImage && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35,
          }}
        />
      )}
      {/* voile doré subtil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.12) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* Titre de section stylé ocre/doré */
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
          className="mx-auto mt-3 max-w-xl text-sm sm:text-base italic"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: DICE_THEME.glyph,
            opacity: 0.85,
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
  variant?: 'primary' | 'ocre' | 'blue' | 'blueLight';
}) {
  const bg =
    variant === 'blueLight'
      ? 'linear-gradient(135deg, #0a3050 0%, #2070a0 50%, #50b8e8 100%)'
      : variant === 'blue'
      ? 'linear-gradient(135deg, #020d18 0%, #062040 50%, #0a3a60 100%)'
      : variant === 'ocre'
      ? disabled
        ? DICE_THEME.brickDark
        : DICE_THEME.ocre
      : disabled
        ? DICE_THEME.brickDark
        : DICE_THEME.brick;
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
        color: DICE_THEME.glyph,
        border: variant === 'blue' || variant === 'blueLight' ? '1.5px solid #5db8e8' : `1.5px solid ${DICE_THEME.gold}`,
        boxShadow: disabled
          ? 'none'
          : variant === 'blue' || variant === 'blueLight'
            ? '0 0 24px rgba(93,184,232,0.5), 0 4px 12px rgba(0,0,0,0.4)'
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

/* Noms lisibles des glyphes (pour l'affichage textuel des résultats) */
export const PLANET_NAMES: Record<string, string> = {
  '☉': 'Soleil', '☽': 'Lune', '☿': 'Mercure', '♀': 'Vénus', '♂': 'Mars',
  '♃': 'Jupiter', '♄': 'Saturne', '♅': 'Uranus', '♆': 'Neptune', '♇': 'Pluton',
  '☊': 'Nœud Nord', '☋': 'Nœud Sud',
};
export const SIGN_NAMES: Record<string, string> = {
  '♈': 'Bélier', '♉': 'Taureau', '♊': 'Gémeaux', '♋': 'Cancer', '♌': 'Lion',
  '♍': 'Vierge', '♎': 'Balance', '♏': 'Scorpion', '♐': 'Sagittaire',
  '♑': 'Capricorne', '♒': 'Verseau', '♓': 'Poissons',
};

/* Ligne de résultat lisible : "☉ Soleil · ♌ Lion · Maison 5" */
export function ResultLine({ faces }: { faces: TargetFaces }) {
  return (
    <div
      className="text-center text-base sm:text-lg font-semibold"
      style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.ocreLight }}
    >
      <span title="Planète">{faces.planet} {PLANET_NAMES[faces.planet]}</span>
      <span style={{ color: DICE_THEME.glyph, opacity: 0.6 }}> · </span>
      <span title="Signe">{faces.sign} {SIGN_NAMES[faces.sign]}</span>
      <span style={{ color: DICE_THEME.glyph, opacity: 0.6 }}> · </span>
      <span title="Maison">Maison {faces.house}</span>
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

  const run = useCallback(async () => {
    setLoading(true);
    setHasErrored(false);
    setAnalysis(null);
    setSections(null);
    setSynthese('');
    setActions([]);
    try {
      const res = await fetch('/api/astro-dice-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faces, activeKinds, mode, kind, question: question || undefined, dbInterpretation: dbInterpretation || undefined }),
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
        Analyse du tirage
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
            Les astres réfléchissent… ✨
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
                  Synthèse
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
                  Passer à l'action
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
              🔄 Relancer l'analyse
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
