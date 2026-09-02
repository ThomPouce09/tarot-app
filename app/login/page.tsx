'use client';

// app/login/page.tsx
// Mire de connexion (2) — accès "Mon espace" depuis le menu (non identifié).
// Restylee pour matcher la mire (1) "Entrer dans le temple" :
// meme typo (Cinzel / Cormorant), memes codes couleurs or/parchemin, meme ambience.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [msg, setMsg] = useState('');

  const maxAttempts = 3;
  const isBlocked = failedAttempts >= maxAttempts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      setError(`Trop d'essais. Réessayez plus tard ou utilisez "Mot de passe oublié".`);
      return;
    }

    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Email et mot de passe requis');
      setIsLoading(false);
      return;
    }

    try {
      const res = await api('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('tarot_user', JSON.stringify(data.user));
        router.push('/dashboard/account');
      } else {
        setFailedAttempts(prev => prev + 1);
        setError(failedAttempts + 1 >= maxAttempts
          ? "Trop d'essais infructueux. Utilisez 'Mot de passe oublié'."
          : "Email ou mot de passe incorrect");
      }
    } catch (err) {
      setFailedAttempts(prev => prev + 1);
      setError('Erreur de connexion');
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');

    try {
      await api('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setMsg('Email envoyé !');
    } catch {
      setMsg('Erreur lors de l\'envoi');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at top, #2a1810 0%, #1a0e0a 60%, #0d0604 100%)',
      }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          background: 'rgba(26, 14, 10, 0.92)',
          border: '1px solid rgba(218, 165, 32, 0.3)',
          boxShadow: '0 0 40px rgba(218,165,32,0.15)',
        }}
      >
        <h2
          className="text-3xl font-bold text-center mb-2"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: '#FFD700',
            textShadow: '0 0 15px rgba(255,215,0,0.4)',
          }}
        >
          {t('login.title')}
        </h2>
        <p
          className="text-center mb-8"
          style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: '1.1rem',
            color: 'rgba(255,215,0,0.65)',
          }}
        >
          {t('login.slogan')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFD700' }}
            >
              {t('login.email')}
            </label>
            <input
              type="email"
              value={email}
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              required
              disabled={isBlocked}
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
              style={{ fontFamily: 'var(--font-cinzel), serif', color: '#FFD700' }}
            >
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isBlocked}
                className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400/60 transition-all placeholder:text-amber-200/40 pr-10"
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(218,165,32,0.3)',
                  color: '#FFE9B0',
                  fontFamily: 'var(--font-cormorant), serif',
                  fontSize: '1.1rem',
                  letterSpacing: '0.02em',
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400/70 hover:text-amber-300"
                disabled={isBlocked}
                aria-label="Afficher le mot de passe"
              >
                {showPassword ? '◉' : '○'}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="text-center text-xs rounded px-2 py-1"
              style={{
                color: '#fca5a5',
                background: 'rgba(127,29,29,0.25)',
                border: '1px solid rgba(239,68,68,0.3)',
                fontFamily: 'var(--font-cormorant), serif',
              }}
            >
              {error}
            </p>
          )}

          {isBlocked && (
            <p
              className="text-center text-xs"
              style={{ color: '#fca5a5', fontFamily: 'var(--font-cormorant), serif' }}
            >
              Compte temporairement bloqué
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || isBlocked}
            className="w-full mystic-btn disabled:opacity-50"
          >
            {isLoading ? 'Connexion...' : isBlocked ? 'Bloqué' : t('login.submit')}
          </button>
        </form>

        <div className="mt-6 pt-4 text-center text-sm space-y-2" style={{ borderTop: '1px solid rgba(218,165,32,0.2)' }}>
          <button
            onClick={() => setShowForgotPassword(true)}
            className="text-amber-300 hover:underline block mx-auto"
            style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1rem' }}
          >
            {t('login.forgot')}
          </button>
          <a
            href="/auth/signup"
            className="text-amber-300 hover:underline block mx-auto"
            style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1rem' }}
          >
            {t('login.signup')}
          </a>
        </div>
      </div>

      {/* Modal Mot de passe oublié */}
      {showForgotPassword && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{
              background: 'rgba(26, 14, 10, 0.95)',
              border: '1px solid rgba(218,165,32,0.3)',
              boxShadow: '0 0 40px rgba(218,165,32,0.2)',
            }}
          >
            <h3
              className="text-xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#FFD700' }}
            >
              Réinitialiser le mot de passe
            </h3>

            {msg ? (
              <div className="text-center space-y-4">
                <p style={{ color: '#86efac', fontFamily: 'var(--font-cormorant), serif', fontSize: '1.05rem' }}>{msg}</p>
                <p style={{ color: 'rgba(255,215,0,0.5)', fontSize: '0.8rem' }}>Vérifiez votre boîte mail (y compris spam)</p>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full mystic-btn"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="Votre email"
                  required
                  className="w-full px-4 py-3 rounded-lg border"
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(218,165,32,0.3)',
                    color: '#FFE9B0',
                    fontFamily: 'var(--font-cormorant), serif',
                    fontSize: '1.1rem',
                    textTransform: 'lowercase',
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 mystic-btn-ghost"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 mystic-btn"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
