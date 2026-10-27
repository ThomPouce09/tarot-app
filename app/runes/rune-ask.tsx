'use client';

// app/runes/rune-ask.tsx — Carte « question OU thème » standardisée des runes
// (demande user : tous les tirages runes avec question libre ou thème+sous-thème
// doivent avoir la même présentation que /obstacle-solution, /choix, Mjölnir et
// Yggdrasil). DEUX ONGLETS, pas de « ou » : « Ma question libre » ACTIVE par
// défaut, « Thème & intention » en second (4 domaines gardés par une divinité ·
// 5 sous-thèmes chacun, RUNE_DOMAINS de /nornes2 réutilisés — les Nornes ne
// filent pas d'autres sujets). La confirmation lance DIRECTEMENT le tirage.
// Mêmes gabarits que YggQuestion / DiceLaunchCard — teinte cèdre de l'univers.
// Composant partagé par /runes/nornes (Précis) et /runes/nornes2 (simplifié) ;
// Mjölnir et Yggdrasil gardent leur modale plein écran existante.

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useT, useLang, tr, pickContent } from '@/lib/i18n';
import { RUNE_THEME, RuneButton } from './_shared';
import { RUNE_DOMAINS } from './nornes2/theme-selector';

export function RuneAskCard({ title, sub, subEn, cta, ctaEn, onConfirm }: {
  /** Titre gravé de la carte (i18n résolu par l'appelant). */
  title: string;
  /** Sous-titre italic (invite — FR/EN, ES/HI repli FR). */
  sub: string;
  subEn?: string;
  /** Libellé du CTA de la question libre (FR/EN). */
  cta?: string;
  ctaEn?: string;
  /** Question composée (libre écrite ou « Domaine — intention ») : lance le tirage. */
  onConfirm: (q: string) => void;
}) {
  const t = useT();
  const lang = useLang();
  // Question précise par défaut (exigence user — ordre identique à
  // /obstacle-solution et YggQuestion).
  const [mode, setMode] = useState<'free' | 'theme'>('free');
  const [free, setFree] = useState('');
  const [domainId, setDomainId] = useState<string | null>(null);
  const domain = RUNE_DOMAINS.find((d) => d.id === domainId) ?? null;
  const subRef = useRef<HTMLDivElement>(null);

  // Un thème choisi : on déroule les sous-thèmes ET on y amène le focus.
  const pickDomain = (id: string) => {
    setDomainId(id);
    window.setTimeout(() => {
      subRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
  };

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'linear-gradient(160deg, #14301f 0%, #0c2417 60%, #06120b 100%)',
        borderColor: `${RUNE_THEME.goldPale}44`,
        boxShadow: '0 0 46px rgba(233,217,172,0.12), 0 24px 60px rgba(0,0,0,0.7)',
        colorScheme: 'dark',
      }}
    >
      <p className="text-center text-[11px] tracking-[0.4em]" style={{ color: `${RUNE_THEME.goldPale}99` }}>ᚠ · ᚢ · ᚦ</p>
      <h3 className="mt-1 text-center text-xl font-bold" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale }}>
        {title}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-center text-[12px] italic leading-relaxed" style={{ color: RUNE_THEME.sage }}>
        {tr(sub, subEn ?? sub)}
      </p>

      {/* Onglets : mêmes pastilles que /obstacle-solution — Thème à gauche,
          « Ma question libre » à droite. */}
      <div className="mt-4 mb-1 flex justify-center gap-2">
        {([
          ['theme', tr("Thème & intention", "Theme & intention", "Tema e intención", "विषय एवं संकल्प")],
          ['free', tr("Ma question libre", "My own question", "Mi pregunta libre", "मेरा स्वतंत्र प्रश्न")],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className="rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-[0.97]"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              letterSpacing: '0.06em',
              color: mode === k ? RUNE_THEME.goldPale : `${RUNE_THEME.sage}99`,
              background: mode === k ? 'linear-gradient(180deg, #1f5234 0%, #0c2417 100%)' : 'transparent',
              border: mode === k ? `1px solid ${RUNE_THEME.goldPale}bf` : `1px solid ${RUNE_THEME.goldPale}33`,
              boxShadow: mode === k ? `0 0 16px ${RUNE_THEME.goldPale}42, inset 0 1px 0 ${RUNE_THEME.goldPale}4d` : 'none',
            }}
          >
            {mode === k ? '✦ ' : ''}{label}{mode === k ? ' ✦' : ''}
          </button>
        ))}
      </div>

      {mode === 'free' ? (
        <div className="mt-3">
          <textarea
            value={free}
            onChange={(e) => setFree(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder={tr("Ta question, ton sujet…", "Your question, your matter…", "Tu pregunta, tu asunto…", "तुम्हारा प्रश्न, तुम्हारा विषय…")}
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
          <div className="mt-3 text-center">
            <RuneButton
              variant="save"
              saveTint="cedar"
              disabled={!free.trim()}
              onClick={() => free.trim() && onConfirm(free.trim())}
            >
              {cta ? tr(cta, ctaEn ?? cta) : tr("Tisser le fil", "Weave the thread", "Tejer el hilo", "धागा बुनो")}
            </RuneButton>
          </div>
        </div>
      ) : (
        <>
          {/* Thèmes orientés : 4 domaines × 5 sous-thèmes (garde divine) */}
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
                    {pickContent(d.label, lang)}
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
                          onClick={() => onConfirm(`${pickContent(domain.label, lang)} — ${pickContent(s, lang)}`)}
                          className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[#1f5234]/40"
                        >
                          <span className="mt-[3px] text-[8px]" style={{ color: RUNE_THEME.goldPale }}>◆</span>
                          <span className="text-[12px] leading-snug" style={{ color: RUNE_THEME.stone }}>
                            {pickContent(s, lang)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
