'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSetLang, type Lang } from '@/lib/i18n';

// Palette charte tutoriel Tarot (cf. app/tarot/tutorial-modal.tsx) — bois chaud,
// bordeaux & or. Écritures claires sur fonds foncés : jamais de noir sur
// bordeaux (contraste insuffisant), noir uniquement sur or.
const GOLD = '#DAA520';
const GOLD_PALE = '#F0C75E';
const IVORY = '#F5EAD6';
const ROSE = '#E2B8AC';
const WINE = '#4A1931';

// Choix de langue AU PREMIER LANCEMENT (nouvelle install / nouveau compte).
// Affiché tant que 'tarot_seen_lang' est absent du localStorage (péri-device).
// Le choix écrit la langue dans 'tarot_prefs' (via useSetLang, même chemin que
// Préférences) puis pose le drapeau : ne réapparaît jamais. Texte volontaire-
// ment bilingue FR+EN (un sélecteur de langue ne doit pas être mono-langue).
export default function LanguageGate() {
  const setLang = useSetLang();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Lang | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem('tarot_seen_lang')) {
        // Nouveau visiteur (fraîchement installé) : on purge toute session
        // fantôme héritée du device (vieux compte de test, réinstallation…).
        // « Mon espace » renverra donc vers la mire de connexion tant que
        // l'utilisateur ne s'est pas lui-même connecté.
        localStorage.removeItem('tarot_user');
        setOpen(true);
      }
    } catch {
      setOpen(true); // stockage indisponible -> on propose quand même
    }
  }, []);

  const choose = (l: Lang) => {
    setPicked(l);
    setLang(l); // écrit tarot_prefs.language + bascule l'app instantanément
    try {
      localStorage.setItem('tarot_seen_lang', '1');
    } catch {}
    setTimeout(() => setOpen(false), 380);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[120] flex items-center justify-center px-5"
          data-lang-gate
          style={{ background: 'rgba(30, 15, 8, 0.62)', backdropFilter: 'blur(4px)' }}
        >
          {/* Panneau — même écrin que les modales tutoriels : bois → bordeaux, liseré or */}
          <motion.div
            className="ts-panel relative w-full max-w-[380px] overflow-hidden rounded-3xl px-6 py-7 text-center"
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: picked ? 0 : 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{
              background: `linear-gradient(160deg, #5A3A1E 0%, ${WINE} 58%, #34121F 100%)`,
              border: `1.5px solid ${GOLD}77`,
              boxShadow: `0 12px 48px rgba(0,0,0,0.45), 0 0 34px rgba(218,165,32,0.18), inset 0 0 0 1px rgba(240,199,94,0.08)`,
            }}
          >
            {/* Cadre intérieur fin, comme le bord doré d'une lame */}
            <div className="pointer-events-none absolute inset-2 rounded-[22px] border border-[#DAA520]/20" />

            {/* Halo doré en tête */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{
                background: `radial-gradient(ellipse at 50% 0%, rgba(240,199,94,0.30) 0%, transparent 72%)`,
              }}
            />

            <p className="relative mb-2 text-xs tracking-[0.45em]" style={{ color: `${GOLD_PALE}cc` }}>
              <span className="ts-twinkle">✦</span>
              <span className="ts-twinkle mx-1.5" style={{ animationDelay: '-0.9s' }}>☾</span>
              <span className="ts-twinkle" style={{ animationDelay: '-1.7s' }}>✦</span>
            </p>

            <h2
              className="relative text-xl font-semibold tracking-wide"
              style={{
                fontFamily: 'var(--font-cinzel-deco), serif',
                color: IVORY,
                textShadow: `0 0 16px ${GOLD}99, 0 1px 2px rgba(0,0,0,0.6)`,
              }}
            >
              Langue <span style={{ color: `${GOLD}b3` }}>·</span> Language
            </h2>
            <p className="relative mt-2 text-[13px] leading-snug" style={{ color: ROSE }}>
              Choisissez la langue de l’application.
              <br />
              <span className="italic opacity-80">Choose the app language.</span>
            </p>

            <div className="relative mt-6 flex flex-col gap-3">
              {/* Français — option par défaut : pilule dorée glossée, texte bois foncé (contraste max) */}
              <button
                type="button"
                onClick={() => choose('fr')}
                className="w-full rounded-[0.6rem] py-3 text-[15px] font-semibold transition-[filter,box-shadow] duration-200 hover:brightness-110"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 58%), linear-gradient(135deg, #F0C75E, #B8860B)',
                  color: '#34121F',
                  boxShadow: '0 4px 14px rgba(218,165,32,0.45), inset 0 -3px 8px rgba(122,74,4,0.5)',
                }}
                aria-pressed={picked === 'fr'}
              >
                {picked === 'fr' ? '✓ ' : ''}Français
                <span className="ml-2 text-xs font-normal opacity-70">(par défaut)</span>
              </button>

              {/* English — fant doré, texte ivoire (jamais noir sur bordeaux) */}
              <button
                type="button"
                onClick={() => choose('en')}
                className="w-full rounded-[0.6rem] border py-3 text-[15px] font-semibold transition-colors duration-200"
                style={{
                  background: picked === 'en' ? `linear-gradient(135deg, #F0C75E, #B8860B)` : 'rgba(24,10,4,0.35)',
                  borderColor: `${GOLD}66`,
                  color: picked === 'en' ? '#34121F' : IVORY,
                }}
                aria-pressed={picked === 'en'}
              >
                {picked === 'en' ? '✓ ' : ''}English
              </button>

              {/* Español */}
              <button
                type="button"
                onClick={() => choose('es')}
                className="w-full rounded-[0.6rem] border py-3 text-[15px] font-semibold transition-colors duration-200"
                style={{
                  background: picked === 'es' ? `linear-gradient(135deg, #F0C75E, #B8860B)` : 'rgba(24,10,4,0.35)',
                  borderColor: `${GOLD}66`,
                  color: picked === 'es' ? '#34121F' : IVORY,
                }}
                aria-pressed={picked === 'es'}
              >
                {picked === 'es' ? '✓ ' : ''}Español
              </button>

              {/* 中文 */}
              <button
                type="button"
                onClick={() => choose('zh')}
                className="w-full rounded-[0.6rem] border py-3 text-[15px] font-semibold transition-colors duration-200"
                style={{
                  background: picked === 'zh' ? `linear-gradient(135deg, #F0C75E, #B8860B)` : 'rgba(24,10,4,0.35)',
                  borderColor: `${GOLD}66`,
                  color: picked === 'zh' ? '#34121F' : IVORY,
                }}
                aria-pressed={picked === 'zh'}
              >
                {picked === 'zh' ? '✓ ' : ''}中文
              </button>
            </div>

            <p className="relative mt-5 text-[11px] leading-snug" style={{ color: `${ROSE}99` }}>
              Modifiable à tout moment dans Préférences
              <br />
              <span className="italic">Change anytime in Preferences</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
