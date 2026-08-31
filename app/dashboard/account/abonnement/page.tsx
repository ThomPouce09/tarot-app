'use client';

import { useState, useEffect, useCallback } from 'react';
import { useT } from '@/lib/i18n';
import { PLAN_NAME_KEY, PLAN_FEATURES_KEY, PLAN_ICON, PLAN_PRICE_EUR, PLAN_PRICE_YEAR_EUR, CREDITS_BASE, CREDITS_GRAND, type PlanId } from '@/lib/plans';
import { UNIVERSES, type Universe } from '@/lib/classification';

// Niveaux affichés, ordre d'exposition.
const CARDS: PlanId[] = ['bienvenue', 'apprenti', 'recharge', 'initie', 'arkane'];

// Rang hiérarchique pour verrouiller les forfaits inférieurs au forfait actif.
const RANK: Record<PlanId, number> = {
  bienvenue: 1,
  apprenti: 2,
  recharge: 2, // one-shot : pas un niveau, mais non proposable à un abonné
  initie: 3,
  arkane: 4,
};

function formatPrice(eur: number): string {
  return `${eur.toFixed(2).replace('.', ',')} €`;
}

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

interface SubState {
  plan: string;
  level: 'apprenti' | 'initie' | 'arkane';
  status: string | null;
  billing: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  usage: any;
}

