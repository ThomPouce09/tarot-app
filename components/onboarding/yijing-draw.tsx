'use client';

// components/onboarding/yijing-draw.tsx — Mini-jeu 2/4 du tutoriel :
// reproduit la mécanique RÉELLE de /yi-jing-simplifie :
//  - on pose le doigt sur la boîte de 49 baguettes d'achillée et on la TRAÎNE /
//    SECoue de gauche à droite : la boîte suit le doigt (mêmes sensibilités,
//    bornée) et chaque INVERSION de direction compte (REVERSALS_REQUIRED = 4
//    comme dans le jeu) ;
//  - secouer le smartphone fonctionne aussi (usePouchShake, même capteur que
//    les runes) ;
//  - threshold atteint → la baguette ÉLUE sort doucement du haut de la boîte,
//    halo doré, numéro, puis les 6 traits de l'hexagramme.
// Charte Yi Jing (laque noir/rouge/or) ; aucun son ; tap = fallback.

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GameFrame, GOLD, GOLD_PALE, IVORY, ROSE, SkipDemo } from './fx';
import { useSwipeGestures } from './use-swipe-gestures';
import { usePouchShake } from '@/components/rune-stones/use-pouch-shake';
import { playSound } from '@/lib/sounds';

const BOX_IMG = '/images/boite.png';
const STICK_IMG = '/images/baguette.png';
const REVERSALS_REQUIRED = 4; // même exigence que /yi-jing-simplifie
const MAX_SHIFT = 18; // débattement latéral max de la boîte (px)

// traits de l'hexagramme n° n (1-64) : pattern stable, comme une vraie table
function linesFor(n: number): boolean[] {
  return Array.from({ length: 6 }, (_, i) => ((n >> i) & 1) === 1);
}

