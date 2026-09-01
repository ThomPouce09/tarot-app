'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// PAUSE REPAS — barman interactif sur la landing page.
//
// Flux :
//   1. Le barman (barman1.png) est affiché en haut-gauche, cliquable.
//   2. Au clic : modale fond noir, barman2.png s'agrandit (~40% écran) + bulle.
//   3. Après 4s : transition vers plateau.png (~50% écran).
//   4. Sur le plateau, 3 zones cliquables (thé / café / crackers) → vidéo.
//   5. Fin de la vidéo → message "Test" au centre (position paramétrable).
//
// Seulement en développement pour l'instant (monté sur app/page.tsx).
// ---------------------------------------------------------------------------

// Coordonnées des zones cliquables du plateau, en % de l'image affichée.
// Mesurées sur plateau.png (373×270). Ajuster ici si besoin.
const PLATEAU_ZONES = [
  { id: 'cafe', label: 'Café', labelEn: 'Coffee', left: 46, top: 16, width: 20, height: 27, video: '/images/pause_repas/cafe.mp4' },
  { id: 'cracker', label: 'Crackers', labelEn: 'Crackers', left: 66, top: 26, width: 21, height: 28, video: '/images/pause_repas/cracker.mp4' },
  { id: 'the', label: 'Thé', labelEn: 'Tea', left: 61, top: 57, width: 20, height: 27, video: '/images/pause_repas/the.mp4' },
] as const;

const BARMAN_SMALL = '/images/pause_repas/barman1.png';
const BARMAN_BIG = '/images/pause_repas/barman2.png';
const PLATEAU = '/images/pause_repas/plateau.png';

// Ratio plateau.png (largeur / hauteur) — utilisé pour caler une boîte où les
// zones cliquables en % correspondent exactement à l'image rendue.
const PLATEAU_RATIO = 373 / 270;

// Accroche du barman (bulle de dialogue affichée pendant l'étape barman), bilingue.
const BARMAN_GREETING: Record<'fr' | 'en', string> = {
  fr: "Bonjour, qu'est-ce que je vous sert aujourd'hui ?",
  en: "Hello, what can I get you today?",
};

// DEBUG : affiche les zones cliquables du plateau (fins traits rouges + libellé)
// pour ajuster leurs positions. Mettre à false une fois les zones validées.
const DEBUG_ZONES = false;

// --- Paramètres visuels (ajustables librement) -------------------------------
// Le message de la pause repas est chargé depuis l'API /api/daily-message
// (message du jour, bilingue FR/EN selon la langue de l'utilisateur).

// Layout PAR VIDÉO : zoom au centre en fin de lecture + layer (rectangle) où
// s'affiche le message. Position/taille en % de la boîte vidéo (320×178).
// Chaque vidéo a SON layer, zoom et couleur de message propres.
type VideoLayout = {
  zoom: number;
  zoomOrigin?: string; // point focal du zoom (transform-origin). Défaut centre.
  layer: { top: string; left: string; width: string; height: string };
  rotate?: number;     // rotation du layer, en degrés (négatif = antihoraire).
  color?: string;      // couleur du message. Défaut = MESSAGE_COLOR.
  shadow?: string;     // ombre/glow du message. Défaut = MESSAGE_SHADOW.
};
const VIDEO_LAYOUT: Record<string, VideoLayout> = {
  the:     { zoom: 3,   zoomOrigin: '50% 68%', layer: { top: '5%', left: '40.5%', width: '35%', height: '55%' }, rotate: -8 },
  cafe:    { zoom: 2.5, layer: { top: '19%', left: '26%', width: '49%', height: '56%' } },
  cracker: { zoom: 2.5, layer: { top: '38%', left: '17.5%', width: '65%', height: '24%' }, color: '#2E2A26', shadow: '0 0 12px rgba(255,246,224,0.5), 0 2px 5px rgba(255,255,255,0.6)' },
};

