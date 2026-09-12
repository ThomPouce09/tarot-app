'use client';

// components/onboarding/rune-draw.tsx — Mini-jeu 3/4 du tutoriel :
// reproduit la mécanique RÉELLE de /runes/nornes (RuneStonesSet) :
//  - le pochon (même artwork, réduit et centré comme le jeu) est un PENDULE :
//    posé dessus, on le fait balancer gauche/droite, il suit le doigt
//    (SWAY_MAX = 34 px) et chaque demi-balancement >= 22 px compte comme une
//    « poussée » (advance()) ;
//  - le TAP compte aussi comme une poussée (accessibilité, comme onPouchTap) ;
//  - secouer le smartphone compte pareil (usePouchShake) ;
//  - seuil aléatoire 2–4 poussées (mêmes thresholds que le jeu) → la rune
//    VRAIE (domino d'os 3D <RuneStone/>, le composant du jeu) jaillit du
//    pochon, particules dorées, puis se pose dans son emplacement gravé.
// Charte nordique ; aucun son ; fallback tap garanti.

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GameFrame, GOLD, GOLD_PALE, IVORY, ROSE, SkipDemo } from './fx';
import { usePouchShake } from '@/components/rune-stones/use-pouch-shake';
import { ELDER_FUTHARK } from '@/components/rune-stones/runes';
import { RuneStone } from '@/components/rune-stones/RuneStonesSet';
import { playRandom } from '@/lib/sounds';

const POCHON_IMG = '/images/pochon.png';
const SWING_MIN_PX = 22; // amplitude min d'un demi-balancement (jeu : 22)
const SWAY_MAX = 34; // débattement latéral max du pochon (jeu : 34)
const POUCH_W = 72; // pochon du tutoriel : réduit des 3/4 (le jeu : 150 px)

