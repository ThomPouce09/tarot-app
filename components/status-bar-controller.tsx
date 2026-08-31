'use client';

// components/status-bar-controller.tsx
// Gère la barre d'état Android pour un plein écran propre (edge-to-edge) :
// - double sécurité contre la config `StatusBar` du capacitor.config.ts qui
//   ré-affichait une barre grise/opaque.
// - on PEINT la barre en sombre (#1a0e0a, même que le fond du body) pour
//   qu'elle ne soit JAMAIS grise, puis on la passe en overlay et on la masque.
// Le masquage de la barre de NAVIGATION (bas) est géré nativement par
// MainActivity (immersif sticky) + le padding safe-area du globals.css.
// No-op sur le web.

import { useEffect } from 'react';
import { isNative } from '@/lib/capacitor-utils';

const APP_BG = '#1a0e0a';

export default function StatusBarController() {
  useEffect(() => {
    if (!isNative()) return;
    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        // Contenu sous la barre (edge-to-edge) — retiré le bandeau gris.
        await StatusBar.setOverlaysWebView({ overlay: true });
        // Peint la barre en sombre (jamais grise) avant de la masquer.
        await StatusBar.setBackgroundColor({ color: APP_BG });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.hide();
      } catch { /* plugin non syncé → MainActivity gère déjà */ }
    })();
  }, []);
  return null;
}
