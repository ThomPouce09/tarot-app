'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useT, tr } from '@/lib/i18n';
import { useEntitlement } from '@/lib/use-entitlement';

const LINKS = [
  { href: '/dashboard/account/security', img: '/images/nav-security.png', key: 'nav.security' },
  { href: '/dashboard/account/abonnement', img: '/images/nav-abonnement.png', key: 'nav.abonnement' },
  { href: '/dashboard/account/stats', img: '/images/nav-stats.png', key: 'nav.stats' },
  { href: '/dashboard/account/echoes', img: '/images/nav-grimoire.png', key: 'nav.augures' },
  { href: '/dashboard/account/readings', img: '/images/nav-historique.png', key: 'nav.historique' },
  { href: '/dashboard/account/preferences', img: '/images/nav-preferences.png', key: 'nav.preferences' },
];

export default function AccountNav({ user, locked = false }: { user: any; locked?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  // Les Augures sont visibles par tous (vitrine) ; le scellage reste Initié/Arkane.
  const links = LINKS;
  // Email non validé : les rubriques sont « cantonnées » (grisées, inertes) —
  // le layout pousse la redirection ; ici on évite juste le clic inutile.
  const lockTitle = locked
    ? tr("Validez d'abord votre email depuis Mon compte", "Validate your email first from My account", "Valide primero su email desde Mi cuenta", "पहले अपने खाते से ईमेल सत्यापित करें")
    : undefined;
  const initial = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.email?.[0] || '?').toUpperCase();

  // Visite guidée : SpaceTour (components/space-tour.tsx, monté dans layout.tsx)
  // assure la 1re visite par clics forcés — drapeau compte 'login_tour'. Les cibles
  // sont marquées ci-dessous via data-tour="home|avatar|nav|navitem".

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
      localStorage.removeItem('arkane_session_token');
    router.push('/');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 p-5 border-r border-amber-800/20 bg-gradient-to-b from-[#160b2a]/95 to-[#0e0720]/90">
        <Link href="/" data-tour="home" title={t('nav.backHome')} className="relative flex items-center gap-2 mb-6 group">
          <img src="/logo-espace.png" alt="" className="h-9 w-auto object-contain" />
          <span className="brand-oracle text-2xl transition-all duration-200 group-hover:brightness-125">
            {t('brand.name')}
          </span>
          <span aria-hidden className="text-amber-300/90 text-lg leading-none transition-all duration-200 group-hover:-translate-x-0.5" style={{ fontFamily: 'var(--font-cinzel), serif' }}>‹</span>
          <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </Link>

        <div className="flex items-center gap-3 mb-6 px-2">
          <span className="relative inline-flex">
            <Link href="/dashboard/account" data-tour="avatar" aria-label={t('nav.monespace')} className="relative w-11 h-11 rounded-full avatar-mystic flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-violet-300/60 transition-all" style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>
              {initial}
              <span className="avatar-glass" aria-hidden />
            </Link>
          </span>
          <div className="min-w-0">
            <p className="text-amber-200 text-sm font-medium truncate">{user?.firstName || 'Élu'}</p>
            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>

        <nav data-tour="nav" className="space-y-1 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              data-tour="navitem"
              href={locked ? '/dashboard/account' : l.href}
              title={lockTitle}
              onClick={locked ? (e) => { if (l.href !== '/dashboard/account') e.preventDefault(); } : undefined}
              aria-disabled={locked || undefined}
              className={`nav-link-mystic ${pathname === l.href ? 'active' : ''} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span className="w-5 flex justify-center">
                <img src={l.img} alt="" className="h-5 w-5 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.35))' }} />
              </span>
              <span>{t(l.key)}</span>
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} className="nav-link-mystic mt-2 text-red-400/90 hover:text-red-300">
          <span className="w-5 flex justify-center"><img src="/images/door-exit.png" alt="" className="h-4 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.35))' }} /></span>
          <span>{t('nav.logout')}</span>
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 w-full flex items-center justify-between px-4 py-3 bg-[#0a0514]/90 backdrop-blur border-b border-amber-800/25">
        <Link href="/" data-tour="home" title={t('nav.backHome')} className="relative flex items-center gap-2 group">
          <img src="/logo-espace.png" alt="" className="h-7 w-auto object-contain" />
          <span className="brand-oracle text-xl transition-all duration-200 group-hover:brightness-125">
            {t('brand.name')}
          </span>
          <span aria-hidden className="text-amber-300/75 text-base leading-none" style={{ fontFamily: 'var(--font-cinzel), serif' }}>‹</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="relative inline-flex">
            <Link href="/dashboard/account" data-tour="avatar" aria-label={t('nav.monespace')} className="relative w-9 h-9 rounded-full avatar-mystic flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-violet-300/60 transition-all">
              {initial}
              <span className="avatar-glass" aria-hidden />
            </Link>
          </span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav data-tour="nav" className="md:hidden fixed bottom-0 inset-x-0 z-50 flex justify-around items-center px-1 py-1.5 bg-gray-950/95 backdrop-blur border-t border-amber-800/20" style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}>
        {links.map((l) => (
          <Link
            key={l.href}
            data-tour="navitem"
            href={l.href}
            onClick={(e) => { e.preventDefault(); router.push(l.href); }}
            className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 text-[10px] transition-colors ${pathname === l.href ? 'text-amber-300' : 'text-gray-400 hover:text-amber-200/80'}`}
            style={{
              pointerEvents: 'auto',
              background: pathname === l.href ? 'rgba(217,180,92,0.14)' : 'transparent',
              boxShadow: pathname === l.href ? 'inset 0 0 0 1px rgba(217,180,92,0.35), 0 0 10px rgba(217,180,92,0.22)' : 'none',
            }}
            aria-current={pathname === l.href ? 'page' : undefined}
          >
            <span className="text-lg">
              <img src={l.img} alt="" className="h-5 w-5 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.35))' }} />
            </span>
            <span className="whitespace-nowrap">{t(l.key)}</span>
            {pathname === l.href && (
              <span aria-hidden className="absolute -bottom-0.5 left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #DAA520, transparent)', boxShadow: '0 0 6px rgba(218,165,32,0.7)' }} />
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