export default function AbonnementPage() {
  const t = useT();
  const [current, setCurrent] = useState<PlanId>('apprenti');
  const [status, setStatus] = useState<string | null>(null);
  // Facturation indépendante par abonnement (mois par défaut) : radios propres à chaque carte.
  const [billing, setBilling] = useState<Record<'initie' | 'arkane', 'month' | 'year'>>({ initie: 'month', arkane: 'month' });
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [manageLoading, setManageLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [usage, setUsage] = useState<any>(null);
  // Modale de confirmation de résiliation (plan ciblé : 'initie' | 'arkane' | null).
  const [confirmCancel, setConfirmCancel] = useState<PlanId | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const hydrate = useCallback((d: any) => {
    if (d.plan) {
      const lvl = d.level === 'arkane' ? 'arkane' : d.level === 'initie' ? 'initie' : 'apprenti';
      setCurrent(lvl);
      // Restaure la période réelle de l'abonnement actif dans ses radios.
      if (lvl !== 'apprenti' && (d.billing === 'month' || d.billing === 'year')) {
        setBilling((b) => ({ ...b, [lvl]: d.billing }));
      }
    }
    setStatus(d.status ?? null);
    setCancelAtPeriodEnd(!!d.cancelAtPeriodEnd);
    setCurrentPeriodEnd(d.currentPeriodEnd ?? null);
    setUsage(d.usage ?? null);
  }, []);

  const loadState = useCallback(async (emailArg?: string) => {
    const e = emailArg ?? email;
    if (!e) return null;
    try {
      const res = await fetch(`/api/subscription?email=${encodeURIComponent(e)}`);
      const d = await res.json();
      hydrate(d);
      return d;
    } catch {
      return null;
    }
  }, [email, hydrate]);

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

    // Si aucun session_id, rien à confirmer → on recharge juste si connecté.
    if (!sessionId) {
      if (userEmail) loadState(userEmail);
      return;
    }

    const confirmAndLoad = async () => {
      // Ce confirm ne dépend PAS du localStorage : il résout l'utilisateur via
      // session.metadata.userId et renvoie l'email. On ne return donc pas si
      // localStorage est vide (cas redirection vers le domaine Vercel).
      let confirmEmail = userEmail;
      try {
        setActivating(true);
        const confirmRes = await fetch(`/api/checkout/confirm?session_id=${sessionId}`);
        const confirmData = await confirmRes.json();
        if (confirmData.email) confirmEmail = confirmData.email;
        if (confirmData.plan && confirmData.plan !== 'apprenti') {
          setCurrent(confirmData.plan === 'arkane' || confirmData.plan === 'initie' ? confirmData.plan : 'apprenti');
          setMsg(t('sub.successMsg'));
          setEmail(confirmEmail);
          await loadState(confirmEmail);
          setActivating(false);
          return;
        }
      } catch { /* fallback poll */ }
      setActivating(false);
      if (confirmEmail) {
        const level = await loadState(confirmEmail);
        if (level?.level && level.level !== 'apprenti') return;
        if (params.get('status') === 'success' && sessionId) {
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            const nl = await loadState(confirmEmail);
            if (nl?.level === 'arkane' || nl?.level === 'initie') break;
          }
        }
      }
    };
    confirmAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

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

  // ── Résilier / Reprendre (cancel_at_period_end) ──────────────────────
  const toggleCancel = async (plan: PlanId, cancel: boolean) => {
    if (!email) { setMsg(t('sub.loginRequired') || 'Connecte-toi.'); return; }
    setCancelLoading(true);
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, cancel }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'Erreur'); return; }
      setCancelAtPeriodEnd(!!data.cancelAtPeriodEnd);
      setStatus(data.status ?? status);
      setCurrentPeriodEnd(data.currentPeriodEnd ?? currentPeriodEnd);
      setMsg(cancel ? t('sub.canceledMsg') : t('sub.resumedMsg'));
      await loadState();
    } catch {
      setMsg(t('sub.cancelError'));
    } finally {
      setCancelLoading(false);
      setConfirmCancel(null);
    }
  };

  // Garde pour ne pas laisser cliquer un forfait inférieur au forfait actif.
  // Ne verrouille que si on a un ABONNEMENT payant actif (initie/arkane).
  const hasSubscription = current === 'initie' || current === 'arkane';
  const currentRank = hasSubscription ? (RANK[current] ?? 2) : 0;
  const isLocked = (p: PlanId): boolean => {
    // La recharge cosmique est utile pour Initié (crédits limités) mais sans
    // objet pour Arkane (consommation illimitée). Proposable pour un compte
    // sans abonnement ou Initié ; bloquée pour Arkane.
    if (p === 'recharge') return current === 'arkane';
    // On ne peut pas choisir un plan inférieur au plan actif (sans résilier).
    return hasSubscription && RANK[p] < currentRank;
  };

  const isArkane = current === 'arkane';
  const grandMonthly = usage?.grandMonthly;
  const grandUsed = usage?.grandUsedMonth ?? 0;

  const credits = usage?.rechargeCredits ?? 0;
  const welcomeBaseUsed = (usage?.welcomeBaseUsed ?? []) as Universe[];
  const welcomeGrandUsed = usage?.welcomeGrandUsed ?? false;
  const bonusGrand = usage?.bonusGrand ?? 0;
  const baseUsedToday = usage?.baseUsedToday ?? 0;
  const baseUnlimited = usage?.baseUnlimited ?? false;

  const baseRemaining: number | 'inf' = baseUnlimited ? 'inf' : (UNIVERSES.length - welcomeBaseUsed.length) + (baseUsedToday < 1 ? 1 : 0) + Math.floor(credits / CREDITS_BASE);

  const grandQuotaLeft = (grandMonthly ?? 0) > 0 ? Math.max(0, (grandMonthly ?? 0) - grandUsed) : 0;
  const grandRemaining: number | 'inf' = isArkane ? 'inf' : bonusGrand + (welcomeGrandUsed ? 0 : 1) + Math.floor(credits / CREDITS_GRAND) + grandQuotaLeft;

  const rechargeRelevant = credits > 0;
  const rechargeBaseLeft = Math.floor(credits / CREDITS_BASE);
  const rechargeGrandLeft = Math.floor(credits / CREDITS_GRAND);

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

      {/* Activation en cours (retour de paiement) */}
      {activating && (
        <p role="status" aria-live="polite" className="text-sm px-3 py-2 rounded-lg bg-violet-900/20 border border-violet-700/30">
          {t('sub.activating')}
        </p>
      )}

      {msg && (
        <p role="status" aria-live="polite" className="text-amber-200 text-sm px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
          {msg}
        </p>
      )}

      {/* Bandeau statut d'un abonnement actif */}
      {(isArkane || current === 'initie') && (
        <div className={`mystic-panel p-4 flex flex-wrap items-center justify-between gap-3 ${cancelAtPeriodEnd ? 'border-amber-600/40' : ''}`}>
          <div>
            <div className="mystic-title text-lg">
              {t('sub.activePlan')} — {cancelAtPeriodEnd ? t('sub.canceledStatus') : t('sub.activeStatus')}
              <span className="text-gray-400 text-sm ml-2">
                {t('sub.untilDate')} {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">{cancelAtPeriodEnd ? t('sub.canceledHint') : t('sub.activeHint')}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={manage} disabled={manageLoading} className="mystic-btn-ghost">
              {manageLoading ? '…' : t('sub.manage')}
            </button>
            {cancelAtPeriodEnd ? (
              <button onClick={() => toggleCancel(current, false)} disabled={cancelLoading} className="mystic-btn">
                {cancelLoading ? '…' : t('sub.resume')}
              </button>
            ) : (
              <button onClick={() => setConfirmCancel(current)} disabled={cancelLoading} className="mystic-btn-ghost border-red-800/50 text-red-300 hover:bg-red-900/20">
                {t('sub.cancel')}
              </button>
            )}
          </div>
        </div>
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

      {/* Cartes de forfaits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((p) => {
          const isCurrent = p === current;
          const locked = isLocked(p);
          const features = t(PLAN_FEATURES_KEY[p]).split('|');
          const isSub = isSubscription(p);
          const isOne = isOneShot(p);
          return (
            <div key={p} className={`mystic-panel p-5 flex flex-col ${isCurrent ? 'ring-2 ring-violet-500/60' : ''} ${locked ? 'opacity-60' : ''}`}>
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
                        disabled={locked}
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
                        disabled={locked}
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
                <div className="mt-4">
                  {locked ? (
                    <button disabled className="w-full mystic-btn-ghost opacity-50 cursor-not-allowed">{t('sub.includedMsg')}</button>
                  ) : (
                    <button onClick={buyRecharge} disabled={loading !== null} className="w-full mystic-btn">
                      {loading === 'recharge' ? '…' : t('sub.pay')}
                    </button>
                  )}
                </div>
              ) : isOne || p === 'apprenti' ? (
                isCurrent ? (
                  <button disabled className="mt-4 w-full mystic-btn-ghost opacity-60 cursor-default">{t('sub.currentPlan')}</button>
                ) : locked ? (
                  <button disabled className="mt-4 w-full mystic-btn-ghost opacity-50 cursor-not-allowed">{t('sub.includedMsg')}</button>
                ) : null
              ) : (
                <button
                  onClick={() => choose(p)}
                  disabled={isCurrent || locked || loading !== null}
                  className={`mt-4 w-full ${isCurrent || locked ? 'mystic-btn-ghost opacity-60 cursor-default' : 'mystic-btn'}`}
                >
                  {isCurrent
                    ? t('sub.currentPlan')
                    : locked
                      ? t('sub.includedMsg')
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

      {/* Modale de confirmation de résiliation */}
      {confirmCancel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmCancel(null)} />
          <div className="relative z-10 mystic-panel p-6 max-w-sm w-[92%] text-center">
            <div className="text-3xl mb-2">🔮</div>
            <h3 className="mystic-title text-lg mb-2" style={{ color: '#DAA520' }}>{t('sub.cancelConfirmTitle')}</h3>
            <p className="text-gray-300 text-sm leading-relaxed mb-4">{t('sub.cancelConfirmText')}</p>
            <div className="flex gap-3">
              <button onClick={() => toggleCancel(confirmCancel, true)} disabled={cancelLoading} className="mystic-btn flex-1">
                {cancelLoading ? '…' : t('sub.confirmCancel')}
              </button>
              <button onClick={() => setConfirmCancel(null)} className="mystic-btn-ghost flex-1">{t('sub.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
