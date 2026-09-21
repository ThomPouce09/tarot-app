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
  /** true = « voix » (jingles nommés d'après une page) : contrôlé par la
   *  préférence Voix ; false/absent = effet sonore : préférence Effets. */
  voice?: boolean;
  /** true = musique d'ambiance (canal INDÉPENDANT des voix/effets — c'est
   *  l'interrupteur « Musique » des Préférences qui la régit, vérifié par
   *  l'appelant). stopVoices/stopAllSounds ne touchent jamais ces pistes. */
  music?: boolean;
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
  { key: 'coin-shake', file: '/audio/coin-shake.mp3', category: 'yi-jing', label: 'Pièces brassées', duration: 4.25, usage: 'Double Hexagramme — secousse des pièces dans le bol' },
  { key: 'coin-table', file: '/audio/coin-table.mp3', category: 'yi-jing', label: 'Pièces versées sur la table', duration: 2.09, usage: 'Double Hexagramme — jet des pièces (versement)' },
  { key: 'sticks-pile', file: '/audio/sticks-pile.mp3', category: 'yi-jing', label: 'Pile de tiges 1', duration: 1.45, usage: 'Double — dressage des 6 traits (6 sons de bambous)' },
  { key: 'sticks-pile2', file: '/audio/sticks-pile2.mp3', category: 'yi-jing', label: 'Pile de tiges 2', duration: 2.00, usage: 'Double — dressage des 6 traits' },
  { key: 'sticks-pile3', file: '/audio/sticks-pile3.mp3', category: 'yi-jing', label: 'Pile de tiges 3', duration: 3.00, usage: 'Double — dressage des 6 traits' },
  { key: 'sticks-pile4', file: '/audio/sticks-pile4.mp3', category: 'yi-jing', label: 'Pile de tiges 4', duration: 2.20, usage: 'Double — dressage des 6 traits' },
  { key: 'sticks-pile5', file: '/audio/sticks-pile5.mp3', category: 'yi-jing', label: 'Pile de tiges 5', duration: 1.76, usage: 'Double — dressage des 6 traits' },
  { key: 'spell', file: '/audio/spell.mp3', category: 'yi-jing', label: 'Sort (révélation)', duration: 2.10, usage: 'Révélation / effet magique' },

  // ── Ambiance / UI ──────────────────────────────────────────────────────
  { key: 'des-divinatoires', file: '/audio/des-divinatoires.mp3', category: 'ambient', label: 'Ouverture Dés du Zodiaque', duration: 4.86, usage: 'Jingle à l\'ouverture de la page /des-divinatoires', voice: true },
  { key: 'runes', file: '/audio/runes.mp3', category: 'ambient', label: 'Ouverture Runes', duration: 11.52, usage: 'Jingle à l\'ouverture de la page /runes', voice: true },
  { key: 'tarot2', file: '/audio/tarot2.mp3', category: 'ambient', label: 'Ouverture Tarot', duration: 10.29, usage: 'Jingle à l\'ouverture de la page /tarot', voice: true },
  { key: 'yi-jing', file: '/audio/yi-jing.mp3', category: 'ambient', label: 'Ouverture Yi Jing', duration: 8.12, usage: 'Jingle à l\'ouverture de la page /yi-jing', voice: true },
  { key: 'scroll1', file: '/audio/scroll1.mp3', category: 'ui', label: 'Parchemin 1', duration: 0.90, usage: 'Menu parchemin — ouverture' },
  { key: 'mute-unmute', file: '/audio/mute-unmute.mp3', category: 'ui', label: 'Micro coupé/rouvert', duration: 0.21, usage: 'Enceinte — couper voix / remettre voix et effets' },
  { key: 'barman-apparition', file: '/audio/barman-apparition.mp3', category: 'ui', label: 'Apparition du barman', duration: 1.9, usage: 'Pause repas — clic sur le barman (bulle qui ouvre)' },
  { key: 'spell2', file: '/audio/spell2.mp3', category: 'ui', label: 'Sort (variante 2)', duration: 8.0, usage: 'Révélation magique — message du barman' },
  { key: 'spell3', file: '/audio/spell3.mp3', category: 'ui', label: 'Sort (variante 3)', duration: 3.1, usage: 'Révélation magique — message du barman' },
  { key: 'spell4', file: '/audio/spell4.mp3', category: 'ui', label: 'Sort (variante 4)', duration: 8.0, usage: 'Révélation magique — message du barman' },
  { key: 'spell5', file: '/audio/spell5.mp3', category: 'ui', label: 'Sort (variante 5)', duration: 8.0, usage: 'Révélation magique — message du barman' },
  { key: 'music-vibrations', file: '/audio/music-vibrations.mp3', category: 'ambient', label: 'Vibrations (musique d’accueil)', duration: 175, usage: 'Boucle d’ambiance de la page d’accueil — tous les comptes', voice: true, music: true },
  { key: 'music-promenades', file: '/audio/music-promenades.mp3', category: 'ambient', label: 'Promenades (musique premium)', duration: 174, usage: 'Boucle d’ambiance réservée Initié/Arkane', voice: true, music: true },
  { key: 'creatures1', file: '/audio/creatures1.mp3', category: 'ambient', label: 'Créature 1', duration: 1.20, usage: 'Tap sur la luciole — variant 1' },
  { key: 'creatures2', file: '/audio/creatures2.mp3', category: 'ambient', label: 'Créature 2', duration: 1.00, usage: 'Tap sur la luciole — variant 2' },
  { key: 'creatures3', file: '/audio/creatures3.mp3', category: 'ambient', label: 'Créature 3', duration: 1.10, usage: 'Tap sur la luciole — variant 3' },
  { key: 'creatures4', file: '/audio/creatures4.mp3', category: 'ambient', label: 'Créature 4', duration: 1.00, usage: 'Tap sur la luciole — variant 4' },
  { key: 'creatures5', file: '/audio/creatures5.mp3', category: 'ambient', label: 'Créature 5', duration: 1.60, usage: 'Tap sur la luciole — variant 5' },
  { key: 'cadeau', file: '/audio/cadeau.mp3', category: 'ambient', label: 'Cadeau magique', duration: 2.00, usage: 'Cadeau des créatures — message offert réclamé' },

  // ── Sons magiques (propositions pour la révélation /nornes2, page /son-a-supprimer)
  { key: 'magic-1', file: '/audio/magic-1.mp3', category: 'ui', label: 'Carillon ascendant', duration: 2.40, usage: 'Révélation magique — do-mi-sol-do + shimmer' },
  { key: 'magic-2', file: '/audio/magic-2.mp3', category: 'ui', label: 'Pentatonique rapide', duration: 2.20, usage: 'Révélation magique — gamme rapide 8 notes' },
  { key: 'magic-3', file: '/audio/magic-3.mp3', category: 'ui', label: 'Cloches lointaines', duration: 2.80, usage: 'Révélation magique — cloches longue traîne' },
  { key: 'magic-4', file: '/audio/magic-4.mp3', category: 'ui', label: 'Scintillement féerique', duration: 2.00, usage: 'Révélation magique — glissando aigu + clochettes' },
  { key: 'magic-5', file: '/audio/magic-5.mp3', category: 'ui', label: 'Gong profond', duration: 3.00, usage: 'Révélation magique — gong grave + shimmer' },
  { key: 'magic-6', file: '/audio/magic-6.mp3', category: 'ui', label: 'Glissando de harpe', duration: 2.00, usage: 'Révélation magique — cordes pincées rapides' },
  { key: 'magic-7', file: '/audio/magic-7.mp3', category: 'ui', label: 'Boîte à musique', duration: 2.20, usage: 'Révélation magique — timbre sec motif G-B-D-G' },
  { key: 'magic-8', file: '/audio/magic-8.mp3', category: 'ui', label: 'Brume éthérée', duration: 2.60, usage: 'Révélation magique — nappe + cloche' },
  { key: 'magic-9', file: '/audio/magic-9.mp3', category: 'ui', label: 'Retour de vague', duration: 2.40, usage: 'Révélation magique — swell inversé + cloche' },
  { key: 'magic-10', file: '/audio/magic-10.mp3', category: 'ui', label: 'Triple étincelle', duration: 2.40, usage: 'Révélation magique — 3 clochettes aiguës + traîne' },
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
/*  Préférences son (tarot_prefs → localStorage)                           */
/* ----------------------------------------------------------------------- */

