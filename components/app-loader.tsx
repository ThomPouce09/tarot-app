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
      {/* Nuit profonde : deux étages d'étoiles discrètes qui pulsent et dérivent lentement */}
      <div className="app-loader-stars" aria-hidden />
      <div className="app-loader-stars2" aria-hidden />
      <div className="app-loader-inner">
        {/* Logo de la marque — pulsation douce (l'anneau doré suffit, pas de rotation) */}
        <img src="/logo-espace.png" alt="" className="app-loader-logo" width="300" height="212" />
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
