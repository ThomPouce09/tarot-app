'use client';

// app/runes/page.tsx — Tableau de bord des Runes Scandinaves
// Tuiles visuelles type /tarot & /yi-jing (image/glyphe + titre + sous-titre),
// thème runes respecté (vert forêt / doré pâle / vert sauge), tout sur un écran
// mobile sans scroller.

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import YiSlideNav from '@/components/yi-slide-nav';
import FirstVisitHints from '@/components/first-visit-hints';
import Firefly from '@/components/firefly';
import { RuneBackground, RuneTitle } from './_shared';
import { RUNE_THEME } from './_shared';
import { TutorialModal, type TutorialSlide } from './tutorial-modal';
import { useLang, pick4, tr } from '@/lib/i18n';
import { installSoundUnlock, playSound, stopSound } from '@/lib/sounds';
import { useEntitlement, EntitlementGateModal } from '@/lib/use-entitlement';
import GatedTile from '@/components/gated-tile';
import { useRequireVerified, VerifiedGate } from '@/components/verified-gate';
// Liste AUTO-GÉNÉRÉE au build/dev (scripts/gen-backdrops.cjs lit
// public/backgrounds/runes*.jpg) : déposer un nouveau runesN.jpg suffit.
import runesBackdrops from '@/lib/generated/backdrops-runes.json';

// Frise décorative de runes — rendue uniquement après hydratation pour
// éviter le mismatch d'hydratation (glyphes runiques = Unicode hors-BMP).
const FRIEZE_TOP = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
const FRIEZE_BOTTOM = 'ᛟᛞᛜᛚᛗᛖᛒᛏᛊᛉᛈᛇᛃᛁᚾᚺᚹᚷᚲᚱᚨᚦᚢᚠ';

// Fonds d'écran aléatoires du hub /runes — liste auto-générée ci-dessus
// (fallback statique si la génération n'a pas tourné).
const RUNES_BACKDROPS = (runesBackdrops as string[]).length
  ? (runesBackdrops as string[])
  : ['/backgrounds/runes1.jpg', '/backgrounds/runes2.jpg', '/backgrounds/runes3.jpg'];

// Affiche l'une des 3 images en fond (choisie au montage, côté client →
// aucun mismatch d'hydratation), sous un voile sombre pour la lisibilité.
function RunesRandomBackdrop() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(RUNES_BACKDROPS[Math.floor(Math.random() * RUNES_BACKDROPS.length)]);
  }, []);
  if (!src) return null;
  return (
    <div className="pointer-events-none absolute inset-0 min-h-[100dvh] overflow-hidden" style={{ zIndex: -1 }}>
      <motion.img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
        style={{ objectPosition: 'center 30%' }}
      />
      {/* Voile : garde le titre et les tuiles parfaitement lisibles */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(6,18,11,0.66) 0%, rgba(6,18,11,0.38) 35%, rgba(6,18,11,0.45) 65%, rgba(6,18,11,0.82) 100%)',
        }}
      />
    </div>
  );
}

