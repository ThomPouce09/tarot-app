'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Tarot3CartesInterpretationPage() {
  const router = useRouter();

  useEffect(() => {
    const storedCards = localStorage.getItem('tarot-3-cards');
    const storedQuestion = localStorage.getItem('tarot-3-question');
    let userId = undefined;
    try {
      const storedUser = localStorage.getItem('tarot_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user.email;
      }
    } catch {}

    if (!storedCards) {
      // No cards, redirect to home
      router.replace('/');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'tarot-3-cartes');
    params.append('cartes', storedCards);
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    router.push(`/interpret/tarot-3-cartes?${params.toString()}`);
  }, []);

  return null;
}