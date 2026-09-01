// lib/gate-server.ts
// Helper serveur : verrou de droits (quota base/avancé) pour les endpoints
// d'interprétation. Un seul point, réutilisé par toutes les routes.
//
// Usage dans une route API :
//   const gate = await enforceGate(userId?, type, question);
//   if (gate) return gate; // réponse 402 si bloqué, sinon null → continuer.

import { NextResponse } from 'next/server';
import { canDo, consume } from './entitlements';

export async function enforceGate(
  userId: string | null | undefined,
  type: string,
  question?: string | null
): Promise<NextResponse | null> {
  // Invité (sans compte) → libre (l'historique n'est enregistré que connecté).
  if (!userId || typeof userId !== 'string' || !userId.trim()) return null;

  const decision = await canDo(userId, type, question ?? null);
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.message, reason: decision.reason, gated: true, status: 402 },
      { status: 402 }
    );
  }
  await consume(userId, type, question ?? null);
  return null;
}
