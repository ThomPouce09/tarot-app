'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AccountNav from '@/components/account-nav';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setReady(true);
  }, []);

  // Garde de session : le localStorage est la mémoire du device, pas une preuve.
  // Un vieux compte (test, supprimé ou reseedé en base) ne doit PAS ouvrir
  // « Mon espace ». On vérifie l'existence du compte côté serveur : 404 =
  // compte introuvable -> on purge la session locale -> écran de connexion.
  useEffect(() => {
    const email = user?.email;
    if (!email) return;
    let alive = true;
    fetch('/api/auth/refresh-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(async (r) => {
        if (r.status === 404 && alive) {
          try { localStorage.removeItem('tarot_user'); } catch {}
          setUser(null);
        }
      })
      .catch(() => {}); // réseau KO -> on ne déconnecte pas
    return () => { alive = false; };
  }, [user?.email]);

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
        <button type="button" onClick={() => router.replace('/login')} className="mystic-btn">Se connecter</button>
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
