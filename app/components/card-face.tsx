'use client';

import { TarotCard, SUIT_COLORS, MAJOR_ARCANA_SYMBOLS } from '@/lib/tarot-data';

interface CardFaceProps {
  card: TarotCard | undefined;
  reversed: boolean;
}

export default function CardFace({ card, reversed }: CardFaceProps) {
  if (!card) {
    return (
      <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">?</span>
      </div>
    );
  }

  const isMajor = card?.arcana === 'major';
  const suitColors = card?.suit ? SUIT_COLORS[card.suit] : null;
  const symbol = isMajor ? (MAJOR_ARCANA_SYMBOLS[card?.number ?? 0] ?? '✦') : (suitColors?.symbol ?? '✦');

  // Color palette based on arcana type
  const bgGradient = isMajor
    ? 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 30%, #1a0a2e 100%)'
    : `linear-gradient(180deg, ${suitColors?.primary ?? '#2a2a2a'} 0%, ${suitColors?.secondary ?? '#444'} 50%, ${suitColors?.primary ?? '#2a2a2a'} 100%)`;

  const accentColor = isMajor ? '#DAA520' : (suitColors?.accent ?? '#DAA520');

  return (
    <div
      className="w-full h-full rounded-lg overflow-hidden flex flex-col items-center justify-between p-2"
      style={{
        background: bgGradient,
        border: `1px solid ${accentColor}40`,
        transform: reversed ? 'rotate(180deg)' : 'none',
      }}
    >
      {/* Top section - number/name */}
      <div className="w-full text-center">
        <div
          className="text-[9px] font-bold tracking-wider uppercase leading-tight"
          style={{ color: accentColor, fontFamily: 'var(--font-cinzel), serif' }}
        >
          {card?.nameShort ?? ''}
        </div>
      </div>

      {/* Center - main symbol */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        {/* Decorative border */}
        <div
          className="rounded-lg p-3 flex items-center justify-center"
          style={{
            border: `1px solid ${accentColor}50`,
            background: `${accentColor}10`,
          }}
        >
          <span className="text-3xl" role="img" aria-label={card?.name ?? 'carte'}>
            {symbol}
          </span>
        </div>

        {/* Card name */}
        <div
          className="text-[8px] text-center font-semibold leading-tight mt-1 px-1"
          style={{ color: accentColor, fontFamily: 'var(--font-cinzel), serif' }}
        >
          {card?.name ?? 'Inconnue'}
        </div>
      </div>

      {/* Bottom - decorative */}
      <div className="w-full flex justify-center">
        <div
          className="text-[8px] tracking-[0.3em] uppercase"
          style={{ color: `${accentColor}60`, fontFamily: 'var(--font-medieval)' }}
        >
          {isMajor ? 'arcane majeur' : (card?.suit?.toLowerCase?.() ?? '')}
        </div>
      </div>

      {/* Corner decorations */}
      <div
        className="absolute top-1 left-1.5 text-[7px] font-bold"
        style={{ color: `${accentColor}80`, fontFamily: 'var(--font-cinzel), serif' }}
      >
        {card?.nameShort ?? ''}
      </div>
      <div
        className="absolute bottom-1 right-1.5 text-[7px] font-bold rotate-180"
        style={{ color: `${accentColor}80`, fontFamily: 'var(--font-cinzel), serif' }}
      >
        {card?.nameShort ?? ''}
      </div>

      {/* Ornate corner flourishes */}
      <svg className="absolute top-0 left-0 w-5 h-5" viewBox="0 0 20 20" fill="none">
        <path d="M0 0 L15 0 Q10 5, 8 10 Q5 15, 0 15 Z" fill={`${accentColor}15`} />
      </svg>
      <svg className="absolute top-0 right-0 w-5 h-5" viewBox="0 0 20 20" fill="none" style={{ transform: 'scaleX(-1)' }}>
        <path d="M0 0 L15 0 Q10 5, 8 10 Q5 15, 0 15 Z" fill={`${accentColor}15`} />
      </svg>
      <svg className="absolute bottom-0 left-0 w-5 h-5" viewBox="0 0 20 20" fill="none" style={{ transform: 'scaleY(-1)' }}>
        <path d="M0 0 L15 0 Q10 5, 8 10 Q5 15, 0 15 Z" fill={`${accentColor}15`} />
      </svg>
      <svg className="absolute bottom-0 right-0 w-5 h-5" viewBox="0 0 20 20" fill="none" style={{ transform: 'scale(-1)' }}>
        <path d="M0 0 L15 0 Q10 5, 8 10 Q5 15, 0 15 Z" fill={`${accentColor}15`} />
      </svg>
    </div>
  );
}
