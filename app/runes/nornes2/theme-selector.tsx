'use client';

// app/runes/nornes2/theme-selector.tsx
// Remplace la question libre sur /nornes2 : le consultant choisit un DOMAINE
// (4 tuiles, chacune placée sous la garde d'une divinité nordique) puis UN
// sous-thème dans la liste. La question composée (« Domaine — intention »)
// est transmise au scatter, à l'IA et à l'historique : l'Oracle travaille sur
// une question générique, sans champ de précision. Icônes SVG inline
// uniquement (règle projet : pas d'emoji).

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang, useT } from '@/lib/i18n';
import { RUNE_THEME, RuneButton } from '../_shared';

type L = { fr: string; en: string };

interface RuneDomain {
  id: string;
  label: L;
  deity: string;      // nom de la divinité gardienne
  realm: L;           // son domaine mythologique (clin d'œil)
  icon: (c: string) => JSX.Element;
  subs: L[];
}

/* ———————————————————————————— Icônes (traits dorés, style gravure) ——— */

function IconFreyja(c: string) {
  // Cœur entrelacé (style Urnes) — Freyja, déesse de l'amour et des liens choisis.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 39C13.5 31.5 8.5 23 11.5 16.5C14 11.2 20.8 11.8 24 17.5C27.2 11.8 34 11.2 36.5 16.5C39.5 23 34.5 31.5 24 39Z" />
      <circle cx="24" cy="26.5" r="4.6" opacity="0.85" />
      <path d="M24 17.5V21.9M24 31.1V39" opacity="0.5" />
    </svg>
  );
}

function IconFreyr(c: string) {
  // Épi de blé — Freyr, dieu de la lumière qui fait croître l'effort.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 42V13" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <path d={`M24 ${17 + i * 6}C20.5 ${15 + i * 6} 17.5 ${12 + i * 6} 17.5 ${9 + i * 6}C21 ${10 + i * 6} 23.5 ${13 + i * 6} 24 ${17 + i * 6}Z`} />
          <path d={`M24 ${17 + i * 6}C27.5 ${15 + i * 6} 30.5 ${12 + i * 6} 30.5 ${9 + i * 6}C27 ${10 + i * 6} 24.5 ${13 + i * 6} 24 ${17 + i * 6}Z`} />
        </g>
      ))}
      <path d="M24 13C23.4 9.6 24.6 7.4 24 5" />
    </svg>
  );
}

function IconNjord(c: string) {
  // Drakkar sur les vagues — Njörðr, dieu des richesses qui reviennent au port.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 27Q24 35 40 27" />
      <path d="M8 27Q5.5 21.5 9.5 19" />
      <path d="M40 27Q42.5 21.5 38.5 19" />
      <path d="M24 27V11" />
      <path d="M16 12h16v9H16z" opacity="0.9" />
      <path d="M24 11l4-3" opacity="0.7" />
      <path d="M9 39q3-2.4 6 0t6 0t6 0t6 0" opacity="0.75" />
    </svg>
  );
}

function IconHeimdall(c: string) {
  // Bifröst, l'arc-en-ciel gardé par Heimdallr — les chemins et le destin.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 35A18 18 0 0 1 42 35" />
      <path d="M11.5 35A12.5 12.5 0 0 1 36.5 35" opacity="0.85" />
      <path d="M17 35A7 7 0 0 1 31 35" opacity="0.7" />
      <path d="M4 39h40" opacity="0.55" />
      <circle cx="24" cy="12.5" r="1.4" fill={c} stroke="none" opacity="0.9" />
    </svg>
  );
}

/* ———————————————————————————— Données des 4 domaines ————————————————— */

