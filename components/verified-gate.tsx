'use client';

// components/verified-gate.tsx
// Gate "compte vérifié" pour l'accès aux univers (Tarot, Yi Jing, Runes, Dés).
//  - non connecté            → redirige vers '/' + ouvre la mire de connexion
//  - connecté mais non vérif → écran "vérifiez votre email"
//  - vérifié (confirmed=true) → contenu autorisé
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

export type VerifyState = 'loading' | 'ok' | 'unverified';

export function useRequireVerified(): VerifyState {
  const router = useRouter();
  const [state, setState] = useState<VerifyState>('loading');

  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem('tarot_user'); } catch {}
    if (!raw) {
      router.replace('/');
      setTimeout(() => window.dispatchEvent(new Event('open-login')), 100);
      return;
    }
    let u: { email?: string; confirmed?: boolean } | null = null;
    try { u = JSON.parse(raw) as { email?: string; confirmed?: boolean }; } catch {}
    if (!u || !u.email) {
      router.replace('/');
      setTimeout(() => window.dispatchEvent(new Event('open-login')), 100);
      return;
    }
    setState(u.confirmed === true ? 'ok' : 'unverified');
  }, [router]);

  return state;
}

export function VerifiedGate({ state }: { state: VerifyState }) {
  const t = useT();
  const router = useRouter();

  if (state === 'ok') return null;

  const logout = () => {
    localStorage.removeItem('tarot_user');
    router.replace('/');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0a0604]">
      <div className="w-full max-w-md mx-4 p-6 rounded-2xl text-center" style={{ border: '1px solid rgba(218,165,32,0.3)', background: 'rgba(26,14,10,0.7)' }}>
        {state === 'loading' ? (
          <>
            <div className="text-3xl mb-3" aria-hidden>{'🔮'}</div>
            <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520' }}>
              {t('gate.verifyLoading')}
            </h3>
            <p className="text-sm text-amber-200/70" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              {t('gate.verifyLoadingText')}
            </p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-3" aria-hidden>{'✉️'}</div>
            <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#DAA520' }}>
              {t('gate.verifyTitle')}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed mb-4" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              {t('gate.verifyText')}
            </p>
            <div className="flex gap-3">
              <button onClick={() => window.dispatchEvent(new Event('open-login'))} className="mystic-btn flex-1 text-center">{t('gate.reconnect')}</button>
              <button onClick={logout} className="mystic-btn-ghost flex-1">{t('gate.logout')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
