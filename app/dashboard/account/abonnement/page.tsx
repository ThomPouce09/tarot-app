'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { PLAN_NAME_KEY, PLAN_FEATURES_KEY, PLAN_ICON, PLAN_PRICE_EUR, PLAN_PRICE_YEAR_EUR, CREDITS_BASE, CREDITS_GRAND, type PlanId } from '@/lib/plans';
import { UNIVERSES, type Universe } from '@/lib/classification';

// Niveaux affichés, ordre d'exposition.
const CARDS: PlanId[] = ['bienvenue', 'apprenti', 'recharge', 'initie', 'arkane'];

function formatPrice(eur: number): string {
  return `${eur.toFixed(2).replace('.', ',')} €`;
}

// Un plan est "récurrent" (Stripe subscription) vs one-shot.
function isSubscription(p: PlanId): boolean {
  return p === 'initie' || p === 'arkane';
}
function isOneShot(p: PlanId): boolean {
  return p === 'recharge' || p === 'bienvenue';
}

// Libellés des univers pour le tableau de bord (clés i18n du bloc sub.universe.*).
const UNIVERSE_LABEL_KEY: Record<Universe, string> = {
  tarot: 'sub.universeTarot',
  yijing: 'sub.universeYijing',
  des: 'sub.universeDes',
  runes: 'sub.universeRunes',
};

