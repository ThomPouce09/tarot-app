// app/api/entitlement/status/route.ts
// Vérification NON destructive de la disponibilité de TOUS les tirages, en une
// requête. Appelé par les hubs (tarot, yi-jing, dés, runes) pour griser les
// tuiles épuisées + afficher le message d'alerte au clic.
//
//   GET /api/entitlement/status?email=  → { [type]: GateDecision }

import { NextRequest, NextResponse } from 'next/server';
import { canDo } from '@/lib/entitlements';
import { ALL_TIRAGE_TYPES } from '@/lib/classification';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 });

    const e = String(email).toLowerCase().trim();
    // Parallèle (Promise.all) : les appels Prisma partent en concurrence, ce qui
    // évite le cumul du cold-start Neon (séquentiel = ~14x latence).
    const entries = await Promise.all(
      ALL_TIRAGE_TYPES.map(async (type) => [type, await canDo(e, type, null)] as const)
    );
    const status: Record<string, unknown> = Object.fromEntries(entries);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('[api/entitlement/status]', err?.message);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
