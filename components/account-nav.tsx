'use client';

import Link from 'next/link';
import { useState } from 'react';
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

  const [confirmLogout, setConfirmLogout] = useState(false);
  const doLogout = () => {
    // Drapeau lu une seule fois par la landing : message « déconnecté » après redirection.
    localStorage.setItem('logged_out_notice', '1');
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

        <button onClick={() => setConfirmLogout(true)} className="nav-link-mystic mt-2 text-red-400/90 hover:text-red-300">
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
      <nav data-tour="nav" className="md:hidden fixed bottom-0 inset-x-0 z-50 flex justify-between items-center px-1 py-1.5 bg-gray-950/95 backdrop-blur border-t border-amber-800/20" style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}>
        {links.map((l) => (
          <Link
            key={l.href}
            data-tour="navitem"
            href={l.href}
            onClick={(e) => { e.preventDefault(); router.push(l.href); }}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-1 text-[9px] transition-colors duration-200 ${pathname === l.href ? 'text-amber-300 font-semibold' : 'text-gray-400 hover:text-amber-200/80'}`}
            style={{ pointerEvents: 'auto' }}
            aria-current={pathname === l.href ? 'page' : undefined}
          >
            <span className="relative flex items-center justify-center py-[3px]">
              <img src={l.img} alt="" className={`h-5 w-5 object-contain ${pathname === l.href ? 'nav-icon-pulse' : ''}`} style={{ filter: 'drop-shadow(0 0 4px rgba(245,180,80,0.4))' }} />
              {pathname === l.href && (
                <span aria-hidden className="absolute bottom-0 left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #F0C75E, transparent)', boxShadow: '0 0 6px rgba(218,165,32,0.75)' }} />
              )}
            </span>
            <span className="whitespace-nowrap">{t(l.key)}</span>
          </Link>
        ))}
      </nav>

      {confirmLogout && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmLogout(false)} />
          <div className="relative z-10 w-full max-w-xs rounded-xl p-5 text-center"
               style={{ background: 'rgba(22,11,42,0.97)', border: '1px solid rgba(218,165,32,0.45)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
            <p className="mb-4 text-[15px] leading-relaxed" style={{ color: '#F5EAD6', fontFamily: 'var(--font-cinzel), serif' }}>{t('account.logoutConfirm')}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmLogout(false)} className="flex-1 rounded-full py-2 text-sm font-semibold"
                style={{ border: '1px solid rgba(218,165,32,0.4)', color: '#F5EAD6' }}>{t('guest.cancel')}</button>
              <button onClick={doLogout} className="flex-1 rounded-full py-2 text-sm font-bold"
                style={{ background: 'linear-gradient(135deg,#b91c1c,#7f1d1d)', color: '#fff' }}>{t('gate.logout')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
