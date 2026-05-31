// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION - Tarot Divinatoire
// ═══════════════════════════════════════════════════════════════════
// Paramètres ajustables pour l'interface et les animations
// ═══════════════════════════════════════════════════════════════════

export const CONFIG = {
  // Dimensions des cartes dans l'éventail
  CARD_FAN: {
    // Mobile (px)
    mobile: {
      width: 130,      // Largeur de carte
      height: 195,     // Hauteur de carte
      overlap: -50,    // Chevauchement entre cartes
    },
    // Desktop (px)
    desktop: {
      width: 200,      // Largeur de carte
      height: 300,     // Hauteur de carte
      overlap: -75,    // Chevauchement entre cartes
    },
  },

  // Courbe de l'éventail
  ARC: {
    mobile: {
      amplitude: 100,    // Hauteur de la courbe (px)
      rotation: 50,      // Rotation max des cartes (degrés)
    },
    desktop: {
      amplitude: 120,    // Hauteur de la courbe (px)
      rotation: 60,      // Rotation max des cartes (degrés)
    },
  },

  // Hauteurs des sections (en % de viewport height)
  SECTIONS: {
    header: 15,        // Titre en haut
    drawnCards: 25,    // Zone des cartes tirées
    fan: 50,           // Éventail de cartes
    bottomPadding: 10, // Espace en bas
  },

  // Dimensions des cartes tirées
  DRAWN_CARD: {
    mobile: {
      width: 140,      // Largeur
      height: 210,     // Hauteur
    },
    desktop: {
      width: 220,      // Largeur
      height: 330,     // Hauteur
    },
  },

  // Titres
  TITLES: {
    main: {
      mobile: 'xl',    // Taille de police
      desktop: '3xl',  // Taille de police
    },
    subtitle: {
      mobile: 'xs',
      desktop: 'base',
    },
  },

  // Drag & Drop
  DRAG: {
    sensitivity: 0.15,  // Seuil pour détecter le drag (0-1)
    snapBackDuration: 0.4,  // Durée du retour en place (secondes)
    snapToSlotDuration: 0.5, // Durée du snap vers le slot
    minDragDistance: 50, // Distance mini pour valider le drag (px)
  },

  // Animations
  ANIMATIONS: {
    flipDuration: 0.8,    // Durée du flip de carte (secondes)
    sparkleDelay: 0.08,   // Délai entre sparkles (secondes)
    fanInDuration: 0.6,   // Durée d'apparition de l'éventail
  },

  // Nombres de cartes
  GAME: {
    totalCards: 78,       // Nombre total de cartes dans le paquet
    cardsToDraw: 3,       // Nombre de cartes à tirer pour un tirage
  },
};

// Export des configs individuelles pour import facile
export const { CARD_FAN, ARC, SECTIONS, DRAWN_CARD, TITLES, DRAG, ANIMATIONS, GAME } = CONFIG;