function RuneFrieze({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-1.5 select-none overflow-hidden whitespace-nowrap text-center ${
        position === 'top' ? 'top-1.5' : 'bottom-1.5'
      }`}
      style={{
        fontFamily: 'var(--font-cinzel-deco), serif',
        color: RUNE_THEME.goldPale,
        opacity: 0.1,
        fontSize: 11,
        letterSpacing: '0.35em',
      }}
      aria-hidden
    >
      {position === 'top' ? FRIEZE_TOP : FRIEZE_BOTTOM}
    </div>
  );
}

const TILES = [
  {
    href: '/runes/nornes2',
    glyph: 'ᚾ', // N – Norn (Urdhr, Verdandi, Skuld)
    title: 'Le fil des Nornes (simplifié)', titleEn: 'The Thread of the Norns (Simplified)', titleEs: 'El hilo de las Nornir (simplificado)', titleHi: 'नॉर्न का धागा (सरल)',
    subtitle: 'À l’aveugle : secouez, choisissez 3 runes, laissez le fil se dérouler.', subtitleEn: 'Blind draw: shake the pouch, pick 3 runes, let the thread unfold.', subtitleEs: 'A ciegas: agite la bolsa, elija 3 runas, deje que el hilo se desenrolle.', subtitleHi: 'आँख मूँदकर: थैली हिलाएँ, 3 रन चुनें, धागे को खुलने दें।',
    bg: `linear-gradient(135deg, ${RUNE_THEME.forestMid} 0%, ${RUNE_THEME.forest} 100%)`,
    border: `${RUNE_THEME.goldPale}55`,
  },
  {
    href: '/runes/nornes',
    glyph: 'ᚢ', // U – Urd, la première Norne
    title: 'Le Fil des Nornes — Précis', titleEn: 'The Thread of the Norns — Precise', titleEs: 'El Hilo de las Nornir — Preciso', titleHi: 'नॉर्न का धागा — सटीक',
    subtitle: 'Une question exacte, une réponse ciblée — et le conseil d’Odin.', subtitleEn: 'One exact question, one targeted answer — and Odin’s counsel.', subtitleEs: 'Una pregunta exacta, una respuesta precisa — y el consejo de Odín.', subtitleHi: 'एक सटीक प्रश्न, एक लक्षित उत्तर — और ओदिन का परामर्श।',
    bg: `linear-gradient(135deg, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.ink} 100%)`,
    border: `${RUNE_THEME.goldSoft}55`,
  },
  {
    href: '/runes/mjolnir',
    glyph: 'ᛗ', // M – Mjölnir
    title: 'Le Marteau de Mjölnir', titleEn: 'Mjölnir’s Hammer', titleEs: 'El Martillo de Mjölnir', titleHi: 'म्जोल्निर का हथौड़ा',
    subtitle: 'Le plan de bataille du forgeron : cinq runes en T, du manche à la crête.', subtitleEn: 'The forge-master’s battle plan: five runes in a T, from haft to crest.', subtitleEs: 'El plan de batalla del herrero: cinco runas en T, del mango a la cresta.', subtitleHi: 'बर्द़ई की रणनीति: पाँच रन T-आकार में, हत्थे से शिखर तक।',
    bg: `linear-gradient(135deg, ${RUNE_THEME.forest} 0%, ${RUNE_THEME.ink} 100%)`,
    border: `${RUNE_THEME.goldSoft}55`,
  },
  {
    href: '/runes/yggdrasil',
    glyph: 'ᛟ', // O – Yggdrasil / Odin
    title: "Les Racines d'Yggdrasil", titleEn: "The Roots of Yggdrasil", titleEs: "Las Raíces de Yggdrasil", titleHi: "युग्द्रसिल की जड़ेँ",
    subtitle: 'Le bilan de l’Arbre-Monde : cinq runes, des racines à la couronne.', subtitleEn: 'The World-Tree reckoning: five runes, from roots to crown.', subtitleEs: 'El balance del Árbol del Mundo: cinco runas, de las raíces a la corona.', subtitleHi: 'विश्व-वृक्ष का हिसाब: पाँच रन, जड़ों से मुकुट तक।',
    bg: `linear-gradient(135deg, #163a26 0%, ${RUNE_THEME.forestDeep} 100%)`,
    border: `${RUNE_THEME.sage}66`,
  },
];

