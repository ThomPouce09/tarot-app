// Vérifie que la porte web (middleware) laisse passer ce qu'il faut et
// bloque toujours le reste. On simule les requêtes en production.
import type { NextRequest } from 'next/server';

// IS_PROD est figé à l'import du module : l'environnement doit être posé AVANT
// de le charger (sinon la porte web ne s'active pas dans le test).
// NODE_ENV est en lecture seule côté types : on passe par un cast.
(process.env as Record<string, string>).NODE_ENV = 'production';
(process.env as Record<string, string>).VERCEL_ENV = 'production';
const { middleware } = require('../middleware') as typeof import('../middleware');

function req(path: string, origin = ''): NextRequest {
  return {
    headers: new Headers(origin ? { origin } : {}),
    nextUrl: new URL(`https://tarot-app-one-sage.vercel.app${path}`),
    method: 'GET',
  } as unknown as NextRequest;
}

const CASES: Array<[string, string, number | 'pass']> = [
  // [description, chemin, statut attendu ('pass' = laissé passer)]
  ['App Links (Android)', '/.well-known/assetlinks.json', 'pass'],
  ['Bandeau email', '/email/letter-header.png', 'pass'],
  ['Icône email', '/email/icon-oracle@2x.png', 'pass'],
  ['Privacy (Play Store)', '/privacy', 'pass'],
  ['Confirmation email', '/auth/confirm', 'pass'],
  ['Retour Stripe', '/dashboard/account/abonnement', 'pass'],
  ['Relais pay-return (APK)', '/pay-return?next=/dashboard/account/abonnement', 'pass'],
  ['API (APK)', '/api/prefs', 'pass'],
  ['Page applicative', '/dashboard/account/echoes', 403],
  ['Accueil', '/', 403],
  ['Tarot', '/tarot', 403],
  ['Fichier .well-known détourné', '/.well-known/autre.json', 403],
  ['Sous-dossier email non prévu', '/email/../secret.txt', 403],
];

let ko = 0;
for (const [label, path, expected] of CASES) {
  let got: number | 'pass';
  try {
    const res = middleware(req(path));
    got = res && typeof (res as any).status === 'number' && (res as any).status !== 200 ? (res as any).status : 'pass';
  } catch {
    got = 'pass';
  }
  const ok = got === expected;
  if (!ok) ko++;
  console.log(`${ok ? 'OK  ' : 'ÉCHEC'} ${label.padEnd(34)} ${path.padEnd(38)} → ${got} (attendu ${expected})`);
}
console.log();
console.log(ko === 0 ? 'Tous les cas passent.' : `${ko} cas en échec.`);
