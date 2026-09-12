'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function YiJingSimplifieInterpretationPage() {
  const router = useRouter();

  useEffect(() => {
    const storedBaguette = localStorage.getItem('yi-jing-simple-baguette');
    const storedQuestion = localStorage.getItem('yi-jing-simple-question');
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
    params.append('type', 'yi-jing-simplifie');
    params.append('baguette', storedBaguette);
    if (storedQuestion) params.append('question', storedQuestion);
    if (userId) params.append('userId', userId);

    router.push(`/interpret/yi-jing-simplifie?${params.toString()}`);
  }, []);

  return null;
}