// DEBUG : affiche la bordure rouge du layer de message (rectangle) pour
// ajuster son emplacement/taille par vidéo. Mettre à false une fois calé.
const DEBUG_LAYER = false;

// Police "Test" : Cormorant (elegant) — thème oracle.
// Alternatives : var(--font-medieval), var(--font-cinzel-deco) (MAJUSCULES),
// 'Allura' (script), 'Khiara Script' (script).
const MESSAGE_FONT = 'var(--font-cormorant), serif';
const MESSAGE_COLOR = '#FFF6E0'; // blanc crème clair (défaut)
// Ombre/glow par défaut (texte clair) — surchargée par VIDEO_LAYOUT[].shadow.
const MESSAGE_SHADOW =
  '0 0 18px rgba(255,246,224,0.65), 0 0 46px rgba(255,246,224,0.35), 0 2px 6px rgba(0,0,0,0.8)';
// Taille réduite pour rester lisible sur smartphone.
const MESSAGE_FONT_SIZE = 'clamp(1rem, 3.4vw, 1.7rem)';
// Durée du zoom de fin de vidéo — le texte n'apparaît qu'après.
const ZOOM_DURATION = 1.3;
// ------------------------------------------------------------------------------

type Stage = 'barman' | 'plateau' | 'video';

// --- Programmation du barman : fenêtres horaires (heure du device) -----------
// Fenêtre A : 12:00–12:30 ; fenêtre B : 21:00–21:30 (minutes depuis minuit).
const WINDOW_A = [12 * 60, 12 * 60 + 30];
const WINDOW_B = [21 * 60, 21 * 60 + 30];
const inWindowNow = () => {
  const d = new Date();
  const mins = d.getHours() * 60 + d.getMinutes();
  return (mins >= WINDOW_A[0] && mins <= WINDOW_A[1]) || (mins >= WINDOW_B[0] && mins <= WINDOW_B[1]);
};
// Jour local du device (YYYY-MM-DD) — sert de clé "une fois par jour".
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Email du compte connecté (identité "lié au compte"), lire depuis tarot_user.
const getEmail = () => {
  try {
    const u = localStorage.getItem('tarot_user');
    if (!u) return '';
    const p = JSON.parse(u) as { email?: string; id?: string };
    return (p.email || p.id || '').toLowerCase();
  } catch {
    return '';
  }
};

