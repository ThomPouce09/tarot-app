'use client';

// ═══════════════════════════════════════════════════════════════════
// « Dés du Zodiaque Simplifié » — sélecteur d'intention.
// Même mécanique que /tarot-3-cartes-simplifie et /yi-jing-simplifie
// (4 thèmes × 5 intentions), mais aux couleurs des Dés du Zodiaque :
// les 4 ÉLÉMENTS astrologiques (Feu, Terre, Air, Eau) sur bleu nuit &
// or (palette du hub). La question composée « Élément — intention »
// est transmise à l'analyse (prompt ancré sur l'intention).
// ═══════════════════════════════════════════════════════════════════

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, contentLang } from '@/lib/i18n';
import { DICE_THEME } from '../des-divinatoires/_shared';

export interface L {
  fr: string;
  en: string;
}

export interface DiceTheme {
  id: string;
  label: L;
  element: string;
  sigil: L;
  icon: (c: string) => React.ReactNode;
  subs: L[];
}

/* ————— Icônes des 4 Éléments (line art doré, 48×48, style du hub) ————— */

export function IconFire(c: string) {
  // Le Feu — flamche : élan, courage, Mars.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 6c4 7 11 10 11 19a11 11 0 1 1-22 0c0-5 3-7 4-11 2.5 3 3.5 5 3.5 8C22 17 22 11 24 6Z" />
      <path d="M24 39a5.5 5.5 0 0 1-5.5-5.5c0-2.6 2.3-4 3.4-6.5 1.3 1.8 7.6 4.6 7.6 6.5A5.5 5.5 0 0 1 24 39Z" opacity="0.55" />
      <path d="M38 9l1.4 3 3 1.4-3 1.4L38 18l-1.4-3.2-3-1.4 3-1.4Z" opacity="0.7" strokeWidth="1.1" />
    </svg>
  );
}

export function IconEarth(c: string) {
  // La Terre — la taupée : tige, deux feuilles, sol ondulé (choix utilisateur).
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 32c4-2.6 8-2.6 14 0 6-2.6 10-2.6 14 0" opacity="0.8" />
      <path d="M24 32V20" />
      <path d="M24 22c-5.4-.4-8.2-3.6-8.6-8.6 5.4.4 8.2 3.6 8.6 8.6Z" />
      <path d="M24 26c4.8-.4 7.4-3 7.8-7.4-4.8.4-7.4 3-7.8 7.4Z" opacity="0.8" />
      <path d="M20 39l4-4 4 4" opacity="0.55" />
    </svg>
  );
}

export function IconAir(c: string) {
  // L'Air — Mercure : idées, liens, souffle du verbe.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17h24c4.5 0 6.5-6 2.5-7.5" />
      <path d="M7 26h30c4.8 0 6.8 6.8 2.4 8.2" />
      <path d="M11 35h13" opacity="0.65" />
      <circle cx="40.5" cy="37.5" r="1.4" fill={c} stroke="none" opacity="0.7" />
      <path d="M35.5 12c1.8.4 3.2 1.8 3.6 3.6" opacity="0.6" />
    </svg>
  );
}

export function IconWater(c: string) {
  // L'Eau — la Lune : intuition, émotions, marées du cœur.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 7c6.5 8 11 12.8 11 19a11 11 0 1 1-22 0c0-6.2 4.5-11 11-19Z" />
      <path d="M17.5 27.5c.8 4.2 4 6.8 7.6 7.2" opacity="0.55" />
      <path d="M9 42c2.4-1.8 4.2-1.8 6.6 0 2.4-1.8 4.2-1.8 6.6 0 2.4-1.8 4.2-1.8 6.6 0 2.4-1.8 4.2-1.8 6.6 0" opacity="0.5" />
    </svg>
  );
}

/* ————————————————————— Données des 4 Éléments ————————————————————— */

