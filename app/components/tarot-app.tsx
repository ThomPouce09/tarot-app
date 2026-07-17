'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import YiSlideNav from '@/components/yi-slide-nav';
import CardFace from './card-face';
import { TAROT_CARDS, TarotCard } from '@/lib/tarot-data';

/* ============================================================
 *  FUSION  /tarot-3-cartes (décor)  +  /tarot-test (pioche)
 *  - Décor : background table, menu, titre, emplacement cartes
 *    tirées (DrawnCards Passé/Présent/Avenir), cinématique.
 *  - Pioche : deck de 78 cartes dépliant, pinch/zoom, drag,
 *    sélection une par une, effets dorés.
 * ============================================================ */

const ENABLE_SPARKLES = true;
const ENABLE_HAPTICS = true;
const ENABLE_BREATH = true;

const TOTAL_PICKS = 3;
const N = 78;
const SPREAD_MS = 3000;
const EDGE = 10;
const CARD_W = 62;
const ZONE = 4;
const TOUCH_SPACING = 48;
const ZOOM_SCALE = 0.6;

const TABLE_BG_WITH_VERSION = '/backgrounds/table-tarot-bg.jpg?v=11';
const VISUAL_SHIFT_DOWN = 36;

type CinematicPhase = 0 | 1 | 2 | 3;

/* ---------- Dos de carte ---------- */
const CARD_BACK_URL = '/images/card-back.png?v=2';
function CardBack({ glow }: { glow?: boolean }) {
  return (
    <div className="w-full h-full rounded-[6px] pointer-events-none relative overflow-hidden" style={{
      border: glow ? "1.5px solid rgba(255,215,120,0.95)" : "1px solid rgba(150,110,30,0.6)",
      boxShadow: glow ? "0 0 16px rgba(255,215,120,0.8)" : "inset 0 0 0 3px rgba(150,110,30,0.2)",
    }}>
      <img src={CARD_BACK_URL} alt="" className="w-full h-full object-cover" draggable={false} />
    </div>
  );
}

/* ---------- Emplacements cartes tirées ---------- */
const POSITION_LABELS = ['Passé', 'Présent', 'Avenir'];
const POSITION_ICONS = ['☽', '☉', '★'];

export interface DrawnCardData {
  card: TarotCard;
  reversed: boolean;
  position: number;
}

