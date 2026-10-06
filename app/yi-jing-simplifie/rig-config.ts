// Reglage du rig de /yi-jing-simplifie (etape 1/2 du decoupage).
// Constantes de physique/mise en page, interfaces et fonctions PURES.
// Bloc autonome : aucune dependance externe (seulement Math).
// NB : table PROPRE a cette page, distincte de /yi-jing-simple (TITLE_TOP
// differe) ; les deux pages sont reglees separement, ne pas mutualiser.

export const YI_QING_BG = '/backgrounds/yi-qing-bg.mp4';

export const BOX_IMG = "/images/boite.png";
export const STICK_IMG = "/images/baguette.png";

// ============================================================================
// 🎛️ PARAMÈTRES CONFIGURABLES
// ============================================================================

// --- Physique & Mouvement ---
export const MOVEMENT_THRESHOLD = 1200; // drag desktop : declenchement moins sensible
export const STICK_LEFT_OFFSET = -3;
export const MAX_BOX_SHIFT_X = 15;
export const MAX_BOX_SHIFT_Y = 10;
export const STICK_JUMP_HEIGHT = 55;
export const STICK_LIFT_HEIGHT = 48; // sortie modérée, visible
export const STICK_RISE_EASE = 0.022;  // extraction: douce (réglage user)
export const STICK_SWING_K = 0.06;    // raideur forte = rebond COURT et RAPIDE (table en bois)
export const STICK_SWING_DAMP = 0.9; // amortissement plus doux = plusieurs rebonds avant stabilisation
export const MAX_INITIAL_RISE = 15;
export const HORIZONTAL_SENSITIVITY = 0.9;
export const VERTICAL_SENSITIVITY = 0.;
export const TOP_STICKS_COUNT = 1;

// --- Émergence des baguettes ---
export const PROMINENT_STICKS_MIN = 3;
export const PROMINENT_STICKS_MAX = 15;
export const MAX_RISE_IN_BOX = 7;
export const MAX_PROMINENT_RISE = 90;

// --- Dimensions des baguettes & Boîte ---
export const STICK_DISPLAY_WIDTH = 4.5;
export const STICK_DISPLAY_HEIGHT = 260;
// Largeur REELLE de la baguette (ratio PNG 15x300) -> le calque du clone est
// recadre exactement dessus pour que les etincelles suivent la baguette.
export const STICK_REAL_WIDTH = STICK_DISPLAY_HEIGHT * (15 / 300); // ~13px
export const BOX_WIDTH = STICK_DISPLAY_WIDTH * 10;
export const BOX_HEIGHT = STICK_DISPLAY_HEIGHT * 0.45;
export const BOX_BOTTOM = 125; // boite + baguettes, remontee legere (hint main suit via BOX_BOTTOM)
export const RIG_W = BOX_WIDTH + 40;
export const RIG_H = STICK_DISPLAY_HEIGHT + BOX_BOTTOM + 40;
export const STICK_COUNT = 64;
export const INTERIOR_WIDTH = BOX_WIDTH * 0.50;
export const STICK_WIDTH = Math.max(2, INTERIOR_WIDTH / STICK_COUNT);
export const STICK_BASE_BOTTOM_OFFSET = 52;

// --- Device Motion (mobile) ---
export const ACCEL_NOISE_FLOOR = 3.5; // ignore le micro-tremblement (moins sensible)

// --- Animation Swipe (Main) ---
export const SWIPE_ANIMATION_DURATION = '0.6s';
export const SWIPE_ANIMATION_DISTANCE = '16px';
export const SWIPE_BELOW_BOX = 0; // colle le hint sous le bas de la boite (ancre au bas de la boite)
export const SWIPE_ICON_SIZE = '48px';
export const SWIPE_ICON_OPACITY = 0.5;
export const SWIPE_TEXT_FONT_SIZE = '0.65rem';
export const SWIPE_TEXT_MAX_WIDTH = '140px';

// --- Positionnement UI ---
export const PROGRESS_BAR_ABOVE_BOX = 45; // POSITIF = remonte la barre (top = 50% - (RIG_H/2 + val))
export const TITLE_TOP = 40;

// --- Texte de Résultat ("Le sort a parlé" & "Baguette n°..") ---
export const RESULT_CONTAINER_BOTTOM = '24%';
export const RESULT_SUBTITLE_FONT_SIZE = '0.875rem';
export const RESULT_NUMBER_FONT_SIZE = '1.5rem';
export const RESULT_TEXT_SPACING = '0.5rem';

// ============================================================================

export interface MotionState {
  x: number;
  y: number;
  z: number;
}

export interface Stick {
  id: number;
  xOffset: number;
  baseRise: number;
  rotation: number;
  zJitter: number;
  yJitter: number;
  emergenceDelay: number;
  initialRise: number;
}

export interface Jumping {
  id: number;
  y: number;                  // hauteur verticale (monte sans rebond)
  swing: number;              // angle de balancement latéral courant (degrés)
  swingV: number;             // vélocité angulaire
  restAngle: number;          // angle de repos aléatoire final (qq degrés, de travers)
  peakY: number;              // apex vertical stabilisé
  settled: boolean;
  xOffset: number;
  opacity: number;
}

export function makeSticks(): Stick[] {
  const left = -INTERIOR_WIDTH / 2 + STICK_WIDTH / 2;
  const usableWidth = INTERIOR_WIDTH - STICK_WIDTH;
  const step = usableWidth / (STICK_COUNT - 1);

  const prominentCount = Math.floor(Math.random() * (PROMINENT_STICKS_MAX - PROMINENT_STICKS_MIN + 1)) + PROMINENT_STICKS_MIN;
  
  const allIds = Array.from({ length: STICK_COUNT }, (_, i) => i);
  for (let i = allIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
  }
  const prominentIds = new Set(allIds.slice(0, prominentCount));

  return Array.from({ length: STICK_COUNT }, (_, i) => {
    const isProminent = prominentIds.has(i);
    return {
      id: i,
      xOffset: left + i * step + (Math.random() * 1.5 - 0.75) + STICK_LEFT_OFFSET,
      baseRise: isProminent ? 20 + Math.random() * (MAX_PROMINENT_RISE - 20) : Math.random() * MAX_RISE_IN_BOX,
      rotation: Math.random() * 6 - 3,
      zJitter: 1 + Math.floor(Math.random() * 15),
      yJitter: Math.random() * 4,
      emergenceDelay: isProminent ? Math.random() * 0.4 : 0.7 + Math.random() * 0.3,
      initialRise: Math.random() * MAX_INITIAL_RISE,
    };
  });
}

export function getStickRise(stick: Stick, progress: number): number {
  const stickProgress = Math.max(0, (progress - stick.emergenceDelay) / (1 - stick.emergenceDelay));
  return stick.initialRise + stickProgress * stick.baseRise;
}
