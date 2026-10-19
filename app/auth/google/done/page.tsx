'use client';

// app/auth/google/done/page.tsx — Relais de fin de passage Google NATIF.
// Le callback serveur (navigateur système) renvoie l'APK ici via le deep link
// tarotdivination:// avec le state. Cette page :
//   1) relit le ticket en mémoire (localStorage, posé par /api/auth/google/start)
//   2) attend que le callback ait déposé l'email (poll /status)
//   3) retire la session (/claim, usage unique) et applique les mêmes contrats
//      de session que le login web → /dashboard/account.
// En web pur (si jamais servi), le GSI fait le même travail sans passer ici.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { HANDOFF_KEY } from '@/components/google-button';
import { api } from '@/lib/api-client';

export default function GoogleDonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d0604]" />}>
      <GoogleDoneInner />
    </Suspense>
  );
}

function GoogleDoneInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const t = useT();
  const state = String(sp.get('state') || '');
  const [msg, setMsg] = useState(t('auth.google.waiting'));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let ticket = '';
    try {
      const raw = localStorage.getItem(HANDOFF_KEY);
      if (raw) {
        const h = JSON.parse(raw);
        if (h && h.state === state) ticket = String(h.ticket || '');
      }
    } catch { /* illisible → échec propre */ }
    if (!/^[0-9a-f]{40}$/.test(state) || !ticket) {
      setMsg(t('auth.google.failed'));
      setTimeout(() => router.replace('/login'), 2500);
      return;
    }

    let stop = false;
    const waitReady = async () => {
      for (let i = 0; i < 40; i++) { // jusqu'à ~60 s
        if (stop) return false;
        try {
          const r = await api(`/api/auth/google/status?state=${encodeURIComponent(state)}`);
          const d = await r.json();
          if (d.ready) return true;
          if (d.expired) return false;
        } catch { /* réseau transitoire */ }
        await new Promise((res) => setTimeout(res, 1500));
      }
      return false;
    };

    (async () => {
      const ready = await waitReady();
      if (stop) return;
      if (!ready) {
        setMsg(t('auth.google.failed'));
        try { localStorage.removeItem(HANDOFF_KEY); } catch {}
        window.dispatchEvent(new Event('close-login'));
        setTimeout(() => router.replace('/login'), 2500);
        return;
      }
      try {
        const res = await api('/api/auth/google/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, ticket, lang: document.documentElement.lang || 'fr' }),
        });
        const data = await res.json();
        if (!res.ok || !data.session) throw new Error('claim');
        try { localStorage.removeItem(HANDOFF_KEY); } catch {}
        try { localStorage.setItem('tarot_user', JSON.stringify(data.user)); } catch {}
        try { localStorage.setItem('arkane_session_token', data.session); } catch {}
        // La modale de connexion mondiale doit disparaître : le compte
        // est là. (Sinon elle flotte au-dessus de /dashboard/account.)
        window.dispatchEvent(new Event('close-login'));
        // Fermer l'onglet système si possible (Custom Tab rattaché à l'app).
        try { (window as any).Capacitor?.Plugins?.Browser?.close?.()?.catch?.(() => {}); } catch {}
        router.replace('/dashboard/account');
      } catch {
        setMsg(t('auth.google.failed'));
        try { localStorage.removeItem(HANDOFF_KEY); } catch {}
        window.dispatchEvent(new Event('close-login'));
        setTimeout(() => router.replace('/login'), 2500);
      }
    })();
    return () => { stop = true; };
  }, [state, router, t]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 text-center"
      style={{ background: 'radial-gradient(ellipse at top, #2a1810 0%, #1a0e0a 60%, #0d0604 100%)' }}
    >
      <div style={{ fontFamily: 'var(--font-cormorant), serif', color: '#e8d5a3', fontSize: '1.15rem' }}>
        {msg}
      </div>
    </div>
  );
}
