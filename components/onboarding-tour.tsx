'use client';

// components/onboarding-tour.tsx — Tutoriel de première visite
// « Le hall des Etoiles ». Monté dans app/layout.tsx SOUS la LanguageGate
// (z-120) : le tour s'ouvre une fois la langue choisie (flag tarot_seen_lang)
// et jamais si le visiteur l'a déjà vu ou passé (flag tarot_seen_tour).
// 11 slides : philosophie des 4 univers, 4 mini-tirages interactifs (gestes
// réels), visite express du temple et de « Mon espace », mot de la fin.
// Skip à tout moment ; rejouable depuis Préférences. Sons = ceux des vrais
// tirages (lib/sounds, toggle « Effets sonores » respecté).
// Règle contraste : écritures claires sur fonds foncés ; #34121F seulement
// sur les pilules dorées.

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useLang, useT } from '@/lib/i18n';
import { installSoundUnlock, stopAllSounds } from '@/lib/sounds';
import { GOLD, GOLD_PALE, IVORY, ROSE, WINE, goldPill, darkPill } from './onboarding/fx';
import TarotDraw from './onboarding/tarot-draw';
import YiJingDraw from './onboarding/yijing-draw';
import RuneDraw from './onboarding/rune-draw';
import DiceDraw from './onboarding/dice-draw';

const TOUR_FLAG = 'tarot_seen_tour';
const LANG_FLAG = 'tarot_seen_lang';

