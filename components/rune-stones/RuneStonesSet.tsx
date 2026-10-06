'use client';

// components/rune-stones/RuneStonesSet.tsx
// Tirage de runes : pochon en bas, emplacements fixes en haut.
// - Vol en arc avec tumbling 3D : la rune sort FACE CACHÉE et se révèle en vol.
// - Épaisseur réelle : boîte 3D canonique (faces latérales aux bonnes dimensions).
// - Parallaxe DeviceOrientation renforcé (2 axes) + fallback souris desktop.
// - Extras : ombre au sol dynamique, reflet spéculaire lié au tilt, particules dorées.
//
// API inchangée : count, layout, isRolling, onRest, height.

import { tr } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { drawRunes, type Rune, type RuneLayout } from './runes';
import { installSoundUnlock, playRandom } from '@/lib/sounds';

export interface RuneStonesSetProps {
  count?: number;
  layout?: RuneLayout;
  isRolling?: boolean;
  onRest?: (runes: DrawnRune[]) => void;
  height?: number;
  /** Runes pré-tirées (tirage à l'aveugle) : utilisées telles quelles au lieu
   * d'un tirage aléatoire. Doit avoir exactement `count` éléments. */
  preset?: DrawnRune[];
  /** A chaque rune revelée : nombre de runes au repos (0..count) —
   *  pilote l allumage zone par zone de l arbre Yggdrasil. */
  onReveal?: (n: number) => void;
}

export interface DrawnRune {
  rune: Rune;
  reversed: boolean;
}

import { STONE_W, STONE_H, POUCH, pouchYFor, slotsFor, revealOrder, useDeviceTilt } from './stone-layout';
import { FlyingStone, GoldBurst, Pouch } from './stone-views';

