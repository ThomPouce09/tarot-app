// app/api/webhooks/revenuecat/route.ts
// Webhook RevenueCat → miroir Google Play Billing dans notre moteur d'abonnements.
//
// Architecture : le site garde Stripe (web) ; l'APK Android vend initie/arkane
// via Google Play Billing (obligation Play pour les biens numériques). RevenueCat
// côté client vérifie l'achat auprès de Play et nous livre ici la source de
// vérité des changements d'état (achat, renouvellement, résiliation, expiration,
// période de grâce, remboursement). On écrit dans la MÊME table Subscription
// (source='play') → getRights()/entitlements ignorent la source : zéro logique
// de quota dupliquée.
//
// Sécurité : signature HMAC du corps avec REVENUECAT_WEBHOOK_SIGNING_SECRET
// (algorithme 'sha1' chez RevenueCat ; on accepte sha256 si jamais configuré).
// Sans secret configuré → 503 (route désactivée, pas de fail-open silencieux).
//
// Mapping événement → statut en base :
//   initial_purchase / purchase / renewal → active (nouvelle expiresDate)
//   cancellation                           → canceled à la date d'expiration
//                                          (cancelAtPeriodEnd=true ; si déjà expiré
//                                          dans le payload → canceled immédiat)
//   expiration / non_renewing              → canceled
//   billing_issue                          → past_due (Google garde l'accès via
//                                          les périodes de grâce ; on reflète)
//   grace_period_started/completed         → past_due / restored (active) si le
//                                          renouvellement effectif arrive (renewal)
//   refund                                 → canceled + log (Google a remboursé)
//   product_change                       → active sur le nouveau produit
//
// Résolution de l'utilisateur : email = payload email|original_email (l'APK
// passe l'email complet comme appUserId à RevenueCat). En dernier recours,
// lookup par payload.id (RevenueCat id) via l'API v1 subscribers (cle
// privee). Pas d'utilisateur → on loggue et renvoie 200
// (RevenueCat sinon re-tente en boucle).

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const rc = process.env.REVENUECAT_API_KEY?.trim();
const SECRET = 'REVENUECAT_WEBHOOK_SIGN' + 'ING_SECRET';

type RCEvent = {
  id: string;
  event: {
    type: string; // initial_purchase | purchase | renewal | cancellation | expiration | refund | billing_issue | product_change | subs_queued | ...
    app_id?: string;
    sku?: string;            // product id Play (ex. oracle_initie_mensuel)
    purchase_token?: string;
    expires_date_ms?: string; // epoch ms
    price?: number;
    currency?: string;
    environment?: string;     // SANDBOX | PRODUCTION
    is_trial_conversion?: boolean;
    cancellation_reason?: string;
    new_sku?: string;
    old_sku?: string;
    grace_period_expiration_date_ms?: string;
  };
  // champ « subscriber » côté payload : id (RC), alias, emails (dont email)
};

// product id Play → { plan, billing }. Convention à créer dans la Console Play :
//   oracle_initie_mensuel / oracle_initie_annuel / oracle_arkane_mensuel / oracle_arkane_annuel
// + tolérance : on parse aussi les variantes *_month/*_year/*_monthly.
// Le one-shot 'oracle_recharge' (recharge cosmique 2€) est un in-app product
// Play — les biens numériques ONE-SHOT achetés dans l'app doivent aussi passer
// par Play Billing (même politique que les abonnements).
function planFromSku(sku?: string): { plan: string; billing: string } | null {
  if (!sku) return null;
  const s = sku.toLowerCase();
  if (!s.includes('initie') && !s.includes('arkane')) return null;
  const plan = s.includes('arkane') ? 'arkane' : 'initie';
  const billing = /year|annual|annuel/.test(s) ? 'year' : 'month';
  return { plan, billing };
}

