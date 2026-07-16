'use client';

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { TAROT_CARDS } from '@/lib/tarot-data';
import { TarotPicker } from '@/app/components/tarot-picker';
import YiSlideNav from '@/components/yi-slide-nav';
import {
  SLOT_POSITIONS,
  type SlotPos,
} from '@/app/components/tarot-picker';

const TOTAL_PICKS = 5;

type PickedCard = {
  cardId: number;
  name: string;
  position: SlotPos;
};

export default function TarotUpgradePage() {
  const router = useRouter();

  // AUTH GUARD: redirect if not logged in
  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (!stored) {
      router.replace('/auth/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!parsed?.email) {
        router.replace('/auth/login');
        return;
      }
    } catch {
      router.replace('/auth/login');
      return;
    }
  }, [router]);

  const fullDeck = useMemo(
    () => TAROT_CARDS.map((c) => ({ id: c.id, name: c.name })),
    []
  );

  const [phase, setPhase] = useState<'question' | 'picking' | 'confirming' | 'done'>(
    'question'
  );

  const [questionText, setQuestionText] = useState('');
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);

  useEffect(() => {
    if (phase === 'question') {
      const attemptPlay = () => {
        if (videoRef.current) {
          videoRef.current
            .play()
            .then(() => {
              setVideoStarted(true);
            })
            .catch((error) => {
              console.log('Autoplay bloqué : ', error);
            });
        }
      };
      attemptPlay();
      const timer = setTimeout(attemptPlay, 150);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'question' && questionInputRef.current) {
      const timer = setTimeout(() => {
        questionInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleVideoStart = () => {
    if (!videoStarted && videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          setVideoStarted(true);
        })
        .catch((err) => console.log('Focus play failed:', err));
    }
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestionText(e.target.value);
  };

  const [availableDeck, setAvailableDeck] = useState(fullDeck);
  const [picks, setPicks] = useState<PickedCard[]>([]);
  const [pickerSelectedId, setPickerSelectedId] = useState<string | null>(null);

  const handleQuestionSubmit = () => {
    if (!questionText.trim()) return;
    setPhase('picking');
  };

  const handleCardSelected = useCallback((cardId: string) => {
    if (cardId === '') {
      setPickerSelectedId(null);
      return;
    }
    setPickerSelectedId(cardId);
  }, []);

  const handleConfirmingChanged = useCallback(
    (isConfirming: boolean) => {
      if (!isConfirming) return;
      if (!pickerSelectedId) return;
      const idx = availableDeck.findIndex(
        (c) => String(c.id) === pickerSelectedId
      );
      if (idx < 0) return;
      const card = availableDeck[idx];
      const position = SLOT_POSITIONS[picks.length];
      const newPick: PickedCard = {
        cardId: card.id,
        name: card.name,
        position,
      };
      const updatedPicks = [...picks, newPick];
      const updatedDeck = availableDeck.filter(
        (c) => String(c.id) !== pickerSelectedId
      );

      setPicks(updatedPicks);
      setAvailableDeck(updatedDeck);
      setPickerSelectedId(null);

      if (updatedPicks.length >= TOTAL_PICKS) {
        setPhase('done');
      }
    },
    [pickerSelectedId, availableDeck, picks]
  );

  const handleInterpret = () => {
    const cardsForStorage = picks.map((p) => ({
      id: p.cardId,
      name: p.name,
      reversed: false,
    }));
    localStorage.setItem('tarot-5-cards', JSON.stringify(cardsForStorage));
    localStorage.setItem('tarot-5-question', questionText.trim());
    router.push('/tarot-5-c-manuelle/interpretation');
  };

  const renderedSlots = useMemo(() => {
    return [
      { pos: SLOT_POSITIONS[0], pick: picks[0] },
      { pos: SLOT_POSITIONS[1], pick: picks[1] },
      { pos: SLOT_POSITIONS[2], pick: picks[2] },
      { pos: SLOT_POSITIONS[3], pick: picks[3] },
      { pos: SLOT_POSITIONS[4], pick: picks[4] },
    ];
  }, [picks]);

  return (
    <div className="relative h-[100dvh] w-full text-white select-none">
      {/* Background vidéo - seulement pendant la question */}
      {phase === 'question' && (
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <video
            ref={videoRef}
            src="/bg-question.mp4"
            autoPlay
            muted
            playsInline
            loop={false}
            preload="auto"
            poster="/backgrounds/5-cards-bg.jpg"
            className="h-full w-full object-cover"
            onLoadedData={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            }}
          />
        </div>
      )}

      {/* Background image - pendant picking et done */}
      {(phase === 'picking' || phase === 'done') && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/backgrounds/5-cards-bg.jpg)' }}
        />
      )}

      {/* Voile sombre - intensité selon phase */}
      {phase === 'question' && (
        <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
      )}
      {(phase === 'picking' || phase === 'done') && (
        <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(0,0,0,0.15)' }} />
      )}

      {/* Menu parchemin (remplace la croix) */}
      <YiSlideNav />

      {/* ETAPE QUESTION */}
      {phase === 'question' && (
        <div className="absolute inset-0 z-20 flex items-start justify-center px-6 pt-16">
          <div
            className="relative z-20 w-full max-w-lg rounded-3xl border-2 border-amber-400/40 bg-gradient-to-b from-slate-900/95 to-indigo-950/90 p-8 shadow-[0_0_80px_rgba(251,191,36,0.25)] backdrop-blur-sm"
          >
            <h2
              className="mb-4 text-center text-3xl font-bold text-amber-100 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
            >
              <span
                className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent"
              >
                Question au Tarot
              </span>
            </h2>
            <label className="mb-3 block text-lg font-medium text-indigo-200">
              ✨ Posez votre question à la cartomancie
            </label>
            <textarea
              ref={questionInputRef}
              value={questionText}
              onChange={handleQuestionChange}
              onFocus={handleVideoStart}
              rows={3}
              placeholder="🌙 Quel chemin choisir dans ma vie amoureuse ?"
              className="mb-4 w-full resize-none rounded-2xl border-2 border-amber-400/30 bg-slate-900/80 p-5 text-lg text-amber-50 outline-none transition-all duration-300 placeholder:text-indigo-300/60 focus:border-amber-300 focus:shadow-[inset_0_0_30px_rgba(251,191,36,0.2),0_0_30px_rgba(251,191,36,0.3)] focus:bg-slate-900"
            />
            <button
              onClick={handleQuestionSubmit}
              disabled={!questionText.trim()}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 py-4 text-lg font-bold text-slate-900 transition-all duration-300 hover:from-amber-300 hover:via-yellow-200 hover:to-amber-400 hover:shadow-[0_0_40px_rgba(251,191,36,0.5)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              🔮 Commencer le tirage
            </button>
          </div>
        </div>
      )}

      {/* ETAPE PIOCHE */}
      {phase === 'picking' && (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 z-30 flex justify-center px-4 pt-4"
          >
            <div
              className="max-w-md truncate rounded-full border border-amber-400/30 bg-slate-900/90 px-4 py-2 text-base font-medium text-amber-100 backdrop-blur shadow-lg"
            >
              💭 {questionText.length > 50 ? questionText.slice(0, 50) + '…' : questionText}
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4"
          >
            <DividedCross picks={renderedSlots} compact={true} />
          </div>

          <div className="absolute inset-x-0 bottom-4 z-30 h-[92%]">
            <TarotPicker
              cardsToUse={availableDeck}
              selectedId={pickerSelectedId}
              onCardSelected={handleCardSelected}
              onConfirmingChanged={handleConfirmingChanged}
            />
          </div>

          <div
            className="pointer-events-none absolute left-1/2 bottom-4 z-30 -translate-x-1/2"
          >
            <p className="rounded-full border border-amber-300/40 px-3 py-1 text-xs text-amber-200">
              Carte {picks.length + 1} / {TOTAL_PICKS}
            </p>
          </div>
        </>
      )}

      {/* ETAPE DONE - croix + bouton */}
      {phase === 'done' && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4"
          >
            <DividedCross picks={renderedSlots} compact={false} />
          </div>

          <div
            className="absolute inset-x-0 bottom-20 left-1/2 z-30 -translate-x-1/2 flex justify-center px-4"
          >
            <button
              onClick={handleInterpret}
              className="rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-6 py-3 text-base font-bold text-slate-900 shadow-[0_0_40px_rgba(251,191,36,0.6)] hover:from-amber-300 hover:via-yellow-200 hover:to-amber-400 hover:shadow-[0_0_50px_rgba(251,191,36,0.8)] transition-all duration-300 whitespace-nowrap"
            >
              🔮 Interprétation
            </button>
          </div>
        </>
      )}

      {phase === 'picking' && pickerSelectedId && (
        <div className="pointer-events-none absolute left-1/2 bottom-[20%] z-30 -translate-x-1/2">
          <p
            className="rounded-full border border-amber-300/60 bg-amber-300/15 px-3 py-1 text-[11px] uppercase tracking-wider text-amber-200 shadow-lg backdrop-blur"
          >
            Relachez pour piocher
          </p>
        </div>
      )}
    </div>
  );
}

