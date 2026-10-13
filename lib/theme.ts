// lib/theme.ts — thème du ciel de « Mon espace » (Préférences).
//   'sombre' (défaut) : bleu nuit profond étoilé (voie lactée, filantes,
//                       Grande Ourse) — le nouveau ciel 2026-10.
//   'clair'           : l'ancien ciel (violet/magenta/ambre, nébuleuses roses).
// La préférence vit dans tarot_prefs.theme ET côté serveur (User.theme via
// /api/prefs) ; la layout relit le localStorage au montage — pas de flash :
// le fond de repli reste le thème sombre jusqu'à l'hydratation.
export type SpaceTheme = 'sombre' | 'clair';

export function readSpaceTheme(): SpaceTheme {
  if (typeof window === 'undefined') return 'sombre';
  try {
    const raw = localStorage.getItem('tarot_prefs');
    const t = raw ? JSON.parse(raw)?.theme : undefined;
    return t === 'clair' ? 'clair' : 'sombre';
  } catch {
    return 'sombre';
  }
}

// Événement émis quand le thème change (bascule instantanée, sans rechargement).
export const SPACE_THEME_EVENT = 'spacetheme-changed';

export function setSpaceTheme(t: SpaceTheme) {
  try {
    const raw = localStorage.getItem('tarot_prefs');
    const prefs = raw ? JSON.parse(raw) : {};
    prefs.theme = t;
    localStorage.setItem('tarot_prefs', JSON.stringify(prefs));
  } catch { /* stockage plein : le state React suffit pour la page active */ }
  window.dispatchEvent(new Event(SPACE_THEME_EVENT));
}
