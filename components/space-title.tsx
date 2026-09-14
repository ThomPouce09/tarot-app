import type React from 'react';

// Bandeau de titre des pages de « Mon espace » (modèle /readings) :
// un seul dégradé continu qui remonte sous la têtière « L'oracle des étoiles »
// et fond dans le ciel cosmique.
export default function SpaceTitle({
  img,
  icon,
  title,
  subtitle,
  children,
}: {
  img?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="mb-5 px-4 pb-10 -mx-4 sm:-mx-6 lg:-mx-10 -mt-8 md:-mt-12 pt-12 md:pt-16"
      style={{ background: 'linear-gradient(180deg, rgba(8,5,20,0.92) 0%, rgba(14,8,30,0.80) 45%, rgba(30,16,58,0.45) 78%, rgba(30,16,58,0) 100%)' }}
    >
      <h1
        className="font-bold text-center mb-1 flex flex-nowrap items-center justify-center gap-2"
        style={{
          // Taille fluide : l'icône + le titre tiennent toujours sur UNE ligne
          // (aucun wrap, même sur petits écrans).
          fontSize: 'clamp(1.2rem, 5.5vw + 2px, 2.05rem)',
          fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520', textShadow: '0 0 18px rgba(218,165,32,0.5)',
        }}
      >
        {img && (
          <img src={img} alt="" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 object-contain" style={{ filter: 'drop-shadow(0 0 7px rgba(245,180,80,0.45))' }} />
        )}
        <span className="whitespace-nowrap">{icon}{title}</span>
      </h1>
      {subtitle && (
        <p className="text-center text-xs" style={{ fontFamily: 'var(--font-cinzel), serif', color: 'rgba(255,215,0,0.6)' }}>
          {subtitle}
        </p>
      )}
      {children && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
