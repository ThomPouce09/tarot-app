'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang, useSetLang, useT } from '@/lib/i18n';
import { setSoundPrefs, unlockAllSounds } from '@/lib/sounds';
import { api } from '@/lib/api-client';

type Prefs = {
  dailyReminder: boolean;
  dailyReminderHour: number;
  emailNews: boolean;
  language: 'fr' | 'en';
  soundEffects: boolean;
  voices: boolean;
  haptics: boolean;
};

const DEFAULT_PREFS: Prefs = {
  dailyReminder: false,
  dailyReminderHour: 18,
  emailNews: false,
  language: 'fr',
  soundEffects: true,
  voices: true,
  haptics: true,
};

export default function PreferencesPage() {
  const t = useT();
  const lang = useLang();
  const setLang = useSetLang();
  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
      const raw = localStorage.getItem('tarot_prefs');
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [reminderBlocked, setReminderBlocked] = useState(false);
  const [, setUser] = useState<any>(null);

  const email = (() => {
    if (typeof window === 'undefined') return '';
    try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return ''; }
  })();

  // Hydrater depuis le serveur (source de vérité) au montage, si connecté.
  const hydrateFromServer = useCallback((e: string) => {
    api(`/api/prefs?email=${encodeURIComponent(e)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setPrefs((p) => {
          const next: Prefs = {
            ...p,
            dailyReminder: d.dailyReminder ?? p.dailyReminder,
            dailyReminderHour: d.dailyReminderHour ?? p.dailyReminderHour,
            emailNews: d.emailNews ?? p.emailNews,
          };
          localStorage.setItem('tarot_prefs', JSON.stringify(next));
          setSoundPrefs(next.soundEffects, next.voices, next.haptics);
          return next;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('tarot_user') || '{}')); } catch {}
    if (email) hydrateFromServer(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste côté serveur (lettre + rappel) à chaque changement des champs serveur.
  const syncServer = (next: Prefs) => {
    if (!email) return;
    api('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, emailNews: next.emailNews, dailyReminder: next.dailyReminder, dailyReminderHour: next.dailyReminderHour }),
    }).catch(() => {});
  };

  const update = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      localStorage.setItem('tarot_prefs', JSON.stringify(next));
      syncServer(next);
      return next;
    });
    setSaved(true);
    // Sons + haptique : réapplique la préférence immédiatement.
    if (patch.soundEffects !== undefined || patch.voices !== undefined || patch.haptics !== undefined) {
      const se = patch.soundEffects ?? prefs.soundEffects;
      const vo = patch.voices ?? prefs.voices;
      const ha = patch.haptics ?? prefs.haptics;
      setSoundPrefs(se, vo, ha);
      if (se) unlockAllSounds();
    }
    // Rappel quotidien → demande de permission push (Capacitor).
    if (patch.dailyReminder !== undefined) {
      if (patch.dailyReminder && typeof window !== 'undefined') requestReminderPermission();
      else if (!patch.dailyReminder) setReminderBlocked(false);
    }
  };

  const requestReminderPermission = () => {
    // Déclenche la demande de permission + enregistrement du token FCM côté Capacitor.
    if (typeof window !== 'undefined' && (window as any).__requestPushPermission) {
      (window as any).__requestPushPermission().catch(() => setReminderBlocked(true));
      setReminderBlocked(false);
    }
  };

  const reset = () => {
    setPrefs((p) => {
      const next: Prefs = { ...DEFAULT_PREFS, language: p.language };
      localStorage.setItem('tarot_prefs', JSON.stringify(next));
      setSoundPrefs(next.soundEffects, next.voices, next.haptics);
      syncServer(next);
      return next;
    });
    setSaved(true);
    setConfirmReset(false);
    if (typeof window !== 'undefined' && (window as any).__clearPushPermission) (window as any).__clearPushPermission();
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

      {/* Son & vibrations */}
      <div className="mystic-panel p-5 space-y-3">
        <h2 className="mystic-subtitle text-sm mb-1">{t('prefs.sound')}</h2>
        <Toggle label={t('prefs.soundEffects')} checked={prefs.soundEffects} onChange={(v) => update({ soundEffects: v })} />
        <Toggle label={t('prefs.voices')} checked={prefs.voices} onChange={(v) => update({ voices: v })} />
        <Toggle label={t('prefs.haptics')} checked={prefs.haptics} onChange={(v) => update({ haptics: v })} hint={t('prefs.hapticsHint')} />
      </div>

      {/* Notifications & rappel */}
      <div className="mystic-panel p-5 space-y-3">
        <h2 className="mystic-subtitle text-sm mb-1">{t('prefs.notifications')}</h2>
        <Toggle label={t('prefs.dailyReminder')} checked={prefs.dailyReminder} onChange={(v) => update({ dailyReminder: v })} hint={t('prefs.dailyReminderHint')} />
        {prefs.dailyReminder && (
          <p className="text-gray-400 text-xs pl-1">
            {t('prefs.reminderFixedHour')} <strong>21h</strong>
          </p>
        )}
        {reminderBlocked && <p className="text-red-400/80 text-xs">Notification non autorisée — autorisez-la dans les réglages de l&apos;app.</p>}
        <Toggle label={t('prefs.emailNews')} checked={prefs.emailNews} onChange={(v) => update({ emailNews: v })} hint={t('prefs.emailNewsHint')} />
      </div>

      {/* Langue */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-3">{t('prefs.language')}</h2>
        <div className="flex gap-3">
          {([
            { key: 'fr', label: 'Français' },
            { key: 'en', label: 'English' },
          ] as const).map((l) => (
            <button key={l.key} onClick={() => setLang(l.key)} className={`mystic-btn-ghost flex-1 ${lang === l.key ? '!bg-gradient-to-b !from-violet-500 !to-violet-700 !text-white border-violet-500 ring-2 ring-violet-400/70' : 'opacity-60 hover:opacity-100'}`}>
              {lang === l.key ? `✓ ${l.label}` : l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="mystic-panel p-5">
        {confirmReset ? (
          <div className="flex flex-col gap-3">
            <p className="text-gray-300 text-sm">{t('prefs.resetConfirm')}</p>
            <div className="flex gap-3">
              <button onClick={reset} className="mystic-btn flex-1">✓</button>
              <button onClick={() => setConfirmReset(false)} className="mystic-btn-ghost flex-1">{t('prefs.resetConfirm').split('?')[0]}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="text-red-400/80 hover:text-red-300 text-sm flex items-center gap-2 transition-colors">
            <span>⟲</span> {t('prefs.reset')}
          </button>
        )}
      </div>

      {saved && <p role="status" aria-live="polite" className="text-amber-200 text-xs text-center">{t('prefs.savedAuto')}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <div className="text-gray-300 text-sm">{label}</div>
        {hint && <div className="text-gray-500 text-[11px]">{hint}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-violet-600' : 'bg-gray-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
