'use client';

// app/runes/nornes2/rune-scatter.tsx
// « Tirage à l'aveugle » : on secoue le sac (smartphone, agitation au doigt ou
// tap), les 24 runes du Futhark jaillissent une à une FACE CACHÉE, décrivent
// une parabole, rebondissent et RESTENT posées (chaque rune est montée une
// seule fois : le vol ne peut plus être interrompu ni téléporté par la
// poussée suivante). Quand tout est sorti, on choisit 3 runes au doigt
// (halo doré + soulèvement). Les 3 élues sont alors révélées SUR LA TABLE :
// les 21 autres s'effacent, elles s'envolent en ligne, se retournent une à
// une dans un halo doré (pas de sortie du pochon : elles sont déjà sorties
// et étalées) → transition vers le déroulement validé de /nornes.
//
// Icônes/visuels SVG inline uniquement (règle utilisateur).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ELDER_FUTHARK, type Rune } from '@/components/rune-stones/runes';
import { usePouchShake } from '@/components/rune-stones';
import { installSoundUnlock, playRandom, playSound } from '@/lib/sounds';
import { RUNE_THEME } from '../_shared';

export interface ScatterPick {
  rune: Rune;
  reversed: boolean;
}

const STONE_W = 46;
const STONE_H = 66;
const ALL = ELDER_FUTHARK; // 24 runes
const BAG_BOTTOM = 52; // position du sac (px) — marge sous les libelles
const BAG_SIZE = 120;

// Espacement minimal entre centres de runes (px) → jamais deux runes qui se
// recouvrent au point de devenir impossible à tap séparément.
const GAP_X = 56;
const GAP_Y = 76;

// Durée totale de la mise en valeur magique des 3 élues : l'animation (envol
// en ligne + flip + nom) se termine vers 2,1 s, puis l'exposition TIÈNE
// encore 2,5 s avant de passer à la vidéo d'attente d'interprétation IA.
const REVEAL_TOTAL_MS = 4600;

/* ------------------------------------------------------------------ */
/* Positions d'atterrissage : grille 6×4 jitterée + rejet si           */
/* chevauchement (éparpillement naturel, mais 100 % tapable).          */
/* ------------------------------------------------------------------ */
function scatterPositions(): Array<{ x: number; y: number; rot: number }> {
  const COLS = 6;
  const ROWS = 4;
  const out: Array<{ x: number; y: number; rot: number }> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Marges sûres : une rune pivotée (±22°) mesure ~67px de large / ~74px
      // de haut → centre à ≥ 11 % / ≤ 89 % en X et 16 % / 82 % en Y pour
      // qu'aucune ne soit rognée par l'overflow:hidden de la table.
      const baseX = 11 + (78 / (COLS - 1)) * c;
      const baseY = 16 + (66 / (ROWS - 1)) * r;
      // Le léger désordre doit toucher TOUTES les lignes : plutôt que de
      // retomber sur la position pile alignée quand aucune tentative ne
      // respecte les distances, on garde le candidat qui les viole le moins.
      let best = { x: baseX, y: baseY, rot: 0 };
      let bestViol = Infinity;
      for (let tries = 0; tries < 20; tries++) {
        const x = baseX + (Math.random() * 6 - 3);
        const y = baseY + (Math.random() * 6 - 3);
        const rot = Math.random() * 44 - 22;
        let viol = 0;
        let clash = false;
        for (const q of out) {
          const dx = Math.abs(((q.x - x) / 100) * 360); // largeur type mobile
          const dy = Math.abs(((q.y - y) / 100) * 292); // hauteur zone table (~68%)
          // Garde-fou : jamais de vrai chevauchement (pierre 46×66 px).
          if (dx < 44 && dy < 62) { clash = true; break; }
          if (dx <= GAP_X && dy <= GAP_Y) viol += GAP_X - dx + (GAP_Y - dy);
        }
        if (clash) continue;
        if (viol < bestViol) {
          bestViol = viol;
          best = { x, y, rot };
        }
        if (viol === 0) break;
      }
      out.push(best);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Pochon — image réelle du sac (pochon.png).                          */
/* ------------------------------------------------------------------ */
function PouchImage({ size = BAG_SIZE }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/pochon.png"
      alt="Pochon de runes"
      draggable={false}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.55))',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Pierre d'os face cachée (dos). Le glyphe n'est jamais révélé ici :  */
