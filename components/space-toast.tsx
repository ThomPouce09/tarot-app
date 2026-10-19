'use client';

// components/space-toast.tsx — alerte courte, discrète, non bloquante (usage :
// Préférences & player musique). Rendre {toast} dans le JSX, appeler show(msg).
import { useCallback, useRef, useState } from 'react';

export function useSpaceToast() {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2400);
  }, []);
  const toast = msg ? (
    <div role="status" className="fixed left-1/2 z-[140] max-w-[92vw] -translate-x-1/2 rounded-full px-4 py-1.5 text-[12px] font-semibold leading-snug text-center backdrop-blur-sm"
      style={{
        bottom: '96px',
        background: 'rgba(20,10,28,0.94)',
        border: '1px solid rgba(139,92,246,0.55)',
        color: '#E9D5FF',
        boxShadow: '0 6px 24px rgba(0,0,0,0.6), 0 0 14px rgba(139,92,246,0.28)',
        fontFamily: 'var(--font-cinzel), serif',
      }}>
      {msg}
    </div>
  ) : null;
  return { show, toast };
}
