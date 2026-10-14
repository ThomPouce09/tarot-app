'use client';

// Cantonnement email non activé — global (layout racine, web + APK).
// Un compte VENU au monde (inscription) dont l'email n'est pas encore activé
// reste confiné à /dashboard/account : la bannière d'activation s'y trouve
// (renvoi du mail).
//
// Comportement (version « modale explicite » — remplace l'éjection silencieuse) :
//  - Clic vers une page interdite → on NE navigue PAS : preventDefault + modale
//    d'activation (renvoi d'email, aller à Mon espace, se déconnecter).
//  - Arrivée directe sur une page interdite (URL collée, router.push d'un
//    bouton) → voile opaque + même modale, jamais de rechargement visible.
//  - Invité (pas de tarot_user en localStorage) → libre (mode visiteur).
//  - Source de vérité serveur : POST /api/auth/refresh-status. Le statut
//    « non confirmé » est DÉSORMAIS cache aussi (sessionStorage, par email) :
//    état résolu de façon synchrone, voile posé avant la peinture de la page.
//  - Le blocage se lève dès que le lien d'activation est cliqué : re-vérif
//    réseau à chaque navigation tant que non confirmé (levée côté serveur).
//  - Verrou complémentaire côté API (lib/quota-guard.ts) : 403
//    { reason:'email-unconfirmed' } → événement 'arkane-email-lock' (posés
//    par lib/api-client / lib/session-client) → cette modale s'ouvre ici.
//  - Réseau KO → on NE bloque PAS (pas de faux positif ; le verrou serveur
//    des routes IA reste, lui, infranchissable).
//  - 404 (compte introuvable/en tombeau) → purge par les gardes existantes.

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

const HOME = '/dashboard/account';
// Normalisation APK : l'export statique (trailingSlash:true, servi par la
// WebView) donne des usePathname en formes variables — « /dashboard/account »,
// « /dashboard/account/ », parfois le chemin physique « …/index.html » (cf.
// speaker-ambience qui traitait déjà « /index.html »). Sans coupe, HOME ne
// correspond JAMAIS sur APK : le voile reste posé sur la page d'accueil et
// « Aller à Mon espace » paraît mort. norm() ramène tout à la route logique.
const norm = (p: string) => {
  if (!p) return p;
  let q = p.replace(/\/index\.html\/?$/i, ''); // /dashboard/account/index.html → /dashboard/account
  if (!q || q === '.') return '/';             // racine du site
  if (q.length > 1) q = q.replace(/\/+$/, ''); // slash final (trailingSlash)
  return q;
};
// Chemins autorisés avant activation : la page qui porte la bannière + les
// flux auth (lien d'activation, connexion, inscription, mot de passe oublié).
const ALLOWED = (p: string) =>
  p === HOME ||
  p.startsWith('/auth/') ||   // /auth/signup, /auth/confirm (lien), /auth/forgot-password
  p.startsWith('/login');     // mire de connexion

// Palette charte tutoriel (cf. components/language-gate.tsx) — bois, bordeaux,
// or. Écritures claires sur fonds foncés : jamais de noir sur bordeaux.
const GOLD = '#DAA520';
const GOLD_PALE = '#F0C75E';
const IVORY = '#F5EAD6';
const ROSE = '#E2B8AC';
const WINE = '#4A1931';

const CF_KEY = (email: string) => 'tarot_cf_' + email;   // confirmé (cache session)
const UCF_KEY = (email: string) => 'tarot_ucf_' + email; // non confirmé (cache session)

function readUser(): { email?: string; confirmed?: boolean } | null {
  try {
    const raw = localStorage.getItem('tarot_user');
    return raw ? (JSON.parse(raw) as { email?: string; confirmed?: boolean }) : null;
  } catch { return null; }
}

