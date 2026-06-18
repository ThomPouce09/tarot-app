'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Reading {
  id: number;
  type: 'tarot' | 'yi-qing';
  date: string;
  cards?: string;
  hexagram?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (!stored) {
      router.push('/auth/login');
      return;
    }
    setUser(JSON.parse(stored));
    
    // Mock readings
    setReadings([
      { id: 1, type: 'tarot', date: new Date().toISOString(), cards: '🌘 Le Diable • ☀ Le Soleil • 🌙 La Lune' },
      { id: 2, type: 'yi-qing', date: new Date().toISOString(), hexagram: '䷡ Da Zhuang (Grande Accumulation)' },
    ]);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    router.push('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      
      {/* Sidebar overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setShowSidebar(false)}>
          <div className="absolute top-0 left-0 h-full w-64 sidebar-mystic border-r border-amber-800/50 p-4 slide-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-amber-300 font-bold mb-4 text-lg">🔮 Oracle Menu</h3>
            
            <nav className="space-y-2">
              <Link href="/dashboard" className="menu-item-mystic block text-gray-300 px-3 py-2 rounded">
                🏠 Tableau de bord
              </Link>
              <Link href="/dashboard/account" className="menu-item-mystic block text-gray-300 px-3 py-2 rounded">
                👤 Mon compte
              </Link>
              <Link href="/tirage" className="menu-item-mystic block text-gray-300 px-3 py-2 rounded">
                🎴 Tirage Tarot
              </Link>
              <Link href="/yi-qing" className="menu-item-mystic block text-gray-300 px-3 py-2 rounded">
                ☯️ Yi Jing
              </Link>
              <button onClick={handleLogout} className="menu-item-mystic w-full text-left text-red-400 px-3 py-2 rounded">
                🚪 Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 p-4">
        <button 
          onClick={() => setShowSidebar(true)}
          className="mb-4 text-amber-400 text-2xl hover:text-amber-300 transition-colors"
        >
          ☰
        </button>

        <h1 className="text-2xl font-bold text-amber-300 mb-4 title-glow">📜 Historique des tirages</h1>
        
        <div className="space-y-3">
          {readings.map(r => (
            <div key={r.id} className="dashboard-card rounded-lg p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-amber-400 font-medium">
                  {r.type === 'tarot' ? '🎴 Tarot' : '☯️ Yi Jing'}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(r.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-300 text-sm">
                {r.type === 'tarot' ? r.cards : r.hexagram}
              </p>
            </div>
          ))}
          
          {readings.length === 0 && (
            <p className="text-gray-500 text-center">Aucun tirage pour le moment</p>
          )}
        </div>
      </div>
    </div>
  );
}