function DividedCross({
  picks,
  compact,
}: {
  picks: { pos: SlotPos; pick?: PickedCard }[];
  compact: boolean;
}) {
  const cardW = compact ? 65 : 78;
  const cardH = compact ? 98 : 118;

  const sommet = picks.find((p) => p.pos === 'sommet');
  const orient = picks.find((p) => p.pos === 'orient');
  const synthese = picks.find((p) => p.pos === 'synthese');
  const occident = picks.find((p) => p.pos === 'occident');
  const base = picks.find((p) => p.pos === 'base');

  return (
    <div className="grid max-w-xs" style={{
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: 'auto auto auto',
      gridTemplateAreas: `
        ".        sommet     .       "
        "orient   synthese   occident"
        ".        base       .       "
      `,
      gap: '8px 12px',
    }}>
      <div style={{ gridArea: 'sommet' }} className="flex justify-center">
        {sommet?.pick ? <FilledSlot pick={sommet.pick} cardW={cardW} cardH={cardH} /> : <EmptySlot cardW={cardW} cardH={cardH} />}
      </div>
      <div style={{ gridArea: 'orient' }} className="flex justify-center">
        {orient?.pick ? <FilledSlot pick={orient.pick} cardW={cardW} cardH={cardH} /> : <EmptySlot cardW={cardW} cardH={cardH} />}
      </div>
      <div style={{ gridArea: 'synthese' }} className="flex justify-center">
        {synthese?.pick ? <FilledSlot pick={synthese.pick} cardW={cardW} cardH={cardH} /> : <EmptySlot cardW={cardW} cardH={cardH} />}
      </div>
      <div style={{ gridArea: 'occident' }} className="flex justify-center">
        {occident?.pick ? <FilledSlot pick={occident.pick} cardW={cardW} cardH={cardH} /> : <EmptySlot cardW={cardW} cardH={cardH} />}
      </div>
      <div style={{ gridArea: 'base' }} className="flex justify-center">
        {base?.pick ? <FilledSlot pick={base.pick} cardW={cardW} cardH={cardH} /> : <EmptySlot cardW={cardW} cardH={cardH} />}
      </div>
    </div>
  );
}

function EmptySlot({ cardW, cardH }: { cardW: number; cardH: number }) {
  return (
    <div
      className="rounded-lg border-2 border-dashed border-indigo-500/40 bg-slate-900/40 flex items-center justify-center"
      style={{ width: cardW, height: cardH }}
    >
      <span className="text-xs text-indigo-300/40">·</span>
    </div>
  );
}

function FilledSlot({
  pick,
  cardW,
  cardH,
}: {
  pick: PickedCard;
  cardW: number;
  cardH: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative overflow-hidden rounded-lg border border-amber-400/50 shadow-[0_0_15px_rgba(218,165,32,0.3)]"
        style={{
          width: cardW,
          height: cardH,
          background: '#000',
        }}
      >
        <Image
          src={`/cards/arcana/${pick.cardId}.png`}
          alt={pick.name}
          fill
          style={{ objectFit: 'contain' }}
        />
      </div>
      <p className="mt-1 max-w-[90px] truncate text-[11px] text-amber-200 font-medium">
        {pick.name}
      </p>
    </div>
  );
}