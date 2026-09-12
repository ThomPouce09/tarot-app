'use client';

// components/onboarding/dice-draw.tsx — Mini-jeu 4/4 du tutoriel :
// reproduit la mécanique RÉELLE de /des-divinatoires/affinage (AstroDiceCup) :
//  - PAD de secousse : on pose le doigt et on secoue GAUCHE/DROITE — le
//    gobelet de dés suit le doigt (amplifié ×2.8, borné, comme le jeu) ;
//  - comme dans le tirage réel, les mini-dés (os clair) sont VISIBLES dans le
//    gobelet dès avant le lancer et y rebondissent pendant la secousse ;
//  - puis DRAG VERTICAL DOMINANT vers le HAUT (> 36 px, seuil exact du jeu)
//    → CASCADE rapide gobelet2 → gobelet3 + lancer dans la PISTE : tapis ROND
//    vu de dessus (caméra zénithale de l'arène) ; les 3 d12 argent "moon"
//    (WebGL, ssr:false) roulent du bord du tapis vers son centre et s'y
//    posent en ~1,5 s (garde-fou 2D si WebGL indisponible) ; le verdict reste
//    affiché ~2,6 s avant d'enchaîner ;
//  - le TAP franc reste le fallback (launch() du jeu) ;
//  - résultat : Planète · Signe · Maison, lu sur les dés posés.
// Sons : ceux du vrai tirage (dice-shake / dice-throw / spell) via lib/sounds.

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { GameFrame, GOLD, GOLD_PALE, ROSE, SkipDemo } from './fx';
import { PLANETS, SIGNS, randomTargetFaces, type TargetFaces } from '@/components/astro-dice/glyphs';
import { installSoundUnlock, playRandom, playSound } from '@/lib/sounds';

// Le vrai jeu de dés 3D (three.js) — chargé uniquement quand cette slide monte.
const AstroDiceSet = dynamic(() => import('@/components/astro-dice/AstroDiceSet'), { ssr: false });

const CUP1 = '/images/gobelet1.png';
const CUP2 = '/images/gobelet2.png';
const CUP3 = '/images/gobelet3.png';
const CUP_W = 44; // gobelet réduit des 3/4 sur demande (le jeu : 200 px)
// Réf STABLE (module) : un objet littéral en JSX recrée une dépendance d'effet
// à chaque render → AstroDiceSet relance le roulé une 2e fois (bug observé).
const SPAWN = { x: 0, z: 2.6 };

const PLANET_NAMES: Record<string, { fr: string; en: string }> = {
  '☉': { fr: 'Soleil', en: 'Sun' }, '☽': { fr: 'Lune', en: 'Moon' },
  '☿': { fr: 'Mercure', en: 'Mercury' }, '♀': { fr: 'Vénus', en: 'Venus' },
  '♂': { fr: 'Mars', en: 'Mars' }, '♃': { fr: 'Jupiter', en: 'Jupiter' },
  '♄': { fr: 'Saturne', en: 'Saturn' }, '♅': { fr: 'Uranus', en: 'Uranus' },
  '♆': { fr: 'Neptune', en: 'Neptune' }, '♇': { fr: 'Pluton', en: 'Pluto' },
  '☊': { fr: 'Nœud Nord', en: 'North Node' }, '☋': { fr: 'Nœud Sud', en: 'South Node' },
};
const SIGN_NAMES: Record<string, { fr: string; en: string }> = {
  '♈': { fr: 'Bélier', en: 'Aries' }, '♉': { fr: 'Taureau', en: 'Taurus' },
  '♊': { fr: 'Gémeaux', en: 'Gemini' }, '♋': { fr: 'Cancer', en: 'Cancer' },
  '♌': { fr: 'Lion', en: 'Leo' }, '♍': { fr: 'Vierge', en: 'Virgo' },
  '♎': { fr: 'Balance', en: 'Libra' }, '♏': { fr: 'Scorpion', en: 'Scorpio' },
  '♐': { fr: 'Sagittaire', en: 'Sagittarius' }, '♑': { fr: 'Capricorne', en: 'Capricorn' },
  '♒': { fr: 'Verseau', en: 'Aquarius' }, '♓': { fr: 'Poissons', en: 'Pisces' },
};

