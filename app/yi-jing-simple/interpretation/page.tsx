'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { armDrawBackGuard } from '@/lib/draw-back-guard';

export default function YiJingSimpleInterpretationPage() {
  const router = useRouter();
  // One-shot par montage : la purge sitôt-lue + StrictMode ferait lire null à
  // la seconde exécution → éjection prématurée vers /yi-jing sans push.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const storedBaguette = localStorage.getItem('yi-jing-simple-baguette');
    const storedQuestion = localStorage.getItem('yi-jing-simple-question');
    // Purge sitôt lue : un remontage de ce pont (bouton retour smartphone) ne
    // doit PLUS pouvoir re-pousser le tirage vers /interpret — sinon le POST de
    // consultation repart et le tirage compté est débité une 2e fois.
    try { localStorage.removeItem('yi-jing-simple-baguette'); localStorage.removeItem('yi-jing-simple-question'); } catch {}
    let userId = undefined;
    try {
      const storedUser = localStorage.getItem('tarot_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user.email;
      }
    } catch {}

    if (!storedBaguette) {
      // Aucune baguette mémorisée (pont remonté par retour, ou entrée directe) :
      // retour à l'univers Yi Jing — jamais l'accueil.
      router.replace('/yi-jing');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'yi-jing-simple');
    params.append('baguette', storedBaguette);
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    // Sentinelle de retour (lib/draw-back-guard) : empilée AVANT le push, la
    // pile devient [baguette][sentinelle][résultat]. Le bouton retour du
    // smartphone tombe sur la sentinelle → DrawBackGuard renvoie directement
    // à /yi-jing au lieu de remonter le pont (qui re-pousserait le tirage).
    armDrawBackGuard('/yi-jing');
    router.push(`/interpret/yi-jing-simple?${params.toString()}`);
  }, []);

  return null;
}