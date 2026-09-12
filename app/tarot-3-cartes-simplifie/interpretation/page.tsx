'use client';

// Passerelle « 3 Cartes Simplifié » → interprétation, sur le modèle exact de
// /yi-jing-simplifie/interpretation. Les ids des cartes sont lus depuis
// localStorage (`tarot-3-cartes-simplifie-cards`, posés par TarotApp), la
// question « Arcane — intention » depuis `tarot-3-simplifie-question` — ainsi
// la page d'interprétation reçoit l'intention et peut la ré-afficher en
// bandeau + l'injecter dans le prompt de l'oracle.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LS_KEY = 'tarot-3-cartes-simplifie-cards';

export default function TarotSimplifieInterpretationPage() {
  const router = useRouter();

  useEffect(() => {
    let ids: number[] = [];
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) ids = JSON.parse(stored);
    } catch {}
    const storedQuestion = localStorage.getItem('tarot-3-simplifie-question');
    let userId: string | undefined;
    try {
      const storedUser = localStorage.getItem('tarot_user');
      if (storedUser) userId = JSON.parse(storedUser).email;
    } catch {}

    if (!Array.isArray(ids) || ids.length !== 3) {
      // Aucune carte mémorisée → retour à l'intention.
      router.replace('/tarot-3-cartes-simplifie');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'tarot-3-cartes-simplifie');
    params.append('cartes', ids.join(','));
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    router.push(`/interpret/tarot-3-cartes-simplifie?${params.toString()}`);
  }, [router]);

  return null;
}
