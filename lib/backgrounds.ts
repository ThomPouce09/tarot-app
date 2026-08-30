// lib/backgrounds.ts — Fonds d'écran de la landing page
// Version APK : identique à main (aucune dépendance native). Source de vérité
// unique des fonds disponibles (public/backgrounds/landing-bg*.{jpg,mp4}).

export const LANDING_BACKGROUNDS: string[] = [
  '/backgrounds/landing-bg.jpg',
  '/backgrounds/landing-bg2.jpg',
  '/backgrounds/landing-bg3.jpg',
  '/backgrounds/landing-bg4.mp4',
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
