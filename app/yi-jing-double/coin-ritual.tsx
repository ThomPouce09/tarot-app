'use client';

// ═══════════════════════════════════════════════════════════════════
// app/yi-jing-double/coin-ritual.tsx
// Le rituel des TROIS PIÈCES (méthode traditionnelle au bol).
//
// Le bol est vu DE DESSUS, les trois pièces (rond à trou carré) reposent
// DEDANS. La mécanique de lancer est celle du gobelet des Dés du Zodiaque
// (AstroDiceCup) adaptée au bol :
//   • brassage   — glisser horizontalement sur le bol (ou secouette
//                  capteur) : le bol tangé, les pièces rebondissent dedans,
//                  son feutré d'entrechoquement (JAMAIS de haptique) ;
//   • jet        — glisser VERTICALEMENT VERS LE HAUT (dy > 36, dominant —
//                  comme le push du gobelet), tap, flick du poignet ou
//                  INCLINAISON du haut de l'écran vers le bas
//                  (deviceorientation beta) : les pièces s'élèvent,
//                  tournoient, puis s'immobilisent sur la table AU-DESSUS
//                  du bol et révèlent leurs faces ;
//   • pause dramatique ~1,1 s, valeur du lancer = somme des faces
//     (face 3 / pile 2) : 6 vieux yin, 7 jeune yang, 8 jeune yin,
//     9 vieux yang. Puis les pièces retombent dans le bol, on recommence.
// 6 lancers ; l'hexagramme se construit EN DIRECT dans le coin droit
// (jet 1 = trait du bas), mutables marqués ○ (vieux yang) × (vieux yin).
// ═══════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, stopSound } from '@/lib/sounds';

const GOLD = '#F3C969';
const GOLD_DEEP = '#B8860B';

/* ─────────────── Une pièce chinoise : rond, trou carré ─────────────── */

function Coin({ face, size = 44, landed = false }: { face: boolean; size?: number; landed?: boolean }) {
  // Fidèle aux cash coins Qing : disque de bronze à large liseré lisse, trou
  // carré cerclé en relief, 4 glyphes en relief aux positions 12/3/6/9 h.
  // face = YANG : sinogrammes 聖·號·號·寶.  dos = YIN : 寶 + 3 marques
  // mandchoues verticales. Motif gravé dans la police CJK auto-hébergée.
  const gid = face ? 'cgF' : 'cgP';
  const hid = face ? 'chF' : 'chP';
  const gid2 = face ? 'cgfF' : 'cgfP';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden
      style={{
        transform: landed ? 'perspective(160px) rotateX(38deg)' : undefined,
        filter: `drop-shadow(0 ${landed ? 2 : 4}px ${landed ? 3 : 7}px rgba(0,0,0,${landed ? 0.55 : 0.4})) drop-shadow(0 0 7px rgba(212,175,55,0.5))`,
      }}>
      <defs>
        <radialGradient id={gid} cx="34%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#D9B45E" />
          <stop offset="45%" stopColor="#A07E33" />
          <stop offset="80%" stopColor="#6B5120" />
          <stop offset="100%" stopColor="#3A2A10" />
        </radialGradient>
        <radialGradient id={gid2} cx="40%" cy="34%" r="80%">
          <stop offset="0%" stopColor="#7A5F2B" />
          <stop offset="60%" stopColor="#57441F" />
          <stop offset="100%" stopColor="#32250E" />
        </radialGradient>
        <filter id={hid} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0.7" dy="0.8" stdDeviation="0.4" floodColor="#000000" floodOpacity="0.75" />
        </filter>
      </defs>
      {/* disque + liseré */}
      <circle cx="24" cy="24" r="22.5" fill={`url(#${gid})`} stroke="#241804" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="rgba(255,236,190,0.28)" strokeWidth="0.7" strokeDasharray="0.6 3.1" />
      {/* champ intérieur plus sombre + patine verte en creux */}
      <circle cx="24" cy="24" r="15.8" fill={`url(#${gid2})`} />
      <circle cx="24" cy="24" r="15.8" fill="none" stroke="rgba(92,107,79,0.4)" strokeWidth="0.9" />
      {/* trou carré cerclé (double trait = relief) */}
      <rect x="18.4" y="18.4" width="11.2" height="11.2" fill="#070503" stroke="#8A7A5F" strokeWidth="1.1" />
      <rect x="19.6" y="19.6" width="8.8" height="8.8" fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth="0.8" />
      {face ? (
        <g fontFamily="'Hoshiko Satsuki', 'Kaisei HarunoUmi Local', serif" fontSize="9" textAnchor="middle"
          fill="#C6A352" stroke="#241804" strokeWidth="0.25" filter={`url(#${hid})`}>
          <text x="24" y="15">聖</text>
          <text x="38.5" y="27.4">號</text>
          <text x="24" y="42">號</text>
          <text x="9.5" y="27.4">寶</text>
        </g>
      ) : (
        <g filter={`url(#${hid})`}>
          {/* 寶 chinois à gauche, redressé */}
          <text x="9.5" y="27.4" fontFamily="'Hoshiko Satsuki', 'Kaisei HarunoUmi Local', serif" fontSize="9" textAnchor="middle"
            fill="#8F7D5A" stroke="#1F180D" strokeWidth="0.25">寶</text>
          {/* trois marques mandchoues verticales (colonnes à queue vers la droite) */}
          <g stroke="#8F7D5A" strokeWidth="1.5" strokeLinecap="round" fill="none">
            <path d="M24 6.2 v6.4 M22.4 12.4 q1.6 1.6 3.2 0" />
            <path d="M38.5 20.2 v6.4 M36.9 26.4 q1.6 1.6 3.2 0" />
            <path d="M24 34.4 v4.4 M24 38.6 q0.2 2.6 -2.6 3.4" />
          </g>
        </g>
      )}
      {/* reflet de verre bombé (haut-gauche) */}
      <ellipse cx="18.5" cy="14" rx="10.5" ry="6" fill="rgba(255,248,225,0.14)" transform="rotate(-28 18.5 14)" />
    </svg>
  );
}

