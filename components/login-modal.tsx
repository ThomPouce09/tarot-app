'use client';

// components/login-modal.tsx
// Modal de connexion partagé (mire "Entrer dans le temple" dorée/parchemin).
// Monté une fois dans le layout ; ouvert depuis n'importe quelle page via
// window.dispatchEvent(new Event('open-login')).
// Remplace les anciennes pages /login et /auth/login (mire (2) à jeter).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api-client';

export const OPEN_LOGIN_EVENT = 'open-login';

export function LoginModal() {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_LOGIN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, onOpen);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('tarot_user', JSON.stringify(data.user));
        setOpen(false);
        router.push('/dashboard/account');
      } else {
        alert(data.error || 'Email ou mot de passe incorrect');
      }
    } catch {
      alert('Erreur de connexion');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative z-10 w-full max-w-md mx-4 p-6 rounded-2xl"
        style={{
          background: 'rgba(26, 14, 10, 0.95)',
          border: '1px solid rgba(218, 165, 32, 0.3)',
          boxShadow: '0 0 40px rgba(218,165,32,0.2)',
        }}
      >
        <h3
          className="text-2xl font-bold text-center mb-6"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: '#FFD700',
            textShadow: '0 0 15px rgba(255,215,0,0.5)',
          }}
        >
          {t('login.title')}
        </h3>
        <p
          className="text-center text-sm mb-6"
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: '1.05rem',
            color: 'rgba(255,215,0,0.7)',
          }}
        >
          {t('login.slogan')}
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: '#FFD700',
              }}
            >
              {t('login.email')}
            </label>
            <input
              type="email"
              value={email}
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              required
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60 transition-all placeholder:text-amber-200/40"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(218,165,32,0.3)',
                color: '#FFE9B0',
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: '1.1rem',
                letterSpacing: '0.02em',
                textTransform: 'lowercase',
              }}
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{
                fontFamily: 'var(--font-cinzel), serif',
                color: '#FFD700',
              }}
            >
              {t('login.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60 transition-all placeholder:text-amber-200/40"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(218,165,32,0.3)',
                color: '#FFE9B0',
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: '1.1rem',
                letterSpacing: '0.02em',
                textTransform: 'lowercase',
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full mystic-btn mt-6"
          >
            {t('login.submit')}
          </button>
        </form>
        <div className="text-center text-xs mt-4 space-y-2">
          <a href="/auth/forgot-password" className="text-amber-300 hover:underline block mx-auto">{t('login.forgot')}</a>
          <a href="/auth/signup" className="text-amber-300 hover:underline block mx-auto">{t('login.signup')}</a>
        </div>
      </div>
    </div>
  );
}
