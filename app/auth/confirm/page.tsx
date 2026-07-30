'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (token) {
      fetch(`/api/auth/confirm?token=${token}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) setVerified(true);
          else setMessage('Lien invalide ou expiré');
        });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setMessage('Mots de passe différents');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('Mot de passe réinitialisé ! Redirection…');
      setTimeout(() => router.push('/login'), 2000);
    } else {
      setMessage(data.error || 'Erreur');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 p-4">
      <div className="w-full max-w-md bg-gray-900/60 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-6" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: '#c4a0e0' }}>
          Réinitialisation du mot de passe
        </h1>

        {message && (
          <p className="text-center text-sm mb-4" style={{ color: message.includes('Réinitialisé') ? '#87CEEB' : '#ff6b6b' }}>
            {message}
          </p>
        )}

        {verified ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" placeholder="Nouveau mot de passe" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full rounded-lg px-4 py-2 bg-gray-800/70 border border-purple-500/30 text-gray-200 text-sm" />
            <input type="password" placeholder="Confirmer le mot de passe" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
              className="w-full rounded-lg px-4 py-2 bg-gray-800/70 border border-purple-500/30 text-gray-200 text-sm" />
            <button type="submit"
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all hover:opacity-80"
              style={{ background: '#7c3aed', color: '#fff' }}>
              Réinitialiser
            </button>
          </form>
        ) : !message ? (
          <p className="text-center text-sm text-gray-400">Vérification du lien…</p>
        ) : null}
      </div>
    </div>
  );
}

export default function ConfirmPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 p-4">
      <p className="text-gray-400 text-sm">Chargement…</p>
    </div>}>
      <ConfirmContent />
    </Suspense>
  );
}
