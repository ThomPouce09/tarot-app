'use client';

// components/music-player.tsx
// Le player « Musique de l'accueil » des Préférences, sous la section Son :
// carrousel de pistes (extensible — ça ne sature pas l'espace quand on ajoute
// des morceaux), galette tournante play/pause, progression, volume, et
// interrupteur maître. La musique est un canal « voix » : l'enceinte la coupe
// avec les voix, l'interrupteur maître la coupe seul (lib/music).
// Codes couleur de « Mon espace » : violet/mauve (pas de bordeaux ici).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '@/lib/i18n';
import { pauseSound, playLoop, soundProgress } from '@/lib/sounds';
import {
  MUSIC_PREFS_EVENT, MUSIC_TRACKS, getMusicPrefs, getMusicVolume, setMusicOn,
  setMusicTrack, setMusicVolume, trackById, type MusicTrack,
} from '@/lib/music';

const VIOLET = '#8B5CF6';
const VIOLET_PALE = '#C4B5FD';
const IVORY = '#F5EAD6';
const SUBTLE = 'rgba(245,234,214,0.62)';
const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export default function MusicPlayer({ level }: { level: 'apprenti' | 'initie' | 'arkane' }) {
  const t = useT();
  const router = useRouter();
  const [sel, setSel] = useState(trackById(getMusicPrefs().track).id);
  const [enabled, setEnabled] = useState(getMusicPrefs().on);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState({ time: 0, dur: 0 });
  const [vol, setVol] = useState(getMusicVolume());

  const current: MusicTrack = trackById(sel);
  const locked = current.premium && level === 'apprenti';

  // L'Apprenti ne reste jamais sur une piste scellée → retour à la base.
  useEffect(() => {
    if (locked) { setSel('vibrations'); setMusicTrack('vibrations'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // Boucle d'affichage : position/état réels de la piste (barre + galette).
  useEffect(() => {
    const iv = setInterval(() => {
      const s = soundProgress(current.key);
      setPlaying(s.playing);
      setPos({ time: s.time, dur: s.dur || current.dur });
    }, 500);
    return () => clearInterval(iv);
  }, [current.key, current.dur]);

  // Resynchronise quand la landing/le storage change la préférence.
  useEffect(() => {
    const sync = () => { const p = getMusicPrefs(); setSel(p.track); setEnabled(p.on); };
    window.addEventListener(MUSIC_PREFS_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(MUSIC_PREFS_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // ── Transport ──────────────────────────────────────────────────────
  const togglePlay = () => {
    if (locked) { router.push('/dashboard/account/abonnement'); return; }
    if (!enabled) { setMusicOn(true); setPlaying(true); return; } // joue = réarme le maître
    if (playing) { pauseSound(current.key); setPlaying(false); return; }
    playLoop(current.key, vol);
    setPlaying(true); // l'intervalle corrigera si le browser a bloqué
  };

  const changeVol = (v: number) => { setVol(v); setMusicVolume(v); };

  const switchTrack = (dir: 1 | -1) => {
    const i = MUSIC_TRACKS.findIndex((tk) => tk.id === sel);
    const nt = MUSIC_TRACKS[(i + dir + MUSIC_TRACKS.length) % MUSIC_TRACKS.length];
    choose(nt.id);
  };

  const choose = (id: MusicTrack['id']) => {
    if (id === sel) return;
    const tr = trackById(id);
    if (tr.premium && level === 'apprenti') { router.push('/dashboard/account/abonnement'); return; }
    setSel(id);
    setPos({ time: 0, dur: tr.dur });
    setMusicTrack(id);
  };

  const pct = pos.dur ? Math.min(100, (pos.time / pos.dur) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Bandeau piste actuelle (carrousel) */}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => switchTrack(-1)} aria-label={t('music.prev')} title={t('music.prev')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
          style={{ color: VIOLET_PALE, border: `1px solid ${VIOLET}66`, background: 'rgba(139,92,246,0.10)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm uppercase tracking-[0.25em]" style={{ color: VIOLET_PALE, fontFamily: 'var(--font-cinzel-deco), serif' }}>
            {t(`music.track.${current.id}`)}
          </p>
          <p className="truncate text-[10px] mt-0.5" style={{ color: SUBTLE }}>
            {t(current.premium ? (locked ? 'music.locked' : `music.sub.${current.id}`) : `music.sub.${current.id}`)}
          </p>
        </div>
        <button type="button" onClick={() => switchTrack(1)} aria-label={t('music.next')} title={t('music.next')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
          style={{ color: VIOLET_PALE, border: `1px solid ${VIOLET}66`, background: 'rgba(139,92,246,0.10)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>
        </button>
      </div>

      {/* Piste de selection des puces */}
      <div className="flex items-center justify-center gap-2">
        <AnimatePresence initial={false}>
          {MUSIC_TRACKS.map((tk) => (
            <motion.button key={tk.id} type="button" layout onClick={() => choose(tk.id)}
              aria-label={t(`music.track.${tk.id}`)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: tk.id === sel ? 22 : 8,
                background: tk.id === sel ? `linear-gradient(90deg, ${VIOLET}, ${VIOLET_PALE})` : `${VIOLET}44`,
                boxShadow: tk.id === sel ? `0 0 8px ${VIOLET}99` : 'none',
              }} />
          ))}
        </AnimatePresence>
        <span className="ml-2 text-[10px]" style={{ color: SUBTLE }}>
          {MUSIC_TRACKS.findIndex((tk) => tk.id === sel) + 1} / {MUSIC_TRACKS.length}
        </span>
      </div>

      {/* Galette + progression + volume */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={togglePlay} aria-label={t('music.play')}
          className="relative h-16 w-16 shrink-0 rounded-full"
          style={{ border: `1.5px solid ${VIOLET}66`, background: 'radial-gradient(circle at 38% 34%, #2B1D4A 0%, #17101F 62%, #0B0605 100%)' }}>
          <motion.span className="absolute inset-2 rounded-full"
            animate={playing ? { rotate: 360 } : {}}
            transition={playing ? { repeat: Infinity, duration: 6, ease: 'linear' } : { duration: 0.3 }}
            style={{ border: `1px solid ${VIOLET}33`, background: `conic-gradient(from 0deg, ${VIOLET}22, transparent 25%, ${VIOLET}22 50%, transparent 75%, ${VIOLET}22)` }} />
          <span className="absolute inset-0 flex items-center justify-center" style={{ color: VIOLET_PALE }}>
            {locked ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
            ) : playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2" /><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z" /></svg>
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[11px] uppercase tracking-[0.2em]" style={{ color: `${VIOLET_PALE}cc` }}>{t('music.nowPlaying')}</p>
            <span className="text-[10px] tabular-nums" style={{ color: SUBTLE }}>{fmt(pos.time)} / {fmt(pos.dur)}</span>
          </div>
          <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full" style={{ background: `${VIOLET}22` }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${VIOLET}, ${VIOLET_PALE})` }} />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={VIOLET} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 9v6h4l5 4V5L9 9z" /><path d="M17.5 8.5a5 5 0 0 1 0 7" /></svg>
            <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => changeVol(Number(e.target.value))}
              className="w-full accent-violet-500" style={{ height: 14 }} aria-label={t('music.volume')} />
          </div>
        </div>
      </div>

      {/* Interrupteur maître */}
      <div className="flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5" style={{ border: `1px solid ${VIOLET}33`, background: 'rgba(139,92,246,0.05)' }}>
        <p className="text-[11px] leading-snug" style={{ color: IVORY }}>{t('music.onLabel')}</p>
        <button type="button" role="switch" aria-checked={enabled}
          onClick={() => { const nv = !enabled; setEnabled(nv); setMusicOn(nv); }}
          className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
          style={{ background: enabled ? `linear-gradient(180deg, ${VIOLET_PALE}, ${VIOLET})` : 'rgba(255,255,255,0.12)' }}>
          <span className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all"
            style={{ left: enabled ? 24 : 2, background: enabled ? '#1E1533' : '#6b6257', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
        </button>
      </div>
    </div>
  );
}
