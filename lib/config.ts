// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION - Tarot Divinatoire
// ═══════════════════════════════════════════════════════════════════
// Paramètres ajustables pour l'interface et les animations
// ═══════════════════════════════════════════════════════════════════

// Mode wide : dimensions alternatives (Option 3) - Agrandi de 15%
// Overlap = marginLeft. Négatif = se chevauchent.
// Chevauchement MAXIMUM pour un paquet ultra-compact (comme un paquet tenu en main)
export const CARD_FAN_WIDE = {
  mobile: { width: 69, height: 104, overlap: -45 },  // 45px de chevauchement (~65% de la carte)
  desktop: { width: 104, height: 155, overlap: -55 }, // 55px de chevauchement (~53% de la carte)
};

export const CARD_FAN_CLASSIC = {
  mobile: { width: 97, height: 146, overlap: -45 },
  desktop: { width: 150, height: 225, overlap: -55 },
};

export const ARC_WIDE = {
  mobile: { amplitude: 100, rotation: 50 },  // arc classique moins prononcé
  desktop: { amplitude: 120, rotation: 60 }, // arc classique moins prononcé
};

export const ARC_CLASSIC = {
  mobile: { amplitude: 100, rotation: 50 },
  desktop: { amplitude: 120, rotation: 60 },
};

// ARC par défaut = classic (rétrocompatibilité)
export const ARC = ARC_CLASSIC;
export const CARD_FAN = CARD_FAN_CLASSIC;

export const CONFIG = {
  // Mode d'affichage: 'wide' (Option 3) ou 'classic'
  FAN_MODE: 'wide' as 'wide' | 'classic',
  
  // Dimensions des cartes (utilisées par défaut)
  CARD_FAN: CARD_FAN_WIDE,
  
  // Courbe de l'éventail (utilisée par défaut)
  ARC: ARC_WIDE,
  
  // Hauteurs des sections (en % de viewport height)
    SECTIONS: {
      header: 15,        // Titre en haut
      drawnCards: 25,    // Zone des cartes tirées
      fan: 50,           // Éventail de cartes
      bottomPadding: 10, // Espace en bas
    },
  
  // Dimensions des cartes tirées - ratio adapté aux images PNG (764x1286 = 0.594) + 5% de marge
  DRAWN_CARD: {
    mobile: { width: 132, height: 220 },  // +5% pour mieux remplir
    desktop: { width: 206, height: 346 }, // +5% pour mieux remplir
  },
  
  // Titres
  TITLES: {
    main: { mobile: 'xl', desktop: '3xl' },
    subtitle: { mobile: 'xs', desktop: 'base' },
  },
  
  // Drag & Drop
    DRAG: {
      sensitivity: 0.15,
      snapBackDuration: 0.4,
      snapToSlotDuration: 0.5,
      minDragDistance: 80, // Distance mini pour valider le drag (px) - augmenté pour éviter sélections accidentelles
    },
  
  // Animations
  ANIMATIONS: {
    flipDuration: 0.8,
    sparkleDelay: 0.08,
    fanInDuration: 0.6,
  },
  
  // Jeu
  GAME: {
    totalCards: 78,
    cardsToDraw: 3,
  },
};

// Export pour compatibilité
export const { SECTIONS, DRAWN_CARD, TITLES, DRAG, ANIMATIONS, GAME } = CONFIG;