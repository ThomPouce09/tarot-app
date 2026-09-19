'use client';

// ═══════════════════════════════════════════════════════════════════
// « 3 Cartes Simplifié » — sélecteur d'intention du Tarot.
// Même mécanique que /yi-jing-simplifie (4 domaines × 5 intentions),
// mais aux couleurs du Tarot : 4 arcanes-guides (Calice, Bâton, Épée,
// Roue — clin d'œil aux quatre suites majeures) sur marron bois & or.
// La question composée « Arcane — intention » est transmise à
// l'interprétation (Past/Present/Future) qui la lit dans l'en-tête.
// ═══════════════════════════════════════════════════════════════════

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang, contentLang } from '@/lib/i18n';

export interface L {
  fr: string;
  en: string;
}

export interface TarotTheme {
  id: string;
  label: L;
  arcane: string;
  sigil: L;
  icon: (c: string) => React.ReactNode;
  subs: L[];
}

/* Palette « boudoir tarotique » — charte de l'app : marron bois, bordeaux
   foncé et jaune d'or (mêmes tonalités que le hub /tarot et les tables). */
export const TAROT_NIGHT = {
  gold: '#DAA520',
  goldPale: '#F0C75E',
  ivory: '#F5EAD6',
  rose: '#E2B8AC',
  roseDim: '#B08778',
  panelTop: '#4A2C1A',
  panelMid: '#2A1408',
  panelDeep: '#180B05',
  tileIdleA: '#2E1A10',
  tileIdleB: '#1F1008',
  tileSelA: '#5A1E2A',
  wine: '#4A1931',
};

/* ————— Icônes des 4 arcanes-guides (line art doré, 48×48) ————— */

export function IconChalice(c: string) {
  // Le Calice (Coupes) — coupe, pied, anse évocée, goutte d'émotion.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 10h22c0 8.5-4.8 13.5-11 13.5S13 18.5 13 10Z" />
      <path d="M24 23.5V33" />
      <path d="M16.5 37.5c2.5-3.2 12.5-3.2 15 0" />
      <path d="M13.5 12.5c-3 1.2-3.2 4.6-.4 6M34.5 12.5c3 1.2 3.2 4.6.4 6" opacity="0.55" />
      <circle cx="24" cy="6.5" r="1.1" fill={c} stroke="none" />
    </svg>
  );
}

export function IconWand(c: string) {
  // Le Bâton fleuri (Wands) — baguette oblique, feuille, étoiles d'élan.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 38L31 12" />
      <path d="M31 12l2-2.5" opacity="0.7" />
      <path d="M20 25.5c-3.2-.6-5.4-2.8-6-6 3.2.6 5.4 2.8 6 6Z" opacity="0.8" />
      <path d="M25 19.5c.6-3.2 2.8-5.4 6-6-.6 3.2-2.8 5.4-6 6Z" opacity="0.8" />
      <path d="M36 7v5M33.5 9.5h5" opacity="0.9" />
      <path d="M13 14v3.5M11.2 15.8h3.6" opacity="0.55" />
    </svg>
  );
}

export function IconSword(c: string) {
  // L'Épée lumineuse (Swords) — lame, garde, pommeau ; ce qui tranche vrai.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 6l2.6 5.2L24 30l-2.6-18.8Z" />
      <path d="M16.5 30c4-2.4 11-2.4 15 0" />
      <path d="M24 30v8" />
      <circle cx="24" cy="40.5" r="1.9" />
      <path d="M31 14l3-1M17 14l-3-1" opacity="0.5" />
    </svg>
  );
}

export function IconWheel(c: string) {
  // La Roue de Fortune — rayons, jante, éclats du destin qui tourne.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="14" />
      <circle cx="24" cy="24" r="4" />
      <path d="M24 10v10M24 28v10M10 24h10M28 24h10" />
      <path d="M14 14l6 6M34 14l-6 6M14 34l6-6M34 34l-6-6" opacity="0.6" />
      <path d="M40 8l1.6 3.4L45 13l-3.4 1.6L40 18l-1.6-3.4L35 13l3.4-1.6Z" opacity="0.85" strokeWidth="1.2" />
    </svg>
  );
}

