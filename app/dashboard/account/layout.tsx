'use client';

import { tr } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AccountNav from '@/components/account-nav';
import { readSpaceTheme, SPACE_THEME_EVENT, type SpaceTheme } from '@/lib/theme';
import { api } from '@/lib/api-client'; // APK : /api/* n'existe pas en local → proxy backend

// Ciel de « Mon espace » : bleu nuit profond dégradé + voile nébuleux froid,
// deux nappes d'étoiles scintillantes, bandeau galactique, deux étoiles
// filantes et la Grande Ourse dessinée en fil d'argent. Pur décoratif
// (aria-hidden), sans coût JS : tout est CSS/SVG. Rollback = retirer ce
// bloc et ses appels.
function CosmosSky() {
  return (
    <>
      <div className="cosmos-veil" aria-hidden />
      <div className="cosmos-nebula3" aria-hidden />
      <div className="cosmos-galaxy" aria-hidden />
      <div className="cosmos-stars" aria-hidden />
      <div className="cosmos-stars2" aria-hidden />
      <div className="cosmos-shoot cosmos-shoot-a" aria-hidden />
      <div className="cosmos-shoot cosmos-shoot-b" aria-hidden />
      {/* Grande Ourse — le chariot : 7 étoiles reliées, en haut à droite. */}
      <svg className="cosmos-constellation" viewBox="0 0 240 150" fill="none" aria-hidden>
        <g stroke="rgba(185,212,255,0.45)" strokeWidth="0.8">
          <path d="M30 108 L52 62 L96 54 L120 84 L164 76 L206 46 L188 96 L120 84" />
        </g>
        {[
          [30, 108, 2.6], [52, 62, 2.1], [96, 54, 2.4], [120, 84, 3.0],
          [164, 76, 2.2], [206, 46, 2.7], [188, 96, 2.0],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#e8f1ff" />
        ))}
      </svg>
    </>
  );
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);
  // Statut d'activation (DB) — false = email non validé : l'utilisateur reste
  // CANTONNÉ à /dashboard/account (bannière + renvoi de l'email) tant qu'il
  // n'a pas cliqué le lien d'activation.
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  // Thème du ciel (Préférences) : 'sombre' = bleu nuit étoilé (défaut),
  // 'clair' = l'ancien ciel violet. Relu au montage + à l'événement de bascule.
  const [theme, setTheme] = useState<SpaceTheme>('sombre');
  useEffect(() => {
    setTheme(readSpaceTheme());
    const sync = () => setTheme(readSpaceTheme());
    window.addEventListener(SPACE_THEME_EVENT, sync);
    return () => window.removeEventListener(SPACE_THEME_EVENT, sync);
  }, []);

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
    api('/api/auth/refresh-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(async (r) => {
        if (r.status === 404 && alive) {
          try { localStorage.removeItem('tarot_user'); localStorage.removeItem('arkane_session_token'); } catch {}
          setUser(null);
          return;
        }
        const d = await r.json().catch(() => null);
        if (alive && typeof d?.confirmed === 'boolean') setConfirmed(d.confirmed);
      })
      .catch(() => {}); // réseau KO -> on ne déconnecte pas
    return () => { alive = false; };
  }, [user?.email]);

  // Cantonnement : email non validé → seule la page « Mon compte » est ouverte.
  // (Re-vérifié au retour dans l'onglet : après un clic sur le lien d'activation
  // consulté ailleurs, le statut se rafraîchit et le blocage se lève.)
  useEffect(() => {
    if (confirmed === false && pathname !== '/dashboard/account') {
      router.replace('/dashboard/account');
    }
  }, [confirmed, pathname, router]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible' && user?.email) refreshConfirmed(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshConfirmed = () => {
    const email = user?.email;
    if (!email) return;
    api('/api/auth/refresh-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (typeof d?.confirmed === 'boolean') setConfirmed(d.confirmed); })
      .catch(() => {});
  };

  if (!ready) {
    return (
      <div className={`min-h-screen cosmos relative isolate flex items-center justify-center${theme === 'clair' ? ' cosmos-clar' : ''}`}>
        <CosmosSky />
        <p className="text-amber-300 mystic-subtitle">{tr("Chargement ...", "Loading...", "Cargando ...", "लोड हो रहा है ...")}</p>
      </div>
    );
  }

  // Pas de redirect ici : chaque page gère son propre guard pour éviter les
  // flashs. Si pas d'user, on affiche un écran minimal invitant à se connecter.
  if (!user) {
    return (
      <div className={`min-h-screen cosmos relative isolate flex flex-col items-center justify-center gap-4 p-6 text-center${theme === 'clair' ? ' cosmos-clar' : ''}`}>
        <CosmosSky />
        <span className="text-5xl">🔒</span>
        <p className="mystic-title text-xl">{tr("Accès réservé aux initiés", "Access reserved for the Initiates", "Acceso reservado a los iniciados", "प्रवेश केवल इनिशिए के लिए")}</p>
        <button type="button" onClick={() => router.replace('/login')} className="mystic-btn">{tr("Se connecter", "Sign in", "Iniciar sesión", "प्रवेश करें")}</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen cosmos relative isolate md:flex${theme === 'clair' ? ' cosmos-clar' : ''}`}>
      <CosmosSky />
      <AccountNav user={user} locked={confirmed === false} />
      <main className="flex-1 min-w-0 pb-24 md:pb-8 px-4 sm:px-6 lg:px-10 py-6 md:py-10">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
