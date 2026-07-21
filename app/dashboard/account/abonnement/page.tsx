'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { PLAN_PRICE_EUR, PLAN_NAME_KEY, PLAN_FEATURES_KEY, PLAN_ICON, type PlanId } from '@/lib/plans';

type PlanInfo = { priceEur?: number; isPaid: boolean };

const PLANS: PlanId[] = ['gratuit', 'initie', 'oracle'];

const PLAN_INFO: Record<PlanId, PlanInfo> = {
  gratuit: { isPaid: false },
  initie: { priceEur: PLAN_PRICE_EUR.initie, isPaid: true },
  oracle: { priceEur: PLAN_PRICE_EUR.oracle, isPaid: true },
};

function formatPrice(eur: number): string {
  return `${eur.toFixed(2).replace('.', ',')} €`;
}

export default function AbonnementPage() {
  const t = useT();
  const [current, setCurrent] = useState<PlanId>('gratuit');
  const [status, setStatus] = useState<'actif' | 'suspendu' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [email, setEmail] = useState<string>('');

  // Charge l'abonnement réel (Gratuit par défaut si aucun).
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('tarot_user') : null;
    let userEmail = '';
    if (stored) {
      try { userEmail = JSON.parse(stored).email ?? ''; } catch { /* noop */ }
    }
    setEmail(userEmail);

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (params.get('status') === 'success') {
      setMsg(t('sub.successMsg'));
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('status') === 'cancel') {
      setMsg(t('sub.cancelMsg'));
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (!userEmail) return;

    // Fonction de chargement du statut abonnement
    const loadSubscription = async () => {
      try {
        const res = await fetch(`/api/subscription?email=${encodeURIComponent(userEmail)}`);
        const d = await res.json();
        if (d.plan) setCurrent(d.plan);
        setStatus(d.status ?? null);
        return d.plan;
      } catch {
        return null;
      }
    };

    // Si on revient d'un paiement, on confirme la session Stripe directement
    // (contourne le besoin du webhook pour la mise à jour immédiate)
    const confirmAndLoad = async () => {
      if (sessionId) {
        try {
          const confirmRes = await fetch(`/api/checkout/confirm?session_id=${sessionId}`);
          const confirmData = await confirmRes.json();
          if (confirmData.plan && confirmData.plan !== 'gratuit') {
            setCurrent(confirmData.plan);
            setStatus(confirmData.status ?? null);
            setMsg(t('sub.successMsg'));
            return; // déjà à jour, pas besoin de poller
          }
        } catch { /* fallback: on poll */ }
      }
      // Si pas de session_id ou si la confirmation n'a pas marché, on poll
      const plan = await loadSubscription();
      if (params.get('status') === 'success' && (!plan || plan === 'gratuit')) {
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const newPlan = await loadSubscription();
          if (newPlan && newPlan !== 'gratuit') break;
        }
      }
    };
    confirmAndLoad();
  }, [t]);

  const choose = async (p: PlanId) => {
    if (p === 'gratuit') {
      if (current !== 'gratuit') {
        // Sur un plan payant : rediriger vers Stripe portal pour résilier
        manage();
        return;
      }
      setCurrent(p);
      setStatus(null);
      setMsg(t('sub.selected').replace('{name}', t(PLAN_NAME_KEY[p])));
      return;
    }
    if (!email) {
      setMsg(t('sub.loginRequired') || 'Connecte-toi pour souscrire.');
      return;
    }
    setLoading(p);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: p, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.error || "Échec de l'initialisation du paiement.");
    } catch {
      setMsg("Erreur de connexion au serveur de paiement.");
    } finally {
      setLoading(null);
    }
  };

  const manage = async () => {
    if (!email) {
      setMsg(t('sub.loginRequired') || 'Connecte-toi pour gérer ton abonnement.');
      return;
    }
    setManageLoading(true);
    try {
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.error || "Échec de l'ouverture du portail.");
    } catch {
      setMsg("Erreur de connexion au serveur.");
    } finally {
      setManageLoading(false);
    }
  };

  const isSubscribed = current !== 'gratuit' && status !== 'suspendu';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <img src="/images/nav-abonnement.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('sub.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('sub.statusLabel')}{' '}
          {current === 'gratuit' ? (
            <span className="text-gray-400">{t('sub.freeName')}</span>
          ) : (
            <span className={status === 'suspendu' ? 'text-gray-400' : 'text-amber-300'}>
              {status === 'suspendu' ? t('sub.suspended') : t('sub.active')}
            </span>
          )}
          {current !== 'gratuit' && <span className="ml-2 badge-mystic">{t(PLAN_NAME_KEY[current])}</span>}
        </p>
      </header>

      {msg && (
        <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
          {msg}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isSubscribed ? (
          <button onClick={manage} disabled={manageLoading} className="mystic-btn-ghost">
            {manageLoading ? '…' : (t('sub.manage') || 'Gérer mon abonnement')}
          </button>
        ) : (
          <button onClick={() => setMsg(t('sub.previewNote'))} className="mystic-btn-ghost">
            {t('sub.suspend') || 'Changer de forfait'}
          </button>
        )}
      </div>

      {/* Cartes de forfaits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const isCurrent = p === current;
          const info = PLAN_INFO[p];
          const features = t(PLAN_FEATURES_KEY[p]).split('|');
          return (
            <div key={p} className={`mystic-panel p-5 flex flex-col ${isCurrent ? 'ring-2 ring-amber-500/60' : ''}`}>
              <div className="text-3xl mb-2">{PLAN_ICON[p]}</div>
              <h2 className="mystic-title text-lg">{t(PLAN_NAME_KEY[p])}</h2>
              <p className="mystic-subtitle text-sm mb-3">
                {info.isPaid ? (
                  <span className="text-amber-300 font-semibold">{formatPrice(info.priceEur!)}</span>
                ) : (
                  <span className="text-gray-500">{t('sub.free')}</span>
                )}
                {info.isPaid && <span className="text-gray-500"> {t('sub.perMonth')}</span>}
              </p>
              <ul className="space-y-1.5 text-sm text-gray-300 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-amber-400">✦</span><span>{f}</span></li>
                ))}
              </ul>
              <button
                onClick={() => choose(p)}
                disabled={isCurrent || loading !== null}
                className={`mt-4 w-full ${isCurrent ? 'mystic-btn-ghost opacity-60 cursor-default' : info.isPaid ? 'mystic-btn' : 'mystic-btn-ghost'}`}
              >
                {isCurrent ? t('sub.currentPlan') : loading === p ? '…' : info.isPaid ? t('sub.subscribe') : t('sub.choose')}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs text-center">{t('sub.previewNote')}</p>
    </div>
  );
}
