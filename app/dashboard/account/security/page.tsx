'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api-client';

export default function SecurityPage() {
  const router = useRouter();
  const t = useT();
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
    if (newPwd.length < 6) { setMsg({ type: 'err', text: t('security.pwdTooShort') }); return; }
    if (newPwd !== confirmPwd) { setMsg({ type: 'err', text: t('security.pwdMismatch') }); return; }
    setBusy(true);
    try {
      const res = await api('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'ok', text: t('security.pwdUpdated') });
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
      const res = await api('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      setMsg({ type: 'ok', text: data.message || t('security.resetLinkSent') });
      setMode('menu');
    } catch { setMsg({ type: 'err', text: 'Erreur de connexion' }); }
    finally { setBusy(false); }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      const res = await api('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ type: 'err', text: data.error || 'Erreur lors de la suppression' });
        setShowDeleteModal(false);
        setBusy(false);
        return;
      }
      localStorage.removeItem('tarot_user');
      router.push('/');
    } catch {
      setMsg({ type: 'err', text: 'Erreur de connexion' });
      setShowDeleteModal(false);
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <img src="/images/nav-security.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('security.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t('security.subtitle')}</p>
      </header>

      {msg && (
        <p role="status" aria-live="polite" className={`text-sm px-3 py-2 rounded-lg border ${msg.type === 'ok' ? 'text-amber-200 bg-amber-900/20 border-amber-700/30' : 'text-red-300 bg-red-900/20 border-red-700/30'}`}>
          {msg.text}
        </p>
      )}

      {mode === 'menu' && (
        <div className="space-y-3">
          <button onClick={() => setMode('change')} className="mystic-panel w-full p-4 flex items-center justify-between hover:border-amber-600/40 transition-colors group">
            <span className="flex items-center gap-3"><span className="text-2xl">🔑</span><span className="text-left"><span className="block text-amber-200 font-medium">{t('security.changePwd')}</span><span className="block text-gray-500 text-xs">{t('security.changePwdSub')}</span></span></span>
            <span className="text-amber-400/60 group-hover:text-amber-300">→</span>
          </button>
          <button onClick={() => setMode('forgot')} className="mystic-panel w-full p-4 flex items-center justify-between hover:border-amber-600/40 transition-colors group">
            <span className="flex items-center gap-3"><span className="text-2xl">✉️</span><span className="text-left"><span className="block text-amber-200 font-medium">{t('security.forgotPwd')}</span><span className="block text-gray-500 text-xs">{t('security.forgotPwdSub')}</span></span></span>
            <span className="text-amber-400/60 group-hover:text-amber-300">→</span>
          </button>

          <div className="mystic-panel p-5 border-red-800/30">
            <h2 className="mystic-subtitle text-sm text-red-300/80 mb-2">{t('security.dangerZone')}</h2>
            <p className="text-gray-400 text-sm mb-3">{t('security.dangerText')}</p>
            <button onClick={() => setShowDeleteModal(true)} className="mystic-btn-danger w-full">{t('security.deleteAccount')}</button>
          </div>
        </div>
      )}

      {mode === 'change' && (
        <div className="mystic-panel p-5 space-y-4">
          <Field id="cur" label={t('security.currentPwd')} value={currentPwd} onChange={setCurrentPwd} type="password" />
          <Field id="np" label={t('security.newPwd')} value={newPwd} onChange={setNewPwd} type="password" />
          <Field id="cp" label={t('security.confirmPwd')} value={confirmPwd} onChange={setConfirmPwd} type="password" />
          <div className="flex gap-3 pt-1">
            <button onClick={changePassword} disabled={busy} className="mystic-btn flex-1 disabled:opacity-60">{busy ? '…' : t('security.update')}</button>
            <button onClick={() => setMode('menu')} className="mystic-btn-ghost flex-1">{t('security.back')}</button>
          </div>
        </div>
      )}

      {mode === 'forgot' && (
        <div className="mystic-panel p-5 space-y-4">
          <p className="text-gray-300 text-sm">{t('security.forgotSentTo')}</p>
          <p className="text-amber-200 font-medium">{user.email}</p>
          <div className="flex gap-3 pt-1">
            <button onClick={forgotPassword} disabled={busy} className="mystic-btn flex-1 disabled:opacity-60">{busy ? t('security.sending') : t('security.sendLink')}</button>
            <button onClick={() => setMode('menu')} className="mystic-btn-ghost flex-1">{t('security.back')}</button>
          </div>
        </div>
      )}

      {/* Modale de suppression stylée */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80" onClick={() => setShowDeleteModal(false)}>
          <div className="mystic-panel p-6 max-w-sm w-full border-red-800/40" onClick={(e) => e.stopPropagation()}>
            <h3 className="mystic-title text-xl text-red-300 mb-2">{t('security.deleteConfirmTitle')}</h3>
            <p className="text-gray-300 text-sm mb-5">{t('security.deleteConfirmText')}</p>
            <div className="flex gap-3">
              <button onClick={deleteAccount} disabled={busy} className="mystic-btn-danger flex-1 disabled:opacity-60">{busy ? '…' : t('security.yesDelete')}</button>
              <button onClick={() => setShowDeleteModal(false)} className="mystic-btn-ghost flex-1">{t('security.back')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ id, label, value, onChange, type }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  // autoComplete sémantique : active la complétion clavier (save mot de passe,
  // téléphone, etc.) au lieu de la couper — requis en WebView Android.
  const ac =
    type === 'password' ? (id === 'cur' ? 'current-password' : 'new-password')
    : type === 'tel' ? 'tel'
    : type === 'number' ? 'off'
    : id === 'firstName' ? 'given-name'
    : id === 'lastName' ? 'family-name'
    : 'off';
  return (
    <div>
      <label htmlFor={id} className="mystic-label block mb-1">{label}</label>
      <input id={id} type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={ac} className="mystic-input" />
    </div>
  );
}
