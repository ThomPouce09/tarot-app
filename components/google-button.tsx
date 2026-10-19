'use client';

// components/google-button.tsx — Bouton « Continuer avec Google ».
// • Web : rendu PAR GOOGLE (GSI, scripts.accounts.google.com/gsi/client) —
//   conforme aux règles de marque ; popup ; POST /api/auth/google (ID token).
// • APK (natif) : la WebView (origine capacitor://localhost) ne peut pas être
//   autorisée par GSI → flux navigateur système : /api/auth/google/start crée
//   un passage (state + PKCE + ticket), on ouvre l'URL Google dans le navigateur
//   (@capacitor/browser, Custom Tab), Google redirige sur le callback serveur
//   qui résout le compte, puis deep-link tarotdivination:///auth/google/done
//   pour que l'APK retire sa session (/api/auth/google/claim, ticket).
//
// Env : NEXT_PUBLIC_GOOGLE_CLIENT_ID (client_id WEB). Absent → pas de bouton.
// Après succès : mêmes clés de session que /api/auth/login
// (tarot_user + arkane_session_token) → /dashboard/account.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { onAccountChanged } from '@/lib/tutorials';
import { getDeviceToken } from '@/lib/device-client';
import { isNative, openExternal } from '@/lib/capacitor-utils';
import { api } from '@/lib/api-client';

declare global {
  interface Window {
    google?: any;
    __gsiPromise?: Promise<void>;
  }
}

export const HANDOFF_KEY = '***';

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

function applySession(data: any, router: ReturnType<typeof useRouter>) {
  try { localStorage.setItem('tarot_user', JSON.stringify(data.user)); } catch {}
  if (data.session) { try { localStorage.setItem('arkane_session_token', data.session); } catch {} }
  onAccountChanged();
  router.push('/dashboard/account');
}

export default function GoogleButton() {
  const router = useRouter();
  const t = useT();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const native = isNative();

  // ── APK : bouton stylé maison + démarrage du passage navigateur ──
  const startNative = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await api('/api/auth/google/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken: getDeviceToken(), lang: document.documentElement.lang || 'fr' }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) { setError(d.error || t('auth.google.failed')); return; }
      try { localStorage.setItem(HANDOFF_KEY, JSON.stringify({ state: d.state, ticket: d.ticket })); } catch {}
      await openExternal(d.url);
    } catch {
      setError(t('auth.google.failed'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!clientId || native) return; // web seulement : GSI
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !hostRef.current) return;
        const accountsId = window.google?.accounts?.id;
        if (!accountsId) return;
        accountsId.initialize({
          client_id: clientId,
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
              applySession(data, router);
            } catch {
              setError(t('auth.google.failed'));
            } finally {
              setBusy(false);
            }
          },
        });
        accountsId.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          locale: (document.documentElement.lang || 'fr').slice(0, 2),
        });
      })
      .catch(() => { /* GSI bloqué : le bouton reste caché */ });
    return () => { cancelled = true; };
  }, [clientId, native, router, t]);

  if (!clientId) return null;

  if (native) {
    // Rendu maison en APK (bouton « Continuer avec Google », conforme : logo G
    // + texte approuvé, fond blanc — les règles Google autorisent un bouton
    // personnalisé qui lance l'OAuth).
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={startNative}
          disabled={busy}
          className="mx-auto flex items-center justify-center gap-3 rounded-full px-5 py-3 font-medium text-gray-800 shadow disabled:opacity-60"
          style={{ background: '#fff', minHeight: 44, minWidth: 220 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.56 5.87C12.33 13.69 17.68 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.52-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.12 28.9c-.22-1.12-.35-2.28-.35-3.43s.13-2.31.35-3.43l-7.56-5.87C1.09 18.59.37 21.22.37 24s.72 5.41 2.04 7.83l7.71-5.93z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.32 0-11.67-4.19-13.87-9.86l-7.56 5.87C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1rem' }}>
            {busy ? t('auth.google.busy') : t('auth.google.continue')}
          </span>
        </button>
        {error && (
          <p className="text-center text-xs" style={{ color: '#e57373', fontFamily: 'var(--font-cormorant), serif' }} role="alert">{error}</p>
        )}
        <p className="text-center text-[10px] opacity-45" style={{ color: '#d9c9a3', fontFamily: 'var(--font-cormorant), serif' }}>
          {t('auth.google.hint')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
