// lib/retry-dynamic.ts — Import dynamique avec garde-fou temps + tentatives.
// Sur certains téléphones d'entrée de gamme (WebView bridée, réseau capricieux,
// Doogee S86 Pro notamment), le chunk JS du gobelet 3D peut ne JAMAIS aboutir :
// ni résolution ni rejet → l'écran « Préparation des dés… » reste figé
// indéfiniment. Ce helper ajoute un délai maximal par tentative : le chunk
// n'arrive pas à temps → on rejette et on retente (cache-buster : la réponse
// en demi-teinte ne sert pas deux fois). Après les tentatives, on laisse la
// dernière promesse expirer sans timeout : le module finira par monter s'il
// arrive quand même, sinon next/dynamic affichera son loading (comportement
// historique) — mais au moins deux tentatives actives ont eu lieu.

const FIRST_TIMEOUT_MS = 20000;  // 1ʳᵉ tentative : 20 s (4G chargée)
const NEXT_TIMEOUT_MS = 30000;   // suivantes : 30 s (liée lente)

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('chunk-timeout')), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

/**
 * Enveloppe un factory `dynamic(() => import(...))` avec retry.
 * `bust` ajoute un query au module ? — next/webpack résout le chunk par sa
 * map interne, pas l'URL du module : on ne peut pas cache-buster le chunk
 * lui-même. On retente simplement l'import (le navigateur réémet la requête
 * network du chunk, le HTTP cache peut rejouer — mais une 2ᵉ tentative après
 * timeout réseau reprend là où la 1ʳᵉ s'est arrêtée via keep-alive).
 */
export function dynamicWithRetry<T>(factory: () => Promise<T>): () => Promise<T> {
  return () =>
    withTimeout(factory(), FIRST_TIMEOUT_MS).catch(() =>
      withTimeout(factory(), NEXT_TIMEOUT_MS).catch(() =>
        // 3ᵉ tentative sans timeout : laisse jouer le comportement d'origine
        factory(),
      ),
    );
}
