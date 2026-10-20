'use client';

// components/guest-mode-banner.tsx — Bascule « mode Invité » sous les tuiles des
// univers (/tarot, /yi-jing, /runes, /des-divinatoires).
//
// Comportement produit (validé) :
//  • Au repos : lien discret « Activer le mode "Invité" » sous les tuiles.
//  • Clic → MODALE qui explique toute la démarche (prêt de tirage, débit sur le
//    compte hôte, anonymat total, aucun historique ni augure) → confirmation →
//    bascule serveur (/api/guest-mode, session obligatoire, non falsifiable).
//  • En mode Invité : BANDEAU ROUGE impossible à manquer + « Retourner en mode
//    normal ».
//
// VERROU 4 CHIFFRES (option A, 2026-10-20) :
//  • À l'activation SANS code existant : modale « Définir votre code » (saisie
//    + confirmation) — l'hôte pose son code devant lui, avant de tendre le
//    téléphone. Le code part haché au serveur (bcrypt), jamais sur l'appareil.
//  • À la sortie : si un code existe en base, modale de saisie 4 chiffres ;
//    le serveur vérifie. Erreurs : code faux (tentatives restantes implicites —
//    le serveur verrouille 15 min après 5 échecs, le temps restant est affiché),
//    et lien « Code oublié ? » → e-mail de réinitialisation (coupe le mode).
//  • Gestion (changer / retirer) : Préférences → section « Mode Invité ».
//
// L'état vit en base (User.guestMode + guestPinHash) ; le cache client est lib/guest-client.

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api-client';
import { announceGuestMode, refreshGuestState, useGuestMode, setGuestViaApi, guestAllowedCached, guestHasPinCached, GUEST_EVENT, type GuestExitError } from '@/lib/guest-client';

function hostEmail(): string {
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return ''; }
}

// Fond du bouton « Activer le mode Invité » : teinte assombrie propre à
// chaque univers (l'app change de fond à chaque visite → un fond uni sombre
// légèrement teinté + bordure lumineuse + ombre portée reste lisible partout).
type Tone = 'gold' | 'lacquer' | 'teal' | 'celeste';
const TONES: Record<Tone, { bg: string; border: string; text: string; glow: string }> = {
  // Tarot : bois profond + or (codes du hub).
  gold:    { bg: 'rgba(38,22,8,0.88)',    border: 'rgba(218,165,32,0.6)',  text: '#F3C969', glow: 'rgba(218,165,32,0.35)' },
  // Yi Jing : laque rouge de Chine + or fin.
  lacquer: { bg: 'rgba(58,10,10,0.88)',   border: 'rgba(239,210,138,0.55)', text: '#F3D9A6', glow: 'rgba(224,86,63,0.4)' },
  // Runes : teal nordique.
  teal:    { bg: 'rgba(4,32,36,0.88)',    border: 'rgba(127,212,225,0.55)', text: '#BFEAF2', glow: 'rgba(0,180,200,0.35)' },
  // Dés zodiacaux : bleu céleste.
  celeste: { bg: 'rgba(10,16,44,0.88)',   border: 'rgba(157,184,255,0.55)', text: '#CBD9FF', glow: 'rgba(120,150,255,0.35)' },
};

// ── Champ 4 chiffres (chiffres espacés, digits uniquement, style parchemin) ──
function PinField({ value, onChange, autoFocus, label }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; label?: string }) {
  const ref = useCallback((el: HTMLInputElement | null) => { if (el && autoFocus) { try { el.focus(); } catch {} } }, [autoFocus]);
  return (
    <label className="block">
      {label && <span className="mb-1 block text-center text-[11px] uppercase tracking-[0.14em]" style={{ fontFamily: 'var(--font-cinzel), serif', color: '#DAA520' }}>{label}</span>}
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={4}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        className="pin-field"
        placeholder="••••"
      />
    </label>
  );
}

