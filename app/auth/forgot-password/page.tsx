// Final fixed forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordModal() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showEtherealLink, setShowEtherealLink] = useState(false);
  const [etherealURL, setEtherealURL] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setIsSuccess(true);
        setMessage('Email envoyé avec succès !');
        if (data.previewURL) {
          setEtherealURL(data.previewURL);
          setShowEtherealLink(true);
        }
      } else {
        setMessage(data.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      setMessage('Erreur de connexion');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-amber-800/50 rounded-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold text-amber-300 mb-4">🔑 Réinitialiser le mot de passe</h3>
        
        {isSuccess ? (
          <div className="text-center space-y-4">
            <p className="text-green-400">✅ {message}</p>
            {showEtherealLink && etherealURL && (
              <div className="bg-gray-800/60 border border-amber-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-300 mb-2">Preview Ethereal :</p>
                <a 
                  href={etherealURL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-amber-400 text-xs break-all hover:underline"
                >
                  {etherealURL}
                </a>
              </div>
            )}
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full mystic-btn mt-4"
            >
              Retour connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre email"
              className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm"
              required
            />
            
            {message && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-500/30 rounded px-2 py-1">
                ⚠️ {message}
              </p>
            )}
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.back()}
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
  );
}