/* Le canvas WebGL ne doit JAMAIS bloquer le tutoriel : s'il échoue (WebView
   sans GPU, erreur drei/three), on retombe sur une pose 2D simplifiée. */
class GLBoundary extends Component<{ onError: () => void; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

export default function DiceDraw({
  isEn,
  labels,
  onDone,
  onSkip,
}: {
  isEn: boolean;
  labels: {
    shake: string;
    throw: string;
    tap: string;
    skip: string;
    result: (p: string, s: string, h: string) => string;
  };
  onDone: () => void;
  onSkip: () => void;
}) {
  const [shaking, setShaking] = useState(false);
  const [cupX, setCupX] = useState(0);
  const [tilt, setTilt] = useState(0); // 0 → -9 (gobelet2) → -18 (gobelet3)
  const [dropped, setDropped] = useState(false);
  const [rested, setRested] = useState(false);
  const [glFailed, setGlFailed] = useState(false);
  const firedRef = useRef(false);
  const doneRef = useRef(false);
  const g = useRef({ down: false, lastX: 0, x0: 0, y0: 0, t0: 0 });
  const shakeAt = useRef(0);

  // Autoplay : pré-déverrouille les sons de la slide au premier geste.
  useEffect(() => installSoundUnlock(), []);

  // Le chunk three.js (~1 Mo) se télécharge DÈS l'affichage de la slide :
  // sinon le premier lancer attend le téléchargement → dés déclenchés tard.
  useEffect(() => {
    import('@/components/astro-dice/AstroDiceSet').catch(() => {});
  }, []);

  // Tirage exact du jeu /des-divinatoires : mêmes glyphes, même maison (number).
  const faces = useMemo<TargetFaces>(() => randomTargetFaces(), []);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setRested(true); // les dés sont posés → bandeau de résultat en haut de piste
    playSound('spell', 0.5); // les dés sont posés → révélation
    // on LASSE VOIR les dés posés sur la piste avant d'enchaîner la slide suite
    window.setTimeout(onDone, 2600);
  };

  /* ── le renversement : cascade exacte d'AstroDiceCup, accélérée ── */
  const launch = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    playRandom('dice-throw-1', 'dice-throw-2', 'dice-throw-3', 'dices-throw-4');
    setCupX(0);
    setTilt(-9);
    window.setTimeout(() => {
      setTilt(-18);
      setDropped(true);
      // filet de sécurité : même si le canvas WebGL ne sème jamais onRest.
      window.setTimeout(finish, 3600);
    }, 250);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (firedRef.current) return;
    g.current = { down: true, lastX: e.clientX, x0: e.clientX, y0: e.clientY, t0: Date.now() };
    setShaking(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s.down || firedRef.current) return;
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    const up = s.y0 - e.clientY; // positif = vers le haut
    const totalX = Math.abs(e.clientX - s.x0);
    // drag vertical dominant vers le haut > 36 px → le gobelet se renverse
    if (up > 36 && Math.abs(up) >= totalX) {
      s.down = false;
      launch();
      return;
    }
    if (Math.abs(dx) > 1) {
      setCupX((x) => Math.max(-48, Math.min(48, x + dx * 2.8)));
      // le son « secousse du gobelet » comme le jeu, throttled 900 ms
      const now = Date.now();
      if (now - shakeAt.current > 900) {
        shakeAt.current = now;
        playRandom('dice-shake-1', 'dice-shake-2', 'dice-shake-3');
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s.down) return;
    s.down = false;
    // TAP franc (< 12 px, < 260 ms) = lancer (fallback du jeu)
    if (
      !firedRef.current &&
      Math.abs(e.clientX - s.x0) < 12 &&
      Math.abs(e.clientY - s.y0) < 12 &&
      Date.now() - s.t0 < 260
    ) {
      launch();
      return;
    }
    setCupX(0); // le gobelet se stabilise
  };

