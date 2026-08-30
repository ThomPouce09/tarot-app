'use client';

// app/components/gated-tile.tsx
// Enveloppe une tuile de tirage : rend un <Link> si le tirage est disponible,
// sinon un conteneur grisé "Indisponible" qui ouvre la modale de gating au clic.
// Réutilisé par tous les hubs (tarot, yi-jing, dés, runes) → une seule logique.

import { type ReactNode } from 'react';
import Link from 'next/link';
import { type GateReason } from '@/lib/use-entitlement';

interface GatedTileProps {
  href: string;
  /** allowed = undefined → état inconnu (chargement) → on laisse passer par défaut */
  allowed?: boolean;
  reason?: GateReason | null;
  onBlocked?: (reason: GateReason | null) => void;
  children: ReactNode;
  /** class appliquée au conteneur cliquable (Link ou div) */
  className?: string;
}

export default function GatedTile({ href, allowed, reason, onBlocked, children, className }: GatedTileProps) {
  // Dispo = inconnue (undefined) ou vraie → navigable. Sinon → bloqué.
  if (allowed !== false) {
    return <Link href={href} className={className}>{children}</Link>;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled="true"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBlocked?.(reason ?? 'limit-grand'); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBlocked?.(reason ?? 'limit-grand'); } }}
      className={className}
      style={{ position: 'relative', filter: 'grayscale(0.6) opacity(0.55)', cursor: 'not-allowed' }}
    >
      <div className="relative w-full h-full">
        {children}
        {/* Badge "Indisponible" */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="px-2 py-0.5 rounded-full bg-black/70 border border-amber-600/50 text-amber-200 text-[10px] font-semibold uppercase tracking-wider">
            &nbsp;🔒&nbsp;Indisponible&nbsp;
          </span>
        </div>
      </div>
    </div>
  );
}
