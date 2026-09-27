'use client';

// lib/music.ts — La musique de l'accueil et de toute l'app : régée par son
// interrupteur maître « Musique » (Préférences : off = jamais) ET par l'état de
// l'ENCEINTE (blanc = jeu ; orange/rouge = silence). Le bouton « Voix » des
// Préférences est un canal INDÉPENDANT (jingles parlés uniquement) — il ne
// coupe ni ne démarre jamais la musique. Playlist extensible : ajouter une
// entrée à MUSIC_TRACKS (+ fichier + clés i18n) suffit — c'est la piste
// sélectionnée ici qui se lance, par défaut « Vibrations ».

import { getSoundPrefs, musicGloballyAllowed, pauseSound, playLoop, resumeSound, setSoundVolume, soundProgress, stopSound, unlockAllSounds } from '@/lib/sounds';

export type MusicTrackId = 'vibrations' | 'promenades' | 'constellations' | 'silverwell';

export type MusicTrack = {
  id: MusicTrackId;
  key: string;        // clé dans le registre lib/sounds
  dur: number;        // secondes (esthétique du player avant méta réelle)
  premium: boolean;   // true = Initié/Arkane uniquement
  arkaneOnly?: boolean; // true = Arkane uniquement (fréquentation premium)
};

// Ordre = ordre du carrousel. 'vibrations' : offerte à tous.
export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'vibrations', key: 'music-vibrations', dur: 175, premium: false },
  { id: 'promenades', key: 'music-promenades', dur: 174, premium: true },
  { id: 'constellations', key: 'music-constellations', dur: 154, premium: true },
  { id: 'silverwell', key: 'music-silverwell', dur: 153, premium: true, arkaneOnly: true },
];

export const MUSIC_PREFS_EVENT = 'musicprefs-changed';
const VOL_KEY = '***';

export function trackById(id: string | null | undefined): MusicTrack {
  return MUSIC_TRACKS.find((t) => t.id === id) ?? MUSIC_TRACKS[0];
}

export type MusicPrefs = { on: boolean; track: MusicTrackId };

export function getMusicPrefs(): MusicPrefs {
  if (typeof window === 'undefined') return { on: true, track: 'vibrations' };
  try {
    const p = JSON.parse(localStorage.getItem('tarot_prefs') || '{}');
    // Normalisation des anciens ids ('classique'/'premium' → 'vibrations'/'promenades').
    const legacy: Record<string, MusicTrackId> = { classique: 'vibrations', premium: 'promenades' };
    const raw = typeof p.musicTrack === 'string' ? p.musicTrack : '';
    const norm = (MUSIC_TRACKS.some((t) => t.id === raw) ? raw : legacy[raw]) as MusicTrackId | undefined;
    return {
      on: typeof p.musicOn === 'boolean' ? p.musicOn : true,
      track: norm ?? 'vibrations',
    };
  } catch {
    return { on: true, track: 'vibrations' };
  }
}

export function getMusicVolume(): number {
  if (typeof window === 'undefined') return 0.3;
  try {
    const v = parseFloat(localStorage.getItem(VOL_KEY) || '');
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.3;
  } catch { return 0.3; }
}

export function setMusicVolume(v: number) {
  try { localStorage.setItem(VOL_KEY, String(v)); } catch { /* ignore */ }
  // Ajuste le volume SANS relancer une piste mise en pause par le player.
  setSoundVolume(trackById(getMusicPrefs().track).key, v);
}

/** Applique la préférence au moteur : une seule piste à la fois ; coupée si
 *  l'interrupteur maître est off (ou les voix coupées — canal partagé).
 *  CONTINUITÉ TOTALE : si l'élément audio de la piste existe déjà (il survit
 *  aux navigations SPA), on le reprend là où il en était — JAMAIS de
 *  rembobinage entre deux pages. Only cold start uses playLoop. */
let roomActive = false;
/** Tant que le player des Préférences est monté (« salle d'écoute »), la
 *  lecture lui appartient : applyMusicPrefs ne pause/reprend RIEN (le player
 *  peut écouter une piste même enceinte coupée). À la sortie, on réapplique
 *  la règle globale — reprise si enceinte blanche, silence sinon. */
export function setMusicRoomActive(v: boolean) {
  roomActive = v;
  if (!v) applyMusicPrefs();
}
/** true = le player des Préférences est ouvert (salle d'écoute) : la pause
 *  onglet-caché ne s'applique pas, l'utilisateur y gère lui-même sa lecture. */
export function isMusicRoomActive(): boolean { return roomActive; }

export function applyMusicPrefs() {
  const { on, track } = getMusicPrefs();
  const t = trackById(track);
  for (const o of MUSIC_TRACKS) if (o.id !== track) stopSound(o.key);
  if (!on) { stopSound(t.key); return; }
  if (roomActive) return;
  // Régie globale : le maître « Musique » (ci-dessus) + l'ENCEINTE (blanc =
  // jeu ; orange/rouge = silence). Le bouton « Voix » des Préférences est
  // INDÉPENDANT de la musique — il ne coupe plus jamais l'ambiance.
  if (musicGloballyAllowed()) {
    const s = soundProgress(t.key);
    if (s.playing) return;                                  // déjà en place → rien toucher
    if (s.time > 0) { resumeSound(t.key, getMusicVolume()); return; } // en pause (player) → reprise SANS rembobiner
    playLoop(t.key, getMusicVolume());                      // jamais jouée → démarrage boucle
  } else if (soundProgress(t.key).playing) {
    pauseSound(t.key); // enceinte coupée → silence global SANS rembobiner
  }
}

/** Choisir une piste (le carrousel) : rembobine et repart si la musique est on. */
export function setMusicTrack(id: MusicTrackId) {
  writePrefs({ musicTrack: id });
  const t = trackById(id);
  for (const other of MUSIC_TRACKS) if (other.id !== id) stopSound(other.key);
  if (getMusicPrefs().on) playLoop(t.key, getMusicVolume(), { ignoreVoices: true });
  notify();
}

/** Interrupteur maître « Musique ». Depuis la séparation des canaux, il ne
 *  touche PLUS aux voix : la musique est régée par ce maître + l'enceinte
 *  (speakerState) uniquement. */
export function setMusicOn(on: boolean) {
  writePrefs({ musicOn: on });
  if (on) unlockAllSounds();
  applyMusicPrefs();
  notify();
}

function writePrefs(patch: Record<string, unknown>) {
  try {
    const p = JSON.parse(localStorage.getItem('tarot_prefs') || '{}');
    localStorage.setItem('tarot_prefs', JSON.stringify({ ...p, ...patch }));
  } catch { /* ignore */ }
}

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MUSIC_PREFS_EVENT));
}
