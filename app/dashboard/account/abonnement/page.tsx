'use client';

import { useState } from 'react';

type Plan = 'gratuit' | 'initie' | 'oracle';

const PLANS: Record<Plan, { name: string; price: string; icon: string; features: string[] }> = {
  gratuit: {
    name: 'Apprenti', icon: '🌙', price: '0€',
    features: ['3 tirages / jour', 'Tirages Tarot & Yi Jing', 'Historique 7 jours'],
  },
  initie: {
    name: 'Initié', icon: '✦', price: '7,99€',
    features: ['Tirages illimités', 'Toutes les formules', 'Historique complet', 'Interprétations IA avancées'],
  },
  oracle: {
    name: 'Oracle', icon: '🔮', price: '14,99€',
    features: ['Tout Initié +', 'Tirages à la demande', 'Consultations prioritaires', 'Thèmes visuels exclusifs'],
  },
};

export default function AbonnementPage() {
  const [current, setCurrent] = useState<Plan>('initie');
  const [status, setStatus] = useState<'actif' | 'suspendu'>('actif');
  const [msg, setMsg] = useState<string | null>(null);

  const choose = (p: Plan) => {
    setCurrent(p);
    setMsg(`Forfait « ${PLANS[p].name} » sélectionné. (Ébauche : branchement paiement à venir)`);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl">✦ Mon abonnement</h1>
        <p className="text-gray-500 text-sm mt-1">
          Statut : <span className={status === 'actif' ? 'text-amber-300' : 'text-gray-400'}>{status === 'actif' ? 'Actif' : 'Suspendu'}</span>
          {status === 'actif' && <span className="ml-2 badge-mystic">{PLANS[current].name}</span>}
        </p>
      </header>

      {msg && <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">{msg}</p>}

      {/* Actions abonnement */}
      <div className="flex flex-wrap gap-3">
        {status === 'actif' ? (
          <button onClick={() => { setStatus('suspendu'); setMsg('Abonnement suspendu. Vous pourrez le reprendre à tout moment.'); }} className="mystic-btn-ghost">⏸️ Suspendre l'abonnement</button>
        ) : (
          <button onClick={() => { setStatus('actif'); setMsg('Abonnement repris. Merci de votre confiance ✦'); }} className="mystic-btn">▶️ Reprendre l'abonnement</button>
        )}
      </div>

      {/* Cartes de forfaits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.keys(PLANS) as Plan[]).map((p) => {
          const plan = PLANS[p];
          const isCurrent = p === current;
          return (
            <div key={p} className={`mystic-panel p-5 flex flex-col ${isCurrent ? 'ring-2 ring-amber-500/60' : ''}`}>
              <div className="text-3xl mb-2">{plan.icon}</div>
              <h2 className="mystic-title text-lg">{plan.name}</h2>
              <p className="mystic-subtitle text-xs mb-3">{plan.price} <span className="text-gray-500">/ mois</span></p>
              <ul className="space-y-1.5 text-sm text-gray-300 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-amber-400">✦</span><span>{f}</span></li>
                ))}
              </ul>
              <button
                onClick={() => choose(p)}
                disabled={isCurrent}
                className={`mt-4 w-full ${isCurrent ? 'mystic-btn-ghost opacity-60 cursor-default' : 'mystic-btn'}`}
              >
                {isCurrent ? '✓ Forfait actuel' : 'Choisir'}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs text-center">Ébauche de prévisualisation — le paiement réel (Stripe/PayPal) sera branché ultérieurement.</p>
    </div>
  );
}