// ── Tutoriel par tirage (réplique du pattern /des-divinatoires) ────────────
// Chaque slide correspond à une tuile (même ordre que TILES).
const TUTORIALS: TutorialSlide[] = [
  {
    glyph: 'ᚾ',
    title: 'Le fil des Nornes (simplifié)',
    titleEn: 'The Thread of the Norns (Simplified)',
titleEs: "El hilo de las Nornir (simplificado)", titleHi: "नॉर्न का धागा (सरल)",
    desc: 'À l’aveugle : secouez, choisissez 3 runes, laissez le fil se dérouler.',
    descEn: 'Blind draw: shake the pouch, pick 3 runes, let the thread unfold.',
descEs: "A ciegas: agite la bolsa, elija 3 runas, deje que el hilo se desenrolle.", descHi: "आँख मूँदकर: थैली हिलाएँ, 3 रन चुनें, धागे को खुलने दें।",
    steps: [
      'Choisissez le domaine et l’intention des Nornes',
      'Secouez le pochon, puis tirez 3 runes face cachée',
      'Lisez la synthèse + le conseil d’Odin',
    ],
    stepsEn: [
      'Pick the domain and the Norns’ intention',
      'Shake the pouch, then draw 3 face-down runes',
      'Read the synthesis + Odin’s counsel',
    ],
stepsEs: ["Elija el ámbito y la intención de las Nornir", "Agite la bolsa y luego tire 3 runas boca abajo", "Lea la síntesis + el consejo de Odín"],
stepsHi: ["नॉर्न का क्षेत्र और संकल्प चुनें", "थैली हिलाएँ, फिर 3 रन चेहरा नीचे करके निकालें", "संश्लेषण + ओडिन का परामर्श पढ़ें"],
  },
  {
    glyph: 'ᚢ',
    title: 'Le Fil des Nornes — Précis',
    titleEn: 'The Thread of the Norns — Precise',
titleEs: "El Hilo de las Nornir — Preciso", titleHi: "नॉर्न का धागा — सटीक",
    desc: 'Une question exacte, une réponse ciblée — et le conseil d’Odin.',
    descEn: 'One exact question, one targeted answer — and Odin’s counsel.',
descEs: "Una pregunta exacta, una respuesta precisa — y el consejo de Odín.", descHi: "एक सटीक प्रश्न, एक लक्षित उत्तर — और ओडिन का परामर्श।",
    steps: [
      'Formulez votre question',
      'Tirez trois runes : passé, présent, avenir',
      'Lisez la synthèse + le conseil d’Odin',
    ],
    stepsEn: [
      'Ask your question',
      'Draw three runes: past, present, future',
      'Read the synthesis + Odin’s counsel',
    ],
stepsEs: ["Formule su pregunta", "Saque tres runas: pasado, presente, futuro", "Lea la síntesis + el consejo de Odín"],
stepsHi: ["अपने प्रश्न को शब्द दें", "तीन रून निकालें: अतीत, वर्तमान, भविष्य", "संश्लेषण + ओडिन का परामर्श पढ़ें"],
  },
  {
    glyph: 'ᛗ',
    title: 'Le Marteau de Mjölnir',
    titleEn: "Mjölnir's Hammer",
    desc: 'Le plan de bataille du forgeron : cinq runes en T, du manche à la crête.',
    descEn: 'The forge-master’s battle plan: five runes in a T, from haft to crest.',
descEs: "El plan de batalla del herrero: cinco runas en T, del mango a la cresta.", descHi: "बढ़ई की रणनीति: पाँच रन T-आकार में, हत्थे से शिखर तक।",
    steps: [
      'Nomme l’obstacle qui résiste (question ou thème)',
      'Base du manche — l’Ancrage : sur quoi tu tiens',
      'Haut du manche — l’Obstacle : ce qui bloque vraiment',
      'Tête gauche — la Menace : ce qu’il faut lâcher (renversée, bonne nouvelle)',
      'Tête droite — l’Arme : avec quoi tu frappes',
      'Centre de la tête — la Frappe : le coup à porter',
    ],
    stepsEn: [
      'Name the obstacle that resists (question or theme)',
      'Handle base — the Anchor: what you stand on',
      'Handle top — the Obstacle: what truly blocks you',
      'Left head — the Threat: what must go (reversed: good news)',
      'Right head — the Weapon: what you strike with',
      'Head center — the Strike: the blow to deliver',
    ],
stepsEs: ["Nombra el obstáculo que resiste (pregunta o tema)", "Base del mango — el Anclaje: sobre qué te sostienes", "Extremo del mango — el Obstáculo: lo que de verdad te bloquea", "Cabeza izquierda — la Amenaza: lo que hay que soltar (invertida, buena noticia)", "Cabeza derecha — el Arma: con qué golpeas", "Centro de la cabeza — el Golpe: el golpe que debes dar"],
stepsHi: ["उस रुकावट का नाम बताओ जो विरोध करती है (प्रश्न या विषय)", "मूठ का आधार — अंकुरण: तुम किस पर टिके हो", "मूठ का सिरा — रुकावट: जो सच में तुम्हें रोकता है", "बायाँ सिर — ख़तरा: जिसे छोड़ना होगा (उल्टी हो, तो शुभ समाचार)", "दायाँ सिर — हथियार: तुम जिससे वार करते हो", "सिर का केंद्र — प्रहार: जो वार करना है"],
  },
  {
    glyph: 'ᛟ',
    title: "Les Racines d'Yggdrasil",
    titleEn: "The Roots of Yggdrasil",
    desc: 'Le bilan de l’Arbre-Monde : cinq runes, des racines à la couronne.',
    descEn: 'The World-Tree reckoning: five runes, from roots to crown.',
descEs: "El balance del Árbol del Mundo: cinco runas, de las raíces a la corona.", descHi: "विश्व-वृक्ष का हिसाब: पाँच रन, जड़ों से मुकुट तक।",
    steps: [
      'Urðr — la Source : ce qui te nourrit sans que tu le voies',
      'Níðhöggr — le Dragon : ce qui te ronge (renversée, elle est bienvenue)',
      'L’Arbre — la Force du jour : ce qui te tient debout aujourd’hui',
      'Les Branches — les Voies vivantes : ce qui peut encore grandir',
      'L’Aigle — la Vision d’en haut : ce que seul le sommet voit',
    ],
    stepsEn: [
      'Urðr — the Source: what feeds you unseen',
      'Níðhöggr — the Dragon: what gnaws at you (reversed, it is welcome)',
      'The Tree — today’s strength: what keeps you standing',
      'The Branches — living paths: what can still grow',
      'The Eagle — the view from above: what only the crown sees',
    ],
stepsEs: ["Urðr — la Fuente: lo que te alimenta sin que lo veas", "Níðhöggr — el Dragón: lo que te roe (invertida, es bienvenida)", "El Árbol — la Fuerza del día: lo que te mantiene en pie hoy", "Las Ramas — los Caminos vivos: lo que aún puede crecer", "El Águila — la Visión desde lo alto: lo que solo ve la cima"],
stepsHi: ["Urðr — स्रोत: जो तुम्हें पोषित करता है, बिना तुम्हें दिखे", "नीधोग्गर — ड्रैगन: जो तुम्हें अंदर से खाता है (उल्टी हो, तो स्वागत है)", "वृक्ष — आज का बल: जो आज तुम्हें टिकाए रखता है", "शाखाएँ — जीवंत पथ: जो अभी और बढ़ सकता है", "ईगल — ऊँचाई की दृष्टि: जो केवल शिखर देखता है"],
  },
] satisfies readonly TutorialSlide[];

