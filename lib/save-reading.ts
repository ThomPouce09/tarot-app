'use client';
import { api } from '@/lib/api-client';

// lib/save-reading.ts
// Helper partagé : persiste un tirage dans l'historique (POST /api/readings).
// Utilisé par les pages Runes et Dés du Zodiaque pour alimenter
// /dashboard/account/readings. Ne fait rien si l'utilisateur n'est pas connecté.

export interface SaveReadingInput {
  /** type de tirage, ex: 'runes-nornes', 'des-choix' */
  type: string;
  /** question éventuelle (optionnelle) */
  question?: string | null;
  /** éléments tirés, sérialisables (runes ou dés) */
  cards: unknown[];
  /** interprétation (texte statique +/- IA). Chaîne libre. */
  interpretation?: string | null;
  /** libellé du mode / variante pour l'historique (optionnel) */
  spread?: string | null;
}

export async function saveReading(input: SaveReadingInput): Promise<string | null> {
  try {
    const raw = localStorage.getItem('tarot_user');
    if (!raw) return null; // non identifié -> on ne sauvegarde pas
    const u = JSON.parse(raw);
    const userId = u?.email;
    if (!userId) return null;

    const res = await api('/api/readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: input.type,
        question: input.question ?? null,
        spread: input.spread ?? null,
        cards: input.cards,
        interpretation: input.interpretation ?? null,
      }),
    });
    if (!res.ok) {
      console.warn('[saveReading] échec', res.status);
      return null;
    }
    const data = await res.json();
    return data?.id ?? null;
  } catch (e) {
    console.warn('[saveReading] erreur', e);
    return null;
  }
}

/** Met à jour une lecture existante (cards / interpretation / spread) */
export async function updateReading(readingId: string, payload: { cards?: unknown[]; interpretation?: string; spread?: string }): Promise<boolean> {
  try {
    const raw = localStorage.getItem('tarot_user');
    if (!raw) return false;
    const u = JSON.parse(raw);
    const userId = u?.email;
    if (!userId) return false;

    const res = await api('/api/readings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, id: readingId, ...payload }),
    });
    return res.ok;
  } catch (e) {
    console.warn('[updateReading] erreur', e);
    return false;
  }
}
