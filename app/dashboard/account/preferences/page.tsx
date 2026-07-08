'use client';

import { useState } from 'react';

type Prefs = {
  theme: 'sombre' | 'ambre' | 'nuit';
  dailyReminder: boolean;
  emailNews: boolean;
  language: 'fr' | 'en';
};

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs>({
    theme: 'ambre',
    dailyReminder: true,
    emailNews: false,
    language: 'fr',
  });
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setSaved(false);
  };

  const save = () => {
    localStorage.setItem('tarot_prefs', JSON.stringify(prefs));
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl">⚙️ Préférences</h1>
        <p className="text-gray-500 text-sm mt-1">Personnalisez votre expérience mystique.</p>
      </header>

      {saved && <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">Préférences enregistrées ✦</p>}

      {/* Thème */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-3">Ambiance visuelle</h2>
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: 'sombre', icon: '🌑', label: 'Sombre' },
            { key: 'ambre', icon: '🔥', label: 'Ambre' },
            { key: 'nuit', icon: '🌌', label: 'Nuit' },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => update({ theme: t.key })} className={`mystic-panel p-3 flex flex-col items-center gap-1 ${prefs.theme === t.key ? 'ring-2 ring-amber-500/60' : ''}`}>
              <span className="text-2xl">{t.icon}</span>
              <span className="text-xs text-gray-300">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="mystic-panel p-5 space-y-3">
        <h2 className="mystic-subtitle text-sm mb-1">Notifications</h2>
        <Toggle label="Rappel quotidien de tirage" checked={prefs.dailyReminder} onChange={(v) => update({ dailyReminder: v })} />
        <Toggle label="Lettres mystiques par email" checked={prefs.emailNews} onChange={(v) => update({ emailNews: v })} />
      </div>

      {/* Langue */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-3">Langue</h2>
        <div className="flex gap-3">
          {([
            { key: 'fr', label: 'Français' },
            { key: 'en', label: 'English' },
          ] as const).map((l) => (
            <button key={l.key} onClick={() => update({ language: l.key })} className={`mystic-btn-ghost flex-1 ${prefs.language === l.key ? 'text-amber-300 border-amber-500/50' : ''}`}>{l.label}</button>
          ))}
        </div>
      </div>

      <button onClick={save} className="mystic-btn w-full">✓ Enregistrer</button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300 text-sm">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-amber-600' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
