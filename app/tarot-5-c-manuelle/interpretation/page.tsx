'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Tarot5CManuelleInterpretationPage() {
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
      router.replace('/');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'tarot-5-c-manuelle');
    params.append('cartes', cardIds.join(','));
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    router.push(`/interpret/tarot-5-c-manuelle?${params.toString()}`);
  }, []);

  return null;
}