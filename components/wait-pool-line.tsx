'use client';

// ── WaitPoolLine : une ligne tournante du corpus d'attente ───────────────
// Affiche les messages d'attente d'un univers (lib/wait-messages) sous une
// animation IA, en rotation douce toutes les 5 s (fondu), ordre mélangé à
// chaque montage. Utilisé par les pages /des-divinatoires (vidéo d'attente
// sans API) ; WaitOverlay, lui, reçoit le pool via /api/interpretation-wait.
//
// Usage :
//   <WaitPoolLine universe="des" className="…" style={{ color: gold }} />

import { useEffect, useMemo, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { waitMessages, type WaitUniverse } from '@/lib/wait-messages';

const ROTATE_MS = 5000;
const FADE_MS = 400;

export default function WaitPoolLine({
  universe,
  className,
  style,
}: {
  universe: WaitUniverse;
  className?: string;
  style?: React.CSSProperties;
}) {
  const lang = useLang();
  // Pool mélangé, recalculé si la langue change (montage suivant sinon).
  const pool = useMemo(() => waitMessages(universe, lang), [universe, lang]);
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    setIdx(0);
    setShown(true);
    const t = setInterval(() => {
      setShown(false); // fondu sortant
      setTimeout(() => {
        setIdx((i) => (i + 1) % pool.length);
        setShown(true); // fondu entrant
      }, FADE_MS);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [pool]);

  if (!pool.length) return null;
  return (
    <p
      className={className}
      style={{ ...style, transition: `opacity ${FADE_MS}ms ease` , opacity: shown ? 1 : 0 }}
    >
      {pool[idx]}
    </p>
  );
}
