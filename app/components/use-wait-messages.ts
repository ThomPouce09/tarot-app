'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

const FALLBACK: Record<string, string[]> = {
  'serene-divination': ['Etude du tirage en cours...', 'L\'oracle s\'apaise avec vous...', 'La réponse mûrit en silence...'],
  'crystal-ball-divination': ['La boule de cristal s\'embue...', 'Des formes tournoient dans le verre...', 'L\'oracle scrute les brumes...', 'Chargement de l\'interprétation...'],
  'magical-divination': ['Les étoiles s\'alignent...', 'L\'oracle invoque votre sort...', 'La magie opère...'],
};

export function useWaitMessages(type: string) {
  const [messages, setMessages] = useState<string[]>(FALLBACK[type] || ['Chargement...']);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    api(`/api/interpretation-wait?type=${encodeURIComponent(type)}`)
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d.messages) && d.messages.length) setMessages(d.messages); })
      .catch(() => {});
    return () => { alive = false; };
  }, [type]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), 5000);
    return () => clearInterval(t);
  }, [messages]);

  return messages[idx] || messages[0];
}
