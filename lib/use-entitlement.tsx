'use client';

// lib/use-entitlement.tsx
// Hook + modale de gating côté client. Une seule source pour :
//  - charger les droits (GET /api/subscription) une fois / quand le compte change
//  - vérifier + consommer un tirage (POST /api/entitlement) avant de le lancer
//  - afficher une modale élégante si le tirage est bloqué (limite / paywall)
// Version APK : tous les fetch('/api/...') passent par le wrapper api() (backend distant).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { api } from '@/lib/api-client';

export interface UsageState {
  baseUsedToday: number;
  grandUsedMonth: number;
  grandMonthly: number | null;
  baseUnlimited: boolean;
  welcomeBaseUsed: string[];
  welcomeGrandUsed: boolean;
  bonusGrand: number;
  rechargeCredits: number;
  streakDays: number;
}

export interface SubscriptionState {
  plan: string;
  level: 'apprenti' | 'initie' | 'arkane';
  status: string | null;
  billing: string;
  usage: UsageState | null;
}

export type GateReason = 'ok' | 'not-logged' | 'welcome-base-ok' | 'welcome-grand-ok' | 'limit-base-daily' | 'limit-grand' | 'limit-base-one-universe';

export interface GateDecision {
  allowed: boolean;
  reason: GateReason;
  message: string;
}

function readEmail(): string {
  if (typeof window === 'undefined') return '';
  try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email ?? ''; } catch { return ''; }
}

export function useEntitlement() {
  const t = useT();
  const [email, setEmail] = useState<string>('');
  const [sub, setSub] = useState<SubscriptionState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [gateReason, setGateReason] = useState<GateReason | null>(null);
  // Disponibilité batch de tous les tirages (pour griser les tuiles des hubs).
  const [tiles, setTiles] = useState<Record<string, GateDecision> | null>(null);

  const load = useCallback(async () => {
    const e = readEmail();
    setEmail(e);
    if (!e) { setSub(null); setLoaded(true); return; }
    try {
      const res = await api(`/api/subscription?email=${encodeURIComponent(e)}`);
      if (res.ok) setSub(await res.json());
      else setSub(null);
    } catch { /* offline */ }
    setLoaded(true);
  }, []);

  // Charge la dispo de tous les tirages (GET /api/entitlement/status). Non destructif.
  // Retry (jusqu'à 3x) pour absorber le cold-start Neon (premier appel = 500/timeout).
  const loadTiles = useCallback(async (): Promise<Record<string, GateDecision> | null> => {
    const e = readEmail();
    if (!e) { setTiles(null); return null; }
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await api(`/api/entitlement/status?email=${encodeURIComponent(e)}`);
        if (res.ok) {
          const d = (await res.json()) as Record<string, GateDecision>;
          setTiles(d);
          return d;
        }
      } catch { /* retry */ }
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
    setTiles(null);
    return null;
  }, []);

  useEffect(() => { load(); }, [load]);

  // Vérifie ET consomme un tirage. Renvoie la décision.
  const consume = useCallback(async (type: string, question?: string | null): Promise<GateDecision> => {
    const e = readEmail();
    if (!e) return { allowed: true, reason: 'not-logged', message: '' }; // déconnecté → libre (historique local)
    try {
      const res = await api('/api/entitlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, type, question: question ?? null }),
      });
      const d = (await res.json()) as GateDecision;
      if (!d.allowed) setGateReason(d.reason);
      else setGateReason(null);
      await load(); // rafraîchit les compteurs
      // Rafraîchit aussi la dispo des tuiles (le tirage vient d'être consommé).
      await loadTiles();
      return d;
    } catch {
      return { allowed: true, reason: 'ok', message: '' };
    }
  }, [load, loadTiles]);

  const closeGate = useCallback(() => setGateReason(null), []);
  // Pour les endpoints gâtés côté serveur : on ouvre la modale avec le motif renvoyé (402).
  const openGate = useCallback((reason: GateReason | null) => setGateReason(reason), []);

  return { email, sub, loaded, tiles, loadTiles, consume, gateReason, closeGate, openGate };
}

// ── Modale de gating (paywall / limite) ─────────────────────────
export function EntitlementGateModal({ reason, onClose }: { reason: GateReason | null; onClose: () => void }) {
  const t = useT();
  if (!reason) return null;

  const isBaseDaily = reason === 'limit-base-daily';
  const isGrand = reason === 'limit-grand';
  const notLogged = reason === 'not-logged';

  const title = isBaseDaily ? t('gate.baseDailyTitle') : isGrand ? t('gate.grandLimitTitle') : t('gate.paywallTitle');
  const text = isBaseDaily ? t('gate.baseDailyText') : isGrand ? t('gate.grandLimitText') : t('gate.paywallText');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mystic-panel p-6 max-w-sm w-[92%] text-center" style={{ borderColor: 'rgba(218,165,32,0.35)' }}>
        <div className="text-3xl mb-2">🔮</div>
        <h3 className="mystic-title text-lg mb-2" style={{ color: '#DAA520' }}>{title}</h3>
        <p className="text-gray-300 text-sm leading-relaxed mb-4">{text}</p>
        <div className="flex gap-3">
          <Link href="/dashboard/account/abonnement" className="mystic-btn flex-1 text-center" onClick={onClose}>
            {t('gate.upgrade')}
          </Link>
          <button onClick={onClose} className="mystic-btn-ghost flex-1">{t('gate.close')}</button>
        </div>
      </div>
    </div>
  );
}
