'use client';

// components/astro-dice/constellation.tsx
// Signature visuelle des Dés du Zodiaque (moule Yggdrasil/Mjölnir) :
//  - ConstellationStrike : à l'immobilisation, les 3 glyphes tombés s'allument
//    un à un (son sec = rune-hit-1) reliés par un trait d'or, puis l'anneau
//    cosmique pulse et le fil se dissout → l'analyse peut commencer.
//  - BalancePlateaux : le moment « comparaison » du Choix — les deux
//    constellations se dressent côte à côte, un pont de lumière se tend
//    entre elles, la balance s'incline doucement.
//  - HintLegende : 3 bulles (Planète/Signe/Maison) expliquant la ligne de
//    résultat, affichées une seule fois (localStorage).

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFitOneLine } from '@/lib/fit-one-line';
import { playSound } from '@/lib/sounds';
import { DICE_THEME } from '@/app/des-divinatoires/_shared';
import { PLANET_NAMES, SIGN_NAMES } from '@/components/astro-dice/names';
import { meaningFor } from '@/components/astro-dice/meanings';
import type { TargetFaces } from './glyphs';

const GOLD = '#e9d9ac';

/** 3 étoiles [glyphe, nom FR] pour la constellation et la balance. */
export function strikeTokens(f: TargetFaces): [string, string][] {
  return [
    [String(f.planet), PLANET_NAMES[String(f.planet)] ?? String(f.planet)],
    [String(f.sign), SIGN_NAMES[String(f.sign)] ?? String(f.sign)],
    [String(f.house), `Maison ${f.house}`],
  ];
}

const ORBIT_RING =
  'M10 62 C 18 40, 34 24, 60 18 C 86 12, 110 18, 124 32 C 140 48, 146 72, 136 92 C 126 112, 102 122, 76 120 C 50 118, 30 106, 20 88 C 13 76, 8 70, 10 62 Z';
const SPARKS = [[60, 22], [86, 40], [104, 62], [108, 90], [92, 110], [64, 118], [38, 108], [26, 84], [28, 52], [42, 32]];

function GlowDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f4d98b" />
        <stop offset="50%" stopColor={GOLD} />
        <stop offset="100%" stopColor="#b98f3e" />
      </linearGradient>
    </defs>
  );
}

/* ─────────────────────────── l'anneau cosmique ─────────────────────────── */
export function CosmicRing({ animate: go }: { animate: boolean }) {
  return (
    <>
      <GlowDefs id="cosmo-ring" />
      <motion.g initial={{ opacity: 0, scale: 0.4 }} animate={go ? { opacity: [0, 0.85, 0.55, 0.55, 0], scale: [0.4, 1.12, 1.05, 1.05, 1.08] } : { opacity: 0 }}
        transition={{ duration: 5.2, times: [0, 0.12, 0.25, 0.82, 1] }}
        style={{ transformOrigin: '78px 68px', pointerEvents: 'none' }}>
        <path d={ORBIT_RING} fill="none" stroke="url(#cosmo-ring)" strokeWidth="1.1" opacity="0.8" />
        {SPARKS.map(([cx, cy], i) => (
          <motion.circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.8 : 1.2} fill={GOLD}
            animate={go ? { opacity: [0.2, 1, 0.2] } : { opacity: 0.2 }}
            transition={{ duration: 2.0, delay: 0.12 * i, repeat: go ? 2 : 0 }} />
        ))}
      </motion.g>
    </>
  );
}

/* ─────────────── strike A « Le ciel se déchire » ────────────────────────
   Validé par le user (page de démo) : trois étoiles filantes foncent sur
   l'arène assombrie, onde de choc à chaque impact, noms gravés sous les
   glyphes, puis les liens d'or se tendent. L'arène de tirage est fondue à
   zéro par AstroDiceCup pendant la séquence (focus total), puis revient. */
