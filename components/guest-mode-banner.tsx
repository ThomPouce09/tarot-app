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
// L'état vit en base (User.guestMode) ; le cache client est lib/guest-client.

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api-client';
import { announceGuestMode, refreshGuestState, useGuestMode, setGuestViaApi, guestAllowedCached, GUEST_EVENT } from '@/lib/guest-client';

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

/** Petit bouton « Retourner en mode normal » branché sur l'API (utilisé hors
 *  des hubs : verrou de « Mon espace », modale de la roue de la semaine). */
export function GuestExitButton({ onDone }: { onDone?: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await setGuestViaApi(false);
        setBusy(false);
        onDone?.();
      }}
      className="mystic-btn flex-1"
    >
      {busy ? '…' : t('guest.deactivate')}
    </button>
  );
}

export default function GuestModeBanner({ tone = 'gold' }: { tone?: Tone }) {
  const t = useT();
  const guest = useGuestMode();
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);
  // Réservé aux abonnés : sans droit, la bascule n'est même pas affichée.
  const [allowed, setAllowed] = useState(true);
  const [showModal, setShowModal] = useState(false);
  // En mode invité : modale « i » de rappel des règles (même texte qu'à l'activation).
  const [showInfo, setShowInfo] = useState(false);
  const [busy, setBusy] = useState(false);

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
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener(GUEST_EVENT, on);
    };
  }, [refresh]);

  useEffect(() => {
    if (!showModal) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [showModal]);

  const toggle = async (on: boolean) => {
    if (!email || busy) return;
    setBusy(true);
    try {
      const res = await api('/api/guest-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, on }),
      });
      const d = await res.json();
      if (res.ok) announceGuestMode(!!d.guestMode);
    } catch { /* réseau : pas de bascule d'affichage — le serveur decide */ }
    setBusy(false);
    setShowModal(false);
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
            onClick={() => setShowModal(true)}
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
              <div className="sticky bottom-0 -mx-5 mt-5 px-5 pb-1 pt-3 flex gap-3"
                   style={{ background: 'linear-gradient(180deg, transparent, rgba(20,10,6,0.92) 34%)' }}>
                <button onClick={() => setShowModal(false)} className="mystic-btn-ghost flex-1">{t('guest.cancel')}</button>
                <button onClick={() => toggle(true)} disabled={busy} className="mystic-btn flex-1">{busy ? '…' : t('guest.confirm')}</button>
              </div>
            </div>
          </div>,
          document.body,
        )}
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
          onClick={() => toggle(false)}
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
              <button onClick={() => toggle(false)} disabled={busy} className="mystic-btn flex-1">{busy ? '…' : t('guest.deactivate')}</button>
              <button onClick={() => setShowInfo(false)} className="mystic-btn-ghost flex-1">{t('gate.close')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
