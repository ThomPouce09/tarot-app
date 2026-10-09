// lib/gate-server.ts
// Helper serveur : verrou de droits (session + quota base/avancé) pour les
// endpoints d'interprétation. Un seul point, réutilisé par toutes les routes.
//
// Usage dans une route API :
//   const gate = await enforceGate(request, body, type, question, flowId);
//   if (gate) return gate; // 401 sans session / 402 quota → null = autorisé.
//
// Depuis l'ère « session » : la mention « invité → libre » a DISPARU. Toutes
// les pages de tirage sont derrière AuthGate (compte vérifié) — une route IA
// sans session valide est une anomalie (script ou APK périmé), elle doit être
// refusée, pas servie gratuitement.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { guardRequest } from './quota-guard';

export async function enforceGate(
  request: NextRequest,
  body: { email?: unknown; userId?: unknown; type?: unknown; flowId?: unknown },
  type: string,
  question?: string | null,
): Promise<NextResponse | null> {
  const g = await guardRequest(request, {
    email: body.email ?? body.userId ?? null,
    type: body.type ?? type,
    flowId: body.flowId ?? null,
    question: question ?? null,
  }, type);
  if ('error' in g) return g.error;
  return null;
}
