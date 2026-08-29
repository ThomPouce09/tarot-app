'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import YiSlideNav from '@/components/yi-slide-nav';
import CardFace from './card-face';
import { TAROT_CARDS, TarotCard } from '@/lib/tarot-data';
import { playSound, vibrate as haptic } from '@/lib/sounds';

/* ============================================================
 *  FUSION  /tarot-3-cartes (décor)  +  /tarot-test (pioche)
 *  - Décor : background table, menu, titre, emplacement cartes
 *    tirées (DrawnCards Passé/Présent/Avenir), cinématique.
 *  - Pioche : deck de 78 cartes dépliant, pinch/zoom, drag,
 *    sélection une par une, effets dorés.
 * ============================================================ */

const ENABLE_SPARKLES = true;
const ENABLE_BREATH = true;
const ENABLE_HAND_DUST = true;

const N = 78;
const SPREAD_MS = 3000;
const EDGE = 10;
const CARD_W = 62;
const ZONE = 4;
const TOUCH_SPACING = 48;
const ZOOM_SCALE = 0.6;

const TABLE_BG_WITH_VERSION = '/backgrounds/table-tarot-bg.jpg?v=11';
const VISUAL_SHIFT_DOWN = 36;

/* ---------- Chronologie d'apparition (timing) ---------- */
const ZOOM_START_MS = 120;                              // 1) fond + zoom dès le chargement
const ZOOM_DURATION_MS = 1200;                          // durée du zoom du fond (aligné sur la transition scale)
const ZOOM_END_MS = ZOOM_START_MS + ZOOM_DURATION_MS;   // fin du zoom
const DECK_DELAY_MS = 500;                              // pioche + main retardées de 0.5s
const DECK_SHOW_MS = ZOOM_END_MS + DECK_DELAY_MS;       // 3) pioche + navbar, 0.5s après fin du zoom
const UI_PREVIEW_MS = ZOOM_END_MS - 350;                // 2) titre + menu + sélecteurs ~350ms avant fin zoom
const HAND_APPEAR_MS = DECK_SHOW_MS + 400;              // 4) main sur la pioche, 0.4s après la pioche
const SPREAD_START_MS = HAND_APPEAR_MS + 300;           // 5) déploiement + balayage + particules, 0.3s après la main

// Délai après la fin du balayage avant d'activer transitions + breath sur la pioche
// (évite le scintillement / saut de z-index à l'instant exact où la main disparaît)
const SPREAD_SETTLE_MS = 500;
// Durée du fondu de la main (CSS pur — taille constante, pas de framer-motion)
const HAND_FADE_MS = 450;

/* ---------- Tuto geste "Pincer la pioche" ---------- */
// Apparaît une fois l'indice "Choisis tes cartes" disparu (handDone + 2.6s),
// reste ~5s, et meurt au premier pinch / premier tap carte / timeout.
// S'il disparaît sans interaction, il REAPPEARAÎT après 5s (cycle continu
// tant que l'utilisateur n'a ni pincé ni choisi de carte).
const PINCH_HINT_DELAY_MS = 2800;   // après handDone (l'indice existant part à 2.6s)
const PINCH_HINT_SHOW_MS = 5000;    // durée d'affichage maximale
const PINCH_HINT_FADE_MS = 400;     // fondu de sortie
const PINCH_HINT_REAPPEAR_MS = 5000; // délai avant réapparition sans interaction

type CinematicPhase = 0 | 1 | 2 | 3 | 4;

/* ---------- Poussière magique dorée (traînée de la main) ---------- */
interface DustParticle {
  id: number;
  x: number;
  yJitter: number;
  size: number;
  dx: number;
  dy: number;
  dur: number;
}

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
const DEFAULT_POSITION_LABELS = ['Passé', 'Présent', 'Avenir'];
const DEFAULT_POSITION_ICONS = ['☽', '☉', '★'];

export interface DrawnCardData {
  card: TarotCard;
  reversed: boolean;
  position: number;
}