export default function RuneStonesSet({
  count = 3,
  layout = 'horizontal',
  isRolling = false,
  onRest,
  height = 440,
  preset,
  onReveal,
}: RuneStonesSetProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const { enable: enableTilt } = useDeviceTilt(tableRef);

  const [stones, setStones] = useState<DrawnRune[]>([]);
  const [thresholds, setThresholds] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [pushes, setPushes] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'drawing' | 'done'>('idle');
  const [burstKey, setBurstKey] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const restFired = useRef(false);
  // Pochon : agitation gauche-droite (pointeur) → libération douce des runes.
  const swayRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: number;
    lastX: number;
    x: number;
    sign: number;
    segment: number;
    moved: number;
    lastAdvance: number;
  } | null>(null);
  // Secouage smartphone : phase lue par le listener (évite les closures) +
  // compteurs de demi-balancements (gamma = roulis gauche/droite ; motion =
  // accélération latérale). `last` partagé → une seule poussée par
  // demi-balancement, quel que soit le capteur qui le détecte.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const shakeRef = useRef({ sign: 0, peak: 0, last: 0 });
  const motionRef = useRef({ sign: 0, peak: 0 });

  // ── Sons : déverrouillage au premier geste (autoplay policy). ──
  useEffect(() => {
    installSoundUnlock();
  }, []);

  useEffect(() => { onReveal?.(revealed); }, [revealed, onReveal]);

  const order = useMemo(() => revealOrder(layout, count), [layout, count]);
  const slots = useMemo(() => slotsFor(layout, count), [layout, count]);
  const pouchY = pouchYFor(height, layout);
  const pouchScale = (layout === 'tree' || layout === 'hammer') ? 0.6 : 1;

  useEffect(() => {
    if (!isRolling) {
      restFired.current = false;
      setPhase('idle');
      return;
    }
    const picks =
      preset && preset.length === count
        ? preset
        : drawRunes(count).map((rune) => ({
            rune,
            reversed: Math.random() < 0.3,
          }));
    const thr = Array.from(
      { length: count },
      () => 2 + Math.floor(Math.random() * 3),
    );
    setStones(picks);
    setThresholds(thr);
    setRevealed(0);
    setPushes(0);
    setPhase('drawing');
    restFired.current = false;
    // Effet gyroscopique (parallaxe 3D des pierres + suivi du pochon) : armé
    // DÈS le début du tirage. Android/APK : fonctionne sans geste. iOS : le
    // requestPermission échoue silencieusement hors geste et sera re-tenté au
    // premier tap/drag du pochon (onPouchDown) — aucun blocage possible.
    void enableTilt();
  }, [isRolling, count, preset, enableTilt]);

  // Une « poussée » : remuage du pochon (tap OU demi-balancement). Quand le
  // seuil de la rune courante est atteint, la rune jaillit doucement.
  const advance = useCallback(() => {
    if (phase !== 'drawing' || revealed >= count) return;
    playRandom('runes-handle-1', 'runes-handle-2');
    const next = pushes + 1;
    setPushes(next);
    setShowHint(false); // le premier geste suffit : le tuto disparaît
    if (next >= (thresholds[revealed] ?? 3)) {
      const justRevealed = revealed;
      setRevealed((v) => v + 1);
      setPushes(0);
      setBurstKey((k) => k + 1); // déclenche les particules dorées
      // La rune jaillit du pochon → chute.
      playRandom('rune-falling-1', 'rune-falling-2', 'rune-hit-1');
      if (justRevealed + 1 >= count) setPhase('done');
    }
  }, [phase, pushes, revealed, count, thresholds]);

  // iOS : devicemotion a SA propre permission (séparée de deviceorientation).
  // Android (APK) : aucun appel nécessaire — simple no-op.
  const motionPermRef = useRef(false);
  const enableMotionPermission = useCallback(async () => {
    if (motionPermRef.current) return;
    motionPermRef.current = true;
    try {
      const DME = (window as unknown as {
        DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
      }).DeviceMotionEvent;
      if (DME && typeof DME.requestPermission === 'function') {
        await DME.requestPermission();
      }
    } catch {
      // non supporté / refusé — on s'appuie sur deviceorientation seul
    }
  }, []);

  // Tap simple (accessibilité / desktop) : équivaut à une poussée.
  const onPouchTap = useCallback(() => {
    void enableTilt();
    void enableMotionPermission();
    advance();
  }, [advance, enableTilt, enableMotionPermission]);

  // ── Agitation gauche-droite : le pochon suit le doigt (pendule) et chaque
  //    demi-balancement compte comme une poussée. ──
  const SWING_MIN_PX = 22; // amplitude minimale d'un demi-balancement
  const SWAY_MAX = 34; // débattement latéral max du pochon (px)

  const applySway = (x: number) => {
    const el = swayRef.current;
    if (!el) return;
    const rot = (x / SWAY_MAX) * 16; // inclinaison liée au déplacement
    el.style.transform = `translateX(${x.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
  };

  const onPouchDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      void enableTilt();
      void enableMotionPermission();
      if (phase !== 'drawing' || revealed >= count) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        id: e.pointerId,
        lastX: e.clientX,
        x: 0,
        sign: 0,
        segment: 0,
        moved: 0,
        lastAdvance: 0,
      };
      setDragActive(true);
      if (swayRef.current) swayRef.current.style.transition = 'none';
    },
    [phase, revealed, count, enableTilt, enableMotionPermission],
  );

  const onPouchMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.lastX;
      d.lastX = e.clientX;
      if (dx === 0) return;
      d.moved += Math.abs(dx);
      // Pendule : le pochon suit le mouvement, borné.
      d.x = Math.max(-SWAY_MAX, Math.min(SWAY_MAX, d.x + dx * 0.85));
      applySway(d.x);
      // Compte un demi-balancement à chaque inversion de sens assez ample.
      const sign = dx > 0.6 ? 1 : dx < -0.6 ? -1 : 0;
      if (sign !== 0 && sign !== d.sign) {
        const now = Date.now();
        if (
          d.segment >= SWING_MIN_PX &&
          now - d.lastAdvance > 160 &&
          phase === 'drawing'
        ) {
          d.lastAdvance = now;
          advance();
        }
        d.sign = sign;
        d.segment = 0;
      } else if (sign !== 0) {
        d.segment += Math.abs(dx);
      }
    },
    [phase, advance],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      dragRef.current = null;
      setDragActive(false);
      // Retour souple du pendule (le TAP, lui, est géré par onClick natif :
      // le navigateur ne déclenche click qu'en l'absence de déplacement).
      if (swayRef.current) {
        swayRef.current.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';
        applySway(0);
      }
    },
    [],
  );

  // Tuto visuel : n'apparaît qu'au premier tirage (jamais revu ensuite).
  // Clé `tarot_rune_gesture_hint` : nouvelle génération (texte tap/secouer).
  useEffect(() => {
    if (phase !== 'drawing' || revealed >= count) {
      setShowHint(false);
      return;
    }
    let seen = false;
    try {
      seen = localStorage.getItem('tarot_rune_gesture_hint') === '1';
    } catch {
      // stockage indisponible — on affiche quand même
    }
    if (pushes > 0) {
      try {
        localStorage.setItem('tarot_rune_gesture_hint', '1');
      } catch {
        // ignore
      }
      setShowHint(false);
      return;
    }
    if (!seen) {
      setShowHint(true);
      const t = window.setTimeout(() => setShowHint(false), 10000);
      return () => window.clearTimeout(t);
    }
  }, [phase, revealed, count, pushes]);

  // ── Secouage du smartphone : le bag suit l'inclinaison gauche/droite
  //    (gamma) et chaque demi-balancement = une poussée. L'accélération
  //    latérale (devicemotion) complète le roulis pour les secousses en
  //    translation (« lancer de dés »). Écoute active uniquement pendant le
  //    tirage. iOS : permission demandée au premier geste (enableTilt dans
  //    useDeviceTilt) — Android (APK) : événements sans permission. ──
  useEffect(() => {
    if (phase !== 'drawing') return;
    // Comptage partagé : un seul « last » pour les deux capteurs. Fenêtre
    // 320 ms → la sortie des runes reste douce même en secouant franchement.
    const tryCount = (st: { sign: number; peak: number }, now: number, minPeak: number) => {
      if (st.peak >= minPeak && now - shakeRef.current.last > 320) {
        shakeRef.current.last = now;
        advance();
      }
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      const g = e.gamma ?? 0;
      if (Math.abs(g) < 2.2) return;
      // Le bag penche avec le téléphone (sauf quand on le tire au doigt).
      const el = swayRef.current;
      if (el && !dragRef.current) {
        const x = Math.max(-SWAY_MAX, Math.min(SWAY_MAX, g * 1.5));
        const rot = (x / SWAY_MAX) * 16;
        el.style.transform = `translateX(${x.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
      }
      if (phaseRef.current !== 'drawing') return;
      const s = g > 4 ? 1 : g < -4 ? -1 : 0;
      if (s === 0) return;
      const st = shakeRef.current;
      const now = Date.now();
      if (s !== st.sign) {
        tryCount(st, now, 20);
        st.sign = s;
        st.peak = 0;
      } else {
        st.peak = Math.max(st.peak, Math.abs(g));
      }
    };
    const onMotion = (e: DeviceMotionEvent) => {
      if (phaseRef.current !== 'drawing') return;
      const acc = e.acceleration ?? e.accelerationIncludingGravity ?? null;
      if (!acc || acc.x == null) return;
      // Sans gravité : seuils bas. Avec gravité : le roulis statique ajoute un
      // offset → seuils plus hauts pour ne compter que de vraies secousses.
      const gravityFree = e.acceleration != null;
      const a = gravityFree ? acc.x : acc.x * 0.85;
      if (Math.abs(a) < (gravityFree ? 0.9 : 1.6)) return;
      const dead = gravityFree ? 1.1 : 1.9;
      const minPeak = gravityFree ? 3.6 : 5.2;
      const s = a > dead ? 1 : a < -dead ? -1 : 0;
      if (s === 0) return;
      const st = motionRef.current;
      const now = Date.now();
      if (s !== st.sign) {
        tryCount(st, now, minPeak);
        st.sign = s;
        st.peak = 0;
      } else {
        st.peak = Math.max(st.peak, Math.abs(a));
      }
    };
    window.addEventListener('deviceorientation', onOrient);
    window.addEventListener('devicemotion', onMotion);
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('devicemotion', onMotion);
    };
  }, [phase, advance]);

  useEffect(() => {
    if (phase !== 'done') return;
    if (!restFired.current) {
      restFired.current = true;
      onRest?.(stones);
    }
  }, [phase, stones, onRest]);

  const need = thresholds[revealed] ?? 0;
  const active = phase === 'drawing';

  return (
    <div
      className="relative w-full select-none"
      style={{ height: `${height}px`, overflow: 'hidden', perspective: 900 }}
      aria-label={`Tirage de ${count} runes`}
    >
      {/* Emplacements fixes (hors couche inclinable). */}
      {slots.map(([sx, sy], i) => (
        <div
          key={`slot-${i}`}
          className="absolute"
          style={{
            left: `${sx}%`,
            top: `${sy}%`,
            transform: 'translate(-50%, -50%)',
            width: STONE_W + 12,
            height: STONE_H + 12,
            borderRadius: 10,
            border: '1px dashed rgba(232,217,172,0.32)',
            boxShadow: 'inset 0 0 12px rgba(232,217,172,0.08)',
          }}
        />
      ))}

      {/* Couche inclinable (runes uniquement). */}
      <div
        ref={tableRef}
        className="absolute inset-0"
        style={
          {
            transformStyle: 'preserve-3d',
            '--shx': '50%',
            '--shy': '38%',
            '--shi': '0.3',
          } as React.CSSProperties
        }
      >
        <AnimatePresence>
          {stones.map((s, i) => {
            const shown = order.indexOf(i) < revealed;
            if (!shown) return null;
            const [sx, sy] = slots[i];
            const dropY = ((pouchY - sy) / 100) * height;
            const dropX = ((POUCH.x - sx) / 100) * 100; // approx. en px (léger)
            return (
              <FlyingStone
                key={`${s.rune.name}-${i}`}
                stone={s}
                dropX={dropX}
                dropY={dropY}
                left={sx}
                top={sy}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Particules dorées à la sortie du pochon. */}
      {burstKey > 0 && (
        <GoldBurst
          key={burstKey}
          x={POUCH.x}
          y={pouchY - 8}
        />
      )}

      {/* Pochon (hors couche inclinable). Geste : agitation gauche-droite
          (ou tap) pour libérer doucement les runes. */}
      <div
        className="absolute"
        style={{
          left: `${POUCH.x}%`,
          top: `${pouchY}%`,
          transform: 'translate(-50%, -50%)',
          width: 150 * pouchScale,
          height: 150 * pouchScale,
          zIndex: 30,
        }}
      >
        {/* Tuto visuel (1re fois seulement) — placé SOUS le bag */}
        <AnimatePresence>
          {showHint && phase === 'drawing' && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none absolute inset-x-0"
              style={{
                // sur l'arbre (pochon tout en bas) : l'aide passe AU-DESSUS du sac
                ...(layout === 'tree' || layout === 'hammer' ? { bottom: '103%' } : { top: '106%' }),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'var(--font-cinzel), serif',
                fontSize: 12,
                color: '#f1e2b0',
                whiteSpace: 'nowrap',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
            >
              <motion.span
                animate={{ x: [-5, 5, -5] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
                style={{ fontSize: 15, lineHeight: 1 }}
              >
                ⇄
              </motion.span>
              <span className="rounded-full px-3 py-1" style={{ background: 'rgba(10,20,13,0.72)', border: '1px solid rgba(233,217,172,0.4)' }}>
                {tr("Tapez ou secouez le sac", "Tap or shake the bag", "Toque o sacuda la bolsa", "थैली पर टैप करें या उसे हिलाएँ")}
              </span>
              <motion.span
                animate={{ x: [5, -5, 5] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
                style={{ fontSize: 15, lineHeight: 1 }}
              >
                ⇄
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Couche de balancement manuel (pendule) + tap natif (push). */}
        <div
          ref={swayRef}
          className="h-full w-full"
          style={{ touchAction: 'none', cursor: active ? 'grab' : 'default' }}
          onPointerDown={onPouchDown}
          onPointerMove={onPouchMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={active ? onPouchTap : undefined}
        >
          <Pouch
            counterAbove={layout === 'tree' || layout === 'hammer'}
            active={active}
            pushes={pushes}
            need={need}
            dragActive={dragActive}
            hideCounter={showHint}
          />
        </div>
      </div>
    </div>
  );
}


// Ré-exports : l’API publique du module est préservée (index.ts et
// rune-draw.tsx continuent d'importer depuis RuneStonesSet).
export { useDeviceTilt, STONE_W, STONE_H, STONE_DEPTH, POUCH, FLIGHT_DURATION,
         pouchYFor, slotsFor, revealOrder } from './stone-layout';
export { RuneStone, FlyingStone, GoldBurst, Pouch } from './stone-views';
