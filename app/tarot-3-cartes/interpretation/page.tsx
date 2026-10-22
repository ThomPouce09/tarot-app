'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { armDrawBackGuard } from '@/lib/draw-back-guard';

export default function Tarot3CartesInterpretationPage() {
  const router = useRouter();
  // One-shot par montage : avec la purge ci-dessous, une seconde exécution
  // (StrictMode) lirait null et éjecterait vers /tarot AVANT le push — le
  // résultat ne s'afficherait jamais. Les refs survivent au double effet.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const storedCards = localStorage.getItem('tarot-3-cards');
    const storedQuestion = localStorage.getItem('tarot-3-question');
    // Purge sitôt lue : un remontage de ce pont (bouton retour smartphone) ne
    // doit PLUS pouvoir re-pousser le tirage vers /interpret — sinon le POST de
    // consultation repart et le tirage compté est débité une 2e fois.
    try { localStorage.removeItem('tarot-3-cards'); localStorage.removeItem('tarot-3-question'); } catch {}
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

    const params = new URLSearchParams();
    params.append('type', 'tarot-3-cartes');
    params.append('cartes', storedCards);
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    // Sentinelle de retour (lib/draw-back-guard) : empilée AVANT le push, la
    // pile devient [cartes][sentinelle][résultat]. Le bouton retour du
    // smartphone tombe sur la sentinelle → DrawBackGuard renvoie directement
    // à /tarot au lieu de remonter le pont (qui re-pousserait le tirage).
    armDrawBackGuard('/tarot');
    router.push(`/interpret/tarot-3-cartes?${params.toString()}`);
  }, []);

  return null;
}