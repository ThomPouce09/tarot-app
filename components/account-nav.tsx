'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/dashboard/account', icon: '👤', label: 'Mon compte' },
  { href: '/dashboard/account/security', icon: '🛡️', label: 'Sécurité' },
  { href: '/dashboard/account/abonnement', icon: '✦', label: 'Abonnement' },
  { href: '/dashboard/account/stats', icon: '📊', label: 'Statistiques' },
  { href: '/dashboard/account/preferences', icon: '⚙️', label: 'Préférences' },
  { href: '/dashboard/readings', icon: '📜', label: 'Historique des tirages' },
];

export default function AccountNav({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    router.push('/');
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 p-5 border-r border-amber-800/20 bg-gradient-to-b from-gray-950/60 to-gray-950/20">
        <Link href="/" className="flex items-center gap-2 mb-6 group">
          <span className="text-2xl">🔮</span>
          <span className="brand-oracle text-xl">Oracle des étoiles</span>
        </Link>

        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white font-bold mystic-glow" style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>
            {initial}
          </div>
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
              <span className="text-base w-5 text-center">{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>

        <button onClick={handleLogout} className="nav-link-mystic mt-2 text-red-400/90 hover:text-red-300">
          <span className="text-base w-5 text-center">🚪</span>
          <span>Déconnexion</span>
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 w-full flex items-center justify-between px-4 py-3 bg-gray-950/90 backdrop-blur border-b border-amber-800/20">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🔮</span>
          <span className="brand-oracle text-lg">Oracle des étoiles</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white text-sm font-bold mystic-glow">
            {initial}
          </div>
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
            <span className="text-lg">{l.icon}</span>
            <span className="whitespace-nowrap">{l.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
