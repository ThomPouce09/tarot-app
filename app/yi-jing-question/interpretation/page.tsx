'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function YiJingQuestionInterpretationPage() {
  const router = useRouter();

  useEffect(() => {
    const storedBaguette = localStorage.getItem('yi-jing-question-baguette');
    const storedQuestion = localStorage.getItem('yi-jing-question-question');
    let userId = undefined;
    try {
      const storedUser = localStorage.getItem('tarot_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userId = user.email;
      }
    } catch {}

    if (!storedBaguette) {
      // No baguette, redirect to home
      router.replace('/');
      return;
    }

    const params = new URLSearchParams();
    params.append('type', 'yi-jing-question');
    params.append('baguette', storedBaguette);
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    router.push(`/interpret/yi-jing-question?${params.toString()}`);
  }, []);

  return null;
}