export function ConstellationStrike({
  visible, tokens, onDone,
  soundKey = 'animation-zodiac',
  musicMs = 3010,
}: {
  visible: boolean;
  /** 3 étoiles [glyphe, nom] dans l'ordre (Planète, Signe, Maison). */
  tokens: [string, string][];
  onDone?: () => void;
  /** Musique de la frappe (variante par tirage). */
  soundKey?: string;
  /** Durée de cette musique en ms — le hold de lecture suit sa fin. */
  musicMs?: number;
}) {
  // La frappe épouse sa musique (3,0 s / choisis ; 4,0 s / obstacle) :
  // filantes 0,25→2,3 s, liens d'or 2,25-2,85 s, puis le ciel RESTE EN PLACE
  // 2 s de plus pour déchiffrer les 3 faces, et se dissout en 0,6 s sur la
  // toute fin. L'arène ne revient PAS ensuite.
  const total = musicMs + 3100; // +0,5 s de décalage musique + 2,6 s de fin
  useEffect(() => {
    if (visible && onDone) {
      const t = window.setTimeout(onDone, total);
      return () => window.clearTimeout(t);
    }
  }, [visible, onDone, total]);
  // une seule musique — les impacts individuels sont fondus dedans.
  // Départ décalé de +0,5 s : le premier accent du morceau tombe sur la
  // première filante (impact à 0,85 s ≈ 0,5 + 0,35 s de montée).
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => playSound(soundKey, 0.9), 500);
    return () => window.clearTimeout(t);
  }, [visible, soundKey]);
  if (!visible) return null;
  const pts = [[34, 122], [122, 60], [70, 12]];                       // points d'impact
  const from = [[-64, -74], [214, -28], [-34, 218]];                  // départs hors cadre
  return (
    <svg viewBox="0 0 156 148" className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 30 }} aria-hidden>
      {/* dégradés de traits : fondus aux deux bouts (atténuation près des astres) */}
      {[[34, 122], [122, 60]].map(([ax, ay], i) => {
        const [bx, by] = i === 0 ? [122, 60] : [70, 12];
        return (
          <defs key={i}>
            <linearGradient id={`cons-fade-${i}`} gradientUnits="userSpaceOnUse" x1={ax} y1={ay} x2={bx} y2={by}>
              <stop offset="0%" stopColor={GOLD} stopOpacity="0" />
              <stop offset="24%" stopColor={GOLD} stopOpacity="0.9" />
              <stop offset="76%" stopColor={GOLD} stopOpacity="0.9" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </linearGradient>
          </defs>
        );
      })}
      {/* Fond 100 % transparent : l'arène est déjà fondue à 0 (AstroDiceCup),
          le fond d'origine de la page reste visible derrière les filantes.
          Le ciel reste posé ~2 s après la musique (lecture des 3 faces),
          puis se dissout en fondu sur les derniers instants. */}
      <motion.g initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }}
        transition={{ duration: total / 1000, times: [0, (musicMs + 2500) / total, 1] }}>
      {/* liens d'or : la constellation se referme — DERRIÈRE les glyphes/noms,
          raccourcis et fondus aux extrémités pour ne jamais les rayer. */}
      {[[34, 122], [122, 60]].map(([ax, ay], i) => {
        const b = i === 0 ? [122, 60] : [70, 12];
        const dx = b[0] - ax, dy = b[1] - ay; const len = Math.hypot(dx, dy) || 1;
        const gap = 13;
        return (
          <motion.line key={i}
            x1={ax + (dx / len) * gap} y1={ay + (dy / len) * gap}
            x2={b[0] - (dx / len) * gap} y2={b[1] - (dy / len) * gap}
            stroke={`url(#cons-fade-${i})`} strokeWidth="1.3" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1], opacity: [0, 0.9] }}
            transition={{ duration: 0.6, delay: 2.25 + i * 0.3 }} />
        );
      })}
      {tokens.map(([gly, name], i) => {
        const [tx, ty] = pts[i]; const [fx, fy] = from[i]; const t0 = 0.25 + i * 0.72;
        const dx = Math.sign(tx - fx) * 24, dy = Math.sign(ty - fy) * 24;
        return (
          <motion.g key={i}
            initial={{ x: fx, y: fy, opacity: 0 }}
            animate={{ x: [fx, tx, tx], y: [fy, ty, ty], opacity: [0, 1, 1] }}
            transition={{ duration: 0.6, delay: t0, times: [0, 0.85, 1], ease: 'easeOut' }}>
            {/* traînée de la filante */}
            <line x1="0" y1="0" x2={dx} y2={dy} stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.45" />
            <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fontSize="26" fill={GOLD}
              style={{ fontFamily: 'var(--font-cinzel-deco), serif', filter: 'drop-shadow(0 0 10px rgba(233,217,172,0.95))' }}>
              {gly}
            </text>
            {/* le nom gravé sous l'étoile */}
            <text x="0" y="18" textAnchor="middle" fontSize="7.2" fill={GOLD} opacity="0.95"
              style={{ fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.12em', textTransform: 'uppercase', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}>
              {name}
            </text>
            {/* onde de choc à l'impact */}
            <motion.circle r="6" fill="none" stroke={GOLD} strokeWidth="1.5"
              initial={{ r: 6, opacity: 0 }}
              animate={{ r: [6, 26, 32], opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.7, delay: t0 + 0.42, times: [0, 0.4, 1] }} />
          </motion.g>
        );
      })}
      </motion.g>
    </svg>
  );
}

