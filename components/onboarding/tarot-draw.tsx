'use client';

// components/onboarding/tarot-draw.tsx — Mini-jeu 1/4 du tutoriel :
// reproduit la mécanique RÉELLE du tirage 3 cartes (app/components/tarot-app) :
//  1) la pioche apparaît, dos retourné → PINCEZ 2 doigts (comme le jeu :
//     zoomRef 0→1) ou tap (fallback) pour l'éventer ;
//  2) on GLISSE horizontalement du doigt pour parcourir les cartes ;
//  3) tap sur un dos = le choisir (pickCard) → il vole vers son emplacement
//     Passé / Présent / Futur et SE RETOURNE IMMÉDIATEMENT sur son arcane
//     MAJEUR réel (mêmes visuels que le jeu : /cards/arcana/{id}.jpg) —
//     chaque flip est accompagné de son son, sans attendre la fin du tirage ;
//  4) la 3e lame révélée → avance automatique.
// Charte Tarot ; un « flip » sonore à CHAQUE sélection ; fallback tap garanti.

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GameFrame, GOLD, GOLD_PALE, ROSE, SkipDemo } from './fx';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { playSound } from '@/lib/sounds';

const CARD_BACK = '/images/card-back.png?v=2';
const MAJORS = TAROT_CARDS.filter((c) => c.arcana === 'major'); // les 22 arcanes majeurs
const FAN_COUNT = 14; // l'écrin du tutoriel expose 14 lames (le jeu : toute la pioche)
const STEP = 36; // pas horizontal entre deux dos (px)
const CARD_W = 52; // largeur d'une lame (px)

const SLOTS = [
  { fr: 'Passé', en: 'Past' },
  { fr: 'Présent', en: 'Present' },
  { fr: 'Futur', en: 'Future' },
] as const;

