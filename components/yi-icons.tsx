// Icônes line-art doré, esthétique Yi Jing (pas de glow, stroke fin).
// currentColor = or (hérité du parent). ViewBox 24x24, strokeWidth 1.4.

interface IconProps {
  className?: string;
}

export function IconSituation({ className }: IconProps) {
  // Yin-yang minimal (situation presente : equilibre en jeu)
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 3a9 9 0 0 1 0 18c-3 0-5-2.2-5-5s2-4.5 5-4.5 5-1.8 5-4.5S15 3 12 3z"
        stroke="currentColor" strokeWidth="1.1" />
      <circle cx="12" cy="7.5" r="1.1" fill="currentColor" />
      <circle cx="12" cy="16.5" r="1.1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function IconDefis({ className }: IconProps) {
  // Bloc fissure (obstacle / defi a surmonter)
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 12c2.5 0 3-2 5-2s2.5 3 5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 5c0 2.5-2 3-2 5s3 2.5 3 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSoutien({ className }: IconProps) {
  // Pic montagne + levee de soleil -> soutien stable
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M3 17.5 9 9.5l3.2 3.3L16.5 7l4.5 10.5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="16.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.1" opacity="0.8" />
    </svg>
  );
}

export function IconIssue({ className }: IconProps) {
  // Chemin qui se divise en deux -> issue/destinée
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 19c0-5 2-7 6-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 11c2.5-1 3.5-3 3.2-6M11 11c-2.5-1-3.8-3-3.4-6"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11" cy="11" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function IconConseil({ className }: IconProps) {
  // Main ouverte offrant une etoile a 8 branches -> conseil
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3.2l1.5 3.4 3.6.3-2.7 2.4.9 3.5L12 18.6l-3.3 2.2.9-3.5L6.9 9.9l3.6-.3z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6 21c1.5-1.2 4-1.8 6-1.8s4.5.6 6 1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function IconResume({ className }: IconProps) {
  // Bagua : cercle + point central + 8 rayons -> synthese globale
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1.6" stroke="currentColor" strokeWidth="1.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 12 + Math.cos(rad) * 2.4;
        const y1 = 12 + Math.sin(rad) * 2.4;
        const x2 = 12 + Math.cos(rad) * 6.8;
        const y2 = 12 + Math.sin(rad) * 6.8;
        return (
          <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
        );
      })}
    </svg>
  );
}
