'use client';

// lib/hub-back.ts — Retour à la page d'avant (hub) au tap hors-modale.
// Usage dans une modale de départ de tirage : onClick du voile = exitToHub().
// history.back() si on vient de quelque part (cas normal : hub → page),
// sinon remplacement direct vers le hub (deep-link / ouverture fraîche).

import { useRouter } from 'next/navigation';

export function useExitToHub(hub: string) {
  const router = useRouter();
  return () => {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) router.back();
      else router.replace(hub);
    } catch {
      router.replace(hub);
    }
  };
}
