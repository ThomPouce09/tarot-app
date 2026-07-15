'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';

interface WaitConfig {
  messages: string[];
  backgroundType: 'image' | 'video' | 'none';
  backgroundUrls: string[];
  animation: string;
  minDurationMs: number;
  videoNoLoop?: boolean;
}

const FALLBACK: WaitConfig = {
  messages: ['Chargement de l\'interprétation...'],
  backgroundType: 'none',
  backgroundUrls: [],
  animation: 'fade',
  minDurationMs: 2500,
};

// ── Variantes d'animation (framer-motion) ──────────────────
const VARIANTS: Record<string, { initial: any; animate: any; exit: any }> = {
  fade: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  orbit: {
    initial: { opacity: 0, rotate: -12, scale: 0.9 },
    animate: { opacity: 1, rotate: 0, scale: 1, transition: { rotate: { repeat: Infinity, repeatType: 'reverse', duration: 3 } } },
    exit: { opacity: 0, scale: 0.9 },
  },
  sparkle: {
    initial: { opacity: 0, scale: 0.8, filter: 'blur(4px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { scale: { repeat: Infinity, repeatType: 'reverse', duration: 1.8 } } },
    exit: { opacity: 0 },
  },
  ripples: {
    initial: { opacity: 0, scale: 1.1 },
    animate: { opacity: 1, scale: 1, transition: { scale: { repeat: Infinity, repeatType: 'reverse', duration: 2.4 } } },
    exit: { opacity: 0 },
  },
};

function Background({ type, urls, videoNoLoop, onVideoEnded }: { type: string; urls: string[]; videoNoLoop?: boolean; onVideoEnded?: () => void }) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [idx, setIdx] = useState(0);
  const advancingRef = useRef(false);

  if (type === 'video' && urls.length > 0) {
    const url = urls[Math.min(idx, urls.length - 1)];
    const advance = () => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      if (idx < urls.length - 1) {
        // Fondu noir (voile), 5s de textes d'attente, puis video suivante.
        setFading(true);
        setTimeout(() => {
          setTimeout(() => {
            setIdx(idx + 1);
            setHidden(false);
            setFading(false);
            advancingRef.current = false;
          }, 5000);
        }, 700);
      } else {
        // Derniere video : on cache la video instantanement (plus d'artefact),
        // voile noir, 5s de textes, puis interpretation.
        setFading(true);
        setHidden(true);
        setTimeout(() => onVideoEnded?.(), 5000);
      }
    };
    return (
      <>
        <video
          key={url}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 bg-black"
          style={{ opacity: fading ? 0 : 1, display: hidden ? 'none' : 'block', backgroundColor: 'black', visibility: fading ? 'hidden' : 'visible' }}
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='black'/%3E%3C/svg%3E"
          src={url}
          autoPlay
          muted
          loop={!videoNoLoop}
          playsInline
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            // Déclenche le fondu noir pendant les dernieres frames (avant onEnded)
            // pour masquer le rectangle blanc natif de fin de video.
            if (videoNoLoop && v.duration && v.duration - v.currentTime <= 0.5) {
              advance();
            }
          }}
          onEnded={advance}
        />
        {/* Voile noir superpose : masque la video (et son artefact blanc) en fin,
            mais reste SOUS les textes d'attente (z-10) qui restent lisibles. */}
        <div
          className="absolute inset-0 bg-black transition-opacity duration-700 pointer-events-none"
          style={{ opacity: fading ? 1 : 0 }}
        />
      </>
    );
  }
  if (type === 'image' && urls.length > 0) {
    const url = urls[0];
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
  }
  // Fallback : aucun fond (le parent bg-black suffit, pas de flash de dégradé)
  return null;
}

export default function WaitOverlay({ type, onVideoEnded }: { type: string; onVideoEnded?: () => void }) {
  const lang = useLang();
  const [cfg, setCfg] = useState<WaitConfig | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [startedAt] = useState(Date.now());
  const endedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/interpretation-wait?type=${encodeURIComponent(type)}&lang=${encodeURIComponent(lang)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setCfg(d); })
      .catch(() => { if (alive) setCfg(FALLBACK); });
    return () => { alive = false; };
  }, [type, lang]);

  // Garde-fou de securite : si aucune video n'est prevue (ou config sans
  // videoNoLoop), on bascule apres minDurationMs. Sinon, on laisse advance()
  // gerer la fin reelle (derniere video) et on ne coupe pas prematurement.
  // Un garde-fou long evite tout blocage meme si onEnded ne fire pas.
  useEffect(() => {
    if (c.backgroundType === 'video' && c.videoNoLoop) return; // gere par advance()
    const wait = Math.max(c.minDurationMs || 3500, 3500);
    const t = setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onVideoEnded?.();
      }
    }, wait);
    return () => clearTimeout(t);
  }, [cfg, onVideoEnded]);

  // Garde-fou long (60s) pour ne jamais rester bloque sur l'overlay video.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!endedRef.current) {
        endedRef.current = true;
        onVideoEnded?.();
      }
    }, 60000);
    return () => clearTimeout(t);
  }, [onVideoEnded]);

  const c = cfg ?? FALLBACK;

  const handleVideoEnded = () => {
    if (endedRef.current) return;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, (c.minDurationMs || 3500) - elapsed);
    setTimeout(() => {
      endedRef.current = true;
      onVideoEnded?.();
    }, remaining);
  };

  // Défilement des messages d'attente (min 5s entre chaque)
  useEffect(() => {
    if (c.messages.length <= 1) return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % c.messages.length), 5000);
    return () => clearInterval(t);
  }, [c]);

  const v = VARIANTS[c.animation] || VARIANTS.fade;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black pb-20">
      <Background type={c.backgroundType} urls={c.backgroundUrls} videoNoLoop={c.videoNoLoop} onVideoEnded={handleVideoEnded} />
      {c.backgroundType !== 'video' && <div className="absolute inset-0 bg-black/45" />}
      <motion.div
        key={c.animation}
        initial={v.initial}
        animate={v.animate}
        exit={v.exit}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
      >
        <div className="min-h-[3rem] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-amber-200 text-lg md:text-xl font-medium"
              style={{ fontFamily: 'var(--font-cinzel), serif', textShadow: '0 0 18px rgba(218,165,32,0.5)' }}
            >
              {c.messages[msgIdx] || c.messages[0]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
