import { preloadSound } from '@/lib/sounds';

// Préchauffe TOUT ce dont le gobelet des dés a besoin, dès l'arrivée sur la
// page (bien avant la sélection du thème/question puis du lancer) :
//
//   1. le chunk JS WebGL/three.js du gobelet — le dynamic() des pages retombe
//      alors sur le module déjà téléchargé (plus d'écran « Préparation des
//      dés… » au moment du tirage) ;
//   2. les ASSETS que le module ne réclame qu'au montage de la 3D : les 3
//      images du gobelet, le fond de la scène et la police des faces de dés
//      (DejaVuSans, ~740 Ko). Sans cette étape le navigateur ne les demande
//      que quand le gobelet apparaît → téléchargement visible en plein geste.
//
// Ordinal : le chunk d'abord (chemin critique de l'affichage), les assets
// ensuite (ils profitent alors d'une bande passante libre). Tout est non
// bloquant : un échec est avalé en silence, le composant retéléchargera
// normalement lui-même au montage. Les chemins sont une réplique de ceux
// codés dans AstroDiceCup/AstroDiceSet — si l'un change là-bas, le
// préchargement devient un simple no-op (404 avalé), jamais une régression.
let p: Promise<unknown> | null = null;

// Toutes les pistes du geste de tirage (les 10 mp3, ~240 Ko au total) :
//  - secousse : jouée au pointerdown, souvent = 1er geste de la session →
//    sans préchauffe, le mp3 est téléchargé À CE MOMENT (le son part après
//    le début visuel de la secousse) ;
//  - jetés : joués au renversement (début du roulement sur la piste).
const DICE_SOUNDS = [
  'dice-shake-1', 'dice-shake-2', 'dice-shake-3',
  'dices-cup-1', 'dices-cup-2', 'dices-cup-3',
  'dice-throw-1', 'dice-throw-2', 'dice-throw-3', 'dices-throw-4',
  // frappe « le ciel se déchire » qui suit l'immobilisation des dés
  'animation-zodiac', 'animation-zodiac-obstacle',
];

const CUP_IMAGES = ['/images/gobelet1.png', '/images/gobelet2.png', '/images/gobelet3.png'];
const CUP_ASSETS = ['/backgrounds/des-divinatoires-bg.png', '/fonts/DejaVuSans.ttf'];

function warmImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

async function warmFont(url: string): Promise<void> {
  // La police des faces est chargée par le moteur 3D via fetch() au montage.
  // Ce fetch remplit le cache HTTP : la requête du moteur 3D repart alors du
  // cache — instantanée. priority 'low' = ne gêne jamais le rendu de la page.
  try {
    // Cast global : `priority` existe dans la spec fetch (Chrome/WebView) mais
    // pas dans le lib.dom.ts de ce TypeScript → on garde la directive au
    // runtime sans mentir au compilateur.
    const r = await fetch(url, { priority: 'low' } as RequestInit);
    if (r.ok) await r.arrayBuffer();
  } catch { /* hors-ligne : le moteur 3D retentera au montage */ }
}

function warmAssets(): Promise<void> {
  // Les pistes du geste sont préchargées avec le gobelet : au geste, play()
  // repart du cache — plus de téléchargement à la seconde du roulement.
  for (const k of DICE_SOUNDS) preloadSound(k);
  return Promise.all([...CUP_IMAGES.map(warmImage), ...CUP_ASSETS.map(warmFont)]).then(() => undefined);
}

export function preloadAstroDice(): Promise<unknown> {
  return (p ??= import('@/components/astro-dice').then(
    // Chunk téléchargé → les assets peuvent suivre sans gêner la page.
    (m) => warmAssets().then(() => m),
    // Échec du chunk : on le renvoie quand même tel quel (ressemblance avec
    // l'ancien comportement) SANS mémoriser l'échec — un nouvel appel après
    // un retour réseau retentera le téléchargement.
    (err) => { p = null; throw err; },
  ));
}