export default function PauseRepas() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('barman');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoDone, setVideoDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const barmanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [fitFont, setFitFont] = useState<string | null>(null);
  const lang = useLang();
  const [dailyMessage, setDailyMessage] = useState('');
  const zLabel = (z: (typeof PLATEAU_ZONES)[number]) => (lang === 'en' ? z.labelEn : z.label);

  // --- Programmation : le barman apparaît seulement en fenêtre horaire et une
  // fois par jour (lié au compte). Une fois cliqué → consommé → caché jusqu'au lendemain.
  const [inWindow, setInWindow] = useState(false);
  const [usedToday, setUsedToday] = useState(false);
  const [ready, setReady] = useState(false); // évite le flash du barman déjà utilisé au refresh
  useEffect(() => {
    const check = () => setInWindow(inWindowNow());
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const email = getEmail();
    const date = localDay();
    const finish = () => setReady(true);
    // Fast path (même device, déjà consommé) : aucune attente réseau → pas de flash.
    try {
      if (localStorage.getItem('tarot_pr_' + date)) { setUsedToday(true); finish(); return; }
    } catch { /* ignore */ }
    if (email) {
      fetch(`/api/pause-repas?email=${encodeURIComponent(email)}&date=${date}`)
        .then((r) => r.json())
        .then((d) => { if (d?.used) setUsedToday(true); finish(); })
        .catch(finish);
    } else {
      finish();
    }
  }, []);
  const markConsumed = useCallback(() => {
    setUsedToday(true);
    const email = getEmail();
    const date = localDay();
    try { localStorage.setItem('tarot_pr_' + date, '1'); } catch {}
    if (email) {
      fetch('/api/pause-repas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, date }),
      }).catch(() => {});
    }
  }, []);

  // Ajuste la TAILLE DE POLICE pour REMPLIR le layer : la plus grande police qui
  // tient dans la hauteur (recherche binaire — le retour à la ligne est non-linéaire).
  // Conserve la pleine largeur (width:100%, retour à la ligne).
  useEffect(() => {
    if (stage !== 'video' || !videoDone) return;
    setFitFont(null);
    const t = setTimeout(() => {
      const box = layerRef.current, txt = textRef.current;
      if (!box || !txt) return;
      const basePx = parseFloat(getComputedStyle(txt).fontSize) || 16;
      const bh = box.clientHeight;
      let lo = 6, hi = basePx * 2.5;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        txt.style.fontSize = mid + 'px';
        if (txt.scrollHeight <= bh) lo = mid;
        else hi = mid;
      }
      txt.style.fontSize = '';
      setFitFont(Math.round(lo * 10) / 10 + 'px');
    }, 450);
    return () => clearTimeout(t);
  }, [stage, videoDone]);

  // Charge le message du jour (bilingue selon la langue). Relancé au changement de langue.
  useEffect(() => {
    let mounted = true;
    fetch(`/api/daily-message?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => { if (mounted && typeof d?.text === 'string') setDailyMessage(d.text); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [lang]);

  const clearBarmanTimer = useCallback(() => {
    if (barmanTimer.current) clearTimeout(barmanTimer.current);
    barmanTimer.current = null;
  }, []);

  const openModal = useCallback(() => {
    clearBarmanTimer();
    setVideoSrc(null);
    setVideoDone(false);
    setStage('barman');
    setOpen(true);
    // Une fois cliqué → consommé (lié au compte) → caché jusqu'au lendemain.
    markConsumed();
    // Le barman s'agrandit, bulle de dialogue, reste 4 secondes, puis le plateau.
    barmanTimer.current = setTimeout(() => setStage('plateau'), 4000);
  }, [clearBarmanTimer, markConsumed]);

  const closeModal = useCallback(() => {
    clearBarmanTimer();
    setOpen(false);
    setStage('barman');
    setVideoSrc(null);
    setVideoDone(false);
  }, [clearBarmanTimer]);

  // Autoplay de la vidéo : tente avec le son (clic = geste utilisateur), sinon muet.
  useEffect(() => {
    if (stage !== 'video' || !videoRef.current) return;
    const v = videoRef.current;
    v.volume = 1;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => { v.muted = true; v.play().catch(() => {}); });
  }, [stage, videoSrc]);

  const startVideo = (src: string) => {
    setVideoSrc(src);
    setVideoDone(false);
    setStage('video');
  };

  const onVideoEnded = () => setVideoDone(true);

  // Clic sur la vidéo pendant la lecture → accélère ×4 pour atteindre rapidement
  // la dernière image ; l'événement `ended` déclenche alors le zoom + message.
  const skipToEnd = useCallback(() => {
    const v = videoRef.current;
    if (v && !videoDone) v.playbackRate = 4;
  }, [videoDone]);

  // Résolution du layout par vidéo (zoom + layer du message) selon videoSrc.
  const videoId = videoSrc?.split('/').pop()?.replace('.mp4', '') || 'cafe';
  const videoCfg = VIDEO_LAYOUT[videoId] || VIDEO_LAYOUT.cafe;

  return (
    <>
      {/* Barman cliquable — haut-gauche de la landing page (seulement en fenêtre horaire, une fois/jour) */}
      {!open && ready && inWindow && !usedToday && (
        <motion.button
          type="button"
          aria-label={lang === 'en' ? 'Break time' : 'Pause repas'}
          onClick={openModal}
          className="fixed left-2.5 top-[4%] z-[80] cursor-pointer select-none outline-none"
          style={{ filter: 'drop-shadow(0 0 8px rgba(218,165,32,0.55))' }}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.94 }}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
        >
          <img src={BARMAN_SMALL} alt={lang === 'en' ? 'Bartender' : 'Barman'} className="w-14 sm:w-[70px] md:w-20 object-contain" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.94)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            {/* Bouton fermer discret — haut-droite */}
            <button
              type="button"
              aria-label={lang === 'en' ? 'Close' : 'Fermer'}
              onClick={closeModal}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#FFF6E0]/70 transition-colors hover:text-[#FFF6E0]"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              ✕
            </button>

            <motion.div
              key={stage}
              className="relative flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 230, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Étape 1 : le barman agrandi + bulle de dialogue (cliquable → plateau) */}
              {stage === 'barman' && (
                <div
                  className="relative cursor-pointer"
                  style={{ height: 'min(46vh, 70vw)', width: 'auto' }}
                  onClick={() => { clearBarmanTimer(); setStage('plateau'); }}
                >
                  <img
                    src={BARMAN_BIG}
                    alt={lang === 'en' ? 'Bartender' : 'Barman'}
                    className="h-full w-auto object-contain"
                  />
                  <motion.div
                    className="absolute z-10"
                    initial={{ opacity: 0, y: 12, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                    style={{ bottom: '100%', left: '50%', marginBottom: '6px' }}
                  >
                    <div
                      className="relative rounded-2xl px-4 py-3 text-center"
                      style={{
                        transform: 'translateX(-50%)',
                        fontFamily: 'var(--font-cormorant), serif',
                        background: 'rgba(255,246,224,0.97)',
                        color: '#4a2c1a',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                        fontSize: 'clamp(0.95rem, 2.6vw, 1.2rem)',
                        lineHeight: 1.3,
                        width: 'min(280px, 72vw)',
                      }}
                    >
                      {BARMAN_GREETING[lang]}
                      {/* pointe vers la bouche */}
                      <span
                        className="absolute"
                        style={{
                          bottom: '-9px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '9px solid transparent',
                          borderRight: '9px solid transparent',
                          borderTop: '10px solid rgba(255,246,224,0.97)',
                        }}
                      />
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Étape 2 : le plateau avec 3 zones cliquables */}
              {stage === 'plateau' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative" style={{ width: 'min(88vw, 50vh)', aspectRatio: `${PLATEAU_RATIO}` }}>
                    <img
                      src={PLATEAU}
                      alt={lang === 'en' ? 'Snack break tray' : 'Plateau de pause repas'}
                      className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                      draggable={false}
                    />
                    {PLATEAU_ZONES.map((z, i) =>
                      DEBUG_ZONES ? (
                        <button
                          key={z.id}
                          type="button"
                          aria-label={zLabel(z)}
                          onClick={() => startVideo(z.video)}
                          className="absolute z-10 flex cursor-pointer items-center justify-center overflow-hidden p-0"
                          style={{
                            left: `${z.left}%`,
                            top: `${z.top}%`,
                            width: `${z.width}%`,
                            height: `${z.height}%`,
                            background: 'rgba(255,60,60,0.12)',
                            border: '1.5px solid #ff4d4d',
                            borderRadius: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              lineHeight: '1',
                              color: '#fff',
                              background: 'rgba(215,45,45,0.95)',
                              padding: '2px 5px',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              fontFamily: 'var(--font-cormorant), serif',
                              fontWeight: 600,
                            }}
                          >
                            {zLabel(z).toLowerCase()}
                          </span>
                        </button>
                      ) : (
                        <motion.button
                          key={z.id}
                          type="button"
                          aria-label={zLabel(z)}
                          onClick={() => startVideo(z.video)}
                          whileTap={{ scale: 0.94, transition: { duration: 0.12 } }}
                          className="absolute z-10 cursor-pointer rounded-full"
                          style={{ left: `${z.left}%`, top: `${z.top}%`, width: `${z.width}%`, height: `${z.height}%` }}
                        >
                          <motion.span
                            className="absolute inset-0 flex items-center justify-center rounded-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 1, 0] }}
                            transition={{ duration: 1.3, delay: i * 1.45, times: [0, 0.08, 0.72, 1] }}
                            style={{
                              background:
                                'radial-gradient(ellipse at center, rgba(216,24,45,0) 24%, rgba(216,24,45,0.22) 55%, rgba(216,24,45,0) 80%)',
                              boxShadow:
                                '0 0 0 3px rgba(216,24,45,0.95), 0 0 0 5px rgba(60,0,8,0.32), 0 0 22px 8px rgba(216,24,45,0.5)',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '11px',
                                lineHeight: '1',
                                color: '#fff',
                                background: 'rgba(216,24,45,0.95)',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                whiteSpace: 'nowrap',
                                fontFamily: 'var(--font-cormorant), serif',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                boxShadow: '0 0 8px rgba(0,0,0,0.35)',
                              }}
                            >
                              {zLabel(z).toLowerCase()}
                            </span>
                          </motion.span>
                        </motion.button>
                      ),
                    )}
                  </div>
                  <motion.p
                    className="pointer-events-none"
                    style={{
                      fontFamily: 'var(--font-cormorant), serif',
                      color: '#FFF6E0',
                      fontSize: 'clamp(0.85rem, 2.2vw, 1.05rem)',
                      letterSpacing: '0.05em',
                      textShadow: '0 0 12px rgba(255,246,224,0.5)',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ delay: 4.3, duration: 4, times: [0, 0.1, 0.85, 1] }}
                  >
                    {lang === 'en' ? 'Tap to taste' : 'Touchez pour déguster'}
                  </motion.p>
                </div>
              )}

              {/* Étape 3 : la vidéo, puis zoom centre + message (layer par vidéo) */}
              {stage === 'video' && videoSrc && (
                <div
                  className="relative overflow-hidden rounded-xl"
                  style={{ width: '98vw', aspectRatio: '320/178', boxShadow: '0 0 30px rgba(218,165,32,0.35)' }}
                >
                  <motion.video
                    ref={videoRef}
                    src={videoSrc}
                    autoPlay
                    playsInline
                    onClick={skipToEnd}
                    className="absolute inset-0 h-full w-full object-contain cursor-pointer"
                    style={{ transformOrigin: videoCfg.zoomOrigin || '50% 50%' }}
                    poster={PLATEAU}
                    onEnded={onVideoEnded}
                    animate={{ scale: videoDone ? videoCfg.zoom : 1 }}
                    transition={{ duration: ZOOM_DURATION, ease: 'easeOut' }}
                  />
                  {videoDone && (
                    <div
                      ref={layerRef}
                      className="absolute z-10 flex items-center justify-center overflow-hidden pointer-events-none"
                      style={{
                        top: videoCfg.layer.top,
                        left: videoCfg.layer.left,
                        width: videoCfg.layer.width,
                        height: videoCfg.layer.height,
                        ...(videoCfg.rotate ? { transform: `rotate(${videoCfg.rotate}deg)` } : {}),
                        ...(DEBUG_LAYER
                          ? { border: '2px dashed #ff4d4d', background: 'rgba(255,60,60,0.08)' }
                          : {}),
                      }}
                    >
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: ZOOM_DURATION }}
                        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <div
                          ref={textRef}
                          style={{
                            fontFamily: MESSAGE_FONT,
                            color: videoCfg.color || MESSAGE_COLOR,
                            fontSize: fitFont || MESSAGE_FONT_SIZE,
                            letterSpacing: '0.06em',
                            fontStyle: 'italic',
                            textShadow: videoCfg.shadow || MESSAGE_SHADOW,
                            width: '100%',
                            textAlign: 'center',
                            lineHeight: 1.25,
                          }}
                        >
                          {dailyMessage}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
