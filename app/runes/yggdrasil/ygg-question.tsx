'use client';

// app/runes/yggdrasil/ygg-question.tsx — La modale de la question (Yggdrasil).
// Deux chemins, un seul résultat : une question libre OU un thème orienté
// (4 domaines gardés par une divinité · 5 sous-thèmes chacun, réutilisés de
// /nornes2). La confirmation lance DIRECTEMENT le tirage : pas d'étape
// intermédiaire.

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang, useT, contentLang } from '@/lib/i18n';
import { RUNE_THEME, RuneButton } from '../_shared';
import { RUNE_DOMAINS } from '../nornes2/theme-selector';

export default function YggQuestion({ open, onConfirm, copy }: {
  open: boolean;
  onConfirm: (q: string) => void;
  /** Habillage textuel local (défaut : l'Arbre). Mjölnir passe les siens. */
  copy?: { title: string; titleEn: string; sub: string; subEn: string; cta: string; ctaEn: string };
}) {
  const t = useT();
  const lang = useLang();
  const C = {
    title: 'À qui s’adresse l’Arbre ?', titleEn: 'Whom does the Tree speak of?',
    sub: 'Confie ta question — ou choisis un thème pour orienter la lecture si tu préfères rester abstrait.',
    subEn: 'Entrust your question — or pick a theme to orient the reading if you prefer to stay abstract.',
    cta: 'Planter la question', ctaEn: 'Plant the question',
    ...(copy ?? {}),
  };
  const L = (fr: string, en: string) => (lang === 'en' ? en : fr);
  const [free, setFree] = useState('');
  const [domainId, setDomainId] = useState<string | null>(null);
  const domain = RUNE_DOMAINS.find((d) => d.id === domainId) ?? null;
  const subRef = useRef<HTMLDivElement>(null);

  // Un thème choisi : on déroule les sous-thèmes ET on y amène le focus
  // (l'attente laisse le temps au panneau de se déplier, ~0,35 s).
  const pickDomain = (id: string) => {
    setDomainId(id);
    window.setTimeout(() => {
      subRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[86vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
            style={{
              background: 'linear-gradient(160deg, #14301f 0%, #0c2417 60%, #06120b 100%)',
              borderColor: `${RUNE_THEME.goldPale}44`,
              boxShadow: '0 0 46px rgba(233,217,172,0.12), 0 24px 60px rgba(0,0,0,0.7)',
              colorScheme: 'dark',
            }}
          >
            <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: `${RUNE_THEME.goldPale}99` }}>ᚠ · ᚢ · ᚦ</p>
            <h3 className="mt-1 text-center text-xl font-bold" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale }}>
              {lang === 'en' ? C.titleEn : C.title}
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-center text-[12px] italic leading-relaxed" style={{ color: RUNE_THEME.sage }}>
              {lang === 'en' ? C.subEn : C.sub}
            </p>

            {/* Chemin 1 : question libre */}
            <div className="mt-4">
              <textarea
                value={free}
                onChange={(e) => setFree(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder={L('Ta question, ton sujet…', 'Your question, your matter…')}
                className="w-full resize-none rounded-xl px-3.5 py-3 text-[14px] leading-relaxed outline-none"
                style={{
                  // fond OPAQUE (force-dark WebView ne la réécrit pas) + caret doré
                  background: 'linear-gradient(160deg, #16301f 0%, #0d2015 100%)',
                  border: `1.5px solid ${RUNE_THEME.goldPale}3d`,
                  color: RUNE_THEME.sagePale,
                  caretColor: RUNE_THEME.goldPale,
                  fontFamily: 'var(--font-cormorant), serif',
                }}
              />
              <div className="mt-2 text-center">
                <RuneButton
                  variant="save"
                  saveTint="cedar"
                  disabled={!free.trim()}
                  onClick={() => free.trim() && onConfirm(free.trim())}
                >
                  {lang === 'en' ? C.ctaEn : C.cta}
                </RuneButton>
              </div>
            </div>

            {/* Chemin 2 : thèmes orientés */}
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px flex-1" style={{ background: `${RUNE_THEME.sage}33` }} />
              <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: `${RUNE_THEME.sage}99` }}>{L('ou choisis un thème', 'or pick a theme')}</span>
              <span className="h-px flex-1" style={{ background: `${RUNE_THEME.sage}33` }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {RUNE_DOMAINS.map((d) => {
                const sel = domainId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => (sel ? setDomainId(null) : pickDomain(d.id))}
                    className="relative flex flex-col items-center rounded-xl px-2 py-2.5 transition-transform active:scale-[0.97]"
                    style={{
                      background: sel
                        ? `linear-gradient(165deg, ${RUNE_THEME.forestMid}66 0%, ${RUNE_THEME.forestDeep} 90%)`
                        : `linear-gradient(165deg, ${RUNE_THEME.forest}55 0%, ${RUNE_THEME.ink}88 90%)`,
                      border: `1px solid ${sel ? RUNE_THEME.goldPale : `${RUNE_THEME.goldPale}2e`}`,
                      boxShadow: sel ? `0 0 18px ${RUNE_THEME.goldGlow}` : 'none',
                    }}
                  >
                    {d.icon(sel ? RUNE_THEME.goldPale : `${RUNE_THEME.goldPale}b3`)}
                    <span className="mt-1 text-center text-[12px] leading-tight" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: sel ? RUNE_THEME.goldPale : `${RUNE_THEME.goldPale}cc` }}>
                      {d.label[contentLang(lang)]}
                    </span>
                    <span className="mt-0.5 text-center text-[9px] italic leading-tight" style={{ color: sel ? RUNE_THEME.sagePale : `${RUNE_THEME.sage}99` }}>
                      {d.deity}
                    </span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence initial={false}>
              {domain && (
                <motion.div
                  key="subs" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }} className="overflow-hidden"
                >
                  <div ref={subRef} className="mt-3 rounded-xl px-2.5 py-2" style={{ background: `${RUNE_THEME.ink}99`, border: `1px solid ${RUNE_THEME.goldPale}22` }}>
                    <p className="px-1 pb-1 text-[10px] uppercase tracking-[0.25em]" style={{ color: RUNE_THEME.goldSoft }}>
                      {t('runes.nornes2.subTitle')}
                    </p>
                    <ul className="space-y-0.5">
                      {domain.subs.map((s, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => onConfirm(`${domain.label[contentLang(lang)]} — ${s[contentLang(lang)]}`)}
                            className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#1f5234]/40"
                          >
                            <span className="mt-[3px] text-[8px]" style={{ color: RUNE_THEME.goldPale }}>◆</span>
                            <span className="text-[12px] leading-snug" style={{ color: RUNE_THEME.stone }}>
                              {s[contentLang(lang)]}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
