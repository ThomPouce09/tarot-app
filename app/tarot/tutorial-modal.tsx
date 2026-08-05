'use client';

// app/tarot/tutorial-modal.tsx — Modale tutoriel « Comment ça marche » par
// tirage (même pattern que /des-divinatoires et /runes). Un seul slide : celui
// de la tuile cliquée. Thème tarot (or #DAA520 / #FFD700 sur fond brun).
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

const GOLD = '#DAA520';
const GOLD_PALE = '#FFD700';

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
          {/* Overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(12, 6, 2, 0.82)', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
          />

          {/* Panneau */}
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl"
            style={{
              background:
                'linear-gradient(160deg, #5a4420 0%, #1f1406 100%)',
              border: `1.5px solid ${GOLD}66`,
              boxShadow: `0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(218,165,32,0.12) inset`,
            }}
            initial={{ y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* En-tête */}
            <div className="relative px-6 pt-6 pb-4 text-center">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(218,165,32,0.28) 0%, transparent 70%)',
                }}
              />
              <span className="relative mb-2 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.iconImg}
                  alt=""
                  className="mx-auto h-12 w-12 object-contain"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.5))' }}
                />
              </span>
              <h2
                className="relative text-xl font-bold"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: GOLD_PALE,
                  textShadow: `0 0 14px ${GOLD}66`,
                }}
              >
                {isEn ? s.titleEn : s.title}
              </h2>
              <p
                className="relative mt-2 text-xs leading-relaxed sm:text-sm"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(255,215,0,0.8)',
                }}
              >
                {isEn ? s.descEn : s.desc}
              </p>
            </div>

            {/* Étapes */}
            <div className="px-6 pb-4">
              <ol className="space-y-2.5">
                {(isEn ? s.stepsEn : s.steps).map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                    style={{
                      background: 'rgba(20, 11, 3, 0.55)',
                      border: `1px solid ${GOLD}44`,
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{
                        background: `${GOLD}22`,
                        border: `1px solid ${GOLD}77`,
                        color: GOLD_PALE,
                        fontFamily: 'var(--font-cinzel), serif',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-xs leading-relaxed sm:text-[13px]"
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                        color: 'rgba(255,220,140,0.92)',
                      }}
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Pied */}
            <div
              className="flex items-center justify-end border-t px-6 py-4"
              style={{ borderColor: `${GOLD}33` }}
            >
              <button
                onClick={onClose}
                className="flex h-9 items-center rounded-full px-4 text-xs font-bold"
                style={{
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_PALE} 100%)`,
                  color: '#2a1808',
                  border: `1px solid ${GOLD_PALE}`,
                  fontFamily: 'var(--font-cinzel), serif',
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