/** Préférences son en cache (lues au premier usage, mises à jour par la
 *  page /preferences ou l'enceinte flottante via setSoundPrefs). */
let soundPrefsCache: { soundEffects: boolean; voices: boolean } | null = null;

/** Événement window dispatché à chaque changement des préférences son —
 *  écouté par SpeakerToggle pour rester synchronisé. */
export const SOUND_PREFS_EVENT = 'soundprefs-changed';

function readPrefsFromStorage(): { soundEffects: boolean; voices: boolean } {
  const def = { soundEffects: true, voices: true };
  if (typeof window === 'undefined') return def;
  try {
    const raw = localStorage.getItem('tarot_prefs');
    if (!raw) return def;
    const p = JSON.parse(raw);
    return {
      soundEffects: typeof p.soundEffects === 'boolean' ? p.soundEffects : true,
      voices: typeof p.voices === 'boolean' ? p.voices : true,
    };
  } catch {
    return def;
  }
}

/** Préférences son actuelles (cache). */
export function getSoundPrefs() {
  if (!soundPrefsCache) soundPrefsCache = readPrefsFromStorage();
  return soundPrefsCache;
}

/** Met à jour les préférences son — appelé par la page /preferences ou SpeakerToggle. */
export function setSoundPrefs(soundEffects: boolean, voices: boolean) {
  soundPrefsCache = { soundEffects, voices };
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('tarot_prefs');
    const p = raw ? JSON.parse(raw) : {};
    p.soundEffects = soundEffects;
    p.voices = voices;
    localStorage.setItem('tarot_prefs', JSON.stringify(p));
    window.dispatchEvent(new Event(SOUND_PREFS_EVENT));
  } catch {
    // stockage indisponible — le cache suffit pour la session
  }
}

