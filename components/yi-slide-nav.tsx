'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { IconYiJing } from '@/components/yi-icons';

type NavLink = { href: string; label: string };

/**
 * Bouton navigation "parchemin enroulé" — horizontal, en haut à droite (avec marge).
 * Au repos : rouleau de parchemin + halo mauve pulsant + trigramme gravé.
 * Au tap : panneau opaque coulisse depuis la gauche avec les liens.
 * Remplace la croix de fermeture des pages Yi Jing.
 *
 * ZÉRO-CONFIG : sans prop `links`, le menu devine son lien "retour" selon la route
 *   - /interpret/<type>  -> retour vers /<type> (l'écran du tirage)
 *   - autre              -> retour vers /yi-jing
 * Passer `links` pour surcharger complètement les entrées.
 */
export default function YiSlideNav({ links }: { links?: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Liens auto si non fournis
  const resolvedLinks: NavLink[] = links ?? (() => {
    // Depuis une page d'interprétation, retour à l'écran du tirage /<type>
    const m = pathname?.match(/^\/interpret\/([^/?]+)/);
    const back: NavLink = m
      ? { href: `/${m[1]}`, label: 'Retour au tirage' }
      : { href: '/yi-jing', label: 'Retour au Yi Jing' };
    return [back, { href: '/', label: 'Accueil' }];
  })();

  return (
    <>
      {/* Parchemin enroulé au repos (haut-droite, avec marge) */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la navigation"
        aria-expanded={open}
        className="fixed right-6 -top-2 z-50 flex items-center"
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        style={{ pointerEvents: open ? 'none' : 'auto', paddingBottom: '16px' }}
      >
        {/* rouleau de parchemin horizontal (fin, discret) */}
        <motion.span
          className="relative flex h-3.5 w-20 items-center justify-center rounded-full"
          animate={{
            boxShadow: [
              '0 0 2px rgba(180,140,220,0.12)',
              '0 0 5px rgba(216,180,254,0.22)',
              '0 0 2px rgba(180,140,220,0.12)',
            ],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'linear-gradient(180deg, #e8d3a8 0%, #d8bf8c 45%, #c9ab72 55%, #b8975c 100%)',
            border: '1px solid rgba(120,90,50,0.5)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 3px rgba(90,60,30,0.35)',
          }}
        >
          {/* embouts enroulés (gauche/droite) */}
          <span
            className="absolute left-0 top-1/2 h-5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #9c7c48, #cbb079 45%, #8a6d3e)',
              border: '1px solid rgba(90,60,30,0.7)',
              boxShadow: 'inset 0 0 3px rgba(70,45,20,0.6)',
            }}
          />
          <span
            className="absolute right-0 top-1/2 h-5 w-3.5 translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #8a6d3e, #cbb079 55%, #9c7c48)',
              border: '1px solid rgba(90,60,30,0.7)',
              boxShadow: 'inset 0 0 3px rgba(70,45,20,0.6)',
            }}
          />
          {/* icône trigramme gravée */}
          <IconYiJing className="relative h-3 w-3 text-[#5a3e1c]" />
        </motion.span>
      </motion.button>

      {/* Overlay + panneau coulissant */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onPointerDown={() => setOpen(false)}
            />
            <motion.nav
              className="fixed left-0 top-0 z-[70] flex w-full max-w-[92vw] flex-col gap-2 self-start rounded-b-2xl border-x border-b border-[#7a5a30]/70 p-6 pt-16 backdrop-blur-md"
              initial={{ y: '-110%' }}
              animate={{ y: 0 }}
              exit={{ y: '-110%' }}
              transition={{ type: 'tween', duration: 0.45, ease: [0.22, 1, 0.36, 1], exit: { duration: 0.25 } }}
              style={{
                background:
                  'linear-gradient(180deg, #e8d3a8 0%, #d8bf8c 60%, #c9ab72 100%)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,255,255,0.4)',
              }}
            >

              {/* fermeture */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer la navigation"
                className="absolute right-4 top-4 text-[#5a3e1c] text-2xl leading-none transition-colors hover:text-[#8a6d3e]"
              >
                ×
              </button>

              <div className="mb-4 flex items-center gap-2 text-[#5a3e1c]">
                <IconYiJing className="h-6 w-6" />
                <span className="text-sm tracking-widest text-[#5a3e1c]/80">
                  NAVIGATION
                </span>
              </div>

              {resolvedLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-3 text-[#3e2a12] transition-colors hover:bg-[#7a5a30]/20"
                >
                  {l.label}
                </Link>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