  const resultText = labels.result(
    `${faces.planet} ${PLANET_NAMES[faces.planet][isEn ? 'en' : 'fr']}`,
    `${faces.sign} ${SIGN_NAMES[faces.sign][isEn ? 'en' : 'fr']}`,
    `${isEn ? 'House' : 'Maison'} ${faces.house}`,
  );
  // bandeau lisible en HAUT de piste : le doigt masque les dés posés en bas
  const summary = `${faces.planet} ${PLANET_NAMES[faces.planet][isEn ? 'en' : 'fr']} · ${faces.sign} ${SIGN_NAMES[faces.sign][isEn ? 'en' : 'fr']} · ${isEn ? 'H' : 'M'}${faces.house}`;
  const hint = firedRef.current ? resultText : shaking ? labels.throw : labels.shake;

  return (
    <div>
      <GameFrame onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} done={rested}>
        <div className="relative mx-auto" style={{ height: 210, maxWidth: 320 }}>
          {/* ── LA PISTE DE DÉS : tapis ROND vu de dessus (même repère que
              l'arène WebGL zénithale) où les dés atterrissent ── */}
          <div
            className="absolute bottom-1 left-1/2"
            style={{
              width: 180,
              height: 180,
              marginLeft: -90,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 50% 42%, #1c2447 0%, #101731 55%, #0a0f22 100%)',
              border: `1.5px solid ${GOLD}3a`,
              boxShadow: `inset 0 3px 12px rgba(0,0,0,0.55), 0 0 0 3px rgba(10,14,30,0.6), 0 8px 18px rgba(0,0,0,0.45)`,
              opacity: dropped || glFailed ? 1 : 0.85,
              transition: 'opacity .4s',
            }}
          >
            {/* liseré doré intérieur (piste de jeu) */}
            <div
              className="absolute inset-[7px] rounded-full"
              style={{ border: `1px dashed ${GOLD}2e` }}
            />
          </div>

          {/* ── L'arène RÉELLE posée SUR la piste : 3 d12 argent « moon »
              (comme /des-divinatoires), caméra zénithale = vue de dessus. ── */}
          {dropped && !glFailed && (
            <GLBoundary onError={() => setGlFailed(true)}>
              <div className="absolute left-1/2 bottom-0" style={{ width: 180, height: 180, marginLeft: -90 }}>
                <AstroDiceSet
                  isRolling
                  targetFaces={faces}
                  skin="moon"
                  spawn={SPAWN}
                  diceHop={0.34}
                  hideIdle
                  height={'100%'}
                  background="transparent"
                  rollDurationMs={1300}
                  onRest={finish}
                />
              </div>
            </GLBoundary>
          )}
          {/* fallback sans WebGL : les 3 faces tombées, posées sur le tapis rond */}
          {dropped && glFailed &&
            (
              [
                { g: faces.planet, x: -54, d: 0.15 },
                { g: faces.sign, x: 0, d: 0.35 },
                { g: faces.house, x: 54, d: 0.55 },
              ] as const
            ).map((die, i) => (
              <motion.div
                key={i}
                className="absolute bottom-[66px] left-1/2 flex items-center justify-center"
                style={{
                  marginLeft: die.x - 24,
                  width: 48,
                  height: 48,
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  background: 'radial-gradient(circle at 35% 28%, #eef1f8 0%, #cdd3e0 55%, #9aa4bc 100%)',
                  boxShadow: `0 0 0 1.5px ${GOLD}88, 0 6px 14px rgba(0,0,0,0.5)`,
                }}
                initial={{ y: -70, opacity: 0, rotate: -140, scale: 0.65 }}
                animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                transition={{ delay: die.d, duration: 0.6, ease: 'easeOut' }}
              >
                <span style={{ fontSize: 21, color: '#3a2f4a', textShadow: '0 0 8px rgba(218,165,32,0.4)' }}>
                  {die.g}
                </span>
              </motion.div>
            ))}

