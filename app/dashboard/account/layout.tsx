'use client';
// helpers invités
import { GuestExitButton } from '@/components/guest-mode-banner';
import { refreshGuestState, GUEST_EVENT } from '@/lib/guest-client';
import { tr } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AccountNav from '@/components/account-nav';
import SpaceTour from '@/components/space-tour';
import { readSpaceTheme, SPACE_THEME_EVENT, type SpaceTheme } from '@/lib/theme';

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
  // Mode Invité : « Mon espace » est FERMÉ (l'invité tient le téléphone).
  // Relu à chaque focus/événement — la sortie de mode réouvre immédiatement.
  const [guestLocked, setGuestLocked] = useState(false);
  useEffect(() => {
    const check = () => {
      let em = '';
      try { em = JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch {}
      refreshGuestState(em).then(setGuestLocked);
    };
    check();
    window.addEventListener('focus', check);
    window.addEventListener(GUEST_EVENT, check);
    return () => { window.removeEventListener('focus', check); window.removeEventListener(GUEST_EVENT, check); };
  }, []);

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
    fetch('/api/auth/refresh-status', {
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
    fetch('/api/auth/refresh-status', {
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
      <SpaceTour active={confirmed !== false} />
      <main className="flex-1 min-w-0 pb-24 md:pb-8 px-4 sm:px-6 lg:px-10 py-6 md:py-10">
        <div className="max-w-3xl mx-auto">
          {guestLocked ? (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <div className="relative z-10 w-full max-w-sm mystic-panel p-6 text-center">
                <img src="/logo-espace.png" alt="" className="mx-auto mb-3 h-[34px] w-auto object-contain" style={{ filter: 'drop-shadow(0 0 10px rgba(218,165,32,0.45))' }} />
                <h3 className="mystic-title text-lg mb-2" style={{ color: '#DAA520' }}>{tr('Espace personnel protégé', 'Personal space protected', 'Espacio personal protegido', 'व्यक्तिगत क्षेत्र सुरक्षित')}</h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">{tr('Tant que le mode Invité est actif, votre espace personnel (Mon espace, historique, abonnement) reste fermé : personne d\u2019autre ne peut y accéder.', 'While Guest mode is on, your personal space (My space, history, subscription) stays closed: no one else can reach it.', 'Mientras el modo Invitado está activo, su espacio personal (Mi espacio, historial, suscripción) permanece cerrado: nadie más puede acceder.', 'जब तक अतिथी मोड सक्रिय है, आपका व्यक्तिगत क्षेत्र (मेरा क्षेत्र, इतिहास, सदस्यता) बंद रहता है: कोई अन्य उस तक नहीं पहुँच सकता।')}</p>
                <div className="flex gap-3">
                  <GuestExitButton onDone={() => setGuestLocked(false)} />
                  {/* Navigation SPA (comme le menu parchemin des hubs) : l'ancien
                      lien dur « <a href="/tarot"> » déclenchait un rechargement
                      complet de la page — en APK, laWebView repart du voile
                      « Chargement » et ne rend jamais la main (plante signalée
                      2026-10-20). Filet : si la navigation SPA n'a pas porté
                      en 2 s, on retombe sur une navigation classique. */}
                  <button
                    type="button"
                    className="mystic-btn-ghost flex-1 text-center"
                    onClick={() => {
                      router.push('/tarot');
                      // Filet : si la navigation SPA n'a pas porté en 2,5 s
                      // (chunk JS manquant/erroné en export statique), on
                      // retombe sur une navigation classique.
                      window.setTimeout(() => {
                        if (window.location.pathname.startsWith('/dashboard')) {
                          window.location.assign('/tarot');
                        }
                      }, 2500);
                    }}
                  >
                    {tr('Retour aux univers', 'Back to the universes', 'Volver a los universos', 'ब्रह्मांडों में लौटें')}
                  </button>
                </div>
              </div>
            </div>
          ) : children}
        </div>
      </main>
    </div>
  );
}