/* ─────────────── Le bol (photo fournie, mêmes dimensions que le SVG) ─────────────── */

function Bowl() {
  return (
    <div style={{ width: 190, height: 150, position: 'relative' }} aria-hidden>
      <img
        src="/images/yi-jing-bol.jpg"
        alt=""
        width={150}
        height={150}
        draggable={false}
        className="select-none"
        style={{
          position: 'absolute', left: 20, top: 0, borderRadius: '50%',
          filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.6)) drop-shadow(0 0 10px rgba(243,201,105,0.16))',
        }}
      />
    </div>
  );
}

/* ─────────────────────────── Le rituel ─────────────────────────── */

interface Props {
  L: (fr: string, en: string) => string;
  onPickup: () => Promise<boolean>;
  /** Débit refusé (quota/paywall) : la page revient à la question. */
  onBlocked?: () => void;
  onDone: (lines: number[]) => void;
  /** À chaque jet posé : état de la construction (pile centrée de la page). */
  onProgress?: (lines: number[]) => void;
  /** Pose en cours / échouée après le 6e jet : filet anti-bol-figé. */
  casting?: boolean;
  castError?: boolean;
  onRetry?: () => void;
}

type Sub = 'brassage' | 'toss' | 'landed' | 'return';

const SPREAD = [-58, 0, 58];          // atterrissage sur la table (au-dessus du bol)
const IN_BOWL = [{ x: -23, y: 4 }, { x: 2, y: -4 }, { x: 23, y: 6 }]; // pièces tassées dans le bol

