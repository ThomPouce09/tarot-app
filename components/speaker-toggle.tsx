'use client';

// components/speaker-toggle.tsx — Enceinte flottante (landing + hubs d'oracles).
// Réflette les préférences son (Voix / Effets sonores) et les pilote d'un tap :
//   1 clic : coupe les voix   2e clic : coupe aussi les effets   3e clic : tout réactive.
// Couleurs : blanc légèrement opaque = voix + effets ; orange = effets seuls ; rouge = tout coupé.
// Position : fixée en haut à droite, SOUS le bouton menu (YiSlideNav : right-1, 32px de haut).

import { useEffect, useRef, useState } from 'react';
import { getSoundPrefs, setSoundPrefs, unlockAllSounds, playSound, stopVoices, stopAllSounds, SOUND_PREFS_EVENT } from '@/lib/sounds';
import { useT } from '@/lib/i18n';

type SpeakerState = 'all' | 'effects' | 'muted';

function stateOf(voices: boolean, effects: boolean): SpeakerState {
  if (!voices && !effects) return 'muted';   // rouge = tout désactivé
  if (!voices) return 'effects';             // orange = sons seuls
  return 'all';                              // blanc = voix actives (avec ou sans effets)
}

// Ordre des clics : all → effects seules → muet → tout réactivé.
function nextState(cur: SpeakerState): SpeakerState {
  return cur === 'all' ? 'effects' : cur === 'effects' ? 'muted' : 'all';
}

const COLOR: Record<SpeakerState, string> = {
  all: 'rgba(255,255,255,0.75)',     // blanc légèrement opaque
  effects: 'rgba(245,158,11,0.9)',   // orange
  muted: 'rgba(239,68,68,0.9)',      // rouge
};

export default function SpeakerToggle({ top = 38, right = 7, z = 55 }: { top?: number; right?: number; z?: number }) {
  const t = useT();
  const [state, setState] = useState<SpeakerState>('all');
  // Bulle informative (bas de l'écran) : affichée ~2,2s à chaque changement d'état.
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronise l'affichage avec les préférences (page Préférences, enceinte, autre onglet).
  const sync = () => {
    const p = getSoundPrefs();
    setState(stateOf(p.voices, p.soundEffects));
  };
  useEffect(() => {
    sync();
    window.addEventListener(SOUND_PREFS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SOUND_PREFS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cycle = () => {
    const next = nextState(state);
    // Signature : setSoundPrefs(soundEffects, voices) — EFFETS en 1er argument !
    if (next === 'all') setSoundPrefs(true, true);           // tout réactiver   (blanc)
    else if (next === 'effects') setSoundPrefs(true, false);  // effets ON, voix OFF (orange)
    else setSoundPrefs(false, false);                          // tout couper      (rouge)
    // Coupe IMMÉDIATEMENT les pistes déjà en cours : sans ça, un jingle de page
    // (jusqu'à 11 s) continue alors que la préférence vient de passer à off.
    if (next === 'effects') stopVoices();
    else if (next === 'muted') stopAllSounds();
    else unlockAllSounds();
    if (next !== 'muted') playSound('scroll1', 0.35); // acquittement bref (effets actifs)
    // Bulle : texte du NOUVEL état.
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(next === 'all' ? t('speaker.toast.all') : next === 'effects' ? t('speaker.toast.effects') : t('speaker.toast.muted'));
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const label =
    state === 'all' ? t('speaker.all') : state === 'effects' ? t('speaker.effects') : t('speaker.muted');
  const c = COLOR[state];

  return (
    <>
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="fixed flex h-9 w-9 items-center justify-center rounded-full opacity-60 backdrop-blur-[2px] transition-all duration-300 hover:scale-110 hover:opacity-100 active:scale-95"
      style={{
        top,
        right,
        zIndex: z,
        background: 'rgba(26,14,10,0.28)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: c,
        boxShadow: 'none',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* corps du haut-parleur */}
        <path d="M11 5 6 9H2v6h4l5 4V5z" fill={c} stroke="none" opacity="0.9" />
        {state === 'all' && (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 6a9 9 0 0 1 0 12" />
          </>
        )}
        {state === 'effects' && <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
        {state === 'muted' && (
          <>
            <path d="m16 9 6 6" />
            <path d="m22 9-6 6" />
          </>
        )}
      </svg>
    </button>
    {/* Bulle informative éphémère — bas de l'écran, état des réglages son */}
    {toast && (
      <span className="speaker-toast" role="status" aria-live="polite">
        {toast}
      </span>
    )}
    </>
  );
}
