'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';

// Bandeau de titre des pages de « Mon espace » (modèle /readings) :
// un seul dégradé continu qui remonte sous la têtière « L'oracle des étoiles »
// et fond dans le ciel cosmique.
export default function SpaceTitle({
  img,
  icon,
  title,
  subtitle,
  children,
  dense,
}: {
  img?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Rapproche le contenu sous le bandeau (historique : pas de trou sous le
   *  dégradé avant le champ de recherche). */
  dense?: boolean;
}) {
  // Le bloc identité (avatar/icône + nom d'utilisateur) doit tenir sur UNE
  // seule ligne quelle que soit la longueur du nom : le texte ne peut PAS se
  // contenter du parent comme budget, car l'icône (80px) et le gap flex (8px)
  // occupent la même ligne et ne sont pas visibles depuis le span. La mesure se
  // fait donc sur le scrollWidth de la ligne ENTIÈRE (h1), puis on retire ce
  // que l'icône consomme réellement pour obtenir le budget du texte.
  // Shrink-only (jamais d'agrandissement) : zéro oscillation.
  const rowRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const row = rowRef.current;
    const el = titleRef.current;
    if (!row || !el) return;
    const measure = () => {
      const rowW = row.clientWidth || row.parentElement?.clientWidth || window.innerWidth;
      const iconW = [...row.children].reduce(
        (sum, c) => (c === el ? sum : sum + c.getBoundingClientRect().width),
        0,
      );
      const gap = parseFloat(getComputedStyle(row).columnGap || '0') || 0;
      const avail = rowW - iconW - gap * Math.max(0, row.children.length - 1);
      if (avail <= 8) return;
      el.style.fontSize = '204.8px'; // sonde de largeur : 1px de police ≈ 1/204.8 de largeur
      const unit = el.scrollWidth / 204.8;
      if (!unit) return;
      let fs = Math.min(32.8, avail / unit);
      el.style.fontSize = `${fs}px`;
      // filet « shrink-only » terminal (jamais agrandir)
      while (el.scrollWidth > avail && fs > 7) { fs -= 0.5; el.style.fontSize = `${fs}px`; }
    };
    let lastW = 0;
    const onResize = () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; measure(); } };
    lastW = window.innerWidth;
    measure();
    // Re-mesure après chargement de la police web (métriques différentes).
    (document as any).fonts?.load?.('700 33px "Cinzel Decorative"')
      .then(() => window.setTimeout(measure, 60)).catch(() => window.setTimeout(measure, 400));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [title]);

  return (
    <div
      className={`${dense ? 'mb-0 pb-4' : 'mb-5 pb-10'} px-4 -mx-4 sm:-mx-6 lg:-mx-10 -mt-8 md:-mt-12 pt-12 md:pt-16`}
      style={{ background: 'linear-gradient(180deg, rgba(8,5,20,0.92) 0%, rgba(14,8,30,0.80) 45%, rgba(30,16,58,0.45) 78%, rgba(30,16,58,0) 100%)' }}
    >
      <h1
        ref={rowRef}
        className="font-bold text-center mb-1 flex flex-nowrap items-center justify-center gap-2"
        style={{
          // Taille de repli (navigateur sans JS) : l'icône + le titre tiennent
          // déjà sur une ligne sur petits écrans ; la mesure JS affine ensuite
          // à la largeur réelle pour les noms longs.
          fontSize: 'clamp(1.2rem, 5.5vw + 2px, 2.05rem)',
          fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520', textShadow: '0 0 18px rgba(218,165,32,0.5)',
        }}
      >
        {icon && <span className="shrink-0 inline-flex items-center justify-center">{icon}</span>}
        {img && (
          <img src={img} alt="" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 object-contain" style={{ filter: 'drop-shadow(0 0 7px rgba(245,180,80,0.45))' }} />
        )}
        <span ref={titleRef} className="whitespace-nowrap">{title}</span>
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
