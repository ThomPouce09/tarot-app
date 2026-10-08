'use client';

// ── PushRouter : exécute le deep link d'une notification push ────────────
// - Warm start : lib/push.ts émet l'événement window 'push-navigate' au tap.
// - Cold start : le tap peut être traité avant notre montage → la route est
//   stockée dans localStorage 'tarot_pending_route' et consommée ici.
// Le layout racine se monte AVANT la redirection middleware/auth (atterrissage
// /dashboard éventuel) : on consomme après un court délai, une seule fois,
// quand l'URL est stabilisée — sinon router.replace perd la course et le
// pending est ré-émis à chaque rendu (boucle infinie).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PushRouter() {
  const router = useRouter();

  // Effet monté une seule fois (layout racine) ; router est stable.
  useEffect(() => {
    const consume = (url: string | null) => {
      if (!url || !url.startsWith('/')) return;
      try { localStorage.removeItem('tarot_pending_route'); } catch {}
      if ((window as any).__pushConsumeTimer) clearTimeout((window as any).__pushConsumeTimer);
      (window as any).__pushConsumeTimer = setTimeout(() => {
        (window as any).__pushConsumeTimer = null;
        const here = window.location.pathname;
        if (url === here || url.startsWith(here + '?')) return; // déjà arrivé
        router.replace(url);
      }, 1200);
    };
    const onNav = (ev: Event) => consume((ev as CustomEvent).detail as string | null);
    window.addEventListener('push-navigate', onNav);
    // Cold start : route en attente posée par le tap avant notre montage.
    try { consume(localStorage.getItem('tarot_pending_route')); } catch {}
    return () => {
      window.removeEventListener('push-navigate', onNav);
      if ((window as any).__pushConsumeTimer) {
        clearTimeout((window as any).__pushConsumeTimer);
        (window as any).__pushConsumeTimer = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
