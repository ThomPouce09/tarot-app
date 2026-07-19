'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';

type Plan = 'gratuit' | 'initie' | 'oracle';

const PLAN_NAMES: Record<Plan, string> = {
  gratuit: 'sub.freeName',
  initie: 'sub.initieName',
  oracle: 'sub.oracleName',
};
const PLAN_ICONS: Record<Plan, string> = {
  gratuit: '🌙',
  initie: '✦',
  oracle: '🔮',
};
const PLAN_FEATURES: Record<Plan, string> = {
  gratuit: 'sub.freeFeatures',
  initie: 'sub.initieFeatures',
  oracle: 'sub.oracleFeatures',
};

export default function AbonnementPage() {
  const t = useT();
  const [current, setCurrent] = useState<Plan>('initie');
  const [status, setStatus] = useState<'actif' | 'suspendu'>('actif');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<Plan | null>(null);

  const choose = async (p: Plan) => {
    // Forfait gratuit : bascule locale immédiate (pas de paiement).
    if (p === 'gratuit') {
      setCurrent(p);
      setMsg(t('sub.selected').replace('{name}', t(PLAN_NAMES[p])));
      return;
    }
    // Forfaits payants : on initie le paiement Stripe (CB + PayPal).
    const stored = typeof window !== 'undefined' ? localStorage.getItem('tarot_user') : null;
    const email = stored ? (JSON.parse(stored).email as string) : '';
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <img src="/images/nav-abonnement.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('sub.title')}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('sub.statusLabel')} <span className={status === 'actif' ? 'text-amber-300' : 'text-gray-400'}>{status === 'actif' ? t('sub.active') : t('sub.suspended')}</span>
          {status === 'actif' && <span className="ml-2 badge-mystic">{t(PLAN_NAMES[current])}</span>}
        </p>
      </header>

      {msg && <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">{msg}</p>}

      {/* Actions abonnement */}
      <div className="flex flex-wrap gap-3">
        {status === 'actif' ? (
          <button onClick={() => { setStatus('suspendu'); setMsg(t('sub.suspendedMsg')); }} className="mystic-btn-ghost">{t('sub.suspend')}</button>
        ) : (
          <button onClick={() => { setStatus('actif'); setMsg(t('sub.resumedMsg')); }} className="mystic-btn">{t('sub.resume')}</button>
        )}
      </div>

      {/* Cartes de forfaits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.keys(PLAN_NAMES) as Plan[]).map((p) => {
          const isCurrent = p === current;
          const features = t(PLAN_FEATURES[p]).split('|');
          const isPaid = p !== 'gratuit';
          return (
            <div key={p} className={`mystic-panel p-5 flex flex-col ${isCurrent ? 'ring-2 ring-amber-500/60' : ''}`}>
              <div className="text-3xl mb-2">{PLAN_ICONS[p]}</div>
              <h2 className="mystic-title text-lg">{t(PLAN_NAMES[p])}</h2>
              <p className="mystic-subtitle text-xs mb-3"><span className="text-gray-500">{t('sub.perMonth')}</span></p>
              <ul className="space-y-1.5 text-sm text-gray-300 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-amber-400">✦</span><span>{f}</span></li>
                ))}
              </ul>
              <button
                onClick={() => choose(p)}
                disabled={isCurrent || loading !== null}
                className={`mt-4 w-full ${isCurrent ? 'mystic-btn-ghost opacity-60 cursor-default' : isPaid ? 'mystic-btn' : 'mystic-btn-ghost'}`}
              >
                {isCurrent ? t('sub.currentPlan') : loading === p ? '…' : isPaid ? t('sub.subscribe') : t('sub.choose')}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs text-center">{t('sub.previewNote')}</p>
    </div>
  );
}