/* ————————————————————— Données des 4 arcanes ————————————————————— */

export const TAROT_THEMES: TarotTheme[] = [
  {
    id: 'coupes',
    label: { fr: 'Liens du Cœur', en: 'Bonds of the Heart' },
    arcane: 'Coupes',
    sigil: { fr: 'Le Calice · ce qui relie les cœurs', en: 'The Chalice · what binds hearts' },
    icon: IconChalice,
    subs: [
      { fr: 'Un lien qui me tient à cœur', en: 'A bond close to my heart' },
      { fr: 'Deux cœurs qui se cherchent', en: 'Two hearts searching for each other' },
      { fr: 'Raviver la flamme d’un couple', en: 'Rekindling a couple’s flame' },
      { fr: 'Apaiser un lien familial', en: 'Easing a family tie' },
      { fr: 'Oser dire ce que je ressens', en: 'Daring to say what I feel' },
    ],
  },
  {
    id: 'batons',
    label: { fr: 'Feu Créateur', en: 'Creative Fire' },
    arcane: 'Bâtons',
    sigil: { fr: 'Le Bâton fleuri · ce qui embrase l’élan', en: 'The Flowering Wand · what kindles momentum' },
    icon: IconWand,
    subs: [
      { fr: 'Un projet qui m’appelle', en: 'A project that calls me' },
      { fr: 'Retrouver mon élan', en: 'Finding my drive again' },
      { fr: 'Une vocation à confirmer', en: 'A calling to confirm' },
      { fr: 'Oser le premier pas', en: 'Daring the first step' },
      { fr: 'Traverser un passage à feu', en: 'Crossing a trial by fire' },
    ],
  },
  {
    id: 'epees',
    label: { fr: 'Clarté & Épreuves', en: 'Clarity & Trials' },
    arcane: 'Épées',
    sigil: { fr: 'L’Épée lumineuse · ce qui tranche le vrai', en: 'The Bright Sword · what cuts to the truth' },
    icon: IconSword,
    subs: [
      { fr: 'Une décision à trancher', en: 'A decision to cut through' },
      { fr: 'Une vérité qui dérange', en: 'A truth that disturbs' },
      { fr: 'Un conflit à désamorcer', en: 'A conflict to defuse' },
      { fr: 'Me libérer d’un poids mental', en: 'Freeing myself from a mental weight' },
      { fr: 'Y voir clair dans mes peurs', en: 'Seeing through my fears' },
    ],
  },
  {
    id: 'roue',
    label: { fr: 'Roue de la Fortune', en: 'Wheel of Fortune' },
    arcane: 'Roue',
    sigil: { fr: 'La Roue · ce qui tourne pour vous', en: 'The Wheel · what turns for you' },
    icon: IconWheel,
    subs: [
      { fr: 'Ce que l’année fait tourner', en: 'What the year is turning' },
      { fr: 'Abondance, travail, matière', en: 'Abundance, work, substance' },
      { fr: 'Un cycle qui s’achève', en: 'A cycle coming to a close' },
      { fr: 'Mes synchronicités, mon destin', en: 'My synchronicities, my fate' },
      { fr: 'Le rendez-vous que je n’ose pas nommer', en: 'The appointment I dare not name' },
    ],
  },
];

/* ————————————————————————— Utilitaire ————————————————————————— */

/** Composante « Arcane — intention » comprise par parseTarotQuestion. */
export function composeTarotQuestion(theme: TarotTheme, sub: L, lang: 'fr' | 'en'): string {
  return `${theme.label[contentLang(lang)]} — ${sub[contentLang(lang)]}`;
}

/** Reconstruit { theme, sub } depuis la question composée
 *  « Arcane — intention ». Renvoie null si la question n'est pas du sélecteur. */