/* ─────────────────────────── la balance du Choix ──────────────────────── */
function MiniConstellation({ tokens, side }: { tokens: [string, string][]; side: 'A' | 'B' }) {
  const pts = [[26, 84], [86, 42], [54, 14]];
  const gradId = `bal-${side}`;
  return (
    <svg viewBox="0 0 112 104" className="h-full w-full" aria-hidden>
      <GlowDefs id={gradId} />
      {[0, 1].map((i) => (
        <motion.line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={pts[i + 1][0]} y2={pts[i + 1][1]}
          stroke={`url(#${gradId})`} strokeWidth="1.4"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.0, delay: 0.3 + i * 0.5 }} />
      ))}
      {tokens.map(([gly, name], i) => (
        <motion.g key={i}
          initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 * i, type: 'spring', stiffness: 220, damping: 14 }}>
          <text x={pts[i][0]} y={pts[i][1]} textAnchor="middle" dominantBaseline="middle"
            fontSize={20} fill={GOLD}
            style={{ fontFamily: 'var(--font-cinzel-deco), serif', filter: 'drop-shadow(0 0 7px rgba(233,217,172,0.9))' }}>
            {gly}
          </text>
          <text x={pts[i][0]} y={pts[i][1] + 13} textAnchor="middle" fontSize={6.4} fill={GOLD} opacity="0.9"
            style={{ fontFamily: 'var(--font-cinzel), serif', letterSpacing: '0.1em', textTransform: 'uppercase', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }}>
            {name}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

export function BalancePlateaux({
  tokensA, tokensB, labelA, labelB,
}: {
  tokensA: [string, string][];
  tokensB: [string, string][];
  labelA?: string;
  labelB?: string;
}) {
  return (
    <div className="relative mx-auto my-5 max-w-2xl select-none overflow-hidden rounded-3xl border p-4"
      style={{ borderColor: `${GOLD}44`, background: 'radial-gradient(ellipse at 50% 0%, rgba(233,217,172,0.09), rgba(0,0,0,0.35))' }}
      aria-hidden>
      <div className="flex items-center justify-center">
        <div className="flex flex-1 justify-center">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: [28, 0] }} transition={{ duration: 0.8 }}
            className="relative h-28 w-24 sm:h-36 sm:w-32">
            <MiniConstellation tokens={tokensA} side="A" />
            <p className="absolute -bottom-1 inset-x-0 text-center text-[10px] uppercase tracking-[0.18em]"
              style={{ color: DICE_THEME.ocreLight, fontFamily: 'var(--font-cinzel), serif' }}>{labelA || 'A'}</p>
          </motion.div>
        </div>
        {/* le pont de lumière */}
        <motion.svg viewBox="0 0 90 24" className="h-16 w-[90px] shrink-0" aria-hidden>
          <GlowDefs id="bal-bridge" />
          <motion.line x1="4" y1="12" x2="86" y2="12" stroke="url(#bal-bridge)" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0.75] }}
            transition={{ duration: 2.2, times: [0, 0.45, 1] }} />
          <CosmicRing animate />
        </motion.svg>
        <div className="flex flex-1 justify-center">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: [28, 0] }} transition={{ duration: 0.8, delay: 0.15 }}
            className="relative h-28 w-24 sm:h-36 sm:w-32">
            <MiniConstellation tokens={tokensB} side="B" />
            <p className="absolute -bottom-1 inset-x-0 text-center text-[10px] uppercase tracking-[0.18em]"
              style={{ color: DICE_THEME.ocreLight, fontFamily: 'var(--font-cinzel), serif' }}>{labelB || 'B'}</p>
          </motion.div>
        </div>
      </div>
      {/* balance qui s'incline (le plateau qui « pèse » descend le plus) */}
      <motion.div className="mx-auto mt-3 h-[2px] w-40"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
        initial={{ rotate: 0 }} animate={{ rotate: [0, -3.5, 2.5, -1.2, 0] }}
        transition={{ duration: 2.8, delay: 0.9, ease: 'easeInOut' }} />
    </div>
  );
}

