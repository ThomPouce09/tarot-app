// Constantes de reglage et types de /tarot (composant TarotApp).
// Extraites telles quelles depuis tarot-app.tsx (decoupage) ; valeurs
// figees : les changer ici change le rendu, pas de dependance runtime.

export const ENABLE_SPARKLES = true;
export const ENABLE_BREATH = true;
export const ENABLE_HAND_DUST = true;

// Nombre de cartes de l'éventail = deck effectif (78 complètes, ou 22 si le
// tirage est limité aux arcanes majeurs). Calculé côté composant (deck.length).
export const SPREAD_MS = 3000;
export const EDGE = 10;
export const CARD_W = 62;
export const ZONE = 4;
export const TOUCH_SPACING = 48;
export const ZOOM_SCALE = 0.6;

export const TABLE_BG_WITH_VERSION = '/backgrounds/table-tarot-bg.jpg?v=11';
export const VISUAL_SHIFT_DOWN = 36;

/* ---------- Chronologie d'apparition (timing) ---------- */
export const ZOOM_START_MS = 120;                              // 1) fond + zoom dès le chargement
export const ZOOM_DURATION_MS = 1200;                          // durée du zoom du fond (aligné sur la transition scale)
export const ZOOM_END_MS = ZOOM_START_MS + ZOOM_DURATION_MS;   // fin du zoom
export const DECK_DELAY_MS = 500;                              // pioche + main retardées de 0.5s
export const DECK_SHOW_MS = ZOOM_END_MS + DECK_DELAY_MS;       // 3) pioche + navbar, 0.5s après fin du zoom
export const UI_PREVIEW_MS = ZOOM_END_MS - 350;                // 2) titre + menu + sélecteurs ~350ms avant fin zoom
export const HAND_APPEAR_MS = DECK_SHOW_MS + 400;              // 4) main sur la pioche, 0.4s après la pioche
export const SPREAD_START_MS = HAND_APPEAR_MS + 300;           // 5) déploiement + balayage + particules, 0.3s après la main

// Délai après la fin du balayage avant d'activer transitions + breath sur la pioche
// (évite le scintillement / saut de z-index à l'instant exact où la main disparaît)
export const SPREAD_SETTLE_MS = 500;
// Durée du fondu de la main (CSS pur — taille constante, pas de framer-motion)
export const HAND_FADE_MS = 450;

/* ---------- Tuto geste "Pincer la pioche" ---------- */
// Apparaît une fois l'indice "Choisis tes cartes" disparu (handDone + 2.6s),
// reste ~5s, et meurt au premier pinch / premier tap carte / timeout.
// S'il disparaît sans interaction, il REAPPEARAÎT après 5s (cycle continu
// tant que l'utilisateur n'a ni pincé ni choisi de carte).
export const PINCH_HINT_DELAY_MS = 2800;   // après handDone (l'indice existant part à 2.6s)
export const PINCH_HINT_SHOW_MS = 5000;    // durée d'affichage maximale
export const PINCH_HINT_FADE_MS = 400;     // fondu de sortie
export const PINCH_HINT_REAPPEAR_MS = 5000; // délai avant réapparition sans interaction

export type CinematicPhase = 0 | 1 | 2 | 3 | 4;

/* ---------- Poussière magique dorée (traînée de la main) ---------- */
export interface DustParticle {
  id: number;
  x: number;
  yJitter: number;
  size: number;
  dx: number;
  dy: number;
  dur: number;
}