// Lecture d'état AVANT peinture (anti-flash) ; isomorphe pour éviter le warning SSR.
const useIsoEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function EmailConfirmLock() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState<string | null>(null);
  // null = inconnu (pas encore vérifié / réseau en cours) — ne rien imposer.
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  // Hint local (tarot_user.confirmed === false, frais juste après inscription) :
  // sert UNIQUEMENT à intercepter les clics — jamais à poser le voile, sinon
  // un drapeau périmé + réseau KO enfermerait un utilisateur légitime.
  const [hint, setHint] = useState(false);
  const [open, setOpen] = useState(false);            // modale ouverte par clic
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendErr, setResendErr] = useState(false);

  const locked = confirmed === false || hint;         // clics interceptés
  const path = norm(pathname);                        // APK: slash final (trailingSlash) — voir norm()
  const trapped = !!(confirmed === false && path && !ALLOWED(path)); // voile : vérité serveur/cache only
  const visible = trapped || open;

  // Identité + statut SYNCHRONES avant peinture : caches sessionStorage →
  // le voile se pose sans clignoter dès la deuxième navigation de la session.
  useIsoEffect(() => {
    const u = readUser();
    const em = u?.email ?? null;
    setEmail(em);
    setOpen(false); // navigation : on repart ferme (le voile, lui, est dérivé de l'état)
    if (!em) { setConfirmed(null); setHint(false); return; }
    try {
      if (sessionStorage.getItem(CF_KEY(em)) === '1') { setConfirmed(true); setHint(false); return; }
      if (sessionStorage.getItem(UCF_KEY(em)) === '1') { setConfirmed(false); setHint(true); return; }
    } catch {}
    // Hint : juste après l'inscription, tarot_user.confirmed === false est frais
    // → clics immédiatement interceptés, le temps de la vérif serveur.
    setHint(u?.confirmed === false);
    setConfirmed(null);
  }, [pathname]);

  // Vérification serveur (source de vérité) à chaque navigation tant que non
  // confirmé ; cache des deux sens. Le blocage se lève dès que l'activation a
  // été faite (même lue sur un autre appareil).
  useEffect(() => {
    if (!email) return;
    try { if (sessionStorage.getItem(CF_KEY(email)) === '1') { setConfirmed(true); return; } } catch {}
    let alive = true;
    fetch('/api/auth/refresh-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!alive) return;
        const c = typeof d?.confirmed === 'boolean' ? d.confirmed : null;
        setConfirmed(c);
        if (c === true) setHint(false);   // vérité serveur : on lève le hint local
        if (c === false) setHint(true);
        try {
          if (c === true) { sessionStorage.setItem(CF_KEY(email), '1'); sessionStorage.removeItem(UCF_KEY(email)); }
          if (c === false) { sessionStorage.setItem(UCF_KEY(email), '1'); sessionStorage.removeItem(CF_KEY(email)); }
        } catch {}
      })
      .catch(() => { if (alive) setConfirmed(null); }); // réseau KO → pas de blocage
    return () => { alive = false; };
  }, [email, pathname]);

  // Intercepteur global : un clic sur un lien interne interdit ne part PAS en
  // direction de la page (plus d'éjection, plus de « rechargement furtif ») —
  // on ouvre la modale d'activation, l'utilisateur reste là et comprend pourquoi.
  // Capture = avant tout gestionnaire React (root container plus bas dans l'arbre).
  useEffect(() => {
    if (!locked) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;
      if (!target || typeof target.closest !== 'function') return;
      const a = target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return; // externe : on ne touche pas
        if (ALLOWED(norm(url.pathname))) return;
      } catch { return; }
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [locked]);

  // Le serveur vient de refuser une route IA (403 email-unconfirmed) :
  // verrouille + ouvre la modale, où qu'on soit.
  useEffect(() => {
    const onLock = () => {
      const em = readUser()?.email ?? null;
      setConfirmed(false);
      if (em) { try { sessionStorage.setItem(UCF_KEY(em), '1'); sessionStorage.removeItem(CF_KEY(em)); } catch {} }
      setOpen(true);
    };
    window.addEventListener('arkane-email-lock', onLock);
    return () => window.removeEventListener('arkane-email-lock', onLock);
  }, []);

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    setResendMsg('');
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setResendErr(false); setResendMsg(t('lock.sent')); }
      else { setResendErr(true); setResendMsg(t('lock.error')); }
    } catch {
      setResendErr(true);
      setResendMsg(t('lock.error'));
    } finally {
      setResending(false);
    }
  };

  const goHome = () => {
    setOpen(false);
    if (path !== HOME) router.replace(HOME); // path normalisé : sur APK le pathname a un slash final
  };

  const logout = () => {
    try {
      localStorage.removeItem('tarot_user');
      localStorage.removeItem('arkane_session_token');
      if (email) { sessionStorage.removeItem(CF_KEY(email)); sessionStorage.removeItem(UCF_KEY(email)); }
    } catch {}
    setEmail(null);
    setConfirmed(null);
    setHint(false);
    setOpen(false);
    if (path && !ALLOWED(path)) router.replace('/');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[140] flex items-center justify-center px-5"
          data-email-lock-overlay
          // Voile OPAQUE quand on est « piégé » (page interdite atteinte sans
          // clic) : la page en dessous ne doit jamais se révéler. Sur page
          // autorisée, simple modale (fondu + flou).
          style={trapped
            ? { background: '#0a0604' }
            : { background: 'rgba(30, 15, 8, 0.62)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-lock-title"
            className="ts-panel relative w-full max-w-[380px] overflow-hidden rounded-3xl px-6 py-7 text-center"
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(160deg, #5A3A1E 0%, ${WINE} 58%, #34121F 100%)`,
              border: `1.5px solid ${GOLD}77`,
              boxShadow: '0 12px 48px rgba(0,0,0,0.45), 0 0 34px rgba(218,165,32,0.18), inset 0 0 0 1px rgba(240,199,94,0.08)',
            }}
          >
            {/* Cadre intérieur fin, comme le bord doré d'une lame */}
            <div className="pointer-events-none absolute inset-2 rounded-[22px] border border-[#DAA520]/20" />
            {/* Halo doré en tête */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(240,199,94,0.30) 0%, transparent 72%)' }}
            />

            {/* Fermeture : seulement si l'on n'est pas piégé sur une page interdite */}
            {!trapped && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('gate.close')}
                className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full"
                style={{ border: `1px solid ${GOLD}55`, background: 'rgba(24,10,4,0.35)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={IVORY} strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}

            <p className="relative mb-2 text-xs tracking-[0.45em]" style={{ color: `${GOLD_PALE}cc` }}>
              <span className="ts-twinkle">✦</span>
              <span className="ts-twinkle mx-1.5" style={{ animationDelay: '-0.9s' }}>☾</span>
              <span className="ts-twinkle" style={{ animationDelay: '-1.7s' }}>✦</span>
            </p>

            {/* Icône enveloppe dorée (SVG inline, charte : pas d'émoji) */}
            <svg
              className="relative mx-auto mb-3"
              width="36" height="36" viewBox="0 0 24 24" fill="none"
              stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(218,165,32,0.45))' }}
              aria-hidden
            >
              <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
              <path d="M3.5 6.8 12 13.2l8.5-6.4" />
            </svg>

            <h2
              id="email-lock-title"
              className="relative text-xl font-semibold tracking-wide"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                color: IVORY,
                textShadow: `0 0 16px ${GOLD}99, 0 1px 2px rgba(0,0,0,0.6)`,
              }}
            >
              {t('lock.title')}
            </h2>
            <p className="relative mt-2 text-[13px] leading-snug" style={{ color: ROSE }}>
              {t('lock.text')}
            </p>

            {email && (
              <p className="relative mt-3 text-[12px] leading-snug" style={{ color: ROSE }}>
                {t('lock.sentTo')}{' '}
                <span style={{ color: GOLD_PALE, fontFamily: 'var(--font-cormorant), serif', letterSpacing: '0.02em' }}>{email}</span>
              </p>
            )}
            <p className="relative mt-1 text-[11px] italic" style={{ color: `${ROSE}bb` }}>
              {t('lock.spam')}
            </p>

            {resendMsg && (
              <p
                role="status"
                aria-live="polite"
                className="relative mt-3 rounded-lg px-3 py-2 text-xs"
                style={resendErr
                  ? { color: '#F3C9C0', background: 'rgba(120,20,20,0.28)', border: '1px solid rgba(220,90,70,0.4)' }
                  : { color: IVORY, background: 'rgba(218,165,32,0.14)', border: `1px solid ${GOLD}55` }}
              >
                {resendMsg}
              </p>
            )}

            <div className="relative mt-6 flex flex-col gap-3">
              {/* Renvoi d'email — CTA primaire : pilule dorée glossée */}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full rounded-[0.6rem] py-3 text-[15px] font-semibold transition-[filter,box-shadow] duration-200 hover:brightness-110 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 58%), linear-gradient(135deg, #F0C75E, #B8860B)',
                  color: '#34121F',
                  boxShadow: '0 4px 14px rgba(218,165,32,0.45), inset 0 -3px 8px rgba(122,74,4,0.5)',
                }}
              >
                {resending ? t('account.checking') : t('lock.resend')}
              </button>

              {/* Aller à Mon espace — fant doré, texte ivoire */}
              <button
                type="button"
                onClick={goHome}
                className="w-full rounded-[0.6rem] border py-3 text-[15px] font-semibold transition-colors duration-200"
                style={{ background: 'rgba(24,10,4,0.35)', borderColor: `${GOLD}66`, color: IVORY }}
              >
                {t('lock.goHome')}
              </button>

              {/* Se déconnecter — lien discret ivoire */}
              <button
                type="button"
                onClick={logout}
                className="w-full py-1 text-[13px] underline-offset-2 transition-opacity duration-200 hover:underline"
                style={{ color: `${ROSE}cc` }}
              >
                {t('gate.logout')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
