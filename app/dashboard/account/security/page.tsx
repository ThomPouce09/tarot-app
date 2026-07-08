'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  // user récupéré depuis le layout via localStorage
  if (typeof window !== 'undefined' && !ready) {
    const stored = localStorage.getItem('tarot_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    setReady(true);
  }

  const [mode, setMode] = useState<'menu' | 'change' | 'forgot'>('menu');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const changePassword = async () => {
    setMsg(null);
    if (newPwd.length < 6) { setMsg({ type: 'err', text: 'Le mot de passe doit faire au moins 6 caractères.' }); return; }
    if (newPwd !== confirmPwd) { setMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' }); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'ok', text: 'Mot de passe mis à jour ✦' });
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); setMode('menu');
      } else {
        setMsg({ type: 'err', text: data.error || 'Erreur' });
      }
    } catch { setMsg({ type: 'err', text: 'Erreur de connexion' }); }
    finally { setBusy(false); }
  };

  const forgotPassword = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      setMsg({ type: 'ok', text: data.message || 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
      setMode('menu');
    } catch { setMsg({ type: 'err', text: 'Erreur de connexion' }); }
    finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      localStorage.removeItem('tarot_user');
      router.push('/');
    } catch { setBusy(false); }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl">🛡️ Sécurité</h1>
        <p className="text-gray-500 text-sm mt-1">Protégez votre sanctuaire mystique.</p>
      </header>

      {msg && (
        <p role="status" aria-live="polite" className={`text-sm px-3 py-2 rounded-lg border ${msg.type === 'ok' ? 'text-amber-200 bg-amber-900/20 border-amber-700/30' : 'text-red-300 bg-red-900/20 border-red-700/30'}`}>
          {msg.text}
        </p>
      )}

      {mode === 'menu' && (
        <div className="space-y-3">
          <button onClick={() => setMode('change')} className="mystic-panel w-full p-4 flex items-center justify-between hover:border-amber-600/40 transition-colors group">
            <span className="flex items-center gap-3"><span className="text-2xl">🔑</span><span className="text-left"><span className="block text-amber-200 font-medium">Modifier le mot de passe</span><span className="block text-gray-500 text-xs">Changer votre mot de passe actuel</span></span></span>
            <span className="text-amber-400/60 group-hover:text-amber-300">→</span>
          </button>
          <button onClick={() => setMode('forgot')} className="mystic-panel w-full p-4 flex items-center justify-between hover:border-amber-600/40 transition-colors group">
            <span className="flex items-center gap-3"><span className="text-2xl">✉️</span><span className="text-left"><span className="block text-amber-200 font-medium">Mot de passe oublié</span><span className="block text-gray-500 text-xs">Recevoir un lien de réinitialisation par email</span></span></span>
            <span className="text-amber-400/60 group-hover:text-amber-300">→</span>
          </button>

          <div className="mystic-panel p-5 border-red-800/30">
            <h2 className="mystic-subtitle text-sm text-red-300/80 mb-2">Zone de danger</h2>
            <p className="text-gray-400 text-sm mb-3">La suppression est définitive et efface tous vos tirages.</p>
            <button onClick={() => setShowDeleteModal(true)} className="mystic-btn-danger w-full">🗑️ Supprimer mon compte</button>
          </div>
        </div>
      )}

      {mode === 'change' && (
        <div className="mystic-panel p-5 space-y-4">
          <Field id="cur" label="Mot de passe actuel" value={currentPwd} onChange={setCurrentPwd} type="password" />
          <Field id="np" label="Nouveau mot de passe" value={newPwd} onChange={setNewPwd} type="password" />
          <Field id="cp" label="Confirmer le nouveau" value={confirmPwd} onChange={setConfirmPwd} type="password" />
          <div className="flex gap-3 pt-1">
            <button onClick={changePassword} disabled={busy} className="mystic-btn flex-1 disabled:opacity-60">{busy ? '…' : '✓ Mettre à jour'}</button>
            <button onClick={() => setMode('menu')} className="mystic-btn-ghost flex-1">Retour</button>
          </div>
        </div>
      )}

      {mode === 'forgot' && (
        <div className="mystic-panel p-5 space-y-4">
          <p className="text-gray-300 text-sm">Un lien de réinitialisation sera envoyé à :</p>
          <p className="text-amber-200 font-medium">{user.email}</p>
          <div className="flex gap-3 pt-1">
            <button onClick={forgotPassword} disabled={busy} className="mystic-btn flex-1 disabled:opacity-60">{busy ? 'Envoi…' : '✉️ Envoyer le lien'}</button>
            <button onClick={() => setMode('menu')} className="mystic-btn-ghost flex-1">Retour</button>
          </div>
        </div>
      )}

      {/* Modale de suppression stylée */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowDeleteModal(false)}>
          <div className="mystic-panel p-6 max-w-sm w-full border-red-800/40" onClick={(e) => e.stopPropagation()}>
            <h3 className="mystic-title text-xl text-red-300 mb-2">⚠️ Supprimer le compte ?</h3>
            <p className="text-gray-300 text-sm mb-5">Cette action est irréversible. Tous vos tirages seront effacés.</p>
            <div className="flex gap-3">
              <button onClick={deleteAccount} disabled={busy} className="mystic-btn-danger flex-1 disabled:opacity-60">{busy ? '…' : 'Oui, supprimer'}</button>
              <button onClick={() => setShowDeleteModal(false)} className="mystic-btn-ghost flex-1">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ id, label, value, onChange, type }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mystic-label block mb-1">{label}</label>
      <input id={id} type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" className="mystic-input" />
    </div>
  );
}
