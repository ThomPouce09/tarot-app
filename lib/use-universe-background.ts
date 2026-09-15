'use client';

// lib/use-universe-background.ts
// Fond d'univers (hub /yi-jing…) — rotation aléatoire à chaque ouverture,
// restreinte au forfait (Apprenti/Initié/Arkane) ∩ sélection de la modale
// UniverseBgPicker (persistée dans tarot_prefs.backgrounds, partagée avec
// l'accueil). Taper une vignette = aperçu immédiat ; retirer le fond affiché
// = ré-écope dans le nouveau pool.

import { useCallback, useEffect, useRef, useState } from 'react';
import { isVideoBackground, type BackgroundLevel } from '@/lib/backgrounds';

async function levelFromSubscription(email: string): Promise<BackgroundLevel> {
  if (!email) return 'apprenti';
  try {
    const res = await fetch(`/api/subscription?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      const d = await res.json();
      if (d?.level === 'initie' || d?.level === 'arkane') return d.level;
    }
  } catch { /* hors-ligne → pool le plus restrictif */ }
  return 'apprenti';
}

function readSelectedBgs(): string[] | null {
  try {
    const prefs = JSON.parse(localStorage.getItem('tarot_prefs') || 'null');
    if (Array.isArray(prefs?.backgrounds) && prefs.backgrounds.length > 0) return prefs.backgrounds;
  } catch { /* ignore */ }
  return null;
}

export function useUniverseBackground(pools: Record<BackgroundLevel, string[]>) {
  const [background, setBackground] = useState<string>('');
  const [ready, setReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [level, setLevel] = useState<BackgroundLevel>('apprenti');
  const levelRef = useRef<BackgroundLevel>('apprenti');
  const bgRef = useRef<string>('');
  bgRef.current = background;

  const poolFor = useCallback((lvl: BackgroundLevel) => {
    const allowed = pools[lvl] ?? pools.apprenti;
    const valid = (readSelectedBgs() ?? []).filter((p) => allowed.includes(p));
    return valid.length ? valid : allowed;
  }, [pools]);

  const show = useCallback((bg: string) => {
    if (!bg || bg === bgRef.current) return;
    setVideoReady(false); // nouvelle vidéo → masquée jusqu'à canplay (fade-in)
    setBackground(bg);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let lvl: BackgroundLevel = 'apprenti';
      try {
        const email = JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? '';
        lvl = await levelFromSubscription(email);
      } catch { /* pool apprenti */ }
      if (cancelled) return;
      levelRef.current = lvl;
      setLevel(lvl);
      const pool = poolFor(lvl);
      if (!pool.length) return;
      show(pool[Math.floor(Math.random() * pool.length)]);
      setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fermeture de la modale : recharge immédiate. Le fond affiché reste s'il
  // est encore coché ; sinon (ou si `force`), un nouveau tirage du pool.
  const reselect = useCallback((opts?: { force?: boolean }) => {
    const pool = poolFor(levelRef.current);
    if (!pool.length) return;
    if (!opts?.force && pool.includes(bgRef.current)) return;
    const others = pool.filter((p) => p !== bgRef.current);
    const from = others.length ? others : pool;
    show(from[Math.floor(Math.random() * from.length)]);
  }, [poolFor, show]);

  return {
    background, ready, videoReady, setVideoReady, level,
    preview: show,      // tap d'une vignette → aperçu immédiat
    reselect,           // fermeture/retiré → recharge depuis le pool
    isVideo: isVideoBackground(background),
  };
}
