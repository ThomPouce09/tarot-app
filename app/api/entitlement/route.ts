// app/api/entitlement/route.ts
// Point d'entrée du gating client : les pages de tirage appellent cet endpoint
// pour vérifier ET consommer les quotas (base vs avancé) avant de lancer.
//
//   GET  /api/entitlement?email=&type=&question=  → décide (non destructif)
//   POST /api/entitlement { email, type, question } → consume (atomique)

import { NextRequest, NextResponse } from 'next/server';
import { canDo, consume } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    const type = request.nextUrl.searchParams.get('type') || '';
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });
    const question = request.nextUrl.searchParams.get('question');

    const decision = await canDo(String(email).toLowerCase().trim(), type, question);
    return NextResponse.json(decision);
  } catch (e: any) {
    console.error('[api/entitlement GET]', e?.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body?.email || '').toString().toLowerCase().trim();
    const type = (body?.type || '').toString();
    const question = body?.question || null;
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });
    if (!type) return NextResponse.json({ error: 'type requis' }, { status: 400 });

    const decision = await consume(email, type, question);
    return NextResponse.json(decision);
  } catch (e: any) {
    console.error('[api/entitlement POST]', e?.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