export default function RuneDraw({
  isEn,
  labels,
  onDone,
  onSkip,
}: {
  isEn: boolean;
  labels: {
    shake: string;
    again: string;
    tap: string;
    skip: string;
    result: (r: string, k: string) => string;
  };
  onDone: () => void;
  onSkip: () => void;
}) {
  const rune = useMemo(() => {
    const r = ELDER_FUTHARK[Math.floor(Math.random() * ELDER_FUTHARK.length)];
    return { ...r, rev: Math.random() < 0.3 }; // rev = booléen (la clé string 'reversed' du data reste intacte)
  }, []);
  // Seuils identiques au jeu : 2 à 4 poussées avant que la rune sorte.
  const threshold = useMemo(() => 2 + Math.floor(Math.random() * 3), []);

  const [pushes, setPushes] = useState(0);
  const [sway, setSway] = useState(0);
  const [out, setOut] = useState(false); // la rune jaillit
  const [settled, setSettled] = useState(false); // elle est posée
  const firedRef = useRef(false);
  const pushesRef = useRef(0); // compteur hors updater (updater = pur, sinon onDone double)
  const drag = useRef({ down: false, x0: 0, dir: 0, travel: 0, last: 0, tLast: 0 });

  const advance = () => {
    if (firedRef.current) return;
    // les runes remuées dans le pochon (comme RuneStonesSet.advance)
    playRandom('runes-handle-1', 'runes-handle-2');
    const next = pushesRef.current + 1;
    pushesRef.current = next;
    setPushes(Math.min(next, threshold));
    if (next >= threshold) {
      firedRef.current = true;
      // la rune jaillit → chute + impact (mêmes sons que le jeu)
      playRandom('rune-falling-1', 'rune-falling-2', 'rune-hit-1');
      window.setTimeout(() => setOut(true), 120);
      window.setTimeout(() => setSettled(true), 950);
      window.setTimeout(onDone, 3000);
    }
  };

  // balancement pendule (pointer) — même logique que le jeu
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { down: true, x0: e.clientX, dir: 0, travel: 0, last: e.clientX, tLast: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.down || firedRef.current) return;
    const dx = e.clientX - d.last;
    d.last = e.clientX;
    // le pochon suit le doigt (borné)
    setSway((s) => Math.max(-SWAY_MAX, Math.min(SWAY_MAX, s + dx * 1.4)));
    const dir = dx > 2 ? 1 : dx < -2 ? -1 : 0;
    if (dir === 0) return;
    if (d.dir === 0) d.dir = dir;
    else if (dir === d.dir) d.travel += Math.abs(dx);
    else {
      if (d.travel >= SWING_MIN_PX && Date.now() - d.tLast > 180) {
        d.tLast = Date.now();
        advance(); // une poussée par demi-balancement (comme le jeu)
      }
      d.dir = dir;
      d.travel = Math.abs(dx);
    }
  };
  const onPointerUp = () => {
    drag.current.down = false;
    setSway(0); // retour souple du pendule
  };

  // secousse du smartphone : poussées identiques au jeu
  usePouchShake(!firedRef.current, advance);

  return (
    <div>
      <GameFrame onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} done={settled}>
        <div className="relative mx-auto" style={{ height: 238, maxWidth: 320 }}>
          {/* ── Emplacement gravé (pierre du jeu) — la rune s'y pose ── */}
          <div
            className="absolute left-1/2 top-2"
            style={{
              width: 48,
              height: 64,
              marginLeft: -24,
              borderRadius: 10,
              background: 'linear-gradient(160deg, rgba(58,52,44,0.55), rgba(30,26,22,0.65))',
              border: `1.5px dashed ${GOLD}44`,
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.45)',
            }}
          >
            {settled && (
              <motion.div
                className="absolute left-1/2 top-1/2"
                style={{ marginLeft: -27, marginTop: -39, perspective: 700, '--shx': '35%', '--shy': '28%', '--shi': '0.5' } as React.CSSProperties}
                initial={{ y: -52, opacity: 0, rotate: -16 }}
                animate={{ y: 0, opacity: 1, rotate: rune.rev ? 6 : 4, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 240, damping: 15 }}
              >
                <RuneStone symbol={rune.symbol} reversed={rune.rev} name={rune.name} />
              </motion.div>
            )}
            {settled && (
              <motion.p
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.2em]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                style={{ fontFamily: 'var(--font-cinzel), serif', color: `${GOLD_PALE}dd` }}
              >
                {rune.name}
                {rune.rev ? (isEn ? ' · reversed' : ' · renversée') : ''}
              </motion.p>
            )}
          </div>

          {/* ── Le pochon pendule : réduit, centré, suit le doigt ── */}
          <motion.div
            className="absolute bottom-2 left-1/2"
            style={{
              width: POUCH_W,
              height: POUCH_W,
              marginLeft: -POUCH_W / 2,
              transform: `translateX(${sway}px) rotate(${sway * 0.35}deg)`,
              transformOrigin: 'top center',
              transition: drag.current.down ? 'none' : 'transform .5s cubic-bezier(.22,1.4,.4,1)',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (!firedRef.current) advance(); // tap = poussée (comme onPouchTap)
            }}
            aria-label={labels.tap}
          >
            {/* la vraie rune (domino d'os 3D) jaillit par la LÈVRE du pochon :
                départ y≈14 (au niveau du lien du sac, pas du ventre) puis montée */}
            {out && !settled && (
              <motion.div
                className="absolute left-1/2 top-0 z-20"
                style={{ marginLeft: -27, marginTop: -12, perspective: 700, '--shx': '35%', '--shy': '28%', '--shi': '0.5' } as React.CSSProperties}
                initial={{ y: 14, opacity: 1, scale: 0.25, rotate: -20 }}
                animate={{ y: -145, opacity: 1, scale: 0.5, rotate: 8 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <RuneStone symbol={rune.symbol} reversed={false} name={rune.name} />
              </motion.div>
            )}
            {/* particules dorées au jaillissement (burstKey du jeu) */}
            {out &&
              Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-2 z-10 block h-1 w-1 rounded-full"
                    style={{ background: GOLD_PALE, boxShadow: `0 0 6px ${GOLD}` }}
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 38 - 10, opacity: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                );
              })}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={POCHON_IMG}
              alt={isEn ? 'Rune pouch' : 'Pochon de runes'}
              className="block h-full w-full object-contain"
              style={{
                filter: `drop-shadow(0 6px 12px rgba(0,0,0,0.55)) drop-shadow(0 0 ${
                  firedRef.current ? 0 : 9
                }px rgba(218,165,32,0.35))`,
                pointerEvents: 'none',
                transform: out ? 'translateY(5px) rotate(-4deg)' : undefined,
                transition: 'transform .35s ease',
              }}
            />
          </motion.div>

          {/* indication « pousse » (flèches ⇄ comme le hint du jeu) */}
          {!firedRef.current && (
            <motion.p
              className="absolute bottom-[96px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px]"
              animate={{ x: [-6, 6, -6] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{ color: `${GOLD_PALE}bb` }}
            >
              ⇄
            </motion.p>
          )}
        </div>

        {/* consigne vivante */}
        <p
          className="mt-2 text-center text-[11px] italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}bb` }}
        >
          {settled
            ? labels.result(rune.name, (rune.rev ? rune.reversed : rune.upright).split(',')[0].toLowerCase())
            : firedRef.current
              ? ''
              : pushes > 0
                ? labels.again
                : labels.shake}
        </p>
        {/* jauge des poussées (seuil gardé secret : points = poussées restantes) */}
        {!firedRef.current && (
          <div className="mx-auto mt-1 flex justify-center gap-1.5">
            {Array.from({ length: threshold }, (_, i) => (
              <span
                key={i}
                className="block h-1.5 w-1.5 rounded-full"
                style={{
                  background: i < pushes ? GOLD : `${IVORY}26`,
                  boxShadow: i < pushes ? `0 0 6px ${GOLD}aa` : 'none',
                }}
              />
            ))}
          </div>
        )}
      </GameFrame>
      {!settled && <SkipDemo label={labels.skip} onClick={onSkip} />}
    </div>
  );
}
