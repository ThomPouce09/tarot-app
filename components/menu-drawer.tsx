'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface MenuDrawerProps {
  // Liens du tiroir. Chaque lien : label + href + (optionnel) action speciale.
  links?: { label: string; href?: string; action?: 'back' }[];
}

// Bouton discret : fine barre verticale semi-transparente collee au bord
// gauche, qui s'eclaire doucement au survol. Line-art doré, pas de glow.
function EdgeTab({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Ouvrir le menu"
      className="group relative flex h-24 w-3 items-center justify-center rounded-r-md border border-l-0 border-yellow-500/15 bg-yellow-500/[0.06] backdrop-blur-sm transition-all duration-300 hover:border-yellow-400/40 hover:bg-yellow-500/15"
      style={{ boxShadow: 'none' }}
    >
      {/* fine ligne interieure qui s'illumine au survol */}
      <span
        className={`block h-12 w-[2px] rounded-full bg-gradient-to-b from-yellow-300/40 to-amber-500/40 transition-all duration-300 group-hover:from-yellow-200 group-hover:to-yellow-400 ${
          open ? 'opacity-100' : 'opacity-60'
        }`}
      />
    </button>
  );
}

export default function MenuDrawer({
  links = [
    { label: 'Accueil', href: '/' },
    { label: 'Retour à l’écran du dessus', action: 'back' },
    { label: 'Historique', href: '/history' },
    { label: 'Mon espace', href: '/dashboard/account' },
  ],
}: MenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Ferme le tiroir si on change de route.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloque le scroll de fond quand le tiroir est ouvert.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleAction = (link: { label: string; href?: string; action?: 'back' }) => {
    if (link.action === 'back') {
      // Retour à l'écran du dessus (tirage) si on est sur une interpretation.
      if (pathname?.startsWith('/interpret/')) {
        const type = pathname.split('/')[2];
        if (type) {
          router.push(`/${type}`);
          return;
        }
      }
      router.back();
      return;
    }
    if (link.href) {
      router.push(link.href);
    }
  };

  return (
    <>
      {/* Bouton fixe en haut a gauche */}
      <div className="fixed left-4 top-4 z-[80]">
        <EdgeTab open={open} onClick={() => setOpen((o) => !o)} />
      </div>

      {/* Voile sombre */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Tiroir latéral gauche */}
      <aside
        className={`fixed left-0 top-0 z-[75] flex h-full w-72 max-w-[80vw] flex-col gap-2 border-r border-yellow-500/20 bg-gradient-to-b from-[#0e0a06] to-black p-6 pt-20 transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <p
          className="mb-4 text-sm uppercase tracking-[0.25em] text-yellow-500/70"
          style={{ fontFamily: "'Hoshiko Satsuki', serif" }}
        >
          Oracle
        </p>
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => handleAction(link)}
            className="group flex items-center justify-between rounded-lg border border-transparent px-4 py-3 text-left text-yellow-200 transition-all hover:border-yellow-500/30 hover:bg-yellow-500/5"
            style={{ fontFamily: "'Hoshiko Satsuki', serif" }}
          >
            <span className="text-lg">{link.label}</span>
            <span className="text-yellow-500/0 transition-all group-hover:translate-x-1 group-hover:text-yellow-400/80">
              ›
            </span>
          </button>
        ))}
      </aside>
    </>
  );
}
