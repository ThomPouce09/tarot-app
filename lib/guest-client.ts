'use client';

// lib/guest-client.ts — état client du mode Invité (cache + événements).
// La source de vérité reste la base (User.guestMode) ; ce module sert à
// cacher côté UI ce que le serveur refuse déjà (bouton d'augure, sauvegarde).

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export const GUEST_EVENT = 'arkane-guest';

let cached: boolean | null = null;

export function guestCached(): boolean { return cached === true; }

export function announceGuestMode(on: boolean) {
  cached = on;
  try { window.dispatchEvent(new CustomEvent(GUEST_EVENT, { detail: { on } })); } catch { /* SSR */ }
}

/** true = invité actif. Lisait l'état serveur puis suit l'événement global. */
export function useGuestMode(): boolean {
  const [g, setG] = useState(cached ?? false);
  useEffect(() => {
    const onEvt = (e: Event) => {
      const d = (e as CustomEvent<{ on: boolean }>).detail;
      if (d) { cached = d.on; setG(d.on); }
    };
    window.addEventListener(GUEST_EVENT, onEvt);
    return () => window.removeEventListener(GUEST_EVENT, onEvt);
  }, []);
  return g;
}

/** Bascule le mode via l'API (session serveur obligée). Utilisé par les
 *  modales « espace protégé » hors des hubs. Renvoie le nouvel état. */
export async function setGuestViaApi(on: boolean): Promise<boolean> {
  let email = '';
  try { email = JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return false; }
  if (!email) return false;
  try {
    const res = await api('/api/guest-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, on }),
    });
    const d = await res.json();
    const next = !!d.guestMode;
    announceGuestMode(next);
    return next;
  } catch {
    return cached === true;
  }
}

/** Récupère l'état serveur (appelé par le banner ; le reste de l'UI lit le cache). */
export async function refreshGuestState(email: string): Promise<boolean> {
  if (!email) { cached = false; return false; }
  try {
    const res = await api(`/api/guest-mode?email=${encodeURIComponent(email)}`);
    const d = await res.json();
    const next = !!d.guestMode;
    if (next !== cached) {
      cached = next;
      // Prévenons les composants abonnés (echo-box, sauvegardes) — mais PAS
      // depuis announceGuestMode (l'émetteur est déjà à jour : sinon le banner
      // qui écoute son propre événement relancerait un cycle infini).
      try { window.dispatchEvent(new CustomEvent(GUEST_EVENT, { detail: { on: next } })); } catch { /* SSR */ }
    }
  } catch { /* silencieux : mode normal par défaut */ }
  return cached === true;
}