function DrawnCardSlot({ drawnCard, isMobile, isReady, slotRefs, position }: {
  drawnCard: DrawnCardData | null;
  isMobile: boolean;
  isReady: boolean;
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  position: number;
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFace, setShowFace] = useState(false);
  const prevRef = useRef<DrawnCardData | null>(null);

  useEffect(() => {
    const sameCard = prevRef.current && drawnCard && prevRef.current.card?.id === drawnCard.card?.id && prevRef.current.position === drawnCard.position;
    if (!drawnCard) { setIsFlipped(false); setShowFace(false); prevRef.current = null; }
    else if (!sameCard) {
      prevRef.current = drawnCard; setIsFlipped(false); setShowFace(false);
      window.setTimeout(() => { setIsFlipped(true); window.setTimeout(() => setShowFace(true), 500); }, 200);
    }
  }, [drawnCard]);

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3" style={{ marginTop: '-38px', marginBottom: '20px' }}>
      <motion.div
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
        style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(218,165,32,0.5)', backdropFilter: 'blur(4px)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : -10 }} transition={{ duration: 0.6 }}
      >
        <span style={{ color: '#FFD700', fontSize: isMobile ? '12px' : '15px' }}>{POSITION_ICONS[position]}</span>
        <span className="text-xs sm:text-sm md:text-base tracking-widest uppercase font-bold" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFD700' }}>{POSITION_LABELS[position]}</span>
      </motion.div>

      <div className="relative" style={{ perspective: '1000px', width: isMobile ? '110px' : '240px', height: isMobile ? '185px' : '405px' }}>
        {!drawnCard ? (
          <motion.div className="w-full h-full rounded-lg slot-empty" initial={{ opacity: 0 }} animate={{ opacity: isReady ? 1 : 0 }} transition={{ duration: 0.6 }} />
        ) : (
          <motion.div
            ref={(el) => { slotRefs.current[drawnCard.position] = el; }}
            className="w-full h-full rounded-lg"
            initial={false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 18, duration: 0.7 }}
          >
            <div className="absolute inset-0 rounded-lg mystic-glow" style={{ zIndex: 0 }} />
            <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
              <div className="card-face card-back" style={{ backgroundImage: `url(${CARD_BACK_URL})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid rgba(218,165,32,0.5)' }} />
              <div className="card-face card-front">
                <CardFace card={drawnCard.card} reversed={drawnCard.reversed} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
      {drawnCard && (
        <p
          className="text-[11px] sm:text-xs md:text-sm text-center font-semibold leading-tight"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            marginTop: '4px',
            minHeight: isMobile ? '28px' : '34px',
            maxWidth: isMobile ? '120px' : '240px',
          }}
        >
          {drawnCard.card.name}
        </p>
      )}
    </div>
  );
}

function DrawnCards({ drawnCards, isReady, slotRefs }: { drawnCards: DrawnCardData[]; isReady: boolean; slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]> }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile(window.innerWidth < 640); }, []);
  return (
    <div className="absolute left-0 right-0 z-25 flex justify-center items-start px-2 sm:px-4" style={{ zIndex: 25, top: '29vh', maxWidth: isMobile ? '100vw' : '1200px', margin: '0 auto' }}>
      {[0, 1, 2].map((position) => (
        <div key={position} style={{ flex: '0 0 auto', marginRight: isMobile && position < 2 ? '8px' : '0' }}>
          <DrawnCardSlot drawnCard={drawnCards[position] ?? null} isMobile={isMobile} isReady={isReady} slotRefs={slotRefs} position={position} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Étincelles ---------- */
function Sparkles({ x, y }: { x: number; y: number }) {
  const parts = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    a: (i / 14) * Math.PI * 2 + Math.random() * 0.5,
    d: 30 + Math.random() * 55,
    s: 3 + Math.random() * 4,
    dur: 0.6 + Math.random() * 0.5,
  })), []);
  return (
    <div style={{ position: "fixed", left: x, top: y, zIndex: 400, pointerEvents: "none" }}>
      {parts.map((p, i) => (
        <div key={i} style={{
          position: "absolute", width: p.s, height: p.s, borderRadius: "50%",
          background: "radial-gradient(circle,#fff7d0,#ffc94a)",
          boxShadow: "0 0 6px rgba(255,210,100,0.9)",
          animation: `sparkFly ${p.dur}s ease-out forwards`,
          "--dx": Math.cos(p.a) * p.d + "px",
          "--dy": Math.sin(p.a) * p.d - 40 + "px",
        } as CSSProperties} />
      ))}
    </div>
  );
}

/* ---------- Carte volante ---------- */
function FlyingCard({ flying }: { flying: { from: DOMRect; to: DOMRect; cardId: number } }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(r); }, []);
  const { from, to } = flying;
  return (
    <>
      <div className="fixed pointer-events-none rounded-md" style={{
        left: go ? to.left : from.left, top: go ? to.top : from.top,
        width: go ? to.width : from.width, height: go ? to.height : from.height,
        zIndex: 295, transition: "all 1.05s cubic-bezier(.16,.84,.28,1)",
        background: "radial-gradient(ellipse, rgba(255,215,120,0.5), transparent 70%)",
        filter: "blur(10px)", transform: "scale(1.8)",
      }} />
      <div className="fixed z-50 pointer-events-none rounded-md overflow-hidden" style={{
        left: go ? to.left : from.left, top: go ? to.top : from.top,
        width: go ? to.width : from.width, height: go ? to.height : from.height,
        zIndex: 300,
        transform: go ? "scale(1) rotate(0deg)" : "scale(1.5) rotate(-8deg)",
        transition: "all .85s cubic-bezier(.16,.84,.28,1)",
        boxShadow: go ? "0 0 20px rgba(255,190,70,0.5)" : "0 0 46px rgba(255,220,120,0.95)",
        filter: go ? "brightness(1)" : "brightness(1.5)",
      }}>
        <CardBack glow />
      </div>
    </>
  );
}

/* ========== COMPOSANT PRINCIPAL ========== */
export default function TarotApp() {
  const router = useRouter();

  /* ---- Cinématique (tarot-3-cartes) ---- */
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>(0);
  useEffect(() => {
    const t1 = setTimeout(() => setCinematicPhase(1), 300);
    const t2 = setTimeout(() => setCinematicPhase(2), 1200);
    const t3 = setTimeout(() => setCinematicPhase(3), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* ---- Deck 78 cartes (tarot-test) ---- */
  // Déterministe au 1er render (évite le mismatch d'hydratation Math.random SSR/client).
  // Le mélange aléatoire est appliqué APRÈS hydratation, dans un useEffect.
  const [deck, setDeck] = useState<TarotCard[]>(() => [...TAROT_CARDS]);
  useEffect(() => {
    const d = [...TAROT_CARDS];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    setDeck(d);
  }, []);

  const [picked, setPicked] = useState<{ slot: number; cardId: number; name: string }[]>([]);
  const pickedIdx = useRef(new Set<number>());
  const flyingIdx = useRef<number | null>(null);
  const [flying, setFlying] = useState<{ from: DOMRect; to: DOMRect; cardId: number } | null>(null);
  const [reveal, setReveal] = useState(false);
  const [progress, setProgress] = useState(0);
  const [handDone, setHandDone] = useState(false);
  const [handStarted, setHandStarted] = useState(false);
  const [liftIdx, setLiftIdx] = useState<number | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [sparkles, setSparkles] = useState<{ x: number; y: number; key: number } | null>(null);
  const [litSlot, setLitSlot] = useState<number | null>(null);
  const [vw, setVw] = useState(375);

  const zoomRef = useRef({ center: N / 2, amount: 0 });
  const [, force] = useState(0);
  const rerender = useCallback(() => force((v) => (v + 1) & 0xffff), []);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const remaining = TOTAL_PICKS - picked.length;

  /* ---- Viewport resize ---- */
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const isReady = cinematicPhase >= 3;
  const haptic = (ms: number | number[]) => { if (ENABLE_HAPTICS && navigator.vibrate) navigator.vibrate(ms as number); };

  /* ---- Sélection d'une carte ---- */
  const pickCard = useCallback((deckIndex: number) => {
    if (pickedIdx.current.has(deckIndex) || picked.length >= TOTAL_PICKS || flyingIdx.current !== null) return;
    const slot = picked.length;
    const cardEl = stageRef.current && stageRef.current.querySelector(`[data-deck-index="${deckIndex}"]`);
    const slotEl = slotRefs.current[slot];
    const card = deck[deckIndex];
    haptic(30);
    if (cardEl) {
      const r = (cardEl as HTMLElement).getBoundingClientRect();
      setRipple({ x: r.left + r.width / 2, y: r.top + r.height / 2, key: Date.now() });
      if (ENABLE_SPARKLES) setSparkles({ x: r.left + r.width / 2, y: r.top + r.height / 2, key: Date.now() });
    }
    setLiftIdx(deckIndex);
    window.setTimeout(() => {
      const cardEl2 = stageRef.current && stageRef.current.querySelector(`[data-deck-index="${deckIndex}"]`);
      if (cardEl2 && slotEl) {
        flyingIdx.current = deckIndex;
        setFlying({ from: (cardEl2 as HTMLElement).getBoundingClientRect(), to: slotEl.getBoundingClientRect(), cardId: card.id });
      }
      pickedIdx.current.add(deckIndex);
      setLiftIdx(null);
      window.setTimeout(() => {
        setPicked((prev) => [...prev, { slot, cardId: card.id, name: card.name }]);
        window.setTimeout(() => {
          flyingIdx.current = null;
          setFlying(null);
          setLitSlot(slot);
          haptic([20, 40, 20]);
          window.setTimeout(() => setLitSlot(null), 800);
        }, 150);
      }, 900);
    }, 420);
  }, [deck, picked.length]);

  /* ---- Révélation (tirage complet) ---- */
  useEffect(() => {
    if (picked.length === TOTAL_PICKS) {
      const t = window.setTimeout(() => setReveal(true), 700);
      return () => window.clearTimeout(t);
    }
  }, [picked.length]);

  /* ---- Animation d'ouverture (tarot-test) ---- */
  useEffect(() => {
    let raf = 0;
    const toHand = window.setTimeout(() => setHandStarted(true), 1400);
    const toStart = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const lin = Math.min(1, (now - start) / SPREAD_MS);
        setProgress(1 - Math.pow(1 - lin, 3));
        if (lin < 1) raf = requestAnimationFrame(tick);
        else setHandDone(true);
      };
      raf = requestAnimationFrame(tick);
    }, 2000);
    return () => { window.clearTimeout(toHand); window.clearTimeout(toStart); cancelAnimationFrame(raf); };
  }, []);

  /* ---- Géométrie ---- */
  const gap = (vw - EDGE * 2 - CARD_W) / (N - 1);
  const slotFor = (i: number) => EDGE + CARD_W / 2 + i * gap;
  const idxAt = (mx: number) => Math.max(0, Math.min(N - 1, (mx - EDGE - CARD_W / 2) / gap));
  const K = ZONE * Math.max(0, TOUCH_SPACING - gap);
  const zoomOffset = (i: number) => {
    const z = zoomRef.current;
    if (z.amount <= 0.02) return 0;
    return Math.tanh((i - z.center) / ZONE) * K * z.amount;
  };
  const zoomScale = (i: number) => {
    const z = zoomRef.current;
    if (z.amount <= 0.02) return 1;
    const x = (i - z.center) / ZONE;
    return 1 + Math.exp(-x * x) * ZOOM_SCALE * z.amount;
  };
  const clampX = (x: number) => Math.max(EDGE + CARD_W / 2, Math.min(vw - EDGE - CARD_W / 2, x));

  /* ---- Gestes ---- */
  const pinchStartDist = useRef(0);
  const pinchStartAmount = useRef(0);
  const pinching = useRef(false);
  const dragId = useRef<number | null>(null);
  const dragStartX = useRef(0);
  const dragStartCenter = useRef(0);
  const movedRef = useRef(false);
  const downTime = useRef(0);
  const lastPinchEnd = useRef(0);

  const startPinch = (x1: number, y1: number, x2: number, y2: number) => {
    pinching.current = true;
    pinchStartDist.current = Math.hypot(x1 - x2, y1 - y2);
    pinchStartAmount.current = zoomRef.current.amount;
    zoomRef.current.center = idxAt((x1 + x2) / 2);
    haptic(10);
  };
  const movePinch = (x1: number, y1: number, x2: number, y2: number) => {
    if (pinchStartDist.current <= 0) return;
    const d = Math.hypot(x1 - x2, y1 - y2);
    const target = pinchStartAmount.current + (d - pinchStartDist.current) / 150;
    zoomRef.current.amount = Math.max(0, Math.min(1, target));
    rerender();
  };
  const onPointerDown = (e: React.PointerEvent) => {
    movedRef.current = false;
    downTime.current = Date.now();
    if (dragId.current === null && !pinching.current) {
      dragId.current = e.pointerId;
      dragStartX.current = e.clientX;
      dragStartCenter.current = zoomRef.current.center;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pinching.current) return;
    if (dragId.current === e.pointerId) {
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 6) movedRef.current = true;
      zoomRef.current.center = Math.max(0, Math.min(N - 1, dragStartCenter.current - dx / 24));
      rerender();
    }
  };
  const endPointer = (e: React.PointerEvent) => {
    if (dragId.current === e.pointerId) dragId.current = null;
    const isTap = !movedRef.current && !pinching.current &&
      Date.now() - downTime.current < 350 && Date.now() - lastPinchEnd.current > 250;
    if (isTap) {
      const el = e.target && (e.target as HTMLElement).closest && (e.target as HTMLElement).closest("[data-deck-index]");
      const di = el && (el as HTMLElement).getAttribute("data-deck-index");
      if (di != null) {
        pickCard(Number(di));
      } else if (zoomRef.current.amount > 0.02) {
        // tap hors pioche après pinch -> réinitialise l'étalement de départ
        zoomRef.current.amount = 0;
        zoomRef.current.center = N / 2;
        rerender();
      }
    }
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      dragId.current = null;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      startPinch(t1.clientX, t1.clientY, t2.clientX, t2.clientY);
      e.preventDefault();
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinching.current) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      movePinch(t1.clientX, t1.clientY, t2.clientX, t2.clientY);
      e.preventDefault();
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2 && pinching.current) {
      pinching.current = false;
      pinchStartDist.current = 0;
      lastPinchEnd.current = Date.now();
    }
  };

  const spreadFront = Math.floor(progress * N);
  const z = zoomRef.current;
  const zoomActive = z.amount > 0.15;
  const leftCount = Math.max(0, Math.round(z.center - ZONE));
  const rightCount = Math.max(0, N - 1 - Math.round(z.center + ZONE));

  const drawnCards: DrawnCardData[] = picked.map((p) => ({
    card: TAROT_CARDS.find((c) => c.id === p.cardId) || ({} as TarotCard),
    reversed: false,
    position: p.slot,
  }));

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: '#0a0604' }}>
      <YiSlideNav />

      {/* ========== CINEMATIC BACKGROUND ========== */}
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: cinematicPhase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="relative w-full h-full"
          initial={{ scale: 0.92 }}
          animate={{ scale: cinematicPhase >= 2 ? 1.08 : 0.92 }}
          transition={{ duration: cinematicPhase >= 2 ? 1.2 : 0.3, ease: 'easeOut' }}
        >
          <Image
            src={TABLE_BG_WITH_VERSION}
            alt="Table en bois rustique"
            fill
            className="object-cover"
            style={{ objectPosition: 'center 50%', transform: 'scale(1.1) translateY(-13%)', filter: 'brightness(1.08) contrast(1.06) saturate(1.08)' }}
            priority
            quality={90}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/15" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center 44%, transparent 45%, rgba(0,0,0,0.18) 100%)' }} />
        </motion.div>
      </motion.div>

      {/* ========== TITRE ========== */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-30 text-center"
        style={{ top: '5%', transform: 'translateY(-50%)' }}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : -40 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <h1
          className="title-glow px-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wider uppercase"
          style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#FFD700', letterSpacing: '0.1em', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
        >
          Tirage 3 cartes
        </h1>
        <motion.p
          className="text-sm sm:text-base md:text-lg mt-2 font-semibold"
          style={{
            color: '#FFD700', fontFamily: 'var(--font-cinzel), serif', textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', padding: '6px 16px',
            borderRadius: '14px', display: 'inline-block', border: '1px solid rgba(218,165,32,0.3)',
            transform: 'translateY(28px)',
          }}
        >
          {reveal ? 'Votre tirage est complet ✨' : `${remaining} carte${remaining > 1 ? 's' : ''} à tirer`}
        </motion.p>
      </motion.div>

      {/* ========== CARTES TIRÉES (Passé/Présent/Avenir) ========== */}
      <DrawnCards drawnCards={drawnCards} isReady={isReady} slotRefs={slotRefs} />

      {/* ========== MAIN — déploiement ========== */}
      {handStarted && (
        <motion.div
          className="absolute z-40 pointer-events-none"
          style={{ left: clampX(slotFor(spreadFront)), bottom: "20%", transform: "translate(-50%, 75%)", filter: "drop-shadow(0 0 16px rgba(255,220,150,0.75))" }}
          aria-hidden
          initial={{ opacity: 1 }}
          animate={{ opacity: handDone ? 0 : 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <img src="/images/main.png?v=2" alt="" style={{ width: 72, height: "auto" }} draggable={false} />
        </motion.div>
      )}

      {/* ========== MINI-CARTE / JAUGE — entre pioche et emplacements ========== */}
      {!reveal && handDone && (
        <div className="absolute z-30 pointer-events-none" style={{ left: "50%", top: "59%", transform: "translate(-50%, 0)", width: "min(86vw, 560px)" }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <span style={{ color: zoomActive ? "#fcd58a" : "rgba(255,220,160,0.35)", fontFamily: "serif", fontSize: 13, minWidth: 34, textAlign: "right", textShadow: "0 0 8px rgba(0,0,0,0.8)", transition: "color .3s" }}>
              {zoomActive ? "◂ " + leftCount : ""}
            </span>
            <div className="relative flex-1 rounded-full overflow-hidden" style={{ height: 8, background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,200,110,0.25)" }}>
              {[0.25, 0.5, 0.75].map((f) => (
                <div key={f} style={{ position: "absolute", left: f * 100 + "%", top: 0, bottom: 0, width: 1, background: "rgba(255,220,160,0.2)" }} />
              ))}
              {[...pickedIdx.current].map((i) => (
                <div key={i} style={{ position: "absolute", left: (i / (N - 1)) * 100 + "%", top: 0, bottom: 0, width: 3, background: "#ffd97a", boxShadow: "0 0 4px #ffd97a" }} />
              ))}
              <div style={{
                position: "absolute", top: -1, bottom: -1,
                left: Math.max(0, ((z.center - ZONE) / (N - 1)) * 100) + "%",
                width: Math.min(100, ((ZONE * 2) / (N - 1)) * 100) + "%",
                background: zoomActive ? "linear-gradient(90deg, rgba(255,200,90,0.25), rgba(255,220,130,0.85), rgba(255,200,90,0.25))" : "rgba(255,220,150,0.3)",
                borderRadius: 4, transition: "background .3s",
                boxShadow: zoomActive ? "0 0 10px rgba(255,200,90,0.8)" : "none",
              }} />
            </div>
            <span style={{ color: zoomActive ? "#fcd58a" : "rgba(255,220,160,0.35)", fontFamily: "serif", fontSize: 13, minWidth: 34, textShadow: "0 0 8px rgba(0,0,0,0.8)", transition: "color .3s" }}>
              {zoomActive ? rightCount + " ▸" : ""}
            </span>
          </div>
          <div className="text-center" style={{
            color: "rgba(255,230,180,0.6)", fontSize: 10, fontFamily: "serif", marginTop: 3,
            opacity: zoomActive ? 1 : 0.4, transition: "opacity .3s",
          }}>
            carte {Math.round(z.center) + 1} / {N}
          </div>
        </div>
      )}

      {/* ========== ZONE CARTES — pioche dépliante ========== */}
      {!reveal && (
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="absolute z-20"
          style={{ left: 0, right: 0, bottom: 0, height: "32%", touchAction: "none" }}
        >
          {deck.map((c, i) => {
            const deployed = i <= spreadFront;
            if (!deployed) {
              return (
                <div key={c.id} className="absolute" style={{ left: EDGE, bottom: "40%", width: CARD_W, aspectRatio: "2 / 3", zIndex: i }} aria-hidden>
                  <CardBack />
                </div>
              );
            }
            if (pickedIdx.current.has(i) && flyingIdx.current !== i) return null;
            if (flyingIdx.current === i) return null;
            const x = clampX(slotFor(i) + zoomOffset(i));
            const near = Math.abs(i - z.center) <= ZONE && zoomActive;
            const isCenter = Math.abs(i - z.center) < 0.7 && zoomActive;
            const sc = zoomScale(i);
            const deploying = spreadFront < N - 1;
            const lifting = liftIdx === i;
            return (
              <div key={c.id} data-deck-index={i} className="absolute" style={{
                left: x, bottom: "40%", width: CARD_W, aspectRatio: "2 / 3",
                "--sc": sc,
                transform: `translateX(-50%) scale(${sc})`,
                transformOrigin: "bottom center",
                zIndex: lifting ? 350 : near ? 300 - Math.round(Math.abs(i - z.center) * 10) : 100 + i,
                transition: deploying ? "none" : "left .08s linear, transform .12s ease-out, filter .2s",
                animation: lifting ? "liftUp 0.42s ease-out forwards" : (ENABLE_BREATH && near && !deploying ? "breath 2.4s ease-in-out infinite" : "none"),
                filter: lifting
                  ? "drop-shadow(0 0 26px rgba(255,225,140,1)) brightness(1.35)"
                  : isCenter
                    ? "drop-shadow(0 0 16px rgba(255,215,120,0.95)) brightness(1.12)"
                    : near
                      ? "drop-shadow(0 0 10px rgba(255,200,90,0.7))"
                      : "drop-shadow(0 3px 5px rgba(0,0,0,0.5))",
                willChange: "transform",
              } as React.CSSProperties}>
                <CardBack glow={near || lifting} />
              </div>
            );
          })}
        </div>
      )}

      {/* ========== EFFETS ========== */}
      {ripple && (
        <div key={ripple.key} className="fixed pointer-events-none rounded-full" style={{
          left: ripple.x, top: ripple.y, width: 90, height: 90, zIndex: 390,
          border: "2px solid rgba(255,215,120,0.9)",
          boxShadow: "0 0 20px rgba(255,200,90,0.6), inset 0 0 20px rgba(255,200,90,0.3)",
          animation: "rippleGold 0.7s ease-out forwards",
        }} onAnimationEnd={() => setRipple(null)} />
      )}

      {ENABLE_SPARKLES && sparkles && <Sparkles key={sparkles.key} x={sparkles.x} y={sparkles.y} />}

      {flying && <FlyingCard flying={flying} />}

      {/* ========== BOUTON INTERPRÉTATION ========== */}
      {reveal && (
        <motion.div
          className="absolute left-0 right-0 text-center z-30 px-4 sm:px-6"
          style={{ bottom: '22%' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            onClick={() => {
              const ids = picked.map((p) => p.cardId);
              const spreadType = 'tarot-3-cartes';
              try { localStorage.setItem(`${spreadType}-cards`, JSON.stringify(ids)); } catch {}
              let userId = '';
              try { const u = localStorage.getItem('tarot_user'); if (u) userId = (JSON.parse(u).email) || ''; } catch {}
              const params = new URLSearchParams();
              params.append('type', spreadType);
              params.append('cartes', ids.join(','));
              if (userId) params.append('userId', userId);
              router.push(`/interpret/${spreadType}?${params.toString()}`);
            }}
            className="relative px-10 py-4 rounded-2xl text-sm font-bold tracking-[0.18em] uppercase overflow-hidden"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
              background: 'linear-gradient(to right, #4a1a10 0%, #5e1a2b 50%, #7a1e2e 100%)',
              color: '#FFF3C4',
              border: '1.5px solid rgba(255,225,150,0.85)',
              textShadow: '0 0 10px rgba(255,225,150,0.9), 0 1px 2px rgba(0,0,0,0.5)',
              animation: 'btnGlow 2.4s ease-in-out infinite',
              boxShadow: '0 0 18px rgba(196,120,255,0.55), 0 0 38px rgba(218,165,32,0.45), inset 0 0 16px rgba(255,240,210,0.4)',
            }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.95 }}
          >
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)',
                animation: 'btnShimmer 3.2s ease-in-out infinite',
              }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              <span className="star-ornament" style={{ fontSize: '1.15em', filter: 'drop-shadow(0 0 6px rgba(255,225,150,0.9))' }}>✦</span>
              Consulter l&apos;Oracle à propos de ce tirage
              <span className="star-ornament" style={{ fontSize: '1.15em', filter: 'drop-shadow(0 0 6px rgba(255,225,150,0.9))', animationDelay: '-1.6s, -0.8s' }}>✦</span>
            </span>
          </motion.button>
        </motion.div>
      )}

      {/* ========== CINEMATIC BLACK OVERLAY ========== */}
      <motion.div
        className="absolute inset-0 z-[60] pointer-events-none"
        style={{ background: '#0a0604' }}
        initial={{ opacity: 0.85 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.2, delay: 0.1 }}
      />
    </div>
  );
}
