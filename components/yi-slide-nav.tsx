'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { playSound as sfx } from '@/lib/sounds';
import { useLang, pick4, type Lang, tr } from '@/lib/i18n';

export default function YiSlideNav() {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const go = (href: string) => {
    sfx('scroll1', 0.5);
    setOpen(false);
    // "Mon espace" : si non identifié, on ouvre la mire de connexion (2) restylée.
    if (href === '/dashboard/account') {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('tarot_user') : null;
      if (!stored) {
        router.push('/login');
        return;
      }
    }
    router.push(href);
  };

  return (
    <>
      {/* Bouton menu : image menu-close.png (haut-droite, avec marge) */}
      <motion.button
        type="button"
        onClick={() => { sfx('scroll1', 0.5); setOpen(true); }}
        aria-label={tr("Ouvrir la navigation", "Open navigation", "Abrir la navegación", "नेविगेशन खोलें")}
        aria-expanded={open}
        data-nav-menu
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
            onPointerDown={() => { sfx('scroll1', 0.5); setOpen(false); }}
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
              pointerEvents: 'auto',
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
                onClick={() => { sfx('scroll1', 0.5); setOpen(false); }}
                aria-label={tr("Fermer la navigation", "Close navigation", "Cerrar la navegación", "नेविगेशन बंद करें")}
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
                      {menuLabel(l, lang)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => go(l.href)}
                      className="block whitespace-nowrap rounded px-2 py-px text-[11px] font-bold tracking-wide text-[#3e2a12] transition-colors hover:bg-[#7a5a30]/20"
                      style={{ fontFamily: 'var(--font-cinzel), serif' }}
                    >
                      {menuLabel(l, lang)}
                    </button>
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

// Libellés du parchemin dans les 4 langues de l'app.
function menuLabel(l: { href: string; label: string }, lang: Lang): string {
  const M: Record<string, [string, string, string, string]> = {
    '/': ['Accueil', 'Home', 'Inicio', 'मुखपृष्ठ'],
    '/tarot': ['Tarot', 'Tarot', 'Tarot', 'टैरो'],
    '/yi-jing': ['Yi Jing', 'Yi Jing', 'Yi Jing', 'इ चिंग'],
    '/runes': ['Runes', 'Runes', 'Runas', 'रून'],
    '/des-divinatoires': ['Dés du zodiaque', 'Zodiac Dice', 'Dados del Zodiaco', 'राशि पासे'],
    '/dashboard/account': ['Mon espace', 'My space', 'Mi espacio', 'मेरा क्षेत्र'],
  };
  const e = M[l.href];
  return e ? pick4(e[0], e[1], e[2], e[3])(lang) : l.label;
}

const MENU_LINKS: { href: string; label: string; disabled?: boolean }[] = [
  { href: '/', label: 'Accueil' },
  { href: '/tarot', label: 'Tarot' },
  { href: '/yi-jing', label: 'Yi Jing' },
  { href: '/runes', label: 'Runes' },
  { href: '/des-divinatoires', label: 'Dés du zodiaque' },
  { href: '/dashboard/account', label: 'Mon espace' },
];
