'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

export default function YiSlideNav() {
  const [open, setOpen] = useState(false);
  const openSound = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    openSound.current = new Audio('/audio/scroll1.mp3');
    openSound.current.volume = 0.5;
  }, []);

  const playSound = () => {
    const a = openSound.current;
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  return (
    <>
      {/* Bouton menu : image menu-close.png (haut-droite, avec marge) */}
      <motion.button
        type="button"
        onClick={() => { playSound(); setOpen(true); }}
        aria-label="Ouvrir la navigation"
        aria-expanded={open}
        className="fixed right-1 -top-2 z-50 flex items-center"
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        style={{ pointerEvents: open ? 'none' : 'auto', paddingBottom: '8px' }}
      >
        <img
          src="/images/menu-close.png"
          alt="Menu"
          draggable={false}
          style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </motion.button>

      {/* Overlay (tap pour fermer) */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onPointerDown={() => { playSound(); setOpen(false); }}
          />
        )}
      </AnimatePresence>

      {/* Parchemin ouvert : descend verticalement depuis le haut de menu-close (aligné droite) */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed z-[70] flex flex-col items-center"
            style={{
              right: '0.25rem',       // aligné avec menu-close (right-1)
              top: '-0.5rem',         // coïncide avec le haut de menu-close (-top-2)
              width: '171px',         // = largeur rendue de menu-close (32px * 300/56)
              transformOrigin: 'top center',
              pointerEvents: 'none',
            }}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* fond parchemin */}
            <img
              src="/images/menu-open.png"
              alt=""
              draggable={false}
              style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
            />

            {/* contenu écrit sur le parchemin */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1"
              style={{ pointerEvents: 'auto' }}
            >
              <button
                type="button"
                onClick={() => { playSound(); setOpen(false); }}
                aria-label="Fermer la navigation"
                className="absolute right-2.5 top-1 text-[#5a3e1c] text-base leading-none transition-colors hover:text-[#8a6d3e]"
              >
                ×
              </button>

              {MENU_LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.08, duration: 0.25 }}
                >
                  {l.disabled ? (
                    <span
                      className="block whitespace-nowrap rounded px-2 py-px text-[11px] font-bold tracking-wide text-[#9a8a6a] cursor-not-allowed select-none"
                      style={{ fontFamily: 'var(--font-cinzel), serif' }}
                      aria-disabled="true"
                    >
                      {l.label}
                    </span>
                  ) : (
                    <Link
                      href={l.href}
                      onClick={() => { playSound(); setOpen(false); }}
                      className="block whitespace-nowrap rounded px-2 py-px text-[11px] font-bold tracking-wide text-[#3e2a12] transition-colors hover:bg-[#7a5a30]/20"
                      style={{ fontFamily: 'var(--font-cinzel), serif' }}
                    >
                      {l.label}
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const MENU_LINKS: { href: string; label: string; disabled?: boolean }[] = [
  { href: '/', label: 'Accueil' },
  { href: '/tarot', label: 'Tarot' },
  { href: '/yi-jing', label: 'Yi Jing' },
  { href: '#', label: 'Runes', disabled: true },
  { href: '#', label: 'Dés du destin', disabled: true },
  { href: '/dashboard/account', label: 'Mon espace' },
];
