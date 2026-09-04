// ─── Fonds d'écran de la landing page ──────────────────────────────────────
// Source de vérité unique des fonds disponibles. Chaque entrée est un chemin
// public vers un fichier de `public/backgrounds/` nommé `landing-bgX.jpg`
// (ou `.png` / `.mp4`). Pour ajouter un fond : dépose le fichier dans
// `public/backgrounds/` à ce nom ET ajoute son chemin ici.
//
// Le fond peut être une image (affichée en <Image fill>) ou une vidéo
// (rendue en <video autoPlay muted loop playsInline>) — détection via
// `isVideoBackground()`.
//
// Le fond PAR DÉFAUT est landing-bg4.mp4 (clair/positif) : il est listé en
// premier et sert de fond tant que l'utilisateur n'a pas épinglé un autre
// fond via les flèches ‹ › (voir DEFAULT_BACKGROUND).

export type BackgroundLevel = 'apprenti' | 'initie' | 'arkane';

// Fond d'écran par défaut de l'accueil (clair, positif).
export const DEFAULT_BACKGROUND = '/backgrounds/landing-bg4.mp4';

// Liste COMPLÈTE (forfait Arkane) — doit refléter les fichiers réels de
// `public/backgrounds/` (⚠️ certains ont changé de nom : bg7 = mp4 uniquement).
// landing-bg4.mp4 en premier → c'est aussi le 1er coché / le fond par défaut.
export const LANDING_BACKGROUNDS: string[] = [
  DEFAULT_BACKGROUND,
  '/backgrounds/landing-bg.jpg',
  '/backgrounds/landing-bg0.jpg',
  '/backgrounds/landing-bg1.jpg',
  '/backgrounds/landing-bg2.jpg',
  '/backgrounds/landing-bg3.jpg',
  '/backgrounds/landing-bg5.jpg',
  '/backgrounds/landing-bg6.jpg',
  '/backgrounds/landing-bg7.mp4',
  '/backgrounds/landing-bg8.jpg',
  '/backgrounds/landing-bg8.mp4',
  '/backgrounds/landing-bg9.jpg',
  '/backgrounds/landing-bg10.jpg',
];

// Fonds disponibles selon le forfait :
// - Apprenti : 2 fonds (landing-bg4.mp4, landing-bg3.jpg)
// - Initié  : 7 fonds (bg, bg0, bg2, bg3, bg4.mp4, bg6, bg7.mp4)
// - Arkane  : les 13 fonds ci-dessus
export const BACKGROUND_POOLS: Record<BackgroundLevel, string[]> = {
  apprenti: [DEFAULT_BACKGROUND, '/backgrounds/landing-bg3.jpg'],
  initie: [
    DEFAULT_BACKGROUND,
    '/backgrounds/landing-bg.jpg',
    '/backgrounds/landing-bg0.jpg',
    '/backgrounds/landing-bg2.jpg',
    '/backgrounds/landing-bg3.jpg',
    '/backgrounds/landing-bg6.jpg',
    '/backgrounds/landing-bg7.mp4',
  ],
  arkane: LANDING_BACKGROUNDS,
};

/** Fonds autorisés pour un niveau donné (tous si niveau inconnu/absent). */
export function backgroundsForLevel(level?: BackgroundLevel | null): string[] {
  if (level && BACKGROUND_POOLS[level]) return BACKGROUND_POOLS[level];
  return LANDING_BACKGROUNDS;
}

/** Vrai si le chemin de fond correspond à un fichier vidéo (.mp4 / .webm). */
export function isVideoBackground(path: string): boolean {
  return /\.(mp4|webm|ogg)$/i.test(path);
}

/**
 * Choisit la liste des fonds à afficher pour une session donnée.
 * - `selected` (option de l'utilisateur) : fonds choisis.
 * - `level` (forfait) : restreint à ce qui est disponible (Apprenti/Initié).
 * - Si `selected` vide ou `none` → tous les fonds du niveau.
 */
export function resolveBackgrounds(selected?: string[] | null, level?: BackgroundLevel | null): string[] {
  const allowed = backgroundsForLevel(level);
  if (selected && selected.length > 0) {
    const valid = selected.filter((p) => allowed.includes(p));
    if (valid.length > 0) return valid;
  }
  return allowed;
}
