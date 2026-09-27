'use client';

// components/music-ambience.tsx
// Ambiance musicale hors landing : la piste choisie sur l'accueil (via la
// préférence « Musique ») continue de jouer sur les pages /runes, /tarot,
// /yi-jing, /des-divinatoires, « Mon espace » (dashboard) et toutes les
// pages d'univers. Règles identiques à la landing, garanties par
// applyMusicPrefs() :
//   - maître « Musique » OFF (Préférences)  → jamais ;
//   - enceinte sur voix coupée (blanc/orange) → silence ; réactivation = reprise ;
//   - onglet caché → pause ; retour → reprise.
// La landing (/) garde sa propre logique (enceinte visible) : on s'efface.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MUSIC_PREFS_EVENT, MUSIC_TRACKS, applyMusicPrefs } from '@/lib/music';
import { SOUND_PREFS_EVENT, pauseSound } from '@/lib/sounds';

export default function MusicAmbience() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === '/') return; // la landing gère elle-même
    const start = () => applyMusicPrefs();
    const onVisibility = () => {
      // Onglet caché = pause SANS rembobiner ; retour = reprise exacte.
      if (document.hidden) for (const tk of MUSIC_TRACKS) pauseSound(tk.key);
      else start();
    };
    // Tenter dès le montage (APK) ; le 1er geste relancera si l'autoplay est
    // bloqué — playLoop() garde le slot armé. applyMusicPrefs() n'est JAMAIS
    // un rembobinage : si la piste joue déjà, il ne touche à rien (continuité
    // totale entre les pages).
    start();
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('touchstart', start, { once: true });
    window.addEventListener(SOUND_PREFS_EVENT, start);
    window.addEventListener(MUSIC_PREFS_EVENT, start);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      // PAS de stop au démontage : la navigation vers une autre page doit
      // garder le morceau en cours, sans reprise depuis le début.
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('touchstart', start);
      window.removeEventListener(SOUND_PREFS_EVENT, start);
      window.removeEventListener(MUSIC_PREFS_EVENT, start);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  return null;
}
