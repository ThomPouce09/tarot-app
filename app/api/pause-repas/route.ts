import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Pause repas — consommation du barman, une fois par jour et par compte (email).
// GET  /api/pause-repas?email=&date= → { used: boolean }
// POST /api/pause-repas  body { email, date } → marque consommé pour ce jour.
// `date` = jour local du device (YYYY-MM-DD), envoyé par le client.
export const dynamic = 'force-dynamic';

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const email = (req.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  const date = req.nextUrl.searchParams.get('date') || '';
  if (!email || !VALID_DATE.test(date)) {
    return NextResponse.json({ used: false });
  }
  try {
    const row = await prisma.pauseRepasConsumption.findUnique({
      where: { email_date: { email, date } },
    });
    return NextResponse.json({ used: !!row });
  } catch (e) {
    console.error('[api/pause-repas] GET', e);
    return NextResponse.json({ used: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { email?: string; date?: string } = {};
  try { body = await req.json(); } catch {}
  const email = (body.email || '').trim().toLowerCase();
  const date = body.date || '';
  if (!email || !VALID_DATE.test(date)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  try {
    await prisma.pauseRepasConsumption.upsert({
      where: { email_date: { email, date } },
      create: { email, date },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/pause-repas] POST', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
