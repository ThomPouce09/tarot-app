'use client';

// app/tarot/tutorial-modal.tsx — Modale tutoriel « Comment ça marche » par
// tirage (même pattern que /des-divinatoires et /runes). Un seul slide : celui
// de la tuile cliquée. Charte graphique Tarot : bois chaud, bordeaux & or
// (TAROT_NIGHT) — une ambiance boudoir chaleureuse, jamais sinistre : le bois
// clair et l'or dominent, le bordeaux en accent, les étoiles scintillent.
//
// Pattern : overlay z-40, fermeture au clic overlay / Escape / navigation.

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n';

export interface TutorialSlide {
  iconImg: string;
  title: string;
  titleEn: string;
  desc: string;
  descEn: string;
  steps: string[];
  stepsEn: string[];
}

// Palette TAROT_NIGHT (cf. /tarot-3-cartes-simplifie/theme-selector.tsx)
const GOLD = '#DAA520';
const GOLD_PALE = '#F0C75E';
const IVORY = '#F5EAD6';
const ROSE = '#E2B8AC';
const WINE = '#4A1931';

export function TutorialModal({
  open,
  onClose,
  slide,
}: {
  open: boolean;
  onClose: () => void;
  slide: TutorialSlide | null;
}) {
  const pathname = usePathname();
  const lang = useLang();
  const openPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) openPathRef.current = pathname;
  }, [open, pathname]);

  useEffect(() => {
    if (open && openPathRef.current && pathname !== openPathRef.current) {
      onClose();
    }
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!slide) return null;
  const s = slide;
  const isEn = lang === 'en';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? 'How it works' : 'Comment ça marche'}
        >
          {/* Overlay — brume chaude, pas noir d'encre */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(30, 15, 8, 0.58)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panneau — bois clair → bordeaux, l'écrin d'une carte */}
          <motion.div
            className="ts-panel relative w-full max-w-md overflow-hidden rounded-3xl"
            style={{
              background: `linear-gradient(160deg, #5A3A1E 0%, ${WINE} 58%, #34121F 100%)`,
              border: `1.5px solid ${GOLD}77`,
              boxShadow: `0 12px 48px rgba(0,0,0,0.45), 0 0 34px rgba(218,165,32,0.18), inset 0 0 0 1px rgba(240,199,94,0.08)`,
            }}
            initial={{ y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Cadre intérieur fin, comme le bord doré d'une lame */}
            <div className="pointer-events-none absolute inset-2 rounded-[20px] border border-[#DAA520]/20" />

            {/* En-tête */}
            <div className="relative px-6 pt-6 pb-4 text-center">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(240,199,94,0.30) 0%, transparent 72%)',
                }}
              />
              <p className="relative mb-1 text-[11px] tracking-[0.45em]" style={{ color: `${GOLD_PALE}cc` }}>
                <span className="ts-twinkle">✦</span>
                <span className="ts-twinkle mx-1.5" style={{ animationDelay: '-0.9s' }}>☾</span>
                <span className="ts-twinkle" style={{ animationDelay: '-1.7s' }}>✦</span>
              </p>
              <span className="relative mb-2 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.iconImg}
                  alt=""
                  className="mx-auto h-12 w-12 object-contain"
                  style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.6))' }}
                />
              </span>
              <h2
                className="relative text-xl font-bold"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: IVORY,
                  textShadow: `0 0 16px ${GOLD}99, 0 1px 2px rgba(0,0,0,0.6)`,
                }}
              >
                {isEn ? s.titleEn : s.title}
              </h2>
              <p
                className="relative mt-2 text-xs leading-relaxed sm:text-sm"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: ROSE,
                }}
              >
                {isEn ? s.descEn : s.desc}
              </p>
            </div>

            {/* Étapes — cartes posées sur le tapis, lisibles et lumineuses */}
            <div className="relative px-6 pb-4">
              <ol className="space-y-2.5">
                {(isEn ? s.stepsEn : s.steps).map((step, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.12, duration: 0.35, ease: 'easeOut' }}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                    style={{
                      background: 'rgba(24, 10, 4, 0.35)',
                      border: `1px solid ${GOLD}55`,
                      boxShadow: `inset 0 1px 0 rgba(240,199,94,0.10)`,
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_PALE} 100%)`,
                        color: '#3A2410',
                        fontFamily: 'var(--font-cinzel), serif',
                        boxShadow: `0 0 10px rgba(218,165,32,0.5)`,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-xs leading-relaxed sm:text-[13px]"
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                        color: IVORY,
                      }}
                    >
                      {step}
                    </span>
                  </motion.li>
                ))}
              </ol>
            </div>

            {/* Pied */}
            <div
              className="relative flex items-center justify-between border-t px-6 py-4"
              style={{ borderColor: `${GOLD}44` }}
            >
              <span
                className="text-[10px] italic tracking-wider"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}aa` }}
              >
                {isEn ? 'Draw with confidence ✦' : 'Tirez en toute confiance ✦'}
              </span>
              <button
                onClick={onClose}
                className="flex h-9 items-center rounded-full px-4 text-xs font-bold transition-transform hover:scale-[1.04] active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_PALE} 100%)`,
                  color: '#2a1808',
                  border: `1px solid ${GOLD_PALE}`,
                  fontFamily: 'var(--font-cinzel), serif',
                  boxShadow: '0 3px 14px rgba(218,165,32,0.4), inset 0 1px 0 rgba(255,255,255,0.35)',
                }}
              >
                {isEn ? 'Got it' : 'J’ai compris'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