/* ───────────── affichable cliquable du tirage (modale de détail) ───────────
   Ligne « ☉ Soleil · ♌ Lion · Maison 5 » en pilule visible-cliquable : un tap
   ouvre la modale qui donne la signification exacte de chaque face. Finies
   les explications en dur dans l'encart d'analyse. */
export function ClickableFaces({ faces }: { faces: TargetFaces }) {
  const [open, setOpen] = useState(false);
  const rows = [
    ['Planète', String(faces.planet), meaningFor('planet', faces.planet)],
    ['Signe', String(faces.sign), meaningFor('sign', faces.sign)],
    ['Maison', String(faces.house), meaningFor('house', faces.house)],
  ] as const;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full px-4 py-1.5 transition-transform active:scale-[0.97]"
        style={{
          background: 'rgba(20,36,90,0.55)',
          border: '1px dashed rgba(212,175,55,0.65)',
          boxShadow: '0 0 18px rgba(212,175,55,0.18), inset 0 0 14px rgba(212,175,55,0.08)',
          fontFamily: 'var(--font-cinzel), serif', fontSize: '1rem',
          textDecoration: 'underline dotted rgba(212,175,55,0.5) 1px', textUnderlineOffset: 4,
        }}
        title="Toucher pour la signification des faces">
        <span className="text-center leading-snug">
          <span style={{ color: DICE_THEME.ocreLight }}>{String(faces.planet)} {PLANET_NAMES[String(faces.planet)] ?? faces.planet}</span>
          <span style={{ color: DICE_THEME.glyph, opacity: 0.6 }}> · </span>
          <span style={{ color: DICE_THEME.ocreLight }}>{String(faces.sign)} {SIGN_NAMES[String(faces.sign)] ?? faces.sign}</span>
          <span style={{ color: DICE_THEME.glyph, opacity: 0.6 }}> · </span>
          <span style={{ color: DICE_THEME.ocreLight }}>Maison {String(faces.house)}</span>
        </span>
        <motion.span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ color: '#1a0e0a', background: `linear-gradient(180deg, #f4d98b, ${DICE_THEME.gold})`, boxShadow: '0 0 10px rgba(212,175,55,0.7)' }}
          animate={{ scale: [1, 1.14, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
          ⓘ
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[95] flex items-center justify-center p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 18, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }} transition={{ duration: 0.35 }} onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border p-5"
              style={{
                background: 'linear-gradient(160deg, #14245a 0%, #0a1430 100%)',
                borderColor: `${DICE_THEME.gold}66`,
                boxShadow: '0 0 40px rgba(212,175,55,0.16), 0 22px 54px rgba(0,0,0,0.7)',
              }}>
              <p className="mb-1 text-center text-[10px] uppercase tracking-[0.35em]" style={{ color: `${DICE_THEME.gold}aa`, fontFamily: 'var(--font-cinzel-deco), serif' }}>
                ☾ · ✦ · ☼
              </p>
              <h3 className="mb-4 text-center text-lg font-bold" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: DICE_THEME.ocreLight }}>
                Vos trois faces
              </h3>
              <ul className="space-y-3">
                {rows.map(([label, gly, txt]) => (
                  <li key={label} className="rounded-xl p-3 text-left"
                    style={{ background: `${DICE_THEME.gold}0d`, border: `1px solid ${DICE_THEME.gold}33` }}>
                    <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: DICE_THEME.gold, fontFamily: 'var(--font-cinzel), serif' }}>
                      {label} — {gly}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed" style={{ fontFamily: 'var(--font-cinzel), serif', color: DICE_THEME.glyph }}>
                      {txt}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setOpen(false)}
                  className="rounded-full px-6 py-2 text-sm font-bold"
                  style={{ background: 'linear-gradient(180deg, #22366f, #070d22)', color: '#F7ECCE', border: '1px solid rgba(232,198,106,0.8)', boxShadow: '0 0 0 3px rgba(212,175,55,0.1), 0 8px 18px rgba(3,5,12,0.8), inset 0 1px 0 rgba(232,198,106,0.4)', fontFamily: 'var(--font-cinzel-deco), serif' }}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ─────────────────────────── légende 1re fois ─────────────────────────── */
