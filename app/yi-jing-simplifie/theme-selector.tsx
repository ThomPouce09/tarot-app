'use client';

// app/yi-jing-simplifie/theme-selector.tsx
// Mécanique du Fil des Nornes (nornes2) transposée au Yi Jing : le consultant
// choisit un DOMAINE (4 tuiles, chacune placée sous la garde d'un des quatre
// Animaux symboliques du ciel chinois — direction + saison) puis UN sous-thème.
// La question composée (« Domaine — intention ») est transmise au tirage des
// achillées, à l'IA et à l'historique. Habillage laque noire/rouge + or fin,
// cohérent avec la vidéo de fond de /yi-jing-simple. Icônes SVG inline
// uniquement (règle projet : pas d'emoji).

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '@/lib/i18n';

type L = { fr: string; en: string };

export interface YiDomain {
  id: string;
  label: L;
  guardian: string; // nom du gardien (pinyin)
  realm: L;         // direction + saison (clin d'œil mythologique)
  icon: (c: string) => JSX.Element;
  subs: L[];
}

/* ———————————————————— Palette laque / or (charte Yi Jing) ——————————————————— */

export const YI_LACQUER = {
  panelDeep: '#0d0609',
  panelMid: '#140a0e',
  panelTop: '#241014',
  tileIdleA: 'rgba(92,15,22,0.35)',
  tileIdleB: 'rgba(10,5,7,0.9)',
  tileSelA: 'rgba(142,28,34,0.45)',
  gold: '#F3C969',
  goldSoft: '#E8B84B',
  lilac: '#F5EAD6',
  lilacDim: '#c9b28a',
};

/* —————————————————— Icônes (traits dorés, style gravure) —————————————————— */

// Icônes des 4 gardiens — exportées pour le bandeau « Domaine & intention »
// de la page d'interprétation (app/interpret/[type]).
export function IconDragon(c: string) {
  // Qinglong — dragon bleu de l'Est : corps sinueux, crête, barbillons.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 36C9 28 15 26 20 28C25 30 31 28 31 22C31 16 25 14 21 17" />
      <path d="M21 17C18.5 13.5 20 9.5 24.5 8.5C29 7.5 32.5 10.5 31.5 14.5" />
      <path d="M24.5 8.5C24 6 25.5 4.5 28 4.5" />
      <circle cx="27.5" cy="11.5" r="1" fill={c} stroke="none" />
      <path d="M31.5 14.5C34 15 35.5 17 35 19.5" />
      <path d="M21 28C19 31 19.5 34 22 36.5" />
      <path d="M9 36C7.5 38 7.5 40.5 9 42" />
      <path d="M14 30.5l-3.5-1.5M17.5 27.5l-2-3" opacity="0.6" />
    </svg>
  );
}

export function IconBird(c: string) {
  // Zhuque — oiseau vermillon du Sud : phénix crêté, aile et queue déployées.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 10C27 8 24 8.5 22.5 11C21 13.5 22 16.5 25 18" />
      <circle cx="27.5" cy="12" r="1" fill={c} stroke="none" />
      <path d="M30 10l4-2.5M31.5 12.5l4.5-0.5" opacity="0.7" />
      <path d="M25 18C19 20 15 25 15 31C15 36 18.5 39.5 24 40C30 40.5 35 37 36.5 31.5" />
      <path d="M22 24C17 24 13 21.5 11 17.5C15 18 19 19.5 22 24Z" opacity="0.9" />
      <path d="M36.5 31.5C39 33 41 36 40.5 39.5C38 38 35.5 37 33.5 37.5" opacity="0.85" />
      <path d="M15 31C12 32 9.5 34.5 8.5 38" opacity="0.7" />
    </svg>
  );
}