export default function AbonnementPage() {
  const t = useT();
  const [current, setCurrent] = useState<PlanId>('apprenti');
  const [status, setStatus] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [usage, setUsage] = useState<any>(null);
  // Facturation indépendante par abonnement (mois par défaut) : radios propres à chaque carte.
  const [billing, setBilling] = useState<Record<'initie' | 'arkane', 'month' | 'year'>>({ initie: 'month', arkane: 'month' });

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('tarot_user') : null;
    let userEmail = '';
    if (stored) { try { userEmail = JSON.parse(stored).email ?? ''; } catch { /* noop */ } }
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

    const loadState = async () => {
      try {
        const res = await fetch(`/api/subscription?email=${encodeURIComponent(userEmail)}`);
        const d = await res.json();
        if (d.plan) {
          // mappe le niveau réel (initie/arkane) sinon apprenti
          setCurrent(d.level === 'arkane' ? 'arkane' : d.level === 'initie' ? 'initie' : 'apprenti');
        }
        setStatus(d.status ?? null);
        setUsage(d.usage ?? null);
        return d.level;
      } catch {
        return null;
      }
    };

    const confirmAndLoad = async () => {
      if (sessionId) {
        try {
          const confirmRes = await fetch(`/api/checkout/confirm?session_id=${sessionId}`);
          const confirmData = await confirmRes.json();
          if (confirmData.plan && confirmData.plan !== 'apprenti') {
            setCurrent(confirmData.plan === 'arkane' || confirmData.plan === 'initie' ? confirmData.plan : 'apprenti');
            setMsg(t('sub.successMsg'));
            await loadState();
            return;
          }
        } catch { /* fallback poll */ }
      }
      const level = await loadState();
      if (params.get('status') === 'success' && level !== 'arkane' && level !== 'initie') {
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 2000));
          const nl = await loadState();
          if (nl === 'arkane' || nl === 'initie') break;
        }
      }
    };
    confirmAndLoad();
  }, [t]);

  // Bouton d'action pour souscrire / acheter.
  const choose = async (p: PlanId) => {
    if (p === 'bienvenue') {
      setMsg(t('sub.welcomeState') + ' — ' + t('sub.bienvenueFeatures').split('|')[0]);
      return;
    }
    if (!email) {
      setMsg(t('sub.loginRequired') || 'Connecte-toi pour continuer.');
      return;
    }
    setLoading(p);
    try {
      const body: any = { plan: p, email };
      // Abonnement récurrent : période sélectionnée pour CE plan (radios indépendants).
      if (isSubscription(p)) body.billing = billing[p as 'initie' | 'arkane'];
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  // Achat one-shot de la recharge cosmique (2€ = 105 crédits mixables).
  const buyRecharge = async () => {
    if (!email) {
      setMsg(t('sub.loginRequired') || 'Connecte-toi pour acheter.');
      return;
    }
    setLoading('recharge');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'recharge', email }),
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
    if (!email) { setMsg(t('sub.loginRequired') || 'Connecte-toi pour gérer.'); return; }
    setManageLoading(true);
    try {
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setMsg(data.error || "Échec de l'ouverture du portail.");
    } catch {
      setMsg("Erreur de connexion au serveur.");
    } finally {
      setManageLoading(false);
    }
  };

  const isArkane = current === 'arkane';
  const grandMonthly = usage?.grandMonthly;
  const grandUsed = usage?.grandUsedMonth ?? 0;

  // ── Tableau de bord "consommation restante" (tous niveaux) ──
  const credits = usage?.rechargeCredits ?? 0;
  const welcomeBaseUsed = (usage?.welcomeBaseUsed ?? []) as Universe[];
  const welcomeGrandUsed = usage?.welcomeGrandUsed ?? false;
  const bonusGrand = usage?.bonusGrand ?? 0;
  const baseUsedToday = usage?.baseUsedToday ?? 0;
  const baseUnlimited = usage?.baseUnlimited ?? false;

  // Tirages de base restants : ∞ (initie/arkane) sinon bienvenue + 1/jour + crédits.
  const baseRemaining: number | 'inf' = baseUnlimited ? 'inf' : (UNIVERSES.length - welcomeBaseUsed.length) + (baseUsedToday < 1 ? 1 : 0) + Math.floor(credits / CREDITS_BASE);

  // Tirages avancés restants : ∞ (arkane) sinon bonus + crédits + quota mensuel + bienvenue grand.
  const grandQuotaLeft = (grandMonthly ?? 0) > 0 ? Math.max(0, (grandMonthly ?? 0) - grandUsed) : 0;
  const grandRemaining: number | 'inf' = isArkane ? 'inf' : bonusGrand + (welcomeGrandUsed ? 0 : 1) + Math.floor(credits / CREDITS_GRAND) + grandQuotaLeft;

  // Recharge : pertinente seulement si des crédits restent (affiché en tirages, pas en crédits).
  const rechargeRelevant = credits > 0;
  const rechargeBaseLeft = Math.floor(credits / CREDITS_BASE);
  const rechargeGrandLeft = Math.floor(credits / CREDITS_GRAND);

  // Par univers : quelles bases restent dispo ? (bienvenue offert, ou crédits base)
  const universeStatus = (u: Universe): 'welcome' | 'credits' | 'none' => {
    if (baseUnlimited) return 'welcome';
    if (!welcomeBaseUsed.includes(u)) return 'welcome';
    if (credits >= CREDITS_BASE) return 'credits';
    return 'none';
  };

  const fmt = (n: number | 'inf') => (n === 'inf' ? '∞' : n.toString());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mystic-title text-2xl sm:text-3xl flex items-center gap-2">
          <img src="/images/nav-abonnement.png" alt="" className="h-9 w-9 object-contain" style={{ filter: 'drop-shadow(0 0 6px rgba(245,180,80,0.4))' }} />
          {t('sub.title')}
        </h1>
      </header>

      {msg && (
        <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
          {msg}
        </p>
      )}

      {/* Tableau de bord : consommation RESTANTE (tous niveaux) */}
      {usage && (
        <div className="mystic-panel p-5 space-y-5">
          <h2 className="mystic-title text-lg">{t('sub.dashTitle')}</h2>

          {/* Tirages restants : base & avancés */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-900/40 border border-gray-700/40 p-3">
              <div className="text-gray-500 text-xs">{t('sub.meterBase')}</div>
              <div className="text-2xl font-bold text-amber-200">{fmt(baseRemaining)}</div>
            </div>
            <div className="rounded-lg bg-gray-900/40 border border-gray-700/40 p-3">
              <div className="text-gray-500 text-xs">{t('sub.meterGrand')}</div>
              <div className="text-2xl font-bold text-amber-200">{fmt(grandRemaining)}</div>
            </div>
          </div>

          {/* Recharge cosmique — seulement si pertinente, en tirages (pas en crédits) */}
          {rechargeRelevant && (
            <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-3 text-sm">
              <div className="font-semibold text-amber-200 mb-1.5">{t('sub.rechargeState')}</div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-300">
                <span>≈ {rechargeGrandLeft} {t('sub.meterGrandShort')}</span>
                <span>≈ {rechargeBaseLeft} {t('sub.meterBaseShort')}</span>
              </div>
            </div>
          )}

          {/* Tirages de base restants PAR UNIVERS */}
          <div>
            <div className="text-gray-500 text-xs mb-2">{t('sub.universeBaseTitle')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {UNIVERSES.map((u) => {
                const st = universeStatus(u);
                return (
                  <div key={u} className={`rounded-lg p-2.5 border text-center ${st === 'none' ? 'border-gray-700/40 bg-gray-900/30 opacity-60' : 'border-emerald-600/40 bg-emerald-900/10'}`}>
                    <div className="text-amber-200 font-semibold text-sm">{t(UNIVERSE_LABEL_KEY[u])}</div>
                    <div className="text-xs mt-1 text-gray-400">
                      {st === 'welcome' ? t('sub.universeAvail') : st === 'credits' ? t('sub.universeViaCredits') : t('sub.universeNone')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bonus & streak (si présents) */}
          {bonusGrand > 0 || (usage?.streakDays ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm border-t border-gray-700/50 pt-3">
              {bonusGrand > 0 && (
                <div>
                  <span className="text-gray-500 text-xs">{t('sub.meterBonus')}</span>
                  <span className="ml-2 text-amber-200 font-semibold">+{bonusGrand}</span>
                </div>
              )}
              {(usage?.streakDays ?? 0) > 0 && (
                <div>
                  <span className="text-gray-500 text-xs">{t('sub.streak')}</span>
                  <span className="ml-2 text-amber-200 font-semibold">{usage.streakDays} 🔥</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Actions — abonnés payants */}
      {(isArkane || current === 'initie') && (
        <div className="flex flex-wrap gap-3">
          <button onClick={manage} disabled={manageLoading} className="mystic-btn-ghost">
            {manageLoading ? '…' : t('sub.manage')}
          </button>
        </div>
      )}

      {/* Cartes de forfaits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((p) => {
          const isCurrent = p === current;
          const features = t(PLAN_FEATURES_KEY[p]).split('|');
          const isSub = isSubscription(p);
          const isOne = isOneShot(p);
          return (
            <div key={p} className={`mystic-panel p-5 flex flex-col ${isCurrent ? 'ring-2 ring-violet-500/60' : ''}`}>
              <div className="text-3xl mb-2">{PLAN_ICON[p]}</div>
              <h2 className="mystic-title text-lg">{t(PLAN_NAME_KEY[p])}</h2>
              <p className="mystic-subtitle text-sm mb-3">
                {p === 'bienvenue' ? (
                  <span className="text-emerald-300 font-semibold">{t('sub.free')}</span>
                ) : p === 'recharge' ? (
                  <span className="text-amber-300 font-semibold">2,00 €</span>
                ) : isSub ? (
                  <div className="flex items-center gap-3">
                    <label className={`flex items-center gap-1.5 cursor-pointer text-sm ${billing[p as 'initie' | 'arkane'] === 'month' ? 'text-amber-300 font-semibold' : 'text-gray-400'}`}>
                      <input
                        type="radio"
                        name={`billing-${p}`}
                        checked={billing[p as 'initie' | 'arkane'] === 'month'}
                        onChange={() => setBilling((b) => ({ ...b, [p]: 'month' }))}
                        className="accent-violet-400"
                      />
                      {formatPrice(PLAN_PRICE_EUR[p as 'initie' | 'arkane'])} {t('sub.perMonth')}
                    </label>
                    <label className={`flex items-center gap-1.5 cursor-pointer text-sm ${billing[p as 'initie' | 'arkane'] === 'year' ? 'text-amber-300 font-semibold' : 'text-gray-400'}`}>
                      <input
                        type="radio"
                        name={`billing-${p}`}
                        checked={billing[p as 'initie' | 'arkane'] === 'year'}
                        onChange={() => setBilling((b) => ({ ...b, [p]: 'year' }))}
                        className="accent-violet-400"
                      />
                      {formatPrice(PLAN_PRICE_YEAR_EUR[p as 'initie' | 'arkane'])} {t('sub.perYear')}
                    </label>
                  </div>
                ) : null}
              </p>
              <ul className="space-y-1.5 text-sm text-gray-300 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-amber-400">✦</span><span>{f}</span></li>
                ))}
              </ul>
              {p === 'recharge' ? (
                // Recharge cosmique : pool de 105 crédits mixables → un seul bouton "Payer".
                <div className="mt-4">
                  <button
                    onClick={buyRecharge}
                    disabled={loading !== null}
                    className="w-full mystic-btn"
                  >
                    {loading === 'recharge' ? '…' : t('sub.pay')}
                  </button>
                </div>
              ) : isOne || p === 'apprenti' ? (
                // Bienvenue (one-shot) & plan gratuit (apprenti) : pas de bouton d'achat.
                isCurrent ? (
                  <button disabled className="mt-4 w-full mystic-btn-ghost opacity-60 cursor-default">{t('sub.currentPlan')}</button>
                ) : null
              ) : (
                <button
                  onClick={() => choose(p)}
                  disabled={isCurrent || loading !== null}
                  className={`mt-4 w-full ${isCurrent ? 'mystic-btn-ghost opacity-60 cursor-default' : 'mystic-btn'}`}
                >
                  {isCurrent
                    ? t('sub.currentPlan')
                    : loading === p
                      ? '…'
                      : isSub
                        ? t('sub.subscribe')
                        : t('sub.choose')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
