// Préchauffe le chunk du gobelet (WebGL/three.js) AVANT l'étape de tirage :
// appelé au montage des pages dés, le dynamic() des pages retombe alors sur
// le même module déjà téléchargé — plus d'écran « Préparation des dés… ».
let p: Promise<unknown> | null = null;
export function preloadAstroDice(): Promise<unknown> {
  return (p ??= import('@/components/astro-dice'));
}
