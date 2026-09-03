// ─── Fonds d'écran de la landing page ──────────────────────────────────────
// Source de vérité unique des fonds disponibles. Chaque entrée est un chemin
// public vers un fichier de `public/backgrounds/` nommé `landing-bgX.jpg`
// (ou `.png` / `.mp4`). Pour ajouter un fond : dépose le fichier dans
// `public/backgrounds/` à ce nom ET ajoute son chemin ici.
//
// Le fond peut être une image (affichée en <Image fill>) ou une vidéo
// (rendue en <video autoPlay muted loop playsInline>) — détection via
// `isVideoBackground()`.

export const LANDING_BACKGROUNDS: string[] = [
  '/backgrounds/landing-bg.jpg',
  '/backgrounds/landing-bg0.jpg',
  '/backgrounds/landing-bg2.jpg',
  '/backgrounds/landing-bg3.jpg',
  '/backgrounds/landing-bg4.mp4',
  '/backgrounds/landing-bg5.jpg',
  '/backgrounds/landing-bg6.jpg',
  '/backgrounds/landing-bg7.jpg',
  '/backgrounds/landing-bg7.mp4',
  '/backgrounds/landing-bg8.jpg',
  '/backgrounds/landing-bg8.mp4',
  '/backgrounds/landing-bg9.jpg',
];

/** Vrai si le chemin de fond correspond à un fichier vidéo (.mp4 / .webm). */
export function isVideoBackground(path: string): boolean {
  return /\.(mp4|webm|ogg)$/i.test(path);
}

/**
 * Choisit le fond à afficher pour une session donnée.
 * - `selected` (option de l'utilisateur) : liste des fonds choisis.
 * - Si vide ou `none` → tous les fonds disponibles, en mode aléatoire (défaut).
 */
export function resolveBackgrounds(selected?: string[] | null): string[] {
  if (selected && selected.length > 0) {
    const valid = selected.filter((p) => LANDING_BACKGROUNDS.includes(p));
    if (valid.length > 0) return valid;
  }
  return LANDING_BACKGROUNDS;
}

/** Sélectionne un fond au hasard (suffit pour la rotation au refresh/relance). */
export function pickRandomBackground(selected?: string[] | null): string {
  const pool = resolveBackgrounds(selected);
  return pool[Math.floor(Math.random() * pool.length)];
}
