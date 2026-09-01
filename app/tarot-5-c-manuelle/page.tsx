'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TarotApp from '@/app/components/tarot-app';
import YiSlideNav from '@/components/yi-slide-nav';
import AuthGate from '@/components/auth-gate';

const TOTAL_PICKS = 5;

/* Positions des 5 cartes (croix) — mêmes labels/icons que la croix existante. */
const POSITION_LABELS = ["L'Orient", "L'Occident", 'Le Sommet', 'La Base', 'La Synthèse'];
const POSITION_ICONS = ['☀', '☽', '✦', '❋', '✧'];

/* Disposition en croix (1 en haut, 3 au milieu, 1 en bas) — ordre d'affichage
   = sommet, orient, synthèse, occident, base. */
const CROSS_LAYOUT = [
  { area: 'a0', label: 'Le Sommet', icon: '✦' },
  { area: 'a1', label: "L'Orient", icon: '☀' },
  { area: 'a2', label: 'La Synthèse', icon: '✧' },
  { area: 'a3', label: "L'Occident", icon: '☽' },
  { area: 'a4', label: 'La Base', icon: '❋' },
];

function TarotUpgradePage() {
  const router = useRouter();

  // AUTH GUARD: redirect if not logged in
  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (!stored) {
      router.replace('/auth/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!parsed?.email) {
        router.replace('/auth/login');
        return;
      }
    } catch {
      router.replace('/auth/login');
      return;
    }
  }, [router]);

  const [phase, setPhase] = useState<'question' | 'drawing'>('question');

  const [questionText, setQuestionText] = useState('');
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);

  useEffect(() => {
    if (phase === 'question') {
      const attemptPlay = () => {
        if (videoRef.current) {
          videoRef.current
            .play()
            .then(() => {
              setVideoStarted(true);
            })
            .catch((error) => {
              console.log('Autoplay bloqué : ', error);
            });
        }
      };
      attemptPlay();
      const timer = setTimeout(attemptPlay, 150);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Pas d'autofocus sur le champ question : l'utilisateur doit cliquer une
  // première fois pour commencer à écrire.

  const handleVideoStart = () => {
    if (!videoStarted && videoRef.current) {
      videoRef.current
        .play()
        .then(() => {
          setVideoStarted(true);
        })
        .catch((err) => console.log('Focus play failed:', err));
    }
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestionText(e.target.value);
  };

  const handleQuestionSubmit = () => {
    if (!questionText.trim()) return;
    // Sauvegarde la question pour l'étape d'interprétation.
    try { localStorage.setItem('tarot-5-question', questionText.trim()); } catch {}
    setPhase('drawing');
  };

  const handleInterpret = (cardIds: number[]) => {
    try {
      localStorage.setItem('tarot-5-cards', JSON.stringify(cardIds));
    } catch {}
    router.push('/tarot-5-c-manuelle/interpretation');
  };

  return (
    <div className="relative h-[100dvh] w-full text-white select-none">
      {/* Background vidéo - seulement pendant la question */}
      {phase === 'question' && (
        <div className="absolute inset-0" style={{ zIndex: 0 }}>
          <video
            ref={videoRef}
            src="/images/bg-tarot-5c.mp4"
            autoPlay
            muted
            playsInline
            loop
            preload="auto"
            className="h-full w-full object-cover"
            onLoadedData={() => {
              if (videoRef.current) {
                videoRef.current.play().catch(() => {});
              }
            }}
          />
        </div>
      )}

      {/* Voile sombre - intensité selon phase */}
      {phase === 'question' && (
        <div className="pointer-events-none absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
      )}

      {/* Menu parchemin — seulement en phase question (TarotApp a le sien) */}
      {phase === 'question' && <YiSlideNav />}

      {/* ETAPE QUESTION */}
      {phase === 'question' && (
        <div className="absolute inset-0 z-20 flex items-start justify-center px-6 pt-16">
          <div
            className="relative z-20 w-full max-w-lg rounded-2xl border border-[rgba(218,165,32,0.35)] bg-[rgba(26,15,8,0.92)] p-8 shadow-[0_0_60px_rgba(218,165,32,0.18),0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
          >
            {/* Filet décoratif doré sous le titre */}
            <div
              className="pointer-events-none absolute left-8 right-8 top-[76px] h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(218,165,32,0.45), transparent)',
              }}
              aria-hidden
            />
            <h2
              className="mb-5 text-center text-2xl font-bold uppercase tracking-[0.12em] text-[#FFD700]"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                textShadow: '0 0 18px rgba(218,165,32,0.35), 0 1px 3px rgba(0,0,0,0.6)',
              }}
            >
              Votre question au Tarot
            </h2>
            <label
              className="mb-4 block text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#E8C87A]"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              Ouvrez votre cœur à la cartomancienne
            </label>
            <textarea
              ref={questionInputRef}
              value={questionText}
              onChange={handleQuestionChange}
              onFocus={handleVideoStart}
              rows={3}
              placeholder="Quel chemin choisir dans ma vie amoureuse ?"
              className="mb-4 w-full resize-none rounded-xl border border-[rgba(218,165,32,0.28)] bg-[rgba(36,24,16,0.6)] p-5 text-lg text-[#F0E6D3] outline-none transition-all duration-300 placeholder:text-[#C9B58A]/60 focus:border-[#DAA520] focus:shadow-[0_0_22px_rgba(218,165,32,0.18)] focus:bg-[rgba(40,27,17,0.7)]"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            />
            <button
              onClick={handleQuestionSubmit}
              disabled={!questionText.trim()}
              className={`mystic-btn flex w-full items-center justify-center gap-2.5 py-4 text-base font-bold uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-40 ${questionText.trim() ? 'animate-question-pulse' : ''}`}
            >
              Enregistrer et tirer vos cartes
            </button>
          </div>
        </div>
      )}

      {/* ETAPE TIRAGE — nouveau système (pioche dépliante de /tarot-3-cartes) */}
      {phase === 'drawing' && (
        <div className="absolute inset-0">
          <TarotApp
            totalPicks={TOTAL_PICKS}
            positionLabels={POSITION_LABELS}
            positionIcons={POSITION_ICONS}
            title="Tirage 5 cartes"
            spreadType="tarot-5-c-manuelle"
            onInterpret={handleInterpret}
            question={questionText.trim()}
            backgroundVideo="/images/bg-tarot-5c.mp4"
            crossLayout={CROSS_LAYOUT}
          />
        </div>
      )}
    </div>
  );
}

export default function GatedPage() {
  return <AuthGate><TarotUpgradePage /></AuthGate>;
}
