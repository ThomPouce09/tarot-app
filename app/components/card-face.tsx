'use client';

import { TarotCard, SUIT_COLORS, MAJOR_ARCANA_SYMBOLS } from '@/lib/tarot-data';
import Image from 'next/image';
import { useState } from 'react';

interface CardFaceProps {
  card: TarotCard | undefined;
  reversed: boolean;
}

export default function CardFace({ card, reversed }: CardFaceProps) {
  const [imageError, setImageError] = useState(false);

  if (!card) {
    return (
      <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">?</span>
      </div>
    );
  }

  // Construire l'URL de l'image de la carte - utilise les JPEG optimisés 400px (0-77)
  const cardImageUrl = `/cards/arcana/${card.id}.jpg`;

  const isMajor = card?.arcana === 'major';
  const suitColors = card?.suit ? SUIT_COLORS[card.suit] : null;
  const symbol = isMajor ? (MAJOR_ARCANA_SYMBOLS[card?.number ?? 0] ?? '✦') : (suitColors?.symbol ?? '✦');

  // Color palette based on arcana type
  const bgGradient = isMajor
    ? 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 30%, #1a0a2e 100%)'
    : `linear-gradient(180deg, ${suitColors?.primary ?? '#2a2a2a'} 0%, ${suitColors?.secondary ?? '#444'} 50%, ${suitColors?.primary ?? '#2a2a2a'} 100%)`;

  const accentColor = isMajor ? '#DAA520' : (suitColors?.accent ?? '#DAA520');

  // Si l'image a échoué, on utilise le rendu dynamique
  const useFallback = imageError;

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative">
      {useFallback ? (
        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
          <span className="text-gray-500 text-2xl">🎴</span>
        </div>
      ) : (
        <Image
          src={cardImageUrl}
          alt={card?.name ?? 'Carte de tarot'}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 132px, (max-width: 768px) 206px, 206px"
          priority={card?.id === 0 || card?.id === 1}
          onError={() => setImageError(true)}
        />
      )}
    </div>
  );
}