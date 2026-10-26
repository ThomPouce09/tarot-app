'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang, useSetLang, useT, tr, type Lang } from '@/lib/i18n';
import SpaceTitle from '@/components/space-title';
import { setSoundPrefs, unlockAllSounds, stopVoices, stopAllSounds } from '@/lib/sounds';
import MusicPlayer from '@/components/music-player';
import { getMusicPrefs, type MusicTrackId } from '@/lib/music';
import { resetAllTutorials } from '@/lib/tutorials';
import { LANDING_BACKGROUNDS, isVideoBackground, backgroundsForLevel, type BackgroundLevel } from '@/lib/backgrounds';
import { useEntitlement } from '@/lib/use-entitlement';
import { setSpaceTheme, type SpaceTheme } from '@/lib/theme';
import { useSpaceToast } from '@/components/space-toast';
import SocialLinksPanel from '@/components/social-links-panel';
import { api } from '@/lib/api-client';

// ── Gestion du code Invité (verrou 4 chiffres, option A) ──
// Visible en mode NORMAL uniquement (la bascule d'activation le pose ; le
// changement/retrait se gère ici). Source de vérité : /api/guest-mode
// (action change-pin, session serveur) — le code n'est jamais stocké en clair
// ni sur l'appareil.
function GuestPinPanel({ email, t, notify, subscriber }: { email: string; t: (k: string) => string; notify: (msg: string) => void; subscriber: boolean }) {
  const [hasPin, setHasPin] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [next2, setNext2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    if (!email) return;
    api(`/api/guest-mode?email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setHasPin(!!d.hasPin); setGuestMode(!!d.guestMode); } })
      .catch(() => {});
  }, [email]);
  useEffect(() => { load(); }, [load]);

  // Réservé aux abonnés Initié/Arkane (comme le mode Invité lui-même — la
  // bascule des hubs est déjà invisible aux Apprentis) : le panneau n'est
  // JAMAIS affiché à un compte Apprenti, ni avant la réponse du serveur.
  if (!email || !subscriber || guestMode) return null;

  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 4);
  const submit = async () => {
    setErr('');
    if (next.length !== 4) { setErr(t('guest.pinFormat')); return; }
    if (next !== next2) { setErr(t('guest.pinMismatch')); return; }
    if (hasPin && cur.length !== 4) { setErr(t('guest.pinFormat')); return; }
    setBusy(true);
    try {
      const res = await api('/api/guest-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'change-pin', currentPin: hasPin ? cur : null, newPin: next }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setHasPin(true); setOpen(false); setCur(''); setNext(''); setNext2('');
        notify(t('prefs.guestPinDone'));
      } else if (d.error === 'pin-wrong') setErr(t('guest.pinWrong'));
      else if (d.error === 'pin-locked') setErr(t('prefs.guestPinLocked'));
      else setErr(t('guest.pinNetwork'));
    } catch { setErr(t('guest.pinNetwork')); }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api('/api/guest-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'change-pin', currentPin: cur, newPin: null }),
      });
      if (res.ok) { setHasPin(false); setOpen(false); setCur(''); notify(t('prefs.guestPinRemoved')); }
    } catch { /* silencieux */ }
    setBusy(false);
  };

  const pinInput = (v: string, set: (x: string) => void, ph: string, autoFocus = false) => (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      maxLength={4}
      autoFocus={autoFocus}
      value={v}
      onChange={(e) => set(digits(e.target.value))}
      placeholder={ph}
      className="pin-field"
    />
  );

  return (
    <div className="mystic-panel p-5">
      <h2 className="mystic-subtitle text-sm mb-1">{t('prefs.guestPin')}</h2>
      <p className="text-gray-400 text-xs leading-relaxed mb-3">{t('prefs.guestPinHint')}</p>
      <p className="mb-3 text-xs" style={{ color: hasPin ? '#86efac' : 'rgba(218,165,32,0.7)' }}>
        {hasPin ? t('prefs.guestPinSet') : t('prefs.guestPinNone')}
      </p>
      {!open ? (
        <div className="flex gap-3">
          <button onClick={() => { setErr(''); setOpen(true); }} className="mystic-btn flex-1 text-sm">{t('prefs.guestPinChange')}</button>
          {hasPin && (
            <button onClick={() => void remove()} disabled={busy} className="mystic-btn-ghost flex-1 text-sm">
              {t('prefs.guestPinRemove')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {hasPin && pinInput(cur, setCur, t('prefs.guestPinCurrent'), true)}
          {pinInput(next, setNext, t('guest.pinNew'), !hasPin)}
          {pinInput(next2, setNext2, t('guest.pinConfirm'))}
          {err && <p className="text-center text-xs" style={{ color: '#F0A0A0' }}>{err}</p>}
          <div className="flex gap-3">
            <button onClick={() => { setOpen(false); setErr(''); }} disabled={busy} className="mystic-btn-ghost flex-1">{t('guest.cancel')}</button>
            <button onClick={submit} disabled={busy} className="mystic-btn flex-1">{busy ? '…' : '✓'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

type Prefs = {
  dailyReminder: boolean;
  // « Vous nous manquez » : interrupteur INDÉPENDANT du rappel quotidien
  // (découplage demandé — ils étaient liés par erreur UI + cron).
  missYou: boolean;
  emailNews: boolean;
  backgrounds: string[];
  language: 'fr' | 'en' | 'es' | 'hi';
  soundEffects: boolean;
  voices: boolean;
  musicOn: boolean;
  musicTrack: MusicTrackId;
  theme: SpaceTheme;
};

const DEFAULT_PREFS: Prefs = {
  dailyReminder: false,
  missYou: true, // comportement historique : actif par défaut
  emailNews: false,
  backgrounds: [], // vide = tous les fonds en mode aléatoire
  language: 'fr',
  soundEffects: true,
  voices: true,
  musicOn: true,
  musicTrack: 'vibrations',
  theme: 'sombre',
};

// Langues proposées, dans l'ordre d'affichage des pastilles.
const LANGUAGES: { key: Lang; label: string }[] = [
  { key: 'fr', label: 'Français' },
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Español' },
  { key: 'hi', label: 'हिन्दी (Indian)' },
];

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
  const { show: showToast, toast: spaceToast } = useSpaceToast();
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
            missYou: typeof d.missYou === 'boolean' ? d.missYou : p.missYou,
            emailNews: d.emailNews ?? p.emailNews,
            backgrounds: Array.isArray(d.backgrounds) ? d.backgrounds : p.backgrounds,
            musicOn: typeof d.musicOn === 'boolean' ? d.musicOn : p.musicOn,
            musicTrack: d.musicTrack === "silverwell" ? "silverwell" : d.musicTrack === "constellations" ? "constellations" : (d.musicTrack === "promenades" || d.musicTrack === "premium" ? "promenades" : "vibrations"),
            theme: d.theme === "clair" ? "clair" : "sombre",
          };
          localStorage.setItem('tarot_prefs', JSON.stringify(next));
          setSoundPrefs(next.soundEffects, next.voices);
          // Langue choisie ailleurs (autre appareil) : on la reprend, sans boucle
          // (setLang n'écrit qu'en local, il ne rappelle pas le serveur).
          if (['fr', 'en', 'es', 'hi'].includes(String(d.language))) setLang(d.language as Lang);
          // Le player musique lit tarot_prefs → on le resynchronise.
          window.dispatchEvent(new Event('musicprefs-changed'));
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
      body: JSON.stringify({ email, emailNews: next.emailNews, dailyReminder: next.dailyReminder, missYou: next.missYou, backgrounds: next.backgrounds, musicOn: next.musicOn, musicTrack: next.musicTrack, language: next.language, theme: next.theme }),
    }).catch(() => {});
  };

  // Le player Musique écrit ses réglages via lib/music (hors du state local) :
  // on les renvoie aussi au serveur à chaque changement, et on resynchronise
  // l'état local pour que les futurs syncServer ne les écrasent pas.
  useEffect(() => {
    const sync = () => {
      const m = getMusicPrefs();
      setPrefs((p) => ({ ...p, musicOn: m.on, musicTrack: m.track }));
      if (!email) return;
      fetch('/api/prefs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, musicOn: m.on, musicTrack: m.track }),
      }).catch(() => {});
    };
    window.addEventListener('musicprefs-changed', sync);
    return () => window.removeEventListener('musicprefs-changed', sync);
  }, [email]);

  const update = (patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      localStorage.setItem('tarot_prefs', JSON.stringify(next));
      syncServer(next);
      return next;
    });
    setSaved(true);
    // Sons : réapplique la préférence immédiatement, en coupant les pistes en cours.
    if (patch.soundEffects !== undefined || patch.voices !== undefined) {
      const se = patch.soundEffects ?? prefs.soundEffects;
      const vo = patch.voices ?? prefs.voices;
      setSoundPrefs(se, vo);
      if (!vo) stopVoices();
      if (!se) stopAllSounds(); // les effets incluent tout le reste
      if (se) unlockAllSounds();
    }
    // Rappel quotidien → demande de permission push (Capacitor).
    if (patch.dailyReminder !== undefined || patch.missYou !== undefined) {
      const wantsPush = (patch.dailyReminder ?? prefs.dailyReminder) || (patch.missYou ?? prefs.missYou);
      if (wantsPush && typeof window !== 'undefined') requestReminderPermission();
      else if (!wantsPush) setReminderBlocked(false);
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
      setReminderBlocked(false);
      (window as any).__requestPushPermission()
        .then((ok: boolean) => { if (!ok) setReminderBlocked(true); })
        .catch(() => setReminderBlocked(true));
    }
  };

  const reset = () => {
    setPrefs((p) => {
      const next: Prefs = { ...DEFAULT_PREFS, language: p.language };
      localStorage.setItem('tarot_prefs', JSON.stringify(next));
      setSoundPrefs(next.soundEffects, next.voices);
      syncServer(next);
      return next;
    });
    setSaved(true);
    setConfirmReset(false);
    if (typeof window !== 'undefined' && (window as any).__clearPushPermission) (window as any).__clearPushPermission();
  };

  return (
    <div className="space-y-6">
      {spaceToast}
      <SpaceTitle img="/images/nav-preferences.png" title={t('prefs.title')} subtitle={t('prefs.subtitle')} dense />

      {/* Son */}
      <div className="mystic-panel p-5 space-y-3">
        <h2 className="mystic-subtitle text-sm mb-1">{t('prefs.sound')}</h2>
        <Toggle label={t('prefs.soundEffects')} checked={prefs.soundEffects} onChange={(v) => update({ soundEffects: v })} />
        <Toggle label={t('prefs.voices')} checked={prefs.voices} onChange={(v) => update({ voices: v })} />
      </div>

      {/* Musique de l'accueil — player dédié (piste, play/pause, volume, on/off). */}
      <div className="mystic-panel p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="mystic-subtitle text-sm">{t('prefs.music')}</h2>
          {level === 'apprenti' && (
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(218,165,32,0.6)' }}>{t('music.premium.teaser')}</span>
          )}
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">{t('prefs.musicHint')}</p>
        <MusicPlayer level={level} ready={loaded && (!email || !!sub)} />
      </div>

      {/* Thème du ciel de Mon espace — entre musique et fonds d'écran.
          Pastilles dorées façon « langue » : Sombre (bleu nuit étoilé) /
          Clair (ancien ciel violet). Bascule instantanée : la layout écoute
          l'événement spacetheme-changed. */}
      <div className="mystic-panel p-5 space-y-3">
        <h2 className="mystic-subtitle text-sm">{t('prefs.sky')}</h2>
        <p className="text-gray-400 text-xs leading-relaxed">{t('prefs.skyHint')}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['sombre', 'clair'] as const).map((th) => {
            const on = prefs.theme === th;
            return (
              <button
                key={th}
                type="button"
                onClick={() => { setSpaceTheme(th); update({ theme: th }); }}
                aria-pressed={on}
                className="rounded-[0.6rem] py-2.5 text-sm font-semibold transition-all duration-200 hover:brightness-110"
                style={
                  on
                    ? {
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 58%), linear-gradient(135deg, #F0C75E, #B8860B)',
                        color: '#34121F',
                        border: '1px solid rgba(240,199,94,0.9)',
                        boxShadow: '0 4px 14px rgba(218,165,32,0.4), inset 0 -3px 8px rgba(122,74,4,0.45)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(245,234,214,0.75)',
                        border: '1px solid rgba(240,199,94,0.25)',
                      }
                }
              >
                {th === 'sombre' ? t('prefs.skySombre') : t('prefs.skyClair')}
              </button>
            );
          })}
        </div>
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
          {LANDING_BACKGROUNDS.map((bg) => {
            const reserved = !availableBgs.includes(bg);
            const selected = prefs.backgrounds.includes(bg);
            return (
              <button
                key={bg}
                type="button"
                onClick={() => {
                  // Fonds hors forfait : visibles mais grisés → simple alerte.
                  if (reserved) { showToast(t('space.reserved')); return; }
                  // Au moins UN fond doit rester sélectionné : on interdit de
                  // décocher le dernier (aucun état « vide » possible).
                  const base = prefs.backgrounds.filter((b) => availableBgs.includes(b));
                  if (selected && base.length <= 1) return;
                  const next = selected ? base.filter((b) => b !== bg) : [...base, bg];
                  update({ backgrounds: next });
                }}
                className={`relative overflow-hidden rounded-md border transition-all aspect-video w-full ${reserved ? 'opacity-40 grayscale cursor-not-allowed border-gray-700/40' : selected ? 'ring-2 ring-amber-400/80 border-amber-400' : 'border-gray-700/60 opacity-75 hover:opacity-100'}`}
                style={{ background: '#0a0604' }}
              >
                {isVideoBackground(bg) ? (
                  <video src={bg} muted loop playsInline autoPlay className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {reserved ? (
                  <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,234,214,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  </span>
                ) : (
                  <span className="absolute bottom-0.5 right-0.5 text-[10px] font-semibold px-1 py-px rounded"
                    style={{ background: selected ? 'rgba(218,165,32,0.9)' : 'rgba(0,0,0,0.55)', color: selected ? '#1a0e0a' : '#fff' }}>
                    {selected ? '✓' : ''}
                  </span>
                )}
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
        {reminderBlocked && <p className="text-red-400/80 text-xs">{tr('Notification non autorisée — autorisez-la dans les réglages de l’app.', 'Notification not allowed — enable it in the app settings.', 'Notificación no permitida — actívela en los ajustes de la app.', 'सूचना अनुमति है — आप आप की आएप के सेटिंग में इसे सक्रम करें।')}</p>}
        <Toggle label={t('prefs.missYou')} checked={prefs.missYou} onChange={(v) => update({ missYou: v })} hint={t('prefs.missYouHint')} />
        {level === 'apprenti' ? (
          // Le clic sur l'interrupteur grisé doit AUSSI déclencher l'alerte :
          // un <button disabled> n'émet aucun événement → on neutralise ses
          // pointer-events pour que le clic remonte au conteneur (toast).
          <div className="cursor-pointer [&_button]:pointer-events-none" onClick={() => showToast(t('space.reserved'))}>
            <Toggle label={t('prefs.emailNews')} checked={false} disabled onChange={() => {}} hint={t('prefs.emailNewsHint')} />
          </div>
        ) : (
          <Toggle label={t('prefs.emailNews')} checked={prefs.emailNews} onChange={(v) => update({ emailNews: v })} hint={t('prefs.emailNewsHint')} />
        )}
      </div>

      {/* Langue — pastilles alignées sur la charte de la page (or sur bois).
          Même idiome que le LanguageGate : pilule dorée = langue active,
          fant sombre cerclé d'or sinon. */}
      <div className="mystic-panel p-5">
        <h2 className="mystic-subtitle text-sm mb-3">{t('prefs.language')}</h2>
        <div role="group" aria-label={t('prefs.language')} className="grid grid-cols-2 gap-2.5">
          {LANGUAGES.map((l) => {
            const on = lang === l.key;
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => { setLang(l.key); update({ language: l.key }); }}
                aria-pressed={on}
                className="rounded-[0.6rem] py-2.5 text-sm font-semibold transition-all duration-200 hover:brightness-110"
                style={
                  on
                    ? {
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 58%), linear-gradient(135deg, #F0C75E, #B8860B)',
                        color: '#34121F',
                        border: '1px solid rgba(240,199,94,0.9)',
                        boxShadow: '0 4px 14px rgba(218,165,32,0.4), inset 0 -3px 8px rgba(122,74,4,0.45)',
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(90,58,30,0.5), rgba(58,36,16,0.5))',
                        color: '#F5EAD6',
                        border: '1px solid rgba(218,165,32,0.35)',
                        boxShadow: 'inset 0 1px 0 rgba(240,199,94,0.07)',
                      }
                }
              >
                {on ? '✓ ' : ''}{l.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Code du mode Invité — verrou 4 chiffres du retour au mode normal
          (gérable/réinitialisable ici, en mode normal). */}
      <GuestPinPanel email={email} t={t} notify={showToast} subscriber={level !== 'apprenti'} />

      {/* Visiter — rejouer le tutoriel de première visite */}
      <div className="mystic-panel p-5">
        <button
          onClick={async () => {
            // Le clear serveur doit être CONFIRMÉ avant le rechargement, sinon
            // la navigation annule le fetch et l'hydratation remet les flags.
            await resetAllTutorials(); // compte (base) + cache local
            // Rechargement COMPLET : le tour est monté dans layout.tsx et ne
            // se remonterait pas sur une navigation client (router.push).
            window.location.assign('/');
          }}
          className="mystic-btn w-full text-sm"
        >
          {t('prefs.replayTour')}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-gray-500">{t('prefs.replayTourHint')}</p>
      </div>

      {/* Nous suivre — liens officiels Instagram / Facebook / TikTok (point 6).
          URLs stockées en base (table social_links, Neon) ; un réseau sans URL
          apparaît grisé « bientôt ». Icônes SVG inline (charte maison).
          Position exigée : entre « Revoir le tutoriel » et la réinitialisation. */}
      <SocialLinksPanel t={t} />

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

function Toggle({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-70' : ''}`}>
      <div className="min-w-0">
        <div className="text-gray-300 text-sm">{label}</div>
        {hint && <div className="text-gray-500 text-[11px]">{hint}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => { if (!disabled) onChange(!checked); }}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-violet-600' : 'bg-gray-700'} ${disabled ? 'cursor-default' : ''}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}