export default function RunesHub() {
  const [mounted, setMounted] = useState(false);
  const [activeSlide, setActiveSlide] = useState<TutorialSlide | null>(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const lang = useLang();
  const { tiles, loadTiles, gateReason, closeGate, openGate } = useEntitlement();
  const auth = useRequireVerified();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setFirstVisit(!localStorage.getItem('runes_tuto_seen'));
    }
  }, []);

  // Charge la dispo de tous les tirages (grisage des tuiles épuisées).
  useEffect(() => { loadTiles(); }, [loadTiles]);

  const openTutorial = (i: number) => {
    setActiveSlide(TUTORIALS[i]);
    if (typeof window !== 'undefined') localStorage.setItem('runes_tuto_seen', '1');
    setFirstVisit(false);
  };

  // Jingle d'ouverture : même pattern que /des-divinatoires (user activation
  // héritée de la navigation par lien ; installSoundUnlock couvre l'accès direct).
  // Le jingle est coupé dès que l'utilisateur quitte la page (navigation,
  // fermeture d'onglet, passage en arrière-plan) via stopSound().
  useEffect(() => {
    installSoundUnlock();
    const t = window.setTimeout(() => playSound('runes', 0.75), 150);
    const onVisibility = () => {
      if (document.hidden) stopSound('runes');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisibility);
      stopSound('runes');
    };
  }, []);
  if (auth !== 'ok') return <VerifiedGate state={auth} />;
  return (
    <RuneBackground>
      <RunesRandomBackdrop />
      <YiSlideNav />
      <FirstVisitHints flagKey="hints_runes" hints={[{ selector: '[data-nav-menu]', textKey: 'hint.hubMenu' }, { selector: '[data-info-i]', textKey: 'hint.hubInfo' }]} />
      <RuneTitle
        title={tr("Runes Scandinaves : Interroger le Futhark", "Scandinavian Runes: Question the Futhark", "Runas Escandinavas: Interrogar el Futhark", "स्कैंडिनेवियाई रून: फुथार्क से पूछें")}
        subtitle={tr("Le Futhark Ancien, 24 runes gravées sur pierre, révèle les courants du destin.", "The Elder Futhark, 24 runes carved in stone, reveals the currents of destiny.", "El Futhark Antiguo, 24 runas grabadas en piedra, revela las corrientes del destino.", "प्राचीन फुथार्क, पत्थर पर उत्कीर्ण 24 रून, भाग्य की धाराएँ प्रकट करता है।")}
      />

      {/* TUILES : 2 colonnes sur mobile (comme /tarot & /yi-jing) */}
      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 px-4 pb-4 sm:gap-5">
        {TILES.map((tile, i) => {
          // Déduit le type de tirage depuis la route : /runes/nornes → runes-nornes.
          const runeType = 'runes-' + tile.href.split('/').pop();
          return (
          <GatedTile key={tile.href} href={tile.href} allowed={tiles?.[runeType]?.allowed} reason={tiles?.[runeType]?.reason} onBlocked={openGate} className="block">
            <motion.div
              className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl cursor-pointer transition-all"
              style={{
                background: tile.bg,
                border: `2px solid ${tile.border}`,
                boxShadow: `0 0 16px ${RUNE_THEME.goldGlow}, 0 4px 12px rgba(0,0,0,0.5)`,
              }}
              whileHover={{ scale: 1.04, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* ⓘ tutoriel de la tuile — le clic n'active PAS la navigation.
                  Lueur dorée au 1er passage (localStorage runes_tuto_seen). */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openTutorial(i);
                }}
                aria-label={
                  pick4(`Comment fonctionne ce tirage : ${lang === 'en' ? (tile.titleEn || tile.title) : lang === 'es' ? (tile.titleEs || tile.title) : lang === 'hi' ? (tile.titleHi || tile.title) : tile.title}`, `How this reading works: ${lang === 'en' ? (tile.titleEn || tile.title) : lang === 'es' ? (tile.titleEs || tile.title) : lang === 'hi' ? (tile.titleHi || tile.title) : tile.title}`, "Cómo funciona esta tirada: ${lang === 'en' ? (tile.titleEn || tile.title) : lang === 'es' ? (tile.titleEs || tile.title) : lang === 'hi' ? (tile.titleHi || tile.title) : tile.title}", "यह विन्यास कैसे काम करता है: ${lang === 'en' ? (tile.titleEn || tile.title) : lang === 'es' ? (tile.titleEs || tile.title) : lang === 'hi' ? (tile.titleHi || tile.title) : tile.title}")(lang)
                }
                data-info-i
                className={`absolute z-10 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
                  firstVisit ? 'animate-[runesGlow_2s_ease-in-out_3]' : ''
                }`}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  left: 'auto',
                  background: `${RUNE_THEME.goldPale}1a`,
                  border: `1px solid ${RUNE_THEME.goldPale}55`,
                  color: RUNE_THEME.goldPale,
                  opacity: firstVisit ? 1 : 0.5,
                  boxShadow: firstVisit
                    ? `0 0 16px ${RUNE_THEME.goldGlow}, 0 0 0 4px ${RUNE_THEME.goldPale}22`
                    : 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={RUNE_THEME.goldPale} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 11v5" />
                  <path d="M12 8h.01" />
                </svg>
              </button>

              {/* frise de runes discrètes le long du liseré (après hydratation) */}
              {mounted && <RuneFrieze position="top" />}
              {mounted && <RuneFrieze position="bottom" />}
              <div className="relative flex h-full w-full flex-col items-center justify-center p-2">
                <div className="absolute inset-1.5 rounded-lg border border-[rgba(233,217,172,0.25)] pointer-events-none" />
                <span
                  className="mb-2 text-5xl leading-none sm:text-6xl"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: RUNE_THEME.goldPale,
                    textShadow: `0 0 16px ${RUNE_THEME.goldGlow}`,
                  }}
                >
                  {tile.glyph}
                </span>
                <h2
                  className="px-1 text-center text-[13px] font-bold leading-tight sm:text-base"
                  style={{
                    fontFamily: 'var(--font-cinzel-deco), serif',
                    color: RUNE_THEME.goldPale,
                    textShadow: `0 0 10px ${RUNE_THEME.goldGlow}`,
                  }}
                >
                  {lang === 'en' ? (tile.titleEn || tile.title) : lang === 'es' ? (tile.titleEs || tile.title) : lang === 'hi' ? (tile.titleHi || tile.title) : tile.title}
                </h2>
                <p
                  className="mt-1 px-1 text-center text-[9px] leading-tight sm:text-[11px]"
                  style={{
                    fontFamily: 'var(--font-cinzel), serif',
                    color: RUNE_THEME.sage,
                  }}
                >
                  {lang === 'en' ? (tile.subtitleEn || tile.subtitle) : lang === 'es' ? (tile.subtitleEs || tile.subtitle) : lang === 'hi' ? (tile.subtitleHi || tile.subtitle) : tile.subtitle}
                </p>
              </div>
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse at center, ${RUNE_THEME.goldGlow} 0%, transparent 70%)`,
                }}
              />
            </motion.div>
          </GatedTile>
          );
        })}
      </div>
      <TutorialModal open={activeSlide !== null} onClose={() => setActiveSlide(null)} slide={activeSlide} />
      <EntitlementGateModal reason={gateReason} onClose={closeGate} />
      <Firefly page="runes" />
    </RuneBackground>
  );
}
