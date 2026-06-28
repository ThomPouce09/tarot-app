'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TAROT_CARDS } from '@/lib/tarot-data';

/* ------------------------------------------------------------------ *
 * Geometry / gesture constants (TA mécanique — INTACTE)
 * ------------------------------------------------------------------ */
const TOTAL_ARC_DEG = 240;
const CARD_W = 70;
const CARD_H = 112;
const SELECTED_SCALE = 2.0;
const SELECTED_RADIAL_POP = 0.12;
const TAP_MOVE_THRESHOLD = 8;
const MAX_ROTATION_DEG = TOTAL_ARC_DEG / 2;

const MIN_ZOOM = 1.0;
const MAX_ZOOM = 2.0;
const LOUPE_RADIUS = 70;
const LOUPE_SIGMA = LOUPE_RADIUS / 2.2;
const DIM_RADIUS = LOUPE_RADIUS * 1.45;
const POST_PINCH_TAP_LOCK_MS = 320;

const DEG2RAD = Math.PI / 180;
const MAX_HALF_ARC_RAD = (TOTAL_ARC_DEG / 2) * DEG2RAD;
const MAX_EDGE_SIN = Math.sin(MAX_HALF_ARC_RAD);
const MAX_EDGE_COS_ABS = Math.abs(Math.cos(MAX_HALF_ARC_RAD));

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const EASE = 'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease-out';

type SlotPos = 'orient' | 'occident' | 'sommet' | 'base' | 'synthese';
export type { SlotPos };
export const SLOT_POSITIONS: SlotPos[] = [
  'orient',
  'occident',
  'sommet',
  'base',
  'synthese',
];
export const SLOT_LABELS: Record<SlotPos, string> = {
  orient: "L'Orient",
  occident: "L'Occident",
  sommet: 'Le Sommet',
  base: 'La Base',
  synthese: 'La Synthèse',
};
export const SLOT_ICONS: Record<SlotPos, string> = {
  orient: '👈',
  occident: '👉',
  sommet: '⬆️',
  base: '⬇️',
  synthese: '🎯',
};

/* ------------------------------------------------------------------ *
 * TarotPicker — extrait TEL QUEL de ta mécanique
 * Props : cardsToUse (deck filtré) + onCardPicked (re-tap = pioche)
 * ------------------------------------------------------------------ */
interface TarotPickerProps {
  cardsToUse: { id: number; name: string }[];
  selectedId: string | null;
  onCardSelected: (cardId: string) => void;
  onConfirmingChanged?: (confirming: boolean) => void;
}

