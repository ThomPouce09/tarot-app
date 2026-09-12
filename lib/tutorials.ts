'use client';

// APK : les appels /api passent par l'helper (backend distant Vercel).
import { api } from '@/lib/api-client';

// lib/tutorials.ts — Drapeaux « tutoriel vu » LIÉS AU COMPTE (base Neon).
// localStorage sert de cache de travail (lecture synchrone) ; la base est la
// source de vérité : les flags survivent à déconnexion/reconnexion et suivent
// l'utilisateur sur un autre appareil.
//
// Flags :
//   'tour'         → visite guidée « Le hall des Etoiles » (landing)
//   'login_tour'   → mini-visite du menu après connexion (account-nav)
//   'hints_landing' / 'hints_runes' / 'hints_tarot' / 'hints_yijing' / 'hints_des'
//                  → mini-tutots des hubs (FirstVisitHints)

const LOCAL_KEY = 'tarot…s';
/** Événement window dispatché quand le cache local change (hydratation, marquage). */
export const TUTS_EVENT = 'tuts-changed';

let migrated = false;
let hydrated = false;
let hydrating: Promise<void> | null = null;

function userEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || '';
  } catch {
    return '';
  }
}

/** Migration one-shot : anciens flags localStorage → tableau unifié. */
function migrateLegacy() {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;
  try {
    if (localStorage.getItem(LOCAL_KEY) !== null) return;
    const seeded: string[] = [];
    if (localStorage.getItem('tarot_seen_tour')) seeded.push('tour');
    if (localStorage.getItem('tarot_tour_done')) seeded.push('login_tour');
    for (const k of ['hints_landing', 'hints_runes', 'hints_tarot', 'hints_yijing', 'hints_des']) {
      if (localStorage.getItem(k)) seeded.push(k);
    }
    writeLocal(seeded);
  } catch {
    // stockage indisponible — tout restera en mémoire (non bloquant)
  }
}

function readLocal(): string[] {
  migrateLegacy();
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeLocal(list: string[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(TUTS_EVENT));
  } catch {
    // stockage indisponible
  }
}

/** Le flag est-il vu (cache local, hydraté depuis le serveur) ? */
export function isTutorialSeen(flag: string): boolean {
  return readLocal().includes(flag);
}

function pushToServer(body: Record<string, unknown>): Promise<void> {
  const email = userEmail();
  if (!email) return Promise.resolve();
  return api('/api/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...body }),
  })
    .then(() => undefined)
    .catch(() => {
      // hors-ligne / erreur serveur — le local suffit pour la session
    });
}

/** Marque un tutoriel comme vu : cache local + compte en base (union serveur). */
export function markTutorialSeen(flag: string) {
  const list = readLocal();
  if (!list.includes(flag)) {
    list.push(flag);
    writeLocal(list);
  }
  pushToServer({ seenTutorials: [flag] });
}

/** Télécharge les flags du compte une fois par chargement de page.
 *  Résout immédiatement si déjà hydraté ou non connecté. */
export function hydrateTutorials(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;
  const email = userEmail();
  if (!email) {
    hydrated = true;
    return Promise.resolve();
  }
  hydrating = api(`/api/prefs?email=${encodeURIComponent(email)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      const server: string[] = Array.isArray(d?.seenTutorials) ? d.seenTutorials : [];
      const local = readLocal();
      const merged = Array.from(new Set([...local, ...server]));
      if (merged.length !== local.length) writeLocal(merged);
      // Flags vus sur CET appareil mais absents du compte → on complète la base.
      if (merged.length > server.length) pushToServer({ seenTutorials: merged });
    })
    .catch(() => {
      // serveur injoignable — on travaille sur le cache local
    });
  return hydrating.finally(() => {
    hydrated = true;
    hydrating = null;
  });
}

/** À appeler après connexion/déconnexion : force une nouvelle hydratation. */
export function onAccountChanged() {
  hydrated = false;
  hydrating = null;
  void hydrateTutorials();
}

/** Bouton « Revoir le tutoriel » : remet à zéro compte + cache.
 *  L'appelant recharge ensuite la page pour relancer tous les tutos
 *  (tour, mini-visite menu, mini-tutots). La gate « Langue · Language »
 *  n'est PAS relancée volontairement : son rejeu purgerait la session
 *  (tarot_user) et déconnecterait l'utilisateur.
 *  ATTEND la réponse du serveur avant de résoudre : sans ça, le
 *  rechargement qui suit annule le POST, les flags restent en base et
 *  l'hydratation les ré-applique immédiatement → rien ne se relance
 *  (bug corrigé sept. 2026). */
export async function resetAllTutorials(): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_KEY);
    for (const k of ['tarot_seen_tour', 'tarot_tour_done', 'hints_landing', 'hints_runes', 'hints_tarot', 'hints_yijing', 'hints_des']) {
      localStorage.removeItem(k);
    }
  } catch {
    // stockage indisponible
  }
  migrated = true;
  hydrated = false;
  hydrating = null;
  await pushToServer({ seenTutorialsClear: true });
}
