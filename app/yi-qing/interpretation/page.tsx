'use client';

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import WaitOverlay from '@/components/wait-overlay';

export default function YiQingInterpretationPage() {
  const [interpretation, setInterpretation] = useState<{
    numero?: number;
    nom?: string;
    meditation?: string;
    conseil?: string;
    attitude?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Empêcher le double-fetch en React StrictMode (dev)
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const baguetteNum = localStorage.getItem('yi-qing-baguette');
    
    if (!baguetteNum) {
      setError("Aucun tirage trouvé. Retournez à l'accueil pour tirer une baguette.");
      setLoading(false);
      return;
    }

    // Récupérer l'utilisateur connecté pour l'enregistrement en DB
    let userId: string | undefined;
    try {
      const stored = localStorage.getItem('tarot_user');
      if (stored) {
        const user = JSON.parse(stored);
        userId = user.email;
      }
    } catch (e) {}

    fetch('/api/yi-qing-interpretation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baguette: Number(baguetteNum), userId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setInterpretation(data);
      })
      .catch(err => {
        setError(err.message || "Erreur lors de l'interprétation");
        setInterpretation(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <WaitOverlay type="yi-qing" />;
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center p-4">
      <Link 
        href="/" 
        className="fixed top-4 right-4 text-yellow-400 text-3xl font-bold hover:text-yellow-300 transition-colors z-50"
        aria-label="Retour à l'accueil"
      >
        ×
      </Link>
      
      <div className="w-full max-w-md mt-16 pb-16 text-center" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="h-full overflow-y-auto scrollbar-hide">
          {error ? (
          <>
            <p className="text-red-400 mb-4">{error}</p>
            <Link href="/yi-qing" className="text-yellow-400 underline">
              Retour au tirage
            </Link>
          </>
        ) : interpretation ? (
          <>
            <h1 className="text-3xl font-serif text-yellow-400 mb-2 leading-tight">
              {interpretation.nom}
            </h1>
            
            <div className="text-left bg-black/40 p-4 rounded-lg mb-6">
              <h2 className="text-yellow-500 font-bold mb-2">Méditation</h2>
              <p className="text-gray-200 mb-4">{interpretation.meditation}</p>
              
              <h2 className="text-yellow-500 font-bold mb-2">Conseil</h2>
              <p className="text-gray-200 mb-4">{interpretation.conseil}</p>
              
              {interpretation.attitude && (
                <>
                  <h2 className="text-yellow-500 font-bold mb-2">Attitude</h2>
                  <p className="text-gray-200">{interpretation.attitude}</p>
                </>
              )}
            </div>
          </>
        ) : null}
          </div>
        </div>
    </div>
  );
}