export function IconTiger(c: string) {
  // Baihu — tigre blanc de l'Ouest : tête rayée, museau et moustaches.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14C10.5 10.5 11 8 13.5 7.5C16 7 18 9 19 11.5" />
      <path d="M36 14C37.5 10.5 37 8 34.5 7.5C32 7 30 9 29 11.5" />
      <path d="M12 14C10 18 9.5 23 11 27C13 33.5 18.5 38 24 38C29.5 38 35 33.5 37 27C38.5 23 38 18 36 14C33 11.5 29 10.5 24 10.5C19 10.5 15 11.5 12 14Z" />
      <circle cx="19" cy="21" r="1.1" fill={c} stroke="none" />
      <circle cx="29" cy="21" r="1.1" fill={c} stroke="none" />
      <path d="M24 25.5l-1.8 2h3.6L24 25.5Z" />
      <path d="M24 27.5V30M24 30c-1.5 1.8-4 1.8-5.5 0.3M24 30c1.5 1.8 4 1.8 5.5 0.3" opacity="0.85" />
      <path d="M15 16.5l2.5 2M33 16.5l-2.5 2M13.5 24h3.5M34.5 24H31" opacity="0.65" />
      <path d="M11 27l-4 1.5M11.5 30l-4 3M37 27l4 1.5M36.5 30l4 3" opacity="0.55" />
    </svg>
  );
}

export function IconWarrior(c: string) {
  // Xuanwu — guerrier noir du Nord : tortue nouée au serpent.
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 27C13 20.5 18 16 24 16C30 16 35 20.5 35 27" />
      <path d="M13 27h22" />
      <path d="M16.5 27c0.5-4.5 3.5-7.5 7.5-7.5s7 3 7.5 7.5" opacity="0.6" />
      <path d="M24 16v11" opacity="0.5" />
      <path d="M17 19.5l14 5M31 19.5l-14 5" opacity="0.4" />
      <path d="M15 27l-2.5 4M33 27l2.5 4" />
      <path d="M10 33C14 36.5 20 38 25.5 36.5C31 35 35.5 36 38 39.5" />
      <path d="M38 39.5c1.8 2.2 1 4.5-1.5 4.8c-2 0.2-3.3-1.2-2.8-3" opacity="0.9" />
      <circle cx="36.8" cy="41.6" r="0.8" fill={c} stroke="none" />
    </svg>
  );
}

/* ————————————————————— Données des 4 domaines ————————————————————— */

export const YI_DOMAINS: YiDomain[] = [
  {
    id: 'commencements',
    label: { fr: 'Commencements & Projets', en: 'Beginnings & Projects' },
    guardian: 'Qinglong',
    realm: { fr: 'Dragon bleu de l’Est · le printemps — ce qui germe', en: 'Azure Dragon of the East · spring — what germs' },
    icon: IconDragon,
    subs: [
      { fr: 'Lancer un projet', en: 'Launching a project' },
      { fr: 'Une reconversion, un nouveau cap', en: 'A career change, a new course' },
      { fr: 'Études, examens, validation', en: 'Studies, exams, approval' },
      { fr: 'Une relation qui s’ébauche', en: 'A relationship taking shape' },
      { fr: 'Ouvrir ou fermer une porte', en: 'Opening or closing a door' },
    ],
  },
  {
    id: 'liens',
    label: { fr: 'Liens & Rayonnement', en: 'Bonds & Radiance' },
    guardian: 'Zhuque',
    realm: { fr: 'Oiseau vermillon du Sud · l’été — ce qui brille', en: 'Vermilion Bird of the South · summer — what shines' },
    icon: IconBird,
    subs: [
      { fr: 'Un couple qui traverse une zone de doute', en: 'A couple going through doubtful times' },
      { fr: 'Une relation qui pourrait naître', en: 'A relationship that could blossom' },
      { fr: 'Des liens familiaux à apaiser', en: 'Family bonds to heal' },
      { fr: 'Ma visibilité, ma reconnaissance', en: 'My visibility, my recognition' },
      { fr: 'Ma solitude, et la voie pour en sortir', en: 'My loneliness, and the way out' },
    ],
  },
  {
    id: 'recoltes',
    label: { fr: 'Récoltes & Tranchés', en: 'Harvest & Cutting' },
    guardian: 'Baihu',
    realm: { fr: 'Tigre blanc de l’Ouest · l’automne — ce qui trie', en: 'White Tiger of the West · autumn — what is sorted' },
    icon: IconTiger,
    subs: [
      { fr: 'Mes finances au quotidien', en: 'My day-to-day finances' },
      { fr: 'Un investissement, un achat important', en: 'An investment, a major purchase' },
      { fr: 'Des dettes à dénouer', en: 'Debts to untangle' },
      { fr: 'Un contrat, un partenariat à signer', en: 'A contract or partnership to sign' },
      { fr: 'Rester ou partir : la décision qui pèse', en: 'To stay or to go: the weighty decision' },
    ],
  },
  {
    id: 'voie',
    label: { fr: 'Voie intérieure & Temps', en: 'Inner Path & Time' },
    guardian: 'Xuanwu',
    realm: { fr: 'Guerrier noir du Nord · l’hiver — ce qui garde', en: 'Black Warrior of the North · winter — what keeps' },
    icon: IconWarrior,
    subs: [
      { fr: 'Ma voie intérieure, mon éveil', en: 'My inner path, my awakening' },
      { fr: 'L’énergie des mois à venir', en: 'The energy of the coming months' },
      { fr: 'Un déménagement, un voyage', en: 'A move, a journey' },
      { fr: 'Un passage important de ma vie', en: 'A major rite of passage' },
      { fr: 'Écouter mon intuition, mes rêves', en: 'Listening to my intuition, my dreams' },
    ],
  },
];

