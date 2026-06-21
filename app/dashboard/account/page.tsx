'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    age: '',
    gender: 'other',
    comment: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('tarot_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          phone: u.phone || '',
          age: u.age ? String(u.age) : '',
          gender: u.gender || 'other',
          comment: u.comment || '',
        });
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center">
        <p className="text-amber-300">Chargement...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    router.push('/');
  };

  const handleSave = async () => {
    const res = await fetch('/api/auth/update-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: user.email,
        ...form,
        age: form.age ? parseInt(form.age, 10) : null,
      }),
    });
    
    const data = await res.json();
    if (res.ok) {
      const updatedUser = { ...user, ...form, age: form.age ? parseInt(form.age, 10) : null };
      localStorage.setItem('tarot_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditMode(false);
      setMessage('Modifications sauvegardées');
    } else {
      setMessage(data.error || 'Erreur');
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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-950 via-amber-950/20 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <Link href="/" className="absolute top-4 right-4 text-yellow-400 text-2xl font-bold hover:text-yellow-300 z-10">✕</Link>
      
      <div className="bg-gray-900/80 border border-amber-800/50 rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md flex flex-col max-h-[90vh]">
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent mb-3">
          Mon compte
        </h1>
        
        {message && (
          <p className="text-green-400 text-sm mb-3 px-2 py-1 rounded bg-green-900/20">
            {message}
          </p>
        )}

        <div className="overflow-y-auto flex-1 min-h-0 space-y-3">
          {editMode ? (
            <>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Prenom</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm({...form, firstName: e.target.value})}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Nom</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm({...form, lastName: e.target.value})}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Telephone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Age</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={e => setForm({...form, age: e.target.value})}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Genre</label>
                <select
                  value={form.gender}
                  onChange={e => setForm({...form, gender: e.target.value})}
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">Commentaires</label>
                <textarea
                  value={form.comment}
                  onChange={e => setForm({...form, comment: e.target.value})}
                  rows={3}
                  autoComplete="off"
                  className="w-full px-3 py-2.5 bg-gray-800/60 border border-amber-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-700 rounded-lg text-white font-semibold">
                  ✓ Valider
                </button>
                <button onClick={() => setEditMode(false)} className="flex-1 py-2.5 bg-gray-700 rounded-lg text-white">
                  ✗ Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-white"><span className="text-amber-400 font-medium">Email :</span> {user.email || "-"}</p>
                <p className="text-white"><span className="text-amber-400 font-medium">Prenom :</span> {user.firstName || "-"}</p>
                <p className="text-white"><span className="text-amber-400 font-medium">Nom :</span> {user.lastName || "-"}</p>
                <p className="text-white"><span className="text-amber-400 font-medium">Telephone :</span> {user.phone || "-"}</p>
                <p className="text-white"><span className="text-amber-400 font-medium">Age :</span> {user.age || "-"}</p>
                <p className="text-white"><span className="text-amber-400 font-medium">Genre :</span> {user.gender === "male" ? "Homme" : user.gender === "female" ? "Femme" : user.gender === "other" ? "Autre" : user.gender || "-"}</p>
                <p className="text-white"><span className="text-amber-400 font-medium">Commentaires :</span> {user.comment || "-"}</p>
              </div>
              <button 
                onClick={() => setEditMode(true)} 
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-700 rounded-lg text-white font-semibold mt-2"
              >
                Modifier mes informations
              </button>
            </>
          )}
        </div>

        {!editMode && (
          <div className="pt-3 mt-3 border-t border-amber-800/30 space-y-2">
            <button 
              onClick={handleLogout} 
              className="w-full py-2.5 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-300 text-sm"
            >
              Déconnexion
            </button>
            <button 
              onClick={handleDeleteAccount} 
              className="w-full py-2.5 bg-red-900/50 border border-red-700/50 rounded text-red-400 text-sm"
            >
              Supprimer mon compte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
