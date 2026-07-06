'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Tarot5CartesInterpretationPage() {
  const router = useRouter();

  useEffect(() => {
    const storedCards = localStorage.getItem('tarot-5-cards');
    const storedQuestion = localStorage.getItem('tarot-5-question');
    let userId = undefined;
    try {
      const storedUser = localStorage.getItem('tarot_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user.email;
      }
    } catch {}

    if (!storedCards) {
      router.replace('/');
      return;
    }

    // Extract just the card IDs from the stored JSON objects
    let cardIds: number[] = [];
    try {
      const parsed = JSON.parse(storedCards);
      if (Array.isArray(parsed)) {
        cardIds = parsed.map((c: any) => typeof c === 'number' ? c : c.id).filter((id: any) => typeof id === 'number');
      } else {
        router.replace('/');
        return;
      }
    } catch {
      // Fallback: treat as comma-separated IDs
      cardIds = storedCards.split(',').map(Number).filter((n) => !isNaN(n));
    }

    if (cardIds.length === 0) {
      router.replace('/');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'tarot-5-cartes');
    params.append('cartes', cardIds.join(','));
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    router.push(`/interpret/tarot-5-cartes?${params.toString()}`);
  }, []);

  return null;
}