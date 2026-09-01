'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';

function ConfirmPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  // mode=activate → page d'ACTIVATION de compte (bouton simple, pas de mdp).
  // absent / mode=reset → page de RÉINITIALISATION de mot de passe.
  const isActivate = searchParams.get('mode') === 'activate';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      api(`/api/auth/confirm?token=${token}`)
        .then(r => r.json())
        .then(data => {
          if (data.valid) setVerified(true);
          else setMessage('Lien invalide ou expiré');
        })
        .catch(() => setMessage('Erreur de vérification du lien'));
    }
  }, [token]);

  const finish = (res: any, data: any, okMsg: string) => {
    if (res.ok) {
      // Marque le compte confirmé en local (tarot_user) pour débloquer le gate.
      try {
        const raw = localStorage.getItem('tarot_user');
        if (raw) {
          const u = JSON.parse(raw);
          u.confirmed = true;
          localStorage.setItem('tarot_user', JSON.stringify(u));
        } else if (data?.user) {
          localStorage.setItem('tarot_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            confirmed: true,
          }));
        }
      } catch {}
      setMessage(okMsg);
      setTimeout(() => router.push('/'), 1500);
    } else {
      setMessage(data.error || 'Erreur');
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await api('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mode: 'activate' }),
      });
      const data = await res.json();
      finish(res, data, '✅ Compte activé avec succès !');
    } catch {
      setMessage('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setMessage('Mots de passe différents');
    setLoading(true);
    setMessage('');
    try {
      const res = await api('/api/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, mode: 'reset' }),
      });
      const data = await res.json();
      finish(res, data, '✅ Mot de passe mis à jour.');
    } catch {
      setMessage('Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white">Vérification du lien...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-amber-800/50 rounded-xl p-6 w-full max-w-sm">
        {isActivate ? (
          <>
            <h2 className="text-2xl font-bold text-amber-300 mb-2">✦ Activation de votre compte</h2>
            <p className="text-sm text-amber-100/80 mb-4">
              Confirmez votre adresse email pour activer votre compte et accéder aux univers.
            </p>
            <form onSubmit={handleActivate} className="space-y-4">
              {message && <p className={`text-xs ${message.startsWith('✅') ? 'text-amber-200' : 'text-red-400'}`}>{message}</p>}
              <button type="submit" disabled={loading} className="w-full mystic-btn">
                {loading ? 'Activation...' : 'Activer mon compte ✦'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-amber-300 mb-4">🔑 Nouveau mot de passe</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm"
                required
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmer"
                className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm"
                required
              />
              {message && <p className={`text-xs ${message.startsWith('✅') ? 'text-amber-200' : 'text-red-400'}`}>{message}</p>}
              <button type="submit" disabled={loading} className="w-full mystic-btn">
                {loading ? 'Patientez...' : 'Changer le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <ConfirmPasswordInner />
    </Suspense>
  );
}
