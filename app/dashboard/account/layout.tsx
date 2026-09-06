'use client';

import { useEffect, useState } from 'react';
import AccountNav from '@/components/account-nav';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen cosmos relative isolate flex items-center justify-center">
        <div className="cosmos-veil" aria-hidden /><div className="cosmos-nebula3" aria-hidden /><div className="cosmos-stars" aria-hidden /><div className="cosmos-stars2" aria-hidden />
        <p className="text-amber-300 mystic-subtitle">Chargement...</p>
      </div>
    );
  }

  // Pas de redirect ici : chaque page gère son propre guard pour éviter les
  // flashs. Si pas d'user, on affiche un écran minimal invitant à se connecter.
  if (!user) {
    return (
      <div className="min-h-screen cosmos relative isolate flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="cosmos-veil" aria-hidden /><div className="cosmos-nebula3" aria-hidden /><div className="cosmos-stars" aria-hidden /><div className="cosmos-stars2" aria-hidden />
        <span className="text-5xl">🔒</span>
        <p className="mystic-title text-xl">Accès réservé aux initiés</p>
        <a href="/auth/login" className="mystic-btn">Se connecter</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen cosmos relative isolate md:flex">
      <div className="cosmos-veil" aria-hidden />
      <div className="cosmos-nebula3" aria-hidden />
      <div className="cosmos-stars" aria-hidden />
      <div className="cosmos-stars2" aria-hidden />
      <AccountNav user={user} />
      <main className="flex-1 min-w-0 pb-24 md:pb-8 px-4 sm:px-6 lg:px-10 py-6 md:py-10">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