function DrawnCardSlot({ drawnCard, isMobile, isReady, slotRefs, position, positionLabels, positionIcons, cardW, cardH, labelSide = 'top' }: {
  drawnCard: DrawnCardData | null;
  isMobile: boolean;
  isReady: boolean;
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  position: number;
  positionLabels: string[];
  positionIcons: string[];
  cardW: number;
  cardH: number;
  labelSide?: 'top' | 'right';
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

  // labelSide 'right' : label disposé à droite de la carte (gain de place
  // verticale dans la croix), sinon au-dessus. En mobile, le label est compact
  // (maxWidth + troncature) pour que la grille tienne dans le viewport.
  // Si le label est vide → masqué (croix d'origine, sans titres de zone).
  const label = positionLabels[position] ? (
    <motion.div
      className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-4 py-1 sm:py-2 rounded-full"
      style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(218,165,32,0.5)', backdropFilter: 'blur(4px)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', maxWidth: labelSide === 'right' && isMobile ? 64 : '100%' }}
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : -10 }} transition={{ duration: 0.6 }}
    >
      <span style={{ color: '#FFD700', fontSize: isMobile ? (labelSide === 'right' ? 9 : 11) : 15 }}>{positionIcons[position]}</span>
      <span
        className="text-[8px] sm:text-sm md:text-base tracking-widest uppercase font-bold whitespace-nowrap overflow-hidden"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFD700', textOverflow: 'ellipsis' }}
      >
        {positionLabels[position]}
      </span>
    </motion.div>
  ) : null;

  if (labelSide === 'right') {
    return (
      <div className="flex items-center gap-1.5 sm:gap-3" style={{ marginTop: '-38px', marginBottom: '20px' }}>
        <div className="relative" style={{ perspective: '1000px', width: cardW, height: cardH }}>
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
        {label}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3" style={{ marginTop: '-38px', marginBottom: '20px' }}>
      {label}

      <div className="relative" style={{ perspective: '1000px', width: cardW, height: cardH }}>
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
      {/* Espace réservé pour le nom : toujours présent (hauteur fixe) pour que
          la grille ne bouge pas quand une carte est sélectionnée. */}
      <p
        className="text-[11px] sm:text-xs md:text-sm text-center font-semibold leading-tight"
        style={{
          fontFamily: 'var(--font-cinzel), serif',
          color: '#FFD700',
          textShadow: drawnCard ? '0 1px 3px rgba(0,0,0,0.6)' : 'none',
          marginTop: '-2px',
          minHeight: isMobile ? '28px' : '34px',
          maxWidth: isMobile ? '120px' : '240px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '0px',
        }}
      >
        {drawnCard ? drawnCard.card.name : ''}
      </p>
    </div>
  );
}

