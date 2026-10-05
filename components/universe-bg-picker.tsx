'use client';
import { api } from '@/lib/api-client';

// components/universe-bg-picker.tsx
// Bouton discret (cadre paysager doré, à gauche de l'enceinte) ouvrant une
// modale de sélection des fonds d'un univers — mêmes paliers d'abonnement que
// l'accueil. La sélection est persistée dans tarot_prefs.backgrounds (fusion
// avec celle de l'accueil) + serveur (/api/prefs). Taper une vignette cochée
// donne un aperçu IMMÉDIAT ; la retirer (si c'est le fond affiché) recharge
// aussitôt un autre fond du pool.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';
import { isVideoBackground, type BackgroundLevel } from '@/lib/backgrounds';

type Props = {
  pools: Record<BackgroundLevel, string[]>;
  level: BackgroundLevel;
  current: string;
  onPreview: (bg: string) => void;
  onReselect: () => void;
};

function readPrefsBg(): string[] {
  try {
    const p = JSON.parse(localStorage.getItem('tarot_prefs') || '{}');
    return Array.isArray(p?.backgrounds) ? p.backgrounds : [];
  } catch { return []; }
}

function writePrefsBg(backgrounds: string[]) {
  try {
    const p = JSON.parse(localStorage.getItem('tarot_prefs') || '{}');
    localStorage.setItem('tarot_prefs', JSON.stringify({ ...p, backgrounds }));
  } catch { /* ignore */ }
  const email = (() => { try { return JSON.parse(localStorage.getItem('tarot_user') || '{}')?.email || ''; } catch { return ''; } })();
  if (email) {
    void api('/api/prefs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, backgrounds }),
    }).catch(() => { /* hors-ligne : local only */ });
  }
}

export default function UniverseBgPicker({ pools, level, current, onPreview, onReselect }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const all = pools[level];
  const [sel, setSel] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const forThis = readPrefsBg().filter((b) => all.includes(b));
    setSel(forThis.length ? forThis : [...all]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const persist = (yiSelection: string[]) =>
    writePrefsBg([...new Set([...readPrefsBg().filter((b) => !all.includes(b)), ...yiSelection])]);

  const toggle = (bg: string) => {
    if (sel.includes(bg) && sel.length <= 1) return; // jamais de pool vide
    const next = sel.includes(bg) ? sel.filter((b) => b !== bg) : [...sel, bg];
    setSel(next);
    persist(next);
    if (next.includes(bg)) onPreview(bg);           // coché → affiché aussitôt
    else if (bg === current) onReselect();          // l'affiché décoché → autre fond du pool
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('uibg.open')}
        title={t('uibg.open')}
        className="fixed flex h-9 w-9 items-center justify-center rounded-full opacity-60 backdrop-blur-[2px] transition-all duration-300 hover:scale-110 hover:opacity-100 active:scale-95"
        style={{ top: 38, right: 51, zIndex: 55, background: 'rgba(26,14,10,0.28)', border: '1px solid rgba(218,165,32,0.35)', color: 'rgba(218,165,32,0.9)' }}
      >
        {/* Cadre photo paysager */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="6" width="18" height="13" rx="1.5" />
          <path d="M8.5 6 10 3.5h4L15.5 6" />
          <circle cx="9" cy="11" r="1.2" />
          <path d="M4.5 17.5 9.8 12.7l3.4 3.1 2.6-2.1 3.7 3.8" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={() => { setOpen(false); onReselect(); }}
          >
            <div className="absolute inset-0" style={{ background: 'rgba(8,4,6,0.72)', backdropFilter: 'blur(3px)' }} />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl p-5"
              style={{ background: 'linear-gradient(160deg,#241318 0%,#160B0E 70%,#0D0608 100%)', border: '1.5px solid rgba(218,165,32,0.5)', boxShadow: '0 0 34px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-[family-name:var(--font-cinzel-deco)] text-sm uppercase tracking-widest" style={{ color: '#DAA520' }}>
                  {t('uibg.title')}
                </h3>
                {all.length < pools.arkane.length && (
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(218,165,32,0.65)' }}>
                    {all.length} {t('prefs.backgroundPlanCount')} · {level}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: 'rgba(245,234,214,0.6)' }}>
                {t('uibg.hint')}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {all.map((bg) => {
                  const picked = sel.includes(bg);
                  return (
                    <button key={bg} type="button" onClick={() => toggle(bg)}
                      className={`relative aspect-video w-full overflow-hidden rounded-lg border transition-all ${picked ? 'ring-2 ring-amber-400/80 border-amber-400' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                      style={{ background: '#0a0604' }}>
                      {isVideoBackground(bg) ? (
                        <video src={bg} muted loop playsInline autoPlay className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                      )}
                      <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                        style={{ background: picked ? 'rgba(218,165,32,0.95)' : 'rgba(0,0,0,0.55)', color: picked ? '#1a0e0a' : 'transparent' }}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-between">
                {all.some((b) => !sel.includes(b)) ? (
                  <button onClick={() => { setSel([...all]); persist([...all]); }} className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(218,165,32,0.85)' }}>
                    {t('prefs.backgroundSelectAll')}
                  </button>
                ) : <span />}
                <button onClick={() => { setOpen(false); onReselect(); }}
                  className="rounded-full px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0) 60%), #005f6a', color: '#fff', boxShadow: '0 0 14px rgba(0,95,106,0.5), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.35)' }}>
                  {t('gate.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
