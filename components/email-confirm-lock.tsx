'use client';

// Cantonnement email non validé — global (layout racine, web + APK).
// Un compte VENU au monde (inscription) dont l'email n'est pas encore activé
// reste confiné à /dashboard/account : la bannière d'activation s'y trouve
// (renvoi du mail). Tenter d'aller ailleurs (landing, tirages, historique,
// dashboard…) renvoie sur cette page.
//
// Règles :
//  - Invité (pas de tarot_user en localStorage) → libre (mode visiteur).
//  - Utilisateur connecté + confirmé → libre.
//  - Vérification serveur (POST /api/auth/refresh-status, source de vérité),
//    JAMAIS le localStorage seul (il peut mentir après suppression/reseed).
//  - Cache per-session du « confirmé » (sessionStorage) : on ne retente pas
//    le réseau à chaque navigation une fois la liberté acquise.
//  - Tant que l'état est « non confirmé », on re-vérifie à chaque navigation :
//    le blocage se lève dès que le lien d'activation a été cliqué (même lu
//    sur un autre appareil).
//  - 404 (compte introuvable/en tombeau) → purge de session locale par les
//    gardes existantes ; ici on ne bloque pas.
//  - Réseau KO → on NE bloque PAS (pas de faux positif qui éjecterait un
//    utilisateur légitime ; les routes IA/quota restent gardées côté serveur).

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client'; // APK : proxy backend (export statique)

const HOME = '/dashboard/account';
// Chemins autorisés avant activation : la page qui porte la bannière + les
// flux auth (lien d'activation, connexion, inscription, mot de passe oublié).
const ALLOWED = (p: string) =>
  p === HOME ||
  p.startsWith('/auth/') ||   // /auth/signup, /auth/confirm (lien), /auth/forgot-password
  p.startsWith('/login');     // mire de connexion

export default function EmailConfirmLock() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  // null = inconnu (pas encore vérifié / réseau en cours) — ne rien imposer.
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  // Identité locale : qui est connecté ? Relu à chaque navigation (login /
  // logout / changement de compte en SPA) — changement = re-vérification.
  useEffect(() => {
    try {
      const u = localStorage.getItem('tarot_user');
      setEmail(u ? (JSON.parse(u)?.email ?? null) : null);
    } catch { setEmail(null); }
  }, [pathname]);

  useEffect(() => {
    if (!email) { setConfirmed(null); return; }
    // Déjà confirmé durant cette session : liberté totale, plus de requête.
    try { if (sessionStorage.getItem('tarot_cf_' + email) === '1') { setConfirmed(true); return; } } catch {}
    let alive = true;
    api('/api/auth/refresh-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!alive) return;
        const c = typeof d?.confirmed === 'boolean' ? d.confirmed : null;
        setConfirmed(c);
        if (c === true) { try { sessionStorage.setItem('tarot_cf_' + email, '1'); } catch {} }
      })
      .catch(() => { if (alive) setConfirmed(null); }); // réseau KO → pas de blocage
    return () => { alive = false; };
  }, [email, pathname]); // re-vérifie à chaque navigation tant que non confirmé

  useEffect(() => {
    if (confirmed === false && pathname && !ALLOWED(pathname)) {
      router.replace(HOME);
    }
  }, [confirmed, pathname, router]);

  return null;
}
