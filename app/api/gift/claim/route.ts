import { NextRequest, NextResponse } from 'next/server';
import { claimGift } from '@/lib/gift';

export const dynamic = 'force-dynamic';

// POST /api/gift/claim — Réclame le cadeau d'une créature (1 tirage offert).
// Rare : une réclamation possible tous les 5 jours maximum.
export async function POST(req: NextRequest) {
  let email = '';
  try {
    const body = await req.json().catch(() => ({}));
    email = String(body?.email ?? '').trim();
  } catch {
    email = '';
  }
  const res = await claimGift(email);
  if (!res.ok) {
    return NextResponse.json(
      res.reason === 'cooldown'
        ? { ok: false, reason: 'cooldown', daysLeft: res.daysLeft }
        : { ok: false, reason: 'not-logged' },
      { status: res.reason === 'cooldown' ? 409 : 401 },
    );
  }
  return NextResponse.json({ ok: true, giftTickets: res.giftTickets });
}
