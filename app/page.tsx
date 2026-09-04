'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useLang, useT } from '@/lib/i18n';
import { DEFAULT_BACKGROUND, LANDING_BACKGROUNDS, isVideoBackground, resolveBackgrounds, type BackgroundLevel } from '@/lib/backgrounds';
// APK : tous les appels /api/* passent par l'helper (base absolue du backend).
import { api } from '@/lib/api-client';
import Firefly from '@/components/firefly';
import BrandTitle from '@/components/brand-title';
import { useShimmer } from '@/lib/use-shimmer';
import { ShimmerChars } from '@/components/shimmer-chars';
import PauseRepas from '@/components/pause-repas';

// useLayoutEffect côté client (s'exécute AVANT le rendu peint), useEffect côté
// serveur (SSR) — évite les warnings, et surtout les flashs d'état après hydration.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function HomePage() {
  const router = useRouter();
  const t = useT();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Fond de départ : premier de la liste (fallback), remplacé dès le montage.
  const [background, setBackground] = useState<string>(LANDING_BACKGROUNDS[0]);
  const [bgReady, setBgReady] = useState(false); // évite le flash "mauvais fond" au refresh
  // Video masquée (opacity 0) tant qu'elle n'est pas prête à jouer → évite la frame
  // noire étirée (flash" cercle/ovale) au retour vers la landing.
  const [videoReady, setVideoReady] = useState(false);
  // Niveau effectif résolu (restreint le pool de fonds) — lu par les boutons ‹ ›.
  const bgLevelRef = useRef<BackgroundLevel>('apprenti');
  // ‹ › affichés uniquement pour Initié/Arkane (l'Apprenti passe par Préférences).
  const [canCycle, setCanCycle] = useState(false);
  // Fonds sélectionnés par l'utilisateur (tarot_prefs) — lu au clic (toujours frais).
  const readSelectedBgs = (): string[] | null => {
    try {
      const raw = localStorage.getItem('tarot_prefs');
      const prefs = raw ? JSON.parse(raw) : null;
      if (Array.isArray(prefs?.backgrounds) && prefs.backgrounds.length > 0) return prefs.backgrounds;
    } catch { /* ignore */ }
    return null;
  };

  // Scintillement INDEPENDANT par tuile (timers non synchronises), 4-18s
  const tarotShimmer = useShimmer(t('landing.tile.tarot'), 4000, 18000);
  const yijingShimmer = useShimmer(t('landing.tile.yijing'), 4000, 18000);
  const desShimmer = useShimmer(t('landing.tile.des'), 4000, 18000);
  const runesShimmer = useShimmer(t('landing.tile.runes'), 4000, 18000);

  // Scintillement occasionnel de l'etoile du bouton Mon espace (pas trop frequent)
  const [ctaTwinkle, setCtaTwinkle] = useState(false);
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const loop = () => {
      const delay = 6000 + Math.random() * 5000; // 6-11s entre deux scintillements
      timeoutId = setTimeout(() => {
        setCtaTwinkle(true);
        setTimeout(() => setCtaTwinkle(false), 750); // pulsation ~0.75s
        loop();
      }, delay);
    };
    loop();
    return () => clearTimeout(timeoutId);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const user = localStorage.getItem('tarot_user');
    if (user) setIsLoggedIn(true);
  }, []);

  // Fond d'écran à l'ouverture : STABLE — on reprend le fond mémorisé
  // (tarot_bg) s'il est dans le pool (sélection utilisateur ∩ forfait), sinon
  // le premier du pool. Aucun aléa. Les forfaits Initié/Arkane peuvent faire
  // défiler sur place avec les boutons ‹ › ; l'Apprenti passe par Préférences.
  useIsomorphicLayoutEffect(() => {
    let cancelled = false;
    (async () => {
      let lvl: BackgroundLevel = 'apprenti';
      try {
        const rawUser = localStorage.getItem('tarot_user');
        const email = rawUser ? (JSON.parse(rawUser)?.email ?? '') : '';
        if (email) {
          const res = await api(`/api/subscription?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const d = await res.json();
            if (d && (d.level === 'initie' || d.level === 'arkane')) lvl = d.level;
          }
        }
      } catch {
        // Hors-ligne / erreur → pool Apprenti (le plus restrictif : aucun fond
        // hors-forfait ne peut être montré par erreur).
      }
      if (cancelled) return;
      bgLevelRef.current = lvl;
      setCanCycle(lvl === 'initie' || lvl === 'arkane');
      const pool = resolveBackgrounds(readSelectedBgs(), lvl);
      if (!pool.length) return;
      // Par défaut : fond CLAIR (landing-bg4.mp4) — on le garde tant que
      // l'utilisateur n'a pas épinglé un autre fond via les flèches ‹ ›.
      let current = pool.includes(DEFAULT_BACKGROUND) ? DEFAULT_BACKGROUND : pool[0];
      try {
        const stored = localStorage.getItem('tarot_bg');
        if (stored && pool.includes(stored)) current = stored;
      } catch { /* ignore */ }
      setBackground(current);
      setBgReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Défilement manuel (réservé Initié/Arkane) : fond suivant / précédent dans
  // le pool (sélection utilisateur, sinon pool du forfait), mémorisé.
  const cycleBackground = useCallback(
    (dir: 1 | -1) => {
      const pool = resolveBackgrounds(readSelectedBgs(), bgLevelRef.current);
      if (pool.length < 2) return;
      const idx = pool.indexOf(background);
      const next = pool[(idx + dir + pool.length) % pool.length];
      if (!next || next === background) return;
      setVideoReady(false); // le nouveau fond (si vidéo) repart masqué → fade-in
      setBackground(next);
      try {
        localStorage.setItem('tarot_bg', next);
      } catch { /* ignore */ }
    },
    [background],
  );

  const handleLogin = () => {
    // Si déjà connecté : aller directement sur Mon espace (pas de re-login).
    if (isLoggedIn) {
      router.push('/dashboard/account');
      return;
    }
    // Sinon : ouvrir le modal de connexion global (components/login-modal, monté dans le layout).
    window.dispatchEvent(new Event('open-login'));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: '#0a0604' }}>
      {/* BACKGROUND : image ou vidéo, selon le fond retenu. Rendu seulement une
          fois le fond choisi (bgReady) → pas de flash. Fondu doux à chaque
          défilement (key = fond courant). */}
      {bgReady && (
        <motion.div
          key={background}
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {isVideoBackground(background) ? (
            <video
              src={background}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onLoadedData={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onPlaying={() => setVideoReady(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <Image
              src={background}
              alt="Table mystique Tarot & Yi Jing"
              fill
              className="object-cover"
              priority
              quality={90}
            />
          )}
        </motion.div>
      )}

      {/* MAIN TITLE */}
      <div
        className="absolute top-[3%] sm:top-[3%] md:top-[4%] inset-x-0 text-center px-4"
        style={{ zIndex: 70 }}
      >
        <h1
          className="title-glow px-4 text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-wider uppercase mb-3"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: '#DAA520',
            letterSpacing: '0.2em',
            textShadow: '0 1px 1px rgba(0,0,0,1), 0 2px 4px rgba(0,0,0,1), 0 4px 9px rgba(0,0,0,0.95), 0 7px 16px rgba(0,0,0,0.65), 0 12px 26px rgba(0,0,0,0.4), 0 0 26px rgba(218,165,32,0.3)',
            transform: 'scale(1.06)',
          }}
        >
          <BrandTitle text={"L'Oracle\ndes\nétoiles"} grow={false} />
        </h1>
        <p
          className="text-sm sm:text-base md:text-lg font-medium italic mb-5"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: '#FFD700',
            textShadow: '0 1px 2px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,0.95), 0 5px 12px rgba(0,0,0,0.6), 0 0 12px rgba(255,215,0,0.4)',
            letterSpacing: '0.05em',
          }}
        >
          {t('landing.subtitle')}
        </p>

        {/* CTA central unique — dans le flux, au-dessus de la luciole via z-index */}
        <button
          type="button"
          onClick={handleLogin}
          className="relative z-[99998] mx-auto mt-2 px-5 py-1.5 rounded-full font-semibold transition-all hover:scale-[1.04] active:scale-[0.97]"
          style={{
            position: 'relative',
            zIndex: 99998,
            fontFamily: 'var(--font-cinzel), serif',
            background: 'rgba(26, 14, 10, 0.55)',
            color: '#FFD700',
            boxShadow: '0 0 16px rgba(218,165,32,0.35)',
            border: '1px solid rgba(218,165,32,0.55)',
            letterSpacing: '0.05em',
            fontSize: '0.95rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span className={ctaTwinkle ? 'star-twinkle inline-block' : 'inline-block'}>✨</span> {isLoggedIn ? t('landing.cta.logged') : t('landing.cta.guest')}
        </button>
      </div>

      {/* CHOICE CARDS */}
      <div
        className="absolute top-[40%] sm:top-[36%] md:top-[34%] left-1/2 -translate-x-1/2 z-30 grid grid-cols-2 place-items-center w-[310px] sm:w-[350px] md:w-[390px] gap-y-6 px-2"
      >
        {/* Tarot Card Button */}
        <Link href="/tarot" className="block">
          <motion.div
            className="group relative w-[120px] sm:w-[136px] md:w-[152px] lg:w-[168px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow: '0 0 20px rgba(218,165,32,0.4), 0 4px 12px rgba(0,0,0,0.5)',
              border: '2px solid rgba(218,165,32,0.3)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #4a2c1a 0%, #2a1408 50%, #4a2c1a 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-amber-400/30 rounded-lg pointer-events-none" />
              <img
                src="/images/tarot-icon.png"
                alt="Tarot"
                className="w-11 h-11 mb-2 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.5))' }}
              />
              <h2
                className="text-xs sm:text-sm font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#FFD700',
                  textShadow: '0 0 8px rgba(255,215,0,0.45)',
                }}
              >
                <ShimmerChars text={t('landing.tile.tarot')} col={tarotShimmer.col} color="#FFD700" />
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(255,215,0,0.75)',
                }}
              >
                {t('landing.tile.tarotSub')}
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.18) 0%, transparent 70%)',
              }}
            />
            {/* Balayage de lueur le long de l'encadrre, droite->gauche (synchro lettres) */}
            {tarotShimmer.sweeping && (
              <div className="tile-sweep-tarot absolute inset-0 pointer-events-none rounded-xl" />
            )}
          </motion.div>
        </Link>

        {/* Yi Qing Card Button */}
        <Link href="/yi-jing" className="block">
          <motion.div
            className="group relative w-[120px] sm:w-[136px] md:w-[152px] lg:w-[168px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                '0 0 22px rgba(160,130,200,0.45), 0 4px 12px rgba(0,0,0,0.5)',
              border: '2px solid rgba(180,140,220,0.4)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #1a1230 0%, #0a0618 50%, #1a1230 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-purple-400/30 rounded-lg pointer-events-none" />
              <img
                src="/images/yi-jing-icon.png"
                alt="Yi Jing"
                className="w-9 h-9 mb-2 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(180,140,200,0.6))' }}
              />
              <h2
                className="text-xs sm:text-sm font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#E0CFF0',
                  textShadow: '0 0 8px rgba(180,140,200,0.5)',
                }}
              >
                <ShimmerChars text={t('landing.tile.yijing')} col={yijingShimmer.col} color="#E0CFF0" />
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(200,180,230,0.7)',
                }}
              >
                {t('landing.tile.yijingSub')}
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(180,140,220,0.2) 0%, transparent 70%)',
              }}
            />
            {/* Balayage de lueur le long de l'encadrre, droite->gauche (synchro lettres) */}
            {yijingShimmer.sweeping && (
              <div className="tile-sweep-yijing absolute inset-0 pointer-events-none rounded-xl" />
            )}
          </motion.div>
        </Link>

        {/* Runes Card Button */}
        <Link href="/runes" className="block">
          <motion.div
            className="group relative w-[120px] sm:w-[136px] md:w-[152px] lg:w-[168px] aspect-[2/3] rounded-xl overflow-hidden transition-all"
            style={{
              boxShadow:
                '0 0 22px rgba(60,120,80,0.45), 0 4px 12px rgba(0,0,0,0.5)',
              border: '2px solid rgba(138,109,59,0.4)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #1b3a2a 0%, #0a1f15 50%, #1b3a2a 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-amber-600/30 rounded-lg pointer-events-none" />
              <img
                src="/images/runes-icon.png"
                alt="Runes Scandinaves"
                className="w-11 h-11 mb-2 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(138,109,59,0.5))' }}
              />
              <h2
                className="text-xs sm:text-sm font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#D4B483',
                  textShadow: '0 0 8px rgba(138,109,59,0.5)',
                }}
              >
                <ShimmerChars text={t('landing.tile.runes')} col={runesShimmer.col} color="#D4B483" />
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(168,201,154,0.8)',
                }}
              >
                {t('landing.tile.runesSub')}
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(138,109,59,0.2) 0%, transparent 70%)',
              }}
            />
            {runesShimmer.sweeping && (
              <div className="tile-sweep-runes absolute inset-0 pointer-events-none rounded-xl" />
            )}
          </motion.div>
        </Link>

        {/* Dés du zodiaque Card Button */}
        <Link href="/des-divinatoires" className="block">
          <motion.div
            className="group relative w-[120px] sm:w-[136px] md:w-[152px] lg:w-[168px] aspect-[2/3] rounded-xl overflow-hidden cursor-pointer transition-all"
            style={{
              boxShadow:
                '0 0 22px rgba(60,90,180,0.42), 0 4px 12px rgba(0,0,0,0.5)',
              border: '2px solid rgba(212,175,55,0.4)',
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-2.5 sm:p-3"
              style={{
                background: 'linear-gradient(135deg, #0a1430 0%, #050a1c 50%, #0a1430 100%)',
              }}
            >
              <div className="absolute inset-1.5 border border-amber-300/25 rounded-lg pointer-events-none" />
              <img
                src="/images/des-zodiaque.png"
                alt="Les dés du zodiaque"
                className="w-11 h-11 mb-2 object-contain"
                style={{ filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.55))' }}
              />
              <h2
                className="text-xs sm:text-sm font-bold text-center leading-tight"
                style={{
                  fontFamily: 'var(--font-cinzel-deco), serif',
                  color: '#E8C66A',
                  textShadow: '0 0 8px rgba(212,175,55,0.5)',
                }}
              >
                <ShimmerChars text={t('landing.tile.des')} col={desShimmer.col} color="#E8C66A" />
              </h2>
              <p
                className="text-[9px] sm:text-[10px] text-center leading-none mt-0.5"
                style={{
                  fontFamily: 'var(--font-cinzel), serif',
                  color: 'rgba(200,214,245,0.75)',
                }}
              >
                {t('landing.tile.desSub')}
              </p>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(220,120,110,0.2) 0%, transparent 70%)',
              }}
            />
            {desShimmer.sweeping && (
              <div className="tile-sweep-des absolute inset-0 pointer-events-none rounded-xl" />
            )}
          </motion.div>
        </Link>
      </div>

    {/* Défilement des fonds sur place — réservé aux forfaits Initié/Arkane.
        L'Apprenti change ses fonds depuis Préférences. */}
    {bgReady && canCycle && (
      <div className="absolute bottom-3 right-3 z-[9997] flex items-center gap-2">
        <button
          type="button"
          onClick={() => cycleBackground(-1)}
          aria-label="Fond précédent"
          title="Fond précédent"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'rgba(26,14,10,0.55)',
            border: '1px solid rgba(218,165,32,0.5)',
            color: '#FFD700',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 0 12px rgba(218,165,32,0.25)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => cycleBackground(1)}
          aria-label="Fond suivant"
          title="Fond suivant"
          className="flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'rgba(26,14,10,0.55)',
            border: '1px solid rgba(218,165,32,0.5)',
            color: '#FFD700',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 0 12px rgba(218,165,32,0.25)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
          </svg>
        </button>
      </div>
    )}

    <PauseRepas />
    <Firefly page="landing" />
    </div>
  );
}// force vercel redeploy