/** Effets sonores activés ? (faux = playSound est muet) */
export function isEffectsEnabled() {
  return getSoundPrefs().soundEffects;
}

/** Voix activées ? (jingles « voix » des pages, contrôlés par la préférence Voix) */
export function isVoicesEnabled() {
  return getSoundPrefs().voices;
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
    // Chaque son suit sa préférence : voix (jingles de page + musique) vs effets.
    if (s.voice ? !isVoicesEnabled() : !isEffectsEnabled()) continue;
    // Musique : respect aussi son interrupteur maître « Musique » (lib/music) —
    // éteinte = même le pré-déverrouillage muet est annulé.
    if (s.music) {
      try {
        const p = JSON.parse(localStorage.getItem('tarot_prefs') || '{}');
        if (p.musicOn === false) continue;
      } catch { /*_prefs illisibles → on déverrouille quand même */ }
    }
    try {
      if (unlocked.has(s.key)) continue;
      const a = new Audio(s.file);
      a.volume = 0;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          // NE JAMAIS écraser un élément déjà enregistré : si playLoop() a créé
          // son élément entre-temps (le même premier geste déclenche le pré-
          // déverrouillage ET le démarrage de la musique), écraser la map laisse
          // un élément ORPHELIN en lecture que plus personne ne peut couper —
          // c'était le « l'enceinte ne stoppe plus la musique » sur l'APK.
          if (!unlocked.has(s.key)) unlocked.set(s.key, a);
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
  // Voix (jingles de page + musique) suivent la préférence « Voix » ; le reste,
  // « Effets ». La musique obéit AUSSI à son interrupteur maître « Musique »
  // (lib/music), vérifié par l'appelant avant playLoop().
  if (entry.voice ? !isVoicesEnabled() : !isEffectsEnabled()) return;
  try {
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

/** Joue un son en BOUCLE (musique d'ambiance). Même contrat que playSound :
 *  respect la préférence (voix/effets), élément pré-déverrouillé réutilisé.
 *  Si le browser rejette le play() (politique autoplay sans geste valide), on
 *  re-tente silencieusement au geste suivant — un seul slot de re-tentative. */
let retrySlot: { key: string; volume: number } | null = null;
const retryGesture = () => { if (retrySlot) playLoop(retrySlot.key, retrySlot.volume); };
export function playLoop(key: string, volume = 0.5): void {
  const entry = BY_KEY[key];
  if (!entry) return;
  if (entry.voice ? !isVoicesEnabled() : !isEffectsEnabled()) return;
  try {
    let snd = unlocked.get(key);
    if (!snd) { snd = new Audio(entry.file); unlocked.set(key, snd); }
    snd.loop = true;
    snd.volume = volume;
    snd.play().then(() => {
      retrySlot = null;
      window.removeEventListener('pointerdown', retryGesture);
      window.removeEventListener('touchstart', retryGesture);
    }).catch(() => {
      // Rejeté (pas encore de geste valide) → re-tente à chaque geste.
      retrySlot = { key, volume };
      window.removeEventListener('pointerdown', retryGesture);
      window.removeEventListener('touchstart', retryGesture);
      window.addEventListener('pointerdown', retryGesture);
      window.addEventListener('touchstart', retryGesture);
    });
  } catch { /* rien */ }
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
  // Purge aussi une re-tentative de boucle en attente (sinon le prochain
  // geste relancerait un qu'on vient d'éteindre — arrêt = arrêt DÉFINITIF).
  if (retrySlot?.key === key) {
    retrySlot = null;
    window.removeEventListener('pointerdown', retryGesture);
    window.removeEventListener('touchstart', retryGesture);
  }
  if (!snd) return;
  try {
    snd.pause();
    snd.currentTime = 0;
  } catch {
    // élément non jouable — on ignore
  }
}

/** Pause SANS rembobiner (reprise possible où elle s'est arrêtée) — pour le
 *  player « Musique » des préférences. */
export function pauseSound(key: string) {
  try { unlocked.get(key)?.pause(); } catch { /* ignore */ }
}

/** Reprend un son en pause (ou le démarre) sans rembobiner. */
export function resumeSound(key: string, volume?: number) {
  const snd = unlocked.get(key);
  if (!snd) return false;
  if (typeof volume === 'number') snd.volume = volume;
  snd.play().catch(() => { /* geste requis — le player retentera au clic */ });
  return true;
}

/** Le son est-il en train de jouer ? (pour l'affichage ▶/⏸ du player) */
export function isSoundPlaying(key: string): boolean {
  const snd = unlocked.get(key);
  return !!snd && !snd.paused;
}

/** Ajuste le volume d'un son déjà enregistré (fondu du player). */
export function setSoundVolume(key: string, volume: number) {
  const snd = unlocked.get(key);
  if (snd) snd.volume = volume;
}

/** Position de lecture d'un son (pour la progression du player musique). */
export function soundProgress(key: string): { playing: boolean; time: number; dur: number } {
  const snd = unlocked.get(key);
  if (!snd) return { playing: false, time: 0, dur: 0 };
  return { playing: !snd.paused, time: snd.currentTime || 0, dur: snd.duration || 0 };
}

/** Arrête les VOIX (jingles de page) en cours — utilisé par l'enceinte
 *  quand la préférence Voix passe à off (les effets, eux, continuent). */
export function stopVoices() {
  if (typeof window === 'undefined') return;
  // Coupure = arrêt définitif : le slot de re-tentative (autoplay bloqué)
  // ne doit pas relancer la musique au geste suivant.
  if (retrySlot) {
    const re = BY_KEY[retrySlot.key];
    if (re && re.voice) { retrySlot = null; window.removeEventListener('pointerdown', retryGesture); window.removeEventListener('touchstart', retryGesture); }
  }
  for (const s of SOUNDS) {
    if (!s.voice) continue; // la musique (voice+music) est coupée avec les voix
    const snd = unlocked.get(s.key);
    if (!snd) continue;
    try {
      snd.pause();
      snd.currentTime = 0;
    } catch {
      // élément non jouable — on ignore
    }
  }
}

/** Arrête TOUS les sons en cours (pause + rembobine). Utilisé quand on quitte
 *  un contexte (ex. fermeture du tutoriel) pour ne laisser aucune piste jouer. */
export function stopAllSounds() {
  if (typeof window === 'undefined') return;
  if (retrySlot) { retrySlot = null; window.removeEventListener('pointerdown', retryGesture); window.removeEventListener('touchstart', retryGesture); }
  unlocked.forEach((snd) => {
    try {
      snd.pause();
      snd.currentTime = 0;
    } catch {
      // élément non jouable — on ignore
    }
  });
}
