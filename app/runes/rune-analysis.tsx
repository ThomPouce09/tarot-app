'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Rune } from '@/components/rune-stones/runes';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import { playSound } from '@/lib/sounds';
import { useLang, tr } from '@/lib/i18n';
import { localizePosition } from '@/lib/i18n/positions';
import { api } from '@/lib/api-client';
import EchoBox from '@/components/echo-box';
import { RUNE_THEME, SPARKS } from './rune-theme';
import { RuneButton } from './rune-button';

/* Analyse IA structurée d'un tirage de runes (appelle /api/rune-interpretation). */
export function RuneAnalysis({
  runes,
  mode,
  focus,
  buttonLabel = tr("✨ Interroger l'Oracle", "✨ Ask the Oracle", "✨ Interrogar al Oráculo", "✨ ओरैकल से पूछें"),
  onAnalysis,
  autoRun = false,
  odinReveal = false,
  question = null,
  gateType = null,
  echo = null,
  moss = false,
}: {
  runes: { rune: Rune; reversed: boolean; position: string }[];
  mode: 'nornes' | 'mjolnir' | 'yggdrasil';
  /** Type de quota consommé par l'appel IA (défaut : runes-<mode>). /nornes2
      passe 'runes-nornes2' : le mode IA reste 'nornes' mais la lecture à
      l'aveugle consomme le tirage de BASE « Simplifié », pas l'avancé. */
  gateType?: string | null;
  /** Écho : id de la lecture sauvegardée + question → affiche l'encadré
      « L'Écho scellé » sous l'analyse (Initié/Arkane). Omis/null = pas d'écho. */
  echo?: { readingId: string | null; question?: string | null } | null;
  /** /runes/yggdrasil : palette vert cèdre pour les boutons save + l'augure. */
  moss?: boolean;
  focus?: 'odin';
  buttonLabel?: string;
  /** Rappelé avec le texte complet de l'analyse (synthèse + sections + conseil) dès qu'elle est disponible. */
  onAnalysis?: (text: string) => void;
  /** Lance l'interprétation IA automatiquement dès le montage (pas de bouton). */
  autoRun?: boolean;
  /** Question/intention du consultant (thème choisi) : cible l'analyse IA. */
  question?: string | null;
  /** « Tisser une autre voie » (/nornes) : révélation UNIQUE du Conseil d'Odin —
      ni section « Conseil d'Odin » ni bloc « Synthèse » dupliqués. La rune, son
      sens, la lecture et l'action sont révélés en un seul acte (bouton → carte
      parchemin dorée + texte). Opt-in : les autres pages gardent le rendu
      historique (nornes2, analyse initiale, mjolnir, yggdrasil). */
  odinReveal?: boolean;
}) {
  const [sections, setSections] = useState<
    { position: string; rune: string; sens: string; lecture: string }[] | null
  >(null);
  const [synthese, setSynthese] = useState('');
  const [conseil, setConseil] = useState('');
  // Conseil d'Odin : texte isolé du JSON → révélé par le bouton dédié (bas de
  // l'interprétation), dans la carte au fond conseil-odin.png.
  const [conseilRevealed, setConseilRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Vidéo d'attente aléatoire (analyse-runesX.mp4) pendant l'interprétation.
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // Messages d'attente rotatifs, affichés en bas de la vidéo (par langue).
  const [waitMsgs, setWaitMsgs] = useState<string[]>([]);
  const [msgIndex, setMsgIndex] = useState(0);
  const lang = useLang();
  const { sub: entSub, gateReason, closeGate, openGate } = useEntitlement();
  const isArkane = entSub?.level === 'arkane';
  // Conseil d'Odin : ouvert aux abonnés — Initié 1/mois (quota serveur : hors
  // quota, le conseil est simplement retiré de la réponse IA), Arkane illimité.
  const canOdin = entSub?.level === 'arkane' || entSub?.level === 'initie';
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Carte du Conseil d'Odin : au clic sur « Révéler », centre la révélation
  // dans le viewport (cadre entier visible, bien placé).
  const revealStageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!conseilRevealed || !revealStageRef.current) return;
    const t = window.setTimeout(() => {
      revealStageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [conseilRevealed]);

  // Auto-fit du texte du Conseil d'Odin (1ère phase ET tissage : 1 instance
  // RuneAnalysis = 1 état local) : la plus GRANDE police (plafonnée) qui tient
  // dans la zone claire du parchemin — texte court → grossit pour remplir,
  // texte long → rétrécit sans déborder. Recherche binaire sur le px (la
  // hauteur d'un texte wrappé n'est pas linéaire), mesure après montage de la
  // carte. Re-mesure au changement de LARGEUR uniquement (rotation) : le
  // resize vertical (barre d'URL mobile) est ignoré pour éviter le clignotement.
  const odinBoxRef = useRef<HTMLDivElement | null>(null);
  const odinTextRef = useRef<HTMLParagraphElement | null>(null);
  const [odinFont, setOdinFont] = useState<string | null>(null);
  useEffect(() => {
    if (!conseilRevealed || !conseil) return;
    setOdinFont(null);
    let cancelled = false;
    let late: number | undefined;
    const measure = () => {
      if (cancelled) return;
      const box = odinBoxRef.current;
      const txt = odinTextRef.current;
      if (!box || !txt) return;
      const basePx = parseFloat(getComputedStyle(txt).fontSize) || 12;
      const bh = box.clientHeight;
      if (bh <= 0) return;
      let lo = 9;
      let hi = Math.min(basePx * 1.9, 24, bh * 0.3);
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        txt.style.fontSize = mid + 'px';
        // offsetHeight (px de LAYOUT) et pas getBoundingClientRect : la carte
        // apparaît en spring scale 0.72→1 — le rect renvoie la hauteur VISUELLE
        // (× scale en cours d'animation) → le fit accepte une police trop
        // grande qui déborde dès l'animation finie. -1px : marge d'arrondi.
        if (txt.offsetHeight <= bh - 1) lo = mid;
        else hi = mid;
      }
      // Ne JAMAIS vider style.fontSize à la fin : la mesure tourne plusieurs
      // fois. Si un re-calcul donne la même taille, setOdinFont est un no-op
      // React (pas de re-render) et le style inline effacé ne revient jamais →
      // texte retombé sur le 16px par défaut → déborde en haut ET en bas.
      const finalPx = Math.round(lo * 10) / 10;
      txt.style.fontSize = finalPx + 'px';
      setOdinFont(finalPx + 'px');
    };
    const t = window.setTimeout(measure, 80);
    // Cinzel doit être CHARGÉE avant la mesure définitive : fonts.ready peut
    // se résoudre AVANT même le début du téléchargement (police pas encore
    // demandée au moment de l'appel) → mesure sur le fallback serif, puis le
    // swap réel fait grossir le texte après coup → débordement. fonts.load()
    // force le chargement et ne résout qu'une fois la police disponible.
    const fonts = (document as any).fonts;
    if (fonts?.load) {
      fonts
        .load('700 20px Cinzel')
        .then(() => window.setTimeout(measure, 30))
        .catch(() => {});
    }
    // Filet de sécurité : re-mesure une fois l'animation d'apparition finie.
    late = window.setTimeout(measure, 1200);
    // Filet « shrink-only » : si, police réelle + animation installées, le
    // texte dépasse encore la zone, resserrer jusqu'à ce qu'il tienne (ne
    // JAMAIS agrandir ici → aucune oscillation possible). Garantit un rendu
    // sans débordement quel que soit le timing de chargement de Cinzel.
    const verify = () => {
      if (cancelled) return;
      const box = odinBoxRef.current;
      const txt = odinTextRef.current;
      if (!box || !txt) return;
      const bh = box.clientHeight;
      if (bh <= 0) return;
      let f = parseFloat(txt.style.fontSize) || parseFloat(getComputedStyle(txt).fontSize) || 12;
      while (f > 9 && txt.offsetHeight > bh - 1) {
        f -= 0.5;
        txt.style.fontSize = f + 'px';
      }
      setOdinFont(f + 'px');
    };
    const v = window.setTimeout(verify, 2000);
    let lastW = window.innerWidth;
    const remeasure = () => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      setOdinFont(null);
      window.setTimeout(measure, 60);
    };
    window.addEventListener('resize', remeasure);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      if (late) window.clearTimeout(late);
      window.removeEventListener('resize', remeasure);
    };
  }, [conseilRevealed, conseil]);

  // Précharge conseil-odin.png dès que le conseil est disponible (avant le
  // clic sur « Révéler ») → la carte apparaît sans attente de chargement.
  useEffect(() => {
    if (!conseil || !canOdin || !['nornes', 'yggdrasil', 'mjolnir'].includes(mode)) return;
    const img = new Image();
    img.src = '/images/conseil-odin.png';
  }, [conseil, canOdin, mode]);

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
      const res = await api(`/api/interpretation-wait?type=${waitType}&lang=${lang}`, { cache: 'no-store' });
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
    setConseilRevealed(false);
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
      const res = await api('/api/rune-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runes: payload, mode, focus, userId, lang, type: gateType || runeType, question: question || undefined }),
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
        setError(tr("L'Oracle n'a pas répondu de façon structurée. Réessaie.", "The Oracle did not respond in a structured way. Try again.", "El Oráculo no ha respondido de forma estructurada. Inténtalo de nuevo.", "ओरैकल ने संरचित उत्तर नहीं दिया। फिर से कोशिश करो।"));
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setError(tr("L'Oracle est silencieux… Réessaie dans un instant.", "The Oracle is silent… Try again in a moment.", "El Oráculo está en silencio… Inténtalo en un instante.", "ओरैकल मौन है… कुछ क्षण बाद फिर कोशिश करो।"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [runes, mode, focus, question]);

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
    // ~1,5s de délai : laisse le temps de VOIR le tirage (runes + tuiles)
    // avant de rediriger le focus vers la vidéo d'attente.
    const t = window.setTimeout(focusWaitBottom, 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  // Si la vidéo n'est pas encore montée à l'échéance des 1,5s, le focus part
  // dès qu'elle apparaît ; sinon le timer ci-dessus s'en est déjà chargé.
  useEffect(() => {
    if (!autoRun || !videoUrl || waitFocusedRef.current) return;
    const elapsed = Date.now() - runStartRef.current;
    const t = window.setTimeout(focusWaitBottom, Math.max(0, 1500 - elapsed));
    return () => window.clearTimeout(t);
  }, [autoRun, videoUrl, focusWaitBottom]);

  // Relance MANUELLE (bouton d'erreur, bouton « Consulter l'Oracle » de
  // nornes2, …) : quand la vidéo d'attente apparaît, on la ramène à l'écran
  // (même ancrage que le flux autoRun) — sinon le focus resterait sur le
  // bouton, souvent sous la ligne de flottaison.
  useEffect(() => {
    if (autoRun || !loading || !videoUrl) return;
    waitFocusedRef.current = false;
    const t = window.setTimeout(focusWaitBottom, 120);
    return () => window.clearTimeout(t);
  }, [autoRun, loading, videoUrl, focusWaitBottom]);

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

  // Conseil d'Odin du tissage (/nornes, prop odinReveal — exigence user
  // 2026-09-04) : l'analyse IA de la nouvelle rune s'affiche DIRECTEMENT
  // (carte standard SANS l'en-tête de position « Conseil d'Odin », qui
  // dupliquerait le titre de la révélation) ; la « Synthèse » est fondue en
  // phrase de clôture DANS la carte (pas de bloc dupliqué) ; le bouton
  // « Révéler le Conseil d'Odin » + la carte parchemin dorée restent SOUS
  // l'analyse, avec la même mécanique que dans la 1ère phase.
  const unifiedOdin = odinReveal && mode === 'nornes' && focus === 'odin';

  return (
    <div
      className="mt-6"
      ref={boxRef}
      style={{ scrollMarginTop: '4vh' }}
    >
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      {!autoRun && !sections && !loading && !error && (
        <div className="text-center">
          <RuneButton variant="save" saveTint={moss ? 'cedar' : 'runes'} onClick={run}>
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
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='black'/%3E%3C/svg%3E"
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
          <RuneButton variant="save" saveTint={moss ? 'cedar' : 'runes'} onClick={run}>
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
              {!unifiedOdin && (
                <p
                  className="mb-1 text-center text-sm font-bold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.goldPale }}
                >
                  {localizePosition(s.position, lang)}
                </p>
              )}
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
              {unifiedOdin && synthese && (
                <p
                  className="mt-3 text-center text-sm italic leading-relaxed"
                  style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.sagePale }}
                >
                  {synthese}
                </p>
              )}
            </div>
          ))}

          {!unifiedOdin && synthese && (
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
                {tr("Synthèse", "Synthesis", "Síntesis", "सारांश")}
              </p>
              <p
                className="text-center text-sm leading-relaxed italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {synthese}
              </p>
            </div>
          )}

          {/* Conseil d'Odin (nornes, yggdrasil, mjolnir) : le texte vient
              du JSON de l'interprétation IA (conseil_action) — isolé puis révélé
              par le bouton dédié. Carte conseil-odin.png (cadre + parchemin),
              texte calé DANS le parchemin. Réservé aux abonnés : Initié 1/mois
              (hors quota, le serveur retire conseil_action → bloc absent),
              Arkane illimité. */}
          {conseil && ['nornes', 'yggdrasil', 'mjolnir'].includes(mode) && canOdin && (
            <div className="mt-4 text-center">
              {!conseilRevealed ? (
                <button
                  type="button"
                  onClick={() => setConseilRevealed(true)}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.03] hover:brightness-110 active:scale-95"
                  style={{
                    background: `
                      linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%),
                      ${moss ? '#2f6f46' : '#005f6a'}`,
                    color: '#fff',
                    fontFamily: 'var(--font-cinzel), serif',
                    boxShadow: moss
                      ? '0 0 16px rgba(63,142,92,0.55), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)'
                      : '0 0 16px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 7px rgba(0,0,0,0.35)',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="3.2" />
                    <path d="M2.5 12s3.2-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.2 5.5-9.5 5.5S2.5 12 2.5 12z" />
                  </svg>
                  {tr("Révéler le Conseil d'Odin", "Reveal Odin's Counsel", "Revelar el Consejo de Odín", "ओदिन का परामर्श प्रकट करें")}
                </button>
              ) : (
                <motion.div
                  ref={revealStageRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative mx-auto scroll-mt-24"
                  style={{ maxWidth: 560 }}
                >
                  {/* ── Rayons dorés derrière la carte ── */}
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'conic-gradient(from 0deg, rgba(255,214,110,0) 0deg, rgba(255,214,110,0.5) 12deg, rgba(255,214,110,0) 24deg, rgba(255,214,110,0) 60deg, rgba(255,214,110,0.42) 72deg, rgba(255,214,110,0) 84deg, rgba(255,214,110,0) 120deg, rgba(255,214,110,0.5) 132deg, rgba(255,214,110,0) 144deg, rgba(255,214,110,0) 180deg, rgba(255,214,110,0.42) 192deg, rgba(255,214,110,0) 204deg, rgba(255,214,110,0) 240deg, rgba(255,214,110,0.5) 252deg, rgba(255,214,110,0) 264deg, rgba(255,214,110,0) 300deg, rgba(255,214,110,0.42) 312deg, rgba(255,214,110,0) 324deg, rgba(255,214,110,0) 360deg)',
                      filter: 'blur(2px)',
                    }}
                    initial={{ opacity: 0, scale: 0.25, rotate: 0 }}
                    animate={{ opacity: [0, 0.85, 0], scale: 1.55, rotate: 18 }}
                    transition={{ duration: 1.4, times: [0, 0.4, 1], ease: 'easeOut' }}
                  />
                  {/* ── Halo lumineux arrière-plan ── */}
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute -inset-6"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 45%, rgba(255,225,140,0.55), rgba(255,215,120,0.12) 55%, transparent 75%)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.9, 0.45] }}
                    transition={{ duration: 1.2, times: [0, 0.35, 1] }}
                  />

                  {/* ── Titre AU-DESSUS de la carte (orné, doré) ── */}
                  <motion.h3
                    initial={{ opacity: 0, y: 10, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-3 flex items-center justify-center gap-2.5 px-2 text-center sm:gap-3"
                  >
                    <motion.span
                      aria-hidden
                      className="h-px flex-1"
                      style={{ maxWidth: 90, background: 'linear-gradient(90deg, transparent, rgba(243,201,105,0.85))' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    />
                    <span
                      aria-hidden
                      className="text-sm"
                      style={{ color: '#F3C969', textShadow: '0 0 12px rgba(243,201,105,0.8)' }}
                    >
                      ✦
                    </span>
                    <span
                      className="text-xl uppercase tracking-[0.14em] sm:text-2xl"
                      style={{
                        fontFamily: 'var(--font-cinzel-deco), serif',
                        backgroundImage: 'linear-gradient(180deg, #FFF6D8 0%, #F3C969 48%, #C9962E 100%)',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        filter:
                          'drop-shadow(0 2px 3px rgba(0,0,0,0.55)) drop-shadow(0 0 16px rgba(243,201,105,0.4))',
                      }}
                    >
                      {tr("Conseil d'Odin", "Odin's Counsel", "Consejo de Odín", "ओदिन का परामर्श")}
                    </span>
                    <span
                      aria-hidden
                      className="text-sm"
                      style={{ color: '#F3C969', textShadow: '0 0 12px rgba(243,201,105,0.8)' }}
                    >
                      ✦
                    </span>
                    <motion.span
                      aria-hidden
                      className="h-px flex-1"
                      style={{ maxWidth: 90, background: 'linear-gradient(270deg, transparent, rgba(243,201,105,0.85))' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    />
                  </motion.h3>

                  {/* ── La carte (parchemin conseil-odin.png) ── */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.72, y: 26, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ type: 'spring', damping: 15, stiffness: 150, mass: 0.9 }}
                    onAnimationStart={() => playSound('spell')}
                    className="relative w-full overflow-hidden rounded-xl"
                    style={{
                      aspectRatio: '450 / 292',
                      backgroundImage: "url('/images/conseil-odin.png')",
                      backgroundSize: '100% 100%',
                      backgroundPosition: 'center',
                      boxShadow: '0 14px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Reflet lumineux qui balaie la carte */}
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-1/2"
                      style={{
                        background:
                          'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0.08) 60%, transparent 100%)',
                        left: '-60%',
                      }}
                      initial={{ left: '-60%' }}
                      animate={{ left: '110%' }}
                      transition={{ delay: 0.35, duration: 0.95, ease: 'easeInOut' }}
                    />
                    {/* Lueur dorée pulsante (fond) */}
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 42%, rgba(255,222,130,0.5), transparent 70%)',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.55, 0.18, 0.4, 0.18] }}
                      transition={{ delay: 0.5, duration: 1.6, times: [0, 0.3, 0.55, 0.8, 1] }}
                    />

                    {/* ── Texte seul, calé DANS le parchemin (zone centrale claire,
                        largeur réduite pour ne pas toucher le cadre intérieur).
                        Font-size auto-fit : la plus grande qui tient (cf. effet
                        odinFont ci-dessus) — texte court rempli, long ajusté. ── */}
                    <div
                      ref={odinBoxRef}
                      className="absolute flex flex-col items-center justify-center"
                      style={{ top: '30%', bottom: '25%', left: '18%', right: '18%' }}
                    >
                      <motion.p
                        ref={odinTextRef}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.55 }}
                        className="text-center font-bold leading-snug"
                        style={{
                          fontFamily: 'var(--font-cinzel), serif',
                          fontSize: odinFont || '12px',
                          color: '#6B4423', // bronze foncé
                          // Effet gravé (bizeautage) : arête supérieure sombre
                          // (creux) + arête inférieure claire (lumière rasante) —
                          // comme si le texte était incisé dans le parchemin.
                          textShadow:
                            '0 -1px 0 rgba(74,44,12,0.5), 0 1px 0 rgba(255,249,233,0.85), 0 2px 4px rgba(100,70,25,0.18)',
                        }}
                      >
                        {conseil}
                      </motion.p>
                    </div>
                  </motion.div>

                  {/* ── Étincelles ascendantes ── */}
                  {SPARKS.map((s, i) => (
                    <motion.span
                      key={i}
                      aria-hidden
                      className="pointer-events-none absolute select-none"
                      style={{
                        left: s.x,
                        top: s.y,
                        fontSize: s.size,
                        color: s.color,
                        textShadow: '0 0 8px rgba(255,220,120,0.9)',
                      }}
                      initial={{ opacity: 0, y: 0, scale: 0.4 }}
                      animate={{ opacity: [0, 1, 0], y: -s.rise, scale: [0.4, 1.2, 0.5], rotate: s.spin }}
                      transition={{ delay: 0.5 + s.delay, duration: 1.5 + s.dur, ease: 'easeOut' }}
                    >
                      {s.char}
                    </motion.span>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {/* Conseil générique (mjolnir : pas de carte Conseil d'Odin) — affiché en clair. */}
          {conseil && !['nornes', 'yggdrasil', 'mjolnir'].includes(mode) && (
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
                {tr("Conseil d'Odin", "Odin's Counsel", "Consejo de Odín", "ओदिन का परामर्श")}
              </p>
              <p
                className="text-center text-sm leading-relaxed italic"
                style={{ fontFamily: 'var(--font-cinzel), serif', color: RUNE_THEME.stone }}
              >
                {conseil}
              </p>
            </div>
          )}

          {/* ✶ L'Écho scellé — prémonction datée née de cette lecture (Initié/Arkane). */}
          {echo && (synthese || conseil) && (
            <EchoBox
              domain="runes"
              moss={moss}
              readingId={echo.readingId}
              question={echo.question ?? question}
              summary={[...sections.map((s) => s.lecture), synthese, conseil].filter(Boolean).join('\n')}
            />
          )}
        </div>
      )}
    </div>
  );
}
