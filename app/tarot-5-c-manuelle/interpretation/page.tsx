'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { armDrawBackGuard } from '@/lib/draw-back-guard';

export default function Tarot5CManuelleInterpretationPage() {
  const router = useRouter();
  // One-shot par montage : la purge sitôt-lue + StrictMode ferait lire null à
  // la seconde exécution → éjection prématurée vers /tarot sans push.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const storedCards = localStorage.getItem('tarot-5-cards');
    const storedQuestion = localStorage.getItem('tarot-5-question');
    // Purge sitôt lue : un remontage de ce pont (bouton retour smartphone) ne
    // doit PLUS pouvoir re-pousser le tirage vers /interpret — sinon le POST de
    // consultation repart et le tirage compté est débité une 2e fois.
    try { localStorage.removeItem('tarot-5-cards'); localStorage.removeItem('tarot-5-question'); } catch {}
    let userId = undefined;
    try {
      const storedUser = localStorage.getItem('tarot_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user.email;
      }
    } catch {}

    if (!storedCards) {
      // Aucune carte mémorisée (pont remonté par retour, ou entrée directe) :
      // retour à l'univers Tarot — jamais l'accueil.
      router.replace('/tarot');
      return;
    }

    // Extract card IDs from stored JSON objects or fallback to comma-separated
    let cardIds: number[] = [];
    try {
      const parsed = JSON.parse(storedCards);
      if (Array.isArray(parsed)) {
        cardIds = parsed.map((c: any) => typeof c === 'number' ? c : c.id).filter((id: any) => typeof id === 'number');
      }
    } catch {
      cardIds = storedCards.split(',').map(Number).filter((n) => !isNaN(n));
    }

    if (cardIds.length === 0 || cardIds.length !== 5) {
      router.replace('/tarot');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'tarot-5-c-manuelle');
    params.append('cartes', cardIds.join(','));
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    // Sentinelle de retour (lib/draw-back-guard) : empilée AVANT le push, la
    // pile devient [cartes][sentinelle][résultat]. Le bouton retour du
    // smartphone tombe sur la sentinelle → DrawBackGuard renvoie directement
    // à /tarot au lieu de remonter le pont (qui re-pousserait le tirage).
    armDrawBackGuard('/tarot');
    router.push(`/interpret/tarot-5-c-manuelle?${params.toString()}`);
  }, []);

  return null;
}