export default function TarotDraw({
  isEn,
  labels,
  onDone,
  onSkip,
}: {
  isEn: boolean;
  labels: { tapDeck: string; pick3: string; result: string; skip: string };
  onDone: () => void;
  onSkip: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const [picked, setPicked] = useState<number[]>([]); // index dans la main
  const [offset, setOffset] = useState(0);
  // chaque lame se retourne à SA sélection (pas tous en bloc à la fin)
  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);
  const [zoomAmt, setZoomAmt] = useState(0); // 0→1 pendant le pincement (le jeu : zoomRef)
  const drag = useRef({ x0: 0, off0: 0, moved: 0, down: false });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch0 = useRef(0);

  const spread = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  // PINCH 2 doigts = ouvrir la pioche (le jeu : startPinch/movePinch, /150 px)
  const onDeckDown = (e: React.PointerEvent) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch0.current = spread(a, b);
    }
  };
  const onDeckMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size >= 2 && pinch0.current > 0) {
      const [a, b] = [...pts.current.values()];
      const z = Math.max(0, Math.min(1, (spread(a, b) - pinch0.current) / 150));
      setZoomAmt(z);
      if (z >= 1) {
        pts.current.clear();
        setOpened(true); // même seuil que le jeu (zoom = 1)
      }
    }
  };
  const onDeckUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) {
      pinch0.current = 0;
      setZoomAmt(0); // le pinch s'annule si on lâche un doigt
    }
  };

  // Pioche mélangée : FAN_COUNT arcanes majeurs au hasard, dos identiques au jeu.
  const hand = useMemo(() => {
    const idx = MAJORS.map((_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, FAN_COUNT);
    return idx.map((i) => MAJORS[i]);
  }, []);

  const fanW = (FAN_COUNT - 1) * STEP + CARD_W;
  const clamp = (v: number) => {
    const max = Math.max(0, (fanW - 286) / 2);
    return Math.max(-max, Math.min(max, v));
  };

  const onDown = (e: React.PointerEvent) => {
    if (!opened && picked.length < 3) onDeckDown(e);
    drag.current = { x0: e.clientX, off0: offset, moved: 0, down: true };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!opened && picked.length < 3) onDeckMove(e);
    if (!opened || picked.length >= 3 || !drag.current.down) return; // le survol ne déplace pas l'éventail
    const dx = e.clientX - drag.current.x0;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    if (Math.abs(dx) > 4) setOffset(clamp(drag.current.off0 - dx));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!opened && picked.length < 3) onDeckUp(e);
    drag.current.down = false;
    setOffset((o) => clamp(o));
  };

  const pick = (i: number) => {
    if (drag.current.moved > 10) return; // c'était une glissade, pas un tap
    const slot = picked.length;
    if (picked.includes(i) || slot >= 3) return;
    setPicked([...picked, i]);
    // LA carte se retourne tout de suite (pas en fin de tirage) :
    // l'arcane est révélé à chaque sélection, flip + son immédiats.
    window.setTimeout(() => {
      setRevealed((r) => r.map((v, s) => (s === slot ? true : v)));
      playSound(Math.random() < 0.5 ? 'card-flipped' : 'card-flipped2', 0.7);
    }, 480); // le temps de voler vers l'emplacement
    if (slot === 2) window.setTimeout(onDone, 3600);
  };

  return (
    <div>
      <GameFrame onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} done={picked.length === 3}>
        {/* ── Les 3 emplacements (Passé / Présent / Futur) ── */}
        <div className="mb-3 flex justify-center gap-3">
          {SLOTS.map((s, slot) => {
            const cardIdx = picked[slot];
            const card = cardIdx !== undefined ? hand[cardIdx] : null;
            return (
              <div key={slot} className="flex flex-col items-center" style={{ width: CARD_W }}>
                <div className="relative" style={{ width: CARD_W, height: CARD_W * 1.5, perspective: 650 }}>
                  {/* emplacement vide */}
                  <div
                    className="absolute inset-0 rounded-md transition-opacity duration-300"
                    style={{
                      border: `1.5px dashed ${GOLD}55`,
                      background: 'rgba(0,0,0,0.25)',
                      opacity: card ? 0 : 1,
                    }}
                  />
                  {card && (
                    <motion.div
                      className="absolute inset-0"
                      initial={{ y: -44, scale: 0.82, opacity: 0.85 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* le dos, qui se retourne dès que CETTE carte est choisie */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{ rotateY: revealed[slot] ? -180 : 0 }}
                        transition={{ duration: 0.65, ease: 'easeInOut' }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        {/* FACE 1 — le dos (identique au jeu) */}
                        <div
                          className="absolute inset-0 overflow-hidden rounded-md"
                          style={{
                            backfaceVisibility: 'hidden',
                            border: `1.5px solid ${GOLD}99`,
                            boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={CARD_BACK} alt="" className="h-full w-full object-cover" />
                        </div>
                        {/* FACE 2 — l'arcane majeur */}
                        <div
                          className="absolute inset-0 overflow-hidden rounded-md"
                          style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            border: `1.5px solid ${GOLD}cc`,
                            boxShadow: '0 0 16px rgba(218,165,32,0.4)',
                            background: '#F5EAD6',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/cards/arcana/${card.id}.jpg`}
                            alt={isEn && card.nameEn ? card.nameEn : card.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
                <p
                  className="mt-1 text-[8.5px] uppercase tracking-[0.18em]"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}aa` }}
                >
                  {isEn ? s.en : s.fr}
                </p>
                {card && revealed[slot] && (
                  <motion.p
                    className="text-center text-[8px] leading-tight"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    style={{ color: `${GOLD_PALE}dd` }}
                  >
                    {isEn && card.nameEn ? card.nameEn : card.name}
                  </motion.p>
                )}
              </div>
            );
          })}
        </div>

        {!opened ? (
          /* ── La pioche fermée : tap pour l'éventer (le jeu : pincer) ── */
          <motion.button
            onClick={() => setOpened(true)}
            data-cardback="deck"
            className="relative mx-auto block"
            style={{ width: 120, height: 96 }}
            whileTap={{ scale: 0.96 }}
            aria-label={labels.tapDeck}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute overflow-hidden rounded-md"
                style={{
                  width: 62,
                  height: 92,
                  left: 28 + i * 6,
                  top: 2,
                  // le pinch écarte progressivement la pile (zoom 0→1)
                  transform: `translateX(${(i - 1.5) * zoomAmt * 44}px) rotate(${(i - 1.5) * (3 + zoomAmt * 7)}deg)`,
                  transition: zoomAmt > 0 ? 'none' : 'transform .3s ease',
                  border: `1.5px solid ${GOLD}88`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: i,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CARD_BACK} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
            {/* animation « pince » : deux pouces qui s'écartent — calés HORS pile
                (les cartes montent jusqu'à z 3) et z-30 pour ne jamais être cachés */}
            <motion.span
              className="pointer-events-none absolute bottom-1 z-30 text-[20px]"
              style={{ left: -8, color: `${GOLD_PALE}dd` }}
              animate={{ x: [-3, 4, -3] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            >
              ☞
            </motion.span>
            <motion.span
              className="pointer-events-none absolute bottom-1 z-30 text-[20px]"
              style={{ right: -8, color: `${GOLD_PALE}dd` }}
              initial={{ scaleX: -1 }}
              animate={{ x: [3, -4, 3], scaleX: -1 }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            >
              ☞
            </motion.span>
          </motion.button>
        ) : (
          /* ── L'éventail parcourable : glisser du doigt + tap sur un dos ── */
          <div
            className="relative mx-auto"
            style={{ height: 102, maxWidth: 320, overflow: 'hidden', touchAction: 'none' }}
          >
            <div
              className="absolute left-1/2 top-1"
              style={{
                width: fanW,
                transform: `translateX(calc(-50% + ${offset}px))`,
                transition: drag.current.down ? 'none' : 'transform .2s ease-out',
              }}
            >
              {hand.map((c, i) => {
                const isPicked = picked.includes(i);
                return (
                  <motion.div
                    key={c.id}
                    data-cardback={i}
                    onClick={() => pick(i)}
                    className="absolute cursor-pointer overflow-hidden rounded-md"
                    style={{
                      left: i * STEP,
                      width: CARD_W,
                      height: CARD_W * 1.5,
                      zIndex: isPicked ? 0 : 10 + i,
                      border: `1.5px solid ${GOLD}${isPicked ? '33' : '99'}`,
                      boxShadow: isPicked
                        ? 'none'
                        : '0 3px 10px rgba(0,0,0,0.55), 0 0 10px rgba(218,165,32,0.12)',
                      opacity: isPicked ? 0.16 : 1,
                      pointerEvents: isPicked ? 'none' : 'auto',
                    }}
                    whileTap={{ scale: 0.94, y: -8 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={CARD_BACK}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ pointerEvents: 'none' }}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        <p
          className="mt-2 text-center text-[11px] italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}bb` }}
        >
          {!opened ? labels.tapDeck : picked.length < 3 ? labels.pick3 : labels.result}
        </p>
      </GameFrame>
      {picked.length < 3 && <SkipDemo label={labels.skip} onClick={onSkip} />}
    </div>
  );
}
