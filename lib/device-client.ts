'use client';

// lib/device-client.ts — Jeton d'appareil pour l'anti-abus multi-comptes (étage 1).
// UUID v4 aléatoire généré à la première ouverture, persisté en localStorage.
// Web : survit aux visites normales (pas en navigation privée). APK : la
// WebView Android persiste le localStorage tant que les données de l'app ne
// sont pas effacées — sufficiently sticky for the welcome-pack gate.
// Le serveur n'en reçoit que le HMAC (voir lib/device.ts).

const KEY = '***';

export function getDeviceToken(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.length >= 16) return existing;
    const fresh = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // stockage indisponible (navigation privée stricte) : token éphémère —
    // le serveur ne pourra pas lier, on retombe sur l'email vérifié seul.
    return '';
  }
}
