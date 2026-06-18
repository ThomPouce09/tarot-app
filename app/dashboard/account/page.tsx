'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: 0,
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      setForm({ firstName: u.firstName || '', lastName: u.lastName || '', email: u.email || '', phone: u.phone || '', age: u.age || 0 });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    router.push('/');
  };

  const handleSave = async () => {
    const res = await fetch('/api/auth/update-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, email: user.email }),
    });
    
    if (res.ok) {
      setMessage('✅ Modifications sauvegardées');
      setEditMode(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('⚠️ Supprimer définitivement votre compte ?')) {
      await fetch('/api/auth/delete-account', { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      localStorage.removeItem('tarot_user');
      router.push('/');
    }
  };

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 p-4">
      <Link href="/dashboard" className="text-amber-400 mb-4 inline-block">← Retour</Link>
      
      <h1 className="text-2xl font-bold text-amber-300 mb-4">🌙 Mon compte</h1>
      
      {message && <p className="text-green-400 text-sm mb-3">{message}</p>}

      <div className="bg-gray-900/60 border border-amber-800/30 rounded-lg p-4 space-y-3 mb-6">
        {editMode ? (
          <>
            <div>
              <label className="text-gray-400 text-xs">Prénom</label>
              <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="w-full px-2 py-1 bg-gray-800 rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-gray-400 text-xs">Nom</label>
              <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="w-full px-2 py-1 bg-gray-800 rounded text-white text-sm" />
            </div>
            <div>
              <label className="text-gray-400 text-xs">Téléphone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-2 py-1 bg-gray-800 rounded text-white text-sm" />
            </div>
            <button onClick={handleSave} className="w-full py-2 bg-amber-600 rounded text-white text-sm">✓ Valider</button>
            <button onClick={() => setEditMode(false)} className="w-full py-2 bg-gray-700 rounded text-white text-sm">✗ Annuler</button>
          </>
        ) : (
          <>
            <p><span className="text-gray-400">Email :</span> {user.email}</p>
            <p><span className="text-gray-400">Prénom :</span> {user.firstName}</p>
            <p><span className="text-gray-400">Nom :</span> {user.lastName || '-'}</p>
            <p><span className="text-gray-400">Téléphone :</span> {user.phone || '-'}</p>
            <button onClick={() => setEditMode(true)} className="w-full py-2 bg-amber-600/30 rounded text-amber-300 text-sm">✏️ Modifier</button>
          </>
        )}
      </div>

      <button onClick={handleLogout} className="w-full py-3 bg-gray-800/50 border border-gray-600/50 rounded text-gray-300 text-sm">
        🚪 Déconnexion
      </button>

      <button onClick={handleDeleteAccount} className="w-full py-3 bg-red-900/50 border border-red-700/50 rounded text-red-400 text-sm mt-2">
        🗑️ Supprimer mon compte
      </button>
    </div>
  );
}
