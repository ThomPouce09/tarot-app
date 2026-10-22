// lib/draw-back-guard.ts
// Protection « retour arrière » des flux de tirage (tarot, yi-jing).
//
// PROBLEME (retour utilisateur smartphone) : après un tirage + consultation
// IA, le bouton retour du navigateur remontait le pont d'interprétation
// (*/interpretation) ou la page /interpret/[type]. Leur remontage relançait
// les vidéos d'attente ET re-consommait : le pont relisait le tirage en
// localStorage et re-poussait exactement le même tirage vers /interpret, où
// le POST /api/interpret repartait → tirage compté débité DEUX FOIS.
//
// DEFENSE TROIS COUCHES :
//
// (A) SENTINELLE D'HISTORIQUE — armDrawBackGuard(univers) est appelée par
//     l'ÉMETTREMENT qui navigue vers le résultat (ponts */interpretation,
//     boutons « Interpréter » des éventails tarot), juste AVANT le
//     router.push. Elle empile une entrée inoffensive : même URL + hash
//     `#retour-univers`, état { drawGuard: univers }. La pile devient
//     […][tirage][sentinelle][résultat]. Le premier appui « retour » dépile
//     le résultat et ACTIVE la sentinelle : <DrawBackGuard/> (monté dans le
//     layout) lit popstate, voit drawGuard et fait router.replace(univers) →
//     l'utilisateur revient DIRECTEMENT dans l'univers parent (/tarot,
//     /yi-jing, /runes, /des-divinatoires) en UN seul appui, sans jamais
//     remonter de page consommatrice. Armée à l'émission (geste unique,
//     synchronisé avec le push), pas au montage du résultat : le montage est
//     double en StrictMode et ne distingue pas une arrivée fraîche d'un
//     remontage.
//
// (B) FILET ANTI-DOUBLE-DÉBIT par signature — le POST de consultation est
//     marqué AVANT l'appel (sessionStorage : survit au retour et au reload,
//     disparaît à la fermeture de l'onglet). Si la même signature (type +
//     cartes/baguette + question + compte) se représente — WebView sans
//     sentinelle, refresh, deep-link — la page NE CONSOMME PAS, ne rend rien
//     (pas de vidéo) et remplace vers l'univers parent. Un tirage DIFFÉRENT
//     n'est jamais bloqué. 402/échec réseau : rien n'a été débité côté
//     serveur → clearDrawConsumed pour laisser le « Réessaie » libre.
//
// (C) PURGE DES PONTS — les ponts */interpretation suppriment leurs clés
//     localStorage sitôt lues : remontés par un retour, ils n'ont plus de
//     tirage à pousser et retournent à la page d'intention/univers.

const SS_CONSUMED = 'drawConsumedSig';

/** Hash discret de la sentinelle (sans signification de page). */
export const DRAW_GUARD_HASH = '#retour-univers';

/** Univers parent pour un type d'interprétation. */
export function universeForInterpretType(type: string): string | null {
  if (type.startsWith('tarot')) return '/tarot';
  if (type.startsWith('yi-jing') || type === 'yi-qing') return '/yi-jing';
  if (type.startsWith('runes')) return '/runes';
  if (type.startsWith('des')) return '/des-divinatoires';
  return null;
}

/**
 * (A) Empile la sentinelle de retour vers `univers`. À appeler sur le geste
 * qui navigue vers le résultat de consultation, juste AVANT le router.push.
 * No-op si l'entrée active est déjà une sentinelle (double tap, re-entry) ou
 * si l'historique est inaccessible (le flux normal est conservé, seule la
 * protection retour saute).
 */
export function armDrawBackGuard(univers: string): void {
  if (typeof window === 'undefined') return;
  try {
    const st = (history.state || {}) as { drawGuard?: string };
    if (st.drawGuard) return; // déjà sur une sentinelle : ne pas empiler deux fois
    history.pushState(
      { ...st, drawGuard: univers },
      '',
      window.location.pathname + window.location.search + DRAW_GUARD_HASH,
    );
  } catch {
    /* historique inaccessible : pas de protection, pas de régression */
  }
}

/** (B) Signature stable d'un tirage (type + faces + question + compte). */
export function drawSig(type: string, parts: Array<string | number | null | undefined>): string {
  return type + '|' + parts.map((p) => (p == null ? '' : String(p))).join('|');
}

/** (B) Le tirage `sig` a-t-il DÉJÀ été débité dans cet onglet ? */
export function alreadyConsumed(sig: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SS_CONSUMED) === sig;
  } catch {
    return false;
  }
}

/** (B) Marque le tirage `sig` comme débité — appeler juste avant le POST. */
export function markDrawConsumed(sig: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SS_CONSUMED, sig);
  } catch {
    /* noop */
  }
}

/** (B) Retire le marqueur s'il porte `sig` — débit refusé (402) ou échec
 *  réseau : le serveur n'a rien consommé, une nouvelle tentative reste libre. */
export function clearDrawConsumed(sig: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (sessionStorage.getItem(SS_CONSUMED) === sig) sessionStorage.removeItem(SS_CONSUMED);
  } catch {
    /* noop */
  }
}
