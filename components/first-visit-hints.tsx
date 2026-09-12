'use client';

// components/first-visit-hints.tsx — Mini-tutots discrets de première visite.
// Une pastille dorée pulsante entoure la cible (sélecteur CSS) + une info-bulle
// avec un texte et un bouton « Compris ». Les hints s'enchaînent (un à la fois) ;
// le drapeau localStorage n'est posé qu'à la fin du cycle (reprise si l'utilisateur
// quitte avant). Le cycle attend la fin des overlays prioritaires : portail de
// langue (z-120) et tour « hall des Etoiles » (z-110), et l'existence de la cible.

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { playSound } from '@/lib/sounds';
import { useT } from '@/lib/i18n';
import { isTutorialSeen, markTutorialSeen, hydrateTutorials, TUTS_EVENT } from '@/lib/tutorials';

export interface Hint {
  /** Sélecteur CSS de l'élément à mettre en évidence (1er élément trouvé). */
  selector: string;
  /** Clé i18n du texte de l'info-bulle. */
  textKey: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function FirstVisitHints({ flagKey, hints }: { flagKey: string; hints: Hint[] }) {
  const t = useT();
  const [idx, setIdx] = useState(0); // -1 = cycle terminé/inactif
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);

  // Le cycle est-il encore à faire ? Drapeau lié au COMPTE (base) + cache local,
  // posé uniquement à la fin — l'hydratation serveur peut le révéler après coup.
  const [pending, setPending] = useState(() => !isTutorialSeen(flagKey));
  useEffect(() => {
    const check = () => setPending(!isTutorialSeen(flagKey));
    hydrateTutorials().then(check);
    window.addEventListener(TUTS_EVENT, check);
    return () => window.removeEventListener(TUTS_EVENT, check);
  }, [flagKey]);

  // Attend que les overlays prioritaires soient partis ET que la cible existe.
  useEffect(() => {
    if (!pending) return;
    let stop = false;
    const poll = () => {
      if (stop) return;
      const busy =
        document.querySelector('[data-lang-gate]') ||
        document.querySelector('[data-tour="hall"]');
      const target = hints[idx] ? document.querySelector(hints[idx].selector) : null;
      if (!busy && target) setReady(true);
      else setTimeout(poll, 450);
    };
    poll();
    return () => { stop = true; };
  }, [pending, idx, hints]);

  // Mesure la position de la cible (et la suit au resize).
  const measure = useCallback(() => {
    if (!ready || idx < 0 || idx >= hints.length) { setRect(null); return; }
    const el = document.querySelector(hints[idx].selector);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [ready, idx, hints]);

  useEffect(() => {
    if (!ready) return;
    measure();
    const raf = requestAnimationFrame(measure); // 2e passe : après stabilisation du layout
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [ready, measure]);

  if (!pending || idx < 0 || !ready || !rect) return null;

  const hint = hints[idx];
  const ringPad = 6;
  const ringR = Math.min((rect.height + ringPad * 2) / 2, 999);
  // Info-bulle sous la cible, clampée dans le viewport.
  const BUB_W = 250;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const cx = rect.left + rect.width / 2;
  const bubLeft = Math.max(10, Math.min(cx - BUB_W / 2, vw - BUB_W - 10));
  const bubTop = rect.top + rect.height + 14;
  const arrowLeft = Math.max(14, Math.min(cx - bubLeft - 5, BUB_W - 24));

  const next = () => {
    playSound('scroll1', 0.35);
    if (idx + 1 < hints.length) {
      setIdx(idx + 1);
    } else {
      markTutorialSeen(flagKey); // compte (base) + cache local
      setIdx(-1);
    }
  };

  return (
    <>
      {/* Pastille dorée pulsante autour de la cible */}
      <div
        aria-hidden
        className="pointer-events-none fixed hint-ring"
        style={{
          top: rect.top - ringPad,
          left: rect.left - ringPad,
          width: rect.width + ringPad * 2,
          height: rect.height + ringPad * 2,
          borderRadius: ringR,
          zIndex: 105,
        }}
      />
      {/* Info-bulle */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed"
          style={{ top: bubTop, left: bubLeft, width: BUB_W, zIndex: 106 }}
        >
          {/* flèche vers la cible */}
          <span
            aria-hidden
            className="absolute -top-[5px] h-[10px] w-[10px] rotate-45"
            style={{ left: arrowLeft, background: 'rgba(38,20,12,0.97)', borderLeft: '1px solid rgba(218,165,32,0.5)', borderTop: '1px solid rgba(218,165,32,0.5)' }}
          />
          <div
            className="rounded-xl px-3.5 py-3"
            style={{
              background: 'rgba(38,20,12,0.97)',
              border: '1px solid rgba(218,165,32,0.5)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.6), 0 0 18px rgba(218,165,32,0.18)',
            }}
          >
            <p
              className="text-[12px] leading-snug"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: '#F5EAD6' }}
            >
              {t(hint.textKey)}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              {hints.length > 1 ? (
                <span className="text-[10px]" style={{ color: 'rgba(245,234,214,0.55)' }}>
                  {idx + 1} / {hints.length}
                </span>
              ) : <span />}
              <button
                type="button"
                onClick={next}
                className="rounded-full px-3 py-1 text-[11px] font-semibold transition-transform hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(180deg,#e8c56a,#c9971f)',
                  color: '#2b1608',
                  boxShadow: '0 0 10px rgba(218,165,32,0.35)',
                }}
              >
                {t('hint.ok')}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