export default function OnboardingTour() {
  const lang = useLang();
  const t = useT();
  const pathname = usePathname();
  const isEn = lang === 'en';

  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [ready, setReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closedRef = useRef(false);

  // Ouverture : sur '/' uniquement, langue déjà choisie, tour jamais vu.
  // (poll léger : la gate pose son flag sans remonter l'arbre React.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem(TOUR_FLAG)) return;
    } catch {
      return;
    }
    const check = () => {
      try {
        if (localStorage.getItem(LANG_FLAG)) {
          setReady(true);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };
    check();
    pollRef.current = setInterval(check, 400);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (ready && pathname === '/' && !open && !closedRef.current) {
      const t0 = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t0);
    }
  }, [ready, pathname, open]);

  const close = useCallback(() => {
    try {
      localStorage.setItem(TOUR_FLAG, '1');
    } catch {}
    closedRef.current = true;
    setOpen(false);
    stopAllSounds(); // aucune piste ne survit à la sortie du tour (exigence user)
  }, []);

  const TOTAL = 11;
  const next = useCallback(() => setSlide((s) => Math.min(s + 1, TOTAL - 1)), []);
  const prev = useCallback(() => setSlide((s) => Math.max(s - 1, 0)), []);

  // Clavier : flèches = navigation, Escape = slide suivante (jamais sortie
  // brutale — seul « Passer » ferme).
  useEffect(() => {
    if (!open) return;
    installSoundUnlock(); // 1er geste dans le tour = autoplay déverrouillé
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Escape') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev]);

  // Swipe tactile gauche/droite sur le panneau (hors mini-jeux, gérés par eux).
  const touch = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && !isMiniGame(slide)) {
      if (dx < 0) next();
      else prev();
    }
  };

  if (!open) return null;

  const isMiniGame = (i: number) => i >= 3 && i <= 6;
  const last = slide === TOTAL - 1;

  return (
    <AnimatePresence>
      <motion.div
        data-tour="hall"
        className="fixed inset-0 z-[110] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        role="dialog"
        aria-modal="true"
        aria-label={t('tour.aria')}
      >
        {/* Overlay — brume chaude, jamais d'encre noire */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(30, 15, 8, 0.66)', backdropFilter: 'blur(5px)' }}
        />

        {/* Panneau — l'écrin du hall : bois → bordeaux → nuit, liseré or */}
        <motion.div
          className="ts-panel relative w-full max-w-md overflow-hidden rounded-3xl"
          style={{
            background: `linear-gradient(160deg, #2E1065 0%, ${WINE} 58%, #34121F 100%)`,
            border: `1.5px solid ${GOLD}77`,
            boxShadow:
              '0 12px 48px rgba(0,0,0,0.45), 0 0 34px rgba(218,165,32,0.18), inset 0 0 0 1px rgba(240,199,94,0.08)',
            maxHeight: '92vh',
          }}
          initial={{ y: 28, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="pointer-events-none absolute inset-2 rounded-[20px] border border-[#DAA520]/20" />

          {/* En-tête fixe */}
          <div className="relative px-6 pt-5 pb-2 text-center">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-24"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(76,29,149,0.42) 0%, transparent 72%)',
              }}
            />
            <p className="relative mb-0.5 text-[10px] tracking-[0.45em]" style={{ color: `${GOLD_PALE}cc` }}>
              <span className="ts-twinkle">✦</span>
              <span className="ts-twinkle mx-1.5" style={{ animationDelay: '-0.9s' }}>☾</span>
              <span className="ts-twinkle" style={{ animationDelay: '-1.7s' }}>✦</span>
            </p>
            <p
              className="relative text-[10px] uppercase tracking-[0.35em]"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}aa` }}
            >
              {t('tour.kicker')}
            </p>
            {/* « Passer » toujours visible dès la slide 1 */}
            <button
              onClick={close}
              className="absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] transition-transform hover:scale-105 active:scale-95"
              style={darkPill()}
            >
              {t('tour.skip')} ✕
            </button>
          </div>

          {/* Corps du slide */}
          <div className="relative min-h-[340px] overflow-y-auto px-6 pb-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: slide === 9 ? 0.8 : 0.32, ease: 'easeOut' }}
              >
                <SlideBody slide={slide} isEn={isEn} t={t} onAdvance={next} onClose={close} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pied : progression + navigation */}
          <div className="relative flex items-center justify-between border-t px-6 py-3.5" style={{ borderColor: `${GOLD}44` }}>
            <div className="flex items-center gap-1.5" aria-label={`${slide + 1}/${TOTAL}`}>
              {Array.from({ length: TOTAL }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => i <= slide && setSlide(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === slide ? 18 : 7,
                    background: i === slide ? GOLD_PALE : i < slide ? `${GOLD}99` : `${GOLD}33`,
                    boxShadow: i === slide ? `0 0 8px ${GOLD}aa` : 'none',
                  }}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {slide > 0 && (
                <button onClick={prev} className="rounded-full px-3 py-1.5 text-[11px]" style={darkPill()}>
                  ‹
                </button>
              )}
              {!isMiniGame(slide) && !last && (
                <button
                  onClick={next}
                  className="flex h-9 items-center rounded-full px-5 text-xs font-bold transition-transform hover:scale-[1.04] active:scale-95"
                  style={goldPill()}
                >
                  {t('tour.next')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Contenu des slides ────────────────────────────────────────────────

function SlideTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-2 text-center text-lg font-bold leading-snug"
      style={{
        fontFamily: 'var(--font-cinzel-deco), serif',
        color: IVORY,
        textShadow: `0 0 16px ${GOLD}99, 0 1px 2px rgba(0,0,0,0.6)`,
      }}
    >
      {children}
    </h2>
  );
}

function SlideBody({
  slide,
  isEn,
  t,
  onAdvance,
  onClose,
}: {
  slide: number;
  isEn: boolean;
  t: (k: string) => string;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const body = (k: string) => (
    <p
      className="mx-auto max-w-sm text-center text-[13px] leading-relaxed"
      style={{ fontFamily: 'var(--font-cinzel), serif', color: ROSE }}
    >
      {t(k)}
    </p>
  );

  switch (slide) {
    case 0:
      return (
        <div className="py-2">
          <SlideTitle>{t('tour.s1.title')}</SlideTitle>
          {body('tour.s1.body')}
          <div className="mt-5 flex justify-center">
            <button
              onClick={onAdvance}
              className="flex h-10 items-center rounded-full px-6 text-sm font-bold transition-transform hover:scale-[1.04] active:scale-95"
              style={goldPill()}
            >
              {t('tour.start')}
            </button>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="py-2">
          <SlideTitle>{t('tour.s2.title')}</SlideTitle>
          {body('tour.s2.body')}
        </div>
      );
    case 2: {
      const tiles = [
        { img: '/images/tirage-3-cartes.png', k: 'tarot' },
        { img: '/images/yi-jing-icon.png', k: 'yijing' },
        { img: '/images/runes-icon.png', k: 'runes' },
        { img: '/images/des-zodiaque.png', k: 'dice' },
      ];
      return (
        <div className="py-1">
          <SlideTitle>{t('tour.s3.title')}</SlideTitle>
          <div className="mx-auto grid max-w-sm grid-cols-2 gap-2.5">
            {tiles.map((tl, i) => (
              <motion.div
                key={tl.k}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.4 }}
                className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center"
                style={{ background: 'rgba(24,10,4,0.35)', border: `1px solid ${GOLD}55` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tl.img} alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.5))' }} />
                <span className="text-[12px] font-bold" style={{ fontFamily: 'var(--font-cinzel), serif', color: GOLD_PALE }}>
                  {t(`tour.s3.${tl.k}.name`)}
                </span>
                <span className="text-[10px] leading-snug" style={{ fontFamily: 'var(--font-cinzel), serif', color: IVORY }}>
                  {t(`tour.s3.${tl.k}.tag`)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }
    case 3:
      return (
        <div className="py-1">
          <SlideTitle>{t('tour.s4.title')}</SlideTitle>
          <TarotDraw
            isEn={isEn}
            labels={{
              tapDeck: t('tour.s4.tap'),
              pick3: t('tour.s4.pick'),
              result: t('tour.s4.result'),
              skip: t('tour.skipDemo'),
            }}
            onDone={onAdvance}
            onSkip={onAdvance}
          />
        </div>
      );
    case 4:
      return (
        <div className="py-1">
          <SlideTitle>{t('tour.s5.title')}</SlideTitle>
          <YiJingDraw
            isEn={isEn}
            labels={{
              shake: t('tour.s5.shake'),
              count: (n) => t('tour.s5.count').replace('{n}', String(n)),
              tap: t('tour.s5.tap'),
              skip: t('tour.skipDemo'),
              result: t('tour.s5.result'),
            }}
            onDone={onAdvance}
            onSkip={onAdvance}
          />
        </div>
      );
    case 5:
      return (
        <div className="py-1">
          <SlideTitle>{t('tour.s6.title')}</SlideTitle>
          <RuneDraw
            isEn={isEn}
            labels={{
              shake: t('tour.s6.shake'),
              again: t('tour.s6.again'),
              tap: t('tour.s6.tap'),
              skip: t('tour.skipDemo'),
              result: (r, k) => t('tour.s6.result').replace('{rune}', r).replace('{key}', k),
            }}
            onDone={onAdvance}
            onSkip={onAdvance}
          />
        </div>
      );
    case 6:
      return (
        <div className="py-1">
          <SlideTitle>{t('tour.s7.title')}</SlideTitle>
          <DiceDraw
            isEn={isEn}
            labels={{
              shake: t('tour.s7.shake'),
              throw: t('tour.s7.throw'),
              tap: t('tour.s7.tap'),
              skip: t('tour.skipDemo'),
              result: (p, s, h) =>
                t('tour.s7.result').replace('{p}', p).replace('{s}', s).replace('{h}', h),
            }}
            onDone={onAdvance}
            onSkip={onAdvance}
          />
        </div>
      );
    case 7:
      return (
        <div className="py-2">
          <SlideTitle>{t('tour.s8.title')}</SlideTitle>
          {body('tour.s8.body')}
        </div>
      );
    case 8: {
      const items = ['profil', 'historique', 'stats', 'echos', 'prefs'];
      return (
        <div className="py-1">
          <SlideTitle>{t('tour.s9.title')}</SlideTitle>
          <div className="mx-auto flex max-w-sm flex-col gap-1.5">
            {items.map((it, i) => (
              <motion.div
                key={it}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.35 }}
                className="flex items-start gap-2.5 rounded-xl px-3 py-2"
                style={{ background: 'rgba(24,10,4,0.35)', border: `1px solid ${GOLD}55` }}
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_PALE} 100%)`,
                    color: '#3A2410',
                    fontFamily: 'var(--font-cinzel), serif',
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-[12px] leading-snug" style={{ fontFamily: 'var(--font-cinzel), serif', color: IVORY }}>
                  {t(`tour.s9.${it}`)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }
    case 9:
      return (
        <div className="flex min-h-[300px] flex-col items-center justify-center py-6 text-center">
          <p className="mb-3 text-sm tracking-[0.5em]" style={{ color: `${GOLD_PALE}cc` }}>
            <span className="ts-twinkle">✦</span>
            <span className="ts-twinkle mx-1" style={{ animationDelay: '-0.7s' }}>☾</span>
            <span className="ts-twinkle mx-1" style={{ animationDelay: '-1.4s' }}>✧</span>
            <span className="ts-twinkle mx-1" style={{ animationDelay: '-2.1s' }}>☽</span>
            <span className="ts-twinkle">✦</span>
          </p>
          <SlideTitle>{t('tour.s10.title')}</SlideTitle>
          <p
            className="max-w-sm text-[13px] italic leading-relaxed"
            style={{ fontFamily: 'var(--font-cormorant), serif', color: IVORY }}
          >
            {t('tour.s10.body')}
          </p>
        </div>
      );
    case 10:
      return (
        <div className="py-2 text-center">
          <SlideTitle>{t('tour.s11.title')}</SlideTitle>
          {body('tour.s11.body')}
          <div className="mt-5 flex justify-center">
            <button
              onClick={onClose}
              className="flex h-10 items-center rounded-full px-6 text-sm font-bold transition-transform hover:scale-[1.04] active:scale-95"
              style={goldPill()}
            >
              {t('tour.enter')}
            </button>
          </div>
        </div>
      );
    default:
      return null;
  }
}