export function HintLegende({ open, onClose }: { open: boolean; onClose?: () => void }) {
  if (!open) return null;
  const items = [
    ['☉', 'La Planète', "l'énergie à l'œuvre (le verbe du message)."],
    ['♌', 'Le Signe', 'sa couleur, la façon dont elle s\u2019exprime.'],
    ['⌂', 'La Maison', 'le domaine de vie touché (le décor).'],
  ] as const;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pointer-events-auto absolute inset-x-0 top-1 z-20 flex cursor-pointer flex-col items-center gap-1.5 px-2" onClick={onClose}>
      {items.map(([g, t, d], i) => (
        <motion.p key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i }}
          className="rounded-full px-3 py-0.5 text-[10.5px]"
          style={{ background: 'rgba(10,20,13,0.82)', border: `1px solid ${GOLD}44`, color: DICE_THEME.ocreLight, fontFamily: 'var(--font-cinzel), serif', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          <span style={{ color: GOLD, marginRight: 6 }}>{g}</span>
          <b>{t}</b> — {d}
        </motion.p>
      ))}
    </motion.div>
  );
}

/* ─────────────────────────── fil d'étapes ─────────────────────────────── */
export function DiceSteps({ steps, current }: { steps: readonly string[]; current: number }) {
  // Le fil d'étapes (Confier › Chemin A › Chemin B › Comparaison) doit tenir
  // sur UNE ligne : la police est réduite jusqu'à ce que ça passe, y compris
  // sur petit écran.
  const rowRef = useRef<HTMLDivElement>(null);
  useFitOneLine(rowRef, [steps.join('|')], { base: 10, min: 6.5, max: 10, inset: 0, font: '700 10px "Cinzel"' });
  return (
    <div ref={rowRef} className="mb-2 flex flex-nowrap items-center justify-center gap-1.5 uppercase tracking-[0.14em]"
      style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 10, whiteSpace: 'nowrap' }}>
      {steps.map((s, i) => {
        const reached = i <= current;
        const active = i === current;
        return (
          <span key={s} className="flex items-center gap-1.5">
            {i > 0 && <span style={{ color: `${GOLD}55` }}>›</span>}
            <span className="rounded-full px-2 py-0.5" style={{
              color: reached ? GOLD : 'rgba(244,239,226,0.4)',
              border: `1px solid ${reached ? `${GOLD}55` : 'rgba(244,239,226,0.18)'}`,
              background: active ? 'rgba(233,217,172,0.08)' : 'transparent',
            }}>{s}</span>
          </span>
        );
      })}
    </div>
  );
}

export function markLegendeSeen() {
  try { localStorage.setItem('tarot_dice_legende_seen', '1'); } catch { /* ignore */ }
}
export function legendeSeen(): boolean {
  try { return localStorage.getItem('tarot_dice_legende_seen') === '1'; } catch { return false; }
}
