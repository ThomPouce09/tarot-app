'use client';

// lib/guest-client.ts — état client du mode Invité (cache + événements).
// La source de vérité reste la base (User.guestMode + guestPinHash) ; ce
// module sert à cacher côté UI ce que le serveur refuse déjà (bouton d'augure,
// sauvegarde) et à porter le verrou 4 chiffres (option A, 2026-10-20) :
//  • hasPin : un code de sortie existe en base (décor de l'UI — le serveur
//    vérifie de toute façon à chaque bascule off).
//  • setGuestViaApi(on, pin) : pin exigé par le serveur pour OFF si un code
//    existe ; retourne un code d'erreur riche (pin-wrong / pin-locked…).

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export const GUEST_EVENT = 'arkane-guest';

let cached: boolean | null = null;
let allowed: boolean | null = null; // mode Invité = abonnés Initié/Arkane seulement (cache GET /api/guest-mode)
let hasPinCached: boolean | null = null; // un code 4 chiffres existe en base

export type GuestExitError = 'pin-required' | 'pin-wrong' | 'pin-locked' | 'pin-format' | 'network' | null;

export function guestAllowedCached(): boolean { return allowed !== false; }

export function guestCached(): boolean { return cached === true; }

export function guestHasPinCached(): boolean { return hasPinCached === true; }

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

/** Bascule le mode via l'API (session serveur obligée).
 *  pin : code 4 chiffres — exigé par le serveur pour la sortie dès qu'un code
 *  est posé. Renvoie { guestMode, error } — error nulle = succès.
 *  Legacy (avant le verrou) : aucun code en base → sortie libre côté serveur. */
export async function setGuestViaApi(on: boolean, pin?: string | null): Promise<{ guestMode: boolean; error: GuestExitError; lockedUntil?: number }> {
  let email = '';
  try { email = JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return { guestMode: false, error: 'network' }; }
  if (!email) return { guestMode: false, error: 'network' };
  try {
    const res = await api('/api/guest-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, on, pin: pin || undefined }),
    });
    const d = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok) {
      const code = String(d.error || '');
      // Cache réactif : le serveur dit qu'un code existe → l'UI le sait.
      if (code === 'pin-required') hasPinCached = true;
      return { guestMode: cached === true, error: (['pin-required', 'pin-wrong', 'pin-locked', 'pin-format'] as string[]).includes(code) ? (code as GuestExitError) : 'network', lockedUntil: typeof d.lockedUntil === 'number' ? d.lockedUntil : undefined };
    }
    const next = !!(d as { guestMode?: boolean }).guestMode;
    announceGuestMode(next);
    return { guestMode: next, error: null };
  } catch {
    return { guestMode: cached === true, error: 'network' };
  }
}

/** Récupère l'état serveur (appelé par le banner ; le reste de l'UI lit le cache). */
export async function refreshGuestState(email: string): Promise<boolean> {
  if (!email) { cached = false; return false; }
  try {
    const res = await api(`/api/guest-mode?email=${encodeURIComponent(email)}`);
    const d = await res.json();
    const next = !!d.guestMode;
    if (typeof d.canGuest === 'boolean') allowed = d.canGuest;
    if (typeof d.hasPin === 'boolean') hasPinCached = d.hasPin;
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
