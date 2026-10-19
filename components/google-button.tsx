'use client';

// components/google-button.tsx — Bouton « Continuer avec Google » (GSI).
// Rendu PAR GOOGLE (scripts.accounts.google.com/gsi/client) via
// google.accounts.id.renderButton → conforme aux règles de marque Google.
// flow picker = popup sur web, onglet système sur Android/WebView.
//
// Dépendances runtime : NEXT_PUBLIC_GOOGLE_CLIENT_ID (client_id WEB). Si absent
// → le bouton ne se rend pas (return null) : le parcours email reste entier.
// Après un credential valide : POST /api/auth/google → mêmes clés de session
// que /api/auth/login (tarot_user + arkane_session_token) → /dashboard/account.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { onAccountChanged } from '@/lib/tutorials';
import { getDeviceToken } from '@/lib/device-client';
import { api } from '@/lib/api-client';
import { isNative } from '@/lib/capacitor-utils';

// Natif (APK) : le bouton ne se rend PAS pour l'instant — la WebView Capacitor
// (origine capacitor://localhost) ne peut pas être enregistrée comme origine
// d'authorisation GSI, et les popups y sont coupées. Étape 2 prévue : flux
// externe (navigateur système via @capacitor/browser → /api/auth/google/native
// PKCE → retour deep link tarotdivination://) calqué sur le retour Stripe.

declare global {
  interface Window {
    google?: any;
    __gsiPromise?: Promise<void>;
  }
}

function loadGsi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (window.__gsiPromise) return window.__gsiPromise;
  window.__gsiPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { window.__gsiPromise = undefined; reject(new Error('gsi load fail')); };
    document.head.appendChild(s);
  });
  return window.__gsiPromise;
}

export default function GoogleButton() {
  const router = useRouter();
  const t = useT();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const native = isNative();

  useEffect(() => {
    if (!clientId || native) return; // config manquante ou WebView native → rien à monter
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const accountsId = window.google?.accounts?.id;
        if (!accountsId) return;
        accountsId.initialize({
          client_id: clientId,
          // UX_DESKTOP par défaut ; sur mobile le flux d'ouverture s'adapte.
          auto_select: false,
          callback: async (resp: { credential?: string }) => {
            setBusy(true);
            if (!resp?.credential) {
              setError(t('auth.google.failed'));
              setBusy(false);
              return;
            }
            try {
              const res = await api('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: resp.credential, deviceToken: getDeviceToken(), lang: document.documentElement.lang || 'fr' }),
              });
              const data = await res.json();
              if (!res.ok || !data.session) {
                setError(typeof data.error === 'string' ? data.error : t('auth.google.failed'));
                return;
              }
              // Mêmes contrats de session que /api/auth/login.
              try { localStorage.setItem('tarot_user', JSON.stringify(data.user)); } catch {}
              try { localStorage.setItem('arkane_session_token', data.session); } catch {}
              onAccountChanged();
              router.push('/dashboard/account');
            } catch {
              setError(t('auth.google.failed'));
            } finally {
              setBusy(false);
            }
          },
        });
        accountsId.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'filled_black',   // cohérent avec l'ambiance sombre
          size: 'large',
          text: 'continue_with',   // « Continuer avec Google » (libellé conforme)
          shape: 'pill',
          logo_alignment: 'left',
          locale: (document.documentElement.lang || 'fr').slice(0, 2),
        });
      })
      .catch(() => { /* pas de GSI (bloqué) : le bouton reste caché */ });
    return () => { cancelled = true; };
  }, [clientId, router, t]);

  if (!clientId || native) return null;

  return (
    <div className="space-y-2">
      {/* Le bouton Google est dessiné par Google ; ce voile « Connexion… »
          couvre le conteneur pendant l'appel API, pour un feedback clair. */}
      <div className="relative">
        <div ref={hostRef} className="flex justify-center" />
        {busy && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(13,6,4,0.65)', fontFamily: 'var(--font-cormorant), serif', color: '#FFD700' }}
          >
            {t('auth.google.busy')}
          </div>
        )}
      </div>
      {error && (
        <p className="text-center text-xs" style={{ color: '#e57373', fontFamily: 'var(--font-cormorant), serif' }} role="alert">
          {error}
        </p>
      )}
      <p className="text-center text-[10px] opacity-45" style={{ color: '#d9c9a3', fontFamily: 'var(--font-cormorant), serif' }}>
        {t('auth.google.hint')}
      </p>
    </div>
  );
}
