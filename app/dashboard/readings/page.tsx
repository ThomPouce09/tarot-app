'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Reading {
  id: number;
  userId?: number | null;
  type: string;
  question?: string | null;
  spread: string;
  cards: any[];
  interpretation?: string | null;
  createdAt: string;
}

export default function ReadingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      // Fetch readings from DB
      fetch(`/api/readings${u.id ? '?userId=' + u.id : ''}`)
        .then(res => res.json())
        .then((data: Reading[]) => {
          setReadings(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Fetch readings error:', err);
          setFetchError('Impossible de charger les tirages');
          setLoading(false);
        });
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center">
        <p className="text-amber-300 animate-pulse">Chargement de l'historique...</p>
      </div>
    );
  }
  if (!user) return null;

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) +
        ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const typeLabel = (type: string) => {
    if (type === 'yi_qing') return '☯ Yi Jing';
    return '🎴 Tarot';
  };

  const typeColor = (type: string) => {
    if (type === 'yi_qing') return 'text-purple-300';
    return 'text-amber-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-amber-400 mb-4 inline-block hover:text-amber-300 transition-colors">
          ← Retour à l'accueil
        </Link>

        <h1 className="text-2xl font-bold text-amber-300 mb-6" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
          📜 Historique des tirages
        </h1>

        {fetchError && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
            <p className="text-red-300 text-sm">{fetchError}</p>
          </div>
        )}

        {readings.length === 0 ? (
          <div className="bg-gray-900/60 border border-amber-800/30 rounded-lg p-8 text-center">
            <p className="text-amber-200/60 text-sm mb-2">Aucun tirage pour le moment.</p>
            <p className="text-gray-500 text-xs mb-4">Vos tirages Tarot et Yi Jing apparaîtront ici.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/tirage" className="inline-block px-4 py-2 bg-amber-600/30 rounded text-amber-300 text-sm hover:bg-amber-600/50 transition-colors">
                🎴 Faire un tirage Tarot
              </Link>
              <Link href="/yi-qing" className="inline-block px-4 py-2 bg-purple-600/30 rounded text-purple-300 text-sm hover:bg-purple-600/50 transition-colors">
                ☯ Tirer une baguette Yi Jing
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {readings.map((r, i) => (
              <div key={r.id || i} className="bg-gray-900/60 border border-amber-800/30 rounded-lg p-4 hover:border-amber-700/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${typeColor(r.type)}`}>
                    {typeLabel(r.type)}
                  </span>
                  <span className="text-gray-500 text-xs">{formatDate(r.createdAt)}</span>
                </div>

                {/* Cards summary */}
                {r.cards && Array.isArray(r.cards) && r.cards.length > 0 && (
                  <div className="text-gray-300 text-sm mt-2">
                    {r.type === 'yi_qing' ? (
                      <span>Baguette n°{(r.cards[0]?.id ?? 0) + 1}</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {r.cards.map((c: any, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-amber-900/20 rounded text-xs">
                            {c.position === 'past' ? 'Passé' : c.position === 'present' ? 'Présent' : c.position === 'future' ? 'Futur' : ''}: {c.name}{c.reversed ? ' (renversée)' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {r.question && (
                  <p className="text-gray-400 text-xs mt-2 italic">"{r.question}"</p>
                )}

                {r.interpretation && (
                  <details className="mt-2">
                    <summary className="text-amber-400 text-xs cursor-pointer hover:text-amber-300">Voir l'interprétation</summary>
                    <p className="text-gray-300 text-xs mt-2 whitespace-pre-wrap">{r.interpretation}</p>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
