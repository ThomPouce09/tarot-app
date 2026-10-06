// Géométrie des pierres runiques et inclinaison 3D de la table.
// Extrait tel quel de RuneStonesSet.tsx (découpage) ; aucun comportement
// n'a été modifié. TILT_GAIN/TILT_MAX restent privés (hook uniquement).

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { RuneLayout } from './runes';

export const STONE_W = 54;
export const STONE_H = 78;
export const STONE_DEPTH = 17;
export const POUCH = { x: 50, y: 74 };
export const FLIGHT_DURATION = 1.15;

/* Position verticale adaptative du pochon (% du conteneur) :
   à 440px (pages mjolnir/yggdrasil) on garde 74% ; quand la hauteur baisse,
   le pochon remonte juste assez pour que le compteur « Appuie encore »
   (bottom:-22px) reste visible sous le sac (le conteneur est en overflow:hidden)
   — sans le remonter plus que nécessaire. */
export function pouchYFor(height: number, layout: RuneLayout = 'horizontal'): number {
  // /runes/yggdrasil & /runes/mjolnir : pochon réduit, descendu SOUS le
  // dessin (l'art est comprimé à 86 % de hauteur — banded basse libre).
  if (layout === 'tree' || layout === 'hammer') return Math.min(91.5, ((height - 44) / height) * 100);
  if (height >= 440) return 74;
  return Math.max(58, Math.min(74, ((height - 110) / height) * 100));
}

export function slotsFor(layout: RuneLayout, count: number): Array<[number, number]> {
  // Tirage d'une rune seule (ex: Conseil d'Odin) → centrée, en face du pochon.
  if (count === 1) return [[50, 26]];
  switch (layout) {
    case 'horizontal':
      return Array.from({ length: count }, (_, i) => [
        24 + (52 / Math.max(count - 1, 1)) * i,
        26,
      ]);
    case 'vertical':
      return Array.from({ length: count }, (_, i) => [
        50,
        76 - (56 / Math.max(count - 1, 1)) * i,
      ]);
    case 'cross':
      return ([
        [50, 50], [50, 14], [50, 84], [16, 50], [84, 50],
      ] as Array<[number, number]>).slice(0, count);
    case 'hammer':
      // Le dessin du marteau est comprimé à 86 % (scale 1,0.86) : mêmes
      // proportions pour les poses, bande ≥ 80 % réservée au pochon.
      return ([
        [50, 65], [50, 41], [30, 24], [70, 24], [50, 15],
      ] as Array<[number, number]>).slice(0, count);
    case 'tree':
      // Yggdrasil : mêmes ancrages % que YGG_POS (positions.ts) — l'SVG de
      // l'arbre occupe le même conteneur, les pierres se posent ZONE par ZONE
      // (racines → tronc → branches → couronne), l'ordre de révélation 0..4
      // fait monter la sève du bas vers le haut.
      return ([
        [28, 65], [73, 65], [50, 42], [76, 22], [50, 11],
      ] as Array<[number, number]>).slice(0, count);
    default:
      return Array.from({ length: count }, (_, i) => [
        24 + (52 / Math.max(count - 1, 1)) * i,
        26,
      ]);
  }
}

export function revealOrder(layout: RuneLayout, count: number): number[] {
  if (layout === 'hammer') return [0, 1, 2, 3, 4].slice(0, count);
  return Array.from({ length: count }, (_, i) => i);
}

/* ------------------------------------------------------------------ */
/* Parallaxe 3D : DeviceOrientation (mobile) + souris (desktop).       */
/* Mutation DOM directe dans une boucle rAF → aucun re-render.         */
/* Met aussi à jour --shx/--shy (reflet spéculaire) sur la couche.     */
/* Exporté pour réutilisation (ex: table sacrée de /runes/nornes2).    */
/* ------------------------------------------------------------------ */
const TILT_GAIN = 3.2;
const TILT_MAX = 28;

export function useDeviceTilt(tableRef: RefObject<HTMLDivElement>) {
  const target = useRef({ rx: 0, ry: 0 });
  const current = useRef({ rx: 0, ry: 0 });
  const raf = useRef<number | null>(null);
  const enabled = useRef(false);
  const baseBeta = useRef<number | null>(null);

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    // Calibration : la première mesure devient la position neutre avant/arrière.
    if (baseBeta.current == null) baseBeta.current = e.beta;
    target.current.ry = clamp((e.gamma / 2.2) * TILT_GAIN, -TILT_MAX, TILT_MAX);
    target.current.rx = clamp(
      (-(e.beta - baseBeta.current) / 2.2) * TILT_GAIN,
      -TILT_MAX,
      TILT_MAX,
    );
  }, []);

  const onMouse = useCallback((e: MouseEvent) => {
    const nx = e.clientX / window.innerWidth - 0.5;
    const ny = e.clientY / window.innerHeight - 0.5;
    target.current.ry = clamp(nx * 2 * TILT_MAX, -TILT_MAX, TILT_MAX);
    target.current.rx = clamp(-ny * 2 * TILT_MAX, -TILT_MAX, TILT_MAX);
  }, []);

  const loop = useCallback(() => {
    current.current.rx += (target.current.rx - current.current.rx) * 0.09;
    current.current.ry += (target.current.ry - current.current.ry) * 0.09;
    const el = tableRef.current;
    if (el) {
      const { rx, ry } = current.current;
      el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      // Reflet spéculaire : le point brillant glisse à l'opposé du tilt.
      el.style.setProperty('--shx', `${(50 - ry * 2.4).toFixed(1)}%`);
      el.style.setProperty('--shy', `${(38 + rx * 2.4).toFixed(1)}%`);
      // Intensité du reflet selon l'amplitude du tilt.
      const amp = Math.min(
        1,
        (Math.abs(rx) + Math.abs(ry)) / (TILT_MAX * 1.2),
      );
      el.style.setProperty('--shi', (0.25 + amp * 0.55).toFixed(2));
    }
    raf.current = requestAnimationFrame(loop);
  }, [tableRef]);

  const enable = useCallback(async () => {
    if (enabled.current) return;
    enabled.current = true;
    try {
      const DOE = (window as unknown as {
        DeviceOrientationEvent?: {
          requestPermission?: () => Promise<'granted' | 'denied'>;
        };
      }).DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          enabled.current = false;
          return;
        }
      }
      window.addEventListener('deviceorientation', onOrient);
      window.addEventListener('mousemove', onMouse);
      if (!raf.current) loop();
    } catch {
      enabled.current = false;
    }
  }, [loop, onOrient, onMouse]);

  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('mousemove', onMouse);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [onOrient, onMouse]);

  return { enable };
}