          {/* ── le gobelet de dés : posé BAS sur le tapis (au bord le plus
              proche) — les dés roulent de son bord vers le CENTRE de la
              piste, comme dans le vrai jeu — suit la secousse ── */}
          <div
            className="absolute bottom-[8px] left-1/2"
            style={{
              width: CUP_W,
              marginLeft: -CUP_W / 2,
              transform: `translateX(${cupX}px) rotate(${tilt}deg)`,
              transformOrigin: 'bottom right',
              transition: g.current.down && !firedRef.current ? 'none' : 'transform .28s ease-out',
              cursor: 'pointer',
              pointerEvents: dropped ? 'none' : 'auto',
              zIndex: 5,
            }}
            aria-label={labels.tap}
          >
            {/* VRAIS mini-dés d'os CLAIR visibles DANS le gobelet (comme le
                tirage réel) : ils y reposent, puis rebondissent à la secousse. */}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute block rounded-[2.5px]"
                style={{
                  left: 12 + i * 8,
                  top: 15,
                  width: 7,
                  height: 7,
                  background: 'radial-gradient(circle at 35% 30%, #f4efe2, #cbb994)',
                  border: '1px solid rgba(80,60,30,0.5)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
                  zIndex: 2,
                  opacity: firedRef.current ? 0 : 0.95,
                  transition: 'opacity .3s',
                }}
                animate={shaking && !firedRef.current ? { y: [0, -8, 0], x: [0, (i - 1) * 4, 0] } : { y: 0, x: 0 }}
                transition={{ repeat: shaking && !firedRef.current ? Infinity : 0, duration: 0.34 + i * 0.07 }}
              />
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={!firedRef.current ? CUP1 : tilt === -9 ? CUP2 : CUP3}
              alt={isEn ? 'Dice cup' : 'Gobelet de dés'}
              className="block w-full"
              style={{
                filter: 'drop-shadow(0 5px 9px rgba(0,0,0,0.55))',
                pointerEvents: 'none',
                transform: tilt === -18 ? 'translateY(10px)' : undefined,
                transition: 'transform .3s ease',
                opacity: tilt === -18 ? 0.92 : 1,
              }}
            />
          </div>

          {/* résultat en HAUT de piste, zone dégagée au-dessus du doigt.
              NB : wrapper flex center — motion écrase `transform`, donc jamais
              de -translate-x-1/2 sur le motion.div lui-même. */}
          {rested && (
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center px-1">
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="whitespace-nowrap rounded-full px-3 py-1 text-[11px]"
                style={{
                  background: 'rgba(16,10,28,0.88)',
                  border: `1px solid ${GOLD}99`,
                  color: GOLD_PALE,
                  fontFamily: 'var(--font-cinzel), serif',
                  boxShadow: '0 0 16px rgba(218,165,32,0.35)',
                }}
              >
                ✦ {summary}
              </motion.div>
            </div>
          )}
          {/* invite gauche/droite tant qu'on n'a pas secoué (wrapper : motion écrase transform) */}
          {!shaking && !firedRef.current && (
            <div className="pointer-events-none absolute bottom-[116px] left-0 right-0 flex justify-center">
              <motion.p
                className="whitespace-nowrap text-[12px]"
                animate={{ x: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                style={{ color: `${GOLD_PALE}aa` }}
              >
                ◀ ▶
              </motion.p>
            </div>
          )}
          {/* invite vers le haut dès que ça secoue */}
          {shaking && !firedRef.current && (
            <motion.p
              className="absolute right-4 top-2 text-[13px]"
              animate={{ y: [3, -7, 3] }}
              transition={{ repeat: Infinity, duration: 1.3 }}
              style={{ color: `${GOLD_PALE}cc` }}
            >
              ▲
            </motion.p>
          )}
        </div>

        <p
          className="mt-2 text-center text-[11px] italic"
          style={{ fontFamily: 'var(--font-cinzel), serif', color: `${ROSE}bb` }}
        >
          {hint}
        </p>
      </GameFrame>
      {!firedRef.current && <SkipDemo label={labels.skip} onClick={onSkip} />}
    </div>
  );
}
