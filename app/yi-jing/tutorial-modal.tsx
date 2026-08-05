'use client';

// app/yi-jing/tutorial-modal.tsx — Modale tutoriel « Comment ça marche » par
// tirage (même pattern que /des-divinatoires, /runes, /tarot). Un seul slide :
// celui de la tuile cliquée. Thème yi-jing (violet #C6A8E6 / #E0CFF0).
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

const PURPLE = '#B48CCC';
const PURPLE_PALE = '#E0CFF0';

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
            style={{ background: 'rgba(10, 5, 20, 0.82)', backdropFilter: 'blur(3px)' }}
            onClick={onClose}
          />

          {/* Panneau */}
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl"
            style={{
              background: 'linear-gradient(160deg, #2a1a44 0%, #120a24 100%)',
              border: `1.5px solid ${PURPLE}66`,
              boxShadow: `0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(180,140,204,0.12) inset`,
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
                    'radial-gradient(ellipse at 50% 0%, rgba(180,140,204,0.28) 0%, transparent 70%)',
                }}
              />
              <span className="relative mb-2 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.iconImg}
                  alt=""
                  className="mx-auto h-12 w-12 object-contain"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(224,207,240,0.5))' }}
                />
              </span>
              <h2
                className="relative text-xl font-bold"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: PURPLE_PALE,
                  textShadow: `0 0 14px ${PURPLE}66`,
                }}
              >
                {isEn ? s.titleEn : s.title}
              </h2>
              <p
                className="relative mt-2 text-xs leading-relaxed sm:text-sm"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(220,200,250,0.85)',
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
                      background: 'rgba(20, 10, 38, 0.55)',
                      border: `1px solid ${PURPLE}44`,
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{
                        background: `${PURPLE}22`,
                        border: `1px solid ${PURPLE}77`,
                        color: PURPLE_PALE,
                        fontFamily: 'var(--font-cinzel), serif',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-xs leading-relaxed sm:text-[13px]"
                      style={{
                        fontFamily: 'var(--font-cinzel), serif',
                        color: 'rgba(230,215,250,0.92)',
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
              style={{ borderColor: `${PURPLE}33` }}
            >
              <button
                onClick={onClose}
                className="flex h-9 items-center rounded-full px-4 text-xs font-bold"
                style={{
                  background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_PALE} 100%)`,
                  color: '#1a0a2a',
                  border: `1px solid ${PURPLE_PALE}`,
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