/* la révélation appartient au déroulement /nornes (RuneStonesSet).    */
/* ------------------------------------------------------------------ */
function Stone() {
  return (
    <div
      style={{
        position: 'relative',
        width: STONE_W,
        height: STONE_H,
        borderRadius: 8,
        background:
          'linear-gradient(160deg, #f3ebd8 0%, #e6d9bf 60%, #dccaa6 100%)',
        border: '1px solid #c9b78f',
        boxShadow:
          'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(120,95,55,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Motif discret au dos (gravure en filigrane) */}
      <span
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          fontSize: 15,
          color: '#c9b78f',
          opacity: 0.65,
        }}
      >
        ✦
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Face gravée (glyphe visible) — même rendu os que RuneStonesSet.     */
/* ------------------------------------------------------------------ */
function StoneFace({ symbol, reversed }: { symbol: string; reversed: boolean }) {
  return (
    <div
      style={{
        position: 'relative',
        width: STONE_W,
        height: STONE_H,
        borderRadius: 8,
        background: 'linear-gradient(150deg, #fbf6e9 0%, #efe6d2 55%, #e2d4ba 100%)',
        border: '1px solid #b9a98a',
        boxShadow:
          'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(120,95,55,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: reversed ? 'rotate(180deg)' : undefined,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          fontSize: 34,
          lineHeight: 1,
          color: '#7a2e1e',
          textShadow: '0 1px 0 rgba(255,255,255,0.55), 0 -1px 1px rgba(90,30,15,0.35)',
          userSelect: 'none',
        }}
      >
        {symbol}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Poussière d'étoiles dorée autour d'une rune révélée.                */
/* ------------------------------------------------------------------ */
function RevealSparkles({ delay = 0 }: { delay?: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 12 }, () => ({
        a: Math.random() * Math.PI * 2,
        r: 34 + Math.random() * 30,
        size: 2 + Math.random() * 3,
        dur: 0.9 + Math.random() * 0.7,
        delay: Math.random() * 0.35,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: Math.cos(p.a) * p.r,
            y: Math.sin(p.a) * p.r * 0.75,
            opacity: [0, 1, 0],
            scale: [0.4, 1.1, 0.2],
          }}
          transition={{ duration: p.dur, delay: delay + p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, #fff6d8 0%, #e9d9ac 55%, rgba(233,217,172,0) 100%)',
            boxShadow: `0 0 6px 2px ${RUNE_THEME.goldPale}88`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rune sortie du sac : monte une fois, vole une fois (paramètres figés */
/* au montage), reste posée et devient tapable à la fin du tirage.     */
/* Révélée (reveal) : s'envole vers la ligne des 3 Nornes, se retourne */
/* dans un halo doré — sans jamais repasser par le pochon.             */
/* ------------------------------------------------------------------ */
interface StoneReveal {
  dx: number;
  dy: number;
  flyDelay: number;
  flipDelay: number;
  tilt: number; // inclinaison finale, très limitée (degrés)
}

// Les 3 élues exposées côte à côte sont posées PARFAITEMENT droites :
// aucune inclinaison résiduelle (le tilt final annule la rotation du slot).
const REVEAL_TILTS = [0, 0, 0];

function ScatterStone({
  rune,
  slot,
  rootW,
  tableH,
  bagY,
  selectable,
  picked,
  dimmed,
  reveal,
  reversed,
  onSelect,
}: {
  rune: Rune;
  slot: { x: number; y: number; rot: number };
  rootW: number;
  tableH: number;
  bagY: number;
  selectable: boolean;
  picked: boolean;
  dimmed: boolean;
  reveal: StoneReveal | null;
  reversed: boolean;
  onSelect: () => void;
}) {
  const [landed, setLanded] = useState(false);
  // Trajectoire figée au montage : jamais recalculée sur re-render.
  const flight = useMemo(() => {
    const dx = rootW * (0.5 - slot.x / 100);
    const dy = bagY - (slot.y / 100) * tableH;
    return {
      dx,
      dy,
      arc: 60 + Math.random() * 50,
      spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 220),
      dur: 0.62 + Math.random() * 0.22,
      dust: Array.from({ length: 6 }, () => ({
        dx: (Math.random() - 0.5) * 46,
        dy: -4 - Math.random() * 14,
        size: 2 + Math.random() * 3,
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="absolute"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: reveal ? 60 : picked ? 30 : 20,
      }}
    >
      <motion.div
        initial={{ x: flight.dx, y: flight.dy, opacity: 0, scale: 0.55, rotate: flight.spin }}
        animate={{
          x: [flight.dx, flight.dx * 0.45, 0, 0, 0, 0, 0],
          y: [flight.dy, flight.dy * 0.45 - flight.arc, 0, -10, 0, -3, 0],
          opacity: [0, 1, 1, 1, 1, 1, 1],
          scale: [0.55, 1.06, 1, 1, 0.96, 1, 1],
          rotate: [
            flight.spin,
            flight.spin * 0.4,
            slot.rot,
            slot.rot,
            slot.rot,
            slot.rot,
            slot.rot,
          ],
        }}
        transition={{
          duration: flight.dur,
          ease: 'easeOut',
          times: [0, 0.45, 0.68, 0.78, 0.88, 0.95, 1],
        }}
        onAnimationComplete={() => setLanded(true)}
      >
        {/* Vol de révélation : les 3 élues s'envolent en ligne (les 21 autres
            s'effacent) — sans jamais repasser par le pochon. */}
        <motion.div
          initial={false}
          animate={
            reveal
              ? { x: reveal.dx, y: reveal.dy, scale: 1.28, opacity: 1, rotate: reveal.tilt - slot.rot }
              : { y: picked ? -12 : 0, scale: picked ? 1.1 : 1, opacity: dimmed ? 0 : 1 }
          }
          transition={
            reveal
              ? { duration: 0.8, delay: reveal.flyDelay, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.35, ease: 'easeOut' }
          }
          style={{ pointerEvents: landed && !reveal ? 'auto' : 'none', position: 'relative' }}
        >
          <button
            type="button"
            onClick={onSelect}
            disabled={!selectable || !landed || !!reveal}
            aria-label={picked ? `Rune choisie ${rune.name}` : `Rune cachée ${rune.name}`}
            style={{
              cursor: selectable && landed && !reveal ? 'pointer' : 'default',
              background: 'transparent',
              border: 'none',
              padding: 0,
              display: 'block',
              position: 'relative',
              filter: picked
                ? 'drop-shadow(0 0 16px rgba(233,217,172,0.95))'
                : 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {reveal ? (
              // Flip 3D sur place : dos → face gravée (glyphe révélé enfin).
              <div style={{ perspective: 600 }}>
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: 180 }}
                  transition={{ duration: 0.6, delay: reveal.flipDelay, ease: 'easeInOut' }}
                  style={{ transformStyle: 'preserve-3d', position: 'relative' }}
                >
                  <div style={{ backfaceVisibility: 'hidden' }}>
                    <Stone />
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transform: 'rotateY(180deg)',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <StoneFace symbol={rune.symbol} reversed={reversed} />
                  </div>
                </motion.div>
              </div>
            ) : (
              <Stone />
            )}
            {/* Liseré doré sur les runes choisies (avant révélation) */}
            {picked && !reveal && (
              <div
                className="pointer-events-none absolute"
                style={{
                  inset: -5,
                  borderRadius: 12,
                  border: `1.5px solid ${RUNE_THEME.goldPale}99`,
                  boxShadow: `0 0 18px ${RUNE_THEME.goldPale}55`,
                }}
              />
            )}
            {/* Halo doré pérenne après le retournement */}
            {reveal && (
              <motion.div
                className="pointer-events-none absolute"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.75] }}
                transition={{
                  duration: 0.6,
                  delay: reveal.flipDelay + 0.6,
                  times: [0, 0.5, 1],
                }}
                style={{
                  inset: -7,
                  borderRadius: 14,
                  border: `1.5px solid ${RUNE_THEME.goldPale}cc`,
                  boxShadow: `0 0 22px ${RUNE_THEME.goldPale}88, inset 0 0 14px ${RUNE_THEME.goldPale}33`,
                }}
              />
            )}
          </button>
          {/* Nom de la rune en doré sous la pierre révélée. Boîte volontai-
              rement plus étroite que l'écart entre créneaux : un espace vide
              permanent sépare les noms voisins, jamais ils ne se mélangent. */}
          {reveal && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: reveal.flipDelay + 0.75 }}
              className="absolute top-full left-[-24px] right-[-24px] mt-4 text-center text-[11px] leading-tight"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: RUNE_THEME.goldPale,
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}
            >
              {rune.name}
              {reversed ? ' (à l’envers)' : ''}
            </motion.p>
          )}
          {reveal && <RevealSparkles delay={reveal.flipDelay + 0.25} />}
        </motion.div>
      </motion.div>
      {/* Nuage de poussière à l'impact */}
      {!landed && (
        <div className="pointer-events-none absolute left-1/2 top-1/2">
          {flight.dust.map((d, i) => (
            <motion.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
              animate={{ x: d.dx, y: d.dy, opacity: [0, 0.9, 0], scale: 0.3 }}
              transition={{
                duration: 0.45,
                delay: flight.dur * 0.72,
                times: [0, 0.25, 1],
                ease: 'easeOut',
              }}
              style={{
                position: 'absolute',
                width: d.size,
                height: d.size,
                borderRadius: '50%',
                background: 'rgba(226,212,186,0.85)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Particules dorées jaillissant du sac à chaque poussée.              */
/* ------------------------------------------------------------------ */
function GoldPuff({ x, y }: { x: number; y: number }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 10 }, () => ({
        dx: (Math.random() - 0.5) * 130,
        dy: -30 - Math.random() * 80,
        size: 2 + Math.random() * 4,
        dur: 0.6 + Math.random() * 0.5,
        delay: Math.random() * 0.1,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute z-50" style={{ left: x, top: y }}>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, #fff3c8 0%, #e9c96a 60%, rgba(233,201,106,0) 100%)',
            boxShadow: `0 0 6px 2px ${RUNE_THEME.goldPale}77`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RuneScatter : sac + table + sélection.                              */
/* ------------------------------------------------------------------ */
export function RuneScatter({
  height = 440,
  enabled = true,
  onComplete,
}: {
  height?: number;
  enabled?: boolean;
  onComplete: (picks: ScatterPick[]) => void;
}) {
  // Runes sorties : liste monotone (append only) → aucune rune ne peut
  // disparaître ou changer de place une fois lancée.
  const [released, setReleased] = useState<number[]>([]); // indices ALL, ordre de sortie
  const [pickedIdx, setPickedIdx] = useState<number[]>([]);
  const [firing, setFiring] = useState(false);
  // Mise en valeur magique des 3 élues sur la table (envol en ligne + flip).
  const [revealing, setRevealing] = useState(false);
  const [puffs, setPuffs] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const firedRef = useRef(false);
  const puffId = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const swayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    lastX: number;
    x: number;
    sign: number;
    segment: number;
    moved: number;
    lastAdvance: number;
  } | null>(null);

  // Positions d'atterrissage stables + ordre de sortie mélangé (figés au
  // montage du composant → un reset remonte tout, jamais de re-tirage).
  const slots = useMemo(scatterPositions, []);
  const order = useMemo(() => {
    const o = ALL.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }, []);
  // Sens (endroit/renversé) tiré d'avance pour chaque rune (30 % renversées),
  // révélé plus tard par le déroulement /nornes.
  const reversedMap = useMemo(() => ALL.map(() => Math.random() < 0.3), []);

  const allOut = released.length >= ALL.length;
  const active = enabled && !allOut && !firing;
  const selecting = enabled && allOut && !firing;

  useEffect(() => {
    installSoundUnlock();
  }, []);

  // Tuto 1re fois : même clé que le pochon de /nornes (déjà vu = déjà vu).
  useEffect(() => {
    if (!active) {
      setShowHint(false);
      return;
    }
    let seen = false;
    try {
      seen = localStorage.getItem('tarot_rune_gesture_hint') === '1';
    } catch {
      // stockage indisponible — on affiche quand même
    }
    if (!seen) {
      setShowHint(true);
      const t = window.setTimeout(() => setShowHint(false), 10000);
      return () => window.clearTimeout(t);
    }
  }, [active]);

  const addPuff = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const id = ++puffId.current;
    setPuffs((p) => [...p.slice(-3), { id, x: root.clientWidth / 2, y: root.clientHeight - BAG_BOTTOM - BAG_SIZE * 0.55 }]);
    window.setTimeout(() => setPuffs((p) => p.filter((q) => q.id !== id)), 1300);
  }, []);

  // Une poussée : 1 rune jaillit du sac (append only → vol jamais interrompu).
  const push = useCallback(() => {
    if (!enabled || firing) return;
    setReleased((prev) => {
      if (prev.length >= ALL.length) return prev;
      return [...prev, order[prev.length]];
    });
    playRandom('runes-handle-1', 'runes-handle-2');
    addPuff();
    try {
      localStorage.setItem('tarot_rune_gesture_hint', '1');
      setShowHint(false);
    } catch {
      // ignore
    }
  }, [enabled, firing, order, addPuff]);

  // Secouage du smartphone (gamma + devicemotion, constantes validées /nornes).
  const { requestPermissions } = usePouchShake(active, push, (gamma) => {
    // Le sac suit l'inclinaison du téléphone (sauf pendant un drag au doigt).
    const el = swayRef.current;
    if (el && !dragRef.current) {
      const x = Math.max(-34, Math.min(34, gamma * 1.5));
      el.style.transform = `translateX(${x.toFixed(1)}px) rotate(${((x / 34) * 16).toFixed(1)}deg)`;
    }
  });

  // ── Agitation au doigt : pendule sur le sac, chaque demi-balancement ample
  //    = une poussée. Le tap (sans déplacement) est géré par onClick natif. ──
  const SWING_MIN_PX = 22;
  const SWAY_MAX = 34;

  const applySway = (x: number) => {
    const el = swayRef.current;
    if (!el) return;
    el.style.transform = `translateX(${x.toFixed(1)}px) rotate(${((x / SWAY_MAX) * 16).toFixed(1)}deg)`;
  };

  const onPouchDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      void requestPermissions();
      if (!active) return;
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
      setDragging(true);
      if (swayRef.current) swayRef.current.style.transition = 'none';
    },
    [active, requestPermissions],
  );

  const onPouchMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.lastX;
      d.lastX = e.clientX;
      if (dx === 0) return;
      d.moved += Math.abs(dx);
      d.x = Math.max(-SWAY_MAX, Math.min(SWAY_MAX, d.x + dx * 0.85));
      applySway(d.x);
      const sign = dx > 0.6 ? 1 : dx < -0.6 ? -1 : 0;
      if (sign !== 0 && sign !== d.sign) {
        const now = Date.now();
        if (d.segment >= SWING_MIN_PX && now - d.lastAdvance > 160 && active) {
          d.lastAdvance = now;
          push();
        }
        d.sign = sign;
        d.segment = 0;
      } else if (sign !== 0) {
        d.segment += Math.abs(dx);
      }
    },
    [active, push],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    if (swayRef.current) {
      swayRef.current.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';
      applySway(0);
    }
  }, []);

  const onStoneTap = useCallback(
    (idx: number) => {
      if (!selecting || firedRef.current) return;
      try {
        navigator.vibrate?.(12);
      } catch {
        // non supporté
      }
      setPickedIdx((prev) => {
        if (prev.includes(idx)) return prev.filter((i) => i !== idx);
        if (prev.length >= 3) return prev;
        playRandom('rune-falling-1');
        return [...prev, idx];
      });
    },
    [selecting],
  );

  // 🎬 Dès la 3e rune choisie : les élues s'envolent en ligne et se révèlent
  //    SUR LA TABLE (pas de sortie du pochon : déjà sorties et étalées), puis
  //    le déroulement /nornes prend le relais (lecture + vidéo IA).
  useEffect(() => {
    if (pickedIdx.length !== 3 || firedRef.current) return;
    firedRef.current = true;
    setFiring(true);
    playRandom('rune-hit-1');
    setRevealing(true);
    // Un son de retournement par rune (à l'arrivée de son vol) + la
    // « glissando de harpe » (magic-6) qui nappe l'exposition des 3 élues.
    const flipTimers = [0, 1, 2].map((k) =>
      window.setTimeout(() => playRandom('rune-falling-1', 'rune-falling-2'), 900 + k * 220),
    );
    const magicT = window.setTimeout(() => playSound('magic-6', 0.9), 900);
    const t = window.setTimeout(() => {
      const picks: ScatterPick[] = pickedIdx.map((i) => ({
        rune: ALL[i],
        reversed: reversedMap[i],
      }));
      onComplete(picks);
    }, REVEAL_TOTAL_MS);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(magicT);
      flipTimers.forEach(window.clearTimeout);
    };
  }, [pickedIdx, onComplete, reversedMap]);

  // Géométrie de la table (px) — figée au premier rendu client.
  const tableH = height * 0.68;
  const rootW = rootRef.current?.clientWidth ?? 360;
  // Centre vertical du sac (px, repère racine) : le sac est ancré en bas.
  const bagY = height - BAG_BOTTOM - BAG_SIZE / 2;

  // Ligne de révélation : 3 emplacements horizontaux (côte à côte) centrés
  // dans la moitié haute de la table. Écart généreux entre créneaux pour
  // qu'un bel espace vide sépare toujours les noms dorés voisins.
  const revealLine = useMemo(() => {
    const y = tableH * 0.34;
    const gap = Math.min(120, rootW * 0.33);
    return [-gap, 0, gap].map((dx) => ({ x: rootW / 2 + dx, y }));
  }, [rootW, tableH]);

  // Pour chaque rune : offset d'envol (dx/dy depuis sa position posée) +
  // délais séquentiels (vol décalé, flip à l'arrivée).
  const revealFor = (i: number): StoneReveal | null => {
    if (!revealing) return null;
    const orderPos = pickedIdx.indexOf(i);
    if (orderPos === -1) return null;
    const slot = slots[i];
    const target = revealLine[orderPos];
    return {
      dx: target.x - (slot.x / 100) * rootW,
      dy: target.y - (slot.y / 100) * tableH,
      flyDelay: orderPos * 0.22,
      flipDelay: orderPos * 0.22 + 0.85,
      tilt: REVEAL_TILTS[orderPos],
    };
  };

  return (
    <div
      ref={rootRef}
      className="relative w-full select-none"
      style={{ height: `${height}px`, overflow: 'hidden' }}
      aria-label="Tirage à l'aveugle : secouez le sac puis choisissez 3 runes"
    >
      {/* ── Table : runes sorties (vol unique puis posées) ── */}
      <div className="absolute inset-x-0 top-0" style={{ height: '68%' }}>
        {released.map((runeIdx) => {
          const i = runeIdx;
          return (
            <ScatterStone
              key={ALL[i].name}
              rune={ALL[i]}
              slot={slots[i]}
              rootW={rootW}
              tableH={tableH}
              bagY={bagY}
              selectable={selecting}
              picked={pickedIdx.includes(i)}
              dimmed={pickedIdx.length === 3 && !pickedIdx.includes(i)}
              reveal={revealFor(i)}
              reversed={reversedMap[i]}
              onSelect={() => onStoneTap(i)}
            />
          );
        })}
      </div>

      {/* ── Compteur (haut-droite, ne gêne pas le sac) ── */}
      {!allOut && (
        <div
          className="absolute right-2 top-1 z-30 rounded-full px-3 py-1"
          style={{
            background: 'rgba(10,30,18,0.75)',
            border: `1px solid ${RUNE_THEME.goldPale}55`,
          }}
        >
          <p
            className="whitespace-nowrap text-[11px]"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}
          >
            {released.length} / {ALL.length}
          </p>
        </div>
      )}

      {/* ── Sac : secouable (smartphone / doigt / tap), se vide visiblement ── */}
      {!allOut && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: BAG_BOTTOM, width: BAG_SIZE, height: BAG_SIZE, zIndex: 40 }}
        >
          <div
            ref={swayRef}
            onPointerDown={onPouchDown}
            onPointerMove={onPouchMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={active ? push : undefined}
            style={{
              width: '100%',
              height: '100%',
              cursor: active ? 'pointer' : 'default',
              touchAction: 'none',
              transformOrigin: '50% 15%',
            }}
          >
            <motion.div
              animate={
                active && !dragging ? { rotate: [0, -3.5, 0, 3.5, 0] } : { rotate: 0 }
              }
              transition={
                active && !dragging
                  ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
              style={{ width: '100%', height: '100%' }}
            >
              {/* Le sac rétrécit à mesure qu'il se vide (1 → 0.72). */}
              <motion.div
                animate={{ scale: 1 - 0.28 * (released.length / ALL.length) }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ width: '100%', height: '100%' }}
              >
                <PouchImage />
              </motion.div>
            </motion.div>
            {active && !showHint && (
              <span
                className="pointer-events-none absolute left-1/2 -bottom-6 w-[300px] max-w-[86vw] -translate-x-1/2 text-center text-[11px] leading-snug"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: RUNE_THEME.goldPale,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                Secouez le sac pour en sortir toutes les runes
              </span>
            )}
            {/* Tuto 1re fois : chip SOUS le sac, flèches ⇄ animées. */}
            <AnimatePresence>
              {active && showHint && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="pointer-events-none absolute left-1/2 -bottom-9 flex w-[320px] max-w-[88vw] -translate-x-1/2 justify-center"
                >
                  <span
                    className="rounded-full px-3 py-1 text-center text-[11px] leading-snug"
                    style={{
                      fontFamily: 'var(--font-cinzel), serif',
                      color: RUNE_THEME.goldPale,
                      background: 'rgba(10,30,18,0.85)',
                      border: `1px solid ${RUNE_THEME.goldPale}55`,
                    }}
                  >
                    Tapez ou secouez le sac jusqu’à le vider{' '}
                    <motion.span
                      className="inline-block"
                      animate={{ x: [-3, 3, -3] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      ⇄
                    </motion.span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Bandeau de sélection / transition ── */}
      <AnimatePresence>
        {allOut && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute inset-x-0 z-40 px-4 text-center"
            style={{ bottom: 24 }}
          >
            <motion.p
              key="msg"
              className="text-sm"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: RUNE_THEME.goldPale,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}
              animate={
                pickedIdx.length === 3
                  ? { scale: [1, 1.08, 1], opacity: [1, 1, 0.6, 1] }
                  : { scale: [1, 1.02, 1] }
              }
              transition={
                pickedIdx.length === 3
                  ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              {pickedIdx.length < 3
                ? pickedIdx.length === 0
                  ? 'Choisissez 3 runes face cachée'
                  : pickedIdx.length === 1
                    ? 'Encore 2 runes à choisir'
                    : 'Encore 1 rune à choisir'
                : 'L\'Oracle révèle votre fil…'}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Particules dorées à chaque poussée ── */}
      {puffs.map((p) => (
        <GoldPuff key={p.id} x={p.x} y={p.y} />
      ))}
    </div>
  );
}
