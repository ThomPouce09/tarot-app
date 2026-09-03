'use client';

// app/runes/_shared.tsx
// Primitives visuelles partagées de la section "Runes Scandinaves".
// Palette : vert forêt / sapin profond (fonds), doré pâle / sable (bords, titres),
// vert sauge clair (textes secondaires / illustrations).
// Background provisoire : dégradé vert profond + voile doré subtil (à remplacer
// par tes visuels définitifs).

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Rune } from '@/components/rune-stones/runes';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import { useLang } from '@/lib/i18n';

/* Palette centralisée */
export const RUNE_THEME = {
  forestDeep: '#0c2417', // vert forêt très profond (fond principal)
  forest: '#14361f', // vert sapin
  forestMid: '#1f5234', // vert sapin moyen
  sage: '#9fc4ad', // vert sauge clair (texte secondaire)
  sagePale: '#cfe3d6', // vert sauge très clair (illustration)
  goldPale: '#e9d9ac', // doré pâle / beige sable (titres, bordures)
  goldSoft: '#d8c79a', // doré un peu plus soutenu
  goldGlow: '#e9d9ac66',
  ink: '#0a1c11',
  stone: '#b9d4c4',
} as const;

/* Pochon vert à liserés dorés — décoratif, placé au-dessus du composant de
   tirage (le RuneStonesSet ne le contient plus). */
export function RunePouch() {
  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{
        width: 130,
        height: 78,
        background:
          'linear-gradient(180deg, #1f5234 0%, #14361f 70%, #0e2919 100%)',
        borderRadius: '50% 50% 46% 46% / 60% 60% 40% 40%',
        border: '2px solid #d8c79a',
        boxShadow:
          '0 0 22px rgba(216,199,154,0.25), inset 0 -8px 18px rgba(0,0,0,0.45)',
      }}
    >
      {/* liseré doré supérieur */}
      <div
        className="absolute"
        style={{
          top: 6,
          left: 14,
          right: 14,
          height: 3,
          background:
            'linear-gradient(90deg, transparent, #e9d9ac, transparent)',
          borderRadius: 2,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: '#e9d9ac',
          fontSize: 13,
          letterSpacing: '0.15em',
          opacity: 0.85,
        }}
      >
        RUNES
      </span>
    </div>
  );
}

/* Fond provisoire commun (dégradé vert profond + voile doré) */
export function RuneBackground({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.forestDeep} 55%, #06120b 100%)`,
      }}
    >
      {/* voile doré pâle subtil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(233,217,172,0.10) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* Titre de section stylé doré pâle / vert sauge */
export function RuneTitle({
  title,
  subtitle,
  compact,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div className={`px-4 text-center ${compact ? 'pt-14 pb-1' : 'pt-16 pb-6'}`}>
      <h1
        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide"
        style={{
          fontFamily: 'var(--font-cinzel-deco), serif',
          color: RUNE_THEME.goldPale,
          textShadow: `0 0 30px ${RUNE_THEME.goldGlow}, 0 2px 6px rgba(0,0,0,0.6)`,
          letterSpacing: '0.08em',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="mx-auto mt-3 max-w-xl text-sm sm:text-base italic"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: RUNE_THEME.sage,
            opacity: 0.9,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* Bouton principal (vert sapin, bord doré pâle) */
export function RuneButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'gold';
}) {
  const bg =
    variant === 'gold'
      ? disabled
        ? RUNE_THEME.forestMid
        : RUNE_THEME.goldSoft
      : disabled
        ? RUNE_THEME.forestMid
        : RUNE_THEME.forest;
  const color = variant === 'gold' ? RUNE_THEME.ink : RUNE_THEME.goldPale;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="rounded-xl px-6 py-3 text-sm sm:text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        fontFamily: 'var(--font-cinzel), serif',
        background: bg,
        color,
        border: `1.5px solid ${RUNE_THEME.goldPale}`,
        boxShadow: disabled
          ? 'none'
          : `0 0 18px ${RUNE_THEME.goldGlow}, 0 4px 12px rgba(0,0,0,0.4)`,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </motion.button>
  );
}

/* Encart vert doux (synthèses, indicateurs) */
export function SageCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="mx-auto max-w-2xl rounded-2xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forest}22 100%)`,
        border: `1.5px solid ${RUNE_THEME.goldPale}55`,
        boxShadow: `inset 0 0 30px ${RUNE_THEME.forestMid}22`,
      }}
    >
      {title && (
        <h3
          className="mb-3 text-center text-lg font-bold"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: RUNE_THEME.goldPale,
            textShadow: `0 0 12px ${RUNE_THEME.goldGlow}`,
          }}
        >
          {title}
        </h3>
      )}
      <div
        className="text-sm sm:text-base leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sagePale }}
      >
        {children}
      </div>
    </div>
  );
}

