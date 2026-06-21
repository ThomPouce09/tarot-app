'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConfirmPasswordPage() {
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
    
    const res = await fetch('/api/auth/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      setMessage('✅ Mot de passe réinitialisé avec succès!');
      setTimeout(() => router.push('/auth/login'), 2000);
    } else {
      setMessage(data.error || 'Erreur');
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
          {message && <p className="text-red-400 text-xs">{message}</p>}
          <button type="submit" className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg text-white">
            Changer le mot de passe
          </button>
        </form>
      </div>
    </div>
  );
}
