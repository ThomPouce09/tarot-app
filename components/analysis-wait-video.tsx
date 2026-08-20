'use client';

// components/analysis-wait-video.tsx
//
// Vidéo d'attente aléatoire pour l'analyse approfondie IA.
// Au montage, choisit une vidéo parmi /images/<prefix>1.mp4 … <prefix>9.mp4.
// Les fichiers absents sont automatiquement ignorés (fallback à la vidéo
// suivante via onError) — il suffit de déposer une nouvelle vidéo dans
// public/images/ pour qu'elle entre dans la rotation, sans toucher au code.
//
// Préfixes utilisés :
//   - analyse-longue      : analyse approfondie (défaut, 3 sous-pages dés)
//   - analyse-des-zodiaque: dés du zodiaque (interprétations IA)
//
// Usage (les 3 sous-pages /des-divinatoires) :
//   <AnalysisWaitVideo />
//   <AnalysisWaitVideo prefix="analyse-des-zodiaque" />
//   <AnalysisWaitVideo className="…" />  // surcharge de la classe vidéo

import { useEffect, useRef, useState } from 'react';

const MAX_VIDEO_INDEX = 9;

export default function AnalysisWaitVideo({
  // Taille NATIVE (w-auto h-auto) : la vidéo garde ses proportions, contrainte
  // à 70vh max pour ne jamais déborder l'écran. Le conteneur (w-fit) épouse
  // exactement la vidéo → image visible EN ENTIER, quel que soit son ratio.
  className = 'pointer-events-none relative block h-auto max-h-[70vh] w-auto max-w-full object-contain',
  prefix = 'analyse-longue',
}: {
  className?: string;
  /** Préfixe du nom de fichier (sans numéro, ex. "analyse-des-zodiaque"). */
  prefix?: string;
}) {
  const [src, setSrc] = useState<string>('');
  const attemptsRef = useRef(0);

  // Choisir un index de départ aléatoire au montage (1..9)
  useEffect(() => {
    const start = 1 + Math.floor(Math.random() * MAX_VIDEO_INDEX);
    setSrc(`/images/${prefix}${start}.mp4`);
  }, [prefix]);

  const handleError = () => {
    // Vidéo absente → essayer la suivante (cycle 1..9), sans boucle infinie
    attemptsRef.current += 1;
    if (attemptsRef.current > MAX_VIDEO_INDEX) {
      setSrc(''); // aucune vidéo disponible → rien à afficher
      return;
    }
    setSrc((prev) => {
      const m = prev.match(new RegExp(`(\\d)\\.mp4$`));
      const cur = m ? parseInt(m[1], 10) : 1;
      const next = (cur % MAX_VIDEO_INDEX) + 1;
      return `/images/${prefix}${next}.mp4`;
    });
  };

  if (!src) return null;

  return (
    <video
      src={src}
      className={className}
      autoPlay
      muted
      loop
      playsInline
      aria-hidden
      onError={handleError}
    />
  );
}
