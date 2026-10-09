// lib/quota-guard.ts — verrou serveur unique des routes d'interprétation IA.
// Combine trois choses, dans cet ordre :
//   1. SESSION : l'email vient du jeton X-Session (lib/session.ts), JAMAIS du
//      body. Sans jeton → 401 { reason: 'session' } (l'app demande à
//      l'utilisateur de se reconnecter — les comptes existants reconnectent
//      une fois après le déploiement, choix assumé).
//   2. QUOTA : canDo + consume (lib/entitlements) — la vérité des droits vit
//      dans la DB, plus dans le client.
//   3. FLUX : un même tirage client (flowId) ne débite QU'UNE FOIS, même si
//      la page enchaîne 2-3 appels IA (Choix = approfondie + filet court ;
//      Obstacle = obstacle + solution + voies). Le flowId est persisté en DB
//      (DrawFlow) pour survivre au scale-out des lambdas.
//
// Usage dans une route :
//   const g = await guardRequest(request, body, 'des-choix');
//   if ('error' in g) return g.error;  // 401 session / 402 quota
//   ... générer ...
// Si le client n'envoie pas de flowId (ancienne version APK), on débite à
// chaque appel : le tirage reste protégé, juste moins fin sur la dédup.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireSessionEmail } from './session';
import { canDo, consume } from './entitlements';
import { prisma } from './prisma';

export type GuardOk = { email: string; consumed: boolean };
export type GuardErr = { error: NextResponse };

/** Purge paresseuse des flux de plus de 40 jours (une fois par heure environ). */
let lastPurge = 0;
async function purgeOldFlows() {
  const now = Date.now();
  if (now - lastPurge < 3_600_000) return;
  lastPurge = now;
  try {
    await prisma.drawFlow.deleteMany({ where: { consumedAt: { lt: new Date(now - 40 * 24 * 3600_000) } } });
  } catch { /* silencieux */ }
}

async function claimFlow(userId: string, flowId: string, type: string): Promise<boolean> {
  const id = `${userId}:${flowId}`;
  try {
    const existing = await prisma.drawFlow.findUnique({ where: { id } });
    if (existing) return false; // flux déjà débité
    await prisma.drawFlow.create({
      data: { id, userId, key: flowId, type },
    });
    return true;
  } catch {
    // Contrainte unique violée (deux lambdas en parallèle) OU erreur DB :
    // on ne débite pas une deuxième fois si le create a échoué pour cause
    // de doublon ; sinon on laisse passer (générosité).
    try {
      const again = await prisma.drawFlow.findUnique({ where: { id } });
      return !again;
    } catch { return true; }
  }
}

/**
 * Verrou complet pour une route IA.
 * @param request   la requête Next (headers X-Session)
 * @param body      le body parsé (peut porter { email, type, flowId })
 * @param fallbackType le type de tirage si le client ne l'envoie pas
 * @param opts.perk  pour les perks (Odin/Artémis) vérifiés AVANT quota par la route elle-même
 */
export async function guardRequest(
  request: NextRequest,
  body: { email?: unknown; type?: unknown; flowId?: unknown; question?: unknown },
  fallbackType: string,
  opts: { allowExtraCalls?: boolean } = {},
): Promise<GuardOk | GuardErr> {
  const req = requireSessionEmail(request, typeof body.email === 'string' ? body.email : null);
  if ('error' in req) return { error: req.error as NextResponse };
  const email = req.email;

  const type = typeof body.type === 'string' && body.type ? body.type : fallbackType;
  const question = typeof body.question === 'string' ? body.question : null;

  // 1) Flux déjà ouvert (même window 5 min ou même flowId) → DÉJÀ PAYÉ :
  //    on autorise sans re-vérifier le quota. L'ordre compte : si le débit
  //    vient de faire passer l'apprenti à « 1 base/jour », le 2e appel IA
  //    du même tirage (filet court, solution, voies) doit passer.
  // 2) Sinon : décision (message paywall précis) puis consommation.
  const flowKey = typeof body.flowId === 'string' && body.flowId.length >= 8
    ? `x${body.flowId.slice(0, 64)}`
    : `w${Math.floor(Date.now() / 300_000)}`; // bucket implicite 5 min
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    return { error: NextResponse.json({ error: 'Compte introuvable.', reason: 'not-logged', gated: true }, { status: 401 }) };
  }
  const isNewFlow = await claimFlow(user.id, `${type}:${flowKey}`, type);
  void purgeOldFlows();
  if (!isNewFlow) return { email, consumed: false };

  const decision = await canDo(email, type, question);
  if (!decision.allowed) {
    return { error: NextResponse.json(
      { error: decision.message, reason: decision.reason, gated: true },
      { status: decision.reason === 'not-logged' ? 401 : 402 },
    ) };
  }

  if (opts.allowExtraCalls) return { email, consumed: false };
  const c = await consume(email, type, question);
  if (!c.allowed) {
    return { error: NextResponse.json(
      { error: c.message, reason: c.reason, gated: true }, { status: 402 },
    ) };
  }
  return { email, consumed: true };
}
