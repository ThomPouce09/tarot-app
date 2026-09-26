'use client';

// components/analysis-wait-video.tsx
//
// Vidéo d'attente aléatoire pour l'analyse approfondie IA.
// Choisit une vidéo parmi /images/<prefix>1.mp4 … <prefix>9.mp4 en tenant
// compte des fichiers RÉELLEMENT présents (sonde HEAD mémoïsée par
// lib/preload-wait-videos). Si la page a préchauffé la liste (pages dés),
// la première image est affichée immédiatement — plus d'écran noir le temps
// de tester les fichiers manquants. onError reste le filet (rotation).
//
// Usage (les pages /des-divinatoires) :
//   <AnalysisWaitVideo />
//   <AnalysisWaitVideo prefix="analyse-des-zodiaque" />
//   <AnalysisWaitVideo className="…"/>  // surcharge de la classe vidéo

import { useEffect, useRef, useState } from 'react';
import { warmWaitVideos, peekWaitVideo } from '@/lib/preload-wait-videos';

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
  // La page a pu préchauffer une vidéo déjà téléchargée → l'utiliser
  // directement (première frame affichée sans attente).
  const [src, setSrc] = useState<string>(() => peekWaitVideo(prefix) ?? '');
  const attemptsRef = useRef(0);

  // Sans préchauffage : choisir une vidéo EXISTANTE au hasard (liste sonde
  // mémoïsée ; quasi-instantanée si la page l'a déjà sondée).
  useEffect(() => {
    if (src || attemptsRef.current > 0) return;
    let live = true;
    warmWaitVideos(prefix).then((avail) => {
      if (!live || attemptsRef.current > 0) return;
      const n = avail.length
        ? avail[Math.floor(Math.random() * avail.length)]
        : 1 + Math.floor(Math.random() * MAX_VIDEO_INDEX);
      setSrc(`/images/${prefix}${n}.mp4`);
    });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  const handleError = () => {
    // Vidéo absente malgré la sonde (dépôt récent retiré ?) → essayer la
    // suivante (cycle 1..9), sans boucle infinie.
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
      poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='black'/%3E%3C/svg%3E"
      className={className}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      onError={handleError}
    />
  );
}
