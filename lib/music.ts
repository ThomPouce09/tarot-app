'use client';

// lib/music.ts — La musique d'accueil : piste de la préférence « Voix » (les
// coupes avec l'enceinte), régie EN PLUS par son interrupteur maître « Musique »
// dans les Préférences : off = jamais de musique ; on = joue tant que les voix
// sont actives (l'allumer ici réactive les voix si besoin). Playlist extensible :
// ajouter une entrée à MUSIC_TRACKS (+ fichier + clés i18n) suffit — c'est la
// piste sélectionnée ici qui se lance sur l'accueil, par défaut « Vibrations ».

import { getSoundPrefs, isVoicesEnabled, playLoop, resumeSound, setSoundPrefs, setSoundVolume, soundProgress, stopSound, unlockAllSounds } from '@/lib/sounds';

export type MusicTrackId = 'vibrations' | 'promenades';

export type MusicTrack = {
  id: MusicTrackId;
  key: string;        // clé dans le registre lib/sounds
  dur: number;        // secondes (esthétique du player avant méta réelle)
  premium: boolean;   // true = Initié/Arkane uniquement
};

// Ordre = ordre du carrousel. 'vibrations' : offerte à tous.
export const MUSIC_TRACKS: MusicTrack[] = [
  { id: 'vibrations', key: 'music-vibrations', dur: 175, premium: false },
  { id: 'promenades', key: 'music-promenades', dur: 174, premium: true },
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
export function applyMusicPrefs() {
  const { on, track } = getMusicPrefs();
  const t = trackById(track);
  for (const o of MUSIC_TRACKS) if (o.id !== track) stopSound(o.key);
  if (!on) { stopSound(t.key); return; }
  if (isVoicesEnabled()) {
    const s = soundProgress(t.key);
    if (s.playing) return;                                  // déjà en place → rien toucher
    if (s.time > 0) { resumeSound(t.key, getMusicVolume()); return; } // en pause (player) → reprise SANS rembobiner
  }
  playLoop(t.key, getMusicVolume()); // jamais jouée (ou voix coupées) → démarrage boucle
}

/** Choisir une piste (le carrousel) : rembobine et repart si la musique est on. */
export function setMusicTrack(id: MusicTrackId) {
  writePrefs({ musicTrack: id });
  const t = trackById(id);
  for (const other of MUSIC_TRACKS) if (other.id !== id) stopSound(other.key);
  if (getMusicPrefs().on) playLoop(t.key, getMusicVolume());
  notify();
}

/** Interrupteur maître. La musique vivant sur le canal voix, l'allumer
 *  réactive les voix si l'enceinte les avait coupées (sinon la case « Musique
 *  ON » serait muette — l'ancien « bouton qui ne fonctionne pas »). */
export function setMusicOn(on: boolean) {
  writePrefs({ musicOn: on });
  if (on) {
    const p = getSoundPrefs();
    if (!p.voices) setSoundPrefs(p.soundEffects, true);
    unlockAllSounds();
  }
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
