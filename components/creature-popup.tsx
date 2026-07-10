'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

type Props = {
  data: { creature: { name: string; image: string; color: string | null }; text: string; category: string };
  onClose: () => void;
};

const GOLD = '#F3C969';

// Halo discret mais visible, un seul souffle lent derrière la créature
function SoftHalo({ glow }: { glow: string }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
      style={{ background: '#FFC400' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Le "sort" : une onde de lumière dorée qui se déploie en cercles concentriques
// depuis la créature à l'ouverture, puis s'évanouit. Un seul geste, calme, élégant.
function SpellRipple({ glow }: { glow: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
    >
      {[0, 0.32].map((delay, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: `2px solid #FFC400` }}
          initial={{ width: 40, height: 40, opacity: 0.8, scale: 1 }}
          animate={{ width: 40, height: 40, opacity: 0, scale: 3.4 }}
          transition={{ duration: 2.1, delay, ease: 'easeOut' }}
        />
      ))}
      {/* souffle lumineux central, unique */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg"
        style={{ background: '#FFC400' }}
        initial={{ width: 90, height: 90, opacity: 0.5 }}
        animate={{ width: 90, height: 90, opacity: 0 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />
    </div>
  );
}

// Étincelles + poussières dorées ET argentées, un peu plus voyantes, qui
// scintillent autour du texte (visibles mais jamais agressives).
function Embers({ glow }: { glow: string }) {
  const SILVER = '#D6DEEC';
  const particles = useMemo(() => {
    const make = (n: number, kind: 'spark' | 'dust') =>
      Array.from({ length: n }).map((_, i) => {
        const gold = Math.random() > 0.4; // ~60% or, ~40% argent
        const color = gold ? glow : SILVER;
        return {
          id: `${kind}-${i}`,
          top: 4 + Math.random() * 92,
          left: Math.random() * 100,
          // un peu plus voyant : étincelles 3–6px, poussières 2–3.5px
          size: kind === 'spark' ? 3 + Math.random() * 3 : 2 + Math.random() * 1.5,
          color,
          delay: Math.random() * 2.4,
          dur: kind === 'spark' ? 1.8 + Math.random() * 1.4 : 3 + Math.random() * 2,
          drift: kind === 'spark' ? 0 : 8 + Math.random() * 12, // poussière : léger flottement vertical
        };
      });
    return [...make(12, 'spark'), ...make(14, 'dust')];
  }, [glow]);

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            // glow plus large -> plus voyant
            boxShadow: `0 0 ${p.size * 2.4}px ${p.size}px ${p.color}`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.15, 0.5],
            y: p.drift ? [0, -p.drift, 0] : 0,
          }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

// Sortilège autour du texte : uniquement étincelles + poussières dorées/argent.
function TextSpell({ glow, show }: { glow: string; show: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -inset-3 overflow-visible"
      style={{ opacity: show ? 1 : 0, transition: 'opacity 1s ease' }}
    >
      <Embers glow={glow} />
    </span>
  );
}

// Voile de fumées (sortilège) : masse de fumée aux tons variés GRIS → NOIR
// (gris moyen en haut, quasi-noir en bas), bien contrastés sur le fond sombre.
// Décalée à gauche et un peu surélevée pour englober le texte. Se déploie en
// ~2s puis se rétracte avec le texte.
// DOM order : rendu AVANT le texte (pas de -z-10) → impossible de passer derrière la page.
function SmokeVeil({ show }: { show: boolean }) {
  const blobs = useMemo(() => {
    const colors = ['#72727e', '#54545e', '#3a3a42', '#8a8a96', '#26262e'];
    return Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      color: colors[i % colors.length],
      top: 0 + Math.random() * 70,
      left: -12 + Math.random() * 60, // décalé à gauche
      size: 44 + Math.random() * 40, // un peu moins large
      delay: Math.random() * 0.4,
      dur: 5 + Math.random() * 3,
      dx: (Math.random() - 0.5) * 14,
      dy: (Math.random() - 0.5) * 12,
    }));
  }, []);

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -top-8 -bottom-4 -left-8 -right-2 overflow-visible rounded-[28px]"
      style={{
        background:
          'radial-gradient(closest-side, rgba(114,114,126,0.55), rgba(70,70,80,0.40) 55%, rgba(40,40,48,0.0) 100%)',
        boxShadow: '0 0 34px 12px rgba(80,80,90,0.24)',
      }}
      initial={{ scale: 0.15, opacity: 0 }}
      animate={{ scale: show ? 1 : 0.15, opacity: show ? 0.85 : 0 }}
      transition={{ duration: show ? 2 : 1, ease: 'easeInOut' }}
    >
      {blobs.map((b) => (
        <motion.span
          key={b.id}
          className="absolute rounded-full"
          style={{
            top: `${b.top}%`,
            left: `${b.left}%`,
            width: `${b.size}%`,
            height: `${b.size}%`,
            background: b.color,
            filter: 'blur(12px)',
          }}
          animate={{ x: [0, b.dx, 0], y: [0, b.dy, 0] }}
          transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </motion.span>
  );
}

export default function CreaturePopup({ data, onClose }: Props) {
  const { creature, text } = data;
  const [imgError, setImgError] = useState(false);
  const [show, setShow] = useState(true); // tout (créature + texte) visible jusqu'à 6s
  const glow = creature.color || GOLD;

  // À 6s, TOUT s'efface ensemble (créature, nom, texte, sortilèges) en fondu doux.
  // Laisser ~1,1s de fondu puis on ferme réellement.
  useEffect(() => {
    const hide = setTimeout(() => setShow(false), 6000);
    const close = setTimeout(() => onClose(), 6000 + 1200);
    return () => {
      clearTimeout(hide);
      clearTimeout(close);
    };
  }, [onClose]);

  return (
    // Overlay plein écran : clic extérieur = fermeture (avant 6s).
    // Fond assombri tant que le message est visible (révèle le rendu du sortilège).
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor: 'rgba(6,4,14,0.6)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: 'easeInOut' }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.97 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, opacity: { duration: 1.1 } }}
        className="my-auto flex w-full max-w-[min(92vw,540px)] items-start justify-center gap-3"
      >
        {/* Image créature, à gauche, descendue. Fallback avatar CSS si l'image manque.
            z-10 : reste au 1er plan, AU-DESSUS du voile de fumées. */}
        <div className="relative z-10 shrink-0">
          {/* éveil doux et unique de la créature (pas de mouvement perpétuel) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(6px)' }}
            animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.92, filter: show ? 'blur(0px)' : 'blur(4px)' }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="relative mt-6 ml-3 h-[80px] w-[80px] sm:h-[96px] sm:w-[96px]"
          >
            {/* Halo + sort centrés SUR la créature (imbriqués dans le bloc image) */}
            <SoftHalo glow={glow} />
            <SpellRipple glow={glow} />
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creature.image}
                alt={creature.name}
                width={80}
                height={80}
                className="h-[80px] w-[80px] object-contain drop-shadow-[0_0_16px_rgba(255,233,168,0.6)] sm:h-[96px] sm:w-[96px]"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="flex h-[80px] w-[80px] items-center justify-center rounded-full text-3xl font-bold text-[#3a2f1a] sm:h-[96px] sm:w-[96px] sm:text-4xl"
                style={{ background: glow, boxShadow: `0 0 18px 5px ${glow}` }}
              >
                {creature.name.charAt(0)}
              </div>
            )}
          </motion.div>
        </div>

        {/* Texte flottant + voile de fumées (background) + étincelles autour */}
        <div className="relative min-w-0 flex-1 pt-1">
          <SmokeVeil show={show} />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: show ? 1 : 0, y: show ? 0 : 6 }}
            transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
            className="relative z-10"
          >
            <TextSpell glow={glow} show={show} />
            <div className="relative mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-amber-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              <span className="text-amber-300">✦</span>
              {creature.name}
            </div>
            <div
              className="relative font-medium text-[#fdf6e3]"
              style={{
                textShadow:
                  '0 1px 3px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6), 0 0 18px ' + glow + '66',
              }}
            >
              {text}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