export const DICE_THEMES: DiceTheme[] = [
  {
    id: 'feu',
    label: { fr: 'Élément Feu', en: 'Fire Element' },
    element: 'Feu',
    sigil: { fr: 'Mars · ce qui embrase l’élan', en: 'Mars · what kindles the drive' },
    icon: IconFire,
    subs: [
      { fr: 'Un projet qui m’appelle', en: 'A project that calls me' },
      { fr: 'Oser le premier pas', en: 'Daring the first step' },
      { fr: 'Retrouver mon élan', en: 'Finding my drive again' },
      { fr: 'Confirmer ma voie', en: 'Confirming my path' },
      { fr: 'Traverser une épreuve', en: 'Crossing a trial' },
    ],
  },
  {
    id: 'terre',
    label: { fr: 'Élément Terre', en: 'Earth Element' },
    element: 'Terre',
    sigil: { fr: 'Le Taureau · ce qui ancre et fait croître', en: 'The Bull · what grounds and grows' },
    icon: IconEarth,
    subs: [
      { fr: 'Une décision matérielle', en: 'A material decision' },
      { fr: 'Ancrer un projet dans le réel', en: 'Anchoring a project in reality' },
      { fr: 'Travail, argent, foyer', en: 'Work, money, home' },
      { fr: 'Mettre de l’ordre', en: 'Putting things in order' },
      { fr: 'Récolter ce que j’ai semé', en: 'Reaping what I sowed' },
    ],
  },
  {
    id: 'air',
    label: { fr: 'Élément Air', en: 'Air Element' },
    element: 'Air',
    sigil: { fr: 'Mercure · ce qui relie les idées', en: 'Mercury · what links ideas' },
    icon: IconAir,
    subs: [
      { fr: 'Une décision à éclaircir', en: 'A decision to clarify' },
      { fr: 'Une conversation à mener', en: 'A conversation to hold' },
      { fr: 'Études et projets nouveaux', en: 'Studies and new projects' },
      { fr: 'Amitiés et liens', en: 'Friendships and ties' },
      { fr: 'Voir plus clair en moi', en: 'Seeing more clearly within' },
    ],
  },
  {
    id: 'eau',
    label: { fr: 'Élément Eau', en: 'Water Element' },
    element: 'Eau',
    sigil: { fr: 'La Lune · ce qui sent avant de savoir', en: 'The Moon · what feels before knowing' },
    icon: IconWater,
    subs: [
      { fr: 'Un lien qui me tient à cœur', en: 'A bond close to my heart' },
      { fr: 'Apaiser une émotion', en: 'Easing an emotion' },
      { fr: 'Écouter mon intuition', en: 'Listening to my intuition' },
      { fr: 'Une blessure à guérir', en: 'A wound to heal' },
      { fr: 'Amour et désir', en: 'Love and desire' },
    ],
  },
];

/* ————————————————————————— Utilitaire ————————————————————————— */

/** Composante « Élément — intention » comprise par parseDiceQuestion. */
export function composeDiceQuestion(theme: DiceTheme, sub: L, lang: 'fr' | 'en'): string {
  return `${theme.label[contentLang(lang)]} — ${sub[contentLang(lang)]}`;
}

/** Reconstruit { theme, sub } depuis la question composée
 *  « Élément — intention ». Renvoie null si la question n'est pas du sélecteur. */
export function parseDiceQuestion(question: string | null): { theme: DiceTheme; sub: string } | null {
  if (!question) return null;
  const sep = question.indexOf(' — ');
  if (sep === -1) return null;
  const head = question.slice(0, sep);
  const theme = DICE_THEMES.find((d) => d.label.fr === head || d.label.en === head);
  return theme ? { theme, sub: question.slice(sep + 3) } : null;
}

/* ————————————————————————— Composant ————————————————————————— */

