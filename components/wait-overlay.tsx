'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaitConfig {
  messages: string[];
  backgroundType: 'image' | 'video' | 'none';
  backgroundUrl: string | null;
  animation: string;
  minDurationMs: number;
}

const FALLBACK: WaitConfig = {
  messages: ['Chargement de l\'interprétation...'],
  backgroundType: 'none',
  backgroundUrl: null,
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

function Background({ type, url }: { type: string; url: string | null }) {
  if (type === 'video' && url) {
    return (
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={url}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }
  if (type === 'image' && url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />;
  }
  // Fallback : dégradé mystique animé
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-950">
      <motion.div
        className="absolute -inset-1/3 rounded-full bg-amber-500/20 blur-3xl"
        animate={{ rotate: 360, scale: [1, 1.15, 1] }}
        transition={{ rotate: { repeat: Infinity, duration: 18, ease: 'linear' }, scale: { repeat: Infinity, duration: 6 } }}
      />
    </div>
  );
}

export default function WaitOverlay({ type }: { type: string }) {
  const [cfg, setCfg] = useState<WaitConfig>(FALLBACK);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/interpretation-wait?type=${encodeURIComponent(type)}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setCfg(d); })
      .catch(() => { if (alive) setCfg(FALLBACK); });
    return () => { alive = false; };
  }, [type]);

  // Défilement des messages d'attente (min 5s entre chaque)
  useEffect(() => {
    if (cfg.messages.length <= 1) return;
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % cfg.messages.length), 5000);
    return () => clearInterval(t);
  }, [cfg]);

  const v = VARIANTS[cfg.animation] || VARIANTS.fade;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
      <Background type={cfg.backgroundType} url={cfg.backgroundUrl} />
      <div className="absolute inset-0 bg-black/45" />
      <motion.div
        key={cfg.animation}
        initial={v.initial}
        animate={v.animate}
        exit={v.exit}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
      >
        <motion.div
          className="h-14 w-14 rounded-full border-2 border-amber-300/70 border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
        />
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
              {cfg.messages[msgIdx] || cfg.messages[0]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
