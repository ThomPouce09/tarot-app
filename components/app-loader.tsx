'use client';

// components/app-loader.tsx — Voile « Chargement … / Loading... » au démarrage.
// Couvre toute l'app (fond noir mystique + étoile dorée pulsante) tant que la
// landing n'est pas TOTALEMENT prête (fond résolu ET première image de la
// vidéo décodée). Puis fondu de sortie → enchaîne naturellement soit sur le
// tutoriel (nouvel utilisateur : gate langue puis « hall des Etoiles »), soit
// sur la landing seule (utilisateur habituel).
// Garde-fous : durée min ~0,9 s (pas de flash laid sur cache chaud) et repli
// auto à 9 s si la vidéo du fond traîne (connexion lente → ne jamais bloquer).

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';

export default function AppLoader({ ready }: { ready: boolean }) {
  const t = useT();
  const [minDone, setMinDone] = useState(false); // fondu pas trop bref
  const [force, setForce] = useState(false); // repli sécurité (vidéo lente)
  const [gone, setGone] = useState(false); // démonté après le fondu

  useEffect(() => {
    const t0 = setTimeout(() => setMinDone(true), 900);
    const t1 = setTimeout(() => setForce(true), 9000);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, []);

  const done = (ready && minDone) || force;

  useEffect(() => {
    if (!done) return;
    const t0 = setTimeout(() => {
      setGone(true);
      // Signe « page entièrement chargée et visible » : les effets d entrée
      // (ex. apparition du barman) s y synchronisent au lieu de se jouer
      // derrière le voile au 1er chargement.
      window.dispatchEvent(new Event('app-loaded'));
    }, 800); // durée du fondu CSS
    return () => clearTimeout(t0);
  }, [done]);

  if (gone) return null;

  return (
    <div className={`app-loader${done ? ' app-loader-out' : ''}`} role="status" aria-live="polite">
      <div className="app-loader-inner">
        {/* Étoile à huit branches, or mystique — rotation lente + pulsation */}
        <svg className="app-loader-star" width="64" height="64" viewBox="0 0 64 64" aria-hidden>
          <defs>
            <radialGradient id="loaderGold" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F0C75E" />
              <stop offset="60%" stopColor="#DAA520" />
              <stop offset="100%" stopColor="#8a6a1d" />
            </radialGradient>
          </defs>
          <g fill="url(#loaderGold)">
            <path d="M32 2 L36 26 L60 32 L36 38 L32 62 L28 38 L4 32 L28 26 Z" />
            <path d="M32 10 L34.8 29.2 L54 32 L34.8 34.8 L32 54 L29.2 34.8 L10 32 L29.2 29.2 Z" opacity="0.55" transform="rotate(45 32 32)" />
          </g>
        </svg>
        <p className="app-loader-text">{t('loader.text')}</p>
        {/* Trois grains qui tournent — clin d'œil aux trois cartes du tirage */}
        <div className="app-loader-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
