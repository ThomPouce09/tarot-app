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

export function IconTarot({ className }: IconProps) {
  // Carte de tarot stylisee (soleil/arcane) -> Tirage Tarot
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="6" y="3.5" width="12" height="17" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 7v-1.5M12 13v1.5M9 10h-1.5M15 10h1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M9 17h6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function IconYiJing({ className }: IconProps) {
  // Trigramme (3 lignes : pleine / brisee / pleine) -> Tirage Yi Jing
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="5" y="6" width="14" height="2" rx="1" fill="currentColor" />
      <rect x="5" y="11.5" width="6" height="2" rx="1" fill="currentColor" />
      <rect x="13" y="11.5" width="6" height="2" rx="1" fill="currentColor" />
      <rect x="5" y="17" width="14" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

// ─── Passé / Présent / Avenir (positions du tirage 3 cartes, historique) ───

export function IconPasse({ className }: IconProps) {
  // Sablier discret — ce qui s'est déjà écoulé, les racines du tirage.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M7 4h10M7 20h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 4c0 4.2 4 5.4 4 8 0-2.6 4-3.8 4-8M8 20c0-4.2 4-5.4 4-8 0 2.6 4 3.8 4 8"
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

export function IconPresent({ className }: IconProps) {
  // Disque solaire à rayons courts — le foyer, le maintenant éclairé.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.4" />
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line key={a}
            x1={12 + Math.cos(rad) * 6.4} y1={12 + Math.sin(rad) * 6.4}
            x2={12 + Math.cos(rad) * 8.8} y2={12 + Math.sin(rad) * 8.8}
            stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        );
      })}
      <circle cx="12" cy="12" r="1.2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function IconAvenir({ className }: IconProps) {
  // Étoile filante sobre — ce vers quoi la trajectoire s'ouvre.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M15.8 4.4l1.1 2.6 2.6.2-2 1.8.6 2.6-2.3-1.4-2.3 1.4.6-2.6-2-1.8 2.6-.2z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12.3 12.2 5.4 19M9.9 11.8l-3.6.6M12.9 15.2l-.6 3.6"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

// ─── Historique « Mes tirages » : remplacements d'emojis (traits fins) ───

export function IconSeal({ className }: IconProps) {
  // Sceau clos : cadenas minimal — augure encore scellé.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="7" y="10.5" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 10.5V8a2.8 2.8 0 0 1 5.6 0v2.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="14.6" r="1.15" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  // Coche fine — verdict positif / vérifié.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 12.8 9.6 17 19 6.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconScroll({ className }: IconProps) {
  // Parchemin déroulé — synthèse.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M7.5 6.5h9c1.4 0 2.5 1 2.5 2.3V19c0 1-.8 1.8-1.8 1.8H8.2C6.9 20.8 5.5 19.7 5.5 18c0-1 .6-1.7 1.4-2V8.8c0-1.3.5-2.3.6-2.3z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.5 6.5C7.5 4.6 8.8 3.5 10 3.5h7c-1.2 0-2.5 1.1-2.5 3v11.4c0 1-.8 1.9-1.9 1.9"
        stroke="currentColor" strokeWidth="1.15" opacity="0.7" />
      <path d="M9.5 10.5h6.5M9.5 13.2h6.5" stroke="currentColor" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconOracleEye({ className }: IconProps) {
  // Clôche oracle : œon stylisé — « Oracle flash ».
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M3.5 12c2.6-3.6 5.5-5.4 8.5-5.4s5.9 1.8 8.5 5.4c-2.6 3.6-5.5 5.4-8.5 5.4S6.1 15.6 3.5 12z"
        stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

export function IconOpenBook({ className }: IconProps) {
  // Livre ouvert — interprétation combinée (DB).
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 7c-1.6-1.4-3.6-2-6-2v12c2.4 0 4.4.6 6 2 1.6-1.4 3.6-2 6-2V5c-2.4 0-4.4.6-6 2z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12 7v12" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function IconLens({ className }: IconProps) {
  // Loupe discrète — comparaison / affinage.
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="m14.8 14.8 4.4 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 9.2a2.6 2.6 0 0 1 2.2-1.4" stroke="currentColor" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
    </svg>
  );
}