export function TarotPicker({
  cardsToUse,
  selectedId,
  onCardSelected,
  onConfirmingChanged,
}: TarotPickerProps) {
  const cards = cardsToUse;
  const N = cards.length;

  const layout = useMemo(() => {
    const step = N > 1 ? TOTAL_ARC_DEG / (N - 1) : 0;
    const start = -TOTAL_ARC_DEG / 2;
    return cards.map((_, i) => ({ baseAngle: start + i * step }));
  }, [cards, N]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const rotationOffsetRef = useRef(0);
  const loupeRef = useRef({ open: false, scale: 1, cx: 0, cy: 0 });
  const rafRef = useRef<number | null>(null);

  const pointers = useRef(
    new Map<number, { x: number; y: number; sizeAtDown: number }>()
  );
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const isPinchingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragPointerId = useRef<number | null>(null);
  const movedRef = useRef(false);
  const lastDragXRef = useRef(0);
  const lastDragYRef = useRef(0);
  const dragStartYRef = useRef(0);
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const lastPinchEndRef = useRef(0);

  const [confirming, setConfirming] = useState(false);

  const selectedIndex = useMemo(
    () => cards.findIndex((c) => String(c.id) === selectedId),
    [cards, selectedId]
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
    scheduleFrame();
  }, [selectedId]);

  useEffect(() => {
    onConfirmingChanged?.(confirming);
  }, [confirming, onConfirmingChanged]);

  const applyTransforms = useCallback(() => {
    rafRef.current = null;
    const stage = stageRef.current;
    if (!stage) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(applyTransforms);
      return;
    }

    const FAN_TARGET_H = Math.min(h * 0.4, 280);
    const rByV = (FAN_TARGET_H - 1.1 * CARD_H) / (1 + MAX_EDGE_COS_ABS);
    const rByW = (w / 2 - CARD_W / 2 - 8) / MAX_EDGE_SIN;
    const RADIUS = clamp(Math.min(rByV, rByW), 70, 130);

    const anchorX = w / 2;
    const anchorY = h - 0.5 * CARD_H - MAX_EDGE_COS_ABS * RADIUS;

    const rotation = rotationOffsetRef.current;
    const loupe = loupeRef.current;
    const loupeActive = loupe.open && !selectedIdRef.current;
    const gesturing = isDraggingRef.current || isPinchingRef.current;
    const sel = selectedIdRef.current;

    for (let i = 0; i < N; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;

      const idStr = String(cards[i].id);
      const isSelected = idStr === sel;

      const angle = layout[i].baseAngle + rotation;
      const rad = angle * DEG2RAD;
      const baseX = anchorX + RADIUS * Math.sin(rad);
      const baseY = anchorY - RADIUS * Math.cos(rad);

      let x = baseX;
      let y = baseY;
      let scale = 1;
      let z = i;
      let dimWeight = 1;

      if (isSelected) {
        x = baseX + RADIUS * SELECTED_RADIAL_POP * Math.sin(rad);
        y = baseY - RADIUS * SELECTED_RADIAL_POP * Math.cos(rad);
        scale = SELECTED_SCALE;
        z = 2000;
      } else if (loupeActive) {
        const dx = baseX - loupe.cx;
        const dy = baseY - loupe.cy;
        const d2 = dx * dx + dy * dy;
        const g = Math.exp(-d2 / (2 * LOUPE_SIGMA * LOUPE_SIGMA));
        dimWeight = Math.exp(-d2 / (2 * DIM_RADIUS * DIM_RADIUS));
        if (g > 0.02) {
          const cardZoom = 1 + (loupe.scale - 1) * g;
          x = loupe.cx + dx * cardZoom;
          y = loupe.cy + dy * cardZoom;
          scale = cardZoom;
          z += Math.round(g * 600);
        }
      }

      el.style.transition = gesturing ? 'none' : EASE;
      el.style.transform =
        `translate3d(${x - CARD_W / 2}px, ${y - CARD_H / 2}px, 0) ` +
        `rotate(${angle}deg) scale(${scale})`;
      el.style.zIndex = String(z);
      el.style.visibility = 'visible';
      el.style.opacity =
        loupeActive && !isSelected
          ? dimWeight > 0.06
            ? '1'
            : '0.35'
          : '1';
      el.style.boxShadow = isSelected
        ? '0 0 0 2px rgba(255,215,128,0.95), 0 22px 55px rgba(0,0,0,0.65)'
        : '0 6px 18px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.06)';
    }
  }, [N, cards, layout]);

  const scheduleFrame = useCallback(() => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(applyTransforms);
    }
  }, [applyTransforms]);

  useLayoutEffect(() => {
    applyTransforms();
    const onResize = () => scheduleFrame();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [applyTransforms, scheduleFrame]);

  const stageLocalPoint = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: clientX, y: clientY };
    const r = stage.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const handleCardTap = useCallback(
    (cardId: string) => {
      // re-tap sur la même = confirme (passe à confirming)
      if (selectedIdRef.current === cardId) {
        setConfirming(true);
        return;
      }
      // premier tap : notifie parent pour qu'il mette à jour l'état
      onCardSelected(cardId);
    },
    [onCardSelected]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        stageRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }

      const sizeAtDown = pointers.current.size + 1;
      pointers.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        sizeAtDown,
      });

      if (sizeAtDown === 1) {
        // première touche : drag rotation candidate
        dragPointerId.current = e.pointerId;
        movedRef.current = false;
        downPosRef.current = { x: e.clientX, y: e.clientY };
        dragStartYRef.current = e.clientY;
        lastDragXRef.current = e.clientX;
        lastDragYRef.current = e.clientY;
      } else if (sizeAtDown === 2) {
        // 2e doigt = pinch → (re)ouvre loupe au nouveau midpoint
        isPinchingRef.current = true;
        isDraggingRef.current = false;
        movedRef.current = false;

        if (confirming) setConfirming(false);

        const pts = Array.from(pointers.current.values());
        pinchStartDist.current = Math.hypot(
          pts[0].x - pts[1].x,
          pts[0].y - pts[1].y
        );
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const lp = stageLocalPoint(midX, midY);

        const existingScale = loupeRef.current.open ? loupeRef.current.scale : 1;
        loupeRef.current = {
          open: true,
          scale: existingScale,
          cx: lp.x,
          cy: lp.y,
        };
        pinchStartScale.current = existingScale;
        scheduleFrame();
      }
    },
    [scheduleFrame, confirming]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      pointers.current.set(e.pointerId, {
        ...prev,
        x: e.clientX,
        y: e.clientY,
      });

      if (pointers.current.size >= 2 && isPinchingRef.current) {
        const pts = Array.from(pointers.current.entries()).map(([_, p]) => p);
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchStartDist.current > 0) {
          const ratio = dist / pinchStartDist.current;
          const stage = stageRef.current;
          const rect = stage ? stage.getBoundingClientRect() : { left: 0, top: 0 };
          loupeRef.current = {
            ...loupeRef.current,
            scale: clamp(pinchStartScale.current * ratio, MIN_ZOOM, MAX_ZOOM),
            cx:
              loupeRef.current.cx * 0.85 +
              ((pts[0].x + pts[1].x) / 2 - rect.left) * 0.15,
            cy:
              loupeRef.current.cy * 0.85 +
              ((pts[0].y + pts[1].y) / 2 - rect.top) * 0.15,
          };
          scheduleFrame();
        }
        return;
      }

      if (e.pointerId === dragPointerId.current) {
        const down = downPosRef.current;
        if (down) {
          const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
          if (moved > TAP_MOVE_THRESHOLD) movedRef.current = true;
        }
        if (movedRef.current) {
          if (!isDraggingRef.current) {
            isDraggingRef.current = true;
            lastDragXRef.current = e.clientX;
            lastDragYRef.current = e.clientY;
          }
          const stage = stageRef.current;
          const w = stage ? stage.clientWidth : 360;
          const dx = e.clientX - lastDragXRef.current;

          const degPerPx = TOTAL_ARC_DEG / w;
          if (loupeRef.current.open) {
            rotationOffsetRef.current = clamp(
              rotationOffsetRef.current + dx * degPerPx / loupeRef.current.scale,
              -MAX_ROTATION_DEG,
              MAX_ROTATION_DEG
            );
          } else {
            rotationOffsetRef.current = clamp(
              rotationOffsetRef.current + dx * degPerPx,
              -MAX_ROTATION_DEG,
              MAX_ROTATION_DEG
            );
          }
          lastDragXRef.current = e.clientX;
          lastDragYRef.current = e.clientY;
          scheduleFrame();
        }
      }
    },
    [scheduleFrame]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const pid = e.pointerId;
      const sizeBeforeRemoval = pointers.current.size;
      const p = pointers.current.get(pid);
      const upX = p?.x ?? e.clientX;
      const upY = p?.y ?? e.clientY;

      pointers.current.delete(pid);
      try {
        stageRef.current?.releasePointerCapture(pid);
      } catch {
        /* noop */
      }

      if (sizeBeforeRemoval === 2 && pointers.current.size < 2) {
        isPinchingRef.current = false;
        pinchStartDist.current = 0;
        pinchStartScale.current = 1;
        lastPinchEndRef.current = Date.now();
      }

      if (pid === dragPointerId.current) {
        dragPointerId.current = null;
        isDraggingRef.current = false;
      }

      const isSingletonFinger =
        !!p && p.sizeAtDown === 1 && sizeBeforeRemoval === 1;
      const recentlyEndedPinch =
        Date.now() - lastPinchEndRef.current < POST_PINCH_TAP_LOCK_MS;
      const isTap =
        !movedRef.current && isSingletonFinger && !recentlyEndedPinch;

      if (isTap) {
          const target = document.elementFromPoint(upX, upY) as HTMLElement | null;
          const cardEl = target?.closest('[data-card-id]') as HTMLElement | null;
          const cardId = cardEl?.getAttribute('data-card-id') ?? null;
          const lp = stageLocalPoint(upX, upY);

          if (loupeRef.current.open) {
            const dx = lp.x - loupeRef.current.cx;
            const dy = lp.y - loupeRef.current.cy;
            const insideLoupe =
              dx * dx + dy * dy <= (LOUPE_RADIUS * 1.15) ** 2;

            if (cardId && insideLoupe) {
              loupeRef.current = { open: false, scale: 1, cx: 0, cy: 0 };
              onCardSelected(cardId);
              selectedIdRef.current = cardId; // MAJ immédiate pour swipe
              dragStartYRef.current = upY; // Initialiser Y pour le swipe suivant
              movedRef.current = false; // Reset moved pour le nouveau gesture
            } else if (!insideLoupe) {
              loupeRef.current = { open: false, scale: 1, cx: 0, cy: 0 };
              if (selectedIdRef.current) onCardSelected(''); // déselection
              selectedIdRef.current = null; // MAJ immédiate
            }
          } else {
            if (cardId) {
              handleCardTap(cardId);
            } else if (selectedIdRef.current) {
              onCardSelected('');
            }
          }
        }

        // === DRAG VERS LE HAUT pour confirmer la pioche ===
        // Check APRÈS le tap pour voir si une carte vient d'être sélectionnée
        // Permet le swipe même après un tap (movedRef.current peut être false)
        // PERMET AUSSI le swipe pour sélectionner une carte après pinch
        const swipeUpThreshold = -30; // 30px vers le haut (très sensible)
        const deltaY = upY - dragStartYRef.current;
        
        // Détecter quelle carte est sous le doigt au moment du up
        const target = document.elementFromPoint(upX, upY) as HTMLElement | null;
        const cardEl = target?.closest('[data-card-id]') as HTMLElement | null;
        const cardIdUnderFinger = cardEl?.getAttribute('data-card-id') ?? null;
        
        // Swipe si :
        // - on a une carte déjà sélectionnée (selectedIdRef.current), OU
        // - on touche une carte (cardIdUnderFinger) après pinch/loupe
        const isSwipeUp = (deltaY < swipeUpThreshold && 
          (selectedIdRef.current !== null || cardIdUnderFinger !== null) && 
          isSingletonFinger);

        if (isSwipeUp) {
          // On confirme la pioche comme un re-tap
          // Priorité à selectedIdRef.current, sinon à cardIdUnderFinger
          const cardIdToSelect = selectedIdRef.current ?? cardIdUnderFinger;
          if (cardIdToSelect) {
            onCardSelected(cardIdToSelect);
            onConfirmingChanged?.(true);
          }
        }

        if (pointers.current.size === 1) {
          const [rId, rP] = Array.from(pointers.current.entries())[0];
          dragPointerId.current = rId;
          downPosRef.current = { x: rP.x, y: rP.y };
          lastDragXRef.current = rP.x;
          lastDragYRef.current = rP.y;
          movedRef.current = false;
        }

        scheduleFrame();
      },
      [scheduleFrame, handleCardTap, onCardSelected, onConfirmingChanged]
    );

    return (
      <div className="relative h-full w-full overflow-hidden bg-transparent text-white select-none">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-0 z-10 touch-none"
          style={{ touchAction: 'none' }}
        >
        {cards.map((card, i) => {
          const id = String(card.id);
          const isSelected = id === selectedId;
          return (
            <div
              key={id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              data-card-id={id}
              className="absolute left-0 top-0 will-change-transform"
              style={{
                width: CARD_W,
                height: CARD_H,
                transformOrigin: 'center center',
                transform: 'translate3d(-9999px, -9999px, 0)',
                visibility: 'hidden',
                borderRadius: 10,
              }}
            >
              <div
                className="relative h-full w-full overflow-hidden rounded-[10px] border"
                style={{
                  borderColor: isSelected
                    ? 'rgba(252, 211, 77, 0.85)'
                    : 'rgba(120, 170, 220, 0.20)',
                  background: (() => {
                    // Dégradé BLEU VIF — cartes bien visibles, opacité du dos réduite
                    const seed = Number(id);
                    // Teinte : autour du bleu profond (210°), variations ±30°
                    const hue = 210 + (seed * 47 % 60) - 30;        // 180..240
                    const sat = 80 + (seed * 13) % 15;             // 80..95 (bien saturé)
                    const baseLight = 38 + ((seed * 31) % 100) / 100 * 16; // 38..54 (lumineux)
                    const shiftHue = (hue + 30) % 360;
                    return `linear-gradient(135deg, hsl(${hue}, ${sat}%, ${baseLight}%) 0%, hsl(${shiftHue}, ${Math.max(60, sat - 10)}%, ${Math.max(28, baseLight - 6)}%) 100%)`;
                  })(),
                  boxShadow: isSelected
                    ? 'inset 0 0 25px rgba(180, 215, 255, 0.55), 0 0 20px rgba(120, 180, 255, 0.65)'
                    : 'inset 0 0 14px rgba(0, 0, 0, 0.35), 0 0 10px rgba(80, 120, 200, 0.20)',
                }}
              >
                <img
                  src="/images/card-back.png"
                  alt="carte face cachée"
                  draggable={false}
                  className="pointer-events-none h-full w-full object-cover"
                  style={{
                    mixBlendMode: 'soft-light',
                    opacity: 0.70,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal confirmation — affichée par le PARENT, pas ici.
          Mais je garde un fallback silencieux : le parent décide via onConfirmingChanged. */}
      {confirming && selectedIndex >= 0 && null}
    </div>
  );
}