export default function YiJingDraw({
  isEn,
  labels,
  onDone,
  onSkip,
}: {
  isEn: boolean;
  labels: { shake: string; count: (n: number) => string; tap: string; skip: string; result: string };
  onDone: () => void;
  onSkip: () => void;
}) {
  const [reversals, setReversals] = useState(0);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const [drawn, setDrawn] = useState(false);
  const firedRef = useRef(false);

  // numéro de la baguette élue + ses 6 traits
  const stick = useMemo(() => {
    const n = 1 + Math.floor(Math.random() * 64);
    return { n, lines: linesFor(n) };
  }, []);

  const finish = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    // comme /yi-jing-question : frottement juste avant la montée de l'élue…
    playSound('stick-draw', 0.8);
    setDrawn(true);
    // … puis le « sort » à la révélation de l'hexagramme (+1,9 s ≈ fin des traits)
    window.setTimeout(() => playSound('spell', 0.7), 1900);
    window.setTimeout(onDone, 4100);
  };

  const revRef = useRef(0); // compteur hors updater (updater = pur sous StrictMode)

  const bump = () => {
    if (firedRef.current) return;
    const next = revRef.current + 1;
    revRef.current = next;
    setReversals(Math.min(next, REVERSALS_REQUIRED));
    if (next >= REVERSALS_REQUIRED) window.setTimeout(finish, 250);
  };

  const gestures = useSwipeGestures({
    active: !drawn,
    threshold: 26, // amplitude min d'un demi-balancement (le jeu : ~24)
    onDrag: (dx, dy) => {
      if (firedRef.current) return;
      setShift((s) => ({
        x: Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, s.x + dx * 1.6)),
        y: Math.max(-8, Math.min(8, s.y + dy * 0.6)),
      }));
    },
    onOscillate: bump,
  });

  // shake du smartphone : mêmes secousses que le doigt
  usePouchShake(!drawn, bump);

  const remaining = REVERSALS_REQUIRED - reversals;

  return (
    <div>
      <GameFrame
        onPointerDown={gestures.onPointerDown}
        onPointerMove={gestures.onPointerMove}
        onPointerUp={gestures.onPointerUp}
        done={drawn}
      >
        <div className="relative mx-auto" style={{ height: 210, maxWidth: 320 }}>
          {/* ── Rig centré (flex, pas translateX:50% + x framer) ── */}
          <div className="absolute inset-0 flex items-center justify-center">
          {/* ── La boîte d'achillée : suit le doigt, tremble pendant le shake ──
              boîte.png = 290×600 → affichée 44px de large (~91px de haut),
              encore réduite d'1/3 sur demande, bien centrée. */}
          <motion.div
            onClick={() => {
              if (!drawn) {
                // tap = une secousse (fallback accessibilité du jeu)
                bump();
              }
            }}
            className="relative cursor-pointer"
            animate={
              drawn
                ? { x: 0, y: 0, rotate: 0 }
                : { x: shift.x, y: shift.y, rotate: shift.x * 0.18 }
            }
            transition={{ type: 'tween', duration: 0.08 }}
            style={{ width: 33 }} // encore réduite d'1/4 sur demande (44 → 33)
            aria-label={labels.tap}
          >
            {/* baguettes qui émergent — l'IMAGE de la boîte est w-full de ce
                rig (33). 5 tiges de 2px, centrées dans la bouche du couvercle
                (35→63% de la largeur = 11.6→20.8), jamais au bord. Au tirage :
                plusieurs sortent brièvement, l'élue (i=2) s'envole plus haut. */}
            <div className="relative mx-auto" style={{ width: 33, height: 30 }}>
              {Array.from({ length: 5 }, (_, i) => (
                <motion.img
                  key={i}
                  src={STICK_IMG}
                  alt=""
                  className="absolute"
                  style={{
                    left: 11.7 + i * 1.75, // 11.7 → 18.7 (+2 = 20.7) : pile dans la bouche (11.6→20.8)
                    bottom: 6, // la pointe dépasse de 6px AU-DESSUS du bord → « dans la boîte »
                    width: 2,
                    height: 30,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    filter: 'brightness(0.92)',
                  }}
                  animate={
                    drawn
                      ? i === 2
                        ? { y: -58, rotate: 4 } // l'élue (centre de la bouche) : beaucoup plus haut
                        : [1, 3].includes(i)
                          ? { y: -14 - i * 2, rotate: (i - 2) * 3 } // deux autres dépassent
                          : { y: -3 } // le reste retombe dans la boîte
                      : { y: [0, -(i % 3) * 1.2, 0] }
                  }
                  transition={
                    drawn
                      ? i === 2
                        ? { duration: 1.1, ease: 'easeOut' }
                        : { duration: 0.7, delay: i === 1 || i === 3 ? 0.15 : 0, ease: 'easeOut' }
                      : {
                          repeat: Infinity,
                          duration: 0.9 + (i % 4) * 0.16,
                          delay: i * 0.05,
                        }
                  }
                />
              ))}
              {/* halo doré sur l'élue — monte avec elle */}
              {drawn && (
                <motion.div
                  className="absolute"
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0.85], y: -46 }}
                  transition={{ delay: 0.5, duration: 1.1, ease: 'easeOut' }}
                  style={{
                    left: 12.2, // centre de l'élue i=2 : 11.7 + 2*1.75 + 1 = 16.2 → halo 8px à 12.2
                    bottom: 26,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    boxShadow: '0 0 12px 4px rgba(243,201,105,0.75)',
                    background: 'rgba(255,233,168,0.9)',
                  }}
                />
              )}
              {/* le corps de la boîte passe par-dessus les tiges */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BOX_IMG}
                alt={isEn ? 'Yarrow stalks box' : 'Boîte de baguettes d’achillée'}
                className="relative block w-full"
                style={{
                  filter: `drop-shadow(0 5px 12px rgba(0,0,0,0.5)) drop-shadow(0 0 ${
                    drawn ? 0 : 10
                  }px rgba(243,201,105,0.45))`,
                  pointerEvents: 'none',
                }}
              />
            </div>
          </motion.div>
          </div>

          {/* ── Résultat : numéro + les 6 traits, pendant que la boîte s'efface ── */}
          {drawn && (
            <motion.div
              className="absolute right-1 top-1 flex flex-col items-center gap-1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
            >
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px]"
                style={{
                  background: 'rgba(20,14,30,0.82)',
                  border: `1px solid ${GOLD}88`,
                  color: GOLD_PALE,
                  fontFamily: 'var(--font-cinzel), serif',
                }}
              >
                {isEn ? 'Stalk' : 'Tige'} n° {stick.n}
              </span>
              <div className="flex flex-col-reverse gap-[3px]">
                {stick.lines.map((solid, i) => (
                  <motion.div
                    key={i}
                    className="flex justify-center gap-1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.25 + i * 0.12 }}
                  >
                    {solid ? (
                      <span
                        style={{
                          width: 42,
                          height: 4,
                          background: `linear-gradient(90deg, ${GOLD}66, ${GOLD_PALE}, ${GOLD}66)`,
                          borderRadius: 2,
                        }}
                      />
                    ) : (
                      <>
                        <span
                          style={{
                            width: 17,
                            height: 4,
                            background: `linear-gradient(90deg, ${GOLD}66, ${GOLD_PALE})`,
                            borderRadius: 2,
                          }}
                        />
                        <span
                          style={{
                            width: 17,
                            height: 4,
                            background: `linear-gradient(90deg, ${GOLD_PALE}, ${GOLD}66)`,
                            borderRadius: 2,
                          }}
                        />
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* consigne vivante */}
        <p
          className="mt-2 text-center text-[11px] italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}bb` }}
        >
          {drawn
            ? labels.result
            : remaining > 0 && reversals > 0
              ? labels.count(remaining)
              : labels.shake}
        </p>
        {/* jauge de secousses (discrète) */}
        {!drawn && (
          <div className="mx-auto mt-1 flex justify-center gap-1.5">
            {Array.from({ length: REVERSALS_REQUIRED }, (_, i) => (
              <span
                key={i}
                className="block h-1 w-6 rounded-full"
                style={{
                  background: i < reversals ? GOLD : `${IVORY}22`,
                  boxShadow: i < reversals ? `0 0 8px ${GOLD}88` : 'none',
                }}
              />
            ))}
          </div>
        )}
      </GameFrame>
      {!drawn && <SkipDemo label={labels.skip} onClick={onSkip} />}
    </div>
  );
}
