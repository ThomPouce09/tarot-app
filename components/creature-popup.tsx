'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '@/lib/sounds';

type Props = {
  data: {
    creature: { name: string; image: string; color: string | null };
    text: string;
    category: string;
    giftClaimable?: boolean;
    lang?: string;
  };
  onClose: () => void;
  /** Présent quand le message est un cadeau réclamable → affiche le bouton. */
  onClaim?: () => Promise<boolean>;
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

// Icône cadeau SVG inline (règle projet : pas d'emoji/Material).
function GiftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="8.2" width="17" height="11.3" rx="2" />
      <path d="M3.5 12.4h17" />
      <path d="M12 8.2v11.3" />
      <path d="M12 8.2c0-2.6 1.6-4.4 3.4-4.4 1.7 0 2.7 1.2 1.6 3-1 .9-2.8 1.2-5 1.4z" />
      <path d="M12 8.2c0-2.6-1.6-4.4-3.4-4.4C6.9 3.8 5.9 5 7 6.8c1 .9 2.8 1.2 5 1.4z" />
    </svg>
  );
}

// Éclat doré de célébration autour du bandeau « Cadeau récupéré ».
function GiftBurst({ glow }: { glow: string }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
        const dist = 46 + Math.random() * 34;
        return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, s: 3 + Math.random() * 5 };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-0 w-0">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.s,
            height: p.s,
            background: glow,
            boxShadow: `0 0 8px 2px ${glow}`,
            left: 0,
            top: 0,
            marginLeft: -p.s / 2,
            marginTop: -p.s / 2,
          }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy, scale: 0.3 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export default function CreaturePopup({ data, onClaim, onClose }: Props) {
  const { creature, text } = data;
  const [imgError, setImgError] = useState(false);
  const [show, setShow] = useState(true); // tout (créature + texte) visible
  const [claimState, setClaimState] = useState<'idle' | 'claiming' | 'claimed' | 'failed'>('idle');
  const glow = creature.color || GOLD;
  const isEn = data.lang === 'en';

  // Pas de fermeture automatique : la créature reste affichée jusqu'à ce que
  // l'utilisateur tape EN DEHORS du message (overlay) — il lit à son rythme.
  // Seuls les retours « cadeau » (succès/échec) ferment après leur animation.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scheduleClose = useCallback(
    (hideDelay: number, closeDelay: number) => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      timersRef.current.push(setTimeout(() => setShow(false), hideDelay));
      timersRef.current.push(setTimeout(() => onClose(), closeDelay));
    },
    [onClose],
  );

  useEffect(() => {
    // Nettoyage des timers au démontage (aucun timer de fermeture initial).
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Réclame le cadeau : célébration + fermeture repoussée si succès.
  const handleClaim = useCallback(async () => {
    if (!onClaim || claimState !== 'idle') return;
    setClaimState('claiming');
    const ok = await onClaim().catch(() => false);
    if (ok) {
      setClaimState('claimed');
      // Carillon magique du cadeau : l'instant où le tirage offert est crédité.
      playSound('cadeau', 1);
      scheduleClose(3000, 3000 + 1400); // laisse la célébration se jouer
    } else {
      setClaimState('failed');
      scheduleClose(2200, 2200 + 1200);
    }
  }, [onClaim, claimState, scheduleClose]);

  return (
    // Overlay plein écran : clic extérieur = fermeture (aucune fermeture auto).
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

            {/* Cadeau d'une créature (message « credits » réclamable) : bouton de
                réclamation → célébration dorée quand le tirage offert est crédité. */}
            {data.category === 'credits' && data.giftClaimable && (
              <div className="relative mt-3 flex items-center justify-center">
                {claimState === 'claimed' && <GiftBurst glow={glow} />}
                {claimState === 'idle' && (
                  <button
                    type="button"
                    onClick={handleClaim}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-transform hover:scale-[1.04] active:scale-95"
                    style={{
                      background: 'linear-gradient(180deg, #FFF3CF 0%, #F3C969 42%, #C9962E 100%)',
                      color: '#1c1206',
                      fontFamily: 'var(--font-cinzel), serif',
                      boxShadow: '0 0 18px rgba(243,201,105,0.55), inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -2px 5px rgba(120,80,10,0.4)',
                    }}
                  >
                    <GiftIcon size={15} />
                    {isEn ? 'Claim my gift' : 'Réclamer mon cadeau'}
                  </button>
                )}
                {claimState === 'claiming' && (
                  <span className="text-sm font-bold text-[#FFD86B]" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                    ✦ …
                  </span>
                )}
                {claimState === 'claimed' && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold"
                    style={{
                      background: 'rgba(243,201,105,0.16)',
                      border: '1.5px solid rgba(243,201,105,0.7)',
                      color: '#FFD86B',
                      fontFamily: 'var(--font-cinzel), serif',
                      textShadow: '0 0 14px rgba(255,200,80,0.7)',
                    }}
                  >
                    <GiftIcon size={15} />
                    {isEn ? 'Gift claimed! Your next draw is free ✦' : 'Cadeau récupéré ! Ton prochain tirage est offert ✦'}
                  </motion.span>
                )}
                {claimState === 'failed' && (
                  <span className="text-xs italic" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#c9b27e' }}>
                    {isEn ? 'A gift was already claimed recently…' : 'Un cadeau a déjà été réclamé récemment…'}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