export function DiceThemeSelector({ onConfirm }: { onConfirm: (question: string) => void }) {
  const lang = useLang();
  const [themeId, setThemeId] = useState<string | null>(null);
  const [subIdx, setSubIdx] = useState<number | null>(null);
  const subRef = useRef<HTMLDivElement>(null);

  const pickTheme = (id: string) => {
    setThemeId(id);
    setSubIdx(null);
    window.setTimeout(() => {
      subRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
  };

  const theme = DICE_THEMES.find((d) => d.id === themeId) ?? null;
  const ready = !!theme && subIdx !== null;

  const cast = () => {
    if (!theme || subIdx === null) return;
    onConfirm(`${theme.label[contentLang(lang)]} — ${theme.subs[subIdx][contentLang(lang)]}`);
  };

  return (
    <div
      className="ds-panel rounded-2xl px-4 pb-5 pt-4"
      style={{
        background: `linear-gradient(160deg, ${DICE_THEME.nightMid} 0%, ${DICE_THEME.brick} 60%, ${DICE_THEME.brickDeep} 100%)`,
        border: `1.5px solid ${DICE_THEME.gold}55`,
        boxShadow: '0 0 40px rgba(0,0,0,0.55), inset 0 0 40px rgba(20,36,90,0.35)',
      }}
    >
      {/* En-tête gravé */}
      <p className="text-center font-[family-name:var(--font-cinzel-deco)] text-[11px] tracking-[0.35em]" style={{ color: `${DICE_THEME.gold}99` }}>
        ☾ · <span className="ts-twinkle">✦</span> · ☼
      </p>
      <h2 className="mt-1 text-center font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: DICE_THEME.ocreLight }}>
        {lang === 'en' ? 'Choose your element' : 'Choisissez votre Élément'}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-center text-xs italic leading-relaxed" style={{ color: `${DICE_THEME.ocre}cc` }}>
        {lang === 'en'
          ? 'The dice answer a precise intention. Pick an element, then what speaks to you — the three dice will work on it.'
          : 'Les dés répondent à une intention précise. Choisissez un Élément, puis ce qui vous parle — les trois dés travailleront dessus.'}
      </p>

      {/* Les 4 Éléments — grille 2×2 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {DICE_THEMES.map((d) => {
          const sel = themeId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => pickTheme(d.id)}
              className={`group ds-tile relative flex flex-col items-center rounded-xl px-2 py-3 transition-transform active:scale-[0.97]${sel ? ' ds-tile-sel' : ''}`}
              style={{
                background: sel
                  ? `linear-gradient(165deg, ${DICE_THEME.steel} 0%, ${DICE_THEME.brick} 90%)`
                  : `linear-gradient(165deg, ${DICE_THEME.brick} 0%, ${DICE_THEME.brickDark} 90%)`,
                border: `1px solid ${sel ? DICE_THEME.gold : `${DICE_THEME.gold}40`}`,
                boxShadow: sel ? `0 0 22px ${DICE_THEME.gold}55` : 'none',
              }}
            >
              <span className="transition-transform duration-300 group-hover:scale-110">
                {d.icon(sel ? DICE_THEME.ocreLight : `${DICE_THEME.ocre}bb`)}
              </span>
              <span
                className="mt-1 font-[family-name:var(--font-cinzel-deco)] text-sm tracking-wide"
                style={{ color: sel ? DICE_THEME.ocreLight : `${DICE_THEME.ocre}dd` }}
              >
                {d.label[contentLang(lang)]}
              </span>
              <span
                className="mt-0.5 text-center text-[10px] italic leading-snug"
                style={{ color: `${DICE_THEME.ocre}99` }}
              >
                {d.sigil[contentLang(lang)]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Les intentions de l'Élément choisi */}
      <AnimatePresence>
        {theme && (
          <motion.div
            ref={subRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t pt-4" style={{ borderColor: `${DICE_THEME.gold}33` }}>
              <p
                className="mb-2 text-center font-[family-name:var(--font-cinzel-deco)] text-[11px] uppercase tracking-[0.25em]"
                style={{ color: `${DICE_THEME.gold}aa` }}
              >
                {lang === 'en' ? 'Your intention' : 'Votre intention'}
              </p>
              <div className="flex flex-col gap-2">
                {theme.subs.map((s, i) => {
                  const sel = subIdx === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSubIdx(i)}
                      className="rounded-lg px-3 py-2.5 text-left text-[13px] transition-all active:scale-[0.98]"
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                        background: sel
                          ? `linear-gradient(135deg, ${DICE_THEME.steel}cc 0%, ${DICE_THEME.brick} 100%)`
                          : `${DICE_THEME.gold}0d`,
                        border: `1px solid ${sel ? `${DICE_THEME.gold}88` : `${DICE_THEME.gold}2a`}`,
                        color: sel ? DICE_THEME.ocreLight : `${DICE_THEME.glyph}e6`,
                        boxShadow: sel ? `0 0 16px ${DICE_THEME.gold}44` : 'none',
                      }}
                    >
                      <span style={{ color: sel ? DICE_THEME.gold : `${DICE_THEME.gold}77` }} className="mr-2">
                        ✦
                      </span>
                      {s[contentLang(lang)]}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA vers le tirage */}
      <AnimatePresence>
        {theme && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <button
              type="button"
              onClick={cast}
              disabled={!ready}
              className="mystic-btn rounded-full px-6 py-2.5 font-[family-name:var(--font-cinzel-deco)] text-sm uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: ready
                  ? `linear-gradient(135deg, ${DICE_THEME.gold} 0%, ${DICE_THEME.ocre} 100%)`
                  : `${DICE_THEME.gold}22`,
                color: ready ? '#1a0e0a' : `${DICE_THEME.ocre}77`,
                boxShadow: ready ? `0 0 24px ${DICE_THEME.gold}66` : 'none',
              }}
            >
              {lang === 'en' ? 'Cast the dice' : 'Lancer les dés'}
            </button>
            {!ready && (
              <p className="mt-2 text-[11px] italic" style={{ color: `${DICE_THEME.ocre}88` }}>
                {lang === 'en' ? '…then choose an intention' : '…puis choisissez une intention'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