export default function CoinRitual({ L, onPickup, onDone, onProgress, onBlocked, casting, castError, onRetry }: Props) {
  // Plus d'étape intermédiaire : le brassage est VIVANT dès le montage.
  const [sub, setSub] = useState<Sub>('brassage');
  const [lines, setLines] = useState<number[]>([]);
  const [faces, setFaces] = useState<boolean[]>([true, true, true]);
  const [bowlX, setBowlX] = useState(0);       // tangage du bol pendant le brassage
  const [jiggle, setJiggle] = useState(0);     // incrément = un rebond des pièces

  const timers = useRef<number[]>([]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const blockedRef = useRef(onBlocked);
  blockedRef.current = onBlocked;
  useEffect(() => { progressRef.current?.([]); /* repart d'une pile vide au montage */ }, []);

  /* Débit du grand tirage : lancé AU MONTAGE, en parallèle des gestes.
     pay=no → on renvoie à la question ; pay=pending + jet déjà demandé →
     le jet est rejoué dès la confirmation (aucun geste perdu). */
  const payRef = useRef<'pending' | 'ok' | 'no'>('pending');
  const queuedToss = useRef(false);
  useEffect(() => {
    let alive = true;
    onPickup().then((ok) => {
      if (!alive) return;
      payRef.current = ok ? 'ok' : 'no';
      if (!ok) { blockedRef.current?.(); return; }
      if (queuedToss.current) { queuedToss.current = false; tossRef.current?.(); }
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tossRef = useRef<null | (() => void)>(null);
  useEffect(() => () => { timers.current.forEach((tt) => window.clearTimeout(tt)); }, []);
  const t = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  /* ── Le jet (déclenché par flick vers le haut, tap, secousse ou tilt) ──
     ⚠️ PAS d'effet de bord dans un updater setSub (StrictMode double-invoque
     les updaters → double timer → double trait). Garde via une ref de phase. */
  const st = useRef<{ down: boolean; x0: number; y0: number; t0: number; lastX: number; lastDir: number; mixed: boolean; jiggles: number }>({ down: false, x0: 0, y0: 0, t0: 0, lastX: 0, lastDir: 0, mixed: false, jiggles: 0 });
  const linesRef = useRef<number[]>([]);

  const subRef = useRef<Sub>('brassage');
  useEffect(() => { subRef.current = sub; }, [sub]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  const toss = useCallback(() => {
    if (subRef.current !== 'brassage') return;
    if (payRef.current === 'no') { blockedRef.current?.(); return; }
    if (payRef.current === 'pending') { queuedToss.current = true; return; } // le jet partira à la confirmation
    subRef.current = 'toss';
    // faces décidées AU JET — la révélation n'est que théâtrale.
    const f = [Math.random() < 0.5, Math.random() < 0.5, Math.random() < 0.5];
    setFaces(f);
    setSub('toss');
    setBowlX(0); // le bol revient au centre pendant le vol
    stopSound('coin-shake');                                    // le froissement s'arrête net au jet
    playSound('coin-table', 0.9); // versement des pièces sur la table
    t(() => {
      const v = f.reduce((s2, x) => s2 + (x ? 3 : 2), 0);                // 6..9
      const next = [...linesRef.current, v];
      linesRef.current = next;
      setLines(next);
      progressRef.current?.(next);
      setSub('landed');
      // pause dramatique ~1 s puis les pièces retombent dans le bol.
      t(() => {
        if (next.length >= 6) {
          t(() => doneRef.current(next), 100);                           // fin → analyse
        } else {
          subRef.current = 'return';
          setSub('return');
          t(() => { subRef.current = 'brassage'; setSub('brassage'); setBowlX(0); st.current.mixed = false; }, 750);
        }
      }, 1150);
    }, 700);
  }, [t]);
  tossRef.current = toss;

  // Permission capteurs iOS : tentée au premier geste DOM (sans rien bloquer ;
  // le geste du doigt fonctionne de toute façon sans elle).
  const permRef = useRef(false);
  const askSensors = () => {
    if (permRef.current) return;
    permRef.current = true;
    try {
      const D = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof D?.requestPermission === 'function') void D.requestPermission().catch(() => {});
    } catch { /* pas de capteurs */ }
  };

  /* ── Gestes du pad (mécanique AstroDiceCup adaptée) ── */
  const onPointerDown = (e: React.PointerEvent) => {
    if (sub !== 'brassage') return;
    askSensors();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    st.current.down = true; st.current.x0 = e.clientX; st.current.y0 = e.clientY;
    st.current.t0 = Date.now(); st.current.lastX = e.clientX; st.current.lastDir = 0;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!st.current.down || sub !== 'brassage') return;
    const dx = e.clientX - st.current.lastX;
    const dyUp = st.current.y0 - e.clientY;   // positif = vers le haut de l'écran
    // ── push vertical dominant vers le haut → LE JET (comme le gobelet) ──
    if (dyUp > 36 && Math.abs(dyUp) >= Math.abs(e.clientX - st.current.x0)) {
      st.current.down = false;
      toss();
      return;
    }
    // ── secousse horizontale → brassage (bol tangé, pièces qui rebondissent) ──
    const lim = (typeof window !== 'undefined' ? window.innerWidth : 360) * 0.12;
    setBowlX((x) => Math.max(-lim, Math.min(lim, x + dx * 2.4)));
    const dir = Math.sign(dx);
    if (dir !== 0 && dir !== st.current.lastDir && Math.abs(dx) > 2) {
      st.current.lastDir = dir;
      st.current.jiggles++;
      // un son feutré tous les 3 chocs (les rebonds s'enchaînent vite)
      // Froissement de PIÈCES uniquement (jamais les dés zodiacaux) :
      // première secousse = coin-shake complet, puis relance sobre toutes
      // les 8 oscillations pour tenir le rythme sans se marcher dessus.
      if (!st.current.mixed || st.current.jiggles % 8 === 0) playSound('coin-shake', 0.8);
      st.current.mixed = true;
      setJiggle((j) => j + 1);
    }
    st.current.lastX = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!st.current.down) return;
    st.current.down = false;
    // TAP (sans drag) → le jet, si le brassage a eu lieu (fidèle au gobelet :
    // tap = lancer ; ici on exige une secousse pour garder le rituel).
    const moved = Math.hypot(e.clientX - st.current.x0, e.clientY - st.current.y0);
    if (sub === 'brassage' && moved < 12 && Date.now() - st.current.t0 < 250 && st.current.mixed) toss();
  };

  /* ── Capteurs : secousse (entrechoquement) + inclinaison vers le bas ── */
  useEffect(() => {
    if (sub !== 'brassage') return;
    let lastSpike = 0;
    let baseBeta: number | null = null;
    let lastTilt = 0;
    const onMotion = (ev: DeviceMotionEvent) => {
      const a = ev.accelerationIncludingGravity;
      if (!a) return;
      const m = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const now = Date.now();
      if (Math.abs(m - 9.8) > 3.0 && now - lastSpike > 220) {
        lastSpike = now;
        setJiggle((j) => j + 1);
        playSound('coin-shake', 0.8); // secousse téléphone = même froissement
        st.current.mixed = true;
      }
    };
    const onOrient = (ev: DeviceOrientationEvent) => {
      if (ev.beta == null) return;
      if (baseBeta === null) { baseBeta = ev.beta; return; }
      // « incliner le haut de l'écran vers le bas » = beta qui chute.
      if (baseBeta - ev.beta > 28 && Date.now() - lastTilt > 800) {
        lastTilt = Date.now();
        toss();
      }
    };
    window.addEventListener('devicemotion', onMotion);
    window.addEventListener('deviceorientation', onOrient);
    return () => {
      window.removeEventListener('devicemotion', onMotion);
      window.removeEventListener('deviceorientation', onOrient);
    };
  }, [sub, toss]);

  /* ── disposition des pièces selon la phase ── */
  const phaseOf = (i: number) => {
    if (sub === 'toss') {
      return {
        x: SPREAD[i] + (i - 1) * 6, y: -118, rotate: [0, 380 + i * 40, 350 + i * 30],
        transition: { duration: 0.62, ease: 'easeOut' as const },
      };
    }
    if (sub === 'landed') {
      return { x: SPREAD[i], y: -118, rotate: i % 2 ? 14 : -10, transition: { type: 'spring' as const, stiffness: 190, damping: 15 } };
    }
    if (sub === 'return') {
      return { x: IN_BOWL[i].x + bowlX, y: IN_BOWL[i].y + 26, rotate: 0, opacity: 0.75, transition: { duration: 0.5, ease: 'easeIn' as const } };
    }
    // brassage : les pièces sont DANS le bol ; chaque jiggle = un rebond
    const wob = jiggle > 0 ? 1 : 0;
    return {
      x: IN_BOWL[i].x + bowlX, y: IN_BOWL[i].y, rotate: 0, opacity: 1,
      transition: { duration: 0.22 },
      ...(wob && sub === 'brassage' && jiggle % 2 === i % 2
        ? { y: IN_BOWL[i].y - 7 }
        : {}),
    };
  };

  const inFlight = sub === 'toss' || sub === 'landed';

  return (
    <div className="relative mt-6 flex flex-col items-center">
      {/* la scène-table : bol en bas, zone de jet au-dessus */}
      <div
        className="relative mx-auto w-full max-w-md"
        style={{ height: 340, touchAction: 'pan-y', cursor: sub === 'brassage' ? 'grab' : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { st.current.down = false; }}
      >
        {/* le sol */}
        <div className="absolute bottom-8 left-1/2 h-1 w-[92%] -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(243,201,105,0.16), transparent)' }} />

        {/* le bol, vu de dessus — tangé par le brassage */}
        <motion.div
          className="absolute bottom-10 left-1/2"
          style={{ marginLeft: -95 }}
          animate={{ x: bowlX, rotate: bowlX * 0.06 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        >
          <Bowl />
        </motion.div>

        {/* les trois pièces — dans le bol, en vol, ou posées sur la table */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute bottom-[97px] left-1/2"
            style={{ marginLeft: -22, zIndex: inFlight ? 40 : 20 + i }}
            initial={false}
            animate={phaseOf(i)}
          >
            <motion.span
              className="block"
              animate={{ y: [0, -2.5, 0] }}
              transition={{ duration: 1.8 + i * 0.35, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Coin face={faces[i]} size={44} landed={sub === 'landed'} />
            </motion.span>
          </motion.div>
        ))}

        {/* l'invitation au geste */}
        <AnimatePresence>
          {sub === 'brassage' && (
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: [0.45, 0.95, 0.45] }} exit={{ opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.25em]"
              style={{ color: `${GOLD}cc` }}>
              {L('↟ glissez vers le haut pour jeter', '↟ swipe up to cast')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* textes de phase */}
      <div className="mt-1 min-h-[64px] w-full max-w-md text-center">
        <AnimatePresence mode="wait">
          <motion.p key={sub} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-auto max-w-xs text-sm italic leading-relaxed" style={{ color: sub === 'brassage' ? GOLD : '#c9b28a' }}>
            {sub === 'brassage' && (st.current.mixed
              ? L(`${lines.length}/6 traits posés — secoue, puis glisse vers le haut.`, `${lines.length}/6 lines set — shake, then swipe up.`)
              : L('Brasse les pièces dans le bol (glisse à gauche/droite).', 'Rattle the coins in the bowl (drag left/right).'))}
            {sub === 'toss' && L('Les pièces s’envolent…', 'The coins take flight…')}
            {sub === 'landed' && L(`Impact sur la table — valeur ${lines[lines.length - 1]}.`, `Table impact — value ${lines[lines.length - 1]}.`)}
            {sub === 'return' && L('Récupère les pièces…', 'Gather the coins…')}
            {sub === 'landed' && lines.length >= 6 && casting && L('Le ciel lit la table…', 'Heaven reads the table…')}
            {sub === 'landed' && lines.length >= 6 && castError && L('La lecture a glissé — vos pièces sont gardées, relancez.', 'The reading slipped — your coins are kept, try again.')}
          </motion.p>
          {sub === 'landed' && lines.length >= 6 && castError && (
            <button onClick={() => onRetry && onRetry()}
              className="mx-auto mt-1 block rounded-full px-6 py-1.5 font-[family-name:var(--font-cinzel-deco)] text-xs tracking-wide"
              style={{ background: 'linear-gradient(180deg, #F9E9B8 0%, #E7C15F 45%, #B98A2B 100%)', color: '#2A1704', border: '1px solid rgba(255,248,222,0.65)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -3px 6px rgba(74,44,6,0.5), 0 5px 16px rgba(218,165,32,0.5), 0 2px 6px rgba(0,0,0,0.5)' }}>
              {L('Réessayer la lecture', 'Retry the reading')}
            </button>
          )}
        </AnimatePresence>

        <p className="mt-1 text-[10px]" style={{ color: 'rgba(243,201,105,0.45)' }}>
          {L('1 grand tirage · les pièces sèment, le ciel décide', '1 grand reading · the coins sow, heaven decides')}
        </p>
      </div>
    </div>
  );
}