export const RUNE_DOMAINS: RuneDomain[] = [
  {
    id: 'amour',
    label: { fr: 'Amour & Liens', en: 'Love & Bonds' },
    deity: 'Freyja',
    realm: { fr: 'Fólkvangr — le champ des âmes choisies', en: 'Fólkvangr — the field of chosen souls' },
    icon: IconFreyja,
    subs: [
      { fr: 'Un couple qui traverse une zone de doute', en: 'A couple going through doubtful times' },
      { fr: 'Une relation qui pourrait naître', en: 'A relationship that could blossom' },
      { fr: 'Retrouvailles avec un(e) ex', en: 'A reunion with an ex' },
      { fr: 'Ma solitude, et la voie pour en sortir', en: 'My loneliness, and the way out' },
      { fr: 'Des liens familiaux à apaiser', en: 'Family bonds to heal' },
    ],
  },
  {
    id: 'travail',
    label: { fr: 'Travail & Mission', en: 'Work & Calling' },
    deity: 'Freyr',
    realm: { fr: 'Álfheimr — la lumière qui fait croître', en: 'Álfheimr — the light that makes things grow' },
    icon: IconFreyr,
    subs: [
      { fr: 'Une reconversion, un nouveau cap', en: 'A career change, a new course' },
      { fr: 'Un projet à lancer', en: 'A project to launch' },
      { fr: 'Ambiances lourdes : hiérarchie, collègues', en: 'Heavy workplace dynamics' },
      { fr: 'Examens, concours, validation', en: 'Exams, competitions, approval' },
      { fr: 'Rester ou partir', en: 'To stay or to go' },
    ],
  },
  {
    id: 'argent',
    label: { fr: 'Argent & Abondance', en: 'Money & Abundance' },
    deity: 'Njörðr',
    realm: { fr: 'Nóatún — le navire des richesses', en: 'Nóatún — the ship of riches' },
    icon: IconNjord,
    subs: [
      { fr: 'Mes finances au quotidien', en: 'My day-to-day finances' },
      { fr: 'Un investissement, un achat important', en: 'An investment, a major purchase' },
      { fr: 'Des dettes à dénouer', en: 'Debts to untangle' },
      { fr: 'Une chance à saisir, des revenus inattendus', en: 'An opportunity, unexpected income' },
      { fr: 'Un contrat, un partenariat à signer', en: 'A contract or partnership to sign' },
    ],
  },
  {
    id: 'destin',
    label: { fr: 'Route & Destin', en: 'Path & Destiny' },
    deity: 'Heimdallr',
    realm: { fr: 'Himinbjörg — la garde des chemins', en: 'Himinbjörg — the watch over roads' },
    icon: IconHeimdall,
    subs: [
      { fr: 'Une décision qui pèse', en: 'A weighty decision' },
      { fr: 'Un déménagement, un voyage', en: 'A move, a journey' },
      { fr: 'Ma voie intérieure, mon éveil', en: 'My inner path, my awakening' },
      { fr: 'L’énergie des mois à venir', en: 'The energy of the coming months' },
      { fr: 'Un passage important de ma vie', en: 'A major rite of passage' },
    ],
  },
];

/* ————————————————————————————— Composant ————————————————————————————— */

