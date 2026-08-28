'use client';

// lib/sounds.ts — Registre centralisé des sons de l'application.
//
// Chaque son a une CLÉ unique. Les pages utilisent playSound('dice-shake-1')
// — jamais le chemin du fichier en dur. Si on remplace un fichier, on ne
// touche qu'à ce registre.
//
// Pattern unlock (voir skill web-audio-autoplay-unlock) : les navigateurs
// bloquent audio.play() hors d'un geste utilisateur. On pré-déverrouille
// TOUS les sons, muets (volume 0), au premier pointerdown/touchstart/keydown,
// puis chaque son joue à plein volume à son moment de déclenchement.

export type SoundCategory = 'dice' | 'runes' | 'cards' | 'ambient' | 'ui' | 'yi-jing';

export interface SoundEntry {
  /** Clé unique utilisée par playSound(). */
  key: string;
  /** Chemin du fichier dans /public. */
  file: string;
  /** Libellé lisible (FR) — affiché dans la page /sons. */
  label: string;
  /** Catégorie — grouper dans la page /sons. */
  category: SoundCategory;
  /** Durée en secondes (info, page /sons). */
  duration: number;
  /** Usage conseillé — texte court pour la page /sons. */
  usage: string;
}

export const SOUNDS: SoundEntry[] = [
  // ── Dés ────────────────────────────────────────────────────────────────
  { key: 'dice-shake-1', file: '/audio/dice-shake-1.mp3', category: 'dice', label: 'Secousse 1', duration: 1.48, usage: 'Secouer le gobelet — variant 1' },
  { key: 'dice-shake-2', file: '/audio/dice-shake-2.mp3', category: 'dice', label: 'Secousse 2', duration: 1.38, usage: 'Secouer le gobelet — variant 2' },
  { key: 'dice-shake-3', file: '/audio/dice-shake-3.mp3', category: 'dice', label: 'Secousse 3', duration: 1.52, usage: 'Secouer le gobelet — variant 3' },
  { key: 'dices-cup-1', file: '/audio/dices-cup1.mp3', category: 'dice', label: 'Gobelet riche 1', duration: 5.00, usage: 'Secouer le gobelet — variant riche 1' },
  { key: 'dices-cup-2', file: '/audio/dices-cup2.mp3', category: 'dice', label: 'Gobelet riche 2', duration: 5.00, usage: 'Secouer le gobelet — variant riche 2' },
  { key: 'dices-cup-3', file: '/audio/dices-cup3.mp3', category: 'dice', label: 'Gobelet riche 3', duration: 5.00, usage: 'Secouer le gobelet — variant riche 3' },
  { key: 'dice-throw-1', file: '/audio/dice-throw-1.mp3', category: 'dice', label: 'Jeté 1', duration: 0.63, usage: 'Lancer des dés — variant 1' },
  { key: 'dice-throw-2', file: '/audio/dice-throw-2.mp3', category: 'dice', label: 'Jeté 2', duration: 0.40, usage: 'Lancer des dés — variant 2 (bref)' },
  { key: 'dice-throw-3', file: '/audio/dice-throw-3.mp3', category: 'dice', label: 'Jeté 3', duration: 0.58, usage: 'Lancer des dés — variant 3' },
  { key: 'dices-throw-4', file: '/audio/dices-throw1.mp3', category: 'dice', label: 'Jeté riche', duration: 3.00, usage: 'Lancer des dés — variant riche' },

  // ── Runes ──────────────────────────────────────────────────────────────
  { key: 'rune-hit-1', file: '/audio/rune-hit-1.mp3', category: 'runes', label: 'Impact sec', duration: 0.13, usage: 'Rune posée — impact bref' },
  { key: 'rune-falling-1', file: '/audio/rune-falling-1.mp3', category: 'runes', label: 'Chute 1', duration: 0.32, usage: 'Rune qui tombe — variant 1' },
  { key: 'rune-falling-2', file: '/audio/rune-falling-2.mp3', category: 'runes', label: 'Chute 2', duration: 0.46, usage: 'Rune qui tombe — variant 2' },
  { key: 'runes-handle-1', file: '/audio/runes-handle-1.mp3', category: 'runes', label: 'Manipulation 1', duration: 0.62, usage: 'Runes remuées dans le pochon' },
  { key: 'runes-handle-2', file: '/audio/runes-handle-2.mp3', category: 'runes', label: 'Manipulation 2', duration: 0.55, usage: 'Runes remuées — variant 2' },

  // ── Cartes ─────────────────────────────────────────────────────────────
  { key: 'card-flipped', file: '/audio/card-flipped.mp3', category: 'cards', label: 'Retournement', duration: 0.60, usage: 'Carte retournée (Tarot)' },
  { key: 'card-flipped2', file: '/audio/card-flipped2.mp3', category: 'cards', label: 'Retournement 2', duration: 0.60, usage: 'Carte retournée — variant 2' },

  // ── Yi Jing ────────────────────────────────────────────────────────────
  { key: 'stick-draw', file: '/audio/stick-draw.mp3', category: 'yi-jing', label: 'Tirage de bâton', duration: 0.80, usage: 'Bâton Yi Jing tiré' },
  { key: 'spell', file: '/audio/spell.mp3', category: 'yi-jing', label: 'Sort (révélation)', duration: 2.10, usage: 'Révélation / effet magique' },

  // ── Ambiance / UI ──────────────────────────────────────────────────────
  { key: 'des-divinatoires', file: '/audio/des-divinatoires.mp3', category: 'ambient', label: 'Ouverture Dés du Zodiaque', duration: 4.86, usage: 'Jingle à l\'ouverture de la page /des-divinatoires' },
  { key: 'runes', file: '/audio/runes.mp3', category: 'ambient', label: 'Ouverture Runes', duration: 11.52, usage: 'Jingle à l\'ouverture de la page /runes' },
  { key: 'tarot2', file: '/audio/tarot2.mp3', category: 'ambient', label: 'Ouverture Tarot', duration: 10.29, usage: 'Jingle à l\'ouverture de la page /tarot' },
  { key: 'yi-jing', file: '/audio/yi-jing.mp3', category: 'ambient', label: 'Ouverture Yi Jing', duration: 8.12, usage: 'Jingle à l\'ouverture de la page /yi-jing' },
  { key: 'scroll1', file: '/audio/scroll1.mp3', category: 'ui', label: 'Parchemin 1', duration: 0.90, usage: 'Menu parchemin — ouverture' },
  { key: 'creatures1', file: '/audio/creatures1.mp3', category: 'ambient', label: 'Créature 1', duration: 1.20, usage: 'Tap sur la luciole — variant 1' },
  { key: 'creatures2', file: '/audio/creatures2.mp3', category: 'ambient', label: 'Créature 2', duration: 1.00, usage: 'Tap sur la luciole — variant 2' },
  { key: 'creatures3', file: '/audio/creatures3.mp3', category: 'ambient', label: 'Créature 3', duration: 1.10, usage: 'Tap sur la luciole — variant 3' },
  { key: 'creatures4', file: '/audio/creatures4.mp3', category: 'ambient', label: 'Créature 4', duration: 1.00, usage: 'Tap sur la luciole — variant 4' },
  { key: 'creatures5', file: '/audio/creatures5.mp3', category: 'ambient', label: 'Créature 5', duration: 1.60, usage: 'Tap sur la luciole — variant 5' },
];

