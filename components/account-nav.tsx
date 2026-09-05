'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { useEntitlement } from '@/lib/use-entitlement';

const LINKS = [
  { href: '/dashboard/account/security', img: '/images/nav-security.png', key: 'nav.security' },
  { href: '/dashboard/account/abonnement', img: '/images/nav-abonnement.png', key: 'nav.abonnement' },
  { href: '/dashboard/account/stats', img: '/images/nav-stats.png', key: 'nav.stats' },
  { href: '/dashboard/account/echoes', img: '/images/nav-historique.png', key: 'nav.grimoire', arkaneOnly: true },
  { href: '/dashboard/account/readings', img: '/images/nav-historique.png', key: 'nav.historique' },
  { href: '/dashboard/account/preferences', img: '/images/nav-preferences.png', key: 'nav.preferences' },
];

export default function AccountNav({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  // Le Grimoire des Échos est la prérogative des Arkanes (étape 10).
  const { sub } = useEntitlement();
  const links = LINKS.filter((l) => !l.arkaneOnly || sub?.level === 'arkane');
  const initial = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.email?.[0] || '?').toUpperCase();

  // Visite guidée (une fois après une nouvelle connexion) : bulles à bouton « OK »,
  // l'une après l'autre. 0 = aucune, 1 = marque → accueil, 2 = avatar → Mon compte.
  const [tourStep, setTourStep] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    try { if (!localStorage.getItem('tarot_tour_done')) setTourStep(1); } catch {}
  }, []);
  const okTour = () => {
    if (tourStep === 1) setTourStep(2);
    else if (tourStep === 2) { setTourStep(0); try { localStorage.setItem('tarot_tour_done', '1'); } catch {} }
  };

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    try { localStorage.removeItem('tarot_tour_done'); } catch {}
    router.push('/');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 p-5 border-r border-amber-800/20 bg-gradient-to-b from-gray-950/60 to-gray-950/20">
        <Link href="/" title={t('nav.backHome')} className="relative flex items-center gap-2 mb-6 group">
          <img src="/logo-espace.png" alt="" className="h-9 w-auto object-contain" />
          <span className="brand-oracle text-2xl transition-all duration-200 group-hover:brightness-125">
            L&apos;oracle des étoiles
          </span>
          <span aria-hidden className="text-amber-300/90 text-lg leading-none transition-all duration-200 group-hover:-translate-x-0.5" style={{ fontFamily: 'var(--font-cinzel), serif' }}>‹</span>
          <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          {tourStep === 1 && (
            <div className="absolute left-0 top-full mt-2 z-50 w-60 rounded-xl border border-amber-500/60 bg-amber-950/95 px-4 py-3 text-amber-100 shadow-2xl" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
              <p className="text-[11px] leading-relaxed">{t('nav.backHomeHint')}</p>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); okTour(); }} className="mt-2 w-full rounded-md bg-amber-500/90 py-1 text-[11px] font-semibold text-amber-950 transition-colors hover:bg-amber-400">
                {t('nav.ok')}
              </button>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-3 mb-6 px-2">
          <span className="relative inline-flex">
            <span className={`absolute inset-0 rounded-full bg-violet-400/70 ${tourStep === 2 ? 'animate-ping' : 'hidden'}`} />
            <Link href="/dashboard/account" aria-label={t('nav.monespace')} className={`relative w-11 h-11 rounded-full avatar-mystic flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-violet-300/60 transition-all ${tourStep === 2 ? 'ring-2 ring-violet-300' : ''}`} style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>
              {initial}
              <span className="avatar-glass" aria-hidden />
            </Link>
            {tourStep === 2 && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-60 rounded-xl border border-violet-500/60 bg-violet-950/95 px-4 py-3 text-violet-100 shadow-2xl" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                <p className="text-[11px] leading-relaxed">{t('nav.monespaceHint')}</p>
                <button type="button" onClick={okTour} className="mt-2 w-full rounded-md bg-violet-500/90 py-1 text-[11px] font-semibold text-violet-950 transition-colors hover:bg-violet-400">
                  {t('nav.ok')}
                </button>
              </div>
            )}
          </span>
          <div className="min-w-0">
            <p className="text-amber-200 text-sm font-medium truncate">{user?.firstName || 'Élu'}</p>
            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {links.map((l) => (
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
        <Link href="/" title={t('nav.backHome')} className="relative flex items-center gap-2 group">
          <img src="/logo-espace.png" alt="" className="w-8 h-8 object-contain" />
          <span className="brand-oracle text-xl transition-all duration-200 group-hover:brightness-125">
            L&apos;oracle des étoiles
          </span>
          <span aria-hidden className="text-amber-300/75 text-base leading-none" style={{ fontFamily: 'var(--font-cinzel), serif' }}>‹</span>
          {tourStep === 1 && (
            <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl border border-amber-500/60 bg-amber-950/95 px-4 py-3 text-amber-100 shadow-2xl" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
              <p className="text-[10px] leading-relaxed">{t('nav.backHomeHint')}</p>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); okTour(); }} className="mt-2 w-full rounded-md bg-amber-500/90 py-1 text-[10px] font-semibold text-amber-950 transition-colors hover:bg-amber-400">
                {t('nav.ok')}
              </button>
            </div>
          )}
        </Link>
        <div className="flex items-center gap-3">
          <span className="relative inline-flex">
            <span className={`absolute inset-0 rounded-full bg-violet-400/70 ${tourStep === 2 ? 'animate-ping' : 'hidden'}`} />
            <Link href="/dashboard/account" aria-label={t('nav.monespace')} className={`relative w-9 h-9 rounded-full avatar-mystic flex items-center justify-center text-white text-sm font-bold hover:ring-2 hover:ring-violet-300/60 transition-all ${tourStep === 2 ? 'ring-2 ring-violet-300' : ''}`}>
              {initial}
              <span className="avatar-glass" aria-hidden />
            </Link>
            {tourStep === 2 && (
              <div className="absolute top-full mt-2 right-0 z-50 w-52 rounded-xl border border-violet-500/60 bg-violet-950/95 px-4 py-3 text-violet-100 shadow-2xl" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                <p className="text-[10px] leading-relaxed">{t('nav.monespaceHint')}</p>
                <button type="button" onClick={okTour} className="mt-2 w-full rounded-md bg-violet-500/90 py-1 text-[10px] font-semibold text-violet-950 transition-colors hover:bg-violet-400">
                  {t('nav.ok')}
                </button>
              </div>
            )}
          </span>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex justify-around items-center px-1 py-1.5 bg-gray-950/95 backdrop-blur border-t border-amber-800/20" style={{ pointerEvents: 'auto', touchAction: 'manipulation' }}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={(e) => { e.preventDefault(); router.push(l.href); }}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] ${pathname === l.href ? 'text-amber-300' : 'text-gray-500'}`}
            style={{ pointerEvents: 'auto' }}
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
