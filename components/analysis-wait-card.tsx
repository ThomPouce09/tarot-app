'use client';

// components/analysis-wait-card.tsx
//
// Encart d'attente pour l'analyse approfondie IA (3 sous-pages /des-divinatoires).
//
// - S'adapte à la vidéo : conteneur w-fit → épouse exactement la taille native
//   de la vidéo (hauteur ET largeur), vidéo visible en entier.
// - Se centre à l'écran au montage : scrollIntoView block:center → dès qu'on
//   appuie sur le bouton qui déclenche l'analyse, l'encart (vidéo + messages)
//   apparaît centré verticalement dans le viewport.
// - Messages d'attente superposés en bas de la vidéo, sur voile dégradé.
//
// Usage :
//   <AnalysisWaitCard
//     title={<>La sagesse se dévoile<span className="oracle-loader-dot">.</span></>}
//     subtitle={t('des.choix.deepLoading')}
//     accent={DICE_THEME.gold}
//   />

import { useEffect, useRef } from 'react';
import AnalysisWaitVideo from './analysis-wait-video';

export default function AnalysisWaitCard({
  title,
  subtitle,
  accent = '#D4AF37',
  minHeight = 240,
  videoPrefix = 'analyse-longue',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: string;
  minHeight?: number;
  /** Préfixe vidéo d'attente (ex. "analyse-des-zodiaque" pour les dés). */
  videoPrefix?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Dès l'apparition (clic sur le bouton), centrer l'encart dans l'écran.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    // Premier centrage immédiat, puis re-centrage une fois la vidéo chargée
    // (sa taille native peut faire varier la hauteur de l'encart).
    const first = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const second = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    return () => {
      cancelAnimationFrame(first);
      clearTimeout(second);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className="relative mx-auto mt-5 w-fit overflow-hidden rounded-2xl"
      style={{
        minHeight,
        border: `1.5px solid ${accent}55`,
        boxShadow: `inset 0 0 30px ${accent}14, 0 0 30px ${accent}0c`,
      }}
    >
      {/* Vidéo d'attente (rotation aléatoire <prefix>1..9) */}
      <AnalysisWaitVideo prefix={videoPrefix} />

      {/* Voile bas pour la lisibilité du message */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          background: 'linear-gradient(to top, rgba(4,6,15,0.85) 0%, rgba(4,6,15,0.35) 55%, transparent 100%)',
          height: '55%',
        }}
      />

      {/* Messages d'attente en bas de la vidéo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-6 text-center">
        <p
          className="text-sm font-bold uppercase tracking-widest"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: accent,
            textShadow: `0 0 12px ${accent}44`,
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="mt-2 text-[10px] uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DCE6F5', opacity: 0.75 }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
