'use client';

// components/draw-back-guard.tsx
// Écoute globale du popstate pour la sentinelle de retour des tirages
// (lib/draw-back-guard). Quand le bouton retour du smartphone dépile une
// entrée sentinelle { drawGuard: univers }, on remplace immédiatement par
// l'univers parent : la page de tirage / le pont / le résultat ne sont jamais
// remontés → aucune relance d'animation vidéo ni de POST consommant.
// Sans drawGuard (retour normal ailleurs dans l'app) : on ne fait rien.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DrawBackGuard() {
  const router = useRouter();

  useEffect(() => {
    const onPop = () => {
      try {
        const st = (history.state || {}) as { drawGuard?: string };
        if (st.drawGuard) router.replace(st.drawGuard);
      } catch {
        /* historique inaccessible : comportement par défaut */
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [router]);

  return null;
}
