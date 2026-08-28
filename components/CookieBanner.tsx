'use client';
import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setShow(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-4xl mx-auto rounded-xl p-4" style={{ background: 'rgba(26, 14, 10, 0.95)', border: '1px solid rgba(218, 165, 32, 0.3)', boxShadow: '0 0 40px rgba(218,165,32,0.2)' }}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 text-sm" style={{ color: 'rgba(255,215,0,0.8)', fontFamily: 'var(--font-cinzel), serif' }}>
            <p>Nous utilisons des cookies pour améliorer votre expérience. En continuant, vous acceptez notre <a href="/privacy" className="underline" style={{ color: '#DAA520' }}>Politique de confidentialité</a>.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={acceptEssential} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'rgba(218,165,32,0.2)', color: '#DAA520', border: '1px solid rgba(218,165,32,0.3)' }}>
              Essentiels seulement
            </button>
            <button onClick={acceptAll} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: 'linear-gradient(135deg, #8B6914 0%, #DAA520 50%, #8B6914 100%)', color: '#1a0e0a' }}>
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
