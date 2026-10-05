// lib/media.ts — Reroutage TEMPORAIRE des médias lourds vers leur version optimisée.
//
// Les fichiers optimisés vivent dans `public/media-opt/` avec EXACTEMENT la même
// arborescence et les mêmes noms que les originaux (les originaux ne sont jamais
// écrasés ni supprimés). Basculer `MEDIA_OPTIMIZED` à false remet l'application
// sur les fichiers d'origine : c'est le SEUL interrupteur, et rien d'autre n'est
// à regénérer. Une fois la validation visuelle faite, on pourra promouvoir les
// fichiers optimisés à leur place définitive et retirer ce module.
import MANIFEST from '@/lib/generated/media-opt.json';

export const MEDIA_OPTIMIZED = true;

const OPT_BASE = '/media-opt';

// Chemins pour lesquels une version optimisée existe RÉELLEMENT (manifeste produit
// par le script d'optimisation). Un média absent du manifeste est servi depuis son
// fichier d'origine : le reroutage ne peut donc jamais produire de 404, même si des
// fichiers sont déplacés ou ajoutés entre deux passes d'optimisation.
const AVAILABLE: ReadonlySet<string> = new Set(
  (MANIFEST as { files?: string[] }).files ?? [],
);

/**
 * Chemin public d'un média, rerouté vers sa version optimisée quand le reroutage
 * est actif ET que cette version existe. Les valeurs non absolues (http(s),
 * data:, vide) sont laissées intactes.
 */
export function media(p: string): string {
  if (!p || !p.startsWith('/')) return p;
  if (!MEDIA_OPTIMIZED || !AVAILABLE.has(p)) return p;
  return OPT_BASE + p;
}