export function parseTarotQuestion(question: string | null): { theme: TarotTheme; sub: string } | null {
  if (!question) return null;
  const sep = question.indexOf(' — ');
  if (sep === -1) return null;
  const head = question.slice(0, sep);
  const theme = TAROT_THEMES.find((d) => d.label.fr === head || d.label.en === head);
  return theme ? { theme, sub: question.slice(sep + 3) } : null;
}

/* ————————————————————————— Composant ————————————————————————— */

export function TarotThemeSelector({ onConfirm }: { onConfirm: (question: string) => void }) {
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

  const theme = TAROT_THEMES.find((d) => d.id === themeId) ?? null;
  const ready = !!theme && subIdx !== null;

  const cast = () => {
    if (!theme || subIdx === null) return;
    onConfirm(`${theme.label[contentLang(lang)]} — ${theme.subs[subIdx][contentLang(lang)]}`);
  };

  return (
    <div
      className="ts-panel rounded-2xl px-4 pb-5 pt-4"
      style={{
        background: `linear-gradient(160deg, ${TAROT_NIGHT.panelTop} 0%, ${TAROT_NIGHT.panelMid} 60%, ${TAROT_NIGHT.panelDeep} 100%)`,
        border: `1.5px solid ${TAROT_NIGHT.gold}55`,
        boxShadow: '0 0 40px rgba(0,0,0,0.55), inset 0 0 40px rgba(74,25,49,0.35)',
      }}
    >
      {/* En-tête gravé */}
      <p className="text-center font-[family-name:var(--font-cinzel-deco)] text-[11px] tracking-[0.35em]" style={{ color: `${TAROT_NIGHT.gold}99` }}>
        ☾ · <span className="ts-twinkle">✦</span> · ☼
      </p>
      <h2 className="mt-1 text-center font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: TAROT_NIGHT.gold }}>
        {lang === 'en' ? 'Choose your guide-arcana' : 'Choisissez votre arcane-guide'}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-center text-xs italic leading-relaxed" style={{ color: TAROT_NIGHT.roseDim }}>
        {lang === 'en'
          ? 'The Tarot answers a precise intention. Pick an arcana, then what speaks to you — the three cards will work on it.'
          : 'Le Tarot répond à une intention précise. Choisissez un arcane, puis ce qui vous parle — les trois cartes travailleront dessus.'}
      </p>

      {/* Les 4 arcanes — grille 2×2 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {TAROT_THEMES.map((d) => {
          const sel = themeId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => pickTheme(d.id)}
              className={`group ts-tile relative flex flex-col items-center rounded-xl px-2 py-3 transition-transform active:scale-[0.97]${sel ? ' ts-tile-sel' : ''}`}
              style={{
                background: sel
                  ? `linear-gradient(165deg, ${TAROT_NIGHT.tileSelA} 0%, ${TAROT_NIGHT.panelMid} 90%)`
                  : `linear-gradient(165deg, ${TAROT_NIGHT.tileIdleA} 0%, ${TAROT_NIGHT.tileIdleB} 90%)`,
                border: `1px solid ${sel ? TAROT_NIGHT.gold : `${TAROT_NIGHT.gold}2e`}`,
                boxShadow: sel ? `0 0 22px rgba(218,165,32,0.35), 0 0 34px rgba(74,25,49,0.55), inset 0 0 18px ${TAROT_NIGHT.gold}12` : 'none',
              }}
            >
              <span style={{ filter: sel ? 'drop-shadow(0 0 8px rgba(218,165,32,0.5))' : 'none' }}>
                {d.icon(sel ? TAROT_NIGHT.gold : `${TAROT_NIGHT.gold}b3`)}
              </span>
              <span className="mt-1.5 text-center font-[family-name:var(--font-cinzel-deco)] text-[13px] leading-tight" style={{ color: sel ? TAROT_NIGHT.gold : `${TAROT_NIGHT.gold}cc` }}>
                {d.label[contentLang(lang)]}
              </span>
              <span className="mt-0.5 text-center text-[9.5px] italic leading-tight" style={{ color: sel ? TAROT_NIGHT.rose : `${TAROT_NIGHT.roseDim}99` }}>
                {lang === 'en' ? `${d.arcane} suit · ` : `Suite ${d.arcane} · `}{d.sigil[contentLang(lang)].split('· ')[1]}
              </span>
              {sel && (
                <span className="ts-twinkle absolute right-2 top-2 text-[10px]" style={{ color: TAROT_NIGHT.gold }}>✦</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Intentions de l'arcane choisi */}
      <AnimatePresence initial={false}>
        {theme && (
          <motion.div
            key="subs"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div ref={subRef} className="mt-4 rounded-xl px-3 py-3" style={{ background: 'rgba(14,7,4,0.65)', border: `1px solid ${TAROT_NIGHT.gold}33`, boxShadow: 'inset 0 0 22px rgba(0,0,0,0.45)' }}>
              <div className="flex items-center justify-between">
                <p className="font-[family-name:var(--font-cinzel-deco)] text-[12px] tracking-widest" style={{ color: TAROT_NIGHT.goldPale }}>
                  {lang === 'en' ? 'What shall the cards examine?' : 'Que souhaitez-vous interroger ?'}
                </p>
                <button type="button" onClick={() => { setThemeId(null); setSubIdx(null); }} className="text-[10px] underline-offset-2 hover:underline" style={{ color: `${TAROT_NIGHT.roseDim}bb` }}>
                  {lang === 'en' ? 'Change arcana' : 'Changer d’arcane'}
                </button>
              </div>
              <ul className="mt-2 space-y-1">
                {theme.subs.map((s, i) => {
                  const sel = subIdx === i;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setSubIdx(i)}
                        className="ts-sub-item flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                        style={{ background: sel ? 'rgba(90,30,42,0.55)' : 'transparent', animationDelay: `${i * 60}ms` }}
                      >
                        <span className={`mt-[3px] text-[8px]${sel ? ' ts-twinkle' : ''}`} style={{ color: sel ? TAROT_NIGHT.gold : `${TAROT_NIGHT.gold}55` }}>✦</span>
                        <span className="text-[12.5px] leading-snug" style={{ color: sel ? TAROT_NIGHT.gold : TAROT_NIGHT.rose }}>
                          {s[contentLang(lang)]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA — pilule dorée (charte tarot) */}
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={cast}
          disabled={!ready}
          className={`ts-cast-glow rounded-full px-8 py-2.5 font-[family-name:var(--font-cinzel-deco)] text-[15px] tracking-wide transition-transform active:scale-[0.97]${ready ? ' ts-cast-ready' : ''}`}
          style={{
            background: ready
              ? 'linear-gradient(135deg, #E8B84B 0%, #C9962E 55%, #E8B84B 100%)'
              : 'linear-gradient(135deg, #4a3a20 0%, #2e2413 55%, #4a3a20 100%)',
            color: ready ? '#2a1808' : '#8a7a5a',
            border: `1.5px solid ${ready ? '#DAA520' : '#DAA52033'}`,
            boxShadow: ready ? '0 0 18px rgba(218,165,32,0.45), inset 0 0 10px rgba(255,240,200,0.25)' : '0 0 14px rgba(218,165,32,0.22), inset 0 0 8px rgba(255,240,200,0.08)',
            cursor: ready ? 'pointer' : 'default',
          }}
        >
          {lang === 'en' ? 'Consult the Tarot' : 'Interroger le Tarot'}
        </button>
        {!ready && (
          <p className="mt-2 text-[10px] italic" style={{ color: `${TAROT_NIGHT.roseDim}88` }}>
            {lang === 'en' ? 'Pick an arcana, then an intention.' : 'Choisissez un arcane puis une intention.'}
          </p>
        )}
      </div>
    </div>
  );
}