export function ThemeSelector({ onConfirm }: { onConfirm: (question: string) => void }) {
  const t = useT();
  const lang = useLang();
  const [domainId, setDomainId] = useState<string | null>(null);
  const [subIdx, setSubIdx] = useState<number | null>(null);
  const subRef = useRef<HTMLDivElement>(null);

  // Un domaine choisi : on déroule les sous-thèmes ET on y amène le focus
  // (le temps que le panneau se déplie, ~0,35 s).
  const pickDomain = (id: string) => {
    setDomainId(id);
    setSubIdx(null);
    window.setTimeout(() => {
      subRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
  };

  const domain = RUNE_DOMAINS.find((d) => d.id === domainId) ?? null;
  const ready = !!domain && subIdx !== null;

  const weave = () => {
    if (!domain || subIdx === null) return;
    // Question générique : « Domaine — intention », rien de plus.
    onConfirm(`${domain.label[lang]} — ${domain.subs[subIdx][lang]}`);
  };

  return (
    <div
      className="rounded-2xl px-4 pb-5 pt-4"
      style={{
        background: `linear-gradient(160deg, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.forestDeep} 60%, #06120b 100%)`,
        border: `1.5px solid ${RUNE_THEME.goldPale}55`,
        boxShadow: `0 0 40px rgba(0,0,0,0.5), inset 0 0 40px ${RUNE_THEME.forestMid}2e`,
      }}
    >
      {/* En-tête gravé */}
      <p className="text-center font-[family-name:var(--font-cinzel-deco)] text-[11px] tracking-[0.35em]" style={{ color: `${RUNE_THEME.goldPale}99` }}>
        ᚠ · ᚢ · ᚦ
      </p>
      <h2 className="mt-1 text-center font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: RUNE_THEME.goldPale }}>
        {t('runes.nornes2.themeTitle')}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-center text-xs italic leading-relaxed" style={{ color: RUNE_THEME.sage }}>
        {t('runes.nornes2.themeSubtitle')}
      </p>

      {/* Les 4 domaines — grille 2×2 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {RUNE_DOMAINS.map((d) => {
          const sel = domainId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => pickDomain(d.id)}
              className="group relative flex flex-col items-center rounded-xl px-2 py-3 transition-transform active:scale-[0.97]"
              style={{
                background: sel
                  ? `linear-gradient(165deg, ${RUNE_THEME.forestMid}66 0%, ${RUNE_THEME.forestDeep} 90%)`
                  : `linear-gradient(165deg, ${RUNE_THEME.forest}55 0%, ${RUNE_THEME.ink}88 90%)`,
                border: `1px solid ${sel ? RUNE_THEME.goldPale : `${RUNE_THEME.goldPale}2e`}`,
                boxShadow: sel ? `0 0 22px ${RUNE_THEME.goldGlow}, inset 0 0 18px ${RUNE_THEME.goldPale}14` : 'none',
              }}
            >
              <span style={{ filter: sel ? `drop-shadow(0 0 8px ${RUNE_THEME.goldGlow})` : 'none' }}>
                {d.icon(sel ? RUNE_THEME.goldPale : `${RUNE_THEME.goldPale}b3`)}
              </span>
              <span className="mt-1.5 text-center font-[family-name:var(--font-cinzel-deco)] text-[13px] leading-tight" style={{ color: sel ? RUNE_THEME.goldPale : `${RUNE_THEME.goldPale}cc` }}>
                {d.label[lang]}
              </span>
              <span className="mt-0.5 text-center text-[9.5px] italic leading-tight" style={{ color: sel ? RUNE_THEME.sagePale : `${RUNE_THEME.sage}99` }}>
                {d.deity} · {d.realm[lang]}
              </span>
              {sel && (
                <span className="absolute right-2 top-2 text-[10px]" style={{ color: RUNE_THEME.goldPale }}>◆</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sous-thèmes du domaine choisi */}
      <AnimatePresence initial={false}>
        {domain && (
          <motion.div
            key="subs"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div ref={subRef} className="mt-4 rounded-xl px-3 py-3" style={{ background: `${RUNE_THEME.ink}99`, border: `1px solid ${RUNE_THEME.goldPale}22` }}>
              <div className="flex items-center justify-between">
                <p className="font-[family-name:var(--font-cinzel-deco)] text-[12px] tracking-widest" style={{ color: RUNE_THEME.goldSoft }}>
                  {t('runes.nornes2.subTitle')}
                </p>
                <button type="button" onClick={() => { setDomainId(null); setSubIdx(null); }} className="text-[10px] underline-offset-2 hover:underline" style={{ color: `${RUNE_THEME.sage}bb` }}>
                  {t('runes.nornes2.changeTheme')}
                </button>
              </div>
              <ul className="mt-2 space-y-1">
                {domain.subs.map((s, i) => {
                  const sel = subIdx === i;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setSubIdx(i)}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
                        style={{ background: sel ? `${RUNE_THEME.forestMid}55` : 'transparent' }}
                      >
                        <span className="mt-[3px] text-[8px]" style={{ color: sel ? RUNE_THEME.goldPale : `${RUNE_THEME.goldPale}55` }}>◆</span>
                        <span className="text-[12.5px] leading-snug" style={{ color: sel ? RUNE_THEME.goldPale : RUNE_THEME.stone }}>
                          {s[lang]}
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

      {/* CTA — pilule teal glossée (variante « save ») */}
      <div className="mt-5 text-center">
        <RuneButton variant="save" onClick={weave} disabled={!ready}>
          {t('runes.nornes2.weave')}
        </RuneButton>
        {!ready && (
          <p className="mt-2 text-[10px] italic" style={{ color: `${RUNE_THEME.sage}88` }}>
            {t('runes.nornes2.weaveHint')}
          </p>
        )}
      </div>
    </div>
  );
}
