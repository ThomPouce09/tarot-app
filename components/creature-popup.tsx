'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

type Props = {
  data: { creature: { name: string; image: string; color: string | null }; text: string; category: string };
  onClose: () => void;
};

const GOLD = '#F3C969';

// Halo scintillant doré autour de la creature (effet d'origine, doux et continu)
function SoftHalo({ glow }: { glow: string }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl"
      style={{ background: glow }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.3, 0.55, 0.3] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Le "sort" : une onde de lumière dorée qui se déploie en cercles concentriques
// depuis la créature à l'ouverture, puis s'évanouit. Un seul geste, calme, élégant.
function SpellRipple({ glow }: { glow: string }) {
  return null;
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

// Nuage tres noir : ne sous l'image de la creature (haut-gauche), se repand
// derriere tout le message en ~1s. Nuances de sombre/tres sombre, transform-origin
// en haut a gauche pour que la croissance parte de sous la creature.
function DarkCloud({ show }: { show: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -z-10 -top-6 -bottom-4 -left-6 -right-2 rounded-[30px] blur-md"
      style={{
        transformOrigin: 'top left',
        background:
          'radial-gradient(120% 120% at 18% 8%, rgba(26,24,30,0.96) 0%, rgba(12,11,15,0.95) 42%, rgba(4,3,7,0.92) 78%, rgba(0,0,0,0) 100%)',
        boxShadow: '0 0 50px 22px rgba(0,0,0,0.55)',
      }}
      initial={{ scale: 0.04, opacity: 0 }}
      animate={{ scale: show ? 1 : 0.04, opacity: show ? 1 : 0 }}
      transition={{ duration: show ? 1 : 0.7, ease: 'easeOut' }}
    />
  );
}

// Traits de vitesse (style Star Wars) : lignes radiales dorées qui jaillissent
// du centre vers l'exterieur derriere le texte, puis s'effacent progressivement
// pendant que le message trouve sa position finale (synchro avec l'effet Z ~1.1s).
function SpeedLines({ show }: { show: boolean }) {
  const lines = Array.from({ length: 18 }).map((_, i) => {
    const angle = (i / 18) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
    const len = 60 + Math.random() * 70;
    return { id: i, angle, len, w: 1 + Math.random() * 2.5 };
  });
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-0 w-0"
    >
      {lines.map((l) => (
        <motion.span
          key={l.id}
          className="absolute rounded-full"
          style={{
            height: `${l.w}px`,
            width: `${l.len}px`,
            background: 'linear-gradient(90deg, rgba(246,215,122,0) 0%, rgba(246,215,122,0.85) 70%, rgba(246,215,122,0.95) 100%)',
            // part du centre, pointe vers l'exterieur
            left: 0,
            top: 0,
            transform: `rotate(${l.angle}rad) translateX(20px)`,
            transformOrigin: 'left center',
            boxShadow: '0 0 6px rgba(246,215,122,0.6)',
          }}
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: show ? [0, 0.9, 0] : 0, scaleX: show ? [0.2, 1, 1.1] : 0.2 }}
          transition={{ duration: show ? 1.1 : 0.4, ease: 'easeOut', times: [0, 0.3, 1] }}
        />
      ))}
    </div>
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
        className="relative my-auto flex w-full max-w-[min(92vw,540px)] items-start justify-center gap-3"
      >
        {/* Nuage tres noir : ne sous l'image de la creature, se repand derriere
            tout le message en ~1s. transform-origin en haut a gauche. */}
        <DarkCloud show={show} />
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
            <span className="pointer-events-none absolute -inset-4">
              <Embers glow={glow} />
            </span>
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creature.image}
                alt={creature.name}
                width={80}
                height={80}
                className="h-[80px] w-[80px] object-contain drop-shadow-[0_0_7px_rgba(255,233,168,0.5)] sm:h-[96px] sm:w-[96px]"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="flex h-[80px] w-[80px] items-center justify-center rounded-full text-3xl font-bold text-[#3a2f1a] sm:h-[96px] sm:w-[96px] sm:text-4xl"
                style={{ background: glow, boxShadow: `0 0 9px 2px ${glow}` }}
              >
                {creature.name.charAt(0)}
              </div>
            )}
          </motion.div>
        </div>

        {/* Texte flottant : effet "Star Wars" — monte du fond vers l'avant en doré */}
        <div className="relative min-w-0 flex-1 pt-1 [perspective:900px]">
          <SpeedLines show={show} />
          <motion.div
            initial={{ opacity: 0, scale: 0.2, z: -600 }}
            animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.2, z: show ? 0 : -600 }}
            transition={{ delay: 0.15, duration: 1.1, ease: 'easeOut' }}
            style={{ transformOrigin: 'center', transformStyle: 'preserve-3d' }}
            className="relative z-10"
          >
            <TextSpell glow={glow} show={show} />
            <div className="relative mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]" style={{ fontFamily: 'var(--font-cormorant), serif', color: '#FFD86B', textShadow: '0 0 10px rgba(255,200,60,0.9), 0 0 20px rgba(255,170,30,0.6)' }}>
              <span className="text-amber-300">✦</span>
              {creature.name}
            </div>
            <div
              className="relative font-medium text-lg leading-snug"
              style={{
                fontFamily: 'var(--font-cormorant), serif',
                color: '#F6D77A',
                textShadow:
                  '0 1px 3px rgba(0,0,0,0.9), 0 0 14px rgba(255,200,80,0.55), 0 0 26px rgba(255,180,40,0.35)',
              }}
            >
              {text.toLowerCase()}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