/* Carte / tuile de niveau 1 */
export function RuneTile({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <motion.div
        whileHover={{ y: -4 }}
        className="h-full rounded-2xl p-6 text-center"
        style={{
          background: `linear-gradient(150deg, ${RUNE_THEME.forestMid}55 0%, ${RUNE_THEME.forestDeep}cc 100%)`,
          border: `1.5px solid ${RUNE_THEME.goldPale}44`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
      >
        <div
          className="mb-3 text-2xl font-bold"
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            color: RUNE_THEME.goldPale,
            textShadow: `0 0 14px ${RUNE_THEME.goldGlow}`,
          }}
        >
          {title}
        </div>
        <p
          className="text-sm sm:text-base leading-relaxed"
          style={{
            fontFamily: 'var(--font-cinzel), serif',
            color: RUNE_THEME.sage,
          }}
        >
          {description}
        </p>
        <div
          className="mt-4 inline-block text-xs uppercase tracking-widest"
          style={{ color: RUNE_THEME.goldSoft, opacity: 0.8 }}
        >
          Découvrir →
        </div>
      </motion.div>
    </Link>
  );
}

/* Lien retour vers le tableau de bord runes */
export function BackToRunes() {
  return (
    <div className="py-8 text-center">
      <Link
        href="/runes"
        className="text-sm underline-offset-4 hover:underline"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}
      >
        ← Retour aux Runes Scandinaves
      </Link>
    </div>
  );
}

/* Glyphe ⓘ (info) SVG inline — règle projet : pas d'emoji/Material. */
function InfoGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10.8v5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="7.4" r="1.25" fill="currentColor" />
    </svg>
  );
}

/* Légende de lecture d'une rune tirée (nom + sens + signification).
   compactInfo : tuile compacte (symbole + nom + position) avec une bulle ⓘ
   qui déplie l'explication à la demande — au lieu du long texte affiché. */
export function RuneReading({
  rune,
  position,
  meaning,
  reversed,
  compactInfo = false,
}: {
  rune: Rune | null;
  position: string;
  meaning?: string;
  reversed?: boolean;
  compactInfo?: boolean;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  if (!rune) return null;

  const infoText = meaning ?? (reversed ? rune.reversed : rune.upright);

  // Variante compacte : la tuile reste fine, l'explication est derrière la bulle ⓘ.
  if (compactInfo) {
    return (
      <div
        className="relative mx-auto w-full max-w-xl rounded-xl px-3 py-2.5"
        style={{
          background: `linear-gradient(150deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forestDeep}aa 100%)`,
          border: `1.5px solid ${RUNE_THEME.goldPale}44`,
        }}
      >
        {/* Bulle ⓘ (haut-droite) : déplie l'explication de la position */}
        <button
          type="button"
          onClick={() => setInfoOpen((o) => !o)}
          aria-expanded={infoOpen}
          aria-label={infoOpen ? 'Masquer l’explication' : 'En savoir plus sur cette position'}
          className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{
            color: RUNE_THEME.goldPale,
            background: infoOpen ? `${RUNE_THEME.goldPale}26` : 'transparent',
            border: `1px solid ${RUNE_THEME.goldPale}${infoOpen ? '88' : '00'}`,
          }}
        >
          <InfoGlyph size={16} />
        </button>

        <div className="flex items-center gap-3 pr-9">
          <span
            style={{
              fontFamily: 'var(--font-cinzel-deco), serif',
              fontSize: 26,
              lineHeight: 1,
              color: RUNE_THEME.goldPale,
              display: 'inline-block',
              transform: reversed ? 'rotate(180deg)' : 'none',
            }}
          >
            {rune.symbol}
          </span>
          <div className="min-w-0 text-left">
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldSoft }}
            >
              {position}
            </p>
            <p className="text-sm font-bold leading-snug" style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.sagePale }}>
              {rune.name}
              {reversed ? ' (à l’envers)' : ''}
            </p>
          </div>
        </div>

        {/* Explication dépliée par la bulle ⓘ */}
        <AnimatePresence initial={false}>
          {infoOpen && (
            <motion.div
              key="info"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <p
                className="mt-2 border-t pt-2 text-xs leading-relaxed"
                style={{
                  borderColor: `${RUNE_THEME.goldPale}22`,
                  fontFamily: 'var(--font-cinzel), serif',
                  color: RUNE_THEME.sage,
                }}
              >
                {infoText}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Layout classique (autres pages runes) : carte avec le texte affiché.
  return (
    <div
      className="mx-auto max-w-xl rounded-2xl p-4"
      style={{
        background: `linear-gradient(150deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forestDeep}aa 100%)`,
        border: `1.5px solid ${RUNE_THEME.goldPale}44`,
      }}
    >
      <div className="mb-1 text-center">
        <span
          style={{
            fontFamily: 'var(--font-cinzel-deco), serif',
            fontSize: 38,
            color: RUNE_THEME.goldPale,
            display: 'inline-block',
            transform: reversed ? 'rotate(180deg)' : 'none',
          }}
        >
          {rune.symbol}
        </span>
      </div>
      <p
        className="text-center text-sm uppercase tracking-widest"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldSoft }}
      >
        {position}
      </p>
      <p
        className="text-center text-base font-bold"
        style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.sagePale }}
      >
        {rune.name}
        {reversed ? ' (à l’envers)' : ''}
      </p>
      <p
        className="mt-2 text-center text-sm leading-relaxed"
        style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sage }}
      >
        {infoText}
      </p>
    </div>
  );
}

