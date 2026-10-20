'use client';

// lib/video-quality.ts — Sélecteur de qualité vidéo selon l'écran.
// Les écrans haute résolution (≥1080 px physiques sur le plus grand côté)
// tirent la variante HD encodée depuis les sources Gemini (public/images/hd/,
// ~crf 21) ; les petits écrans gardent la version embarquée (3-10× plus légère).
// Table = fichiers réellement encodés (scripts/_gen_hd.py). Ajouter une HD =
// déposer le fichier ET son nom de base ici (une ligne).
//
// En APK (natif) : les HD ne sont PAS embarquées (poids) — elles sont lues en
// flux depuis le backend (oracle-etoiles.app). Le hors-ligne d'un écran 720p
// n'est pas impacté (jamais de HD demandée).

import { getApiBaseUrl, isNative } from '@/lib/capacitor-utils';

/** Bases (sans extension) des vidéos qui existent en HD dans /images/hd. */
const HD_BASES = new Set([
  'analyse-des-zodiaque1',
  'analyse-runes1', 'analyse-runes2', 'analyse-runes3', 'analyse-runes4', 'analyse-runes5',
  'analyse-tarot1', 'analyse-tarot2', 'analyse-tarot3',
  'yi-jing-bg1',
  'analyse-yi-jing4', 'analyse-yi-jing5', 'analyse-yi-jing6', 'analyse-yi-jing-h1',
]);

export function wantsHd(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.onLine === false) return false;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.connection?.saveData) return false; // économie de données → léger
    const dpr = window.devicePixelRatio || 1;
    const phys = Math.max(screen.width, screen.height) * dpr;
    return phys >= 1080;
  } catch { return false; }
}

/** URL d'attente (ex. /images/analyse-tarot2.mp4) → variante HD si applicable. */
export function withHd(url: string): string {
  if (!wantsHd()) return url;
  const m = url.match(/\/([a-z0-9-]+)\.mp4$/i);
  if (!m || !HD_BASES.has(m[1])) return url;
  const hdUrl = url.replace(/^(\/(?:images|backgrounds))\//, '$1/hd/');
  if (hdUrl === url) return url; // chemin non reconnu (pas un dossier média) → inchangé
  return isNative() ? `${getApiBaseUrl().replace(/\/+$/, '')}${hdUrl}` : hdUrl;
}

/** Liste de probes (preload-wait-videos) → mêmes indices en chemins HD. */
export function hdIndexUrls(prefix: string, indices: number[]): string[] {
  return indices.map((n) => withHd(`/images/${prefix}${n}.mp4`));
}
