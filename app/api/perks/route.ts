// app/api/perks/route.ts
// Privilèges d'abonnement « Conseil d'Odin » (runes) & « Secret d'Artémis » (dés).
// GET  : état courant { allowed, reason, remaining } — non destructif (remaining
//        null = illimité Arkane). POST : vérifie + consomme 1 usage (Initié ;
//        Arkane toujours autorisé, rien à décrémenter). La consommation des
//        privilèges eux-mêmes se fait dans les routes d'analyse IA ; cette route
//        sert d'état pour l'UI (badges « 1/mois utilisé » et tests/ajustements).

import { NextRequest, NextResponse } from 'next/server';
import { checkPerk, consumePerk, type PerkKind } from '@/lib/perks';

export const dynamic = 'force-dynamic';

const VALID: PerkKind[] = ['odin', 'artemis'];

export async function GET(request: NextRequest) {
  const email = String(request.nextUrl.searchParams.get('userId') || '').trim();
  const kind = request.nextUrl.searchParams.get('kind') as PerkKind;
  if (!email || !VALID.includes(kind)) return NextResponse.json({ error: 'userId et kind requis' }, { status: 400 });
  const d = await checkPerk(email, kind);
  return NextResponse.json({ allowed: d.allowed, reason: d.reason, remaining: d.remaining });
}

export async function POST(request: NextRequest) {
  let body: any = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const email = String(body?.userId || '').trim();
  const kind = body?.kind as PerkKind;
  if (!email || !VALID.includes(kind)) return NextResponse.json({ error: 'userId et kind requis' }, { status: 400 });
  const d = await consumePerk(email, kind);
  if (!d.allowed) return NextResponse.json({ error: d.message, reason: d.reason, gated: true }, { status: 402 });
  return NextResponse.json({ allowed: true, reason: d.reason, remaining: d.remaining });
}