/** Index clé → entrée, pour lookup O(1). */
const BY_KEY: Record<string, SoundEntry> = Object.fromEntries(
  SOUNDS.map((s) => [s.key, s]),
);

/** Récupère l'entrée d'un son par sa clé. */
export function soundByKey(key: string): SoundEntry | undefined {
  return BY_KEY[key];
}

/* ----------------------------------------------------------------------- */
/*  Haptique (vibration)                                                     */
/* ----------------------------------------------------------------------- */

/** Haptique activée ? (pref localStorage 'tarot_prefs.haptics', défaut ON). */
export function isHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem('tarot_prefs');
    if (!raw) return true;
    const p = JSON.parse(raw);
    return typeof p.haptics === 'boolean' ? p.haptics : true;
  } catch {
    return true;
  }
}

/** Vibrate (ms) si le navigateur le supporte et que la pref haptique est ON. */
export function vibrate(pattern: number | number[] = 30) {
  if (typeof navigator === 'undefined' || !isHapticsEnabled()) return;
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    // non supporté — ignore
  }
}

/* ----------------------------------------------------------------------- */
/*  Lecture                                                                    */
/* ----------------------------------------------------------------------- */

/** Éléments audio pré-déverrouillés (un par son). */
const unlocked = new Map<string, HTMLAudioElement>();

/** Pré-déverrouille TOUS les sons, muets, à un geste utilisateur réel.
 *  Appeler au montage : window.addEventListener('pointerdown', unlockAll, { once:true }). */
export function unlockAllSounds() {
  for (const s of SOUNDS) {
    try {
      if (unlocked.has(s.key)) continue;
      const a = new Audio(s.file);
      a.volume = 0;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          unlocked.set(s.key, a);
        })
        .catch(() => {
          // Autoplay encore bloqué — on retentera au déclenchement réel.
        });
    } catch {
      // fichier absent / contexte invalide — on ignore
    }
  }
}

/**
 * Joue un son par sa clé. Sûr à appeler depuis n'importe où (geste,
 * timer, transition d'état) : réutilise l'élément pré-déverrouillé si
 * disponible, sinon en crée un neuf.
 */
export function playSound(key: string, volume = 0.8) {
  const entry = BY_KEY[key];
  if (!entry) {
    if (typeof console !== 'undefined') console.warn(`[sounds] clé inconnue: ${key}`);
    return;
  }
  try {
    // Retour haptique discret (ms selon la durée du son).
    vibrate(entry.duration && entry.duration < 2 ? 20 : 40);
    const existing = unlocked.get(key);
    const snd = existing || new Audio(entry.file);
    if (!existing) unlocked.set(key, snd);
    snd.volume = volume;
    snd.currentTime = 0;
    snd.play().catch(() => {
      // Bloqué (pas encore de geste) — on garde l'élément pour plus tard.
    });
  } catch {
    // rien
  }
}

/** Installe le déverrouillage global au premier geste. À appeler une fois
 *  au montage d'une page qui joue des sons. */
export function installSoundUnlock() {
  if (typeof window === 'undefined') return;
  const handler = () => {
    unlockAllSounds();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('touchstart', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('pointerdown', handler, { once: true });
  window.addEventListener('touchstart', handler, { once: true });
  window.addEventListener('keydown', handler, { once: true });
}

/** Joue un son choisi aléatoirement parmi plusieurs clés (variantes). */
export function playRandom(...keys: string[]) {
  if (keys.length === 0) return;
  playSound(keys[Math.floor(Math.random() * keys.length)]);
}

/** Arrête immédiatement un son en cours (pause + rembobine). Sûr si le son
 *  n'est pas en train de jouer — no-op. Utilisé pour couper un jingle quand
 *  l'utilisateur quitte la page (navigation, fermeture, arrière-plan). */
export function stopSound(key: string) {
  const snd = unlocked.get(key);
  if (!snd) return;
  try {
    snd.pause();
    snd.currentTime = 0;
  } catch {
    // élément non jouable — on ignore
  }
}
