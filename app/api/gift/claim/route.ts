import { NextRequest, NextResponse } from 'next/server';
import { claimGift, type GiftKind } from '@/lib/gift';

export const dynamic = 'force-dynamic';

// POST /api/gift/claim — Réclame le cadeau d'une créature (1 tirage offert).
// Corps : { email, kind? } — kind = 'base' (défaut) ou 'grand' : crédite le
// billet de la filière annoncée par le message. Rare : cooldown aléatoire de
// 3 à 4 jours entre deux réclamations, tout type confondu.
export async function POST(req: NextRequest) {
  let email = '';
  let kind: GiftKind = 'base';
  try {
    const body = await req.json().catch(() => ({}));
    email = String(body?.email ?? '').trim();
    kind = body?.kind === 'grand' ? 'grand' : 'base';
  } catch {
    email = '';
  }
  const res = await claimGift(email, kind);
  if (!res.ok) {
    return NextResponse.json(
      res.reason === 'cooldown'
        ? { ok: false, reason: 'cooldown', daysLeft: res.daysLeft }
        : { ok: false, reason: res.reason },
      { status: res.reason === 'cooldown' ? 409 : 401 },
    );
  }
  return NextResponse.json({ ok: true, kind: res.kind, tickets: res.tickets });
}
