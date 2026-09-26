'use client';

// lib/preload-wait-videos.ts
// Préchauffe les vidéos d'attente d'analyse IA (/images/<prefix>1..9.mp4) :
// les fichiers réellement présents sont détectés une fois (HEAD), puis la
// vidéo choisie est poussée dans le cache HTTP via <link rel=preload> dès
// l'arrivée sur la page. Résultat : l'encart d'attente affiche l'image
// immédiatement au lieu d'un poster noir le temps du téléchargement (~1 s
// en 4G). Appelé par les pages dés en parallèle de preloadAstroDice().

const MAX_VIDEO_INDEX = 9;
const cache = new Map<string, Promise<number[]>>();

function probe(prefix: string): Promise<number[]> {
  return Promise.all(
    Array.from({ length: MAX_VIDEO_INDEX }, (_, i) => {
      const n = i + 1;
      return fetch(`/images/${prefix}${n}.mp4`, { method: 'HEAD' })
        .then((r) => (r.ok ? n : 0))
        .catch(() => 0);
    }),
  ).then((xs) => xs.filter(Boolean));
}

/** Liste (1×) les vidéos du préfixe ; mémoïsée par préfixe. */
export function warmWaitVideos(prefix: string): Promise<number[]> {
  let p = cache.get(prefix);
  if (!p) {
    p = probe(prefix);
    cache.set(prefix, p);
  }
  return p;
}

/** src déjà choisi + préchargé pour ce préfixe (les <video> le réutilisent). */
const lastPick = new Map<string, string>();
export function peekWaitVideo(prefix: string): string | undefined {
  return lastPick.get(prefix);
}

/** Tire un index au hasard parmi les vidéos existantes et le précharge. */
export async function pickAndPreloadWaitVideo(prefix: string): Promise<string> {
  const avail = await warmWaitVideos(prefix);
  const n = avail.length
    ? avail[Math.floor(Math.random() * avail.length)]
    : 1 + Math.floor(Math.random() * MAX_VIDEO_INDEX);
  const src = `/images/${prefix}${n}.mp4`;
  lastPick.set(prefix, src);
  if (typeof document !== 'undefined' && !document.head.querySelector(`link[data-wait-video="${src}"]`)) {
    const l = document.createElement('link');
    l.rel = 'preload';
    l.as = 'video';
    l.href = src;
    l.dataset.waitVideo = src;
    document.head.appendChild(l);
  }
  return src;
}

export const DEFAULT_WAIT_PREFIX = 'analyse-des-zodiaque';
