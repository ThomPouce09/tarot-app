'use client';

// components/status-bar-controller.tsx
// Masque la barre d'état Android et passe en overlay (contenu sous la barre)
// au démarrage. Contre la config `StatusBar` du capacitor.config.ts qui
// ré-affichait la barre. Le masquage de la barre de NAVIGATION est géré
// nativement par MainActivity (immersif sticky). No-op sur le web.

import { useEffect } from 'react';
import { isNative } from '@/lib/capacitor-utils';

export default function StatusBarController() {
  useEffect(() => {
    if (!isNative()) return;
    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        // Contenu sous la barre (edge-to-edge) + barre masquée.
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.hide();
      } catch { /* plugin non syncé → MainActivity gère déjà */ }
    })();
  }, []);
  return null;
}