/* ————————————————————————— Composant ————————————————————————— */

/** Reconstruit { domaine, intention } depuis la question composée
 *  « Domaine — intention » — sert au bandeau d'en-tête de la page
 *  d'interprétation. Renvoie null si la question n'est pas du sélecteur. */
export function parseYiQuestion(question: string | null): { domain: YiDomain; sub: string } | null {
  if (!question) return null;
  const sep = question.indexOf(' — ');
  if (sep === -1) return null;
  const head = question.slice(0, sep);
  const domain = YI_DOMAINS.find((d) => d.label.fr === head || d.label.en === head);
  return domain ? { domain, sub: question.slice(sep + 3) } : null;
}

export function YiThemeSelector({ onConfirm }: { onConfirm: (question: string) => void }) {
  const lang = useLang();
  const [domainId, setDomainId] = useState<string | null>(null);
  const [subIdx, setSubIdx] = useState<number | null>(null);
  const subRef = useRef<HTMLDivElement>(null);

  const pickDomain = (id: string) => {
    setDomainId(id);
    setSubIdx(null);
    window.setTimeout(() => {
      subRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
  };

  const domain = YI_DOMAINS.find((d) => d.id === domainId) ?? null;
  const ready = !!domain && subIdx !== null;

  const cast = () => {
    if (!domain || subIdx === null) return;
    onConfirm(`${domain.label[lang]} — ${domain.subs[subIdx][lang]}`);
  };

  return (
    <div
      className="rounded-2xl px-4 pb-5 pt-4"
      style={{
        background: `linear-gradient(160deg, ${YI_LACQUER.panelTop} 0%, ${YI_LACQUER.panelMid} 60%, ${YI_LACQUER.panelDeep} 100%)`,
        border: `1.5px solid ${YI_LACQUER.gold}55`,
        boxShadow: '0 0 40px rgba(0,0,0,0.55), inset 0 0 40px rgba(142,28,34,0.16)',
      }}
    >
      {/* En-tête gravé */}
      <p className="text-center font-[family-name:var(--font-cinzel-deco)] text-[11px] tracking-[0.35em]" style={{ color: `${YI_LACQUER.gold}99` }}>
        ☰ · ☱ · ☲
      </p>
      <h2 className="mt-1 text-center font-[family-name:var(--font-cinzel-deco)] text-lg" style={{ color: YI_LACQUER.gold }}>
        {lang === 'en' ? 'Choose your intention' : 'Choisissez votre intention'}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-center text-xs italic leading-relaxed" style={{ color: YI_LACQUER.lilacDim }}>
        {lang === 'en'
          ? 'The I Ching answers a precise question. Pick a domain, then the intention that speaks to you — the yarrow stalks will work on it.'
          : 'Le Yi Jing répond à une question précise. Choisissez un domaine, puis l’intention qui vous parle — les achillées travailleront dessus.'}
      </p>

      {/* Les 4 domaines — grille 2×2 */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {YI_DOMAINS.map((d) => {
          const sel = domainId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => pickDomain(d.id)}
              className="group relative flex flex-col items-center rounded-xl px-2 py-3 transition-transform active:scale-[0.97]"
              style={{
                background: sel
                  ? `linear-gradient(165deg, ${YI_LACQUER.tileSelA} 0%, ${YI_LACQUER.panelMid} 90%)`
                  : `linear-gradient(165deg, ${YI_LACQUER.tileIdleA} 0%, ${YI_LACQUER.tileIdleB} 90%)`,
                border: `1px solid ${sel ? YI_LACQUER.gold : `${YI_LACQUER.gold}2e`}`,
                boxShadow: sel ? `0 0 22px rgba(243,201,105,0.35), inset 0 0 18px ${YI_LACQUER.gold}14` : 'none',
              }}
            >
              <span style={{ filter: sel ? 'drop-shadow(0 0 8px rgba(243,201,105,0.45))' : 'none' }}>
                {d.icon(sel ? YI_LACQUER.gold : `${YI_LACQUER.gold}b3`)}
              </span>
              <span className="mt-1.5 text-center font-[family-name:var(--font-cinzel-deco)] text-[13px] leading-tight" style={{ color: sel ? YI_LACQUER.gold : `${YI_LACQUER.gold}cc` }}>
                {d.label[lang]}
              </span>
              <span className="mt-0.5 text-center text-[9.5px] italic leading-tight" style={{ color: sel ? YI_LACQUER.lilac : `${YI_LACQUER.lilacDim}99` }}>
                {d.guardian} · {d.realm[lang]}
              </span>
              {sel && (
                <span className="absolute right-2 top-2 text-[10px]" style={{ color: YI_LACQUER.gold }}>◆</span>
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
            <div ref={subRef} className="mt-4 rounded-xl px-3 py-3" style={{ background: 'rgba(8,4,16,0.6)', border: `1px solid ${YI_LACQUER.gold}22` }}>
              <div className="flex items-center justify-between">
                <p className="font-[family-name:var(--font-cinzel-deco)] text-[12px] tracking-widest" style={{ color: YI_LACQUER.goldSoft }}>
                  {lang === 'en' ? 'What shall the stalks examine?' : 'Que souhaitez-vous interroger ?'}
                </p>
                <button type="button" onClick={() => { setDomainId(null); setSubIdx(null); }} className="text-[10px] underline-offset-2 hover:underline" style={{ color: `${YI_LACQUER.lilacDim}bb` }}>
                  {lang === 'en' ? 'Change domain' : 'Changer de domaine'}
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
                        style={{ background: sel ? 'rgba(142,28,34,0.35)' : 'transparent' }}
                      >
                        <span className="mt-[3px] text-[8px]" style={{ color: sel ? YI_LACQUER.gold : `${YI_LACQUER.gold}55` }}>◆</span>
                        <span className="text-[12.5px] leading-snug" style={{ color: sel ? YI_LACQUER.gold : YI_LACQUER.lilac }}>
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

      {/* CTA — pilule dorée (charte Yi Jing) */}
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={cast}
          disabled={!ready}
          className="rounded-full px-8 py-2.5 font-[family-name:var(--font-cinzel-deco)] text-[15px] tracking-wide transition-transform active:scale-[0.97]"
          style={{
            background: ready
              ? 'linear-gradient(135deg, #E8B84B 0%, #C9962E 55%, #E8B84B 100%)'
              : 'linear-gradient(135deg, #4a3a20 0%, #2e2413 55%, #4a3a20 100%)',
            color: ready ? '#2a1808' : '#8a7a5a',
            border: `1.5px solid ${ready ? '#F3C969' : '#F3C96933'}`,
            boxShadow: ready ? '0 0 18px rgba(218,165,32,0.45), inset 0 0 10px rgba(255,240,200,0.25)' : 'none',
            cursor: ready ? 'pointer' : 'default',
          }}
        >
          {lang === 'en' ? 'Consult the Yi Jing' : 'Interroger le Yi Jing'}
        </button>
        {!ready && (
          <p className="mt-2 text-[10px] italic" style={{ color: `${YI_LACQUER.lilacDim}88` }}>
            {lang === 'en' ? 'Pick a domain, then an intention.' : 'Choisissez un domaine puis une intention.'}
          </p>
        )}
      </div>
    </div>
  );
}