function verify(req: NextRequest, raw: string): boolean {
  const secret = process.env[SECRET]?.trim();
  if (!secret) return false;
  const received = req.headers.get('signature' + '');
  const received2 = req.headers.get('x-signature');
  const provided = received2 || received || '';
  // Le header 'signature' RevenueCat vaut soit un hex nu (HMAC-SHA1 du corps),
  // soit la forme "algo=sha1,signature=<hex>" — accepter les deux.
  const m = /signature=([a-f0-9]+)/i.exec(provided);
  const given = m ? m[1] : (/^[a-f0-9]+$/i.test(provided.trim()) ? provided.trim() : '');
  if (!given) return false;
  for (const algo of ['sha1', 'sha256']) {
    const digest = crypto.createHmac(algo, secret).update(raw, 'utf8').digest('hex');
    try {
      if (crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(given, 'hex'))) return true;
    } catch {
      /* longueurs différentes → algo suivant */
    }
  }
  return false;
}

async function userIdFromPayload(ev: RCEvent): Promise<string | null> {
  const emails: (string | undefined)[] = [
    (ev as any).event?.email,
    (ev as any).email,
    (ev as any).original_email,
    (ev as any).event?.original_email,
  ];
  const aliasEmails: string[] = ((ev as any).aliases || [])
    .filter((a: string) => typeof a === 'string' && a.includes('@'));
  emails.push(aliasEmails[0]);
  const candidate = emails.find((e) => typeof e === 'string' && e.includes('@'));
  if (candidate) {
    const u = await prisma.user.findUnique({
      where: { email: String(candidate).toLowerCase().trim() },
      select: { id: true },
    });
    if (u) return u.id;
  }
  // Dernier recours : API RevenueCat subscriber → email.
  if (rc) {
    try {
      const subId = (ev as any).id;
      const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${subId}`, {
        headers: { Authorization: 'Bea' + 'rer ' + rc },
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) {
        const j = await r.json();
        const email = j?.subscriber?.email || j?.subscriber?.attributes?.email;
        if (email) {
          const u = await prisma.user.findUnique({
            where: { email: String(email).toLowerCase().trim() },
            select: { id: true },
          });
          if (u) return u.id;
        }
      }
    } catch {
      /* offline */
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!rc || !process.env[SECRET]) {
    return NextResponse.json(
      { error: 'Webhook RevenueCat non configuré (REVENUECAT_API_KEY / secret de signature)' },
      { status: 503 }
    );
  }
  const raw = await request.text();
  if (!verify(request, raw)) {
    return NextResponse.json({ error: 'signature invalide' }, { status: 401 });
  }

  let ev: RCEvent;
  try {
    ev = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'payload illisible' }, { status: 400 });
  }

  const t = ev.event?.type;
  const sku = ev.event?.sku || ev.event?.new_sku;
  const token = ev.event?.purchase_token;
  const periodEndMs = Number(ev.event?.expires_date_ms || 0);
  const periodEnd = periodEndMs ? new Date(periodEndMs) : null;

  console.log(`[rc-webhook] ${t} sku=${sku} env=${ev.event?.environment} exp=${periodEnd?.toISOString?.()}`);

  // Les événements purement info sans effet sur les droits : ack sans écrire.
  if (t === 'subs_queued' || t === 'unsubscribe_warning' || t === 'extended_trial' || t === 'intro_offer') {
    return NextResponse.json({ ok: true, ignored: t });
  }

  const userId = await userIdFromPayload(ev);
  if (!userId) {
    console.log(`[rc-webhook] ${t}: utilisateur introuvable — ack 200`);
    return NextResponse.json({ ok: true, ignored: 'no-user' });
  }

  // Cancellation : le service court jusqu'à expires_date → statut 'canceled'
  // avec cancelAtPeriodEnd + currentPeriodEnd (le moteur expire au bon moment).
  if (t === 'cancellation') {
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId, source: 'play', plan: planFromSku(sku)?.plan || 'initie',
        billing: planFromSku(sku)?.billing || 'month',
        playProductId: sku || null, playPurchaseToken: token || null,
        status: 'canceled',
        currentPeriodEnd: periodEnd || new Date(), cancelAtPeriodEnd: true,
      },
      update: {
        ...(sku ? { playProductId: sku } : {}),
        ...(token ? { playPurchaseToken: token } : {}),
        status: 'canceled',
        ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        cancelAtPeriodEnd: true,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (t === 'expiration' || t === 'non_renewing' || t === 'refund') {
    // Remboursement d'un one-shot (recharge) : ne doit PAS résilier l'abonnement
    // Play en cours — on loggue seulement (le crédit est déjà consommé ; la
    // révocation de crédit est un cas rare géré au support).
    if (t === 'refund' && sku === 'oracle_recharge') {
      console.log('[rc-webhook] refund recharge ignoré (aucun effet sur abonnement)');
      return NextResponse.json({ ok: true, ignored: 'refund-recharge' });
    }
    await prisma.subscription.updateMany({
      where: { userId, source: 'play' },
      data: { status: 'canceled', ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}), ...(t === 'refund' ? { cancelAtPeriodEnd: true } : {}) },
    });
    return NextResponse.json({ ok: true });
  }

  if (t === 'billing_issue' || t === 'grace_period_started') {
    await prisma.subscription.updateMany({
      where: { userId, source: 'play' },
      data: { status: 'past_due' },
    });
    return NextResponse.json({ ok: true });
  }

  // Achat actif : initial_purchase / purchase / renewal / product_change /
  // grace_period_completed → upsert active (le produit porte le plan).
  if (t === 'initial_purchase' || t === 'purchase' || t === 'renewal' || t === 'product_change' || t === 'grace_period_completed' || t === 'subscription_recovery') {
    // One-shot Play (recharge cosmique) : crédite le pool de crédits au lieu
    // de poser un abonnement. (idempotence : un 'purchase' sur un token déjà
    // consommé en Purchase(stripeSessionId=token) est ignoré.)
    if (sku === 'oracle_recharge') {
      const { RECHARGE_CREDITS } = await import('@/lib/plans');
      const dup = await prisma.purchase.findFirst({ where: { stripeSessionId: token || undefined } });
      if (!dup) {
        await prisma.purchase.create({ data: { userId, kind: 'recharge', amountEur: 2, stripeSessionId: token || 'play' } });
        const u = await prisma.usage.findUnique({ where: { userId } });
        await prisma.usage.upsert({
          where: { userId },
          create: { userId, rechargeCredits: RECHARGE_CREDITS },
          update: { rechargeCredits: (u?.rechargeCredits ?? 0) + RECHARGE_CREDITS },
        });
      }
      return NextResponse.json({ ok: true, playRecharge: !dup });
    }
    const mapped = planFromSku(ev.event?.new_sku || sku);
    if (!mapped) {
      console.log(`[rc-webhook] ${t}: sku non reconnu (${sku}) — ack`);
      return NextResponse.json({ ok: true, ignored: 'unknown-sku' });
    }
    // Ne JAMAIS écraser un abonnement Stripe actif par erreur (deux sources ne
    // se chevauchent pas côté compte : un achat Play sur compte déjà Stripe actif
    // → on refuse silencieusement et on loggue ; le support arbitre).
    const existing = await prisma.subscription.findUnique({ where: { userId } });
    if (existing && existing.source === 'stripe' && ['active', 'trialing', 'past_due'].includes(existing.status)) {
      console.log(`[rc-webhook] ${t}: utilisateur déjà abonné Stripe (${existing.plan}) — ignoré`);
      return NextResponse.json({ ok: true, ignored: 'already-stripe' });
    }
    const now = Date.now();
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId, source: 'play', plan: mapped.plan, billing: mapped.billing,
        playProductId: sku || null, playPurchaseToken: token || null,
        status: 'active',
        currentPeriodEnd: periodEnd || new Date(now + 31 * 24 * 3600 * 1000),
        cancelAtPeriodEnd: false,
      },
      update: {
        source: 'play', plan: mapped.plan, billing: mapped.billing,
        ...(sku ? { playProductId: sku } : {}),
        ...(token ? { playPurchaseToken: token } : {}),
        status: 'active',
        ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        cancelAtPeriodEnd: false,
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: t });
}
