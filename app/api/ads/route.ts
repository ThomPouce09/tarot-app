// app/api/ads/route.ts — Publicités récompensées (point 7) : gagner des
// tirages en regardant des pubs. 2 pubs = 1 ticket base ; 3 pubs = 1 ticket
// avancé ; max 2 tickets de chaque par mois (lib/ads.ts).
//
//   POST { action:'start',  kind:'base'|'grand' }
//        → { ok, txId, adsNeeded }   — réserve l'offre ; txId = jeton de la
//          vue à revenir signer (aucune écriture de compteur ici).
//   POST { action:'reward', kind, txId }
//        → { ok, ticketEarned, adsNeededNext, ticketsReady } | { ok, duplicate }
//          — crédite UNE vue. Idempotent via la table ad_rewards (txId unique)
//          : le même txId renvoyé deux fois ne crédit qu'une fois.
//
// ⚠️ Branche native (APK) : tant qu'AdMob n'est pas intégré (compte + unit
// rewarded + plugin Capacitor), le client n'appelle pas 'reward' — ces
// endpoints restent prêts. La vérification forte (SSV Google) viendra avec
// l'intégration ; d'ici là le txId serveur limite le rejeu, et le cap
// mensuel (2+2) borne le gain.
//
// Session obligatoire (x-session / cookie) — aucun email déclaré accepté seul.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSessionEmail } from '@/lib/session';
import { computeAdOffers, creditAdReward, type AdKind } from '@/lib/ads';

export const dynamic = 'force-dynamic';

const KINDS: AdKind[] = ['base', 'grand'];

async function usageFor(userId: string) {
  // La ligne Usage peut manquer (compte jamais tiré) : on la crée à blanc.
  return prisma.usage.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sess = requireSessionEmail(request, null);
    if ('error' in sess) return sess.error;
    const user = await prisma.user.findUnique({ where: { email: sess.email }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: false, error: 'no-user' }, { status: 404 });

    const kind = String(body?.kind || '') as AdKind;
    if (!KINDS.includes(kind)) return NextResponse.json({ ok: false, error: 'kind invalide' }, { status: 400 });

    const usage = await usageFor(user.id);
    const offers = computeAdOffers(usage);

    if (body?.action === 'start') {
      const o = offers[kind];
      if (!o.available) return NextResponse.json({ ok: false, error: 'capped', leftThisMonth: o.leftThisMonth }, { status: 200 });
      return NextResponse.json({ ok: true, txId: crypto.randomUUID(), adsNeeded: o.adsNeeded, leftThisMonth: o.leftThisMonth, ticketsReady: o.ticketsReady });
    }

    if (body?.action === 'reward') {
      const txId = String(body?.txId || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txId)) {
        return NextResponse.json({ ok: false, error: 'txId requis (start d\'abord)' }, { status: 400 });
      }
      const res = await creditAdReward(user.id, kind, txId);
      return NextResponse.json(res);
    }

    // Défaut : état courant (pour la modale d'offres).
    return NextResponse.json({ ok: true, offers });
  } catch (e: any) {
    console.error('[api/ads]', e?.message);
    return NextResponse.json({ ok: false, error: 'Erreur interne' }, { status: 500 });
  }
}
