'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api-client';

export default function AccountPage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', dateOfBirth: '', gender: 'other', comment: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  // Statut d'activation FIABLE (DB) — ne pas se fier au localStorage (périmé).
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  // Chargement initial depuis localStorage — HORS du rendu, sinon :
  // "Update hook called on initial render" (setState pendant le rendu interdit).
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tarot_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  // Recharge le statut d'activation depuis la DB (source de vérité).
  useEffect(() => {
    if (!user?.email) return;
    api('/api/auth/refresh-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
      .then((r) => r.json())
      .then((d) => setConfirmed(typeof d.confirmed === 'boolean' ? d.confirmed : false))
      .catch(() => setConfirmed(false));
  }, [user?.email]);

  if (!user) return null;

  const isConfirmed = confirmed === true;

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      const res = await api('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (res.ok) setResendMsg(t('account.resendSent'));
      else setResendMsg(data.error || t('account.resendError'));
    } catch {
      setResendMsg(t('account.resendError'));
    } finally {
      setResending(false);
    }
  };

  const initial = (user.firstName?.[0] || user.email?.[0] || '?').toUpperCase();

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';
  const genderLabel = user.gender === 'male' ? t('account.gender.male') : user.gender === 'female' ? t('account.gender.female') : user.gender === 'other' ? t('account.gender.other') : user.gender || '—';

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    router.push('/');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await api('/api/auth/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...form, dateOfBirth: form.dateOfBirth || null }),
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user, ...form, dateOfBirth: form.dateOfBirth || null };
        localStorage.setItem('tarot_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setEditMode(false);
        setMessage('Modifications sauvegardées ✦');
      } else {
        setMessage(data.error || 'Erreur');
      }
    } catch {
      setMessage('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête profil */}
      <div className="mystic-panel p-5 sm:p-7 flex items-center gap-5">
        <div className="w-20 h-20 shrink-0 rounded-full avatar-mystic flex items-center justify-center text-white text-3xl font-bold" style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="mystic-title text-2xl sm:text-3xl leading-tight truncate">
            {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : t('account.welcome')}
          </h1>
          <p className="text-gray-400 text-sm truncate">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`badge-mystic ${isConfirmed ? '' : 'muted'}`}>
              {confirmed === null ? t('account.checking') : isConfirmed ? t('account.emailConfirmed') : t('account.emailUnconfirmed')}
            </span>
            <span className="badge-mystic muted">{t('account.memberSince')} {memberSince}</span>
          </div>
        </div>
      </div>

      {confirmed === false && (
        <div className="mystic-panel p-4 space-y-2 border-amber-700/40 bg-amber-900/15">
          <p className="text-sm text-amber-100">{t('account.confirmNotice')}</p>
          <p className="text-xs text-amber-200/80">{t('account.confirmAdvice')}</p>
          {resendMsg && <p role="status" aria-live="polite" className="text-xs text-amber-100">{resendMsg}</p>}
          <button
            onClick={handleResend}
            disabled={resending}
            className="mystic-btn text-sm px-4 py-1.5"
          >
            {resending ? t('account.checking') : t('account.resendEmail')}
          </button>
        </div>
      )}

      {message && (
        <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
          {t('account.saved')}
        </p>
      )}

      {/* Détails du profil */}
      <div className="mystic-panel p-5 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="mystic-subtitle text-sm">Informations personnelles</h2>
          {!editMode && (
            <button
              onClick={() => {
                setForm({
                  firstName: user.firstName || '',
                  lastName: user.lastName || '',
                  phone: user.phone || '',
                  dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
                  gender: user.gender || 'other',
                  comment: user.comment || '',
                });
                setEditMode(true);
              }}
              className="mystic-btn-ghost text-sm px-3 py-1.5"
            >
              {t('account.edit')}
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="firstName" label="Prénom" value={form.firstName} onChange={(e: any) => setForm({ ...form, firstName: e.target.value })} />
              <Field id="lastName" label="Nom" value={form.lastName} onChange={(e: any) => setForm({ ...form, lastName: e.target.value })} />
              <Field id="phone" label="Téléphone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} type="tel" />
              <Field id="dateOfBirth" label="Date de naissance" value={form.dateOfBirth} onChange={(e: any) => setForm({ ...form, dateOfBirth: e.target.value })} type="date" />
            </div>
            <div>
              <label htmlFor="gender" className="mystic-label block mb-1">Genre</label>
              <select id="gender" value={form.gender} onChange={(e: any) => setForm({ ...form, gender: e.target.value })} className="mystic-input">
                <option value="male">Homme</option>
                <option value="female">Femme</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="comment" className="mystic-label block mb-1">Commentaires</label>
              <textarea id="comment" value={form.comment} onChange={(e: any) => setForm({ ...form, comment: e.target.value })} rows={3} className="mystic-input resize-none" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleSave} disabled={saving} className="mystic-btn flex-1 disabled:opacity-60">
                {saving ? '...' : t('account.validate')}
              </button>
              <button onClick={() => setEditMode(false)} className="mystic-btn-ghost flex-1">{t('account.cancel')}</button>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <Row label={t('account.firstName')} value={user.firstName} />
            <Row label={t('account.lastName')} value={user.lastName} />
            <Row label={t('account.phone')} value={user.phone} />
            <Row label={t('account.birthDate')} value={user.dateOfBirth
              ? new Date(user.dateOfBirth).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : user.age != null ? `(${user.age} ans)` : null} />
            <Row label={t('account.gender')} value={genderLabel} />
            <Row label={t('account.comment')} value={user.comment} />
          </dl>
        )}
      </div>

      {/* Déconnexion (mobile) */}
      <button onClick={handleLogout} className="md:hidden w-full mystic-btn-ghost py-3">{t('account.logout')}</button>
    </div>
  );
}

function Field({ id, label, value, onChange, type = 'text' }: { id: string; label: string; value: any; onChange: (e: any) => void; type?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mystic-label block mb-1">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete="off"
        className="mystic-input"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b border-amber-800/15 pb-2">
      <dt className="mystic-label shrink-0">{label}</dt>
      <dd className="text-gray-200 text-right truncate">{value || '—'}</dd>
    </div>
  );
}