function DrawnCards({ drawnCards, isReady, slotRefs, totalPicks, positionLabels, positionIcons, crossLayout, reveal }: {
  drawnCards: DrawnCardData[];
  isReady: boolean;
  slotRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  totalPicks: number;
  positionLabels: string[];
  positionIcons: string[];
  crossLayout?: { area: string; label: string; icon: string }[];
  reveal?: boolean;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [vw, setVw] = useState(375);
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    setVw(window.innerWidth);
    setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  // Largeur mobile adaptée au nombre d'emplacements : 5 cartes → slots plus
  // étroits pour tenir dans l'écran (5 × ~64px + marges ≈ 360px).
  const cardW = isMobile ? Math.min(110, Math.floor((vw - 16 - (totalPicks - 1) * 6) / totalPicks)) : 240;
  const cardH = isMobile ? Math.round(cardW * 1.68) : 405;

  // Mode croix : 3 colonnes seulement (pas totalPicks), titres masqués →
  // carte à la taille d'origine de la croix (~65px mobile), gaps 8px/12px.
  // Grille = 3 × 65 + 2 × 12 + padding 16 ≈ 235px, centrée dans le viewport.
  const crossW = isMobile ? 65 : 240;
  const crossH = isMobile ? Math.round(crossW * 1.68) : 405;

  // Mode croix : grille 3×3 (1 en haut, 3 au milieu, 1 en bas) comme la
  // croix celtique d'origine — emplacements seuls, sans titres latéraux.
  // Les positions se remplissent dans l'ordre d'affichage (crossLayout[i] →
  // drawnCards[i]). La largeur est calculée pour que la grille tienne dans
  // le viewport mobile (3 colonnes de ~70px + gaps ≈ 360px).
  if (crossLayout && crossLayout.length === totalPicks) {
    const areas = [
      '".        a0        .       "',
      '"a1       a2        a3      "',
      '".        a4        .       "',
    ];
    return (
      <motion.div
        className="absolute left-0 right-0 z-25 flex justify-center items-start px-2 sm:px-4"
        style={{ zIndex: 25 }}
        initial={{ top: isMobile ? '15vh' : '20vh' }}
        animate={{ top: reveal ? (isMobile ? '26vh' : '28vh') : (isMobile ? '15vh' : '20vh') }}
        transition={{ duration: reveal ? 1.1 : 0.6, ease: 'easeInOut' }}
      >
        {/* Halo magique discret derrière la croix au moment du recentrage */}
        <motion.div
          className="pointer-events-none absolute"
          style={{
            left: '50%', top: '50%',
            width: 220, height: 220,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,215,120,0.16) 0%, rgba(255,190,80,0.05) 50%, transparent 72%)',
            filter: 'blur(2px)',
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: reveal ? 1 : 0, scale: reveal ? [0.7, 1.08, 0.96, 1] : 0.7 }}
          transition={{ duration: reveal ? 2.2 : 0.4, ease: 'easeOut' }}
        />
        <motion.div
          className="grid relative"
          style={{
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: 'auto auto auto',
            gridTemplateAreas: areas.join(' '),
            gap: isMobile ? '8px 12px' : '14px 28px',
          }}
          initial={false}
          animate={{ scale: reveal ? 1.06 : 1 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        >
          {crossLayout.map((slot, i) => (
            <div key={slot.area} style={{ gridArea: `a${i}` }} className="flex justify-center">
              <DrawnCardSlot
                drawnCard={drawnCards[i] ?? null}
                isMobile={isMobile}
                isReady={isReady}
                slotRefs={slotRefs}
                position={i}
                // Titres masqués (croix d'origine) : le nom de la carte tirée
                // s'affiche sous l'emplacement.
                positionLabels={[]}
                positionIcons={[]}
                cardW={crossW}
                cardH={crossH}
              />
            </div>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="absolute left-0 right-0 z-25 flex justify-center items-start px-2 sm:px-4" style={{ zIndex: 25, top: '29vh', maxWidth: isMobile ? '100vw' : '1200px', margin: '0 auto' }}>
      {Array.from({ length: totalPicks }, (_, position) => (
        <div key={position} style={{ flex: '0 0 auto', marginRight: isMobile && position < totalPicks - 1 ? '6px' : '0' }}>
          <DrawnCardSlot drawnCard={drawnCards[position] ?? null} isMobile={isMobile} isReady={isReady} slotRefs={slotRefs} position={position} positionLabels={positionLabels} positionIcons={positionIcons} cardW={cardW} cardH={cardH} />
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
export default function TarotApp({
  totalPicks = 3,
  positionLabels = DEFAULT_POSITION_LABELS,
  positionIcons = DEFAULT_POSITION_ICONS,
  title = 'Tirage 3 cartes',
  spreadType = 'tarot-3-cartes',
  // Rappelé avec les ids des cartes choisies au moment du bouton "Consulter
  // l'Oracle" (pour les tirages custom type tarot-5-c-manuelle). S'il est
  // fourni, la navigation interne par défaut est remplacée.
  onInterpret,
  // Question posée (tirage avec question) : pastille cliquable pour la relire.
  question,
  // Fond de table personnalisé (remplace TABLE_BG_WITH_VERSION).
  backgroundImage,
  // Vidéo de fond en boucle (remplace backgroundImage si fournie).
  backgroundVideo,
  // Disposition des emplacements en croix (tirage 5 cartes) : tableau de
  // 5 positions dans l'ordre d'affichage, chacune avec une zone de grille.
  // Ex. [{ area: 'sommet', label: 'Le Sommet', icon: '✦' }, ...]
  crossLayout,
}: {
  totalPicks?: number;
  positionLabels?: string[];
  positionIcons?: string[];
  title?: string;
  spreadType?: string;
  onInterpret?: (cardIds: number[]) => void;
  question?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  crossLayout?: { area: string; label: string; icon: string }[];
}) {
  const router = useRouter();

  /* ---- Cinématique (tarot-3-cartes) ---- */
  // Phase 1: fade-in du fond. Phase 2: zoom (début à ZOOM_START_MS).
  // Phase 3: UI (titre/menu/sélecteurs) apparaît juste avant la fin du zoom.
  // Phase 4: pioche + navbar visibles (fin du zoom), puis main + déploiement
  //          pilotés indépendamment par handStarted/spreadFront via leurs propres timers.
  const [cinematicPhase, setCinematicPhase] = useState<CinematicPhase>(0);

  // Pastille question (tirage avec question) : toggle afficher/masquer.
  const [showQuestion, setShowQuestion] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setCinematicPhase(1), ZOOM_START_MS);          // 1) fond apparaît
    const t2 = setTimeout(() => setCinematicPhase(2), ZOOM_START_MS);          // 1) zoom démarre aussitôt (transition gérée par l'échelle)
    const t3 = setTimeout(() => setCinematicPhase(3), UI_PREVIEW_MS);          // 2) titre + menu + sélecteurs
    const t4 = setTimeout(() => setCinematicPhase(4), DECK_SHOW_MS);          // 3) fin du zoom + 0.5s => pioche + navbar
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
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
  // spreadSettled : devient true SPREAD_SETTLE_MS après la fin du balayage.
  // Tant que false, la pioche reste 100% statique (pas de transition CSS, pas de breath)
  // => aucun scintillement ni saut de z-index au moment où la main disparaît.
  const [spreadSettled, setSpreadSettled] = useState(false);
  const [liftIdx, setLiftIdx] = useState<number | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [sparkles, setSparkles] = useState<{ x: number; y: number; key: number } | null>(null);
  const [litSlot, setLitSlot] = useState<number | null>(null);
  const [vw, setVw] = useState(375);
  // Indice "Choisis tes cartes dans la pioche" : apparaît avec la main,
  // écriture machine à écrire, disparaît 5s après la fin de la main.
  const [showHint, setShowHint] = useState(false);
  const [hintLen, setHintLen] = useState(0);
  const HINT_TEXT = "Choisis tes cartes dans la pioche";

  // Tuto geste "Pincer la pioche pour l'ouvrir" : apparaît après l'indice,
  // disparaît au premier pinch / premier tap carte / après 5s. S'il disparaît
  // sans interaction, il réapparaît après 5s (tant que pinchHintDone est false).
  const [showPinchHint, setShowPinchHint] = useState(false);
  const [pinchHintLeaving, setPinchHintLeaving] = useState(false);
  // true dès que l'utilisateur a pincé ou choisi une carte → la boucle de
  // réapparition s'arrête définitivement.
  const pinchHintDone = useRef(false);
  const pinchHintTimer = useRef<number | null>(null);
  const hidePinchHint = useCallback(() => {
    pinchHintDone.current = true; // interaction utilisateur → plus de réapparition
    if (pinchHintLeaving) return;
    setPinchHintLeaving(true);
    pinchHintTimer.current = window.setTimeout(() => {
      setShowPinchHint(false);
      setPinchHintLeaving(false);
    }, PINCH_HINT_FADE_MS);
  }, [pinchHintLeaving]);

  /* ---- Poussière dorée derrière la main ---- */
  const [dust, setDust] = useState<DustParticle[]>([]);
  const dustIdRef = useRef(0);

  const zoomRef = useRef({ center: N / 2, amount: 0 });
  const [, force] = useState(0);
  // re-render throttlé à requestAnimationFrame : le pinch/drag émet des
  // touchmove très fréquents (>60/s) ; sans throttle chaque event provoque
  // un re-render React complet du deck (78 cartes) → jank en WebView.
  // En coalesçant sur rAF on ne re-render qu'une fois par frame (~60fps).
  const rafId = useRef<number | null>(null);
  const rerender = useCallback(() => {
    if (rafId.current !== null) return; // déjà planifié pour cette frame
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      force((v) => (v + 1) & 0xffff);
    });
  }, []);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  // haptic() importé de lib/sounds (respecte la préférence « Vibrations »).
  /* ---- Viewport resize ---- */
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    setVw(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  const isReady = cinematicPhase >= 3;        // titre + menu + sélecteurs (étape 2)
  const zoomDone = cinematicPhase >= 4;       // fin du zoom => pioche + navbar (étape 3)

  /* ---- Sélection d'une carte ---- */
  const pickCard = useCallback((deckIndex: number) => {
    if (pickedIdx.current.has(deckIndex) || picked.length >= totalPicks || flyingIdx.current !== null) return;
    const slot = picked.length;
    // Première carte choisie : le tuto de pincement n'a plus lieu d'être.
    hidePinchHint();
    const cardEl = stageRef.current && stageRef.current.querySelector(`[data-deck-index="${deckIndex}"]`);
    const slotEl = slotRefs.current[slot];
    const card = deck[deckIndex];
    haptic(30);
    // Son de carte sélectionnée : l'un des 2 sons au hasard à chaque fois
    // (tap utilisateur => lecture autorisée). playSound respecte la
    // préférence « Effets sonores » de /preferences.
    playSound(Math.random() < 0.5 ? 'card-flipped' : 'card-flipped2', 0.7);
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
  }, [deck, picked.length, hidePinchHint]);

  /* ---- Révélation (tirage complet) ---- */
  useEffect(() => {
    if (picked.length === totalPicks) {
      const t = window.setTimeout(() => setReveal(true), 700);
      return () => window.clearTimeout(t);
    }
  }, [picked.length]);

  /* ---- Animation d'ouverture (tarot-test) ---- */
  useEffect(() => {
    let raf = 0;
    // Étape 4: la main apparaît 0.4s après la fin du zoom.
    const toHand = window.setTimeout(() => { setHandStarted(true); setShowHint(true); }, HAND_APPEAR_MS);
    // Étape 5: le jeu s'étale (gauche->droite) 0.3s après l'apparition de la main,
    // en même temps que la main balaye et que les particules dorées se diffusent.
    const toStart = window.setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const lin = Math.min(1, (now - start) / SPREAD_MS);
        setProgress(1 - Math.pow(1 - lin, 3));
        if (lin < 1) raf = requestAnimationFrame(tick);
        else setHandDone(true);
      };
      raf = requestAnimationFrame(tick);
    }, SPREAD_START_MS);
    return () => { window.clearTimeout(toHand); window.clearTimeout(toStart); cancelAnimationFrame(raf); };
  }, []);

  /* ---- Activation différée des transitions de la pioche (anti-scintillement) ---- */
  useEffect(() => {
    if (handDone) {
      const t = window.setTimeout(() => setSpreadSettled(true), SPREAD_SETTLE_MS);
      return () => window.clearTimeout(t);
    }
  }, [handDone]);

  /* ---- Indice "Choisis tes cartes..." : écriture machine à écrire + disparition 5s ---- */
  // Écriture lettre par lettre dès que showHint devient true (avec la main).
  useEffect(() => {
    if (!showHint) { setHintLen(0); return; }
    setHintLen(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setHintLen(n);
      if (n >= HINT_TEXT.length) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [showHint]);

  // Disparaît 2,6s après la fin de la main (handDone).
  useEffect(() => {
    if (!handDone) return;
    const t = window.setTimeout(() => setShowHint(false), 2600);
    return () => window.clearTimeout(t);
  }, [handDone]);

  /* ---- Tuto geste "Pincer la pioche pour l'ouvrir" : cycle continu ---- */
  // Apparaît PINCH_HINT_DELAY_MS après la fin de la main (l'indice existant
  // vient de disparaître), se retire après PINCH_HINT_SHOW_MS, puis REAPPEAR
  // après PINCH_HINT_REAPPEAR_MS — et ainsi de suite tant que l'utilisateur
  // n'a pas pincé / choisi une carte (pinchHintDone.current).
  useEffect(() => {
    if (!handDone) return;
    let cancelled = false;
    let t: number;
    const show = () => {
      if (cancelled || pinchHintDone.current) return;
      setShowPinchHint(true);
      setPinchHintLeaving(false);
      t = window.setTimeout(hide, PINCH_HINT_SHOW_MS);
    };
    const hide = () => {
      if (cancelled) return;
      setPinchHintLeaving(true);
      t = window.setTimeout(() => {
        setShowPinchHint(false);
        setPinchHintLeaving(false);
        // Pas d'interaction → le tuto revient après PINCH_HINT_REAPPEAR_MS.
        t = window.setTimeout(show, PINCH_HINT_REAPPEAR_MS);
      }, PINCH_HINT_FADE_MS);
    };
    t = window.setTimeout(show, PINCH_HINT_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handDone]);

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

  // Clampé à N-1 : la main et la dernière carte restent dans l'écran,
  // pas d'index "fantôme" (N) sur la dernière frame du balayage.
  const spreadFront = Math.min(N - 1, Math.floor(progress * N));

  /* ---- Émission de poussière dorée pendant le balayage de la main ---- */
  useEffect(() => {
    if (!ENABLE_HAND_DUST || !handStarted || handDone || spreadFront <= 0) return;
    const hx = clampX(slotFor(spreadFront));
    const created: DustParticle[] = Array.from({ length: 2 }, () => ({
      id: dustIdRef.current++,
      // "derrière" la main = légèrement à gauche (la main balaye vers la droite)
      x: hx - 14 - Math.random() * 34,
      yJitter: Math.random() * 34 - 8,
      size: 2 + Math.random() * 3.5,
      dx: -(8 + Math.random() * 28),
      dy: -(10 + Math.random() * 30),
      dur: 0.7 + Math.random() * 0.7,
    }));
    // On garde au max ~50 particules vivantes pour la perf
    setDust((d) => [...d.slice(-48), ...created]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadFront, handStarted, handDone]);

  // Vide la traînée une fois le balayage terminé
  useEffect(() => {
    if (handDone) {
      const t = window.setTimeout(() => setDust([]), 1600);
      return () => window.clearTimeout(t);
    }
  }, [handDone]);

  const removeDust = useCallback((id: number) => {
    setDust((d) => d.filter((p) => p.id !== id));
  }, []);

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
    // Le geste est compris : on retire le tuto de pincement immédiatement.
    hidePinchHint();
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
  // Tap en dehors de la zone de pioche (stage) : si la pioche est pincée,
  // on remet les cartes à plat (même comportement que le tap dans le stage).
  const onBgTap = (e: React.PointerEvent) => {
    if (pinching.current) return;
    const tgt = e.target as HTMLElement | null;
    if (tgt && stageRef.current && stageRef.current.contains(tgt)) return;
    if (tgt && tgt.closest && tgt.closest("[data-deck-index]")) return;
    if (zoomRef.current.amount > 0.02) {
      zoomRef.current.amount = 0;
      zoomRef.current.center = N / 2;
      rerender();
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

  const z = zoomRef.current;
  const zoomActive = z.amount > 0.15;

  const drawnCards: DrawnCardData[] = picked.map((p) => ({
    card: TAROT_CARDS.find((c) => c.id === p.cardId) || ({} as TarotCard),
    reversed: false,
    position: p.slot,
  }));

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: '#0a0604' }} onPointerUp={onBgTap}>
      {/* Keyframes goldDustTrail + pinchFingerL/R → app/globals.css (évite
          l'erreur d'hydratation du <style> inline JSX, pattern documenté). */}

      {/* ========== MENU (navbar) — apparaît à l'étape 2 avec le reste de l'UI ========== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ pointerEvents: isReady ? 'auto' : 'none' }}
      >
        <YiSlideNav />
      </motion.div>

      {/* ========== CINEMATIC BACKGROUND ========== */}
      <motion.div
        className="absolute inset-0 z-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: cinematicPhase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="relative w-full h-full"
          initial={{ scale: backgroundVideo ? 1 : 0.92 }}
          animate={{ scale: backgroundVideo ? 1 : (cinematicPhase >= 2 ? 1.08 : 0.92) }}
          transition={{ duration: backgroundVideo ? 0 : (cinematicPhase >= 2 ? 1.2 : 0.3), ease: 'easeOut' }}
        >
          {backgroundVideo ? (
            <video
              src={backgroundVideo}
              autoPlay
              muted
              playsInline
              loop
              preload="auto"
              className="h-full w-full"
              style={{ objectFit: 'cover', transform: 'scale(0.99)', objectPosition: 'center' }}
            />
          ) : backgroundImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />
          ) : (
            <Image
              src={TABLE_BG_WITH_VERSION}
              alt="Table en bois rustique"
              fill
              className="object-cover"
              style={{ objectPosition: 'center 50%', transform: 'scale(1.1) translateY(-13%)', filter: 'brightness(1.08) contrast(1.06) saturate(1.08)' }}
              priority
              quality={90}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/15" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center 44%, transparent 45%, rgba(0,0,0,0.18) 100%)' }} />
        </motion.div>
      </motion.div>

      {/* ========== TITRE ========== */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-30 text-center"
        style={{ top: '4.2%', transform: 'translateY(-50%)' }}
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : -40 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <h1
          className="title-glow px-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-wider uppercase"
          style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#FFD700', letterSpacing: '0.1em', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
        >
          {title}
        </h1>
      </motion.div>

      {/* ========== QUESTION (tirage avec question) — pastille cliquable ========== */}
      {question && (
        <motion.div
          className="absolute left-0 right-0 z-40 flex justify-end px-4"
          style={{ top: '13%' }}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: isReady ? 1 : 0, y: isReady ? 0 : -14 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          {/* Pastille cliquable — discrète, 2 lignes, à droite (hors de la croix) */}
          <button
            onClick={() => setShowQuestion((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(218,165,32,0.35)] bg-[rgba(20,10,5,0.6)] px-3 py-1.5 shadow-none backdrop-blur transition-all duration-200 active:scale-95"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            <span style={{ color: '#FFD700', fontSize: '11px', lineHeight: 1 }}>✧</span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#E8C87A]">Votre</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#E8C87A]">question</span>
            </span>
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden
              style={{ transform: showQuestion ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}
            >
              <path d="M6 9l6 6 6-6" stroke="rgba(218,165,32,0.7)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </motion.div>
      )}

      {/* ========== MODALE QUESTION — centrée, au clic sur la pastille ========== */}
      {question && showQuestion && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setShowQuestion(false)}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-[rgba(218,165,32,0.5)] bg-[rgba(26,15,8,0.96)] p-6 shadow-[0_0_40px_rgba(218,165,32,0.25)]"
            initial={{ scale: 0.9, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3
                className="text-sm font-bold uppercase tracking-[0.16em] text-[#FFD700]"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                Votre question
              </h3>
              <button
                onClick={() => setShowQuestion(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(218,165,32,0.4)] text-[#E8C87A] transition-colors hover:bg-white/10"
                aria-label="Fermer"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p
              className="text-base font-semibold leading-relaxed text-[#F0E6D3]"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              {question}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ========== CARTES TIRÉES (emplacements) ========== */}
      <DrawnCards drawnCards={drawnCards} isReady={isReady} slotRefs={slotRefs} totalPicks={totalPicks} positionLabels={positionLabels} positionIcons={positionIcons} crossLayout={crossLayout} reveal={reveal} />

      {/* ========== POUSSIÈRE DORÉE — traînée derrière la main ========== */}
      {ENABLE_HAND_DUST && dust.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 39 }} aria-hidden>
          {dust.map((p) => (
            <div
              key={p.id}
              onAnimationEnd={() => removeDust(p.id)}
              style={{
                position: 'absolute',
                left: p.x,
                bottom: `calc(20% + ${6 + p.yJitter}px)`,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fffbe6 0%, #ffd76a 55%, rgba(255,190,60,0) 100%)',
                boxShadow: '0 0 6px rgba(255,215,110,0.95), 0 0 14px rgba(255,190,80,0.55)',
                animation: `goldDustTrail ${p.dur}s ease-out forwards`,
                '--gdx': p.dx + 'px',
                '--gdy': p.dy + 'px',
              } as CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ========== INDICE — "Choisis tes cartes dans la pioche" + flèches ↓ ==========
          Texte ancré à gauche (écriture gauche->droite synchronisée avec le balayage).
          Flèches clignotantes centrées sur l'écran, juste sous le texte.
          Les deux disparaissent 5s après la main (showHint). */}
      {showHint && (
        <>
          {/* Texte machine à écrire, ancré au bord gauche de l'éventail */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: slotFor(0),
              bottom: "calc(20% + 96px)",
              transform: "translateX(0)",
              textAlign: "left",
              zIndex: 340,
              opacity: hintLen > 0 ? 1 : 0,
              transition: "opacity .4s ease-out",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(15px, 4.4vw, 22px)",
              fontWeight: 600,
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
              color: "#f3d27a",
              textShadow: "0 0 10px rgba(255,190,90,0.85), 0 1px 2px rgba(0,0,0,0.9)",
              fontVariant: "small-caps",
            }}
            aria-hidden
          >
            {HINT_TEXT.slice(0, hintLen)}
            {hintLen < HINT_TEXT.length && (
              <span style={{ opacity: 0.8, marginLeft: 1, animation: "hintBlink 0.7s steps(1) infinite" }}>▌</span>
            )}
          </div>
          {/* Flèches clignotantes pointées vers la pioche (centrées sur l'écran)
              — affichées seulement une fois le texte complet */}
          {hintLen >= HINT_TEXT.length && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: "50%",
              bottom: "calc(20% + 60px)",
              transform: "translateX(-50%)",
              zIndex: 340,
              display: "flex",
              justifyContent: "center",
              gap: 32,
              animation: "hintBlink 1.1s steps(1) infinite",
            }}
            aria-hidden
          >
            {[0, 1, 2].map((k) => (
              <span key={k} style={{
                color: "#f3d27a",
                fontSize: "clamp(22px, 6vw, 32px)",
                fontWeight: 700,
                lineHeight: 1,
                textShadow: "0 0 10px rgba(255,190,90,0.9)",
                animation: "hintArrow 1.1s ease-in-out infinite",
              }}>▼</span>
            ))}
          </div>
          )}
        </>
      )}

      {/* ========== MAIN — déploiement ==========
          Fondu 100% CSS (pas de framer-motion) : taille verrouillée (width + height
          explicites, scale(1) figé), seule l'opacité change à la fin.
          On démonte la main une fois le fondu terminé (spreadSettled). */}
      {handStarted && !spreadSettled && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: clampX(slotFor(spreadFront)),
            bottom: "20%",
            transform: "translate(-50%, 75%) scale(1)",
            transformOrigin: "center center",
            zIndex: 360,
            opacity: handDone ? 0 : 1,
            transition: `opacity ${HAND_FADE_MS}ms ease-out`,
            filter: "drop-shadow(0 0 16px rgba(255,220,150,0.75))",
          }}
          aria-hidden
        >
          <img
            src="/images/main.png?v=2"
            alt=""
            width={72}
            style={{ width: 72, minWidth: 72, maxWidth: 72, height: "auto", display: "block" }}
            draggable={false}
          />
        </div>
      )}

      {/* ========== MINI-CARTE / JAUGE — entre pioche et emplacements ========== */}
      {!reveal && zoomDone && (
        <div className="absolute z-30 pointer-events-none" style={{
          left: "50%", top: "61%", transform: "translate(-50%, 0)",
          width: "min(64vw, 420px)",
        }}>
          <div className="flex items-center justify-center" style={{ gap: 10 }}>
            {/* Barre curseur réduite */}
            <div className="relative rounded-full overflow-hidden" style={{ height: 8, flex: "0 0 auto", width: "min(46vw, 300px)", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,200,110,0.25)" }}>
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
            {/* Info "Carte n/n" à droite de la barre */}
            <span style={{
              color: zoomActive ? "#ffe6a6" : "rgba(255,224,170,0.7)",
              fontFamily: "serif", fontSize: 13, whiteSpace: "nowrap",
              textShadow: "0 0 10px rgba(255,190,90,0.7)", transition: "color .3s",
            }}>
              carte {Math.round(z.center) + 1} / {N}
            </span>
          </div>
        </div>
      )}

      {/* ========== ZONE CARTES — pioche dépliante ========== */}
      {!reveal && zoomDone && (
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
          {/* Pile (cartes non déployées) : stacking context propre, TOUJOURS
              sous l'éventail (zIndex 1 < 2). Évite que la carte de gauche ne
              "se glisse" sous les autres pendant le déploiement. */}
          <div className="absolute inset-0" style={{ zIndex: 1 }} aria-hidden>
            {deck.map((c, i) => {
              if (i <= spreadFront) return null;
              return (
                <div key={c.id} className="absolute" style={{ left: EDGE, bottom: "40%", width: CARD_W, aspectRatio: "2 / 3", zIndex: 100 + (N - 1 - i), transform: "translateX(0)" }} aria-hidden>
                  <CardBack />
                </div>
              );
            })}
          </div>
          {/* Éventail déployé : stacking context au-dessus de la pile (zIndex 2). */}
          <div className="absolute inset-0" style={{ zIndex: 2 }}>
            {deck.map((c, i) => {
              if (!(i <= spreadFront)) return null;
              if (pickedIdx.current.has(i) && flyingIdx.current !== i) return null;
              if (flyingIdx.current === i) return null;
              const x = clampX(slotFor(i) + zoomOffset(i));
              const near = Math.abs(i - z.center) <= ZONE && zoomActive;
              const isCenter = Math.abs(i - z.center) < 0.7 && zoomActive;
              const sc = zoomScale(i);
              // Les transitions et l'animation "breath" ne s'activent qu'une fois
              // le balayage terminé + délai de stabilisation (spreadSettled).
              const deploying = !spreadSettled;
              const lifting = liftIdx === i;
              return (
                <div key={c.id} data-deck-index={i} className="absolute" style={{
                  left: x, bottom: "40%", width: CARD_W, aspectRatio: "2 / 3",
                  "--sc": sc,
                  transform: `translateX(-50%) scale(${sc})`,
                  transformOrigin: "bottom center",
                  // Éventail : droite (i=N-1) au-dessus, gauche recouverte.
                  // near/lift gardent des z supérieurs (zoom/lift).
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
        </div>
      )}

      {/* ========== TUTO GESTE — "Pincez la pioche pour l'ouvrir" ==========
          Overlay style tutoriel Android : 2 doigts blancs semi-transparents
          posés SUR la pioche, qui s'écartent (boucle), avec flèches ← →.
          Disparaît au premier pinch / premier tap carte / après 5s. */}
      {showPinchHint && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: "50%",
            bottom: "10%",
            transform: "translateX(-50%)",
            zIndex: 345,
            opacity: pinchHintLeaving ? 0 : 1,
            transition: `opacity ${PINCH_HINT_FADE_MS}ms ease-out`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
          aria-hidden
        >
          {/* Geste : 2 mains (icône cursor Flaticon), index pointés vers le
              centre, qui s'écartent (boucle), flèches ← → au-dessus.
              invert(1) → icône noire devenue blanche ; opacity variable. */}
          <svg width="170" height="96" viewBox="0 0 170 96" fill="none" aria-hidden>
            {/* Flèches ← → au-dessus des mains */}
            <path d="M34 14h30M34 14l9-8M34 14l9 8" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M136 14h-30M136 14l-9-8M136 14l-9 8" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Main gauche : miroir (scaleX -1) → index vers le haut,
                pouce à gauche. Opacité 0.66. */}
            <g style={{ animation: "pinchFingerL 1.6s ease-in-out infinite" }}>
              <g transform="translate(46 54) scale(-1 1)">
                <image
                  href="/images/hand-cursor.png"
                  x="-23" y="-23" width="46" height="46"
                  style={{ opacity: 0.66, filter: "invert(1)" }}
                />
              </g>
            </g>
            {/* Main droite : icône à l'endroit → index vers le haut,
                pouce à droite. Opacité 0.48. */}
            <g style={{ animation: "pinchFingerR 1.6s ease-in-out infinite" }}>
              <g transform="translate(124 54)">
                <image
                  href="/images/hand-cursor.png"
                  x="-23" y="-23" width="46" height="46"
                  style={{ opacity: 0.48, filter: "invert(1)" }}
                />
              </g>
            </g>
          </svg>
          {/* Légende discrète sous le geste */}
          <span
            className="whitespace-nowrap uppercase"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.72)",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
            }}
          >
            Pincez la pioche pour l&apos;ouvrir
          </span>
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
          style={{ bottom: '10%' }}
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.button
            onClick={() => {
              const ids = picked.map((p) => p.cardId);
              if (onInterpret) {
                onInterpret(ids);
                return;
              }
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
