'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

const LINKS = [
  { href: '/dashboard/account/security', img: '/images/nav-security.png', key: 'nav.security' },
  { href: '/dashboard/account/abonnement', img: '/images/nav-abonnement.png', key: 'nav.abonnement' },
  { href: '/dashboard/account/stats', img: '/images/nav-stats.png', key: 'nav.stats' },
  { href: '/dashboard/account/preferences', img: '/images/nav-preferences.png', key: 'nav.preferences' },
  { href: '/dashboard/account/readings', img: '/images/nav-historique.png', key: 'nav.historique' },
];

export default function AccountNav({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const initial = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.email?.[0] || '?').toUpperCase();

  // Indice "cliquez sur l'avatar pour Mon espace" — 1ère visite seulement (mémoïsé)
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('tarot_seen_avatar')) setShowHint(true);
    } catch {}
    const to = setTimeout(() => setShowHint(false), 6000);
    return () => clearTimeout(to);
  }, []);
  const dismissHint = () => {
    setShowHint(false);
    try { localStorage.setItem('tarot_seen_avatar', '1'); } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    router.push('/');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 p-5 border-r border-amber-800/20 bg-gradient-to-b from-gray-950/60 to-gray-950/20">
        <Link href="/" className="flex items-center gap-2 mb-6 group">
          <img src="/logo-espace.png" alt="Logo" className="h-9 w-auto object-contain" />
          <span className="brand-oracle text-xl">L&apos;oracle des étoiles</span>
        </Link>

        <div className="flex items-center gap-3 mb-6 px-2">
          <span className="relative inline-flex">
            <span className={`absolute inset-0 rounded-full bg-amber-400/70 ${showHint ? 'animate-ping' : 'hidden'}`} />
            <Link href="/dashboard/account" onClick={dismissHint} aria-label={t('nav.monespace')} className={`relative w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white font-bold mystic-glow hover:ring-2 hover:ring-amber-300/60 transition-all ${showHint ? 'ring-2 ring-amber-300' : ''}`} style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>
              {initial}
            </Link>
            {showHint && (
              <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-lg bg-amber-900/90 border border-amber-500/50 px-3 py-1.5 text-[10px] text-amber-100 shadow-lg">
                {t('nav.monespaceHint')}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <p className="text-amber-200 text-sm font-medium truncate">{user?.firstName || 'Élu'}</p>
            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link-mystic ${pathname === l.href ? 'active' : ''}`}
            >
              <span className="w-5 flex justify-center">
                <img src={l.img} alt="" className="h-5 w-5 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.35))' }} />
              </span>
              <span>{t(l.key)}</span>
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} className="nav-link-mystic mt-2 text-red-400/90 hover:text-red-300">
          <span className="text-base w-5 text-center">🚪</span>
          <span>{t('nav.logout')}</span>
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 w-full flex items-center justify-between px-4 py-3 bg-gray-950/90 backdrop-blur border-b border-amber-800/20">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-espace.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="brand-oracle text-lg">L&apos;oracle des étoiles</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="relative inline-flex">
            <span className={`absolute inset-0 rounded-full bg-amber-400/70 ${showHint ? 'animate-ping' : 'hidden'}`} />
            <Link href="/dashboard/account" onClick={dismissHint} aria-label={t('nav.monespace')} className={`relative w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white text-sm font-bold mystic-glow hover:ring-2 hover:ring-amber-300/60 transition-all ${showHint ? 'ring-2 ring-amber-300' : ''}`}>
              {initial}
            </Link>
            {showHint && (
              <span className="absolute top-full mt-2 right-0 z-50 whitespace-nowrap rounded-lg bg-amber-900/90 border border-amber-500/50 px-3 py-1.5 text-[10px] text-amber-100 shadow-lg">
                {t('nav.monespaceHint')}
              </span>
            )}
          </span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex justify-around items-center px-1 py-1.5 bg-gray-950/95 backdrop-blur border-t border-amber-800/20 overflow-x-auto">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] ${pathname === l.href ? 'text-amber-300' : 'text-gray-500'}`}
          >
            <span className="text-lg">
              <img src={l.img} alt="" className="h-5 w-5 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.35))' }} />
            </span>
            <span className="whitespace-nowrap">{t(l.key)}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
