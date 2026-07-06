'use client';

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TAROT_CARDS } from '@/lib/tarot-data';

/* === Geometry === */
const TOTAL_ARC_DEG = 260;
const CARD_W = 70;
const CARD_H = 112;
const SELECTED_SCALE = 2.0;
const SELECTED_RADIAL_POP = 0.12;
const TAP_MOVE_THRESHOLD = 8;
const MAX_ROTATION_DEG = TOTAL_ARC_DEG / 2;

const EASE = 'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1), opacity 220ms ease-out';

interface TarotPickerProps {
  filled: number;
  total: number;
  onPick: (cardId: number) => void;
  activePosition: number;
  busy?: boolean;
}

export default function TarotPicker(props: TarotPickerProps) {
  const cards = TAROT_CARDS;
  const N = cards.length;
  const { total, onPick, activePosition, busy } = props;

  /* === Layout : arc des 78 cartes */
  const layout = useMemo(() => {
    const step = N > 1 ? TOTAL_ARC_DEG / (N - 1) : 0;
    const start = -TOTAL_ARC_DEG / 2;
    return cards.map((_, i) => ({ baseAngle: start + i * step }));
  }, [cards, N]);

  /* === Refs === */
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  const selectedCardIdRef = useRef<number | null>(null);
  const [selectedCardId, setSelectedCardIdState] = useState<number | null>(null);

  const downRef = useRef<{
    x: number;
    y: number;
    rot: number;
    cardId: number;
    moved: boolean;
  } | null>(null);

  const pointers = useRef(
    new Map<number, { x: number; y: number; sizeAtDown: number }>()
  );

  const rad = (deg: number) => (deg * Math.PI) / 180;

  const computeLayout = useCallback(
    (idx: number, isSel: boolean) => {
      const base = layout[idx].baseAngle;
      const totalRot = base + rotation;
      const r = rad(totalRot);
      const x = Math.sin(r) * 100;
      const y = -Math.cos(r) * 100;
      const lift = isSel ? SELECTED_RADIAL_POP * 80 : 0;
      const popX = Math.sin(r) * lift;
      const popY = -Math.cos(r) * lift;
      return {
        left: `calc(50% + ${(x + popX) * 1}px - ${CARD_W / 2}px)`,
        top: `calc(50% + ${(y + popY) * 1}px - ${CARD_H / 2}px)`,
        transform: `rotate(${totalRot}deg)`,
      };
    },
    [layout, rotation]
  );

  /* === Pointer handlers (unifie souris + touch) */
  const onPointerDown = (e: React.PointerEvent, cardId: number) => {
    const target = e.currentTarget;
    target.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      sizeAtDown: pointers.current.size,
    });
    downRef.current = {
      x: e.clientX,
      y: e.clientY,
      rot: rotationRef.current,
      cardId,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const pi = pointers.current.get(e.pointerId)!;
    pi.x = e.clientX;
    pi.y = e.clientY;
    pointers.current.set(e.pointerId, pi);

    if (pointers.current.size >= 2) {
      downRef.current = null;
      return;
    }

    if (!downRef.current || downRef.current.moved) return;
    const dx = e.clientX - downRef.current.x;
    if (Math.abs(dx) > TAP_MOVE_THRESHOLD) {
      downRef.current.moved = true;
    }
    const newRot = downRef.current.rot + dx * 0.4;
    rotationRef.current = newRot;
    setRotation(newRot);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const was = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (pointers.current.size === 0 && downRef.current && !downRef.current.moved) {
      const cardId = downRef.current.cardId;
      handleTap(cardId);
    }
    downRef.current = null;
  };

  const handleTap = useCallback(
    (cardId: number) => {
      if (selectedCardIdRef.current === cardId) {
        onPick(cardId);
        selectedCardIdRef.current = null;
        setSelectedCardIdState(null);
      } else {
        selectedCardIdRef.current = cardId;
        setSelectedCardIdState(cardId);
      }
    },
    [onPick]
  );

  return (
    <div
      className="relative w-full h-full touch-none overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* label haut */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        <p
          className="text-xs sm:text-sm italic"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: 'rgba(255,215,0,0.7)',
            textShadow: '0 0 8px rgba(255,215,0,0.3)',
            letterSpacing: '0.05em',
          }}
        >
          Carte {activePosition + 1} / {total} · Sélectionnez puis re-tap pour piocher
        </p>
      </div>

      {/* Stage cartes */}
      <div className="absolute inset-0 flex items-center justify-center">
        {cards.map((card, i) => {
          const isSel = selectedCardId === card.id && selectedCardId !== null;
          const styles = computeLayout(i, isSel);
          return (
            <button
              key={card.id}
              onPointerDown={(e) => onPointerDown(e, card.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              disabled={busy}
              className="absolute cursor-pointer"
              style={{
                width: `${CARD_W}px`,
                height: `${CARD_H}px`,
                left: styles.left,
                top: styles.top,
                transform: styles.transform,
                transformOrigin: 'center center',
                transition: EASE,
                background: 'transparent',
                border: 'none',
                padding: 0,
                zIndex: isSel ? 100 : i,
                outline: 'none',
              }}
            >
              <div
                className="w-full h-full rounded-md overflow-hidden"
                style={{
                  background: 'transparent',
                  border: isSel
                    ? '2px solid rgba(255,215,0,0.95)'
                    : '1px solid rgba(218,165,32,0.35)',
                  boxShadow: isSel
                    ? '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(218,165,32,0.5), 0 6px 20px rgba(0,0,0,0.6)'
                    : '0 4px 12px rgba(0,0,0,0.6)',
                  transition: 'all 0.25s ease',
                  transform: isSel ? `scale(${SELECTED_SCALE})` : undefined,
                }}
              >
                <img
                  src="/images/card-back.png"
                  alt="carte face cachée"
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Halo central */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[130px] pointer-events-none rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(180,200,255,0.07) 0%, transparent 60%)' }}
      />
    </div>
  );
}
