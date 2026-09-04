'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang, useSetLang, useT } from '@/lib/i18n';
import { setSoundPrefs, unlockAllSounds } from '@/lib/sounds';
import { LANDING_BACKGROUNDS, isVideoBackground, backgroundsForLevel, type BackgroundLevel } from '@/lib/backgrounds';
import { useEntitlement } from '@/lib/use-entitlement';

type Prefs = {
  dailyReminder: boolean;
  dailyReminderHour: number;
  emailNews: boolean;
  backgrounds: string[];
  language: 'fr' | 'en';
  soundEffects: boolean;
  voices: boolean;
  haptics: boolean;
};

const DEFAULT_PREFS: Prefs = {
  dailyReminder: false,
  dailyReminderHour: 18,
  emailNews: false,
  backgrounds: [], // vide = tous les fonds en mode aléatoire
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

  // Forfait effectif → fonds disponibles (Apprenti 2 / Initié 7 / Arkane tous).
  // `loaded` = false tant que le forfait réel n'est pas revenu du serveur :
  // pendant ce temps sub est null et level retombe sur 'apprenti'.
  const { sub, loaded } = useEntitlement();
  const level: BackgroundLevel = (sub?.level as BackgroundLevel) || 'apprenti';
  const availableBgs = backgroundsForLevel(level);

  const email = (() => {
    if (typeof window === 'undefined') return '';
    try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return ''; }
  })();

  // Hydrater depuis le serveur (source de vérité) au montage, si connecté.
  const hydrateFromServer = useCallback((e: string) => {
    fetch(`/api/prefs?email=${encodeURIComponent(e)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setPrefs((p) => {
          const next: Prefs = {
            ...p,
            dailyReminder: d.dailyReminder ?? p.dailyReminder,
            dailyReminderHour: d.dailyReminderHour ?? p.dailyReminderHour,
            emailNews: d.emailNews ?? p.emailNews,
            backgrounds: Array.isArray(d.backgrounds) ? d.backgrounds : p.backgrounds,
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
    fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, emailNews: next.emailNews, dailyReminder: next.dailyReminder, dailyReminderHour: next.dailyReminderHour, backgrounds: next.backgrounds }),
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

  // Sélection minimale garantie : si aucune sélection valide n'existe (nouvel
  // utilisateur ou ancienne config « tous en aléatoire » = vide), on coche tous
  // les fonds du forfait. Un état « aucun papier peint choisi » est impossible.
  // ⚠️ Ne JAMAIS écraser une sélection tant que le forfait réel est inconnu
  // (sub null → level 'apprenti') : le pool retomberait sur les 2 fonds par
  // défaut et remplacerait la sélection d'un abonné (bug « retour dans
  // Préférences → les 2 fonds par défaut sont cochés »). Le niveau n'est
  // fiable que lorsque /api/subscription a répondu (sub non null) — pour un
  // compte connecté, on attend donc sub ; seuls les visiteurs anonymes
  // (email vide, rien à écraser) gardent l'ancien comportement immédiat.
  useEffect(() => {
    if (!loaded) return;
    if (email && !sub) return;
    if (availableBgs.length === 0) return;
    setPrefs((p) => {
      const valid = p.backgrounds.filter((b) => availableBgs.includes(b));
      if (valid.length > 0) return p; // sélection déjà correcte
      const next = { ...p, backgrounds: [...availableBgs] };
      try {
        localStorage.setItem('tarot_prefs', JSON.stringify(next));
      } catch { /* ignore */ }
      syncServer(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableBgs, loaded]);

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

      {/* Fond d'écran de l'accueil — rangée compacte ; seuls les fonds du
          forfait sont proposés (Apprenti 2 / Initié 7 / Arkane tous). */}
      <div className="mystic-panel p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="mystic-subtitle text-sm">{t('prefs.background')}</h2>
          {availableBgs.length < LANDING_BACKGROUNDS.length && (
            <span className="text-[10px] uppercase tracking-wider text-amber-200/70">{availableBgs.length} {t('prefs.backgroundPlanCount')} · {level}</span>
          )}
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">
          {t('prefs.backgroundSelected')}
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 gap-1.5">
          {availableBgs.map((bg) => {
            const selected = prefs.backgrounds.includes(bg);
            return (
              <button
                key={bg}
                type="button"
                onClick={() => {
                  // Au moins UN fond doit rester sélectionné : on interdit de
                  // décocher le dernier (aucun état « vide » possible).
                  const base = prefs.backgrounds.filter((b) => availableBgs.includes(b));
                  if (selected && base.length <= 1) return;
                  const next = selected ? base.filter((b) => b !== bg) : [...base, bg];
                  update({ backgrounds: next });
                }}
                className={`relative overflow-hidden rounded-md border transition-all aspect-video w-full ${selected ? 'ring-2 ring-amber-400/80 border-amber-400' : 'border-gray-700/60 opacity-75 hover:opacity-100'}`}
                style={{ background: '#0a0604' }}
              >
                {isVideoBackground(bg) ? (
                  <video src={bg} muted loop playsInline autoPlay className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <span className="absolute bottom-0.5 right-0.5 text-[10px] font-semibold px-1 py-px rounded"
                  style={{ background: selected ? 'rgba(218,165,32,0.9)' : 'rgba(0,0,0,0.55)', color: selected ? '#1a0e0a' : '#fff' }}>
                  {selected ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
        {/* Sélection multiple volontaire : coché = inclus dans la rotation ; aucun coché = tous (aléatoire) */}
        {availableBgs.some((b) => !prefs.backgrounds.includes(b)) && (
          <button onClick={() => update({ backgrounds: [...availableBgs] })} className="mystic-btn-ghost text-xs">{t('prefs.backgroundSelectAll')}</button>
        )}
      </div>

      {/* Notifications & rappel */}
      <div className="mystic-panel p-5 space-y-3">
        <h2 className="mystic-subtitle text-sm mb-1">{t('prefs.notifications')}</h2>
        <Toggle label={t('prefs.dailyReminder')} checked={prefs.dailyReminder} onChange={(v) => update({ dailyReminder: v })} hint={t('prefs.dailyReminderHint')} />
        {prefs.dailyReminder && (
          <p className="text-gray-400 text-xs pl-1">{t('prefs.reminderFixedHour')} <span className="text-amber-200 font-medium">{t('prefs.reminderFixedTime')}</span></p>
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