/* Apparition progressive d'un bloc (lecture de runes) sans scintillement :
   fondu opacity seul (pas de transform `y` qui re-composite sur mobile),
   couche GPU stabilisée pour éviter le shimmer au fade. */
export function RuneReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Analyse IA structurée d'un tirage de runes (appelle /api/rune-interpretation). */
export function RuneAnalysis({
  runes,
  mode,
  focus,
  buttonLabel = "✨ Interroger l'Oracle",
  onAnalysis,
  autoRun = false,
}: {
  runes: { rune: Rune; reversed: boolean; position: string }[];
  mode: 'nornes' | 'mjolnir' | 'yggdrasil';
  focus?: 'odin';
  buttonLabel?: string;
  /** Rappelé avec le texte complet de l'analyse (synthèse + sections + conseil) dès qu'elle est disponible. */
  onAnalysis?: (text: string) => void;
  /** Lance l'interprétation IA automatiquement dès le montage (pas de bouton). */
  autoRun?: boolean;
}) {
  const [sections, setSections] = useState<
    { position: string; rune: string; sens: string; lecture: string }[] | null
  >(null);
  const [synthese, setSynthese] = useState('');
  const [conseil, setConseil] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Vidéo d'attente aléatoire (analyse-runesX.mp4) pendant l'interprétation.
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // Messages d'attente rotatifs, affichés en bas de la vidéo (par langue).
  const [waitMsgs, setWaitMsgs] = useState<string[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const lang = useLang();
  const { gateReason, closeGate, openGate } = useEntitlement();
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Type d'attente (pool de messages) selon le tirage : les Nornes (nornes &
  // nornes2) ajoutent leur message dédié, Yggdrasil le sien, Mjölnir la base.
  const waitType =
    mode === 'nornes' ? 'runes-nornes'
    : mode === 'yggdrasil' ? 'runes-yggdrasil'
    : 'runes-mjolnir';

  // Charge une vidéo d'attente au hasard (détectée dynamiquement côté serveur)
  // + la liste des messages d'attente de la langue courante.
  const pickVideo = useCallback(async () => {
    try {
      const res = await fetch(`/api/interpretation-wait?type=${waitType}&lang=${lang}`, { cache: 'no-store' });
      const data = await res.json();
      const urls: string[] = data?.backgroundUrls ?? [];
      if (urls.length > 0) setVideoUrl(urls[0]);
      setWaitMsgs(Array.isArray(data?.messages) ? (data.messages as string[]) : []);
      setMsgIndex(0);
    } catch {
      // Pas de vidéo : l'état loading texte suffit.
    }
  }, [waitType, lang]);

  // Rotation douce des messages d'attente (tant que l'analyse est en cours).
  // Chaque message reste affiché ~6s (assez long pour être lu confortablement).
  useEffect(() => {
    if (!loading || waitMsgs.length < 2) return;
    const id = window.setInterval(() => setMsgIndex((i) => i + 1), 6000);
    return () => window.clearInterval(id);
  }, [loading, waitMsgs.length]);

  // La vidéo est montée APRÈS le fetch (hors geste utilisateur) : l'attribut
  // autoPlay peut être bloqué par le navigateur. On force play() explicitement
  // dès que l'URL est disponible (vidéo muted → toujours autorisé).
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const v = videoRef.current;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [videoUrl]);

  const run = useCallback(async () => {
    setError('');
    setLoading(true);
    setSections(null);
    setSynthese('');
    setConseil('');
    void pickVideo();
    try {
      const payload = runes.map((r) => ({
        name: r.rune.name,
        symbol: r.rune.symbol,
        position: r.position,
        sense: r.reversed ? r.rune.reversed : r.rune.upright,
        reversed: r.reversed,
      }));
      // Identité + type (pour le gating serveur) : runes-mjolnir | runes-nornes | runes-yggdrasil.
      const runeType = `runes-${mode}`;
      let userId = '';
      try { const u = localStorage.getItem('tarot_user'); if (u) userId = JSON.parse(u).email || ''; } catch { /* noop */ }
      const res = await fetch('/api/rune-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runes: payload, mode, focus, userId, type: runeType }),
      });
      if (res.status === 402) {
        const d = await res.json().catch(() => ({}));
        if (mountedRef.current) { setLoading(false); openGate(d.reason || 'limit-grand'); }
        return;
      }
      if (!res.ok) {
        throw new Error(`API ${res.status}`);
      }
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.sections && Array.isArray(data.sections)) {
        setSections(data.sections);
        setSynthese(data.synthese || '');
        setConseil(data.conseil_action || '');
        // Propager la réponse structurée complète à la page parente (pour persistance historique)
        onAnalysis?.(JSON.stringify(data));
      } else {
        setError("L'Oracle n'a pas répondu de façon structurée. Réessaie.");
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError("L'Oracle est silencieux… Réessaie dans un instant.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [runes, mode, focus]);

  // autoRun : lance l'interprétation dès le montage (pas de bouton) + amène le
  // focus sur la zone d'attente une fois l'analyse en cours.
  const boxRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const ranRef = useRef(false);
  const runStartRef = useRef(0);
  const waitFocusedRef = useRef(false);

  // Force le layer transparent (sous la vidéo) à s'afficher : son bas s'aligne
  // sur le bas de l'écran → la vidéo, au-dessus, est garantie entièrement
  // visible (scrollIntoView fonctionne sur tout conteneur de scroll).
  const focusWaitBottom = useCallback(() => {
    if (waitFocusedRef.current || !spacerRef.current) return;
    waitFocusedRef.current = true;
    spacerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    if (!autoRun || ranRef.current) return;
    ranRef.current = true;
    runStartRef.current = Date.now();
    run();
    // ~1,8s de délai : laisse le temps de VOIR le tirage (runes + tuiles)
    // avant de rediriger le focus vers la vidéo d'attente.
    const t = window.setTimeout(focusWaitBottom, 1800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // Si la vidéo n'est pas encore montée à l'échéance des 1,8s, le focus part
  // dès qu'elle apparaît ; sinon le timer ci-dessus s'en est déjà chargé.
  useEffect(() => {
    if (!autoRun || !videoUrl || waitFocusedRef.current) return;
    const elapsed = Date.now() - runStartRef.current;
    const t = window.setTimeout(focusWaitBottom, Math.max(0, 1800 - elapsed));
    return () => window.clearTimeout(t);
  }, [autoRun, videoUrl, focusWaitBottom]);

  // Révélation IA prête → amener le début de l'interprétation en tête d'écran
  // (la grande tuile de la position, pas les tuiles compactes au-dessus).
  const scrolledSectionsRef = useRef(false);
  useEffect(() => {
    if (!autoRun || !sections || loading || scrolledSectionsRef.current) return;
    scrolledSectionsRef.current = true;
    const t = window.setTimeout(() => {
      boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [autoRun, sections, loading]);

  return (
    <div
      className="mt-6"
      ref={boxRef}
      style={{ scrollMarginTop: '4vh' }}
    >
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      {!autoRun && !sections && !loading && !error && (
        <div className="text-center">
          <RuneButton variant="gold" onClick={run}>
            {buttonLabel}
          </RuneButton>
        </div>
      )}

      {loading && (
        videoUrl ? (
          <>
            {/* Vidéo d'attente aléatoire (16:9), centrée, en boucle, avec messages
               d'attente rotatifs superposés en bas (sur voile dégradé). */}
            <div className="relative mx-auto w-full max-w-xl">
            <video
              key={videoUrl}
              ref={videoRef}
              className="aspect-video w-full rounded-2xl object-cover shadow-[0_0_40px_rgba(218,165,32,0.25)]"
              style={{ border: `1px solid ${RUNE_THEME.goldPale}44` }}
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
            />
            {/* Voile bas pour la lisibilité du message */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-2xl"
              style={{
                background: 'linear-gradient(to top, rgba(6,18,11,0.92) 0%, rgba(6,18,11,0.35) 55%, transparent 100%)',
                height: '42%',
              }}
            />
            {/* Message d'attente rotatif */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 text-center">
              <AnimatePresence mode="wait">
                {waitMsgs.length > 0 && (
                  <motion.p
                    key={msgIndex % waitMsgs.length}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4 }}
                    className="text-[11px] italic sm:text-xs"
                    style={{
                      fontFamily: 'var(--font-cinzel), serif',
                      color: RUNE_THEME.goldPale,
                      textShadow: '0 1px 8px rgba(0,0,0,0.85)',
                    }}
                  >
                    {waitMsgs[msgIndex % waitMsgs.length]}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            </div>

            {/* Layer transparent sous la vidéo : sert d'ancre de scroll. En le
                forçant à s'afficher (focusWaitBottom), le bas de la vidéo reste
                au-dessus du bord bas de l'écran → la vidéo tient entièrement à
                l'écran, bandeau de messages compris. */}
            <div ref={spacerRef} aria-hidden="true" className="h-[20vh] w-full" />
          </>
        ) : (
          <div
            className="text-center text-sm italic"
            style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale, opacity: 0.8 }}
          >
            L&apos;Oracle déchiffre les runes… ✦
          </div>
        )
      )}

      {error && !loading && (
        <div className="text-center space-y-2">
          <p className="text-amber-400/70 text-xs italic">{error}</p>
          <RuneButton variant="gold" onClick={run}>
            {buttonLabel}
          </RuneButton>
        </div>
      )}

      {sections && !loading && (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${RUNE_THEME.forestMid}33 0%, ${RUNE_THEME.forest}22 100%)`,
                border: `1px solid ${RUNE_THEME.goldPale}44`,
              }}
            >
              <p
                className="mb-1 text-center text-sm font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}
              >
                {s.position}
              </p>
              <p
                className="mb-2 text-center text-base"
                style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale }}
              >
                {s.rune}
              </p>
              <p
                className="mb-2 text-center text-xs italic"
                style={{ color: RUNE_THEME.sage, opacity: 0.85 }}
              >
                {s.sens}
              </p>
              <p
                className="text-center text-sm leading-relaxed"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {s.lecture}
              </p>
            </div>
          ))}

          {synthese && (
            <div
              className="mt-4 rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${RUNE_THEME.goldPale}22 0%, ${RUNE_THEME.forestMid}14 100%)`,
                border: `1px solid ${RUNE_THEME.goldPale}55`,
              }}
            >
              <p
                className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.goldPale }}
              >
                Synthèse
              </p>
              <p
                className="text-center text-sm leading-relaxed italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {synthese}
              </p>
            </div>
          )}

          {conseil && (
            <div
              className="mt-4 rounded-2xl p-4"
              style={{
                background: `linear-gradient(135deg, ${RUNE_THEME.sage}22 0%, ${RUNE_THEME.forestMid}18 100%)`,
                border: `1px solid ${RUNE_THEME.sage}66`,
              }}
            >
              <p
                className="mb-2 text-center text-sm font-bold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-cinzel-deco), serif', color: RUNE_THEME.sage }}
              >
                Conseil d&apos;Odin
              </p>
              <p
                className="text-center text-sm leading-relaxed italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {conseil}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