// ── Modale « Définir le code » (première activation : posé avant le prêt) ──
export function GuestPinSetupModal({ open, onClose, onConfirm }: {
  open: boolean;
  onClose: () => void;
  /** onResolve(pin) — le parent fait l'appel serveur et referme au succès. */
  onConfirm: (pin: string) => Promise<void>;
}) {
  const t = useT();
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setPin(''); setPin2(''); setErr(''); setBusy(false); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('guest.modalTitle')}>
      <div className="absolute inset-0 bg-black/78 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-sm mystic-panel p-5">
        <h3 className="mystic-title text-lg mb-2 text-center" style={{ color: '#DAA520' }}>{t('guest.pinSetupTitle')}</h3>
        <p className="mb-4 text-center text-[12.5px] leading-relaxed text-gray-300">{t('guest.pinSetupText')}</p>
        <div className="space-y-3">
          <PinField value={pin} onChange={setPin} autoFocus label={t('guest.pinNew')} />
          <PinField value={pin2} onChange={setPin2} label={t('guest.pinConfirm')} />
        </div>
        {err && <p className="mt-3 text-center text-xs" style={{ color: '#F0A0A0' }}>{err}</p>}
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} disabled={busy} className="mystic-btn-ghost flex-1">{t('guest.cancel')}</button>
          <button
            disabled={busy || pin.length !== 4}
            onClick={async () => {
              if (pin !== pin2) { setErr(t('guest.pinMismatch')); return; }
              setBusy(true);
              await onConfirm(pin);
              setBusy(false);
            }}
            className="mystic-btn flex-1"
          >
            {busy ? '…' : t('guest.pinSetupConfirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Modale « Code de sortie » (désactivation : vérification serveur) ──
export function GuestPinModal({ open, onClose, onSuccess, onForgot }: {
  open: boolean;
  onClose: () => void;
  /** Le parent appelle setGuestViaApi(false, pin) ; renvoie l'erreur serveur. */
  onSuccess: (pin: string) => Promise<{ error: GuestExitError; lockedUntil?: number }>;
  /** « Code oublié ? » → e-mail de réinitialisation (le parent fait l'appel). */
  onForgot: () => Promise<void>;
}) {
  const t = useT();
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  useEffect(() => { if (open) { setPin(''); setErr(''); setBusy(false); setForgotSent(false); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('guest.pinAskTitle')}>
      <div className="absolute inset-0 bg-black/78 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-sm mystic-panel p-5">
        <h3 className="mystic-title text-lg mb-2 text-center" style={{ color: '#DAA520' }}>{t('guest.pinAskTitle')}</h3>
        <p className="mb-4 text-center text-[12.5px] leading-relaxed text-gray-300">{t('guest.pinAskText')}</p>
        <PinField value={pin} onChange={setPin} autoFocus />
        {err && <p className="mt-3 text-center text-xs" style={{ color: '#F0A0A0' }}>{err}</p>}
        {forgotSent && <p className="mt-3 text-center text-xs" style={{ color: '#86efac' }}>{t('guest.pinForgotSent')}</p>}
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} disabled={busy} className="mystic-btn-ghost flex-1">{t('guest.cancel')}</button>
          <button
            disabled={busy || pin.length !== 4}
            onClick={async () => {
              setBusy(true);
              const r = await onSuccess(pin);
              setBusy(false);
              if (r.error === 'pin-wrong') setErr(t('guest.pinWrong'));
              else if (r.error === 'pin-format') setErr(t('guest.pinFormat'));
              else if (r.error === 'pin-locked') {
                const mins = Math.max(1, Math.round(((r.lockedUntil || Date.now() + 15 * 60 * 1000) - Date.now()) / 60000));
                setErr(t('guest.pinLocked').replace('%M', String(mins)));
              }
              else if (r.error === 'network') setErr(t('guest.pinNetwork'));
              // succès → le parent referme (onDone)
            }}
            className="mystic-btn flex-1"
          >
            {busy ? '…' : t('guest.pinSubmit')}
          </button>
        </div>
        <button
          type="button"
          onClick={async () => { setBusy(true); await onForgot(); setBusy(false); setForgotSent(true); }}
          className="mx-auto mt-3 block text-[11px] underline underline-offset-2 transition hover:brightness-125"
          style={{ color: 'rgba(218,165,32,0.75)' }}
        >
          {t('guest.pinForgot')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Erreur serveur → message FR pour l'UI (hub + boutons). */
function pinErrLabel(err: GuestExitError, lockedUntil: number | undefined, t: (k: string) => string): string {
  if (err === 'pin-wrong') return t('guest.pinWrong');
  if (err === 'pin-format') return t('guest.pinFormat');
  if (err === 'pin-locked') {
    const mins = Math.max(1, Math.round(((lockedUntil || Date.now() + 15 * 60 * 1000) - Date.now()) / 60000));
    return t('guest.pinLocked').replace('%M', String(mins));
  }
  if (err === 'network') return t('guest.pinNetwork');
  return '';
}

/** Petit bouton « Retourner en mode normal » branché sur l'API (utilisé hors
 *  des hubs : verrou de « Mon espace », modale de la roue de la semaine).
 *  Si un code de sortie existe en base → modale de saisie avant bascule. */
export function GuestExitButton({ onDone }: { onDone?: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [askPin, setAskPin] = useState(false);
  const [err, setErr] = useState('');

  const exitNow = async () => {
    setBusy(true);
    const res = await setGuestViaApi(false); // legacy : aucun code en base → sortie libre
    setBusy(false);
    // Cache périmé (le serveur découvre un code posé entre-temps) → modale.
    if (res.error === 'pin-required') { setAskPin(true); return; }
    if (!res.error) onDone?.();
  };

  return (
    <>
      <button
        disabled={busy}
        onClick={() => {
          setErr('');
          if (guestHasPinCached()) setAskPin(true);
          else void exitNow();
        }}
        className="mystic-btn flex-1"
      >
        {busy ? '…' : t('guest.deactivate')}
      </button>
      <GuestPinModal
        open={askPin}
        onClose={() => setAskPin(false)}
        onSuccess={async (pin) => {
          const r = await setGuestViaApi(false, pin);
          if (!r.error) { setAskPin(false); onDone?.(); }
          return r;
        }}
        onForgot={async () => {
          let email = '';
          try { email = JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch {}
          if (!email) return;
          try { await api('/api/guest-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, action: 'forgot-pin' }) }); } catch { /* silencieux : le message « envoyé » reste prudent */ }
        }}
      />
      {err && <p className="mt-2 text-center text-xs" style={{ color: '#F0A0A0' }}>{err}</p>}
    </>
  );
}

export default function GuestModeBanner({ tone = 'gold' }: { tone?: Tone }) {
  const t = useT();
  const guest = useGuestMode();
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);
  // Réservés aux abonnés : sans droit, la bascule n'est même pas affichée.
  const [allowed, setAllowed] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // En mode invité : modale « i » de rappel des règles (même texte qu'à l'activation).
  const [showInfo, setShowInfo] = useState(false);
  const [busy, setBusy] = useState(false);
  // Verrou 4 chiffres : modales + erreurs.
  const [setupOpen, setSetupOpen] = useState(false);
  const [askPin, setAskPin] = useState(false);
  const [gateErr, setGateErr] = useState('');

  // Re-sync : montage, retour d'onglet, événement global émis par un autre
  // composant (bascule depuis une autre page de l'app).
  const refresh = useCallback(async () => {
    const e = hostEmail();
    setEmail(e);
    if (e) await refreshGuestState(e); // émet l'événement si changement → useGuestMode s'aligne
    setAllowed(guestAllowedCached());
    setReady(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const on = () => refresh();
    window.addEventListener('focus', on);
    document.addEventListener('visibilitychange', on);
    window.addEventListener(GUEST_EVENT, on);
    return () => {
      window.removeEventListener('focus', on);
      window.removeEventListener('visibilitychange', on);
      window.removeEventListener(GUEST_EVENT, on);
    };
  }, [refresh]);

  useEffect(() => {
    if (!showModal) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [showModal]);

  const activate = async (pin?: string | null) => {
    if (!email || busy) return;
    setBusy(true);
    setGateErr('');
    try {
      const res = await api('/api/guest-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, on: true, pin: pin || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        announceGuestMode(!!d.guestMode);
        setShowModal(false);
        setSetupOpen(false);
      } else if (d.error === 'pin-required') {
        // Premier usage : l'hôte pose son code (modale dédiée, avant de prêter).
        setShowModal(false);
        setSetupOpen(true);
      } else {
        setGateErr(String(d.error || ''));
      }
    } catch { /* réseau : pas de bascule d'affichage — le serveur décide */ }
    setBusy(false);
  };

  const exitGuest = async (pin?: string | null) => {
    if (!email || busy) return;
    setBusy(true);
    setGateErr('');
    const r = await setGuestViaApi(false, pin);
    if (!r.error) {
      setAskPin(false);
      setShowInfo(false);
    } else {
      setGateErr(pinErrLabel(r.error, r.lockedUntil, t));
    }
    setBusy(false);
  };

  const deactivateFlow = () => {
    setGateErr('');
    if (guestHasPinCached()) setAskPin(true);
    else void exitGuest(null);
  };

  if (!ready || !email) return null;

  if (!guest) {
    // Bascule invisible aux Apprentis (réservé Initié/Arkane).
    if (!allowed) return null;
    return (
      <>
        <div className="text-center">
          <button
            type="button"
            onClick={() => { setGateErr(''); setShowModal(true); }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-[3px] text-[12px] font-bold leading-none backdrop-blur-sm transition hover:brightness-125"
            style={{
              color: TONES[tone].text,
              background: TONES[tone].bg,
              border: `1px solid ${TONES[tone].border}`,
              boxShadow: `0 2px 14px ${TONES[tone].glow}, 0 1px 3px rgba(0,0,0,0.6)`,
            }}
          >
            <svg aria-hidden viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {t('guest.activate')}
          </button>
        </div>

        {showModal && createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('guest.modalTitle')}>
            <div className="absolute inset-0 bg-black/78 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative z-10 w-full max-w-md mystic-panel p-5 max-h-[86vh] overflow-y-auto overscroll-contain">
              <h3 className="mystic-title text-lg mb-3" style={{ color: '#DAA520' }}>{t('guest.modalTitle')}</h3>
              <ul className="space-y-2 text-[13px] leading-relaxed text-gray-200">
                {[t('guest.rule1'), t('guest.rule2'), t('guest.rule3'), t('guest.rule4'), t('guest.rule5')].map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-amber-400 shrink-0">✦</span><span>{r}</span></li>
                ))}
              </ul>
              {/* Le verrou 4 chiffres (absent d'un compte) est posé ici, à l'activation. */}
              {!guestHasPinCached() && (
                <p className="mt-3 text-[12px] leading-relaxed" style={{ color: '#F3C969' }}>{t('guest.pinBefore')}</p>
              )}
              {gateErr && <p className="mt-3 text-center text-xs" style={{ color: '#F0A0A0' }}>{gateErr}</p>}
              <div className="sticky bottom-0 -mx-5 mt-5 px-5 pb-1 pt-3 flex gap-3"
                   style={{ background: 'linear-gradient(180deg, transparent, rgba(20,10,6,0.92) 34%)' }}>
                <button onClick={() => setShowModal(false)} disabled={busy} className="mystic-btn-ghost flex-1">{t('guest.cancel')}</button>
                <button onClick={() => void activate(null)} disabled={busy} className="mystic-btn flex-1">{busy ? '…' : t('guest.confirm')}</button>
              </div>
            </div>
          </div>,
          document.body,
        )}

        {/* Premier usage : pose du code AVANT de tendre le téléphone à l'invité. */}
        <GuestPinSetupModal
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          onConfirm={async (pin) => { await activate(pin); }}
        />
      </>
    );
  }

  return (
    <div
      className="mx-auto max-w-md text-center"
      role="status"
      aria-live="polite"
    >
      {/* Hauteur minimale : plus que le « i » (rappel) + « Retourner en mode normal » — texte supprimé. */}
      <div className="inline-flex items-center justify-center gap-2 rounded-full py-1 px-1.5"
           style={{ background: 'rgba(120,16,12,0.92)', border: '1.5px solid #E0563F', boxShadow: '0 0 16px rgba(224,86,63,0.5)' }}>
        <button
          onClick={deactivateFlow}
          disabled={busy}
          className="rounded-full px-3 py-[3px] text-[11px] font-bold leading-none transition hover:brightness-110"
          style={{ background: '#F3D9A6', color: '#5A1410' }}
        >
          {busy ? '…' : t('guest.deactivate')}
        </button>
        {/* « i » à droite du bouton : rappelle tout le fonctionnement du mode. */}
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label={t('guest.info')}
          title={t('guest.info')}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none transition hover:brightness-125"
          style={{ border: '1.5px solid #F3D9A6', color: '#F3D9A6' }}
        >
          i
        </button>
      </div>
      {gateErr && <p className="mt-2 text-center text-[11px]" style={{ color: '#F3C9C9' }}>{gateErr}</p>}

      <GuestPinModal
        open={askPin}
        onClose={() => setAskPin(false)}
        onSuccess={async (pin) => {
          const r = await setGuestViaApi(false, pin);
          if (!r.error) { setAskPin(false); setShowInfo(false); }
          return r;
        }}
        onForgot={async () => {
          if (!email) return;
          try { await api('/api/guest-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, action: 'forgot-pin' }) }); } catch { /* silencieux */ }
        }}
      />

      {showInfo && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('guest.modalTitle')}>
          <div className="absolute inset-0 bg-black/78 backdrop-blur-sm" onClick={() => setShowInfo(false)} />
          <div className="relative z-10 w-full max-w-md mystic-panel p-5 max-h-[86vh] overflow-y-auto overscroll-contain">
            <h3 className="mystic-title text-lg mb-3" style={{ color: '#DAA520' }}>{t('guest.modalTitle')}</h3>
            <ul className="space-y-2 text-[13px] leading-relaxed text-gray-200">
              {[t('guest.rule1'), t('guest.rule2'), t('guest.rule3'), t('guest.rule4'), t('guest.rule5')].map((r, i) => (
                <li key={i} className="flex gap-2"><span className="text-amber-400 shrink-0">✦</span><span>{r}</span></li>
              ))}
            </ul>
            <div className="sticky bottom-0 -mx-5 mt-5 px-5 pb-1 pt-3 flex gap-3"
                 style={{ background: 'linear-gradient(180deg, transparent, rgba(20,10,6,0.92) 34%)' }}>
              <button onClick={deactivateFlow} disabled={busy} className="mystic-btn flex-1">{busy ? '…' : t('guest.deactivate')}</button>
              <button onClick={() => setShowInfo(false)} disabled={busy} className="mystic-btn-ghost flex-1">{t('gate.close')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
