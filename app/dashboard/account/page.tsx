'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', age: '', gender: 'other', comment: '' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const stored = typeof window !== 'undefined' ? localStorage.getItem('tarot_user') : null;
  if (!user && stored) {
    try { setUser(JSON.parse(stored)); } catch {}
  }
  if (!user) return null;

  const initial = (user.firstName?.[0] || user.email?.[0] || '?').toUpperCase();

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : '—';
  const genderLabel = user.gender === 'male' ? 'Homme' : user.gender === 'female' ? 'Femme' : user.gender === 'other' ? 'Autre' : user.gender || '—';

  const handleLogout = () => {
    localStorage.removeItem('tarot_user');
    router.push('/');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, ...form, age: form.age ? parseInt(form.age, 10) : null }),
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user, ...form, age: form.age ? parseInt(form.age, 10) : null };
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

  const Field = ({ id, label, value, onChange, type = 'text' }: any) => (
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

  return (
    <div className="space-y-6">
      {/* En-tête profil */}
      <div className="mystic-panel p-5 sm:p-7 flex items-center gap-5">
        <div className="w-20 h-20 shrink-0 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white text-3xl font-bold mystic-glow" style={{ fontFamily: 'var(--font-cinzel-deco), serif' }}>
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="mystic-title text-2xl sm:text-3xl leading-tight truncate">
            {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Bienvenue'}
          </h1>
          <p className="text-gray-400 text-sm truncate">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`badge-mystic ${user.confirmed ? '' : 'muted'}`}>
              {user.confirmed ? '✦ Email confirmé' : 'Email non confirmé'}
            </span>
            <span className="badge-mystic muted">Membre depuis {memberSince}</span>
          </div>
        </div>
      </div>

      {message && (
        <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
          {message}
        </p>
      )}

      {message && (
        <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
          {message}
        </p>
      )}

      {/* Détails du profil */}
      <div className="mystic-panel p-5 sm:p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="mystic-subtitle text-sm">Informations personnelles</h2>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="mystic-btn-ghost text-sm px-3 py-1.5">✎ Modifier</button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field id="firstName" label="Prénom" value={form.firstName} onChange={(e: any) => setForm({ ...form, firstName: e.target.value })} />
              <Field id="lastName" label="Nom" value={form.lastName} onChange={(e: any) => setForm({ ...form, lastName: e.target.value })} />
              <Field id="phone" label="Téléphone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} type="tel" />
              <Field id="age" label="Âge" value={form.age} onChange={(e: any) => setForm({ ...form, age: e.target.value })} type="number" />
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
                {saving ? 'Sauvegarde…' : '✓ Valider'}
              </button>
              <button onClick={() => setEditMode(false)} className="mystic-btn-ghost flex-1">✗ Annuler</button>
            </div>
          </div>
        ) : (
          <dl className="space-y-3 text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Prénom" value={user.firstName} />
            <Row label="Nom" value={user.lastName} />
            <Row label="Téléphone" value={user.phone} />
            <Row label="Âge" value={user.age} />
            <Row label="Genre" value={genderLabel} />
            <Row label="Commentaires" value={user.comment} />
          </dl>
        )}
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <QuickLink href="/dashboard/readings" icon="📜" title="Mon historique" sub="Revoir vos tirages" />
        <QuickLink href="/dashboard/account/security" icon="🛡️" title="Sécurité" sub="Mot de passe & compte" />
        <QuickLink href="/dashboard/account/abonnement" icon="✦" title="Mon abonnement" sub="Forfait & facturation" />
        <QuickLink href="/dashboard/account/stats" icon="📊" title="Statistiques" sub="Votre activité" />
      </div>

      {/* Déconnexion (mobile) */}
      <button onClick={handleLogout} className="md:hidden w-full mystic-btn-ghost py-3">🚪 Déconnexion</button>
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

function QuickLink({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <a href={href} className="mystic-panel p-4 flex items-center gap-3 hover:border-amber-600/40 transition-colors group">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-amber-200 font-medium group-hover:text-amber-100">{title}</p>
        <p className="text-gray-500 text-xs">{sub}</p>
      </div>
    </a>
  );
}
