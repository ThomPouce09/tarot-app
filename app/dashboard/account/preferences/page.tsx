'use client';

import { useState } from 'react';
import { useLang, useSetLang, useT } from '@/lib/i18n';

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
  const lang = useLang();
  const setLang = useSetLang();
  const t = useT();

  const update = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      localStorage.setItem('tarot_prefs', JSON.stringify(next));
      return next;
    });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <img src="/images/nav-preferences.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('prefs.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t('prefs.subtitle')}</p>
      </header>

      {/* Thème */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-3">{t('prefs.theme')}</h2>
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: 'sombre', icon: '🌑', label: t('prefs.theme.sombre') },
            { key: 'ambre', icon: '🔥', label: t('prefs.theme.ambre') },
            { key: 'nuit', icon: '🌌', label: t('prefs.theme.nuit') },
          ] as const).map((th) => (
            <button key={th.key} onClick={() => update({ theme: th.key })} className={`mystic-panel p-3 flex flex-col items-center gap-1 ${prefs.theme === th.key ? 'ring-2 ring-amber-500/60' : ''}`}>
              <span className="text-2xl">{th.icon}</span>
              <span className="text-xs text-gray-300">{th.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="mystic-panel p-5 space-y-3">
        <h2 className="mystic-subtitle text-sm mb-1">{t('prefs.notifications')}</h2>
        <Toggle label={t('prefs.dailyReminder')} checked={prefs.dailyReminder} onChange={(v) => update({ dailyReminder: v })} />
        <Toggle label={t('prefs.emailNews')} checked={prefs.emailNews} onChange={(v) => update({ emailNews: v })} />
      </div>

      {/* Langue */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-3">{t('prefs.language')}</h2>
        <div className="flex gap-3">
          {([
            { key: 'fr', label: 'Français' },
            { key: 'en', label: 'English' },
          ] as const).map((l) => (
            <button key={l.key} onClick={() => setLang(l.key)} className={`mystic-btn-ghost flex-1 ${lang === l.key ? '!bg-amber-600 !text-white border-amber-500 ring-2 ring-amber-400/70' : 'opacity-60 hover:opacity-100'}`}>
              {lang === l.key ? `✓ ${l.label}` : l.label}
            </button>
          ))}
        </div>
      </div>

      {saved && <p role="status" aria-live="polite" className="text-amber-200 text-xs text-center">{t('prefs.savedAuto')}</p>}
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
